import { createRule } from '@cognitivelint/rule-engine';
import type { JSXElementInfo } from '@cognitivelint/parser-react';

const EXPLANATION_ATTRS = new Set([
  'title',
  'aria-describedby',
  'aria-label',
  'aria-errormessage',
  'tooltip',
  'data-tooltip',
  'data-tip',
  'hint',
  'helpertext',
  'helpmessage',
  'description',
  'disabledreason',
  'disabledmessage',
  'reason',
]);

function hasExplanation(element: JSXElementInfo): boolean {
  return element.attributes.some((attr) => {
    const nameLower = attr.name.toLowerCase();
    if (EXPLANATION_ATTRS.has(nameLower)) return true;
    // Design-system variants: tooltipContent, helperText, disabledReason, etc.
    return (
      nameLower.includes('tooltip') ||
      nameLower.includes('helper') ||
      nameLower.includes('hint') ||
      (nameLower.includes('disabled') && nameLower.includes('reason')) ||
      (nameLower.includes('disabled') && nameLower.includes('message'))
    );
  });
}

export const unexplainedDisabled = createRule({
  meta: {
    id: 'trust-confidence/unexplained-disabled',
    name: 'Unexplained Disabled State',
    description: 'Disabled buttons should explain why they are disabled',
    category: 'trust-confidence',
    severity: 'low',
    principle: 'Help users recognize, diagnose, and recover from errors (Nielsen Heuristic #9)',
    docs: 'https://cognitivelint.dev/rules/trust-confidence/unexplained-disabled',
  },
  defaultOptions: {},
  create(context) {
    return {
      Button(element: JSXElementInfo) {
        if (!element.isDisabled) return;
        if (hasExplanation(element)) return;

        context.report({
          severity: 'low',
          confidence: 70,
          message:
            'Disabled button has no explanation. Users cannot understand why this action is unavailable.',
          location: element.location,
          context: {
            buttonText: element.textContent,
            suggestion:
              'Add a tooltip or aria-describedby explaining when the button will be enabled',
          },
        });
      },
    };
  },
});
