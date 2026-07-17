import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/parser-react';

const MODAL_TYPES = {
  modal: ['modal'],
  dialog: ['dialog', 'alertdialog'],
  drawer: ['drawer', 'sheet', 'sidepanel'],
  popup: ['popup', 'popover', 'tooltip'],
  overlay: ['overlay'],
};

function getModalType(element: JSXElementInfo): string | null {
  const tagLower = element.tagName.toLowerCase();

  const roleAttr = element.attributes.find((attr) => attr.name === 'role');
  const roleValue = typeof roleAttr?.value === 'string' ? roleAttr.value.toLowerCase() : '';

  for (const [type, patterns] of Object.entries(MODAL_TYPES)) {
    if (patterns.some((p) => tagLower.includes(p) || roleValue.includes(p))) {
      return type;
    }
  }

  return null;
}

function findActualNestedModals(component: ReactComponent): { outer: JSXElementInfo; inner: JSXElementInfo } | null {
  const modalElements = component.jsxElements.filter((el) => getModalType(el) !== null);

  for (const inner of modalElements) {
    if (!inner.parent) continue;

    const parentLower = inner.parent.toLowerCase();
    const innerType = getModalType(inner);

    for (const outer of modalElements) {
      if (outer === inner) continue;

      const outerType = getModalType(outer);
      const outerLower = outer.tagName.toLowerCase();

      if (parentLower === outerLower && innerType === outerType) {
        return { outer, inner };
      }
    }
  }

  return null;
}

export const modalNesting = createRule({
  meta: {
    id: 'error-prevention/modal-nesting',
    name: 'Modal Nesting',
    description: 'Modals should not be nested inside other modals',
    category: 'error-prevention',
    severity: 'high',
    principle: 'Aesthetic and Minimalist Design - Avoid unnecessary complexity',
    docs: 'https://cognitivelint.dev/rules/error-prevention/modal-nesting',
  },
  defaultOptions: {},
  create(context) {
    return {
      'Component:exit'(component: ReactComponent) {
        const nested = findActualNestedModals(component);

        if (nested) {
          const modalType = getModalType(nested.inner) ?? 'modal';
          context.report({
            severity: 'high',
            confidence: 85,
            message: `Nested ${modalType} detected inside another ${modalType}. This confuses users.`,
            location: nested.inner.location,
            context: {
              outerElement: nested.outer.tagName,
              innerElement: nested.inner.tagName,
              suggestion: 'Replace nested modals with inline content or navigation',
            },
          });
        }
      },
    };
  },
});
