import { describe, it, expect } from 'vitest';
import { missingOwnership } from '../../src/trust-confidence/missing-ownership.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('trust-confidence/missing-ownership', () => {
  it('should flag RBAC-protected data list without owner display', () => {
    const code = wrapInComponent(`
      <div>
        <PermissionCheck permission="admin">
          <DataList items={items} />
        </PermissionCheck>
      </div>
    `);
    const findings = runRule(missingOwnership, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('trust-confidence/missing-ownership');
  });

  it('should flag access control with data table without owner', () => {
    const code = wrapInComponent(`
      <div>
        <AccessControl level="read">
          <DataTable data={data} />
        </AccessControl>
      </div>
    `);
    const findings = runRule(missingOwnership, code);
    expect(findings.length).toBe(1);
  });

  it('should not flag RBAC with owner display', () => {
    const code = wrapInComponent(`
      <div>
        <RoleBasedAccess role="admin">
          <ItemList items={items} showOwner />
        </RoleBasedAccess>
        <OwnerDisplay user={currentOwner} />
      </div>
    `);
    const findings = runRule(missingOwnership, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag non-RBAC components', () => {
    const code = wrapInComponent(`
      <div>
        <ItemList items={items} />
      </div>
    `);
    const findings = runRule(missingOwnership, code);
    expect(findings.length).toBe(0);
  });
});
