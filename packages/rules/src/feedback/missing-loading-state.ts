import { createRule } from '@cognitivelint/rule-engine';
import type { AsyncOperation, ReactComponent } from '@cognitivelint/parser-react';

export const missingLoadingState = createRule({
  meta: {
    id: 'feedback/missing-loading-state',
    name: 'Missing Loading State',
    description: 'User-triggered async operations should display loading feedback',
    category: 'feedback',
    severity: 'medium',
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
        // Only flag user-triggered fetches; background/data-loading hooks are noisier
        if (op.type === 'fetch' && !op.hasLoadingState && hasInteractiveElement) {
          context.report({
            severity: 'medium',
            confidence: 60,
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
