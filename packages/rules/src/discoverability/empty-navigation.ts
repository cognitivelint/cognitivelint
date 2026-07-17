import { createRule } from '@dkoul/cognitivelint-rule-engine';
import type { ReactComponent, JSXElementInfo } from '@dkoul/cognitivelint-parser-react';

const NAV_PATTERNS = ['nav', 'sidebar', 'menu', 'navigation'];
const LINK_PATTERNS = ['link', 'navlink', 'menuitem'];

function isNavigationElement(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();
  return (
    tagLower === 'nav' ||
    NAV_PATTERNS.some((p) => tagLower.includes(p)) ||
    element.attributes.some((attr) => attr.name === 'role' && attr.value === 'navigation')
  );
}

function isNavigationLink(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();
  return (
    tagLower === 'a' ||
    LINK_PATTERNS.some((p) => tagLower.includes(p)) ||
    element.attributes.some((attr) => attr.name === 'href' || attr.name === 'to')
  );
}

function hasValidDestination(element: JSXElementInfo): boolean {
  const href = element.attributes.find((attr) => attr.name === 'href' || attr.name === 'to');
  if (!href) return true;
  if (href.value === null) return true;

  if (href.isExpression) return true;

  const value = String(href.value);
  return value !== '#' && value !== '' && value !== 'javascript:void(0)';
}

export const emptyNavigation = createRule({
  meta: {
    id: 'discoverability/empty-navigation',
    name: 'Empty Navigation',
    description: 'Navigation items should lead to valid destinations',
    category: 'discoverability',
    severity: 'medium',
    principle: 'Match Between System and Real World - Links should go somewhere',
    docs: 'https://cognitivelint.dev/rules/discoverability/empty-navigation',
  },
  defaultOptions: {},
  create(context) {
    let inNavigation = false;

    return {
      JSXElement(element: JSXElementInfo) {
        if (isNavigationElement(element)) {
          inNavigation = true;
        }

        if (inNavigation && isNavigationLink(element) && !hasValidDestination(element)) {
          context.report({
            severity: 'medium',
            confidence: 85,
            message: 'Navigation link has no valid destination. Users encounter dead ends.',
            location: element.location,
            context: {
              linkText: element.textContent,
              suggestion: 'Provide a valid href/to destination or remove placeholder links',
            },
          });
        }
      },

      'Component:exit'(_component: ReactComponent) {
        inNavigation = false;
      },
    };
  },
});
