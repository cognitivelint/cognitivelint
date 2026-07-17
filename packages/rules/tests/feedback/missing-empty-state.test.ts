import { describe, it, expect } from 'vitest';
import { missingEmptyState } from '../../src/feedback/missing-empty-state.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('feedback/missing-empty-state', () => {
  it('should flag list without empty state handling', () => {
    const code = wrapInComponent(`
      <DataList data={items}>
        {items.map(item => <li key={item.id}>{item.name}</li>)}
      </DataList>
    `);
    const findings = runRule(missingEmptyState, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('feedback/missing-empty-state');
  });

  it('should flag table without empty state', () => {
    const code = wrapInComponent(`
      <DataTable rows={data}>
        {rows.map(row => <tr key={row.id}><td>{row.name}</td></tr>)}
      </DataTable>
    `);
    const findings = runRule(missingEmptyState, code);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should not flag when length check exists', () => {
    const code = wrapInComponent(`
      <div>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul>
            {items.map(item => <li key={item.id}>{item.name}</li>)}
          </ul>
        )}
      </div>
    `);
    const findings = runRule(missingEmptyState, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag when EmptyState component exists', () => {
    const code = wrapInComponent(`
      <div>
        <EmptyState visible={!items.length} />
        <ul>
          {items.map(item => <li key={item.id}>{item.name}</li>)}
        </ul>
      </div>
    `);
    const findings = runRule(missingEmptyState, code);
    expect(findings.length).toBe(0);
  });
});
