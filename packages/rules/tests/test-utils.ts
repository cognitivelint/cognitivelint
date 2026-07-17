import { parseReactFile } from '@cognitivelint/parser-react';
import { RuleEngine } from '@cognitivelint/rule-engine';
import type { Rule, Finding } from '@cognitivelint/core';

export interface TestCase {
  name: string;
  code: string;
  expectedFindings: number;
  expectedRuleId?: string;
  expectedSeverity?: string;
}

export function runRule(rule: Rule, code: string): Finding[] {
  const parsed = parseReactFile({
    filePath: 'test.tsx',
    sourceCode: code,
  });

  const engine = new RuleEngine({ rules: [rule] });
  const findings: Finding[] = [];

  for (const component of parsed.components) {
    const componentFindings = engine.analyze('test.tsx', code, [component]);
    findings.push(...componentFindings);
  }

  return findings;
}

export function expectNoFindings(rule: Rule, code: string): void {
  const findings = runRule(rule, code);
  if (findings.length > 0) {
    throw new Error(
      `Expected no findings but got ${findings.length}:\n${findings.map((f) => `  - ${f.message}`).join('\n')}`
    );
  }
}

export function expectFindings(
  rule: Rule,
  code: string,
  count: number
): Finding[] {
  const findings = runRule(rule, code);
  if (findings.length !== count) {
    throw new Error(
      `Expected ${count} findings but got ${findings.length}:\n${findings.map((f) => `  - ${f.message}`).join('\n')}`
    );
  }
  return findings;
}

export function wrapInComponent(jsx: string): string {
  return `
import React from 'react';

export function TestComponent() {
  return (
    ${jsx}
  );
}
`;
}
