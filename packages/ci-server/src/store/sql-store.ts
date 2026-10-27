import {
  Sequelize,
  DataTypes,
  Model,
  Op,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { fingerprintFinding, type RunV1 } from '../protocol/index.js';
import { createSequelize } from './sql/create-sequelize.js';
import { runMigrations } from './sql/migrate.js';
import type { StorageOptions } from './storage-options.js';
import { generateId, generateToken, hashToken } from './tokens.js';
import {
  DuplicateRunError,
  type CiStore,
  type CreateProjectResult,
  type PublicProject,
  type ProjectRecord,
  type StoredFinding,
  type StoredRun,
} from './types.js';

class ProjectRow extends Model<
  InferAttributes<ProjectRow>,
  InferCreationAttributes<ProjectRow>
> {
  declare id: string;
  declare name: string;
  declare token_hash: string;
  declare admin_token_hash: string;
  declare created_at: string;
}

class RunRow extends Model<InferAttributes<RunRow>, InferCreationAttributes<RunRow>> {
  declare id: string;
  declare project_id: string;
  declare sha: string;
  declare branch: string;
  declare run_kind: string;
  declare config_hash: string;
  declare overall: number;
  declare grade: string;
  declare created_at: string;
  declare run_json: string;
}

class FindingRow extends Model<
  InferAttributes<FindingRow>,
  InferCreationAttributes<FindingRow>
> {
  declare id: string;
  declare run_id: string;
  declare fingerprint: string;
  declare rule_id: string;
  declare severity: string;
  declare file: string;
  declare message: string;
  declare location_json: string;
}

function initModels(sequelize: Sequelize): void {
  ProjectRow.init(
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      token_hash: { type: DataTypes.STRING, allowNull: false },
      admin_token_hash: { type: DataTypes.STRING, allowNull: false },
      created_at: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, tableName: 'projects', timestamps: false },
  );

  RunRow.init(
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      project_id: { type: DataTypes.STRING, allowNull: false },
      sha: { type: DataTypes.STRING, allowNull: false },
      branch: { type: DataTypes.STRING, allowNull: false },
      run_kind: { type: DataTypes.STRING, allowNull: false },
      config_hash: { type: DataTypes.STRING, allowNull: false },
      overall: { type: DataTypes.INTEGER, allowNull: false },
      grade: { type: DataTypes.STRING, allowNull: false },
      created_at: { type: DataTypes.STRING, allowNull: false },
      run_json: { type: DataTypes.TEXT, allowNull: false },
    },
    { sequelize, tableName: 'runs', timestamps: false },
  );

  FindingRow.init(
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      run_id: { type: DataTypes.STRING, allowNull: false },
      fingerprint: { type: DataTypes.STRING, allowNull: false },
      rule_id: { type: DataTypes.STRING, allowNull: false },
      severity: { type: DataTypes.STRING, allowNull: false },
      file: { type: DataTypes.STRING, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      location_json: { type: DataTypes.TEXT, allowNull: false },
    },
    { sequelize, tableName: 'findings', timestamps: false },
  );
}

function mapRun(row: RunRow): StoredRun {
  return {
    id: row.id,
    projectId: row.project_id,
    sha: row.sha,
    branch: row.branch,
    runKind: row.run_kind,
    configHash: row.config_hash,
    overall: Number(row.overall),
    grade: row.grade,
    createdAt: row.created_at,
    run: JSON.parse(row.run_json) as RunV1,
  };
}

export class SqlStore implements CiStore {
  private readonly sequelize: Sequelize;
  private readonly options: StorageOptions;
  private initialized = false;

  constructor(options: StorageOptions) {
    this.options = options;
    this.sequelize = createSequelize(options);
    initModels(this.sequelize);
  }

  /** Run Umzug migrations (call once before use). */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await runMigrations(this.sequelize, this.options);
    this.initialized = true;
  }

  async close(): Promise<void> {
    await this.sequelize.close();
  }

  async createProject(name: string): Promise<CreateProjectResult> {
    const token = generateToken();
    const adminToken = generateToken();
    const project: ProjectRecord = {
      id: generateId(),
      name,
      tokenHash: hashToken(token),
      adminTokenHash: hashToken(adminToken),
      createdAt: new Date().toISOString(),
    };
    await ProjectRow.create({
      id: project.id,
      name: project.name,
      token_hash: project.tokenHash,
      admin_token_hash: project.adminTokenHash,
      created_at: project.createdAt,
    });
    return { id: project.id, name: project.name, token, adminToken };
  }

  async getProjectById(id: string): Promise<ProjectRecord | undefined> {
    const row = await ProjectRow.findByPk(id);
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      tokenHash: row.token_hash,
      adminTokenHash: row.admin_token_hash,
      createdAt: row.created_at,
    };
  }

  async rotateUploadToken(projectId: string): Promise<string> {
    const token = generateToken();
    const [count] = await ProjectRow.update(
      { token_hash: hashToken(token) },
      { where: { id: projectId } },
    );
    if (count === 0) throw new Error(`Unknown project ${projectId}`);
    return token;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    return this.sequelize.transaction(async (transaction) => {
      const runIds = await RunRow.findAll({
        where: { project_id: projectId },
        attributes: ['id'],
        transaction,
      });
      const ids = runIds.map((r) => r.id);
      if (ids.length > 0) {
        await FindingRow.destroy({
          where: { run_id: { [Op.in]: ids } },
          transaction,
        });
      }
      await RunRow.destroy({ where: { project_id: projectId }, transaction });
      const deleted = await ProjectRow.destroy({ where: { id: projectId }, transaction });
      return deleted > 0;
    });
  }

  async listProjects(): Promise<PublicProject[]> {
    const rows = await ProjectRow.findAll({ order: [['created_at', 'DESC']] });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    }));
  }

  async insertRun(projectId: string, run: RunV1): Promise<StoredRun> {
    const stored: StoredRun = {
      id: generateId(),
      projectId,
      sha: run.git.sha,
      branch: run.git.branch,
      runKind: run.runKind,
      configHash: run.configHash,
      overall: run.report.score.overall,
      grade: run.report.score.grade,
      createdAt: new Date().toISOString(),
      run,
    };

    try {
      await this.sequelize.transaction(async (transaction) => {
        await RunRow.create(
          {
            id: stored.id,
            project_id: stored.projectId,
            sha: stored.sha,
            branch: stored.branch,
            run_kind: stored.runKind,
            config_hash: stored.configHash,
            overall: stored.overall,
            grade: stored.grade,
            created_at: stored.createdAt,
            run_json: JSON.stringify(run),
          },
          { transaction },
        );

        for (const finding of run.report.findings) {
          await FindingRow.create(
            {
              id: generateId(),
              run_id: stored.id,
              fingerprint: fingerprintFinding(finding),
              rule_id: finding.ruleId,
              severity: finding.severity,
              file: finding.location.file,
              message: finding.message,
              location_json: JSON.stringify(finding.location),
            },
            { transaction },
          );
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? err.name : '';
      if (
        message.includes('UNIQUE') ||
        message.toLowerCase().includes('unique') ||
        message.includes('duplicate') ||
        name === 'SequelizeUniqueConstraintError'
      ) {
        throw new DuplicateRunError(run.git.sha);
      }
      throw err;
    }

    return stored;
  }

  async getRunBySha(
    projectId: string,
    sha: string,
    runKind = 'cognitive',
  ): Promise<StoredRun | undefined> {
    const row = await RunRow.findOne({
      where: { project_id: projectId, sha, run_kind: runKind },
    });
    return row ? mapRun(row) : undefined;
  }

  async listFindings(runId: string): Promise<StoredFinding[]> {
    const rows = await FindingRow.findAll({ where: { run_id: runId } });
    return rows.map((row) => ({
      id: row.id,
      runId: row.run_id,
      fingerprint: row.fingerprint,
      ruleId: row.rule_id,
      severity: row.severity as StoredFinding['severity'],
      file: row.file,
      message: row.message,
      location: JSON.parse(row.location_json) as StoredFinding['location'],
    }));
  }

  async listRuns(projectId: string, options?: { limit?: number }): Promise<StoredRun[]> {
    const limit = options?.limit ?? 50;
    const rows = await RunRow.findAll({
      where: { project_id: projectId },
      order: [['created_at', 'DESC']],
      limit,
    });
    return rows.reverse().map(mapRun);
  }
}

export async function createSqlStore(options: StorageOptions): Promise<SqlStore> {
  const store = new SqlStore(options);
  await store.initialize();
  return store;
}
