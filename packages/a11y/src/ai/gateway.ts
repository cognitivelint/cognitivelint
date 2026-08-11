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

/**
 * Host-provided language model client.
 * In VS Code / Cursor this is backed by `vscode.lm` (Copilot, Cursor, etc.).
 * No external API keys are required — the editor's built-in agent models are used.
 */
export interface LmClient {
  readonly name: string;
  complete(prompt: string): Promise<string>;
}

export function extractJson<T>(text: string): T | null {
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

export function buildPersonaExplainPrompt(
  persona: PersonaId,
  finding: ExplainRequest['finding'],
  context: AnalysisContext,
): string {
  return `You are the ${PERSONA_LABELS[persona]} (${PERSONA_ICONS[persona]}) — a CognitiveLint accessibility subagent.

Mission by persona:
- Screen Reader: evaluate screen-reader semantics and announcements
- Keyboard: evaluate keyboard reachability and operation
- Cognitive: evaluate ambiguity, memory load, unclear actions, destructive clarity

Finding:
Rule: ${finding.ruleId}
Message: ${finding.message}
Snippet:
\`\`\`tsx
${finding.snippet ?? context.nearbyJsx ?? ''}
\`\`\`

Component: ${context.componentName ?? 'unknown'}
Nearby identifiers: ${(context.localIdentifiers ?? []).slice(0, 20).join(', ')}

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
}

export function buildFixPrompt(finding: EnrichedFinding, context: AnalysisContext): string {
  return `You are the CognitiveLint accessibility remediation subagent.

Generate the smallest safe accessibility fix for React JSX/TSX.

Finding: ${finding.ruleId} — ${finding.message}
Persona: ${finding.primaryPersona}
Human impact: ${finding.humanImpact.whatHappened}

Code:
\`\`\`tsx
${finding.snippet ?? context.nearbyJsx ?? ''}
\`\`\`

Context identifiers: ${(context.localIdentifiers ?? []).join(', ')}
Component: ${context.componentName ?? 'unknown'}

Rules:
- Smallest safe change only
- Prefer semantic HTML
- Never invent large refactors
- Keep behavior the same
- Return JSON: { description, original, replacement, confidence }

original must be an exact substring of the provided code.`;
}

export function buildPersonaChatSystemPrompt(persona: PersonaId): string {
  const missions: Record<PersonaId, string> = {
    'screen-reader':
      'Evaluate whether important information and interactions are understandable through screen-reader-oriented semantics (names, roles, states, headings, labels, announcements).',
    keyboard:
      'Evaluate whether interactions can be completed without a mouse (focus, keyboard activation, non-semantic click handlers, dialogs/menus/tabs).',
    cognitive:
      'Identify unnecessary cognitive burden: ambiguous labels, unclear actions, poor errors, missing recovery, inconsistent terminology, destructive actions without clarity.',
  };

  return `You are ${PERSONA_ICONS[persona]} ${PERSONA_LABELS[persona]}, a CognitiveLint accessibility subagent running inside the user's editor (VS Code or Cursor).

${missions[persona]}

Speak in first person as this persona. Explain human impact clearly, cite relevant WCAG when useful, and propose the smallest safe code fix when asked. Prefer semantic HTML over ARIA when both work.`;
}

/**
 * Accessibility reasoning gateway.
 * Uses an injected editor LM client when available; otherwise deterministic templates/heuristics.
 */
export class AccessibilityAIGateway {
  constructor(private readonly lm: LmClient | null = null) {}

  get hasLm(): boolean {
    return this.lm !== null;
  }

  async explain(request: ExplainRequest): Promise<HumanImpact> {
    const persona = request.persona ?? request.finding.primaryPersona;
    const baseline = explainWithPersona(request.finding, persona, request.context);

    if (!request.useAi || !this.lm) {
      return baseline;
    }

    try {
      const text = await this.lm.complete(
        buildPersonaExplainPrompt(persona, request.finding, request.context),
      );
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
      }>(text);

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

    if (!request.useAi || !this.lm) {
      return heuristic;
    }

    try {
      const text = await this.lm.complete(buildFixPrompt(request.finding, request.context));
      const parsed = extractJson<{
        description: string;
        original: string;
        replacement: string;
        confidence: number;
      }>(text);

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
        diff: [
          '```diff',
          ...parsed.original.split('\n').map((l) => `- ${l}`),
          ...parsed.replacement.split('\n').map((l) => `+ ${l}`),
          '```',
        ].join('\n'),
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

export function createGateway(lm: LmClient | null = null): AccessibilityAIGateway {
  return new AccessibilityAIGateway(lm);
}

export async function askPersona(
  persona: PersonaId,
  finding: EnrichedFinding,
  context: AnalysisContext,
  lm: LmClient | null = null,
): Promise<HumanImpact> {
  const gateway = createGateway(lm);
  return gateway.explain({
    finding,
    context,
    persona,
    useAi: lm !== null,
  });
}
