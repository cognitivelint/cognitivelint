import { describe, expect, it } from 'vitest';
import { makeFinding, makeReport, makeRun } from './protocol/fixtures.js';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/memory.js';

async function setup() {
  const store = new MemoryStore();
  const app = createApp({ store });
  const created = await app.request('/v1/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'acme' }),
  });
  const project = (await created.json()) as { id: string; token: string; adminToken: string };
  return { app, project };
}

describe('ci-server HTTP API', () => {
  it('GET /health', async () => {
    const app = createApp({ store: new MemoryStore() });
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns 401 without a project token', async () => {
    const { app, project } = await setup();
    const res = await app.request(`/v1/projects/${project.id}/runs`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid run body', async () => {
    const { app, project } = await setup();
    const res = await app.request(`/v1/projects/${project.id}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${project.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ schema: 'nope' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 for a duplicate sha', async () => {
    const { app, project } = await setup();
    const run = makeRun({ git: { sha: 'deadbeef', branch: 'main' } });
    const headers = {
      Authorization: `Bearer ${project.token}`,
      'Content-Type': 'application/json',
    };
    const first = await app.request(`/v1/projects/${project.id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(run),
    });
    expect(first.status).toBe(201);
    const second = await app.request(`/v1/projects/${project.id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(run),
    });
    expect(second.status).toBe(409);
  });

  it('compares two runs and 404s when base is missing', async () => {
    const { app, project } = await setup();
    const headers = {
      Authorization: `Bearer ${project.token}`,
      'Content-Type': 'application/json',
    };
    const base = makeRun({
      git: { sha: 'base-sha', branch: 'main' },
      report: makeReport([]),
    });
    const head = makeRun({
      git: { sha: 'head-sha', branch: 'feat' },
      report: makeReport([makeFinding()]),
    });
    await app.request(`/v1/projects/${project.id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(base),
    });
    await app.request(`/v1/projects/${project.id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(head),
    });

    const ok = await app.request(
      `/v1/projects/${project.id}/compare?baseSha=base-sha&headSha=head-sha`,
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { shouldFailOnNewHigh: boolean; newHighOrCritical: unknown[] };
    expect(body.shouldFailOnNewHigh).toBe(true);
    expect(body.newHighOrCritical).toHaveLength(1);

    const missing = await app.request(
      `/v1/projects/${project.id}/compare?baseSha=nope&headSha=head-sha`,
    );
    expect(missing.status).toBe(404);

    const listed = await app.request(`/v1/projects/${project.id}/runs`);
    expect(listed.status).toBe(200);
    const listedBody = (await listed.json()) as { runs: { sha: string }[] };
    expect(listedBody.runs.map((r) => r.sha)).toEqual(['base-sha', 'head-sha']);

    const one = await app.request(`/v1/projects/${project.id}/runs/head-sha`);
    expect(one.status).toBe(200);
    expect((await one.json() as { sha: string }).sha).toBe('head-sha');
  });

  it('rejects the project admin token for uploads and accepts it for rotation', async () => {
    const { app, project } = await setup();
    const run = makeRun({ git: { sha: 'admin-upload', branch: 'main' } });
    const asAdmin = await app.request(`/v1/projects/${project.id}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${project.adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(run),
    });
    expect(asAdmin.status).toBe(401);

    const rotated = await app.request(`/v1/projects/${project.id}/upload-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${project.adminToken}` },
    });
    expect(rotated.status).toBe(200);
    const { token: nextToken } = (await rotated.json()) as { token: string };
    expect(nextToken).not.toBe(project.token);

    const withOld = await app.request(`/v1/projects/${project.id}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${project.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(run),
    });
    expect(withOld.status).toBe(401);

    const withNew = await app.request(`/v1/projects/${project.id}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nextToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(run),
    });
    expect(withNew.status).toBe(201);
  });

  it('deletes a project with the admin token and rejects the upload token', async () => {
    const { app, project } = await setup();
    const asUpload = await app.request(`/v1/projects/${project.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${project.token}` },
    });
    expect(asUpload.status).toBe(401);

    const deleted = await app.request(`/v1/projects/${project.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${project.adminToken}` },
    });
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ deleted: true });

    const trends = await app.request(`/projects/${project.id}/trends`);
    expect(trends.status).toBe(404);
  });
});
