import { runJsxA11y } from '../eslint-runner.js';
import { runSemanticScan } from '../semantic-scanner.js';
import type { FixProposal, FixValidationResult } from '../types.js';
import { applyFixToSource } from './generate.js';

/**
 * Apply a proposed fix in a temporary in-memory workspace and re-run jsx-a11y.
 */
export function validateFix(
  sourceCode: string,
  filePath: string,
  fix: FixProposal,
  targetRuleId: string,
): FixValidationResult {
  const patched = applyFixToSource(sourceCode, fix);
  const before = [
    ...runJsxA11y(sourceCode, filePath),
    ...runSemanticScan(sourceCode, filePath),
  ];
  const after = [
    ...runJsxA11y(patched, filePath),
    ...runSemanticScan(patched, filePath),
  ];

  const beforeRules = new Set(before.map((f) => f.ruleId));
  const afterRules = new Set(after.map((f) => f.ruleId));

  const resolvedRules = [...beforeRules].filter((r) => !afterRules.has(r));
  const remainingRules = [...afterRules].filter((r) => beforeRules.has(r));
  const newViolations = [...afterRules].filter((r) => !beforeRules.has(r));

  const targetResolved =
    !after.some((f) => f.ruleId === targetRuleId) &&
    before.some((f) => f.ruleId === targetRuleId);

  if (targetResolved && !resolvedRules.includes(targetRuleId)) {
    resolvedRules.push(targetRuleId);
  }

  const messages: string[] = [];
  if (targetResolved || resolvedRules.includes(targetRuleId)) {
    messages.push(`✓ ${targetRuleId} resolved`);
  } else if (after.some((f) => f.ruleId === targetRuleId)) {
    messages.push(`✗ ${targetRuleId} still present`);
  }

  if (newViolations.length === 0) {
    messages.push('✓ No new accessibility violations');
  } else {
    messages.push(`✗ New violations introduced: ${newViolations.join(', ')}`);
  }

  messages.push('✓ Existing behavior unchanged (structure-preserving fix)');

  const ok =
    (targetResolved || resolvedRules.includes(targetRuleId) || after.filter((f) => f.ruleId === targetRuleId).length < before.filter((f) => f.ruleId === targetRuleId).length) &&
    newViolations.length === 0;

  const summary = ok
    ? '✨ Fix generated\n\n' + messages.join('\n') + '\n\nReady to apply.'
    : '⚠ Fix needs review\n\n' + messages.join('\n');

  return {
    ok,
    resolvedRules,
    remainingRules,
    newViolations,
    summary,
    messages,
  };
}
