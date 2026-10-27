import { describe, expect, it } from 'vitest';
import { configHash } from '../../src/protocol/config-hash.js';
import {
  ProtocolValidationError,
  parseProjectToken,
  parseRunV1,
} from '../../src/protocol/schema.js';
import { makeRun } from './fixtures.js';

describe('parseRunV1', () => {
  it('accepts a valid RunV1', () => {
    const run = makeRun();
    expect(parseRunV1(run).git.sha).toBe(run.git.sha);
    expect(parseRunV1(run).schema).toBe('cognitivelint.run.v1');
  });

  it('rejects a missing git sha', () => {
    const run = makeRun();
    const invalid = { ...run, git: { ...run.git, sha: '' } };
    expect(() => parseRunV1(invalid)).toThrow(ProtocolValidationError);
  });

  it('rejects a bad schema version', () => {
    const run = makeRun();
    const invalid = { ...run, schema: 'cognitivelint.run.v0' };
    expect(() => parseRunV1(invalid)).toThrow(/schema/i);
  });
});

describe('parseProjectToken', () => {
  it('rejects an empty project token', () => {
    expect(() => parseProjectToken('')).toThrow(ProtocolValidationError);
    expect(() => parseProjectToken('   ')).toThrow(ProtocolValidationError);
    expect(() => parseProjectToken(undefined)).toThrow(ProtocolValidationError);
  });

  it('returns a trimmed token', () => {
    expect(parseProjectToken('  secret  ')).toBe('secret');
  });
});

describe('configHash', () => {
  it('is stable for key order and ignores unrelated config keys', () => {
    const a = configHash({
      include: ['src'],
      rules: { 'feedback/missing-loading-state': 'off' },
      weights: { feedback: 15 },
    });
    const b = configHash({
      weights: { feedback: 15 },
      rules: { 'feedback/missing-loading-state': 'off' },
      format: 'json',
    });
    expect(a).toBe(b);
  });

  it('changes when rules change', () => {
    const a = configHash({ rules: { a: 'off' } });
    const b = configHash({ rules: { a: { severity: 'high' } } });
    expect(a).not.toBe(b);
  });
});
