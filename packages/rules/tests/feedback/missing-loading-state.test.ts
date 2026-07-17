import { describe, it, expect } from 'vitest';
import { missingLoadingState } from '../../src/feedback/missing-loading-state.js';
import { runRule, wrapInComponent } from '../test-utils.js';

describe('feedback/missing-loading-state', () => {
  it('should flag fetch without loading state', () => {
    const code = wrapInComponent(`
      <div>
        <button onClick={() => fetch('/api/data')}>Load</button>
      </div>
    `);
    const findings = runRule(missingLoadingState, code);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('feedback/missing-loading-state');
  });

  it('should flag async/await without loading state', () => {
    const code = `
import React from 'react';

export function TestComponent() {
  const handleClick = async () => {
    await fetch('/api/data');
  };

  return <button onClick={handleClick}>Load</button>;
}
`;
    const findings = runRule(missingLoadingState, code);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should not flag when isLoading state exists', () => {
    const code = `
import React, { useState } from 'react';

export function TestComponent() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await fetch('/api/data');
    setIsLoading(false);
  };

  return (
    <div>
      {isLoading && <span>Loading...</span>}
      <button onClick={handleClick}>Load</button>
    </div>
  );
}
`;
    const findings = runRule(missingLoadingState, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag useQuery (has built-in loading)', () => {
    const code = `
import React from 'react';

export function TestComponent() {
  const { data, isLoading } = useQuery();

  return <div>{data}</div>;
}
`;
    const findings = runRule(missingLoadingState, code);
    expect(findings.length).toBe(0);
  });
});
