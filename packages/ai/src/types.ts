import type { Finding, Rule } from '@dkoul/cognitivelint-core';

export interface Explanation {
  whyItMatters: string;
  principle: string;
  userImpact: string;
  implementation: string;
  exampleCode?: string;
  relatedRules?: string[];
}

export interface FixSuggestion {
  description: string;
  diff: string;
  confidence: number;
}

export interface AIProvider {
  name: string;
  explain(finding: Finding, rule: Rule): Promise<Explanation>;
  suggestFix(finding: Finding, sourceCode: string): Promise<FixSuggestion>;
}
