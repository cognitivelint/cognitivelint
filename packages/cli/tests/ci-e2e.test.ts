import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { makeFinding, makeReport, makeRun } from '../../ci-server/tests/protocol/fixtures.js';
import { createApp } from '../../ci-server/src/app.js';
import { openSqliteStore } from '../../ci-server/src/store/index.js';
import { uploadRun } from '../src/ci/upload.js';
import { assertRuns } from '../src/ci/assert.js';

describe('CognitiveLint CI e2e', () => {
  it('uploads two runs, fails assert on new high, and serves trends HTML', async () => {
    const dir = join(tmpdir(), `cl-ci-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const dbPath = join(dir, 'ci.sqlite');
    const store = await openSqliteStore(dbPath);
    const app = createApp({ store });

    const created = await app.request('/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'e2e' }),
    });
    expect(created.status).toBe(201);
    const project = (await created.json()) as { id: string; token: string };

    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      return app.request(url.pathname + url.search, init);
    };

    const baseRun = makeRun({
      git: { sha: 'baseeeee', branch: 'main' },
      report: makeReport([]),
    });
    const headRun = makeRun({
      git: { sha: 'headdddd', branch: 'feat' },
      report: makeReport([makeFinding()]),
    });

    const baseFile = join(dir, 'base.json');
    const headFile = join(dir, 'head.json');
    writeFileSync(baseFile, JSON.stringify(baseRun));
    writeFileSync(headFile, JSON.stringify(headRun));

    await uploadRun(
      {
        server: 'http://ci.local',
        token: project.token,
        projectId: project.id,
        file: baseFile,
      },
      fetcher,
    );
    await uploadRun(
      {
        server: 'http://ci.local',
        token: project.token,
        projectId: project.id,
        file: headFile,
      },
      fetcher,
    );

    const asserted = await assertRuns(
      {
        server: 'http://ci.local',
        token: project.token,
        projectId: project.id,
        base: 'baseeeee',
        head: 'headdddd',
        failOnNewHigh: true,
      },
      fetcher,
    );
    expect(asserted.exitCode).toBe(1);

    const trends = await app.request(`/projects/${project.id}/trends`);
    expect(trends.status).toBe(200);
    expect(await trends.text()).toContain('Trends dashboard');

    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
