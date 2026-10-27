import type { Report } from '@cognitivelint/core';
import { RUN_SCHEMA, configHash, type RunV1 } from '@cognitivelint/ci-server/protocol';
import type { GitMeta } from './git.js';
import { readCliVersion, readRulesVersion } from './versions.js';

export function reportToRunV1(report: Report, git: GitMeta): RunV1 {
  const gitMeta: RunV1['git'] = {
    sha: git.sha,
    branch: git.branch,
  };
  if (git.baseSha) {
    gitMeta.baseSha = git.baseSha;
  }
  if (git.prNumber !== undefined) {
    gitMeta.prNumber = git.prNumber;
  }

  const run: RunV1 = {
    schema: RUN_SCHEMA,
    git: gitMeta,
    tool: {
      name: 'CognitiveLint',
      version: readCliVersion(),
      rulesVersion: readRulesVersion(),
    },
    configHash: configHash(report.config),
    runKind: 'cognitive',
    report: {
      ...report,
      tool: {
        name: 'CognitiveLint',
        version: readCliVersion(),
      },
    } as RunV1['report'],
  };

  const provider = process.env.GITHUB_ACTIONS ? 'github' : undefined;
  const jobUrl =
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined;
  if (provider || jobUrl) {
    run.ci = {};
    if (provider) run.ci.provider = provider;
    if (jobUrl) run.ci.jobUrl = jobUrl;
  }
  return run;
}
