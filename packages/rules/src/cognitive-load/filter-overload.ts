import { createRule } from '@cognitivelint/cognitivelint-rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/cognitivelint-parser-react';

interface Options {
  maxFilters: number;
}

const FILTER_PATTERNS = ['filter', 'facet', 'refinement', 'criteria'];

function isFilterElement(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();

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
        maxFilters: { type: 'number', default: 8 },
      },
    },
  },
  defaultOptions: {
    maxFilters: 8,
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
              severity: filterCount > 12 ? 'high' : 'medium',
              confidence: 80,
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
