import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/parser-react';

interface Options {
  maxPrimaryActions: number;
}

function isPrimaryButton(element: JSXElementInfo): boolean {
  return element.attributes.some(
    (attr) =>
      (attr.name === 'variant' && attr.value === 'primary') ||
      (attr.name === 'type' && attr.value === 'primary') ||
      (attr.name === 'color' && attr.value === 'primary') ||
      (attr.name === 'className' &&
        typeof attr.value === 'string' &&
        /primary|btn-primary/.test(attr.value)) ||
      (attr.name === 'intent' && attr.value === 'primary') ||
      (attr.name === 'appearance' && attr.value === 'primary')
  );
}

export const excessivePrimaryActions = createRule<Options>({
  meta: {
    id: 'cognitive-load/excessive-primary-actions',
    name: 'Excessive Primary Actions',
    description: 'Too many primary actions create decision fatigue',
    category: 'cognitive-load',
    severity: 'medium',
    principle: "Hick's Law - Decision time increases with number of choices",
    docs: 'https://cognitivelint.dev/rules/cognitive-load/excessive-primary-actions',
    schema: {
      type: 'object',
      properties: {
        maxPrimaryActions: { type: 'number', default: 2 },
      },
    },
  },
  defaultOptions: {
    maxPrimaryActions: 2,
  },
  create(context) {
    let primaryButtons: JSXElementInfo[] = [];

    return {
      Component(_component: ReactComponent) {
        primaryButtons = [];
      },

      Button(element: JSXElementInfo) {
        if (isPrimaryButton(element)) {
          primaryButtons.push(element);
        }
      },

      'Component:exit'(_component: ReactComponent) {
        const max = context.options.maxPrimaryActions;
        if (primaryButtons.length > max) {
          const severity = primaryButtons.length > 3 ? 'high' : 'medium';
          context.report({
            severity,
            confidence: 95,
            message: `${primaryButtons.length} primary actions detected. Users struggle to identify the main action.`,
            location: primaryButtons[0].location,
            context: {
              count: primaryButtons.length,
              max,
              suggestion:
                'Designate one clear primary action and demote others to secondary styling',
            },
          });
        }
      },
    };
  },
});
