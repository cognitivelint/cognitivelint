import { describe, expect, it } from 'vitest';
import { makeFinding, makeReport, makeRun } from './protocol/fixtures.js';
import { createSqlStore, openSqliteStore } from '../src/store/index.js';
import { MemoryStore } from '../src/store/memory.js';
import { DuplicateRunError, type CiStore } from '../src/store/types.js';
import { hashToken, tokensMatch } from '../src/store/tokens.js';

function storeContract(name: string, create: () => Promise<{ store: CiStore; cleanup?: () => Promise<void> | void }>) {
  describe(name, () => {
    it('creates a project with a hashed token', async () => {
      const { store, cleanup } = await create();
      try {
        const created = await store.createProject('demo');
        expect(created.token.length).toBeGreaterThan(10);
        expect(created.adminToken.length).toBeGreaterThan(10);
        expect(created.adminToken).not.toBe(created.token);
        const project = await store.getProjectById(created.id);
        expect(project?.name).toBe('demo');
        expect(project?.tokenHash).toBe(hashToken(created.token));
        expect(project?.adminTokenHash).toBe(hashToken(created.adminToken));
        expect(tokensMatch(created.token, project!.tokenHash)).toBe(true);
        expect(tokensMatch(created.adminToken, project!.tokenHash)).toBe(false);
        expect(tokensMatch(created.adminToken, project!.adminTokenHash)).toBe(true);
        const rotated = await store.rotateUploadToken(created.id);
        const after = await store.getProjectById(created.id);
        expect(tokensMatch(rotated, after!.tokenHash)).toBe(true);
        expect(tokensMatch(created.token, after!.tokenHash)).toBe(false);
        expect(tokensMatch(created.adminToken, after!.adminTokenHash)).toBe(true);
        const listed = await store.listProjects();
        expect(listed).toEqual([
          expect.objectContaining({ id: created.id, name: 'demo' }),
        ]);
        expect(listed[0]).not.toHaveProperty('token');
        expect(listed[0]).not.toHaveProperty('tokenHash');
      } finally {
        await cleanup?.();
      }
    });

    it('inserts a run and lists findings', async () => {
      const { store, cleanup } = await create();
      try {
        const project = await store.createProject('demo');
        const run = makeRun({ git: { sha: 'sha-one', branch: 'main' } });
        const stored = await store.insertRun(project.id, run);
        const loaded = await store.getRunBySha(project.id, 'sha-one');
        expect(loaded?.id).toBe(stored.id);
        expect(loaded?.overall).toBe(run.report.score.overall);
        const findings = await store.listFindings(stored.id);
        expect(findings).toHaveLength(1);
        expect(findings[0]?.ruleId).toBe(run.report.findings[0]?.ruleId);
        await expect(store.deleteProject(project.id)).resolves.toBe(true);
        expect(await store.getProjectById(project.id)).toBeUndefined();
        expect(await store.listRuns(project.id)).toEqual([]);
        expect(await store.listFindings(stored.id)).toEqual([]);
        await expect(store.deleteProject(project.id)).resolves.toBe(false);
      } finally {
        await cleanup?.();
      }
    });

    it('is idempotent on projectId+sha+runKind by rejecting duplicates', async () => {
      const { store, cleanup } = await create();
      try {
        const project = await store.createProject('demo');
        const run = makeRun({ git: { sha: 'dup-sha', branch: 'main' } });
        await store.insertRun(project.id, run);
        await expect(store.insertRun(project.id, run)).rejects.toBeInstanceOf(DuplicateRunError);
      } finally {
        await cleanup?.();
      }
    });

    it('listRuns returns oldest-to-newest recent window', async () => {
      const { store, cleanup } = await create();
      try {
        const project = await store.createProject('demo');
        await store.insertRun(project.id, makeRun({ git: { sha: 'a', branch: 'main' } }));
        await new Promise((r) => setTimeout(r, 5));
        await store.insertRun(
          project.id,
          makeRun({
            git: { sha: 'b', branch: 'main' },
            report: makeReport([makeFinding({ message: 'other' })]),
          }),
        );
        const listed = await store.listRuns(project.id, { limit: 10 });
        expect(listed.map((r) => r.sha)).toEqual(['a', 'b']);
      } finally {
        await cleanup?.();
      }
    });
  });
}

storeContract('MemoryStore', async () => ({ store: new MemoryStore() }));

storeContract('SqlStore (sqlite)', async () => {
  const store = await openSqliteStore(':memory:');
  return { store, cleanup: () => store.close() };
});

describe.skipIf(!process.env.CI_POSTGRES_URL)('SqlStore (postgres)', () => {
  storeContract('postgres adapter', async () => {
    const store = await createSqlStore({
      storageMethod: 'sql',
      sqlDialect: 'postgres',
      sqlConnectionUrl: process.env.CI_POSTGRES_URL!,
    });
    return { store, cleanup: () => store.close() };
  });
});
