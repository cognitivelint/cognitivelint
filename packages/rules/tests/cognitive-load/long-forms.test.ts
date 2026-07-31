import { describe, it, expect } from 'vitest';
import { longForms } from '../../src/cognitive-load/long-forms.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('cognitive-load/long-forms', () => {
  it('should flag form with more than 12 fields', () => {
    const fields = Array.from({ length: 13 }, (_, i) => `<input name="field${i + 1}" />`).join('\n        ');
    const code = wrapInComponent(`
      <form>
        ${fields}
      </form>
    `);
    const findings = runRule(longForms, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('cognitive-load/long-forms');
  });

  it('should not flag form with 12 or fewer fields', () => {
    const fields = Array.from({ length: 10 }, (_, i) => `<input name="field${i + 1}" />`).join('\n        ');
    const code = wrapInComponent(`
      <form>
        ${fields}
      </form>
    `);
    const findings = runRule(longForms, code);
    expect(findings.length).toBe(0);
  });

  it('should not count FormField wrappers as inputs (only nested inputs)', () => {
    const fields = Array.from(
      { length: 13 },
      (_, i) => `<FormField name="field${i + 1}"><input name="field${i + 1}" /></FormField>`
    ).join('\n        ');
    const code = wrapInComponent(`
      <form>
        ${fields}
      </form>
    `);
    // FormField is a single-field wrapper, not a grouping — 13 inputs should still flag once
    const findings = runRule(longForms, code);
    expect(findings.length).toBe(1);
    expect(findings[0].context?.fieldCount).toBe(13);
  });

  it('should not double-count FormField when it has no nested input tags', () => {
    const fields = Array.from(
      { length: 13 },
      (_, i) => `<FormField name="field${i + 1}" />`
    ).join('\n        ');
    const code = wrapInComponent(`
      <form>
        ${fields}
      </form>
    `);
    const findings = runRule(longForms, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag long form with fieldset grouping', () => {
    const code = wrapInComponent(`
      <form>
        <fieldset>
          <input name="field1" />
          <input name="field2" />
          <input name="field3" />
          <input name="field4" />
          <input name="field5" />
          <input name="field6" />
          <input name="field7" />
        </fieldset>
        <fieldset>
          <input name="field8" />
          <input name="field9" />
          <input name="field10" />
          <input name="field11" />
          <input name="field12" />
          <input name="field13" />
        </fieldset>
      </form>
    `);
    const findings = runRule(longForms, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag long form with FormGroup components', () => {
    const code = wrapInComponent(`
      <form>
        <FormGroup title="Personal">
          <input name="field1" />
          <input name="field2" />
          <input name="field3" />
          <input name="field4" />
          <input name="field5" />
          <input name="field6" />
          <input name="field7" />
        </FormGroup>
        <FormGroup title="Contact">
          <input name="field8" />
          <input name="field9" />
          <input name="field10" />
          <input name="field11" />
          <input name="field12" />
          <input name="field13" />
        </FormGroup>
      </form>
    `);
    const findings = runRule(longForms, code);
    expect(findings.length).toBe(0);
  });
});
