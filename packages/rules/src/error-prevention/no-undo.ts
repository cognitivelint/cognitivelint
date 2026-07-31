import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/parser-react';

// Align with destructive-no-confirm: skip reversible UI actions like clear/reset
const DESTRUCTIVE_PATTERNS = [/delete/i, /destroy/i, /\bremove\b/i, /discard/i];
const UNDO_PATTERNS = ['undo', 'revert', 'restore', 'cancel'];
const CONFIRM_PATTERNS = [/confirm/i, /dialog/i, /modal/i, /prompt/i, /alert/i];

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

  return element.attributes.some((attr) => {
    const nameLower = attr.name.toLowerCase();
    return (
      nameLower.includes('confirm') ||
      nameLower === 'requireconfirmation' ||
      nameLower === 'withconfirmation'
    );
  });
}

function hasUndoCapability(component: ReactComponent): boolean {
  return component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    const textLower = el.textContent?.toLowerCase() ?? '';
    return UNDO_PATTERNS.some((p) => tagLower.includes(p) || textLower.includes(p));
  });
}

export const noUndo = createRule({
  meta: {
    id: 'error-prevention/no-undo',
    name: 'No Undo Capability',
    description: 'Destructive actions should be reversible or have undo capability',
    category: 'error-prevention',
    severity: 'low',
    principle: 'User Control and Freedom (Nielsen Heuristic #3)',
    docs: 'https://cognitivelint.dev/rules/error-prevention/no-undo',
  },
  defaultOptions: {},
  create(context) {
    const destructiveActions: JSXElementInfo[] = [];

    return {
      Component(_component: ReactComponent) {
        destructiveActions.length = 0;
      },

      Button(element: JSXElementInfo) {
        // Confirmation is an accepted alternative to undo for irreversible actions
        if (isDestructiveAction(element) && !hasConfirmationPattern(element)) {
          destructiveActions.push(element);
        }
      },

      'Component:exit'(component: ReactComponent) {
        if (destructiveActions.length > 0 && !hasUndoCapability(component)) {
          for (const action of destructiveActions) {
            context.report({
              severity: 'low',
              confidence: 55,
              message: 'Destructive action has no undo capability. Users cannot recover from mistakes.',
              location: action.location,
              context: {
                actionText: action.textContent,
                suggestion: 'Provide an undo option, soft-delete, or recovery mechanism',
              },
            });
          }
        }
      },
    };
  },
});
