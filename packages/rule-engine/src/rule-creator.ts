import type { Rule, RuleMeta, RuleContext, RuleVisitor } from '@cognitivelint/cognitivelint-core';

export interface RuleModule<TOptions = unknown> {
  meta: RuleMeta;
  defaultOptions?: TOptions | undefined;
  create: (context: RuleContext<TOptions>) => RuleVisitor;
}

export function createRule<TOptions = unknown>(
  rule: RuleModule<TOptions>
): Rule<TOptions> {
  return {
    meta: rule.meta,
    defaultOptions: rule.defaultOptions,
    create: rule.create,
  };
}
