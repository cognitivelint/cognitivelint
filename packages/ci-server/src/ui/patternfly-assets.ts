import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import type { Context } from 'hono';

const require = createRequire(import.meta.url);

function patternflyRoot(): string {
  return dirname(require.resolve('@patternfly/patternfly/package.json'));
}

const MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
};

export function servePatternflyAsset(c: Context): Response {
  const rel = c.req.path.replace(/^\/patternfly\/?/, '');
  if (!rel || rel.includes('..')) {
    return new Response('Not found', { status: 404 });
  }
  const root = patternflyRoot();
  const file = resolve(join(root, rel));
  const normalizedRoot = normalize(root);
  if (!file.startsWith(normalizedRoot)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    if (!statSync(file).isFile()) {
      return new Response('Not found', { status: 404 });
    }
    const body = readFileSync(file);
    const type = MIME[extname(file)] ?? 'application/octet-stream';
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
