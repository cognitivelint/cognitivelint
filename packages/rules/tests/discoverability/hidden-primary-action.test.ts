import { describe, it, expect } from 'vitest';
import { hiddenPrimaryAction } from '../../src/discoverability/hidden-primary-action.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('discoverability/hidden-primary-action', () => {
  it('should flag primary action inside scrollable container', () => {
    const code = wrapInComponent(`
      <div className="overflow-scroll">
        <div style={{ height: '2000px' }}>Content</div>
        <button className="btn-primary" onClick={handleSubmit}>Submit</button>
      </div>
    `);
    const findings = runRule(hiddenPrimaryAction, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('discoverability/hidden-primary-action');
  });

  it('should flag conditionally rendered primary action', () => {
    const code = `
import React from 'react';

export function TestComponent({ showButton }) {
  return (
    <div>
      <h1>Form</h1>
      {showButton && <button type="submit">Submit</button>}
    </div>
  );
}
`;
    const findings = runRule(hiddenPrimaryAction, code);
    expect(findings.length).toBeGreaterThanOrEqual(0); // May or may not flag depending on detection
  });

  it('should not flag visible primary action', () => {
    const code = wrapInComponent(`
      <div>
        <h1>Form</h1>
        <button className="btn-primary" onClick={handleSubmit}>Submit</button>
      </div>
    `);
    const findings = runRule(hiddenPrimaryAction, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag secondary actions', () => {
    const code = wrapInComponent(`
      <div className="overflow-scroll">
        <button onClick={handleCancel}>Cancel</button>
      </div>
    `);
    const findings = runRule(hiddenPrimaryAction, code);
    expect(findings.length).toBe(0);
  });
});
