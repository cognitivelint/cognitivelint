import Anthropic from '@anthropic-ai/sdk';
import type { Finding, Rule } from '@cognitivelint/cognitivelint-core';
import type { AIProvider, Explanation, FixSuggestion } from './types.js';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  async explain(finding: Finding, rule: Rule): Promise<Explanation> {
    const prompt = `You are a UX expert explaining cognitive UX issues to developers.

Finding: ${finding.message}
Rule: ${rule.meta.name}
Category: ${rule.meta.category}
Principle: ${rule.meta.principle ?? 'N/A'}
Location: ${finding.location.file}:${finding.location.startLine}

Provide a JSON response with exactly these fields:
- whyItMatters: Brief explanation of user impact (2-3 sentences)
- principle: The cognitive psychology principle involved (1 sentence)
- userImpact: How this specifically affects user behavior (1-2 sentences)
- implementation: How to fix this (2-3 bullet points as a single string with newlines)
- exampleCode: A short code snippet showing the fix (optional)
- relatedRules: Array of related rule IDs (optional)

Keep explanations concise and actionable. Return only valid JSON.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        return JSON.parse(content.text) as Explanation;
      } catch {
        return {
          whyItMatters: content.text,
          principle: rule.meta.principle ?? 'Cognitive Load',
          userImpact: finding.message,
          implementation: 'See the finding message for suggestions.',
        };
      }
    }

    throw new Error('Unexpected response type from Anthropic');
  }

  async suggestFix(finding: Finding, sourceCode: string): Promise<FixSuggestion> {
    const startLine = Math.max(1, finding.location.startLine - 5);
    const endLine = finding.location.endLine + 5;
    const lines = sourceCode.split('\n');
    const context = lines.slice(startLine - 1, endLine).join('\n');

    const prompt = `You are a React developer fixing cognitive UX issues.

Issue: ${finding.message}
Rule: ${finding.ruleId}
Location: Lines ${finding.location.startLine}-${finding.location.endLine}

Code context:
\`\`\`tsx
${context}
\`\`\`

Provide a JSON response with:
- description: Brief explanation of the fix
- diff: The exact code change in unified diff format
- confidence: How confident you are in this fix (0-100)

Return only valid JSON.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        return JSON.parse(content.text) as FixSuggestion;
      } catch {
        return {
          description: 'Unable to generate fix suggestion',
          diff: '',
          confidence: 0,
        };
      }
    }

    throw new Error('Unexpected response type from Anthropic');
  }
}
