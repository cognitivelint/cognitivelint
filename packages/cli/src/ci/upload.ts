import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';
import type { Report } from '@cognitivelint/core';
import { parseRunV1, type RunV1 } from '@cognitivelint/ci-server/protocol';
import { collectGitMeta } from './git.js';
import { reportToRunV1 } from './build-run.js';

export interface UploadOptions {
  server: string;
  token: string;
  projectId: string;
  file?: string;
  run?: RunV1;
}

function lastReportPath(): string {
  return join(process.cwd(), '.cognitivelint', 'last-run.json');
}

async function loadRun(options: UploadOptions): Promise<RunV1> {
  if (options.run) {
    return options.run;
  }
  if (options.file) {
    const raw = JSON.parse(await readFile(options.file, 'utf8')) as unknown;
    if (raw && typeof raw === 'object' && 'schema' in raw) {
      return parseRunV1(raw);
    }
    return reportToRunV1(raw as Report, collectGitMeta());
  }

  const { executeScan } = await import('../commands/scan.js');
  const report = await executeScan({ format: 'json' });
  if (!report) {
    throw new Error('Scan produced no report (no files found?)');
  }
  return reportToRunV1(report, collectGitMeta());
}

export async function uploadRun(
  options: UploadOptions,
  fetcher: typeof fetch = fetch,
): Promise<{ id: string; sha: string; run: RunV1 }> {
  const run = await loadRun(options);
  await mkdir(join(process.cwd(), '.cognitivelint'), { recursive: true });
  await writeFile(lastReportPath(), JSON.stringify(run, null, 2));

  const url = `${options.server.replace(/\/$/, '')}/v1/projects/${options.projectId}/runs`;
  const res = await fetcher(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(run),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  const parsed = JSON.parse(text) as { id: string; sha: string };
  return { ...parsed, run };
}

export async function uploadCommand(options: UploadOptions): Promise<void> {
  try {
    const result = await uploadRun(options);
    console.log(chalk.green(`Uploaded run ${result.sha} (${result.id})`));
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
