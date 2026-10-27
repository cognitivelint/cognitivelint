import type { Finding, Report } from '@cognitivelint/core';
import type { RunV1 } from '../../src/protocol/schema.js';
import { configHash } from '../../src/protocol/config-hash.js';
import { RUN_SCHEMA } from '../../src/protocol/schema.js';

export function makeFinding(overrides: Partial<Finding> = {}): Finding {
  const finding: Finding = {
    ruleId: overrides.ruleId ?? 'error-prevention/destructive-no-confirm',
    severity: overrides.severity ?? 'high',
    confidence: overrides.confidence ?? 70,
    category: overrides.category ?? 'error-prevention',
    message: overrides.message ?? 'Destructive action lacks confirmation.',
    location: {
      file: 'src/UserTable.tsx',
      startLine: 10,
      startColumn: 2,
      endLine: 12,
      endColumn: 4,
      ...overrides.location,
    },
  };
  if (overrides.context) {
    finding.context = overrides.context;
  }
  if (overrides.fix) {
    finding.fix = overrides.fix;
  }
  return finding;
}

export function makeReport(findings: Finding[] = [makeFinding()]): Report {
  const config = { rules: {}, weights: { 'cognitive-load': 30 } };
  return {
    tool: { name: 'CognitiveLint', version: '0.2.1' },
    timestamp: '2026-01-01T00:00:00.000Z',
    project: { name: 'demo', path: '/demo' },
    score: {
      overall: 80,
      grade: 'B',
      categories: [
        { category: 'cognitive-load', score: 90, weight: 30, findingCount: 0 },
        { category: 'trust-confidence', score: 90, weight: 20, findingCount: 0 },
        { category: 'feedback', score: 80, weight: 15, findingCount: 0 },
        { category: 'discoverability', score: 80, weight: 15, findingCount: 0 },
        { category: 'consistency', score: 90, weight: 10, findingCount: 0 },
        { category: 'error-prevention', score: 70, weight: 10, findingCount: findings.length },
      ],
    },
    findings,
    summary: {
      totalFindings: findings.length,
      bySeverity: { high: findings.length },
      byCategory: { 'error-prevention': findings.length },
      filesAnalyzed: 1,
      componentsAnalyzed: 1,
      scanDurationMs: 12,
    },
    config,
  };
}

export function makeRun(overrides: Partial<RunV1> = {}): RunV1 {
  const report = overrides.report ?? makeReport();
  return {
    schema: RUN_SCHEMA,
    git: {
      sha: 'abc1234deadbeef',
      branch: 'main',
      ...overrides.git,
    },
    tool: {
      name: 'CognitiveLint',
      version: '0.2.1',
      rulesVersion: '0.2.1',
      ...overrides.tool,
    },
    configHash: overrides.configHash ?? configHash(report.config),
    runKind: 'cognitive',
    report,
    ...pickDefined(overrides, ['ci']),
  };
}

function pickDefined<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Partial<Pick<T, K>> {
  const out: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}
