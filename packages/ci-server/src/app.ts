import { Hono } from 'hono';
import type { Context } from 'hono';
import {
  ProtocolValidationError,
  compareRuns,
  parseProjectToken,
  parseRunV1,
} from './protocol/index.js';
import { DuplicateRunError, type CiStore } from './store/types.js';
import { generateId, tokensMatch } from './store/tokens.js';
import { faviconSvg } from './ui/brand.js';
import { servePatternflyAsset } from './ui/patternfly-assets.js';
import {
  renderLandingPage,
  renderProjectCreatedPage,
  renderTrendsPage,
  renderUploadTokenPage,
} from './ui/trends.js';

const REVEAL_TTL_MS = 10 * 60 * 1000;

type CreatedReveal = {
  id: string;
  name: string;
  token: string;
  adminToken: string;
  expiresAt: number;
};

type UploadReveal = {
  id: string;
  name: string;
  token: string;
  expiresAt: number;
};

function takeReveal<T extends { expiresAt: number }>(
  map: Map<string, T>,
  key: string | undefined,
): T | undefined {
  if (!key) return undefined;
  const row = map.get(key);
  if (!row) return undefined;
  map.delete(key);
  if (row.expiresAt < Date.now()) return undefined;
  return row;
}

export interface AppOptions {
  store: CiStore;
}

function bearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

export function createApp(options: AppOptions): Hono {
  const app = new Hono();
  const { store } = options;
  const createdReveals = new Map<string, CreatedReveal>();
  const uploadReveals = new Map<string, UploadReveal>();

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/favicon.svg', (c) =>
    c.body(faviconSvg(), 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }),
  );

  app.get('/patternfly/*', (c) => servePatternflyAsset(c));

  async function landing(c: Context, status?: 400 | 401, error?: string) {
    const q = (c.req.query('q') ?? '').trim();
    const html = renderLandingPage(await store.listProjects(), {
      ...(error ? { error } : {}),
      deleted: c.req.query('deleted') === '1',
      ...(q ? { q } : {}),
    });
    return status ? c.html(html, status) : c.html(html);
  }

  app.get('/', (c) => landing(c));
  app.get('/projects', (c) => landing(c));

  app.post('/projects/new', async (c) => {
    const form = await c.req.parseBody();
    const name = typeof form['name'] === 'string' ? form['name'].trim() : '';
    if (!name) {
      return landing(c, 400, 'Project name is required');
    }
    const project = await store.createProject(name);
    const reveal = generateId();
    createdReveals.set(reveal, { ...project, expiresAt: Date.now() + REVEAL_TTL_MS });
    return c.redirect(`/projects/${project.id}/created?reveal=${encodeURIComponent(reveal)}`, 303);
  });

  app.get('/projects/:projectId/created', async (c) => {
    const project = await store.getProjectById(c.req.param('projectId'));
    if (!project) {
      return c.html('Project not found', 404);
    }
    const revealed = takeReveal(createdReveals, c.req.query('reveal'));
    if (!revealed || revealed.id !== project.id) {
      return c.html(
        renderLandingPage(await store.listProjects(), {
          error: 'Tokens were already shown. Use the project admin token to issue a new upload token if needed.',
        }),
      );
    }
    return c.html(renderProjectCreatedPage(revealed));
  });

  app.post('/projects/upload-token', async (c) => {
    const form = await c.req.parseBody();
    const projectId = typeof form['projectId'] === 'string' ? form['projectId'].trim() : '';
    const adminRaw = typeof form['adminToken'] === 'string' ? form['adminToken'] : '';
    const auth = await authorizeAdmin(projectId, adminRaw);
    if ('error' in auth) {
      return landing(c, 401, 'Invalid project admin token');
    }
    const token = await store.rotateUploadToken(auth.project.id);
    const reveal = generateId();
    uploadReveals.set(reveal, {
      id: auth.project.id,
      name: auth.project.name,
      token,
      expiresAt: Date.now() + REVEAL_TTL_MS,
    });
    return c.redirect(
      `/projects/${auth.project.id}/upload-token?reveal=${encodeURIComponent(reveal)}`,
      303,
    );
  });

  app.get('/projects/:projectId/upload-token', async (c) => {
    const project = await store.getProjectById(c.req.param('projectId'));
    if (!project) {
      return c.html('Project not found', 404);
    }
    const revealed = takeReveal(uploadReveals, c.req.query('reveal'));
    if (!revealed || revealed.id !== project.id) {
      return landing(c, 400, 'That upload token was already shown.');
    }
    return c.html(renderUploadTokenPage(revealed));
  });

  app.post('/projects/delete', async (c) => {
    const form = await c.req.parseBody();
    const projectId = typeof form['projectId'] === 'string' ? form['projectId'].trim() : '';
    const adminRaw = typeof form['adminToken'] === 'string' ? form['adminToken'] : '';
    const auth = await authorizeAdmin(projectId, adminRaw);
    if ('error' in auth) {
      return landing(c, 401, 'Invalid project admin token');
    }
    await store.deleteProject(auth.project.id);
    return c.redirect('/projects?deleted=1', 303);
  });

  app.post('/v1/projects', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid json' }, 400);
    }
    const name =
      typeof body === 'object' && body && 'name' in body && typeof body.name === 'string'
        ? body.name.trim()
        : '';
    if (!name) {
      return c.json({ error: 'name is required' }, 400);
    }
    const project = await store.createProject(name);
    return c.json(project, 201);
  });

  async function authorizeUpload(projectId: string, tokenRaw: string | undefined) {
    let token: string;
    try {
      token = parseProjectToken(tokenRaw);
    } catch {
      return { error: 'unauthorized' as const, status: 401 as const };
    }
    const project = await store.getProjectById(projectId);
    if (!project || !tokensMatch(token, project.tokenHash)) {
      return { error: 'unauthorized' as const, status: 401 as const };
    }
    return { project };
  }

  async function authorizeAdmin(projectId: string, tokenRaw: string | undefined) {
    let token: string;
    try {
      token = parseProjectToken(tokenRaw);
    } catch {
      return { error: 'unauthorized' as const, status: 401 as const };
    }
    const project = await store.getProjectById(projectId);
    if (!project || !tokensMatch(token, project.adminTokenHash)) {
      return { error: 'unauthorized' as const, status: 401 as const };
    }
    return { project };
  }

  app.post('/v1/projects/:projectId/runs', async (c) => {
    const auth = await authorizeUpload(c.req.param('projectId'), bearerToken(c.req.header('Authorization')));
    if ('error' in auth) {
      return c.json({ error: auth.error }, auth.status);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid json' }, 400);
    }
    try {
      const run = parseRunV1(body);
      const stored = await store.insertRun(auth.project.id, run);
      return c.json({ id: stored.id, sha: stored.sha }, 201);
    } catch (err) {
      if (err instanceof ProtocolValidationError) {
        return c.json({ error: 'invalid run', issues: err.issues }, 400);
      }
      if (err instanceof DuplicateRunError) {
        return c.json({ error: 'duplicate sha', sha: err.sha }, 409);
      }
      throw err;
    }
  });

  app.post('/v1/projects/:projectId/upload-token', async (c) => {
    const auth = await authorizeAdmin(c.req.param('projectId'), bearerToken(c.req.header('Authorization')));
    if ('error' in auth) {
      return c.json({ error: auth.error }, auth.status);
    }
    const token = await store.rotateUploadToken(auth.project.id);
    return c.json({ token });
  });

  app.delete('/v1/projects/:projectId', async (c) => {
    const auth = await authorizeAdmin(c.req.param('projectId'), bearerToken(c.req.header('Authorization')));
    if ('error' in auth) {
      return c.json({ error: auth.error }, auth.status);
    }
    const deleted = await store.deleteProject(auth.project.id);
    if (!deleted) {
      return c.json({ error: 'not found' }, 404);
    }
    return c.json({ deleted: true });
  });

  app.get('/v1/projects/:projectId/runs/:sha', async (c) => {
    const project = await store.getProjectById(c.req.param('projectId'));
    if (!project) {
      return c.json({ error: 'not found' }, 404);
    }
    const stored = await store.getRunBySha(project.id, c.req.param('sha'));
    if (!stored) {
      return c.json({ error: 'not found' }, 404);
    }
    return c.json({
      sha: stored.sha,
      branch: stored.branch,
      overall: stored.overall,
      grade: stored.grade,
      configHash: stored.configHash,
      createdAt: stored.createdAt,
      summary: stored.run.report.summary,
      score: stored.run.report.score,
    });
  });

  app.get('/v1/projects/:projectId/runs', async (c) => {
    const project = await store.getProjectById(c.req.param('projectId'));
    if (!project) {
      return c.json({ error: 'not found' }, 404);
    }
    const limitRaw = c.req.query('limit');
    const parsed = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
    const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 200) : 50;
    const runs = await store.listRuns(project.id, { limit });
    return c.json({
      runs: runs.map((r) => ({
        sha: r.sha,
        branch: r.branch,
        overall: r.overall,
        grade: r.grade,
        configHash: r.configHash,
        createdAt: r.createdAt,
        findingCount: r.run.report.summary.totalFindings,
      })),
    });
  });

  app.get('/v1/projects/:projectId/compare', async (c) => {
    const project = await store.getProjectById(c.req.param('projectId'));
    if (!project) {
      return c.json({ error: 'not found' }, 404);
    }
    const baseSha = c.req.query('baseSha');
    const headSha = c.req.query('headSha');
    if (!baseSha || !headSha) {
      return c.json({ error: 'baseSha and headSha are required' }, 400);
    }
    const base = await store.getRunBySha(project.id, baseSha);
    if (!base) {
      return c.json({ error: 'base run not found' }, 404);
    }
    const head = await store.getRunBySha(project.id, headSha);
    if (!head) {
      return c.json({ error: 'head run not found' }, 404);
    }
    const diff = compareRuns(base.run, head.run);
    return c.json({
      configHashMismatch: diff.configHashMismatch,
      shouldFailOnNewHigh: diff.shouldFailOnNewHigh,
      added: diff.added.map((f) => f.finding),
      removed: diff.removed.map((f) => f.finding),
      unchangedCount: diff.unchanged.length,
      newHighOrCritical: diff.newHighOrCritical.map((f) => f.finding),
    });
  });

  app.get('/projects/:projectId/trends', async (c) => {
    const project = await store.getProjectById(c.req.param('projectId'));
    if (!project) {
      return c.html('Project not found', 404);
    }
    const runs = await store.listRuns(project.id, { limit: 200 });
    const filters = {
      branch: (c.req.query('branch') ?? '').trim(),
      grade: (c.req.query('grade') ?? '').trim(),
      sha: (c.req.query('sha') ?? '').trim(),
      from: (c.req.query('from') ?? '').trim(),
      to: (c.req.query('to') ?? '').trim(),
      run: (c.req.query('run') ?? '').trim(),
    };
    return c.html(renderTrendsPage(project.name, runs, project.id, filters));
  });

  return app;
}
