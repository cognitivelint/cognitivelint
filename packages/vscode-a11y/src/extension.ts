import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { completeWithEditorLm } from './editorLm';
import { EXTENSION_ID } from './ids';
import { registerPersonaSubagents } from './personas';

let client: LanguageClient | undefined;
const ANALYZE_NOTIFICATION = 'cognitivelint/analyze';
const EDITOR_LM_REQUEST = 'cognitivelint/editorLm/complete';

const debounceTimers = new Map<string, NodeJS.Timeout>();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const enable = vscode.workspace.getConfiguration('cognitivelint.a11y').get<boolean>('enable', true);
  if (!enable) {
    return;
  }

  const serverModule = resolveServerModule(context);
  if (!fs.existsSync(serverModule)) {
    void vscode.window.showErrorMessage(
      `CognitiveLint language server not found at ${serverModule}. Reinstall extension ${EXTENSION_ID}.`,
    );
    return;
  }

  // VS Code: process.execPath is Electron — use IPC module fork.
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6011'],
      },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'untitled', language: 'javascriptreact' },
      { scheme: 'untitled', language: 'typescriptreact' },
      // VS Code may open .tsx/.jsx as typescript/javascript
      { scheme: 'file', language: 'typescript', pattern: '**/*.{tsx,jsx}' },
      { scheme: 'file', language: 'javascript', pattern: '**/*.{tsx,jsx}' },
      { scheme: 'file', pattern: '**/*.{jsx,tsx}' },
    ],
    outputChannelName: 'CognitiveLint Accessibility',
    diagnosticCollectionName: 'cognitivelint-a11y',
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{jsx,tsx}'),
    },
    middleware: {
      executeCommand: async (command, args, next) => {
        const result = (await next(command, args)) as CommandResult | undefined;
        if (!result) return result;
        await handleCommandResult(result);
        return result;
      },
    },
  };

  client = new LanguageClient(
    'cognitivelintA11y',
    'CognitiveLint Accessibility Agent',
    serverOptions,
    clientOptions,
  );

  client.onRequest(
    EDITOR_LM_REQUEST,
    async (params: { prompt: string }, token: vscode.CancellationToken) => {
      return completeWithEditorLm(params.prompt, token);
    },
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cognitivelint.a11y.rescan', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showInformationMessage('Open a JSX/TSX file to rescan.');
        return;
      }
      await pushAnalyze(editor.document);
      void vscode.window.showInformationMessage(
        `${EXTENSION_ID}: rescanned ${path.basename(editor.document.fileName)}. Check Output → CognitiveLint Accessibility.`,
      );
    }),
  );

  try {
    await client.start();
    context.subscriptions.push({ dispose: () => { void client?.stop(); } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(
      `Failed to start CognitiveLint language server (${EXTENSION_ID}): ${message}`,
    );
    return;
  }

  // Explicit analyze push — fixes VS Code when LSP didOpen sync does not fire
  const schedule = (doc: vscode.TextDocument) => {
    if (!isAnalyzable(doc)) return;
    const key = doc.uri.toString();
    const existing = debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    debounceTimers.set(
      key,
      setTimeout(() => {
        debounceTimers.delete(key);
        void pushAnalyze(doc);
      }, 200),
    );
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(schedule),
    vscode.workspace.onDidChangeTextDocument((e) => schedule(e.document)),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) schedule(editor.document);
    }),
  );

  // Analyze already-open editors immediately after server start
  for (const doc of vscode.workspace.textDocuments) {
    schedule(doc);
  }
  if (vscode.window.activeTextEditor) {
    await pushAnalyze(vscode.window.activeTextEditor.document);
  }

  try {
    registerPersonaSubagents(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[${EXTENSION_ID}] Chat persona registration skipped: ${message}`);
  }
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
  }
}

function isAnalyzable(doc: vscode.TextDocument): boolean {
  if (doc.uri.scheme !== 'file' && doc.uri.scheme !== 'untitled') return false;
  const lang = doc.languageId;
  if (lang === 'javascriptreact' || lang === 'typescriptreact') return true;
  if (/\.(jsx|tsx)$/i.test(doc.fileName)) return true;
  if ((lang === 'javascript' || lang === 'typescript') && /<[A-Za-z]/.test(doc.getText())) {
    return true;
  }
  return false;
}

async function pushAnalyze(doc: vscode.TextDocument): Promise<void> {
  if (!client || !isAnalyzable(doc)) return;
  try {
    await client.sendNotification(ANALYZE_NOTIFICATION, {
      uri: doc.uri.toString(),
      languageId: doc.languageId,
      version: doc.version,
      text: doc.getText(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[${EXTENSION_ID}] analyze push failed: ${message}`);
  }
}

function resolveServerModule(context: vscode.ExtensionContext): string {
  const candidates = [
    path.join(context.extensionPath, 'server', 'index.js'),
    path.join(context.extensionPath, '..', 'a11y-server', 'dist', 'index.js'),
    path.join(context.extensionPath, 'node_modules', '@cognitivelint', 'a11y-server', 'dist', 'index.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(context.extensionPath, 'server', 'index.js');
}

interface CommandResult {
  ok: boolean;
  kind?: string;
  title?: string;
  markdown?: string;
  message?: string;
  fix?: {
    description: string;
    diff: string;
    original: string;
    replacement: string;
    range: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
    confidence: number;
  };
  validation?: {
    ok: boolean;
    summary: string;
  };
  applyCommand?: string;
  applyArgs?: unknown[];
  uri?: string;
  text?: string;
  edit?: {
    original: string;
    replacement: string;
    range: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
  };
}

async function handleCommandResult(result: CommandResult): Promise<void> {
  if (!result.ok && result.message && !result.markdown) {
    void vscode.window.showWarningMessage(result.message);
    return;
  }

  if (result.kind === 'explanation' || result.kind === 'wcag') {
    await showMarkdownPanel(result.markdown ?? result.message ?? '');
    return;
  }

  if (result.kind === 'fix') {
    await showFixPreview(result);
    return;
  }

  if (result.kind === 'apply' && result.uri && result.edit) {
    await applyEdit(result.uri, result.edit);
    void vscode.window.showInformationMessage('CognitiveLint: accessibility fix applied');
    return;
  }

  if (result.kind === 'ignore') {
    void vscode.window.showInformationMessage(result.message ?? 'Finding ignored');
  }
}

async function showMarkdownPanel(markdown: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({
    content: markdown,
    language: 'markdown',
  });
  await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
}

async function showFixPreview(result: CommandResult): Promise<void> {
  const markdown = result.markdown ?? result.message ?? 'No fix available';
  await showMarkdownPanel(markdown);

  if (!result.fix || !result.applyArgs) return;

  const choice = await vscode.window.showInformationMessage(
    `Apply accessibility fix? (${result.fix.confidence}% confidence)`,
    'Apply Fix',
    'Cancel',
  );

  if (choice !== 'Apply Fix' || !client) return;

  const applyResult = (await client.sendRequest('workspace/executeCommand', {
    command: result.applyCommand ?? 'cognitivelint.a11y.applyFix',
    arguments: result.applyArgs,
  })) as CommandResult;

  await handleCommandResult(applyResult);
}

async function applyEdit(
  uri: string,
  edit: {
    original: string;
    replacement: string;
    range: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
  },
): Promise<void> {
  const vscodeUri = vscode.Uri.parse(uri);
  const doc = await vscode.workspace.openTextDocument(vscodeUri);
  const editor = await vscode.window.showTextDocument(doc);

  const full = doc.getText();
  if (edit.original && full.includes(edit.original)) {
    const startOffset = full.indexOf(edit.original);
    const start = doc.positionAt(startOffset);
    const end = doc.positionAt(startOffset + edit.original.length);
    await editor.edit((builder) => builder.replace(new vscode.Range(start, end), edit.replacement));
    return;
  }

  const range = new vscode.Range(
    edit.range.startLine - 1,
    edit.range.startColumn - 1,
    edit.range.endLine - 1,
    edit.range.endColumn - 1,
  );
  await editor.edit((builder) => builder.replace(range, edit.replacement));
}
