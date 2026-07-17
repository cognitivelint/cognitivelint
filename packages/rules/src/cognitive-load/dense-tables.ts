import { createRule } from '@cognitivelint/cognitivelint-rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/cognitivelint-parser-react';

interface Options {
  maxColumns: number;
}

function isTableColumn(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();
  return (
    tagLower === 'th' ||
    tagLower.includes('column') ||
    tagLower.includes('tableheader')
  );
}

function countTableColumns(component: ReactComponent): number {
  const thElements = component.jsxElements.filter(
    (el) => el.tagName.toLowerCase() === 'th'
  );

  if (thElements.length > 0) {
    return thElements.length;
  }

  const columnElements = component.jsxElements.filter(isTableColumn);
  return columnElements.length;
}

export const denseTables = createRule<Options>({
  meta: {
    id: 'cognitive-load/dense-tables',
    name: 'Dense Tables',
    description: 'Tables with too many columns overwhelm users',
    category: 'cognitive-load',
    severity: 'medium',
    principle: 'Information Density - Excessive data causes cognitive overload',
    docs: 'https://cognitivelint.dev/rules/cognitive-load/dense-tables',
    schema: {
      type: 'object',
      properties: {
        maxColumns: { type: 'number', default: 12 },
      },
    },
  },
  defaultOptions: {
    maxColumns: 12,
  },
  create(context) {
    return {
      'Component:exit'(component: ReactComponent) {
        const hasTable = component.jsxElements.some(
          (el) => el.tagName.toLowerCase() === 'table'
        );

        if (!hasTable) return;

        const columnCount = countTableColumns(component);
        const max = context.options.maxColumns;

        if (columnCount > max) {
          const tableElement = component.jsxElements.find(
            (el) => el.tagName.toLowerCase() === 'table'
          );

          if (tableElement) {
            context.report({
              severity: columnCount > 15 ? 'high' : 'medium',
              confidence: 90,
              message: `Table has ${columnCount} columns. Users struggle to scan dense data.`,
              location: tableElement.location,
              context: {
                columnCount,
                maxRecommended: max,
                suggestion: 'Hide less important columns behind a column picker or use horizontal scrolling',
              },
            });
          }
        }
      },
    };
  },
});
