import { describe, it, expect } from 'vitest';
import { noProgressIndicator } from '../../src/feedback/no-progress-indicator.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('feedback/no-progress-indicator', () => {
  it('should flag wizard without progress indicator', () => {
    const code = wrapInComponent(`
      <div>
        <WizardStep step={1}>
          <input name="name" />
        </WizardStep>
      </div>
    `);
    const findings = runRule(noProgressIndicator, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('feedback/no-progress-indicator');
  });

  it('should flag wizard steps without progress', () => {
    const code = wrapInComponent(`
      <div>
        <WizardContent>
          <Step>Step 1</Step>
          <Step>Step 2</Step>
        </WizardContent>
      </div>
    `);
    const findings = runRule(noProgressIndicator, code);
    expect(findings.length).toBe(1);
  });

  it('should not flag wizard with progress indicator', () => {
    const code = wrapInComponent(`
      <div>
        <ProgressIndicator step={1} total={3} />
        <WizardStep step={1}>
          <input name="name" />
        </WizardStep>
      </div>
    `);
    const findings = runRule(noProgressIndicator, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag stepper with built-in progress', () => {
    const code = wrapInComponent(`
      <Stepper activeStep={1}>
        <StepperProgress />
        <Step>Step 1</Step>
        <Step>Step 2</Step>
      </Stepper>
    `);
    const findings = runRule(noProgressIndicator, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag simple forms without wizard', () => {
    const code = wrapInComponent(`
      <form>
        <input name="name" />
        <button type="submit">Submit</button>
      </form>
    `);
    const findings = runRule(noProgressIndicator, code);
    expect(findings.length).toBe(0);
  });
});
