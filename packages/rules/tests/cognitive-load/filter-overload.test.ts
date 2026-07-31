import { describe, it, expect } from 'vitest';
import { filterOverload } from '../../src/cognitive-load/filter-overload.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('cognitive-load/filter-overload', () => {
  it('should flag more than 10 filters', () => {
    const filters = Array.from({ length: 11 }, (_, i) => `<FilterSelect name="f${i + 1}" />`).join('\n        ');
    const code = wrapInComponent(`
      <div>
        ${filters}
      </div>
    `);
    const findings = runRule(filterOverload, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('cognitive-load/filter-overload');
  });

  it('should not flag 10 or fewer filters', () => {
    const filters = Array.from({ length: 8 }, (_, i) => `<FilterSelect name="f${i + 1}" />`).join('\n        ');
    const code = wrapInComponent(`
      <div>
        ${filters}
      </div>
    `);
    const findings = runRule(filterOverload, code);
    expect(findings.length).toBe(0);
  });

  it('should not count FilterBar containers toward the limit', () => {
    const filters = Array.from({ length: 8 }, (_, i) => `<FilterSelect name="f${i + 1}" />`).join('\n        ');
    const code = wrapInComponent(`
      <FilterBar>
        ${filters}
      </FilterBar>
    `);
    const findings = runRule(filterOverload, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag non-filter components', () => {
    const selects = Array.from({ length: 11 }, (_, i) => `<Select name="s${i + 1}" />`).join('\n        ');
    const code = wrapInComponent(`
      <div>
        ${selects}
      </div>
    `);
    const findings = runRule(filterOverload, code);
    expect(findings.length).toBe(0);
  });
});
