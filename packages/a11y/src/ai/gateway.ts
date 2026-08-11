import Anthropic from '@anthropic-ai/sdk';
import { explainWithPersona, getWcagGuidance } from '../personas/impact.js';
import { generateHeuristicFix } from '../fix/generate.js';
import {
  PERSONA_ICONS,
  PERSONA_LABELS,
  confidenceBand,
  type AnalysisContext,
  type EnrichedFinding,
  type ExplainRequest,
  type FixProposal,
  type FixRequest,
  type HumanImpact,
  type PersonaId,
} from '../types.js';

function hasApiKey(apiKey?: string): boolean {
  return Boolean(apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.COGNITIVELINT_API_KEY);
}

function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * AI gateway for accessibility personas.
 * Falls back to deterministic human-impact templates when no API key is configured.
 */
export class AccessibilityAIGateway {
  private client: Anthropic | null;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.COGNITIVELINT_API_KEY;
    this.client = key ? new Anthropic({ apiKey: key }) : null;
  }

  async explain(request: ExplainRequest): Promise<HumanImpact> {
    const persona = request.persona ?? request.finding.primaryPersona;
    const baseline = explainWithPersona(request.finding, persona, request.context);

    if (!request.useAi || !this.client) {
      return baseline;
    }

    try {
      const prompt = `You are the ${PERSONA_LABELS[persona]} (${PERSONA_ICONS[persona]}) in CognitiveLint.

Mission:
- Screen Reader: evaluate screen-reader semantics and announcements
- Keyboard: evaluate keyboard reachability and operation
- Cognitive: evaluate ambiguity, memory load, unclear actions, destructive clarity

Finding:
Rule: ${request.finding.ruleId}
Message: ${request.finding.message}
Snippet:
\`\`\`tsx
${request.finding.snippet ?? request.context.nearbyJsx ?? ''}
\`\`\`

Component: ${request.context.componentName ?? 'unknown'}
Nearby identifiers: ${(request.context.localIdentifiers ?? []).slice(0, 20).join(', ')}

Return JSON only with:
- whatHappened
- whoIsAffected
- whatTheyExperience
- whyItMatters
- whatToDo
- impactLevel: high|medium|low|potential
- confidence: 0-100
- narrative: markdown explanation in first person as the persona
- wcagRefs: string array`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content?.type !== 'text') return baseline;

      const parsed = extractJson<{
        whatHappened: string;
        whoIsAffected: string;
        whatTheyExperience: string;
        whyItMatters: string;
        whatToDo: string;
        impactLevel: HumanImpact['impactLevel'];
        confidence: number;
        narrative: string;
        wcagRefs?: string[];
      }>(content.text);

      if (!parsed) return baseline;

      const confidence = parsed.confidence ?? baseline.confidence;
      const wcagRefs = parsed.wcagRefs ?? baseline.wcagRefs;
      return {
        persona,
        personaLabel: PERSONA_LABELS[persona],
        impactLevel: parsed.impactLevel ?? baseline.impactLevel,
        whatHappened: parsed.whatHappened ?? baseline.whatHappened,
        whoIsAffected: parsed.whoIsAffected ?? baseline.whoIsAffected,
        whatTheyExperience: parsed.whatTheyExperience ?? baseline.whatTheyExperience,
        whyItMatters: parsed.whyItMatters ?? baseline.whyItMatters,
        whatToDo: parsed.whatToDo ?? baseline.whatToDo,
        narrative: parsed.narrative ?? baseline.narrative,
        confidence,
        confidenceBand: confidenceBand(confidence),
        ...(wcagRefs ? { wcagRefs } : {}),
      };
    } catch {
      return baseline;
    }
  }

  async explainWcag(finding: EnrichedFinding): Promise<string> {
    return getWcagGuidance(finding);
  }

  async generateFix(request: FixRequest): Promise<FixProposal | null> {
    const heuristic = generateHeuristicFix(request.finding, request.context);

    if (!request.useAi || !this.client) {
      return heuristic;
    }

    try {
      const prompt = `You are generating the smallest safe accessibility fix for React JSX/TSX.

Finding: ${request.finding.ruleId} — ${request.finding.message}
Persona: ${request.finding.primaryPersona}
Human impact: ${request.finding.humanImpact.whatHappened}

Code:
\`\`\`tsx
${request.finding.snippet ?? request.context.nearbyJsx ?? ''}
\`\`\`

Context identifiers: ${(request.context.localIdentifiers ?? []).join(', ')}
Component: ${request.context.componentName ?? 'unknown'}

Rules:
- Smallest safe change only
- Prefer semantic HTML
- Never invent large refactors
- Keep behavior the same
- Return JSON: { description, original, replacement, confidence }

original must be an exact substring of the provided code.`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content?.type !== 'text') return heuristic;

      const parsed = extractJson<{
        description: string;
        original: string;
        replacement: string;
        confidence: number;
      }>(content.text);

      if (!parsed?.original || !parsed.replacement) return heuristic;
      if (!request.context.sourceCode.includes(parsed.original)) return heuristic;

      const idx = request.context.sourceCode.indexOf(parsed.original);
      const before = request.context.sourceCode.slice(0, idx);
      const startLine = before.split('\n').length;
      const startColumn = (before.split('\n').pop()?.length ?? 0) + 1;
      const endBefore = request.context.sourceCode.slice(0, idx + parsed.original.length);
      const endLine = endBefore.split('\n').length;
      const endColumn = (endBefore.split('\n').pop()?.length ?? 0) + 1;

      return {
        findingId: request.finding.id,
        description: parsed.description,
        original: parsed.original,
        replacement: parsed.replacement,
        diff: ['```diff', ...parsed.original.split('\n').map((l) => `- ${l}`), ...parsed.replacement.split('\n').map((l) => `+ ${l}`), '```'].join('\n'),
        range: { startLine, startColumn, endLine, endColumn },
        confidence: parsed.confidence,
        confidenceBand: confidenceBand(parsed.confidence),
        persona: request.finding.primaryPersona,
      };
    } catch {
      return heuristic;
    }
  }
}

export function createGateway(apiKey?: string): AccessibilityAIGateway {
  return new AccessibilityAIGateway(apiKey);
}

export function aiAvailable(apiKey?: string): boolean {
  return hasApiKey(apiKey);
}

export async function askPersona(
  persona: PersonaId,
  finding: EnrichedFinding,
  context: AnalysisContext,
  apiKey?: string,
): Promise<HumanImpact> {
  const gateway = createGateway(apiKey);
  return gateway.explain({
    finding,
    context,
    persona,
    useAi: aiAvailable(apiKey),
    ...(apiKey !== undefined ? { apiKey } : {}),
  });
}
