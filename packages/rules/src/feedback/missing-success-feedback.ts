import { createRule } from '@cognitivelint/cognitivelint-rule-engine';
import type { AsyncOperation } from '@cognitivelint/cognitivelint-parser-react';

export const missingSuccessFeedback = createRule({
  meta: {
    id: 'feedback/missing-success-feedback',
    name: 'Missing Success Feedback',
    description: 'Mutations should provide success feedback to users',
    category: 'feedback',
    severity: 'medium',
    principle: 'System Status Visibility (Nielsen Heuristic #1)',
    docs: 'https://cognitivelint.dev/rules/feedback/missing-success-feedback',
  },
  defaultOptions: {},
  create(context) {
    return {
      AsyncOperation(op: AsyncOperation) {
        const isMutationHook = op.type === 'mutation' && op.name === 'useMutation';
        if (isMutationHook && !op.hasSuccessFeedback) {
          context.report({
            severity: 'medium',
            confidence: 80,
            message: 'Mutation lacks success feedback. Users cannot confirm their action completed.',
            location: op.location,
            context: {
              operationType: op.type,
              suggestion: 'Add a toast, notification, or visual confirmation after successful mutation',
            },
          });
        }
      },
    };
  },
});
