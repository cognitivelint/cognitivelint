import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

export interface MigrationContext {
  queryInterface: QueryInterface;
}

export async function up({ queryInterface }: MigrationContext): Promise<void> {
  const tables = await queryInterface.showAllTables();
  const has = (name: string) =>
    tables.some((t) => t.toLowerCase() === name.toLowerCase());

  if (!has('projects')) {
    await queryInterface.createTable('projects', {
      id: { type: DataTypes.STRING, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      token_hash: { type: DataTypes.STRING, allowNull: false },
      admin_token_hash: { type: DataTypes.STRING, allowNull: false },
      created_at: { type: DataTypes.STRING, allowNull: false },
    });
  }

  if (!has('runs')) {
    await queryInterface.createTable('runs', {
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
    });
    await queryInterface.addIndex('runs', ['project_id', 'sha', 'run_kind'], {
      unique: true,
      name: 'runs_project_sha_kind_unique',
    });
  }

  if (!has('findings')) {
    await queryInterface.createTable('findings', {
      id: { type: DataTypes.STRING, primaryKey: true },
      run_id: { type: DataTypes.STRING, allowNull: false },
      fingerprint: { type: DataTypes.STRING, allowNull: false },
      rule_id: { type: DataTypes.STRING, allowNull: false },
      severity: { type: DataTypes.STRING, allowNull: false },
      file: { type: DataTypes.STRING, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      location_json: { type: DataTypes.TEXT, allowNull: false },
    });
    await queryInterface.addIndex('findings', ['run_id'], {
      name: 'findings_run_id_idx',
    });
  }
}

export async function down({ queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('findings');
  await queryInterface.dropTable('runs');
  await queryInterface.dropTable('projects');
}
