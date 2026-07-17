import { describe, it, expect } from 'vitest';
import { unexplainedDisabled } from '../../src/trust-confidence/unexplained-disabled.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('trust-confidence/unexplained-disabled', () => {
  it('should flag disabled button without explanation', () => {
    const code = wrapInComponent(`
      <button disabled onClick={() => {}}>Save</button>
    `);
    const findings = runRule(unexplainedDisabled, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('trust-confidence/unexplained-disabled');
  });

  it('should not flag disabled button with title', () => {
    const code = wrapInComponent(`
      <button disabled title="Complete all fields first" onClick={() => {}}>
        Save
      </button>
    `);
    const findings = runRule(unexplainedDisabled, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag disabled button with aria-describedby', () => {
    const code = wrapInComponent(`
      <div>
        <span id="help">Fill all required fields</span>
        <button disabled aria-describedby="help" onClick={() => {}}>
          Save
        </button>
      </div>
    `);
    const findings = runRule(unexplainedDisabled, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag disabled button with tooltip prop', () => {
    const code = wrapInComponent(`
      <Button disabled tooltip="Cannot save without changes">
        Save
      </Button>
    `);
    const findings = runRule(unexplainedDisabled, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag enabled button', () => {
    const code = wrapInComponent(`
      <button onClick={() => {}}>Save</button>
    `);
    const findings = runRule(unexplainedDisabled, code);
    expect(findings.length).toBe(0);
  });
});
