import { createRule } from '@cognitivelint/rule-engine';
import type { JSXElementInfo } from '@cognitivelint/parser-react';

const DESTRUCTIVE_PATTERNS = [/delete/i, /destroy/i, /erase/i, /\bremove\b/i, /discard/i];

function isDestructiveAction(element: JSXElementInfo): boolean {
  const textContent = element.textContent?.toLowerCase() ?? '';
  const onClick = element.attributes.find((a) => a.name === 'onClick');
  const onClickValue = typeof onClick?.value === 'string' ? onClick.value : '';

  return DESTRUCTIVE_PATTERNS.some(
    (pattern) => pattern.test(textContent) || pattern.test(onClickValue)
  );
}

function isPrimaryStyled(element: JSXElementInfo): boolean {
  return element.attributes.some(
    (attr) =>
      (attr.name === 'variant' && attr.value === 'primary') ||
      (attr.name === 'type' && attr.value === 'primary') ||
      (attr.name === 'color' && attr.value === 'primary') ||
      (attr.name === 'intent' && attr.value === 'primary') ||
      (attr.name === 'appearance' && attr.value === 'primary') ||
      (attr.name === 'className' &&
        typeof attr.value === 'string' &&
        /primary|btn-primary/.test(attr.value))
  );
}

function isDangerStyled(element: JSXElementInfo): boolean {
  return element.attributes.some(
    (attr) =>
      (attr.name === 'variant' && attr.value === 'danger') ||
      (attr.name === 'color' && attr.value === 'danger') ||
      (attr.name === 'className' &&
        typeof attr.value === 'string' &&
        /danger|btn-danger|destructive/.test(attr.value))
  );
}

export const destructiveAsPrimary = createRule({
  meta: {
    id: 'cognitive-load/destructive-as-primary',
    name: 'Destructive Action Styled as Primary',
    description: 'Destructive actions should not use primary styling',
    category: 'cognitive-load',
    severity: 'medium',
    principle: 'Visual hierarchy — primary CTA should not destroy data',
    docs: 'https://cognitivelint.dev/rules/cognitive-load/destructive-as-primary',
  },
  defaultOptions: {},
  create(context) {
    return {
      Button(element: JSXElementInfo) {
        if (!isDestructiveAction(element)) return;
        if (!isPrimaryStyled(element)) return;
        if (isDangerStyled(element)) return;

        context.report({
          severity: 'medium',
          confidence: 80,
          message:
            'Destructive action uses primary styling. Users may treat delete/remove as the main action.',
          location: element.location,
          context: {
            buttonText: element.textContent,
            suggestion:
              'Use danger/destructive styling for delete actions and reserve primary for the safe default',
          },
        });
      },
    };
  },
});
