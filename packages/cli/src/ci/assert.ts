import chalk from 'chalk';
import type { Finding } from '@cognitivelint/core';

export interface AssertOptions {
  server: string;
  token?: string;
  projectId: string;
  base: string;
  head: string;
  failOnNewHigh?: boolean;
}

export interface CompareResponse {
  configHashMismatch: boolean;
  shouldFailOnNewHigh: boolean;
  added: Finding[];
  removed: Finding[];
  unchangedCount: number;
  newHighOrCritical: Finding[];
}

export async function fetchCompare(
  options: AssertOptions,
  fetcher: typeof fetch = fetch,
): Promise<CompareResponse> {
  const base = options.server.replace(/\/$/, '');
  const url = `${base}/v1/projects/${options.projectId}/compare?baseSha=${encodeURIComponent(options.base)}&headSha=${encodeURIComponent(options.head)}`;
  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  const res = await fetcher(url, { headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Compare failed (${res.status}): ${text}`);
  }
  return JSON.parse(text) as CompareResponse;
}

export function shouldExitFailure(compare: CompareResponse, failOnNewHigh: boolean): boolean {
  return failOnNewHigh && compare.shouldFailOnNewHigh;
}

export function formatCompare(compare: CompareResponse): string {
  const lines = [
    `Added: ${compare.added.length}  Removed: ${compare.removed.length}  Unchanged: ${compare.unchangedCount}`,
  ];
  if (compare.configHashMismatch) {
    lines.push('Warning: configHash differs; not failing on score/finding deltas.');
  }
  if (compare.newHighOrCritical.length > 0) {
    lines.push('New high/critical:');
    for (const f of compare.newHighOrCritical) {
      lines.push(`  ${f.severity}  ${f.ruleId}  ${f.location.file}`);
    }
  }
  return lines.join('\n');
}

export async function assertRuns(
  options: AssertOptions,
  fetcher: typeof fetch = fetch,
): Promise<{ exitCode: number; output: string }> {
  const failOnNewHigh = options.failOnNewHigh !== false;
  const compare = await fetchCompare(options, fetcher);
  const output = formatCompare(compare);
  const exitCode = shouldExitFailure(compare, failOnNewHigh) ? 1 : 0;
  return { exitCode, output };
}

export async function assertCommand(options: AssertOptions): Promise<void> {
  try {
    const result = await assertRuns(options);
    console.log(result.output);
    if (result.exitCode !== 0) {
      console.error(chalk.red('New high/critical cognitive findings vs base.'));
      process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
