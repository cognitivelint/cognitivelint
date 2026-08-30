import { describe, it, expect } from 'vitest';
import { tooManyTabs } from '../../src/cognitive-load/too-many-tabs.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('cognitive-load/too-many-tabs', () => {
  it('should flag more than 6 tabs', () => {
    const tabs = [
      'Overview',
      'Settings',
      'Users',
      'Billing',
      'Security',
      'Integrations',
      'Audit',
      'API',
    ]
      .map((label) => `<Tab>${label}</Tab>`)
      .join('\n        ');

    const code = wrapInComponent(`
      <Tabs>
        ${tabs}
      </Tabs>
    `);
    const findings = runRule(tooManyTabs, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('cognitive-load/too-many-tabs');
  });

  it('should not flag 6 or fewer tabs', () => {
    const tabs = ['Overview', 'Settings', 'Users', 'Billing', 'Security', 'Integrations']
      .map((label) => `<Tab>${label}</Tab>`)
      .join('\n        ');

    const code = wrapInComponent(`
      <Tabs>
        ${tabs}
      </Tabs>
    `);
    const findings = runRule(tooManyTabs, code);
    expect(findings.length).toBe(0);
  });

  it('should not count Tabs container toward the limit', () => {
    const code = wrapInComponent(`
      <Tabs>
        <Tab>One</Tab>
        <Tab>Two</Tab>
      </Tabs>
    `);
    const findings = runRule(tooManyTabs, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag DataTable as tabs', () => {
    const code = wrapInComponent(`
      <DataTable rows={rows} />
    `);
    const findings = runRule(tooManyTabs, code);
    expect(findings.length).toBe(0);
  });

  it('should count TabTitle elements', () => {
    const tabs = Array.from({ length: 8 }, (_, i) => `<TabTitle>Tab ${i + 1}</TabTitle>`).join(
      '\n        '
    );
    const code = wrapInComponent(`
      <Tabs>
        ${tabs}
      </Tabs>
    `);
    const findings = runRule(tooManyTabs, code);
    expect(findings.length).toBe(1);
  });
});
