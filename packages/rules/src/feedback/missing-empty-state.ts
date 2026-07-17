import { createRule } from '@cognitivelint/cognitivelint-rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/cognitivelint-parser-react';

const DATA_LIST_PATTERNS = ['datalist', 'datatable', 'datagrid', 'itemlist', 'resourcelist', 'resultlist'];
const EMPTY_PATTERNS = ['empty', 'nodata', 'noresults', 'placeholder', 'emptystate', 'zeroresults'];

function isDataListComponent(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();
  return DATA_LIST_PATTERNS.some((p) => tagLower.includes(p));
}

function hasDynamicData(component: ReactComponent): boolean {
  return component.jsxElements.some((el) => {
    return el.attributes.some((attr) => {
      const nameLower = attr.name.toLowerCase();
      return nameLower === 'data' || nameLower === 'items' || nameLower === 'rows';
    });
  });
}

function hasEmptyState(component: ReactComponent): boolean {
  const hasEmptyConditional = component.conditionals.some((c) => {
    const condLower = c.condition.toLowerCase();
    return (
      condLower.includes('length') ||
      condLower.includes('empty') ||
      condLower.includes('count') ||
      condLower.includes('size')
    );
  });

  const hasEmptyElement = component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return EMPTY_PATTERNS.some((p) => tagLower.includes(p));
  });

  return hasEmptyConditional || hasEmptyElement;
}

export const missingEmptyState = createRule({
  meta: {
    id: 'feedback/missing-empty-state',
    name: 'Missing Empty State',
    description: 'Lists and tables should display an empty state when no data is available',
    category: 'feedback',
    severity: 'medium',
    principle: 'System Status Visibility (Nielsen Heuristic #1)',
    docs: 'https://cognitivelint.dev/rules/feedback/missing-empty-state',
  },
  defaultOptions: {},
  create(context) {
    let hasListElement = false;
    let listElement: JSXElementInfo | null = null;

    return {
      Component(_component: ReactComponent) {
        hasListElement = false;
        listElement = null;
      },

      JSXElement(element: JSXElementInfo) {
        if (isDataListComponent(element) && !hasListElement) {
          hasListElement = true;
          listElement = element;
        }
      },

      'Component:exit'(component: ReactComponent) {
        if (hasListElement && listElement && hasDynamicData(component) && !hasEmptyState(component)) {
          context.report({
            severity: 'medium',
            confidence: 70,
            message: `Data list component lacks empty state handling. Users see nothing when data is unavailable.`,
            location: listElement.location,
            context: {
              element: listElement.tagName,
              suggestion: 'Add an empty state component or conditional rendering for empty data',
            },
          });
        }
      },
    };
  },
});
