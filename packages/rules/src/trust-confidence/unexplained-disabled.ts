import { createRule } from '@cognitivelint/cognitivelint-rule-engine';
import type { JSXElementInfo } from '@cognitivelint/cognitivelint-parser-react';

export const unexplainedDisabled = createRule({
  meta: {
    id: 'trust-confidence/unexplained-disabled',
    name: 'Unexplained Disabled State',
    description: 'Disabled buttons should explain why they are disabled',
    category: 'trust-confidence',
    severity: 'medium',
    principle: 'Help users recognize, diagnose, and recover from errors (Nielsen Heuristic #9)',
    docs: 'https://cognitivelint.dev/rules/trust-confidence/unexplained-disabled',
  },
  defaultOptions: {},
  create(context) {
    return {
      Button(element: JSXElementInfo) {
        if (!element.isDisabled) return;

        const hasExplanation = element.attributes.some(
          (attr) =>
            attr.name === 'title' ||
            attr.name === 'aria-describedby' ||
            attr.name === 'aria-label' ||
            attr.name === 'tooltip' ||
            attr.name === 'data-tooltip'
        );

        if (!hasExplanation) {
          context.report({
            severity: 'medium',
            confidence: 90,
            message:
              'Disabled button has no explanation. Users cannot understand why this action is unavailable.',
            location: element.location,
            context: {
              buttonText: element.textContent,
              suggestion:
                'Add a tooltip or aria-describedby explaining when the button will be enabled',
            },
          });
        }
      },
    };
  },
});
