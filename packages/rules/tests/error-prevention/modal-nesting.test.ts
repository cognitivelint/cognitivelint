import { describe, it, expect } from 'vitest';
import { modalNesting } from '../../src/error-prevention/modal-nesting.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('error-prevention/modal-nesting', () => {
  it('should flag nested modals', () => {
    const code = wrapInComponent(`
      <Modal isOpen={true}>
        <Modal isOpen={innerOpen}>
          <p>Nested content</p>
        </Modal>
      </Modal>
    `);
    const findings = runRule(modalNesting, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('error-prevention/modal-nesting');
  });

  it('should flag nested dialogs', () => {
    const code = wrapInComponent(`
      <Dialog open={true}>
        <Dialog open={innerOpen}>
          <p>Nested dialog</p>
        </Dialog>
      </Dialog>
    `);
    const findings = runRule(modalNesting, code);
    expect(findings.length).toBe(1);
  });

  it('should not flag single modal', () => {
    const code = wrapInComponent(`
      <Modal isOpen={true}>
        <p>Single modal content</p>
      </Modal>
    `);
    const findings = runRule(modalNesting, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag modal with drawer (different types)', () => {
    const code = wrapInComponent(`
      <Modal isOpen={true}>
        <Drawer isOpen={drawerOpen}>
          <p>Drawer content</p>
        </Drawer>
      </Modal>
    `);
    const findings = runRule(modalNesting, code);
    expect(findings.length).toBe(0);
  });
});
