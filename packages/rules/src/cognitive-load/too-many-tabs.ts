import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/parser-react';

interface Options {
  maxTabs: number;
}

const TAB_CONTAINER_PATTERNS = [
  'tabs',
  'tablist',
  'tabpanels',
  'tabcontent',
  'tabgroup',
];

function isTabNavItem(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();

  if (TAB_CONTAINER_PATTERNS.includes(tagLower)) {
    return false;
  }

  // Avoid datatable, table, tablet, tabindex false positives
  if (tagLower.includes('table') || tagLower.includes('tabindex') || tagLower.includes('tabpanel')) {
    return false;
  }

  return (
    tagLower === 'tab' ||
    tagLower.endsWith('tab') ||
    tagLower.includes('tabtitle') ||
    tagLower.includes('tabnav')
  );
}

function countTabs(component: ReactComponent): number {
  return component.jsxElements.filter(isTabNavItem).length;
}

export const tooManyTabs = createRule<Options>({
  meta: {
    id: 'cognitive-load/too-many-tabs',
    name: 'Too Many Tabs',
    description: 'Too many top-level tabs create navigation overload',
    category: 'cognitive-load',
    severity: 'medium',
    principle: "Hick's Law - Decision time increases with number of choices",
    docs: 'https://cognitivelint.dev/rules/cognitive-load/too-many-tabs',
    schema: {
      type: 'object',
      properties: {
        maxTabs: { type: 'number', default: 6 },
      },
    },
  },
  defaultOptions: {
    maxTabs: 6,
  },
  create(context) {
    return {
      'Component:exit'(component: ReactComponent) {
        const tabCount = countTabs(component);
        const max = context.options.maxTabs;

        if (tabCount > max) {
          const firstTab = component.jsxElements.find(isTabNavItem);
          if (firstTab) {
            context.report({
              severity: tabCount > 10 ? 'high' : 'medium',
              confidence: 75,
              message: `${tabCount} navigation tabs detected. Users struggle to find the right section.`,
              location: firstTab.location,
              context: {
                tabCount,
                maxRecommended: max,
                suggestion:
                  'Reduce top-level tabs, group related items, or use nested navigation',
              },
            });
          }
        }
      },
    };
  },
});
