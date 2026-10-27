import { describe, expect, it } from 'vitest';
import { configHash } from '../src/protocol/index.js';
import { resolveSelectedRunIndex } from '../src/ui/trends.js';
import { makeFinding, makeReport, makeRun } from './protocol/fixtures.js';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/memory.js';
import type { Hono } from 'hono';

async function follow(app: Hono, res: Response): Promise<Response> {
  let current = res;
  for (let i = 0; i < 5 && (current.status === 303 || current.status === 302); i++) {
    const loc = current.headers.get('Location');
    if (!loc) break;
    current = await app.request(loc);
  }
  return current;
}

describe('trends HTML', () => {
  it('GET / and GET /projects list projects without creating one', async () => {
    const store = new MemoryStore();
    const app = createApp({ store });
    const home = await app.request('/');
    expect(home.status).toBe(200);
    const html = await home.text();
    expect(html).toContain('CognitiveLint CI');
    expect(html).toContain('action="/projects/new"');
    expect(html).toContain('action="/projects/delete"');
    expect(html).toContain('cl-card--admin');
    expect(html).not.toContain('CI_ADMIN_TOKEN');

    const listed = await app.request('/projects');
    expect(listed.status).toBe(200);
    expect(await store.listProjects()).toEqual([]);
  });

  it('creates a project from the UI form and shows both tokens once', async () => {
    const app = createApp({ store: new MemoryStore() });
    const posted = await app.request('/projects/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ name: 'from-ui' }).toString(),
    });
    expect(posted.status).toBe(303);
    const res = await follow(app, posted);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Save both tokens now');
    expect(html).toContain('id="cl-upload-token"');
    expect(html).toContain('id="cl-admin-token"');
    expect(html).toContain('Open dashboard (no token)');
  });

  it('replaces the upload token with the project admin token', async () => {
    const app = createApp({ store: new MemoryStore() });
    const created = await app.request('/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'rotate-me' }),
    });
    const project = (await created.json()) as { id: string; token: string; adminToken: string };
    const posted = await app.request('/projects/upload-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        projectId: project.id,
        adminToken: project.adminToken,
      }).toString(),
    });
    expect(posted.status).toBe(303);
    const res = await follow(app, posted);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('The previous upload token no longer works');
  });

  it('deletes a project from the UI with the project admin token', async () => {
    const store = new MemoryStore();
    const app = createApp({ store });
    const project = await store.createProject('gone');
    const posted = await app.request('/projects/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        projectId: project.id,
        adminToken: project.adminToken,
      }).toString(),
    });
    expect(posted.status).toBe(303);
    const res = await follow(app, posted);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Project deleted');
    expect(await store.getProjectById(project.id)).toBeUndefined();
  });

  it('shows an empty trends page without a token', async () => {
    const store = new MemoryStore();
    const app = createApp({ store });
    const project = await store.createProject('acme');
    const res = await app.request(`/projects/${project.id}/trends`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('No runs yet');
    expect(html).toContain('cl-dash');
    expect(html).toContain('pf-v5-c-empty-state');
  });

  it('renders overall score and category labels', async () => {
    const store = new MemoryStore();
    const app = createApp({ store });
    const project = await store.createProject('acme');
    await store.insertRun(
      project.id,
      makeRun({
        git: { sha: '111aaaa', branch: 'main' },
        report: makeReport([]),
      }),
    );
    await store.insertRun(
      project.id,
      makeRun({
        git: { sha: '222bbbb', branch: 'main' },
        report: makeReport([makeFinding()]),
      }),
    );

    const res = await app.request(`/projects/${project.id}/trends`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('cognitive-load');
    expect(html).toContain('error-prevention');
    expect(html).toContain('111aaaa'.slice(0, 7));
    expect(html).toContain('polyline');
    expect(html).toContain('cl-chart__point');
    expect(html).toContain('cl-run-summary');
    expect(html).toContain('cl-run-inspection');
    expect(html).toContain('pf-v5-c-card');
    expect(html).toContain('pf-v5-c-table');
  });

  it('serves PatternFly CSS', async () => {
    const app = createApp({ store: new MemoryStore() });
    const res = await app.request('/patternfly/patternfly.min.css');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/css/);
  });

  it('serves the SVG favicon and brand mark in HTML', async () => {
    const app = createApp({ store: new MemoryStore() });
    const icon = await app.request('/favicon.svg');
    expect(icon.status).toBe(200);
    expect(icon.headers.get('Content-Type')).toMatch(/image\/svg\+xml/);
    expect(await icon.text()).toContain('cl-brand__svg');

    const homeHtml = await (await app.request('/')).text();
    expect(homeHtml).toContain('cl-brand__svg');
    expect(homeHtml).toContain('/favicon.svg');
  });

  it('shows a config-hash warning when hashes differ', async () => {
    const store = new MemoryStore();
    const app = createApp({ store });
    const project = await store.createProject('acme');
    await store.insertRun(
      project.id,
      makeRun({
        git: { sha: '111aaaa', branch: 'main' },
        configHash: configHash({ rules: {} }),
      }),
    );
    await store.insertRun(
      project.id,
      makeRun({
        git: { sha: '222bbbb', branch: 'main' },
        configHash: configHash({ rules: { x: 'off' } }),
      }),
    );

    const res = await app.request(`/projects/${project.id}/trends`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Config changed');
  });

  it('filters the home project list by name', async () => {
    const store = new MemoryStore();
    const app = createApp({ store });
    await store.createProject('alpha-app');
    await store.createProject('beta-service');
    const res = await app.request('/?q=alpha');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="cl-project-q"');
    expect(html).toContain('alpha-app');
    expect(html).toContain('Trends');
    expect(html).toMatch(/cl-hidden[\s\S]*beta-service|beta-service[\s\S]*cl-hidden/);
  });

  it('resolves selected run index from run query', async () => {
    const store = new MemoryStore();
    const project = await store.createProject('acme');
    await store.insertRun(project.id, makeRun({ git: { sha: 'aaaa1111', branch: 'main' } }));
    await store.insertRun(project.id, makeRun({ git: { sha: 'bbbb2222', branch: 'feat' } }));
    const runs = await store.listRuns(project.id);
    expect(resolveSelectedRunIndex(runs, 'bbbb')).toBe(1);
    expect(resolveSelectedRunIndex(runs, '')).toBe(1);
  });

  it('deep-links a selected run via ?run= sha', async () => {
    const store = new MemoryStore();
    const app = createApp({ store });
    const project = await store.createProject('acme');
    await store.insertRun(project.id, makeRun({ git: { sha: 'first111', branch: 'main' } }));
    await store.insertRun(project.id, makeRun({ git: { sha: 'second22', branch: 'main' } }));
    const res = await app.request(`/projects/${project.id}/trends?run=first`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="cl-filter-run"');
    expect(html).toContain('value="first111"');
    expect(html).toContain('syncRunInUrl');
  });

  it('filters trends by branch', async () => {
    const store = new MemoryStore();
    const app = createApp({ store });
    const project = await store.createProject('acme');
    await store.insertRun(
      project.id,
      makeRun({ git: { sha: 'mainsha', branch: 'main' } }),
    );
    await store.insertRun(
      project.id,
      makeRun({ git: { sha: 'featsha', branch: 'feat' } }),
    );
    const res = await app.request(`/projects/${project.id}/trends?branch=feat`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="cl-filter-branch"');
    expect(html).toContain('featsha'.slice(0, 7));
    expect(html).not.toContain('mainsha'.slice(0, 7));
  });
});
