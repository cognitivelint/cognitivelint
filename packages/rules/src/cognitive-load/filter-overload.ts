import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/parser-react';

interface Options {
  maxFilters: number;
}

const FILTER_PATTERNS = ['filter', 'facet', 'refinement', 'criteria'];
const FILTER_CONTAINER_PATTERNS = [
  'filterbar',
  'filterpanel',
  'filtercontainer',
  'filtersidebar',
  'filtergroup',
  'filterdrawer',
  'filterwrapper',
  'filterlist',
  'morefilter',
  'filtertoolbar',
  'filtersection',
];

function isFilterElement(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();

  // Skip layout containers so a FilterBar wrapping 3 filters isn't counted as 4
  if (FILTER_CONTAINER_PATTERNS.some((p) => tagLower.includes(p))) {
    return false;
  }

  const hasFilterInName = FILTER_PATTERNS.some((p) => tagLower.includes(p));

  const hasFilterRole = element.attributes.some(
    (attr) =>
      (attr.name === 'role' && attr.value === 'filter') ||
      (attr.name === 'data-filter' || attr.name === 'data-facet')
  );

  return hasFilterInName || hasFilterRole;
}

function countFilters(component: ReactComponent): number {
  return component.jsxElements.filter(isFilterElement).length;
}

export const filterOverload = createRule<Options>({
  meta: {
    id: 'cognitive-load/filter-overload',
    name: 'Filter Overload',
    description: 'Too many visible filters overwhelm users',
    category: 'cognitive-load',
    severity: 'medium',
    principle: "Hick's Law - Decision time increases with number of choices",
    docs: 'https://cognitivelint.dev/rules/cognitive-load/filter-overload',
    schema: {
      type: 'object',
      properties: {
        maxFilters: { type: 'number', default: 10 },
      },
    },
  },
  defaultOptions: {
    maxFilters: 10,
  },
  create(context) {
    return {
      'Component:exit'(component: ReactComponent) {
        const filterCount = countFilters(component);
        const max = context.options.maxFilters;

        if (filterCount > max) {
          const firstFilter = component.jsxElements.find(isFilterElement);
          if (firstFilter) {
            context.report({
              severity: filterCount > 15 ? 'high' : 'medium',
              confidence: 70,
              message: `${filterCount} filters visible. Users face decision fatigue.`,
              location: firstFilter.location,
              context: {
                filterCount,
                maxRecommended: max,
                suggestion: 'Collapse less-used filters or add a "More filters" expandable section',
              },
            });
          }
        }
      },
    };
  },
});
