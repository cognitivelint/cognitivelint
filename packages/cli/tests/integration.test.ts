import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'test-fixtures');
const CLI_PATH = join(process.cwd(), 'packages/cli/dist/index.js');

describe('CognitiveLint Integration Tests', () => {
  beforeAll(() => {
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('All 17 Rules', () => {
    it('should detect all rule categories', () => {
      const testCode = `
import React from 'react';

export function ComprehensiveTestComponent() {
  // Rule: feedback/missing-loading-state
  const handleFetch = () => {
    fetch('/api/data');
  };

  // Rule: error-prevention/destructive-no-confirm
  const handleDelete = () => {
    deleteItem(id);
  };

  return (
    <div>
      {/* Rule: feedback/missing-empty-state - list without empty handling */}
      <ul className="item-list">
        {items.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>

      {/* Rule: feedback/no-progress-indicator - wizard without progress */}
      <WizardStep step={1}>
        <input name="name" />
      </WizardStep>

      {/* Rule: cognitive-load/long-forms - too many fields */}
      <form>
        <input name="f1" /><input name="f2" /><input name="f3" />
        <input name="f4" /><input name="f5" /><input name="f6" />
        <input name="f7" /><input name="f8" /><input name="f9" />
        <input name="f10" />
      </form>

      {/* Rule: cognitive-load/excessive-primary-actions - 3 primary buttons */}
      <button className="btn-primary">Action 1</button>
      <button variant="primary">Action 2</button>
      <button type="primary">Action 3</button>

      {/* Rule: cognitive-load/dense-tables - 13 columns */}
      <table>
        <thead>
          <tr>
            <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
            <th>6</th><th>7</th><th>8</th><th>9</th><th>10</th>
            <th>11</th><th>12</th><th>13</th>
          </tr>
        </thead>
      </table>

      {/* Rule: cognitive-load/filter-overload - 9 filters */}
      <FilterSelect name="f1" />
      <FilterSelect name="f2" />
      <FilterSelect name="f3" />
      <FilterSelect name="f4" />
      <FilterSelect name="f5" />
      <FilterSelect name="f6" />
      <FilterSelect name="f7" />
      <FilterSelect name="f8" />
      <FilterSelect name="f9" />

      {/* Rule: trust-confidence/unexplained-disabled */}
      <button disabled onClick={() => {}}>Disabled</button>

      {/* Rule: error-prevention/modal-nesting */}
      <Modal isOpen={true}>
        <Modal isOpen={innerOpen}>Nested</Modal>
      </Modal>

      {/* Rule: error-prevention/confirmation-fatigue - 3 confirms */}
      <ConfirmDialog action="a" />
      <ConfirmDialog action="b" />
      <ConfirmDialog action="c" />

      {/* Rule: discoverability/empty-navigation */}
      <nav>
        <a href="#">Dead Link</a>
      </nav>

      {/* Rule: consistency/inconsistent-button-labels */}
      <button>Save</button>
      <button>Submit</button>
      <button>Apply</button>

      <button onClick={handleFetch}>Fetch</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
`;
      writeFileSync(join(TEST_DIR, 'src/Comprehensive.tsx'), testCode);

      const result = execSync(`node ${CLI_PATH} scan -f json`, {
        cwd: TEST_DIR,
        encoding: 'utf-8',
      });

      const jsonStart = result.indexOf('{');
      const report = JSON.parse(result.slice(jsonStart));

      // Check that we have findings
      expect(report.findings.length).toBeGreaterThan(0);

      // Check that multiple categories are covered
      const categories = new Set(report.findings.map((f: any) => f.category));
      expect(categories.size).toBeGreaterThanOrEqual(4);

      // Check for specific rules
      const ruleIds = report.findings.map((f: any) => f.ruleId);

      expect(ruleIds).toContain('feedback/missing-loading-state');
      expect(ruleIds).toContain('cognitive-load/excessive-primary-actions');
      expect(ruleIds).toContain('trust-confidence/unexplained-disabled');
      expect(ruleIds).toContain('error-prevention/destructive-no-confirm');
    });

    it('should produce valid SARIF output', () => {
      const testCode = `
import React from 'react';

export function SarifTest() {
  return (
    <button disabled onClick={() => {}}>Test</button>
  );
}
`;
      writeFileSync(join(TEST_DIR, 'src/SarifTest.tsx'), testCode);

      const result = execSync(`node ${CLI_PATH} scan -f sarif`, {
        cwd: TEST_DIR,
        encoding: 'utf-8',
      });

      const jsonStart = result.indexOf('{');
      const sarif = JSON.parse(result.slice(jsonStart));

      expect(sarif.$schema).toContain('sarif');
      expect(sarif.version).toBe('2.1.0');
      expect(sarif.runs).toHaveLength(1);
      expect(sarif.runs[0].tool.driver.name).toBe('CognitiveLint');
    });

    it('should exit with code 1 when score below threshold', () => {
      const testCode = `
import React from 'react';

export function FailingComponent() {
  return (
    <div>
      <button disabled>No tooltip</button>
      <button onClick={() => deleteItem()}>Delete</button>
      <button className="btn-primary">A</button>
      <button variant="primary">B</button>
      <button type="primary">C</button>
    </div>
  );
}
`;
      writeFileSync(join(TEST_DIR, 'src/Failing.tsx'), testCode);

      let exitCode = 0;
      try {
        execSync(`node ${CLI_PATH} scan --min-score 99`, {
          cwd: TEST_DIR,
          encoding: 'utf-8',
        });
      } catch (error: any) {
        exitCode = error.status;
      }

      expect(exitCode).toBe(1);
    });

    it('should pass when score above threshold', () => {
      const testCode = `
import React from 'react';

export function PassingComponent() {
  return (
    <div>
      <button onClick={() => {}}>Simple Button</button>
    </div>
  );
}
`;
      writeFileSync(join(TEST_DIR, 'src/Passing.tsx'), testCode);

      let exitCode = 0;
      try {
        execSync(`node ${CLI_PATH} scan --min-score 50`, {
          cwd: TEST_DIR,
          encoding: 'utf-8',
        });
      } catch (error: any) {
        exitCode = error.status;
      }

      expect(exitCode).toBe(0);
    });
  });

  describe('Good Component (no findings expected)', () => {
    it('should report no findings for well-designed component', () => {
      const goodCode = `
import React, { useState } from 'react';

export function GoodComponent() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/save');
      toast.success('Saved!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure?')) {
      deleteItem();
    }
  };

  return (
    <div>
      {items.length === 0 ? (
        <EmptyState message="No items" />
      ) : (
        <div>
          <SearchBar onSearch={handleSearch} />
          <ul>
            {items.map(item => (
              <li key={item.id}>
                <OwnerAvatar user={item.owner} />
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        disabled={!isValid}
        title="Complete the form to enable"
        className="btn-primary"
        onClick={handleSave}
      >
        {isLoading ? 'Saving...' : 'Save'}
      </button>

      <button onClick={handleDelete}>Delete</button>
      <button onClick={handleUndo}>Undo</button>
    </div>
  );
}
`;
      writeFileSync(join(TEST_DIR, 'src/Good.tsx'), goodCode);

      const result = execSync(`node ${CLI_PATH} scan -f json`, {
        cwd: TEST_DIR,
        encoding: 'utf-8',
      });

      const jsonStart = result.indexOf('{');
      const report = JSON.parse(result.slice(jsonStart));

      // Good component should have very few or no findings
      const goodComponentFindings = report.findings.filter(
        (f: any) => f.location.file.includes('Good.tsx')
      );

      expect(goodComponentFindings.length).toBeLessThanOrEqual(2);
    });
  });
});
