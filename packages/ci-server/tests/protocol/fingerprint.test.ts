import { describe, expect, it } from 'vitest';
import { fingerprintFinding } from '../../src/protocol/fingerprint.js';
import { makeFinding } from './fixtures.js';

describe('fingerprintFinding', () => {
  it('is stable when line numbers shift', () => {
    const a = makeFinding({
      location: {
        file: 'src/UserTable.tsx',
        startLine: 10,
        startColumn: 0,
        endLine: 12,
        endColumn: 1,
      },
    });
    const b = makeFinding({
      location: {
        file: 'src/UserTable.tsx',
        startLine: 44,
        startColumn: 8,
        endLine: 50,
        endColumn: 2,
      },
    });
    expect(fingerprintFinding(a)).toBe(fingerprintFinding(b));
  });

  it('changes when ruleId, file, or message changes', () => {
    const base = makeFinding();
    const otherRule = makeFinding({ ruleId: 'feedback/missing-loading-state' });
    const otherFile = makeFinding({
      location: {
        file: 'src/Checkout.tsx',
        startLine: 10,
        startColumn: 2,
        endLine: 12,
        endColumn: 4,
      },
    });
    const otherMessage = makeFinding({ message: 'A different human bug.' });

    const baseFp = fingerprintFinding(base);
    expect(fingerprintFinding(otherRule)).not.toBe(baseFp);
    expect(fingerprintFinding(otherFile)).not.toBe(baseFp);
    expect(fingerprintFinding(otherMessage)).not.toBe(baseFp);
  });

  it('normalizes path separators and includes nearby component context', () => {
    const posix = makeFinding({
      location: {
        file: './src/UserTable.tsx',
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 1,
      },
      context: { buttonText: 'Delete' },
    });
    const win = makeFinding({
      location: {
        file: 'src\\UserTable.tsx',
        startLine: 99,
        startColumn: 0,
        endLine: 99,
        endColumn: 1,
      },
      context: { buttonText: 'Delete' },
    });
    expect(fingerprintFinding(posix)).toBe(fingerprintFinding(win));

    const otherLabel = makeFinding({
      context: { buttonText: 'Remove all' },
    });
    expect(fingerprintFinding(otherLabel)).not.toBe(fingerprintFinding(posix));
  });
});
