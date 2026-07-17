import { describe, it, expect } from 'vitest';
import { missingSuccessFeedback } from '../../src/feedback/missing-success-feedback.js';
import { runRule } from '../test-utils.js';

describe('feedback/missing-success-feedback', () => {
  it('should flag mutation without success feedback', () => {
    const code = `
import React from 'react';

export function TestComponent() {
  const mutation = useMutation();

  return <button onClick={() => mutation.mutate()}>Save</button>;
}
`;
    const findings = runRule(missingSuccessFeedback, code);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('feedback/missing-success-feedback');
  });

  it('should not flag mutation with onSuccess callback', () => {
    const code = `
import React from 'react';
import { toast } from 'react-toastify';

export function TestComponent() {
  const mutation = useMutation({
    onSuccess: () => toast.success('Saved!')
  });

  return <button onClick={() => mutation.mutate()}>Save</button>;
}
`;
    const findings = runRule(missingSuccessFeedback, code);
    expect(findings.length).toBe(0);
  });

  it('should not flag mutation with toast notification', () => {
    const code = `
import React from 'react';

export function TestComponent() {
  const mutation = useMutation();

  const handleSave = () => {
    mutation.mutate();
    toast.success('Done!');
  };

  return <button onClick={handleSave}>Save</button>;
}
`;
    const findings = runRule(missingSuccessFeedback, code);
    expect(findings.length).toBe(0);
  });
});
