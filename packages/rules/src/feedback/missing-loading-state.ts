import { createRule } from '@cognitivelint/cognitivelint-rule-engine';
import type { AsyncOperation, ReactComponent } from '@cognitivelint/cognitivelint-parser-react';

export const missingLoadingState = createRule({
  meta: {
    id: 'feedback/missing-loading-state',
    name: 'Missing Loading State',
    description: 'User-triggered async operations should display loading feedback',
    category: 'feedback',
    severity: 'high',
    principle: 'System Status Visibility (Nielsen Heuristic #1)',
    docs: 'https://cognitivelint.dev/rules/feedback/missing-loading-state',
  },
  defaultOptions: {},
  create(context) {
    let hasInteractiveElement = false;

    return {
      Component(_component: ReactComponent) {
        hasInteractiveElement = false;
      },

      Button() {
        hasInteractiveElement = true;
      },

      Form() {
        hasInteractiveElement = true;
      },

      AsyncOperation(op: AsyncOperation) {
        if (op.type === 'fetch' && !op.hasLoadingState && hasInteractiveElement) {
          context.report({
            severity: 'high',
            confidence: 75,
            message: `Async fetch operation lacks loading feedback. Users cannot tell if the action is in progress.`,
            location: op.location,
            context: {
              operationType: op.type,
              suggestion: 'Add a loading spinner, skeleton, or progress indicator',
            },
          });
        }
      },
    };
  },
});
