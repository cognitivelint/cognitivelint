import type { AccessibilityFinding, AnalysisContext } from './types.js';

/**
 * Build local analysis context for AI / persona reasoning.
 */
export function buildContext(
  filePath: string,
  sourceCode: string,
  finding?: AccessibilityFinding,
  allFindings: AccessibilityFinding[] = [],
): AnalysisContext {
  const lines = sourceCode.split('\n');
  let nearbyJsx: string | undefined;
  let localIdentifiers: string[] = [];

  if (finding) {
    const start = Math.max(0, finding.location.startLine - 8);
    const end = Math.min(lines.length, finding.location.endLine + 8);
    nearbyJsx = lines.slice(start, end).join('\n');
    localIdentifiers = extractIdentifiers(nearbyJsx);
  }

  const componentName = detectComponentName(sourceCode, finding?.location.startLine ?? 1);
  return {
    filePath,
    sourceCode,
    siblingFindings: allFindings.filter((f) => f.id !== finding?.id),
    localIdentifiers,
    ...(nearbyJsx !== undefined ? { nearbyJsx } : {}),
    ...(componentName !== undefined ? { componentName } : {}),
  };
}

function detectComponentName(source: string, nearLine: number): string | undefined {
  const lines = source.split('\n').slice(0, nearLine);
  const joined = lines.join('\n');

  const fn = [...joined.matchAll(/(?:export\s+)?(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)/g)].pop();
  if (fn?.[1]) return fn[1];

  const arrow = [...joined.matchAll(/(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*=/g)].pop();
  if (arrow?.[1]) return arrow[1];

  return undefined;
}

function extractIdentifiers(code: string): string[] {
  const ids = new Set<string>();
  const re = /\b([A-Za-z_][A-Za-z0-9_]{2,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const id = m[1]!;
    if (!RESERVED.has(id)) ids.add(id);
  }
  return [...ids].slice(0, 40);
}

const RESERVED = new Set([
  'const', 'let', 'var', 'function', 'return', 'import', 'export', 'from', 'default',
  'class', 'extends', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof',
  'if', 'else', 'switch', 'case', 'break', 'for', 'while', 'do', 'try', 'catch',
  'finally', 'throw', 'new', 'this', 'super', 'await', 'async', 'yield', 'void',
  'React', 'props', 'children', 'className', 'onClick', 'onChange', 'onSubmit',
  'div', 'span', 'button', 'input', 'label', 'form', 'img', 'a', 'ul', 'li', 'table',
]);
