import type { AccessibilityFinding, PersonaId } from './types.js';

interface SemanticPattern {
  id: string;
  message: string;
  persona: PersonaId;
  severity: AccessibilityFinding['severity'];
  /** Return match ranges as [startLine, startCol, endLine, endCol, matchedText] */
  match: (source: string, lines: string[]) => Array<{
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    matched: string;
  }>;
}

const AMBIGUOUS_LABELS = [
  'delete',
  'remove',
  'ok',
  'yes',
  'no',
  'submit',
  'click here',
  'here',
  'learn more',
  'more',
  'info',
  'details',
];

const DESTRUCTIVE_LABELS = ['delete', 'remove', 'destroy', 'reset', 'clear all', 'wipe'];

function lineColFromIndex(source: string, index: number): { line: number; column: number } {
  const before = source.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 };
}

function findJsxTextButtons(source: string): Array<{
  start: number;
  end: number;
  text: string;
  full: string;
}> {
  const results: Array<{ start: number; end: number; text: string; full: string }> = [];
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const inner = m[2] ?? '';
    const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      text,
      full: m[0],
    });
  }
  return results;
}

function countSimilarLabels(source: string, label: string): number {
  const re = new RegExp(`>\\s*${escapeRegExp(label)}\\s*<`, 'gi');
  return (source.match(re) ?? []).length;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PATTERNS: SemanticPattern[] = [
  {
    id: 'cognitive/ambiguous-action-label',
    message: 'Action label is ambiguous and may not identify what it applies to',
    persona: 'cognitive',
    severity: 'warning',
    match(source) {
      const out: ReturnType<SemanticPattern['match']> = [];
      for (const btn of findJsxTextButtons(source)) {
        const lower = btn.text.toLowerCase();
        if (!AMBIGUOUS_LABELS.includes(lower)) continue;
        // Only flag when multiple similar actions exist OR label is extremely generic
        const similar = countSimilarLabels(source, btn.text);
        const alwaysAmbiguous = ['ok', 'yes', 'no', 'click here', 'here', 'more', 'info'].includes(lower);
        if (similar >= 2 || alwaysAmbiguous || DESTRUCTIVE_LABELS.includes(lower)) {
          const start = lineColFromIndex(source, btn.start);
          const end = lineColFromIndex(source, btn.end);
          out.push({
            startLine: start.line,
            startColumn: start.column,
            endLine: end.line,
            endColumn: end.column,
            matched: btn.full,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'cognitive/destructive-no-context',
    message: 'Destructive action uses a generic label without identifying the target',
    persona: 'cognitive',
    severity: 'warning',
    match(source) {
      const out: ReturnType<SemanticPattern['match']> = [];
      for (const btn of findJsxTextButtons(source)) {
        const lower = btn.text.toLowerCase();
        if (!DESTRUCTIVE_LABELS.includes(lower)) continue;
        // Skip if aria-label already provides specificity
        if (/aria-label\s*=/i.test(btn.full) && !/aria-label\s*=\s*["'](delete|remove)["']/i.test(btn.full)) {
          continue;
        }
        if (btn.text.split(/\s+/).length >= 2) continue;
        const start = lineColFromIndex(source, btn.start);
        const end = lineColFromIndex(source, btn.end);
        out.push({
          startLine: start.line,
          startColumn: start.column,
          endLine: end.line,
          endColumn: end.column,
          matched: btn.full,
        });
      }
      return out;
    },
  },
  {
    id: 'keyboard/click-only-div',
    message: 'Interactive element uses a non-semantic host with only a mouse click handler',
    persona: 'keyboard',
    severity: 'error',
    match(source) {
      const out: ReturnType<SemanticPattern['match']> = [];
      const re = /<(div|span)\b([^>]*\bonClick\s*=\s*\{[^}]+\}[^>]*)>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source)) !== null) {
        const attrs = m[2] ?? '';
        // Skip if already has keyboard handlers or role=button with tabIndex
        if (/\bonKey(Down|Up|Press)\s*=/.test(attrs)) continue;
        if (/\brole\s*=\s*["']button["']/.test(attrs) && /\btabIndex\s*=/.test(attrs)) continue;
        const start = lineColFromIndex(source, m.index);
        const end = lineColFromIndex(source, m.index + m[0].length);
        out.push({
          startLine: start.line,
          startColumn: start.column,
          endLine: end.line,
          endColumn: end.column,
          matched: m[0],
        });
      }
      return out;
    },
  },
  {
    id: 'screen-reader/icon-only-button',
    message: 'Button appears to contain only an icon without an accessible name',
    persona: 'screen-reader',
    severity: 'error',
    match(source) {
      const out: ReturnType<SemanticPattern['match']> = [];
      const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source)) !== null) {
        const attrs = m[1] ?? '';
        const inner = (m[2] ?? '').trim();
        if (/aria-label\s*=/.test(attrs) || /aria-labelledby\s*=/.test(attrs)) continue;
        const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const hasIcon = /Icon\s*\/?>|<svg\b|<[A-Z][A-Za-z0-9]*\s*\/>/.test(inner);
        if (hasIcon && text.length === 0) {
          const start = lineColFromIndex(source, m.index);
          const end = lineColFromIndex(source, m.index + m[0].length);
          out.push({
            startLine: start.line,
            startColumn: start.column,
            endLine: end.line,
            endColumn: end.column,
            matched: m[0],
          });
        }
      }
      return out;
    },
  },
];

/**
 * Semantic / contextual findings that extend beyond deterministic jsx-a11y rules.
 * Especially used by the Cognitive Agent and some keyboard/SR heuristics.
 */
export function runSemanticScan(
  sourceCode: string,
  filePath: string,
): AccessibilityFinding[] {
  const lines = sourceCode.split('\n');
  const findings: AccessibilityFinding[] = [];

  for (const pattern of PATTERNS) {
    for (const hit of pattern.match(sourceCode, lines)) {
      findings.push({
        id: `${pattern.id}:${hit.startLine}:${hit.startColumn}`,
        ruleId: pattern.id,
        message: pattern.message,
        severity: pattern.severity,
        source: 'semantic',
        location: {
          file: filePath,
          startLine: hit.startLine,
          startColumn: hit.startColumn,
          endLine: hit.endLine,
          endColumn: hit.endColumn,
        },
        primaryPersona: pattern.persona,
        snippet: hit.matched,
      });
    }
  }

  return findings;
}
