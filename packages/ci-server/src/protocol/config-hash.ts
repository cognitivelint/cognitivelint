import { createHash } from 'node:crypto';
import { stableStringify } from './stable-json.js';

export function configHash(config: Record<string, unknown> | undefined): string {
  const rules = config?.['rules'] ?? {};
  const weights = config?.['weights'] ?? {};
  const payload = stableStringify({ rules, weights });
  return createHash('sha256').update(payload).digest('hex');
}
