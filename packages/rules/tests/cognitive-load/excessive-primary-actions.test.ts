import { describe, it, expect } from 'vitest';
import { excessivePrimaryActions } from '../../src/cognitive-load/excessive-primary-actions.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('cognitive-load/excessive-primary-actions', () => {
  it('should flag more than 2 primary buttons', () => {
    const code = wrapInComponent(`
      <div>
        <button className="btn-primary">Action 1</button>
        <button variant="primary">Action 2</button>
        <button type="primary">Action 3</button>
      </div>
    `);
    const findings = runRule(excessivePrimaryActions, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('cognitive-load/excessive-primary-actions');
  });

  it('should not flag 2 primary buttons', () => {
    const code = wrapInComponent(`
      <div>
        <button className="btn-primary">Save</button>
        <button variant="primary">Submit</button>
      </div>
    `);
    const findings = runRule(excessivePrimaryActions, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag single primary button', () => {
    const code = wrapInComponent(`
      <div>
        <button className="btn-primary">Save</button>
        <button>Cancel</button>
      </div>
    `);
    const findings = runRule(excessivePrimaryActions, code);
    expect(findings.length).toBe(0);
  });

  it('should flag with higher severity for 4+ primary buttons', () => {
    const code = wrapInComponent(`
      <div>
        <button className="btn-primary">A</button>
        <button variant="primary">B</button>
        <button type="primary">C</button>
        <button intent="primary">D</button>
      </div>
    `);
    const findings = runRule(excessivePrimaryActions, code);
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('high');
  });
});
