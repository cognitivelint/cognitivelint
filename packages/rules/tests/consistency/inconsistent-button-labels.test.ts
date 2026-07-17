import { describe, it, expect } from 'vitest';
import { inconsistentButtonLabels } from '../../src/consistency/inconsistent-button-labels.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('consistency/inconsistent-button-labels', () => {
  it('should flag inconsistent save-type labels', () => {
    const code = wrapInComponent(`
      <div>
        <button>Save</button>
        <button>Submit</button>
        <button>Apply</button>
      </div>
    `);
    const findings = runRule(inconsistentButtonLabels, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('consistency/inconsistent-button-labels');
  });

  it('should flag inconsistent cancel-type labels', () => {
    const code = wrapInComponent(`
      <div>
        <button>Cancel</button>
        <button>Close</button>
        <button>Dismiss</button>
      </div>
    `);
    const findings = runRule(inconsistentButtonLabels, code);
    expect(findings.length).toBe(1);
  });

  it('should flag inconsistent delete-type labels', () => {
    const code = wrapInComponent(`
      <div>
        <button>Delete</button>
        <button>Remove</button>
      </div>
    `);
    const findings = runRule(inconsistentButtonLabels, code);
    expect(findings.length).toBe(1);
  });

  it('should not flag consistent labels', () => {
    const code = wrapInComponent(`
      <div>
        <button>Save</button>
        <button>Save Changes</button>
        <button>Cancel</button>
      </div>
    `);
    const findings = runRule(inconsistentButtonLabels, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag unrelated button labels', () => {
    const code = wrapInComponent(`
      <div>
        <button>Add Item</button>
        <button>View Details</button>
        <button>Export</button>
      </div>
    `);
    const findings = runRule(inconsistentButtonLabels, code);
    expect(findings.length).toBe(0);
  });
});
