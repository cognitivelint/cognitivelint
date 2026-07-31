import { createRule } from '@cognitivelint/rule-engine';
import type { JSXElementInfo } from '@cognitivelint/parser-react';

// Only strong irreversible signals — clear/reset often mean reversible UI state
const DESTRUCTIVE_PATTERNS = [
  /delete/i,
  /destroy/i,
  /erase/i,
  /\bremove\b/i,
  /discard/i,
];

const CONFIRM_PATTERNS = [
  /confirm/i,
  /dialog/i,
  /modal/i,
  /prompt/i,
  /alert/i,
];

function isDestructiveAction(element: JSXElementInfo): boolean {
  const textContent = element.textContent?.toLowerCase() ?? '';
  const onClick = element.attributes.find((a) => a.name === 'onClick');
  const onClickValue = typeof onClick?.value === 'string' ? onClick.value : '';

  // Require destructive language in the visible label, or a clearly named handler
  const labelIsDestructive = DESTRUCTIVE_PATTERNS.some((pattern) =>
    pattern.test(textContent)
  );
  const handlerIsDestructive = DESTRUCTIVE_PATTERNS.some((pattern) =>
    pattern.test(onClickValue)
  );

  return labelIsDestructive || handlerIsDestructive;
}

function hasConfirmationPattern(element: JSXElementInfo): boolean {
  const onClick = element.attributes.find((a) => a.name === 'onClick');
  const onClickValue = typeof onClick?.value === 'string' ? onClick.value.toLowerCase() : '';

  if (CONFIRM_PATTERNS.some((pattern) => pattern.test(onClickValue))) {
    return true;
  }

  // Common design-system affordances for confirmations
  const hasConfirmProp = element.attributes.some((attr) => {
    const nameLower = attr.name.toLowerCase();
    return (
      nameLower.includes('confirm') ||
      nameLower === 'requireconfirmation' ||
      nameLower === 'withconfirmation'
    );
  });

  return hasConfirmProp;
}

export const destructiveNoConfirm = createRule({
  meta: {
    id: 'error-prevention/destructive-no-confirm',
    name: 'Destructive Action Without Confirmation',
    description: 'Destructive actions should require confirmation to prevent accidents',
    category: 'error-prevention',
    severity: 'high',
    principle: 'Error Prevention (Nielsen Heuristic #5)',
    docs: 'https://cognitivelint.dev/rules/error-prevention/destructive-no-confirm',
  },
  defaultOptions: {},
  create(context) {
    return {
      Button(element: JSXElementInfo) {
        if (!isDestructiveAction(element)) return;
        if (hasConfirmationPattern(element)) return;

        context.report({
          severity: 'high',
          confidence: 70,
          message:
            'Destructive action lacks confirmation. Users may accidentally delete important data.',
          location: element.location,
          context: {
            buttonText: element.textContent,
            suggestion: 'Add a confirmation dialog before executing destructive actions',
          },
        });
      },
    };
  },
});
