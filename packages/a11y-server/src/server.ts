import {
  analyzeFile,
  applyFixToSource,
  buildContext,
  createGateway,
  formatWhyExplanation,
  generateHeuristicFix,
  validateFix,
  type EnrichedFinding,
  type FixProposal,
  type LmClient,
} from '@cognitivelint/a11y';
import {
  CodeAction,
  CodeActionKind,
  type Connection,
  type Diagnostic,
  DiagnosticSeverity,
  type InitializeParams,
  type InitializeResult,
  TextDocumentSyncKind,
  type CodeActionParams,
  type ExecuteCommandParams,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

const COMMANDS = {
  why: 'cognitivelint.a11y.why',
  /** @deprecated kept for palette compatibility — same as why */
  explain: 'cognitivelint.a11y.explain',
  fix: 'cognitivelint.a11y.fix',
  applyFix: 'cognitivelint.a11y.applyFix',
  ignore: 'cognitivelint.a11y.ignore',
} as const;

/** Custom LSP request handled by the VS Code / Cursor extension via vscode.lm */
export const EDITOR_LM_REQUEST = 'cognitivelint/editorLm/complete';

interface DocState {
  findings: EnrichedFinding[];
  version: number;
}

interface EditorLmResponse {
  ok: boolean;
  text?: string;
  model?: string;
  message?: string;
}

export function startServer(connection: Connection): void {
  const documents = new Map<string, TextDocument>();
  const state = new Map<string, DocState>();
  const ignored = new Set<string>();
  let workspaceRoot = '';

  const editorLm: LmClient = {
    name: 'editor-builtin',
    async complete(prompt: string): Promise<string> {
      const response = (await connection.sendRequest(EDITOR_LM_REQUEST, {
        prompt,
      })) as EditorLmResponse;
      if (!response?.ok || !response.text) {
        throw new Error(response?.message ?? 'Editor language model unavailable');
      }
      return response.text;
    },
  };

  connection.onInitialize((params: InitializeParams): InitializeResult => {
    workspaceRoot = params.workspaceFolders?.[0]?.uri ?? params.rootUri ?? '';
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        codeActionProvider: {
          codeActionKinds: [CodeActionKind.QuickFix],
        },
        executeCommandProvider: {
          commands: Object.values(COMMANDS),
        },
      },
      serverInfo: {
        name: 'CognitiveLint Accessibility Agent',
        version: '0.1.0',
      },
    };
  });

  connection.onInitialized(() => {
    connection.console.log('CognitiveLint Accessibility Agent ready');
  });

  const refresh = async (doc: TextDocument) => {
    if (!isJsx(doc.uri)) {
      connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
      return;
    }

    const filePath = uriToPath(doc.uri);
    const result = await analyzeFile({
      filePath,
      sourceCode: doc.getText(),
      enrich: true,
      useAi: false,
    });

    const findings = result.findings.filter((f) => !ignored.has(ignoreKey(filePath, f)));
    state.set(doc.uri, { findings, version: doc.version });

    const diagnostics: Diagnostic[] = findings.map((f) => toDiagnostic(f));
    connection.sendDiagnostics({ uri: doc.uri, diagnostics });
  };

  connection.onDidOpenTextDocument(async (event) => {
    const doc = TextDocument.create(
      event.textDocument.uri,
      event.textDocument.languageId,
      event.textDocument.version,
      event.textDocument.text,
    );
    documents.set(doc.uri, doc);
    await refresh(doc);
  });

  connection.onDidChangeTextDocument(async (event) => {
    const current = documents.get(event.textDocument.uri);
    if (!current) return;
    const updated = TextDocument.update(current, event.contentChanges, event.textDocument.version);
    documents.set(updated.uri, updated);
    await refresh(updated);
  });

  connection.onDidCloseTextDocument((event) => {
    documents.delete(event.textDocument.uri);
    state.delete(event.textDocument.uri);
    connection.sendDiagnostics({ uri: event.textDocument.uri, diagnostics: [] });
  });

  connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
    const docState = state.get(params.textDocument.uri);
    if (!docState) return [];

    const actions: CodeAction[] = [];
    for (const finding of docState.findings) {
      if (!overlaps(params.range, finding)) continue;

      // Quick Fix menu: Fix · Why? · Ignore — nothing else
      actions.push(
        makeCommandAction('✨ Fix', COMMANDS.fix, [params.textDocument.uri, finding.id]),
        makeCommandAction('❓ Why?', COMMANDS.why, [params.textDocument.uri, finding.id]),
        makeCommandAction('🚫 Ignore', COMMANDS.ignore, [params.textDocument.uri, finding.id]),
      );
    }
    return actions;
  });

  connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
    const [uri, findingId] = (params.arguments ?? []) as [string, string];
    const doc = documents.get(uri);
    const docState = state.get(uri);
    if (!doc || !docState) return { ok: false, message: 'Document not analyzed' };

    const finding = docState.findings.find((f) => f.id === findingId);
    if (!finding) return { ok: false, message: 'Finding not found' };

    const filePath = uriToPath(uri);
    const context = buildContext(filePath, doc.getText(), finding, docState.findings);
    const gateway = createGateway(editorLm);

    switch (params.command) {
      case COMMANDS.why:
      case COMMANDS.explain: {
        let impact = finding.humanImpact;
        try {
          impact = await gateway.explain({
            finding,
            context,
            persona: finding.primaryPersona,
            useAi: true,
          });
        } catch {
          // keep deterministic impact
        }

        return {
          ok: true,
          kind: 'explanation',
          title: 'Why?',
          markdown: formatWhyExplanation(finding, impact),
        };
      }

      case COMMANDS.fix: {
        let fix =
          (await gateway.generateFix({ finding, context, useAi: true }).catch(() => null)) ??
          generateHeuristicFix(finding, context);

        fix ??= generateHeuristicFix(finding, context);

        if (!fix) {
          return {
            ok: false,
            kind: 'fix',
            message: 'No safe automated fix available. Use Why? for guidance, then update manually.',
            markdown: formatWhyExplanation(finding),
          };
        }

        const validation = validateFix(doc.getText(), filePath, fix, finding.ruleId);
        return {
          ok: true,
          kind: 'fix',
          fix,
          validation,
          markdown: [
            '✨ **Fix**',
            '',
            fix.description,
            '',
            `Confidence: ${fix.confidence}% (${fix.confidenceBand})`,
            '',
            fix.diff,
            '',
            validation.summary,
          ].join('\n'),
          applyCommand: COMMANDS.applyFix,
          applyArgs: [uri, finding.id, fix],
        };
      }

      case COMMANDS.applyFix: {
        const fix = params.arguments?.[2] as FixProposal | undefined;
        if (!fix) return { ok: false, message: 'Missing fix payload' };
        const next = applyFixToSource(doc.getText(), fix);
        return {
          ok: true,
          kind: 'apply',
          uri,
          text: next,
          edit: {
            original: fix.original,
            replacement: fix.replacement,
            range: fix.range,
          },
        };
      }

      case COMMANDS.ignore: {
        ignored.add(ignoreKey(filePath, finding));
        await refresh(doc);
        return { ok: true, kind: 'ignore', message: `Ignored ${finding.ruleId}` };
      }

      default:
        return { ok: false, message: `Unknown command ${params.command}` };
    }
  });

  void workspaceRoot;
  connection.listen();
}

function makeCommandAction(title: string, command: string, args: unknown[]): CodeAction {
  return CodeAction.create(title, { title, command, arguments: args }, CodeActionKind.QuickFix);
}

function toDiagnostic(finding: EnrichedFinding): Diagnostic {
  const severity =
    finding.severity === 'error'
      ? DiagnosticSeverity.Warning
      : finding.severity === 'warning'
        ? DiagnosticSeverity.Warning
        : DiagnosticSeverity.Information;

  const icon =
    finding.primaryPersona === 'screen-reader'
      ? '🔊'
      : finding.primaryPersona === 'keyboard'
        ? '⌨'
        : '🧠';

  return {
    range: {
      start: {
        line: Math.max(0, finding.location.startLine - 1),
        character: Math.max(0, finding.location.startColumn - 1),
      },
      end: {
        line: Math.max(0, finding.location.endLine - 1),
        character: Math.max(0, finding.location.endColumn - 1),
      },
    },
    severity,
    source: 'CognitiveLint Accessibility',
    code: finding.ruleId,
    message: `${icon} ${finding.humanImpact.personaLabel}: ${finding.humanImpact.whatHappened}`,
    data: {
      findingId: finding.id,
      persona: finding.primaryPersona,
      impact: finding.humanImpact.impactLevel,
      confidence: finding.humanImpact.confidence,
    },
  };
}

function overlaps(
  range: { start: { line: number; character: number }; end: { line: number; character: number } },
  finding: EnrichedFinding,
): boolean {
  const startLine = finding.location.startLine - 1;
  const endLine = finding.location.endLine - 1;
  return range.start.line <= endLine && range.end.line >= startLine;
}

function isJsx(uri: string): boolean {
  return /\.(jsx|tsx)$/i.test(uri);
}

function uriToPath(uri: string): string {
  if (uri.startsWith('file://')) {
    return decodeURIComponent(uri.replace('file://', ''));
  }
  return uri;
}

function ignoreKey(filePath: string, finding: EnrichedFinding): string {
  return `${filePath}|${finding.ruleId}|${finding.location.startLine}|${finding.location.startColumn}`;
}
