import { createRule } from '@cognitivelint/rule-engine';
import type { ReactComponent } from '@cognitivelint/parser-react';

const STEP_PATTERNS = ['step', 'wizard', 'stepper', 'multistep', 'workflow'];
const PROGRESS_PATTERNS = ['progress', 'indicator', 'breadcrumb', 'steps', 'stepper'];

function isMultiStepFlow(component: ReactComponent): boolean {
  return component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return STEP_PATTERNS.some((p) => tagLower.includes(p));
  });
}

function hasProgressIndicator(component: ReactComponent): boolean {
  return component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return PROGRESS_PATTERNS.some((p) => tagLower.includes(p));
  });
}

export const noProgressIndicator = createRule({
  meta: {
    id: 'feedback/no-progress-indicator',
    name: 'No Progress Indicator',
    description: 'Multi-step flows should display progress indicators',
    category: 'feedback',
    severity: 'medium',
    principle: 'System Status Visibility (Nielsen Heuristic #1)',
    docs: 'https://cognitivelint.dev/rules/feedback/no-progress-indicator',
  },
  defaultOptions: {},
  create(context) {
    return {
      'Component:exit'(component: ReactComponent) {
        if (isMultiStepFlow(component) && !hasProgressIndicator(component)) {
          const stepElement = component.jsxElements.find((el) =>
            STEP_PATTERNS.some((p) => el.tagName.toLowerCase().includes(p))
          );

          if (stepElement) {
            context.report({
              severity: 'medium',
              confidence: 70,
              message: 'Multi-step flow lacks progress indicator. Users cannot see where they are in the process.',
              location: stepElement.location,
              context: {
                suggestion: 'Add a stepper, progress bar, or breadcrumb showing current step',
              },
            });
          }
        }
      },
    };
  },
});
