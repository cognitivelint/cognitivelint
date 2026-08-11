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

const EDITOR_LM_REQUEST = 'cognitivelint/editorLm/complete';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const enable = vscode.workspace.getConfiguration('cognitivelint.a11y').get<boolean>('enable', true);
  if (!enable) {
    return;
  }

  // Start the language server first so diagnostics/Quick Fix work even if Chat participants fail
  const serverModule = resolveServerModule(context);
  if (!fs.existsSync(serverModule)) {
    void vscode.window.showErrorMessage(
      `CognitiveLint language server not found at ${serverModule}. Reinstall extension ${EXTENSION_ID}.`,
    );
    return;
  }

  const serverOptions: ServerOptions = {
    run: {
      command: process.execPath,
      args: [serverModule, '--stdio'],
      transport: TransportKind.stdio,
    },
    debug: {
      command: process.execPath,
      args: ['--nolazy', '--inspect=6009', serverModule, '--stdio'],
      transport: TransportKind.stdio,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'untitled', language: 'javascriptreact' },
      { scheme: 'untitled', language: 'typescriptreact' },
      { scheme: 'file', pattern: '**/*.{jsx,tsx}' },
    ],
    outputChannelName: 'CognitiveLint Accessibility',
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
      void vscode.window.showInformationMessage(
        `${EXTENSION_ID}: rescans as you edit. Quick Fix: Fix · Why? · Ignore. Chat: @a11y-screen-reader · @a11y-keyboard · @a11y-cognitive`,
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

  // Optional Chat personas — never block core diagnostics if registration fails
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
