import { describe, it, expect } from 'vitest';
import { noUndo } from '../../src/error-prevention/no-undo.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('error-prevention/no-undo', () => {
  it('should flag delete without undo capability', () => {
    const code = wrapInComponent(`
      <button onClick={() => deleteItem(id)}>Delete</button>
    `);
    const findings = runRule(noUndo, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('error-prevention/no-undo');
  });

  it('should not flag when undo button exists', () => {
    const code = wrapInComponent(`
      <div>
        <button onClick={() => deleteItem(id)}>Delete</button>
        <button onClick={handleUndo}>Undo</button>
      </div>
    `);
    const findings = runRule(noUndo, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag when restore option exists', () => {
    const code = wrapInComponent(`
      <div>
        <button onClick={() => deleteItem(id)}>Delete</button>
        <button onClick={restoreItem}>Restore</button>
      </div>
    `);
    const findings = runRule(noUndo, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag non-destructive actions', () => {
    const code = wrapInComponent(`
      <button onClick={handleSave}>Save</button>
    `);
    const findings = runRule(noUndo, code);
    expect(findings.length).toBe(0);
  });
});
