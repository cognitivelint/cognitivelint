import { Linter } from 'eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tsParser from '@typescript-eslint/parser';
import type { AccessibilityFinding } from './types.js';

const JSX_A11Y_RULES: Record<string, 'error' | 'warn'> = {
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/anchor-has-content': 'error',
  'jsx-a11y/anchor-is-valid': 'warn',
  'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
  'jsx-a11y/aria-props': 'error',
  'jsx-a11y/aria-proptypes': 'error',
  'jsx-a11y/aria-role': 'error',
  'jsx-a11y/aria-unsupported-elements': 'error',
  'jsx-a11y/click-events-have-key-events': 'error',
  'jsx-a11y/control-has-associated-label': 'error',
  'jsx-a11y/heading-has-content': 'error',
  'jsx-a11y/html-has-lang': 'error',
  'jsx-a11y/iframe-has-title': 'error',
  'jsx-a11y/img-redundant-alt': 'warn',
  'jsx-a11y/interactive-supports-focus': 'error',
  'jsx-a11y/label-has-associated-control': 'error',
  'jsx-a11y/media-has-caption': 'warn',
  'jsx-a11y/mouse-events-have-key-events': 'error',
  'jsx-a11y/no-access-key': 'warn',
  'jsx-a11y/no-autofocus': 'warn',
  'jsx-a11y/no-distracting-elements': 'error',
  'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
  'jsx-a11y/no-noninteractive-element-interactions': 'error',
  'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
  'jsx-a11y/no-noninteractive-tabindex': 'error',
  'jsx-a11y/no-redundant-roles': 'warn',
  'jsx-a11y/no-static-element-interactions': 'error',
  'jsx-a11y/role-has-required-aria-props': 'error',
  'jsx-a11y/role-supports-aria-props': 'error',
  'jsx-a11y/scope': 'error',
  'jsx-a11y/tabindex-no-positive': 'error',
};

/** Map jsx-a11y rules to the persona that should explain them */
export const RULE_PERSONA_MAP: Record<string, AccessibilityFinding['primaryPersona']> = {
  'jsx-a11y/alt-text': 'screen-reader',
  'jsx-a11y/anchor-has-content': 'screen-reader',
  'jsx-a11y/anchor-is-valid': 'keyboard',
  'jsx-a11y/aria-activedescendant-has-tabindex': 'keyboard',
  'jsx-a11y/aria-props': 'screen-reader',
  'jsx-a11y/aria-proptypes': 'screen-reader',
  'jsx-a11y/aria-role': 'screen-reader',
  'jsx-a11y/aria-unsupported-elements': 'screen-reader',
  'jsx-a11y/click-events-have-key-events': 'keyboard',
  'jsx-a11y/control-has-associated-label': 'screen-reader',
  'jsx-a11y/heading-has-content': 'screen-reader',
  'jsx-a11y/html-has-lang': 'screen-reader',
  'jsx-a11y/iframe-has-title': 'screen-reader',
  'jsx-a11y/img-redundant-alt': 'screen-reader',
  'jsx-a11y/interactive-supports-focus': 'keyboard',
  'jsx-a11y/label-has-associated-control': 'screen-reader',
  'jsx-a11y/media-has-caption': 'screen-reader',
  'jsx-a11y/mouse-events-have-key-events': 'keyboard',
  'jsx-a11y/no-access-key': 'keyboard',
  'jsx-a11y/no-autofocus': 'cognitive',
  'jsx-a11y/no-distracting-elements': 'cognitive',
  'jsx-a11y/no-interactive-element-to-noninteractive-role': 'screen-reader',
  'jsx-a11y/no-noninteractive-element-interactions': 'keyboard',
  'jsx-a11y/no-noninteractive-element-to-interactive-role': 'keyboard',
  'jsx-a11y/no-noninteractive-tabindex': 'keyboard',
  'jsx-a11y/no-redundant-roles': 'screen-reader',
  'jsx-a11y/no-static-element-interactions': 'keyboard',
  'jsx-a11y/role-has-required-aria-props': 'screen-reader',
  'jsx-a11y/role-supports-aria-props': 'screen-reader',
  'jsx-a11y/scope': 'screen-reader',
  'jsx-a11y/tabindex-no-positive': 'keyboard',
};

function flatConfig() {
  return [
    {
      files: ['**/*.{jsx,tsx,js,ts}'],
      languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022 as const,
        sourceType: 'module' as const,
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
      plugins: {
        'jsx-a11y': jsxA11y,
      },
      rules: JSX_A11Y_RULES,
    },
  ];
}

let cachedConfig: ReturnType<typeof flatConfig> | undefined;

function getConfig() {
  cachedConfig ??= flatConfig();
  return cachedConfig;
}

/**
 * Run eslint-plugin-jsx-a11y against source text.
 * Uses @typescript-eslint/parser so real TSX (param types, generics) still parse.
 */
export function runJsxA11y(
  sourceCode: string,
  filePath: string,
): AccessibilityFinding[] {
  const linter = new Linter({ configType: 'flat' });
  const filename =
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.js')
      ? filePath
      : `${filePath}.tsx`;

  let messages: Linter.LintMessage[] = [];
  try {
    messages = linter.verify(sourceCode, getConfig(), { filename });
  } catch {
    // Last-resort: strip types and retry with jsx filename
    try {
      messages = linter.verify(neutralizeTsForJsxLint(sourceCode), getConfig(), {
        filename: filename.replace(/\.tsx?$/, '.jsx'),
      });
    } catch {
      return [];
    }
  }

  const lines = sourceCode.split('\n');
  const findings: AccessibilityFinding[] = [];

  for (const msg of messages) {
    if (msg.fatal) continue;
    if (!msg.ruleId?.startsWith('jsx-a11y/')) continue;

    const startLine = msg.line;
    const endLine = msg.endLine ?? msg.line;
    const startColumn = msg.column;
    const endColumn = msg.endColumn ?? msg.column + 1;
    const snippet = lines.slice(startLine - 1, endLine).join('\n');

    findings.push({
      id: `${msg.ruleId}:${startLine}:${startColumn}`,
      ruleId: msg.ruleId,
      eslintRuleId: msg.ruleId,
      message: msg.message,
      severity: msg.severity === 2 ? 'error' : 'warning',
      source: 'jsx-a11y',
      location: {
        file: filePath,
        startLine,
        startColumn,
        endLine,
        endColumn,
      },
      primaryPersona: RULE_PERSONA_MAP[msg.ruleId] ?? 'screen-reader',
      snippet,
    });
  }

  return findings;
}

/**
 * Best-effort neutralization of TypeScript syntax (fallback only).
 */
export function neutralizeTsForJsxLint(source: string): string {
  let code = source;
  code = code.replace(/^import\s+type\s+.+?;?\s*$/gm, '');
  code = code.replace(/\s+as\s+const\b/g, '');
  code = code.replace(/\s+as\s+[A-Za-z0-9_.<>,\s|&[\]'"]+/g, '');
  code = code.replace(/^(export\s+)?(interface|type)\s+[^{;=]+[={][\s\S]*?(?:^}|;)\s*$/gm, '');
  code = code.replace(/function\s+([A-Za-z0-9_]+)\s*<[^>]+>/g, 'function $1');
  code = code.replace(/const\s+([A-Za-z0-9_]+)\s*(?::\s*[^=]+)?=/g, 'const $1 =');
  // Parameter / return type annotations: (e: React.DragEvent<...>) and ): Type
  code = code.replace(/([,\(]\s*[A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$<>.[\]|&\s,'"]+/g, '$1');
  code = code.replace(/\)\s*:\s*[A-Za-z_$][\w$<>.[\]|&\s,'"]+(?=\s*[{=>])/g, ')');
  code = code.replace(/\s+satisfies\s+[A-Za-z0-9_.<>,\s|&[\]]+/g, '');
  code = code.replace(/^(export\s+)?enum\s+\w+\s*\{[\s\S]*?\}\s*$/gm, '');
  code = code.replace(/!(\.|\()/g, '$1');
  return code;
}

/**
 * Re-lint after a proposed fix to validate jsx-a11y results.
 */
export function validateWithJsxA11y(
  sourceCode: string,
  filePath: string,
  relevantRuleIds: string[],
): { messages: Linter.LintMessage[]; ruleIds: string[] } {
  const findings = runJsxA11y(sourceCode, filePath);
  const ruleIds = findings.map((f) => f.ruleId);
  const relevant = findings.filter(
    (f) => relevantRuleIds.length === 0 || relevantRuleIds.includes(f.ruleId),
  );
  return {
    messages: relevant.map((f) => ({
      ruleId: f.ruleId,
      message: f.message,
      line: f.location.startLine,
      column: f.location.startColumn,
      severity: f.severity === 'error' ? 2 : 1,
    })) as Linter.LintMessage[],
    ruleIds,
  };
}
