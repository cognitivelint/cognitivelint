import {
  analyzeFile,
  applyFixToSource,
  askPersona,
  buildContext,
  createGateway,
  generateHeuristicFix,
  getWcagGuidance,
  validateFix,
  type EnrichedFinding,
  type FixProposal,
  type PersonaId,
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
  explain: 'cognitivelint.a11y.explain',
  fix: 'cognitivelint.a11y.fix',
  wcag: 'cognitivelint.a11y.wcag',
  askScreenReader: 'cognitivelint.a11y.askScreenReader',
  askKeyboard: 'cognitivelint.a11y.askKeyboard',
  askCognitive: 'cognitivelint.a11y.askCognitive',
  applyFix: 'cognitivelint.a11y.applyFix',
  ignore: 'cognitivelint.a11y.ignore',
} as const;

interface DocState {
  findings: EnrichedFinding[];
  version: number;
}

export function startServer(connection: Connection): void {
  const documents = new Map<string, TextDocument>();
  const state = new Map<string, DocState>();
  const ignored = new Set<string>();
  let workspaceRoot = '';

  connection.onInitialize((params: InitializeParams): InitializeResult => {
    workspaceRoot = params.workspaceFolders?.[0]?.uri ?? params.rootUri ?? '';
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        codeActionProvider: {
          codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.Refactor],
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
    const doc = documents.get(params.textDocument.uri);
    if (!docState || !doc) return [];

    const actions: CodeAction[] = [];
    for (const finding of docState.findings) {
      if (!overlaps(params.range, finding)) continue;

      actions.push(
        makeCommandAction(
          '🔊 Explain human impact',
          COMMANDS.explain,
          [params.textDocument.uri, finding.id],
        ),
        makeCommandAction(
          '✨ Generate accessibility fix',
          COMMANDS.fix,
          [params.textDocument.uri, finding.id],
        ),
        makeCommandAction(
          '📖 Explain relevant WCAG guidance',
          COMMANDS.wcag,
          [params.textDocument.uri, finding.id],
        ),
        makeCommandAction(
          '🔊 Ask Screen Reader Agent',
          COMMANDS.askScreenReader,
          [params.textDocument.uri, finding.id],
        ),
        makeCommandAction(
          '⌨ Ask Keyboard Agent',
          COMMANDS.askKeyboard,
          [params.textDocument.uri, finding.id],
        ),
        makeCommandAction(
          '🧠 Ask Cognitive Agent',
          COMMANDS.askCognitive,
          [params.textDocument.uri, finding.id],
        ),
        makeCommandAction(
          '🚫 Ignore',
          COMMANDS.ignore,
          [params.textDocument.uri, finding.id],
        ),
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

    switch (params.command) {
      case COMMANDS.explain:
        return {
          ok: true,
          kind: 'explanation',
          title: `${finding.humanImpact.personaLabel}`,
          markdown: finding.humanImpact.narrative,
          finding,
        };

      case COMMANDS.wcag:
        return {
          ok: true,
          kind: 'wcag',
          markdown: getWcagGuidance(finding),
        };

      case COMMANDS.askScreenReader:
      case COMMANDS.askKeyboard:
      case COMMANDS.askCognitive: {
        const persona = commandToPersona(params.command);
        const impact = await askPersona(persona, finding, context);
        return {
          ok: true,
          kind: 'explanation',
          title: impact.personaLabel,
          markdown: impact.narrative,
        };
      }

      case COMMANDS.fix: {
        const gateway = createGateway();
        const fix =
          (await gateway.generateFix({ finding, context, useAi: false })) ??
          generateHeuristicFix(finding, context);

        if (!fix) {
          return {
            ok: false,
            kind: 'fix',
            message: 'No safe automated fix available. Review the human-impact guidance and update manually.',
            markdown: finding.humanImpact.narrative,
          };
        }

        const validation = validateFix(doc.getText(), filePath, fix, finding.ruleId);
        return {
          ok: true,
          kind: 'fix',
          fix,
          validation,
          markdown: [
            '✨ **Proposed accessibility fix**',
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

  // Keep unused root referenced for future workspace config
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

function commandToPersona(command: string): PersonaId {
  if (command === COMMANDS.askKeyboard) return 'keyboard';
  if (command === COMMANDS.askCognitive) return 'cognitive';
  return 'screen-reader';
}
