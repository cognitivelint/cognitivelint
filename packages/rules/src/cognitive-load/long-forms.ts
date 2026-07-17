import { createRule } from '@dkoul/cognitivelint-rule-engine';
import type { ReactComponent, JSXElementInfo } from '@dkoul/cognitivelint-parser-react';

interface Options {
  maxFields: number;
}

const INPUT_TAGS = ['input', 'textarea', 'select'];
const FIELDSET_PATTERNS = ['fieldset', 'formgroup', 'formsection', 'formfield'];

function isInputElement(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();
  return (
    INPUT_TAGS.includes(tagLower) ||
    tagLower.includes('input') ||
    tagLower.includes('field') ||
    tagLower.includes('select') ||
    tagLower.includes('picker') ||
    tagLower.includes('dropdown')
  );
}

function hasFieldGrouping(component: ReactComponent): boolean {
  return component.jsxElements.some((el) => {
    const tagLower = el.tagName.toLowerCase();
    return FIELDSET_PATTERNS.some((p) => tagLower.includes(p));
  });
}

export const longForms = createRule<Options>({
  meta: {
    id: 'cognitive-load/long-forms',
    name: 'Long Forms Without Grouping',
    description: 'Forms with many fields should be grouped or split into steps',
    category: 'cognitive-load',
    severity: 'medium',
    principle: "Miller's Law - Humans can hold 7±2 items in working memory",
    docs: 'https://cognitivelint.dev/rules/cognitive-load/long-forms',
    schema: {
      type: 'object',
      properties: {
        maxFields: { type: 'number', default: 8 },
      },
    },
  },
  defaultOptions: {
    maxFields: 8,
  },
  create(context) {
    let formElement: JSXElementInfo | null = null;
    let inputCount = 0;

    return {
      Component(_component: ReactComponent) {
        formElement = null;
        inputCount = 0;
      },

      Form(element: JSXElementInfo) {
        if (!formElement) {
          formElement = element;
        }
      },

      JSXElement(element: JSXElementInfo) {
        if (isInputElement(element)) {
          inputCount++;
        }
      },

      'Component:exit'(component: ReactComponent) {
        const max = context.options.maxFields;
        if (formElement && inputCount > max && !hasFieldGrouping(component)) {
          context.report({
            severity: inputCount > 12 ? 'high' : 'medium',
            confidence: 85,
            message: `Form has ${inputCount} fields without grouping. Users face cognitive overload.`,
            location: formElement.location,
            context: {
              fieldCount: inputCount,
              maxRecommended: max,
              suggestion: 'Group related fields with fieldsets or split into multi-step wizard',
            },
          });
        }
      },
    };
  },
});
