import { parse } from '@typescript-eslint/parser';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import type { SourceLocation } from '@dkoul/cognitivelint-core';
import type {
  ReactComponent,
  JSXElementInfo,
  JSXAttribute,
  AsyncOperation,
  ConditionalRender,
  HookUsage,
  ParsedFile,
  ImportInfo,
} from './types.js';

export interface ParseOptions {
  filePath: string;
  sourceCode: string;
  tsConfigPath?: string;
}

function toSourceLocation(
  node: TSESTree.Node,
  filePath: string
): SourceLocation {
  return {
    file: filePath,
    startLine: node.loc.start.line,
    startColumn: node.loc.start.column,
    endLine: node.loc.end.line,
    endColumn: node.loc.end.column,
  };
}

function isReactComponent(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return containsJSX(node);
  }
  return false;
}

const SKIP_KEYS = new Set(['parent', 'loc', 'range', 'tokens', 'comments']);

function containsJSX(node: TSESTree.Node): boolean {
  let hasJSX = false;

  function traverse(n: TSESTree.Node) {
    if (hasJSX) return;
    if (
      n.type === AST_NODE_TYPES.JSXElement ||
      n.type === AST_NODE_TYPES.JSXFragment
    ) {
      hasJSX = true;
      return;
    }
    for (const key of Object.keys(n) as (keyof typeof n)[]) {
      if (SKIP_KEYS.has(key)) continue;
      const value = n[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              traverse(item as TSESTree.Node);
            }
          }
        } else if ('type' in value) {
          traverse(value as TSESTree.Node);
        }
      }
    }
  }

  traverse(node);
  return hasJSX;
}

function getComponentName(
  node:
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression,
  parent?: TSESTree.Node
): string {
  if (node.type === AST_NODE_TYPES.FunctionDeclaration && node.id) {
    return node.id.name;
  }

  if (
    parent &&
    parent.type === AST_NODE_TYPES.VariableDeclarator &&
    parent.id.type === AST_NODE_TYPES.Identifier
  ) {
    return parent.id.name;
  }

  return 'AnonymousComponent';
}

function extractJSXElements(
  node: TSESTree.Node,
  filePath: string,
  parentName?: string,
  isConditional = false
): JSXElementInfo[] {
  const elements: JSXElementInfo[] = [];
  const visited = new WeakSet<object>();

  function traverse(n: TSESTree.Node, inConditional: boolean, parent?: string) {
    if (visited.has(n)) return;
    visited.add(n);

    if (n.type === AST_NODE_TYPES.JSXElement) {
      const element = extractSingleJSXElement(
        n,
        filePath,
        parent,
        inConditional
      );
      elements.push(element);

      for (const child of n.children) {
        if (child.type === AST_NODE_TYPES.JSXElement) {
          traverse(child, inConditional, element.tagName);
        } else if (child.type === AST_NODE_TYPES.JSXExpressionContainer) {
          traverse(child.expression, true, element.tagName);
        }
      }
      return;
    }

    if (n.type === AST_NODE_TYPES.ConditionalExpression) {
      traverse(n.test, true, parent);
      traverse(n.consequent, true, parent);
      traverse(n.alternate, true, parent);
      return;
    }

    if (n.type === AST_NODE_TYPES.LogicalExpression) {
      traverse(n.left, true, parent);
      traverse(n.right, true, parent);
      return;
    }

    for (const key of Object.keys(n) as (keyof typeof n)[]) {
      if (SKIP_KEYS.has(key)) continue;
      const value = n[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              traverse(item as TSESTree.Node, inConditional, parent);
            }
          }
        } else if ('type' in value) {
          traverse(value as TSESTree.Node, inConditional, parent);
        }
      }
    }
  }

  traverse(node, isConditional, parentName);
  return elements;
}

function extractSingleJSXElement(
  node: TSESTree.JSXElement,
  filePath: string,
  parent?: string,
  isConditional = false
): JSXElementInfo {
  const opening = node.openingElement;
  let tagName = 'unknown';

  if (opening.name.type === AST_NODE_TYPES.JSXIdentifier) {
    tagName = opening.name.name;
  } else if (opening.name.type === AST_NODE_TYPES.JSXMemberExpression) {
    tagName = extractMemberExpressionName(opening.name);
  }

  const isComponent = tagName[0] === tagName[0].toUpperCase();
  const attributes = extractJSXAttributes(opening.attributes);

  const isDisabled = attributes.some(
    (attr) =>
      attr.name === 'disabled' && (attr.value === true || attr.value === 'true')
  );

  const isInteractive =
    attributes.some((attr) =>
      ['onClick', 'onSubmit', 'onPress', 'href', 'to'].includes(attr.name)
    ) ||
    ['button', 'a', 'input', 'select', 'textarea'].includes(
      tagName.toLowerCase()
    ) ||
    tagName.toLowerCase().includes('button') ||
    tagName.toLowerCase().includes('link');

  const textContent = extractTextContent(node);

  return {
    tagName,
    isComponent,
    attributes,
    childCount: node.children.length,
    location: toSourceLocation(node, filePath),
    parent,
    isConditional,
    isDisabled,
    isInteractive,
    textContent,
  };
}

function extractMemberExpressionName(
  node: TSESTree.JSXMemberExpression
): string {
  const parts: string[] = [];
  let current: TSESTree.JSXTagNameExpression = node;

  while (current.type === AST_NODE_TYPES.JSXMemberExpression) {
    if (current.property.type === AST_NODE_TYPES.JSXIdentifier) {
      parts.unshift(current.property.name);
    }
    current = current.object;
  }

  if (current.type === AST_NODE_TYPES.JSXIdentifier) {
    parts.unshift(current.name);
  }

  return parts.join('.');
}

function extractJSXAttributes(
  attributes: TSESTree.JSXOpeningElement['attributes']
): JSXAttribute[] {
  const result: JSXAttribute[] = [];

  for (const attr of attributes) {
    if (attr.type === AST_NODE_TYPES.JSXAttribute) {
      const name =
        attr.name.type === AST_NODE_TYPES.JSXIdentifier
          ? attr.name.name
          : String(attr.name.name);

      let value: string | boolean | null = null;
      let isExpression = false;

      if (attr.value === null) {
        value = true;
      } else if (attr.value.type === AST_NODE_TYPES.Literal) {
        value = String(attr.value.value);
      } else if (attr.value.type === AST_NODE_TYPES.JSXExpressionContainer) {
        isExpression = true;
        if (attr.value.expression.type === AST_NODE_TYPES.Literal) {
          value = String(attr.value.expression.value);
        } else if (attr.value.expression.type === AST_NODE_TYPES.Identifier) {
          value = attr.value.expression.name;
        } else {
          value = '[expression]';
        }
      }

      result.push({ name, value, isExpression });
    } else if (attr.type === AST_NODE_TYPES.JSXSpreadAttribute) {
      result.push({ name: '...spread', value: '[spread]', isExpression: true });
    }
  }

  return result;
}

function extractTextContent(node: TSESTree.JSXElement): string | undefined {
  const textParts: string[] = [];

  for (const child of node.children) {
    if (child.type === AST_NODE_TYPES.JSXText) {
      const text = child.value.trim();
      if (text) textParts.push(text);
    }
  }

  return textParts.length > 0 ? textParts.join(' ') : undefined;
}

function extractHooks(node: TSESTree.Node, filePath: string): HookUsage[] {
  const hooks: HookUsage[] = [];

  function traverse(n: TSESTree.Node) {
    if (n.type === AST_NODE_TYPES.CallExpression) {
      const callee = n.callee;
      if (
        callee.type === AST_NODE_TYPES.Identifier &&
        callee.name.startsWith('use')
      ) {
        hooks.push({
          name: callee.name,
          location: toSourceLocation(n, filePath),
        });
      }
    }

    for (const key of Object.keys(n) as (keyof typeof n)[]) {
      if (SKIP_KEYS.has(key)) continue;
      const value = n[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              traverse(item as TSESTree.Node);
            }
          }
        } else if ('type' in value) {
          traverse(value as TSESTree.Node);
        }
      }
    }
  }

  traverse(node);
  return hooks;
}

function extractAsyncOperations(
  node: TSESTree.Node,
  filePath: string,
  hooks: HookUsage[]
): AsyncOperation[] {
  const operations: AsyncOperation[] = [];
  const hookNames = hooks.map((h) => h.name);

  const hasLoadingHook =
    hookNames.includes('useState') &&
    containsLoadingPattern(node, 'isLoading') ||
    containsLoadingPattern(node, 'loading') ||
    containsLoadingPattern(node, 'isPending');

  function traverse(n: TSESTree.Node) {
    if (n.type === AST_NODE_TYPES.CallExpression) {
      const callee = n.callee;
      let opType: AsyncOperation['type'] | null = null;
      let opName: string | undefined;

      if (callee.type === AST_NODE_TYPES.Identifier) {
        const name = callee.name;
        if (name === 'fetch') {
          opType = 'fetch';
        } else if (name === 'useMutation') {
          opType = 'mutation';
        } else if (name === 'useQuery' || name === 'useSWR') {
          opType = 'query';
        }
        opName = name;
      } else if (callee.type === AST_NODE_TYPES.MemberExpression) {
        if (callee.property.type === AST_NODE_TYPES.Identifier) {
          const propName = callee.property.name;
          if (propName === 'mutate' || propName === 'mutateAsync') {
            opType = 'mutation';
            opName = propName;
          }
        }
      }

      if (opType) {
        operations.push({
          type: opType,
          name: opName,
          hasLoadingState:
            hasLoadingHook || opType === 'query' || opType === 'mutation',
          hasErrorHandling: containsErrorHandling(node),
          hasSuccessFeedback: containsSuccessFeedback(node),
          location: toSourceLocation(n, filePath),
        });
      }
    }

    if (n.type === AST_NODE_TYPES.AwaitExpression) {
      operations.push({
        type: 'promise',
        hasLoadingState: hasLoadingHook,
        hasErrorHandling: isInsideTryCatch(n),
        hasSuccessFeedback: false,
        location: toSourceLocation(n, filePath),
      });
    }

    for (const key of Object.keys(n) as (keyof typeof n)[]) {
      if (SKIP_KEYS.has(key)) continue;
      const value = n[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              traverse(item as TSESTree.Node);
            }
          }
        } else if ('type' in value) {
          traverse(value as TSESTree.Node);
        }
      }
    }
  }

  traverse(node);
  return operations;
}

function containsLoadingPattern(node: TSESTree.Node, pattern: string): boolean {
  const code = JSON.stringify(node);
  return code.toLowerCase().includes(pattern.toLowerCase());
}

function containsErrorHandling(node: TSESTree.Node): boolean {
  let hasError = false;

  function traverse(n: TSESTree.Node) {
    if (hasError) return;
    if (
      n.type === AST_NODE_TYPES.TryStatement ||
      n.type === AST_NODE_TYPES.CatchClause
    ) {
      hasError = true;
      return;
    }
    if (n.type === AST_NODE_TYPES.CallExpression) {
      const callee = n.callee;
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        callee.property.name === 'catch'
      ) {
        hasError = true;
        return;
      }
    }

    for (const key of Object.keys(n) as (keyof typeof n)[]) {
      if (SKIP_KEYS.has(key)) continue;
      const value = n[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              traverse(item as TSESTree.Node);
            }
          }
        } else if ('type' in value) {
          traverse(value as TSESTree.Node);
        }
      }
    }
  }

  traverse(node);
  return hasError;
}

function containsSuccessFeedback(node: TSESTree.Node): boolean {
  const code = JSON.stringify(node);
  const patterns = [
    'toast',
    'notification',
    'alert',
    'success',
    'onSuccess',
    'message.success',
  ];
  return patterns.some((p) => code.toLowerCase().includes(p.toLowerCase()));
}

function isInsideTryCatch(_node: TSESTree.Node): boolean {
  return false;
}

function extractConditionals(
  node: TSESTree.Node,
  filePath: string
): ConditionalRender[] {
  const conditionals: ConditionalRender[] = [];

  function traverse(n: TSESTree.Node) {
    if (n.type === AST_NODE_TYPES.ConditionalExpression) {
      conditionals.push({
        type: 'ternary',
        condition: '[conditional]',
        location: toSourceLocation(n, filePath),
      });
    }

    if (n.type === AST_NODE_TYPES.LogicalExpression) {
      if (n.operator === '&&') {
        conditionals.push({
          type: 'logical-and',
          condition: '[logical-and]',
          location: toSourceLocation(n, filePath),
        });
      } else if (n.operator === '||') {
        conditionals.push({
          type: 'logical-or',
          condition: '[logical-or]',
          location: toSourceLocation(n, filePath),
        });
      }
    }

    for (const key of Object.keys(n) as (keyof typeof n)[]) {
      if (SKIP_KEYS.has(key)) continue;
      const value = n[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              traverse(item as TSESTree.Node);
            }
          }
        } else if ('type' in value) {
          traverse(value as TSESTree.Node);
        }
      }
    }
  }

  traverse(node);
  return conditionals;
}

function extractImports(ast: TSESTree.Program): ImportInfo[] {
  const imports: ImportInfo[] = [];

  for (const node of ast.body) {
    if (node.type === AST_NODE_TYPES.ImportDeclaration) {
      const source =
        typeof node.source.value === 'string' ? node.source.value : '';
      const specifiers = node.specifiers.map((s) => {
        if (s.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
          return s.local.name;
        }
        if (s.type === AST_NODE_TYPES.ImportSpecifier) {
          return s.local.name;
        }
        if (s.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
          return `* as ${s.local.name}`;
        }
        return '';
      });

      imports.push({ source, specifiers });
    }
  }

  return imports;
}

export function parseReactFile(options: ParseOptions): ParsedFile {
  const { filePath, sourceCode } = options;

  const ast = parse(sourceCode, {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 'latest',
    sourceType: 'module',
    range: true,
    loc: true,
  });

  const components: ReactComponent[] = [];
  const imports = extractImports(ast);

  function processFunction(
    node:
      | TSESTree.FunctionDeclaration
      | TSESTree.FunctionExpression
      | TSESTree.ArrowFunctionExpression,
    parent?: TSESTree.Node
  ) {
    if (!isReactComponent(node)) return;

    const name = getComponentName(node, parent);
    const hooks = extractHooks(node, filePath);
    const jsxElements = extractJSXElements(node, filePath);
    const asyncOperations = extractAsyncOperations(node, filePath, hooks);
    const conditionals = extractConditionals(node, filePath);

    components.push({
      name,
      type:
        node.type === AST_NODE_TYPES.ArrowFunctionExpression
          ? 'arrow'
          : 'function',
      filePath,
      location: toSourceLocation(node, filePath),
      props: [],
      hooks,
      jsxElements,
      asyncOperations,
      conditionals,
    });
  }

  function traverse(node: TSESTree.Node, parent?: TSESTree.Node) {
    if (
      node.type === AST_NODE_TYPES.FunctionDeclaration ||
      node.type === AST_NODE_TYPES.FunctionExpression ||
      node.type === AST_NODE_TYPES.ArrowFunctionExpression
    ) {
      processFunction(node, parent);
    }

    for (const key of Object.keys(node) as (keyof typeof node)[]) {
      if (SKIP_KEYS.has(key)) continue;
      const value = node[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              traverse(item as TSESTree.Node, node);
            }
          }
        } else if ('type' in value) {
          traverse(value as TSESTree.Node, node);
        }
      }
    }
  }

  traverse(ast);

  return {
    filePath,
    components,
    imports,
  };
}
