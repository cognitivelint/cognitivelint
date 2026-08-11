/**
 * Core types for CognitiveLint Accessibility Agent
 */

export type PersonaId = 'screen-reader' | 'keyboard' | 'cognitive';

export type HumanImpactLevel = 'high' | 'medium' | 'low' | 'potential';

export type ConfidenceBand = 'high' | 'medium' | 'low';

export type FindingSource = 'jsx-a11y' | 'semantic' | 'ai';

export interface SourceLocation {
  file: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface AccessibilityFinding {
  id: string;
  ruleId: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: FindingSource;
  location: SourceLocation;
  /** jsx-a11y rule id when sourced from eslint */
  eslintRuleId?: string;
  /** Suggested persona for human-impact explanation */
  primaryPersona: PersonaId;
  /** Code snippet at the finding site */
  snippet?: string;
}

export interface HumanImpact {
  persona: PersonaId;
  personaLabel: string;
  impactLevel: HumanImpactLevel;
  whatHappened: string;
  whoIsAffected: string;
  whatTheyExperience: string;
  whyItMatters: string;
  whatToDo: string;
  /** Full narrative shown in the editor */
  narrative: string;
  confidence: number;
  confidenceBand: ConfidenceBand;
  wcagRefs?: string[];
}

export interface EnrichedFinding extends AccessibilityFinding {
  humanImpact: HumanImpact;
}

export interface FixProposal {
  findingId: string;
  description: string;
  /** Unified diff or before/after patch preview */
  diff: string;
  /** Full replacement for the affected range (preferred for apply) */
  replacement: string;
  /** Original text being replaced */
  original: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  confidence: number;
  confidenceBand: ConfidenceBand;
  persona: PersonaId;
}

export interface FixValidationResult {
  ok: boolean;
  resolvedRules: string[];
  remainingRules: string[];
  newViolations: string[];
  summary: string;
  messages: string[];
}

export interface AnalysisContext {
  filePath: string;
  sourceCode: string;
  /** Lines around the finding */
  nearbyJsx?: string;
  /** Heuristic: component name if detectable */
  componentName?: string;
  /** Other findings in the same file */
  siblingFindings?: AccessibilityFinding[];
  /** Props / identifiers near the node */
  localIdentifiers?: string[];
}

export interface AnalyzeOptions {
  filePath: string;
  sourceCode: string;
  /** Enrich with persona human-impact explanations (default true) */
  enrich?: boolean;
  /**
   * Use the host editor's built-in language model for enrichment.
   * Prefer on-demand Quick Fix / chat subagents; batch scans stay deterministic.
   */
  useAi?: boolean;
  /** Injected LM client from VS Code / Cursor (`vscode.lm`). Never an API key. */
  lm?: import('./ai/gateway.js').LmClient;
}

export interface AnalyzeResult {
  filePath: string;
  findings: EnrichedFinding[];
  deterministicCount: number;
  semanticCount: number;
}

export interface ExplainRequest {
  finding: AccessibilityFinding;
  context: AnalysisContext;
  persona?: PersonaId;
  useAi?: boolean;
}

export interface FixRequest {
  finding: EnrichedFinding;
  context: AnalysisContext;
  useAi?: boolean;
}

export const PERSONA_LABELS: Record<PersonaId, string> = {
  'screen-reader': 'Screen Reader Agent',
  keyboard: 'Keyboard Agent',
  cognitive: 'Cognitive Agent',
};

export const PERSONA_ICONS: Record<PersonaId, string> = {
  'screen-reader': '🔊',
  keyboard: '⌨',
  cognitive: '🧠',
};

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 90) return 'high';
  if (confidence >= 70) return 'medium';
  return 'low';
}
