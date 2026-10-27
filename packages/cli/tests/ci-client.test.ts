import { describe, expect, it } from 'vitest';
import { collectGitMeta } from '../src/ci/git.js';
import { reportToRunV1 } from '../src/ci/build-run.js';
import { uploadRun } from '../src/ci/upload.js';
import { assertRuns, shouldExitFailure } from '../src/ci/assert.js';
import { parseRunV1 } from '@cognitivelint/ci-server/protocol';
import { makeFinding, makeReport, makeRun } from '../../ci-server/tests/protocol/fixtures.js';

describe('collectGitMeta', () => {
  it('reads GitHub Actions env without calling git', () => {
    const meta = collectGitMeta(
      {
        GITHUB_SHA: 'abc123',
        GITHUB_REF_NAME: 'feat/ci',
        GITHUB_PR_NUMBER: '42',
        COGNITIVELINT_BASE_SHA: 'base999',
      },
      () => {
        throw new Error('git should not run');
      },
    );
    expect(meta).toEqual({
      sha: 'abc123',
      branch: 'feat/ci',
      baseSha: 'base999',
      prNumber: 42,
    });
  });

  it('throws when sha cannot be determined', () => {
    expect(() => collectGitMeta({}, () => undefined)).toThrow(/git sha/);
  });
});

describe('reportToRunV1', () => {
  it('wraps a report with a valid protocol envelope', () => {
    const run = reportToRunV1(makeReport(), { sha: 'deadbeef', branch: 'main' });
    expect(parseRunV1(run).git.sha).toBe('deadbeef');
    expect(run.tool.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('uploadRun', () => {
  it('POSTs a valid RunV1 body', async () => {
    const run = makeRun({ git: { sha: 'upload-sha', branch: 'main' } });
    let body = '';
    const fetcher: typeof fetch = async (_url, init) => {
      body = String(init?.body);
      return new Response(JSON.stringify({ id: 'run-1', sha: 'upload-sha' }), { status: 201 });
    };
    const result = await uploadRun(
      {
        server: 'http://ci.example',
        token: 'tok',
        projectId: 'proj',
        run,
      },
      fetcher,
    );
    expect(result.sha).toBe('upload-sha');
    expect(parseRunV1(JSON.parse(body)).git.sha).toBe('upload-sha');
  });
});

describe('assertRuns', () => {
  it('exits 1 when compare says fail on new high', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          configHashMismatch: false,
          shouldFailOnNewHigh: true,
          added: [makeFinding()],
          removed: [],
          unchangedCount: 0,
          newHighOrCritical: [makeFinding()],
        }),
        { status: 200 },
      );
    const result = await assertRuns(
      {
        server: 'http://ci.example',
        token: 'tok',
        projectId: 'proj',
        base: 'a',
        head: 'b',
      },
      fetcher,
    );
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('error-prevention/destructive-no-confirm');
  });

  it('does not fail when config hashes differ', () => {
    expect(
      shouldExitFailure(
        {
          configHashMismatch: true,
          shouldFailOnNewHigh: false,
          added: [],
          removed: [],
          unchangedCount: 0,
          newHighOrCritical: [makeFinding()],
        },
        true,
      ),
    ).toBe(false);
  });
});
