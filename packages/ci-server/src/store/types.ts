import type { Finding, SourceLocation } from '@cognitivelint/core';
import type { RunV1 } from '../protocol/index.js';

export class DuplicateRunError extends Error {
  constructor(public readonly sha: string) {
    super(`Run already exists for sha ${sha}`);
    this.name = 'DuplicateRunError';
  }
}

export interface ProjectRecord {
  id: string;
  name: string;
  tokenHash: string;
  adminTokenHash: string;
  createdAt: string;
}

export interface StoredFinding {
  id: string;
  runId: string;
  fingerprint: string;
  ruleId: string;
  severity: Finding['severity'];
  file: string;
  message: string;
  location: SourceLocation;
}

export interface StoredRun {
  id: string;
  projectId: string;
  sha: string;
  branch: string;
  runKind: string;
  configHash: string;
  overall: number;
  grade: string;
  createdAt: string;
  run: RunV1;
}

export interface PublicProject {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateProjectResult {
  id: string;
  name: string;
  token: string;
  adminToken: string;
}

export interface CiStore {
  createProject(name: string): Promise<CreateProjectResult>;
  getProjectById(id: string): Promise<ProjectRecord | undefined>;
  listProjects(): Promise<PublicProject[]>;
  rotateUploadToken(projectId: string): Promise<string>;
  deleteProject(projectId: string): Promise<boolean>;
  insertRun(projectId: string, run: RunV1): Promise<StoredRun>;
  getRunBySha(projectId: string, sha: string, runKind?: string): Promise<StoredRun | undefined>;
  listFindings(runId: string): Promise<StoredFinding[]>;
  listRuns(projectId: string, options?: { limit?: number }): Promise<StoredRun[]>;
}
