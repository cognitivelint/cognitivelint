import { createHash } from 'node:crypto';
import type { Finding } from '@cognitivelint/core';

export type FingerprintInput = {
  ruleId: string;
  message: string;
  location: Finding['location'];
  context?: Record<string, unknown> | undefined;
};

export function normalizeFilePath(file: string): string {
  return file.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function normalizeMessage(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, ' ');
}

function nearbyComponent(finding: FingerprintInput): string {
  const ctx = finding.context;
  if (!ctx) return '';
  const keys = ['buttonText', 'component', 'tagName', 'nearby'] as const;
  for (const key of keys) {
    const value = ctx[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }
  }
  return '';
}

export function fingerprintFinding(finding: FingerprintInput): string {
  const parts = [
    finding.ruleId,
    normalizeFilePath(finding.location.file),
    normalizeMessage(finding.message),
    nearbyComponent(finding),
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex');
}
