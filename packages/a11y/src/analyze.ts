import { buildContext } from './context.js';
import { runJsxA11y } from './eslint-runner.js';
import { explainWithPersona } from './personas/impact.js';
import { runSemanticScan } from './semantic-scanner.js';
import { AccessibilityAIGateway, aiAvailable } from './ai/gateway.js';
import type {
  AnalyzeOptions,
  AnalyzeResult,
  EnrichedFinding,
} from './types.js';

/**
 * Full accessibility analysis pipeline:
 * JSX → eslint-plugin-jsx-a11y → semantic scan → persona human impact
 */
export async function analyzeFile(options: AnalyzeOptions): Promise<AnalyzeResult> {
  const { filePath, sourceCode } = options;
  const enrich = options.enrich !== false;

  const deterministic = runJsxA11y(sourceCode, filePath);
  const semantic = runSemanticScan(sourceCode, filePath);

  // Deduplicate overlapping icon-only / control-has-associated-label style findings
  const merged = dedupeFindings([...deterministic, ...semantic]);

  if (!enrich) {
    return {
      filePath,
      findings: merged.map((f) => ({
        ...f,
        humanImpact: explainWithPersona(f),
      })),
      deterministicCount: deterministic.length,
      semanticCount: semantic.length,
    };
  }

  const useAi = options.useAi === true && aiAvailable(options.apiKey);
  const gateway = useAi ? new AccessibilityAIGateway(options.apiKey) : null;

  const findings: EnrichedFinding[] = [];
  for (const finding of merged) {
    const context = buildContext(filePath, sourceCode, finding, merged);
    const humanImpact = gateway
      ? await gateway.explain({
          finding,
          context,
          persona: finding.primaryPersona,
          useAi: true,
          ...(options.apiKey !== undefined ? { apiKey: options.apiKey } : {}),
        })
      : explainWithPersona(finding, finding.primaryPersona, context);

    findings.push({ ...finding, humanImpact });
  }

  return {
    filePath,
    findings,
    deterministicCount: deterministic.length,
    semanticCount: semantic.length,
  };
}

function dedupeFindings<T extends { id: string; ruleId: string; location: { startLine: number; startColumn: number } }>(
  findings: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  // Prefer jsx-a11y when both fire on same line for similar issues
  const sorted = [...findings].sort((a, b) => {
    const aDet = a.ruleId.startsWith('jsx-a11y/') ? 0 : 1;
    const bDet = b.ruleId.startsWith('jsx-a11y/') ? 0 : 1;
    return aDet - bDet;
  });

  for (const f of sorted) {
    const key = `${f.location.startLine}:${f.location.startColumn}:${family(f.ruleId)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function family(ruleId: string): string {
  if (
    ruleId === 'screen-reader/icon-only-button' ||
    ruleId === 'jsx-a11y/control-has-associated-label'
  ) {
    return 'missing-name';
  }
  if (
    ruleId === 'keyboard/click-only-div' ||
    ruleId === 'jsx-a11y/no-static-element-interactions' ||
    ruleId === 'jsx-a11y/click-events-have-key-events'
  ) {
    return 'click-only';
  }
  return ruleId;
}
