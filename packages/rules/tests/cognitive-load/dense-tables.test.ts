import { describe, it, expect } from 'vitest';
import { denseTables } from '../../src/cognitive-load/dense-tables.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('cognitive-load/dense-tables', () => {
  it('should flag table with more than 12 columns', () => {
    const code = wrapInComponent(`
      <table>
        <thead>
          <tr>
            <th>Col 1</th>
            <th>Col 2</th>
            <th>Col 3</th>
            <th>Col 4</th>
            <th>Col 5</th>
            <th>Col 6</th>
            <th>Col 7</th>
            <th>Col 8</th>
            <th>Col 9</th>
            <th>Col 10</th>
            <th>Col 11</th>
            <th>Col 12</th>
            <th>Col 13</th>
          </tr>
        </thead>
      </table>
    `);
    const findings = runRule(denseTables, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('cognitive-load/dense-tables');
  });

  it('should not flag table with 12 or fewer columns', () => {
    const code = wrapInComponent(`
      <table>
        <thead>
          <tr>
            <th>Col 1</th>
            <th>Col 2</th>
            <th>Col 3</th>
            <th>Col 4</th>
            <th>Col 5</th>
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
