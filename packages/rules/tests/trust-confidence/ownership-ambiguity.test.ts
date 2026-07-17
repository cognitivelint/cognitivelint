import { describe, it, expect } from 'vitest';
import { ownershipAmbiguity } from '../../src/trust-confidence/ownership-ambiguity.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('trust-confidence/ownership-ambiguity', () => {
  it('should flag shared data list without ownership indicators', () => {
    const code = wrapInComponent(`
      <div>
        <TeamWorkspace>
          <DataList items={items}>
            {items.map(item => <li key={item.id}>{item.name}</li>)}
          </DataList>
        </TeamWorkspace>
      </div>
    `);
    const findings = runRule(ownershipAmbiguity, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('trust-confidence/ownership-ambiguity');
  });

  it('should not flag list with owner display', () => {
    const code = wrapInComponent(`
      <ul className="item-list">
        {items.map(item => (
          <li key={item.id}>
            <OwnerAvatar user={item.owner} />
            {item.name}
          </li>
        ))}
      </ul>
    `);
    const findings = runRule(ownershipAmbiguity, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag list with createdBy field', () => {
    const code = wrapInComponent(`
      <ul className="item-list">
        {items.map(item => (
          <li key={item.id}>
            {item.name}
            <span className="createdBy">{item.createdBy}</span>
          </li>
        ))}
      </ul>
    `);
    const findings = runRule(ownershipAmbiguity, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag list with "My" filter', () => {
    const code = wrapInComponent(`
      <div>
        <button className="my-items-filter">My Items</button>
        <ul className="item-list">
          {items.map(item => <li key={item.id}>{item.name}</li>)}
        </ul>
      </div>
    `);
    const findings = runRule(ownershipAmbiguity, code);
    expect(findings.length).toBe(0);
  });
});
