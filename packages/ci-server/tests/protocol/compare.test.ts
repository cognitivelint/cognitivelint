import { describe, expect, it } from 'vitest';
import { compareRuns } from '../../src/protocol/compare.js';
import { configHash } from '../../src/protocol/config-hash.js';
import { makeFinding, makeReport, makeRun } from './fixtures.js';

describe('compareRuns', () => {
  it('classifies added, removed, and unchanged findings', () => {
    const shared = makeFinding();
    const onlyBase = makeFinding({
      ruleId: 'feedback/missing-empty-state',
      message: 'List has no empty state.',
      category: 'feedback',
      severity: 'medium',
    });
    const onlyHead = makeFinding({
      ruleId: 'feedback/missing-loading-state',
      message: 'Async operation has no loading feedback.',
      category: 'feedback',
      severity: 'high',
    });

    const base = makeRun({
      git: { sha: 'base111', branch: 'main' },
      report: makeReport([shared, onlyBase]),
    });
    const head = makeRun({
      git: { sha: 'head222', branch: 'feat' },
      report: makeReport([shared, onlyHead]),
    });

    const result = compareRuns(base, head);
    expect(result.unchanged).toHaveLength(1);
    expect(result.removed.map((f) => f.finding.ruleId)).toEqual([
      'feedback/missing-empty-state',
    ]);
    expect(result.added.map((f) => f.finding.ruleId)).toEqual([
      'feedback/missing-loading-state',
    ]);
  });

  it('lists new high and critical findings', () => {
    const base = makeRun({
      git: { sha: 'base111', branch: 'main' },
      report: makeReport([]),
    });
    const head = makeRun({
      git: { sha: 'head222', branch: 'feat' },
      report: makeReport([
        makeFinding({ severity: 'high' }),
        makeFinding({
          ruleId: 'error-prevention/no-undo',
          severity: 'critical',
          message: 'No undo for destructive action.',
        }),
        makeFinding({
          ruleId: 'consistency/inconsistent-button-labels',
          severity: 'low',
          category: 'consistency',
          message: 'Mixed labels.',
        }),
      ]),
    });

    const result = compareRuns(base, head);
    expect(result.newHighOrCritical).toHaveLength(2);
    expect(result.shouldFailOnNewHigh).toBe(true);
    expect(result.configHashMismatch).toBe(false);
  });

  it('flags configHash mismatch and does not fail on new high', () => {
    const finding = makeFinding();
    const base = makeRun({
      git: { sha: 'base111', branch: 'main' },
      report: makeReport([]),
      configHash: configHash({ rules: {}, weights: { a: 1 } }),
    });
    const head = makeRun({
      git: { sha: 'head222', branch: 'feat' },
      report: makeReport([finding]),
      configHash: configHash({ rules: { 'error-prevention/modal-nesting': 'off' }, weights: { a: 1 } }),
    });

    const result = compareRuns(base, head);
    expect(result.configHashMismatch).toBe(true);
    expect(result.newHighOrCritical).toHaveLength(1);
    expect(result.shouldFailOnNewHigh).toBe(false);
  });
});
