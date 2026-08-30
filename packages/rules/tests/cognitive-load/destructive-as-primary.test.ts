import { describe, it, expect } from 'vitest';
import { destructiveAsPrimary } from '../../src/cognitive-load/destructive-as-primary.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('cognitive-load/destructive-as-primary', () => {
  it('should flag destructive button with primary styling', () => {
    const code = wrapInComponent(`
      <button variant="primary" onClick={handleDelete}>Delete account</button>
    `);
    const findings = runRule(destructiveAsPrimary, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('cognitive-load/destructive-as-primary');
    expect(findings[0].severity).toBe('medium');
  });

  it('should flag PatternFly primary delete button', () => {
    const code = wrapInComponent(`
      <Button variant="primary" onClick={handleRemove}>Remove</Button>
    `);
    const findings = runRule(destructiveAsPrimary, code);
    expect(findings.length).toBe(1);
  });

  it('should not flag destructive button with danger styling', () => {
    const code = wrapInComponent(`
      <div>
        <Button variant="danger" onClick={handleDelete}>Delete account</Button>
        <Button variant="primary">Save changes</Button>
      </div>
    `);
    const findings = runRule(destructiveAsPrimary, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag primary non-destructive button', () => {
    const code = wrapInComponent(`
      <Button variant="primary" onClick={handleSave}>Save</Button>
    `);
    const findings = runRule(destructiveAsPrimary, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag destructive secondary button', () => {
    const code = wrapInComponent(`
      <Button variant="secondary" onClick={handleDelete}>Delete</Button>
    `);
    const findings = runRule(destructiveAsPrimary, code);
    expect(findings.length).toBe(0);
  });
});
