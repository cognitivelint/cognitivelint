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
  TextDocuments,
  TextDocumentSyncKind,
  type CodeActionParams,
  type ExecuteCommandParams,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

const COMMANDS = {
  why: 'cognitivelint.a11y.why',
  explain: 'cognitivelint.a11y.explain',
  fix: 'cognitivelint.a11y.fix',
  applyFix: 'cognitivelint.a11y.applyFix',
  ignore: 'cognitivelint.a11y.ignore',
} as const;

export const EDITOR_LM_REQUEST = 'cognitivelint/editorLm/complete';
/** Explicit analyze push from the extension (needed when VS Code skips didOpen sync). */
export const ANALYZE_NOTIFICATION = 'cognitivelint/analyze';

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

interface AnalyzePayload {
  uri: string;
  languageId?: string;
  version?: number;
  text: string;
}

export function startServer(connection: Connection): void {
  const documents = new TextDocuments(TextDocument);
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
        version: '0.1.3',
      },
    };
  });

  connection.onInitialized(() => {
    connection.console.log(
      'CognitiveLint Accessibility Agent ready — waiting for JSX/TSX documents',
    );
  });

  const refreshFromContent = async (
    uri: string,
    text: string,
    languageId: string,
    version: number,
  ): Promise<void> => {
    if (!shouldAnalyze(uri, languageId, text)) {
      connection.console.log(
        `Skipping ${uri} (languageId=${languageId || 'unknown'}) — not treated as JSX/TSX`,
      );
      connection.sendDiagnostics({ uri, diagnostics: [] });
      return;
    }

    try {
      const filePath = uriToPath(uri);
      const result = await analyzeFile({
        filePath,
        sourceCode: text,
        enrich: true,
        useAi: false,
      });

      const findings = result.findings.filter((f) => !ignored.has(ignoreKey(filePath, f)));
      state.set(uri, { findings, version });
      connection.sendDiagnostics({
        uri,
        diagnostics: findings.map((f) => toDiagnostic(f)),
      });
      connection.console.log(
        `Analyzed ${uri} → ${findings.length} finding(s) (jsx-a11y=${result.deterministicCount}, semantic=${result.semanticCount})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      connection.console.error(`CognitiveLint analysis failed for ${uri}: ${message}`);
      connection.sendDiagnostics({ uri, diagnostics: [] });
    }
  };

  const refresh = async (doc: TextDocument): Promise<void> => {
    await refreshFromContent(doc.uri, doc.getText(), doc.languageId, doc.version);
  };

  documents.onDidOpen((event) => {
    connection.console.log(`didOpen ${event.document.uri} (${event.document.languageId})`);
    void refresh(event.document);
  });

  documents.onDidChangeContent((event) => {
    void refresh(event.document);
  });

  documents.onDidClose((event) => {
    state.delete(event.document.uri);
    connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
  });

  // Extension-driven analyze — covers VS Code cases where didOpen sync is missed
  connection.onNotification(ANALYZE_NOTIFICATION, (payload: AnalyzePayload) => {
    const version = payload.version ?? 1;
    const languageId = payload.languageId ?? '';
    // Keep TextDocuments in sync when possible so code actions/commands can resolve the doc
    const existing = documents.get(payload.uri);
    if (!existing) {
      // TextDocuments doesn't expose create API for arbitrary inject; store via open path
      // by relying on state + optional get from documents after LSP open.
    }
    void refreshFromContent(payload.uri, payload.text, languageId, version);
  });

  connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
    const docState = state.get(params.textDocument.uri);
    if (!docState) return [];

    const actions: CodeAction[] = [];
    for (const finding of docState.findings) {
      if (!overlaps(params.range, finding)) continue;
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
    if (!docState) return { ok: false, message: 'Document not analyzed yet — try Rescan' };

    const finding = docState.findings.find((f) => f.id === findingId);
    if (!finding) return { ok: false, message: 'Finding not found' };

    const text = doc?.getText() ?? '';
    if (!text && !doc) {
      // Still allow Why? from cached finding; Fix needs source
    }

    const filePath = uriToPath(uri);
    const sourceCode = text || '';
    const context = buildContext(filePath, sourceCode, finding, docState.findings);
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
        if (!sourceCode) {
          return {
            ok: false,
            kind: 'fix',
            message: 'Open the file and run CognitiveLint: Rescan, then try Fix again.',
          };
        }

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

        const validation = validateFix(sourceCode, filePath, fix, finding.ruleId);
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
        if (!doc) {
          return {
            ok: false,
            message: 'Document not loaded in language server — reopen the file and Rescan.',
          };
        }
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
        if (doc) await refresh(doc);
        else connection.sendDiagnostics({ uri, diagnostics: [] });
        return { ok: true, kind: 'ignore', message: `Ignored ${finding.ruleId}` };
      }

      default:
        return { ok: false, message: `Unknown command ${params.command}` };
    }
  });

  void workspaceRoot;
  documents.listen(connection);
  connection.listen();
}

function makeCommandAction(title: string, command: string, args: unknown[]): CodeAction {
  return CodeAction.create(title, { title, command, arguments: args }, CodeActionKind.QuickFix);
}

function toDiagnostic(finding: EnrichedFinding): Diagnostic {
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
    severity: DiagnosticSeverity.Warning,
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

function shouldAnalyze(uri: string, languageId: string, text: string): boolean {
  if (languageId === 'javascriptreact' || languageId === 'typescriptreact') return true;
  if (/\.(jsx|tsx)([?#].*)?$/i.test(uri)) return true;
  // VS Code sometimes labels .tsx as typescript / .jsx as javascript
  if (
    (languageId === 'typescript' || languageId === 'javascript') &&
    (/</.test(text) || /\.(jsx|tsx)([?#].*)?$/i.test(uri))
  ) {
    return true;
  }
  return false;
}

function uriToPath(uri: string): string {
  if (!uri.startsWith('file:')) return uri;
  try {
    // Handles Windows file:///c%3A/... and file:///c:/...
    const url = new URL(uri);
    let pathname = decodeURIComponent(url.pathname);
    if (/^\/[A-Za-z]:\//.test(pathname)) {
      pathname = pathname.slice(1);
    }
    return pathname;
  } catch {
    return decodeURIComponent(uri.replace(/^file:\/\//, ''));
  }
}

function ignoreKey(filePath: string, finding: EnrichedFinding): string {
  return `${filePath}|${finding.ruleId}|${finding.location.startLine}|${finding.location.startColumn}`;
}
