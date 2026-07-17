import { createRule } from '@cognitivelint/cognitivelint-rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/cognitivelint-parser-react';

const DESTRUCTIVE_PATTERNS = [/delete/i, /remove/i, /destroy/i, /discard/i, /clear/i];
const UNDO_PATTERNS = ['undo', 'revert', 'restore', 'cancel'];

function isDestructiveAction(element: JSXElementInfo): boolean {
  const textContent = element.textContent?.toLowerCase() ?? '';
  const onClick = element.attributes.find((a) => a.name === 'onClick');
  const onClickValue = typeof onClick?.value === 'string' ? onClick.value : '';

  return DESTRUCTIVE_PATTERNS.some(
    (pattern) => pattern.test(textContent) || pattern.test(onClickValue)
  );
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
    severity: 'medium',
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
        if (isDestructiveAction(element)) {
          destructiveActions.push(element);
        }
      },

      'Component:exit'(component: ReactComponent) {
        if (destructiveActions.length > 0 && !hasUndoCapability(component)) {
          for (const action of destructiveActions) {
            context.report({
              severity: 'medium',
              confidence: 70,
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
