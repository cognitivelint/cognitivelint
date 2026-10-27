import { fingerprintFinding, type RunV1 } from '../protocol/index.js';
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

export class MemoryStore implements CiStore {
  private readonly projects = new Map<string, ProjectRecord>();
  private readonly runs = new Map<string, StoredRun>();
  private readonly findings = new Map<string, StoredFinding[]>();

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
    this.projects.set(project.id, project);
    return { id: project.id, name: project.name, token, adminToken };
  }

  async getProjectById(id: string): Promise<ProjectRecord | undefined> {
    return this.projects.get(id);
  }

  async rotateUploadToken(projectId: string): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Unknown project ${projectId}`);
    }
    const token = generateToken();
    this.projects.set(projectId, { ...project, tokenHash: hashToken(token) });
    return token;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const existed = this.projects.delete(projectId);
    if (!existed) return false;
    for (const [runId, run] of this.runs) {
      if (run.projectId === projectId) {
        this.runs.delete(runId);
        this.findings.delete(runId);
      }
    }
    return true;
  }

  async listProjects(): Promise<PublicProject[]> {
    return [...this.projects.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ id, name, createdAt }) => ({ id, name, createdAt }));
  }

  async insertRun(projectId: string, run: RunV1): Promise<StoredRun> {
    const existing = [...this.runs.values()].find(
      (r) => r.projectId === projectId && r.sha === run.git.sha && r.runKind === run.runKind,
    );
    if (existing) {
      throw new DuplicateRunError(run.git.sha);
    }

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
    this.runs.set(stored.id, stored);
    this.findings.set(
      stored.id,
      run.report.findings.map((finding) => ({
        id: generateId(),
        runId: stored.id,
        fingerprint: fingerprintFinding(finding),
        ruleId: finding.ruleId,
        severity: finding.severity,
        file: finding.location.file,
        message: finding.message,
        location: finding.location,
      })),
    );
    return stored;
  }

  async getRunBySha(
    projectId: string,
    sha: string,
    runKind = 'cognitive',
  ): Promise<StoredRun | undefined> {
    return [...this.runs.values()].find(
      (r) => r.projectId === projectId && r.sha === sha && r.runKind === runKind,
    );
  }

  async listFindings(runId: string): Promise<StoredFinding[]> {
    return this.findings.get(runId) ?? [];
  }

  async listRuns(projectId: string, options?: { limit?: number }): Promise<StoredRun[]> {
    const limit = options?.limit ?? 50;
    const rows = [...this.runs.values()]
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return rows.slice(-limit);
  }
}
