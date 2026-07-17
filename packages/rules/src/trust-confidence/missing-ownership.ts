import { createRule } from '@cognitivelint/cognitivelint-rule-engine';
import type { ReactComponent } from '@cognitivelint/cognitivelint-parser-react';

const DATA_LIST_PATTERNS = ['datalist', 'datatable', 'datagrid', 'resourcelist'];
const RBAC_PATTERNS = ['permissioncheck', 'accesscontrol', 'rolecheck', 'canaccess'];
const OWNER_DISPLAY_PATTERNS = ['owner', 'createdby', 'author', 'assignee', 'avatar'];

function hasRBACProtectedDataList(component: ReactComponent): boolean {
  const hasDataList = component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return DATA_LIST_PATTERNS.some((p) => tagLower.includes(p));
  });

  const hasRBAC = component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return RBAC_PATTERNS.some((p) => tagLower.includes(p));
  });

  return hasDataList && hasRBAC;
}

function displaysOwnerMetadata(component: ReactComponent): boolean {
  return component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    const hasOwnerInTag = OWNER_DISPLAY_PATTERNS.some((p) => tagLower.includes(p));

    const hasOwnerProp = el.attributes.some((attr) => {
      const nameLower = attr.name.toLowerCase();
      return OWNER_DISPLAY_PATTERNS.some((p) => nameLower.includes(p));
    });

    return hasOwnerInTag || hasOwnerProp;
  });
}

export const missingOwnership = createRule({
  meta: {
    id: 'trust-confidence/missing-ownership',
    name: 'Missing Ownership Metadata',
    description: 'RBAC-enabled lists should display owner information',
    category: 'trust-confidence',
    severity: 'medium',
    principle: 'Visibility of System Status - Users should understand resource ownership',
    docs: 'https://cognitivelint.dev/rules/trust-confidence/missing-ownership',
  },
  defaultOptions: {},
  create(context) {
    return {
      'Component:exit'(component: ReactComponent) {
        if (hasRBACProtectedDataList(component) && !displaysOwnerMetadata(component)) {
          const dataListElement = component.jsxElements.find((el) => {
            const tagLower = el.tagName.toLowerCase();
            return DATA_LIST_PATTERNS.some((p) => tagLower.includes(p));
          });

          if (dataListElement) {
            context.report({
              severity: 'low',
              confidence: 55,
              message: 'RBAC-protected data list lacks owner metadata. Users cannot see who owns resources.',
              location: dataListElement.location,
              context: {
                suggestion: 'Display owner name, avatar, or "Created by" information',
              },
            });
          }
        }
      },
    };
  },
});
