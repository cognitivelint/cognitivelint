import type { Program, Node } from 'typescript';

export type CognitiveCategory =
  | 'cognitive-load'
  | 'trust-confidence'
  | 'feedback'
  | 'discoverability'
  | 'consistency'
  | 'error-prevention';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface RuleMeta {
  id: string;
  name: string;
  description: string;
  category: CognitiveCategory;
  severity: Severity;
  docs?: string;
  principle?: string;
  fixable?: boolean;
  schema?: Record<string, unknown>;
}

export interface SourceLocation {
  file: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface Finding {
  ruleId: string;
  severity: Severity;
  confidence: number;
  category: CognitiveCategory;
  message: string;
  location: SourceLocation;
  fix?: Fix;
  context?: Record<string, unknown>;
}

export interface Fix {
  description: string;
  changes: FixChange[];
}

export interface FixChange {
  file: string;
  range: [number, number];
  text: string;
}

export interface ParserServices {
  program?: Program;
  esTreeNodeToTSNodeMap?: WeakMap<object, Node>;
  tsNodeToESTreeNodeMap?: WeakMap<Node, object>;
}

export interface RuleContext<TOptions = unknown> {
  report(finding: Omit<Finding, 'ruleId' | 'category'>): void;
  getSourceCode(): string;
  getFilename(): string;
  options: TOptions;
  parserServices: ParserServices;
}

export interface Rule<TOptions = unknown> {
  meta: RuleMeta;
  create(context: RuleContext<TOptions>): RuleVisitor;
  defaultOptions?: TOptions | undefined;
}

export type RuleVisitor = Record<string, ((node: never) => void) | undefined>;
