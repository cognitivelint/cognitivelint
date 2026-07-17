import { createRule } from '@cognitivelint/rule-engine';
import type { JSXElementInfo } from '@cognitivelint/parser-react';

const DESTRUCTIVE_PATTERNS = [
  /delete/i,
  /remove/i,
  /destroy/i,
  /erase/i,
  /discard/i,
  /clear/i,
  /reset/i,
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

  return DESTRUCTIVE_PATTERNS.some(
    (pattern) => pattern.test(textContent) || pattern.test(onClickValue)
  );
}

function hasConfirmationPattern(element: JSXElementInfo): boolean {
  const onClick = element.attributes.find((a) => a.name === 'onClick');
  const onClickValue = typeof onClick?.value === 'string' ? onClick.value.toLowerCase() : '';

  if (CONFIRM_PATTERNS.some((pattern) => pattern.test(onClickValue))) {
    return true;
  }

  if (onClickValue.includes('confirm') || onClickValue.includes('modal') ||
      onClickValue.includes('dialog') || onClickValue.includes('prompt')) {
    return true;
  }

  return false;
}

export const destructiveNoConfirm = createRule({
  meta: {
    id: 'error-prevention/destructive-no-confirm',
    name: 'Destructive Action Without Confirmation',
    description: 'Destructive actions should require confirmation to prevent accidents',
    category: 'error-prevention',
    severity: 'critical',
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
          severity: 'critical',
          confidence: 80,
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
