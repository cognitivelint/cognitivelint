import { createRule } from '@cognitivelint/cognitivelint-rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/cognitivelint-parser-react';

const DATA_LIST_PATTERNS = ['datalist', 'datatable', 'datagrid', 'itemlist', 'resourcelist'];
const OWNER_PATTERNS = ['owner', 'author', 'creator', 'createdby', 'avatar', 'assignee'];
const PERSONAL_PATTERNS = ['my', 'mine', 'your', 'personal'];
const SHARED_CONTEXT_PATTERNS = ['team', 'shared', 'workspace', 'org', 'member'];

function isDataListComponent(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();
  return DATA_LIST_PATTERNS.some((p) => tagLower.includes(p));
}

function hasSharedContext(component: ReactComponent): boolean {
  return component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return SHARED_CONTEXT_PATTERNS.some((p) => tagLower.includes(p));
  });
}

function hasOwnershipIndicator(component: ReactComponent): boolean {
  return component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    const hasOwnerElement = OWNER_PATTERNS.some((p) => tagLower.includes(p));

    const hasOwnerAttribute = el.attributes.some((attr) => {
      const nameLower = attr.name.toLowerCase();
      const valueLower = typeof attr.value === 'string' ? attr.value.toLowerCase() : '';
      return (
        OWNER_PATTERNS.some((p) => nameLower.includes(p) || valueLower.includes(p)) ||
        PERSONAL_PATTERNS.some((p) => valueLower.includes(p))
      );
    });

    return hasOwnerElement || hasOwnerAttribute;
  });
}

export const ownershipAmbiguity = createRule({
  meta: {
    id: 'trust-confidence/ownership-ambiguity',
    name: 'Ownership Ambiguity',
    description: 'Lists mixing personal and shared items should indicate ownership',
    category: 'trust-confidence',
    severity: 'high',
    principle: 'Recognition over Recall - Users should know what belongs to them',
    docs: 'https://cognitivelint.dev/rules/trust-confidence/ownership-ambiguity',
  },
  defaultOptions: {},
  create(context) {
    let listElement: JSXElementInfo | null = null;

    return {
      Component(_component: ReactComponent) {
        listElement = null;
      },

      JSXElement(element: JSXElementInfo) {
        if (isDataListComponent(element) && !listElement) {
          listElement = element;
        }
      },

      'Component:exit'(component: ReactComponent) {
        if (listElement && hasSharedContext(component) && !hasOwnershipIndicator(component)) {
          context.report({
            severity: 'medium',
            confidence: 60,
            message: 'Shared data list lacks ownership indicators. Users cannot distinguish their items from others.',
            location: listElement.location,
            context: {
              suggestion: 'Add owner avatars, "Created by" labels, or "Mine" filters',
            },
          });
        }
      },
    };
  },
});
