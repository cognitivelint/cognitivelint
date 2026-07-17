import type {
  Rule,
  Finding,
  RuleContext,
  ParserServices,
} from '@cognitivelint/cognitivelint-core';
import type {
  ReactComponent,
  JSXElementInfo,
  AsyncOperation,
  ConditionalRender,
} from '@cognitivelint/cognitivelint-parser-react';

export interface EngineOptions {
  rules: Rule[];
  parserServices?: ParserServices;
}

export interface CognitiveVisitor {
  Component?(component: ReactComponent): void;
  'Component:exit'?(component: ReactComponent): void;
  JSXElement?(element: JSXElementInfo): void;
  Button?(element: JSXElementInfo): void;
  Form?(element: JSXElementInfo): void;
  Input?(element: JSXElementInfo): void;
  List?(element: JSXElementInfo): void;
  AsyncOperation?(op: AsyncOperation): void;
  ConditionalRender?(cond: ConditionalRender): void;
}

const BUTTON_PATTERNS = ['button', 'btn', 'iconbutton', 'linkbutton', 'submitbutton'];

function isButtonLike(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();
  if (tagLower === 'button') return true;
  if (BUTTON_PATTERNS.some((p) => tagLower.includes(p))) return true;
  if (
    element.attributes.some(
      (a) => a.name === 'type' && (a.value === 'button' || a.value === 'submit')
    )
  )
    return true;
  if (element.attributes.some((a) => a.name === 'onClick' || a.name === 'onPress'))
    return true;
  return false;
}

function isFormLike(element: JSXElementInfo): boolean {
  return element.tagName.toLowerCase() === 'form';
}

function isInputLike(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();
  return ['input', 'textarea', 'select'].includes(tagLower);
}

function isListLike(element: JSXElementInfo): boolean {
  const tagLower = element.tagName.toLowerCase();
  return (
    ['ul', 'ol', 'dl'].includes(tagLower) ||
    tagLower.includes('list') ||
    tagLower.includes('table')
  );
}

export class RuleEngine {
  private rules: Map<string, Rule> = new Map();
  private parserServices: ParserServices;

  constructor(options: EngineOptions) {
    for (const rule of options.rules) {
      this.rules.set(rule.meta.id, rule);
    }
    this.parserServices = options.parserServices ?? {};
  }

  analyze(
    filePath: string,
    sourceCode: string,
    components: ReactComponent[]
  ): Finding[] {
    const findings: Finding[] = [];

    for (const [_ruleId, rule] of this.rules) {
      const context = this.createContext(rule, filePath, sourceCode, findings);
      const visitor = rule.create(context) as CognitiveVisitor;

      for (const component of components) {
        this.traverseComponent(component, visitor);
      }
    }

    return findings;
  }

  private createContext(
    rule: Rule,
    filePath: string,
    sourceCode: string,
    findings: Finding[]
  ): RuleContext {
    return {
      report: (finding) => {
        findings.push({
          ...finding,
          ruleId: rule.meta.id,
          category: rule.meta.category,
        });
      },
      getSourceCode: () => sourceCode,
      getFilename: () => filePath,
      options: rule.defaultOptions ?? {},
      parserServices: this.parserServices,
    };
  }

  private traverseComponent(
    component: ReactComponent,
    visitor: CognitiveVisitor
  ): void {
    visitor.Component?.(component);

    for (const element of component.jsxElements) {
      visitor.JSXElement?.(element);

      if (isButtonLike(element)) {
        visitor.Button?.(element);
      }
      if (isFormLike(element)) {
        visitor.Form?.(element);
      }
      if (isInputLike(element)) {
        visitor.Input?.(element);
      }
      if (isListLike(element)) {
        visitor.List?.(element);
      }
    }

    for (const asyncOp of component.asyncOperations) {
      visitor.AsyncOperation?.(asyncOp);
    }

    for (const conditional of component.conditionals) {
      visitor.ConditionalRender?.(conditional);
    }

    visitor['Component:exit']?.(component);
  }
}
