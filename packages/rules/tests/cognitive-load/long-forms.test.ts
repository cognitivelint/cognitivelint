import { describe, it, expect } from 'vitest';
import { longForms } from '../../src/cognitive-load/long-forms.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('cognitive-load/long-forms', () => {
  it('should flag form with more than 8 fields', () => {
    const code = wrapInComponent(`
      <form>
        <input name="field1" />
        <input name="field2" />
        <input name="field3" />
        <input name="field4" />
        <input name="field5" />
        <input name="field6" />
        <input name="field7" />
        <input name="field8" />
        <input name="field9" />
        <input name="field10" />
      </form>
    `);
    const findings = runRule(longForms, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('cognitive-load/long-forms');
  });

  it('should not flag form with 8 or fewer fields', () => {
    const code = wrapInComponent(`
      <form>
        <input name="field1" />
        <input name="field2" />
        <input name="field3" />
        <input name="field4" />
        <input name="field5" />
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
        </fieldset>
        <fieldset>
          <input name="field6" />
          <input name="field7" />
          <input name="field8" />
          <input name="field9" />
          <input name="field10" />
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
        </FormGroup>
        <FormGroup title="Contact">
          <input name="field6" />
          <input name="field7" />
          <input name="field8" />
          <input name="field9" />
          <input name="field10" />
        </FormGroup>
      </form>
    `);
    const findings = runRule(longForms, code);
    expect(findings.length).toBe(0);
  });
});
