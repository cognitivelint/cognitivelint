import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/parser-react';

const CTA_PATTERNS = ['submit', 'save', 'create', 'add', 'continue', 'next', 'confirm'];

function isPrimaryAction(element: JSXElementInfo): boolean {
  const isPrimaryStyled = element.attributes.some(
    (attr) =>
      (attr.name === 'variant' && attr.value === 'primary') ||
      (attr.name === 'type' && attr.value === 'submit') ||
      (attr.name === 'className' &&
        typeof attr.value === 'string' &&
        /primary|cta/.test(attr.value))
  );

  const hasCTAText =
    element.textContent &&
    CTA_PATTERNS.some((p) => element.textContent!.toLowerCase().includes(p));

  return isPrimaryStyled || Boolean(hasCTAText);
}

function isInsideScrollableContainer(_element: JSXElementInfo, component: ReactComponent): boolean {
  const scrollablePatterns = ['scroll', 'overflow', 'virtualized'];

  return component.jsxElements.some((el) => {
    const hasScrollClass = el.attributes.some((attr) => {
      if (attr.name !== 'className' || typeof attr.value !== 'string') return false;
      const val = attr.value;
      return scrollablePatterns.some((p) => val.toLowerCase().includes(p));
    });

    const hasScrollStyle = el.attributes.some(
      (attr) =>
        attr.name === 'style' &&
        typeof attr.value === 'string' &&
        attr.value.includes('overflow')
    );

    return hasScrollClass || hasScrollStyle;
  });
}

export const hiddenPrimaryAction = createRule({
  meta: {
    id: 'discoverability/hidden-primary-action',
    name: 'Hidden Primary Action',
    description: 'Primary actions should be visible without scrolling',
    category: 'discoverability',
    severity: 'high',
    principle: 'Visibility of System Status - Key actions should be prominent',
    docs: 'https://cognitivelint.dev/rules/discoverability/hidden-primary-action',
  },
  defaultOptions: {},
  create(context) {
    return {
      'Component:exit'(component: ReactComponent) {
        const primaryActions = component.jsxElements.filter(
          (el) => el.isInteractive && isPrimaryAction(el)
        );

        for (const action of primaryActions) {
          if (isInsideScrollableContainer(action, component)) {
            context.report({
              severity: 'medium',
              confidence: 60,
              message: 'Primary action is inside scrollable container. Users may need to scroll to find it.',
              location: action.location,
              context: {
                buttonText: action.textContent,
                suggestion: 'Use sticky positioning or place primary actions outside scrollable area',
              },
            });
          }
        }
      },
    };
  },
});
