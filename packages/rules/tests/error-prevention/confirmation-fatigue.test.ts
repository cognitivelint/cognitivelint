import { describe, it, expect } from 'vitest';
import { confirmationFatigue } from '../../src/error-prevention/confirmation-fatigue.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('error-prevention/confirmation-fatigue', () => {
  it('should flag too many confirmation dialogs', () => {
    const code = wrapInComponent(`
      <div>
        <ConfirmDialog action="save" />
        <ConfirmDialog action="edit" />
        <ConfirmDialog action="update" />
      </div>
    `);
    const findings = runRule(confirmationFatigue, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('error-prevention/confirmation-fatigue');
  });

  it('should flag multiple alert dialogs', () => {
    const code = wrapInComponent(`
      <div>
        <AlertDialog role="alertdialog" id="1" />
        <AlertDialog role="alertdialog" id="2" />
        <AlertDialog role="alertdialog" id="3" />
      </div>
    `);
    const findings = runRule(confirmationFatigue, code);
    expect(findings.length).toBe(1);
  });

  it('should not flag single confirmation', () => {
    const code = wrapInComponent(`
      <div>
        <ConfirmDialog action="delete" />
      </div>
    `);
    const findings = runRule(confirmationFatigue, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag two confirmations (within limit)', () => {
    const code = wrapInComponent(`
      <div>
        <ConfirmDialog action="delete" />
        <ConfirmDialog action="reset" />
      </div>
    `);
    const findings = runRule(confirmationFatigue, code);
    expect(findings.length).toBe(0);
  });
});
