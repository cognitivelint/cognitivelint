import { describe, it, expect } from 'vitest';
import { filterOverload } from '../../src/cognitive-load/filter-overload.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('cognitive-load/filter-overload', () => {
  it('should flag more than 8 filters', () => {
    const code = wrapInComponent(`
      <div>
        <FilterSelect name="f1" />
        <FilterSelect name="f2" />
        <FilterSelect name="f3" />
        <FilterSelect name="f4" />
        <FilterSelect name="f5" />
        <FilterSelect name="f6" />
        <FilterSelect name="f7" />
        <FilterSelect name="f8" />
        <FilterSelect name="f9" />
      </div>
    `);
    const findings = runRule(filterOverload, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('cognitive-load/filter-overload');
  });

  it('should not flag 8 or fewer filters', () => {
    const code = wrapInComponent(`
      <div>
        <FilterSelect name="f1" />
        <FilterSelect name="f2" />
        <FilterSelect name="f3" />
        <FilterSelect name="f4" />
      </div>
    `);
    const findings = runRule(filterOverload, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag non-filter components', () => {
    const code = wrapInComponent(`
      <div>
        <Select name="s1" />
        <Select name="s2" />
        <Select name="s3" />
        <Select name="s4" />
        <Select name="s5" />
        <Select name="s6" />
        <Select name="s7" />
        <Select name="s8" />
        <Select name="s9" />
      </div>
    `);
    const findings = runRule(filterOverload, code);
    expect(findings.length).toBe(0);
  });
});
