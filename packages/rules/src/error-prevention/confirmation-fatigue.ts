import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/parser-react';

interface Options {
  maxConfirmations: number;
}

const CONFIRM_TAG_PATTERNS = ['confirmdialog', 'confirmmodal', 'alertdialog', 'deletedialog'];

function isConfirmationElement(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();

  const isConfirmComponent = CONFIRM_TAG_PATTERNS.some((p) => tagLower.includes(p));

  const hasConfirmRole = element.attributes.some(
    (attr) => attr.name === 'role' && attr.value === 'alertdialog'
  );

  const hasConfirmAction = element.attributes.some((attr) => {
    const nameLower = attr.name.toLowerCase();
    return nameLower.includes('confirm') || nameLower.includes('onconfirm');
  });

  return isConfirmComponent || hasConfirmRole || hasConfirmAction;
}

function countConfirmations(component: ReactComponent): number {
  return component.jsxElements.filter(isConfirmationElement).length;
}

export const confirmationFatigue = createRule<Options>({
  meta: {
    id: 'error-prevention/confirmation-fatigue',
    name: 'Confirmation Fatigue',
    description: 'Too many confirmations train users to click through without reading',
    category: 'error-prevention',
    severity: 'medium',
    principle: 'Error Prevention - Overuse of confirmations reduces their effectiveness',
    docs: 'https://cognitivelint.dev/rules/error-prevention/confirmation-fatigue',
    schema: {
      type: 'object',
      properties: {
        maxConfirmations: { type: 'number', default: 2 },
      },
    },
  },
  defaultOptions: {
    maxConfirmations: 2,
  },
  create(context) {
    return {
      'Component:exit'(component: ReactComponent) {
        const confirmCount = countConfirmations(component);
        const max = context.options.maxConfirmations;

        if (confirmCount > max) {
          const firstConfirm = component.jsxElements.find(isConfirmationElement);
          if (firstConfirm) {
            context.report({
              severity: 'medium',
              confidence: 75,
              message: `${confirmCount} confirmation dialogs detected. Users become desensitized to warnings.`,
              location: firstConfirm.location,
              context: {
                confirmCount,
                maxRecommended: max,
                suggestion: 'Reserve confirmations for truly destructive actions only',
              },
            });
          }
        }
      },
    };
  },
});
