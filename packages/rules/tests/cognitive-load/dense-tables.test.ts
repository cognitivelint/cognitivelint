import { describe, it, expect } from 'vitest';
import { denseTables } from '../../src/cognitive-load/dense-tables.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('cognitive-load/dense-tables', () => {
  it('should flag table with more than 15 columns', () => {
    const cols = Array.from({ length: 16 }, (_, i) => `<th>Col ${i + 1}</th>`).join('\n            ');
    const code = wrapInComponent(`
      <table>
        <thead>
          <tr>
            ${cols}
          </tr>
        </thead>
      </table>
    `);
    const findings = runRule(denseTables, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('cognitive-load/dense-tables');
  });

  it('should not flag table with 15 or fewer columns', () => {
    const cols = Array.from({ length: 12 }, (_, i) => `<th>Col ${i + 1}</th>`).join('\n            ');
    const code = wrapInComponent(`
      <table>
        <thead>
          <tr>
            ${cols}
          </tr>
        </thead>
      </table>
    `);
    const findings = runRule(denseTables, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag non-table elements', () => {
    const code = wrapInComponent(`
      <div>
        <span>Item 1</span>
        <span>Item 2</span>
        <span>Item 3</span>
      </div>
    `);
    const findings = runRule(denseTables, code);
    expect(findings.length).toBe(0);
  });
});
