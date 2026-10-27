import { execFileSync } from 'node:child_process';

export interface GitMeta {
  sha: string;
  branch: string;
  baseSha?: string;
  prNumber?: number;
}

function git(args: string[]): string | undefined {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim() || undefined;
  } catch {
    return undefined;
  }
}

function branchFromRef(ref: string | undefined): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith('refs/heads/')) return ref.slice('refs/heads/'.length);
  if (ref.startsWith('refs/tags/')) return ref.slice('refs/tags/'.length);
  if (ref === 'HEAD' || ref.startsWith('refs/pull/')) return undefined;
  return ref;
}

export function collectGitMeta(
  env: NodeJS.ProcessEnv = process.env,
  gitExec: (args: string[]) => string | undefined = git,
): GitMeta {
  const sha = env.GITHUB_SHA ?? gitExec(['rev-parse', 'HEAD']);
  if (!sha) {
    throw new Error('Unable to determine git sha (set GITHUB_SHA or run inside a git repo)');
  }

  const branch =
    env.GITHUB_HEAD_REF ||
    env.GITHUB_REF_NAME ||
    branchFromRef(env.GITHUB_REF) ||
    gitExec(['rev-parse', '--abbrev-ref', 'HEAD']) ||
    'HEAD';

  const meta: GitMeta = { sha, branch };

  if (env.COGNITIVELINT_BASE_SHA) {
    meta.baseSha = env.COGNITIVELINT_BASE_SHA;
  } else if (env.GITHUB_BASE_REF) {
    const mergeBase =
      gitExec(['merge-base', 'HEAD', `origin/${env.GITHUB_BASE_REF}`]) ??
      gitExec(['merge-base', 'HEAD', env.GITHUB_BASE_REF]);
    if (mergeBase) {
      meta.baseSha = mergeBase;
    }
  }

  const pr = env.GITHUB_PR_NUMBER ?? env.PULL_REQUEST_NUMBER;
  if (pr && /^\d+$/.test(pr)) {
    meta.prNumber = Number.parseInt(pr, 10);
  }

  return meta;
}
