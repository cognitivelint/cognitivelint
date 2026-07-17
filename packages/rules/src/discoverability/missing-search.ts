import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent } from '@cognitivelint/parser-react';

interface Options {
  minItemsForSearch: number;
}

const DATA_LIST_PATTERNS = ['datalist', 'datatable', 'datagrid', 'itemlist', 'resourcelist'];
const SEARCH_PATTERNS = ['search', 'filter', 'query', 'find'];
const PAGINATION_PATTERNS = ['pagination', 'pager', 'pagenav', 'loadmore'];

function isSearchableDataList(component: ReactComponent): boolean {
  const hasDataList = component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return DATA_LIST_PATTERNS.some((p) => tagLower.includes(p));
  });

  const hasPagination = component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return PAGINATION_PATTERNS.some((p) => tagLower.includes(p));
  });

  return hasDataList && hasPagination;
}

function hasSearchCapability(component: ReactComponent): boolean {
  const hasSearchElement = component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return SEARCH_PATTERNS.some((p) => tagLower.includes(p));
  });

  const hasSearchInput = component.jsxElements.some((el) => {
    return el.attributes.some((attr) => {
      if (attr.name === 'type' && attr.value === 'search') return true;
      if (attr.name === 'role' && attr.value === 'search') return true;
      if (attr.name === 'placeholder' && typeof attr.value === 'string') {
        const val = attr.value;
        return SEARCH_PATTERNS.some((p) => val.toLowerCase().includes(p));
      }
      return false;
    });
  });

  return hasSearchElement || hasSearchInput;
}

export const missingSearch = createRule<Options>({
  meta: {
    id: 'discoverability/missing-search',
    name: 'Missing Search',
    description: 'Large lists should have search capability',
    category: 'discoverability',
    severity: 'medium',
    principle: 'Recognition over Recall (Nielsen Heuristic #6)',
    docs: 'https://cognitivelint.dev/rules/discoverability/missing-search',
    schema: {
      type: 'object',
      properties: {
        minItemsForSearch: { type: 'number', default: 10 },
      },
    },
  },
  defaultOptions: {
    minItemsForSearch: 10,
  },
  create(context) {
    return {
      'Component:exit'(component: ReactComponent) {
        if (isSearchableDataList(component) && !hasSearchCapability(component)) {
          const listElement = component.jsxElements.find((el) => {
            const tagLower = el.tagName.toLowerCase();
            return DATA_LIST_PATTERNS.some((p) => tagLower.includes(p));
          });

          if (listElement) {
            context.report({
              severity: 'medium',
              confidence: 65,
              message: 'Paginated data list lacks search capability. Users cannot quickly find items.',
              location: listElement.location,
              context: {
                suggestion: 'Add a search input to filter list items',
              },
            });
          }
        }
      },
    };
  },
});
