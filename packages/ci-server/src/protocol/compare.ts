import type { Finding, Severity } from '@cognitivelint/core';
import { fingerprintFinding } from './fingerprint.js';
import type { RunV1 } from './schema.js';

export interface FingerprintedFinding {
  fingerprint: string;
  finding: Finding;
}

export interface CompareResult {
  added: FingerprintedFinding[];
  removed: FingerprintedFinding[];
  unchanged: FingerprintedFinding[];
  newHighOrCritical: FingerprintedFinding[];
  configHashMismatch: boolean;
  /** Fail CI when hashes match and new high/critical findings exist. */
  shouldFailOnNewHigh: boolean;
}

const HIGH: ReadonlySet<Severity> = new Set(['high', 'critical']);

function indexFindings(findings: RunV1['report']['findings']): Map<string, FingerprintedFinding> {
  const map = new Map<string, FingerprintedFinding>();
  for (const finding of findings) {
    const asFinding = finding as Finding;
    const fingerprint = fingerprintFinding(asFinding);
    if (!map.has(fingerprint)) {
      map.set(fingerprint, { fingerprint, finding: asFinding });
    }
  }
  return map;
}

export function compareRuns(base: RunV1, head: RunV1): CompareResult {
  const baseMap = indexFindings(base.report.findings);
  const headMap = indexFindings(head.report.findings);

  const added: FingerprintedFinding[] = [];
  const removed: FingerprintedFinding[] = [];
  const unchanged: FingerprintedFinding[] = [];

  for (const [fp, item] of headMap) {
    if (baseMap.has(fp)) {
      unchanged.push(item);
    } else {
      added.push(item);
    }
  }

  for (const [fp, item] of baseMap) {
    if (!headMap.has(fp)) {
      removed.push(item);
    }
  }

  const newHighOrCritical = added.filter((item) => HIGH.has(item.finding.severity));
  const configHashMismatch = base.configHash !== head.configHash;

  return {
    added,
    removed,
    unchanged,
    newHighOrCritical,
    configHashMismatch,
    shouldFailOnNewHigh: !configHashMismatch && newHighOrCritical.length > 0,
  };
}
