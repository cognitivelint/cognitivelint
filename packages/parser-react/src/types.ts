import type { SourceLocation } from '@cognitivelint/cognitivelint-core';

export interface ReactComponent {
  name: string;
  type: 'function' | 'arrow' | 'class';
  filePath: string;
  location: SourceLocation;
  props: PropDefinition[];
  hooks: HookUsage[];
  jsxElements: JSXElementInfo[];
  asyncOperations: AsyncOperation[];
  conditionals: ConditionalRender[];
}

export interface PropDefinition {
  name: string;
  type?: string;
  required: boolean;
  defaultValue?: string;
}

export interface HookUsage {
  name: string;
  location: SourceLocation;
  args?: string[];
}

export interface JSXAttribute {
  name: string;
  value: string | boolean | null;
  isExpression: boolean;
  rawValue?: string | undefined;
}

export interface JSXElementInfo {
  tagName: string;
  isComponent: boolean;
  attributes: JSXAttribute[];
  childCount: number;
  location: SourceLocation;
  parent?: string | undefined;
  isConditional: boolean;
  isDisabled: boolean;
  isInteractive: boolean;
  textContent?: string | undefined;
}

export interface AsyncOperation {
  type: 'fetch' | 'mutation' | 'query' | 'promise' | 'effect';
  name?: string | undefined;
  hasLoadingState: boolean;
  hasErrorHandling: boolean;
  hasSuccessFeedback: boolean;
  location: SourceLocation;
}

export interface ConditionalRender {
  type: 'ternary' | 'logical-and' | 'logical-or' | 'if-statement';
  condition: string;
  location: SourceLocation;
}

export interface ParsedFile {
  filePath: string;
  components: ReactComponent[];
  imports: ImportInfo[];
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
}
