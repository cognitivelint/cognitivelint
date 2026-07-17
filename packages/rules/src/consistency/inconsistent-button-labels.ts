import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent, JSXElementInfo } from '@cognitivelint/parser-react';

const SAVE_VARIANTS = ['save', 'submit', 'apply', 'update', 'confirm'];
const CANCEL_VARIANTS = ['cancel', 'close', 'dismiss', 'back', 'nevermind'];
const DELETE_VARIANTS = ['delete', 'remove', 'destroy', 'erase', 'trash'];

function getBaseLabel(text: string): string {
  return text.toLowerCase().trim().split(/\s+/)[0];
}

function categorizeButtonLabel(text: string): { category: string; base: string } | null {
  const lower = text.toLowerCase().trim();
  const base = getBaseLabel(text);

  for (const v of SAVE_VARIANTS) {
    if (lower === v || base === v) return { category: 'save', base: v };
  }
  for (const v of CANCEL_VARIANTS) {
    if (lower === v || base === v) return { category: 'cancel', base: v };
  }
  for (const v of DELETE_VARIANTS) {
    if (lower === v || base === v) return { category: 'delete', base: v };
  }

  return null;
}

function findInconsistencies(buttons: JSXElementInfo[]): Map<string, string[]> {
  const categories = new Map<string, Set<string>>();

  for (const button of buttons) {
    const text = button.textContent;
    if (!text) continue;

    const result = categorizeButtonLabel(text);
    if (result) {
      const existing = categories.get(result.category) ?? new Set<string>();
      existing.add(result.base);
      categories.set(result.category, existing);
    }
  }

  const inconsistent = new Map<string, string[]>();
  for (const [category, bases] of categories) {
    if (bases.size > 1) {
      inconsistent.set(category, Array.from(bases));
    }
  }

  return inconsistent;
}

export const inconsistentButtonLabels = createRule({
  meta: {
    id: 'consistency/inconsistent-button-labels',
    name: 'Inconsistent Button Labels',
    description: 'Similar actions should use consistent terminology',
    category: 'consistency',
    severity: 'low',
    principle: 'Consistency and Standards (Nielsen Heuristic #4)',
    docs: 'https://cognitivelint.dev/rules/consistency/inconsistent-button-labels',
  },
  defaultOptions: {},
  create(context) {
    const buttons: JSXElementInfo[] = [];

    return {
      Component(_component: ReactComponent) {
        buttons.length = 0;
      },

      Button(element: JSXElementInfo) {
        if (element.textContent) {
          buttons.push(element);
        }
      },

      'Component:exit'(_component: ReactComponent) {
        const inconsistencies = findInconsistencies(buttons);

        for (const [category, bases] of inconsistencies) {
          const firstButton = buttons.find((b) => {
            if (!b.textContent) return false;
            const result = categorizeButtonLabel(b.textContent);
            return result?.category === category;
          });

          if (firstButton) {
            context.report({
              severity: 'low',
              confidence: 80,
              message: `Inconsistent "${category}" action labels: ${bases.map((l) => `"${l}"`).join(', ')}. Users may be confused by different terms for the same action.`,
              location: firstButton.location,
              context: {
                category,
                variants: bases,
                suggestion: `Standardize on one term (e.g., "${bases[0]}") across the application`,
              },
            });
          }
        }
      },
    };
  },
});
