import { describe, it, expect } from 'vitest';
import { destructiveNoConfirm } from '../../src/error-prevention/destructive-no-confirm.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('error-prevention/destructive-no-confirm', () => {
  it('should flag delete button without confirmation', () => {
    const code = wrapInComponent(`
      <button onClick={() => deleteItem(id)}>Delete</button>
    `);
    const findings = runRule(destructiveNoConfirm, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('error-prevention/destructive-no-confirm');
    expect(findings[0].severity).toBe('critical');
  });

  it('should flag remove action without confirmation', () => {
    const code = wrapInComponent(`
      <button onClick={handleRemove}>Remove Item</button>
    `);
    const findings = runRule(destructiveNoConfirm, code);
    expect(findings.length).toBe(1);
  });

  it('should not flag delete with confirmation handler', () => {
    const code = wrapInComponent(`
      <button onClick={handleDeleteWithConfirm}>Delete</button>
    `);
    const findings = runRule(destructiveNoConfirm, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag delete with modal handler', () => {
    const code = wrapInComponent(`
      <button onClick={openDeleteModal}>Delete</button>
    `);
    const findings = runRule(destructiveNoConfirm, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag non-destructive actions', () => {
    const code = wrapInComponent(`
      <button onClick={handleSave}>Save</button>
    `);
    const findings = runRule(destructiveNoConfirm, code);
    expect(findings.length).toBe(0);
  });
});
