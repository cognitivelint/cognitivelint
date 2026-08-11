import * as vscode from 'vscode';

export interface EditorLmClient {
  readonly name: string;
  complete(prompt: string): Promise<string>;
}

/**
 * Language-model client backed by the editor's built-in agents
 * (GitHub Copilot in VS Code, Cursor models in Cursor) via `vscode.lm`.
 * No Anthropic / OpenAI API keys are required.
 */
export async function createEditorLmClient(
  token?: vscode.CancellationToken,
): Promise<EditorLmClient | null> {
  try {
    const models = await vscode.lm.selectChatModels({});
    if (!models.length) {
      return null;
    }

    const model =
      models.find((m) => /gpt-4|claude|composer|sonnet|opus/i.test(m.id)) ??
      models.find((m) => m.vendor === 'copilot') ??
      models[0]!;

    return {
      name: `${model.vendor}/${model.family || model.id}`,
      async complete(prompt: string): Promise<string> {
        const messages = [vscode.LanguageModelChatMessage.User(prompt)];
        const response = await model.sendRequest(messages, {}, token);
        let text = '';
        for await (const chunk of response.text) {
          text += chunk;
        }
        return text;
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Editor language model unavailable: ${message}`);
  }
}

export async function completeWithEditorLm(
  prompt: string,
  token?: vscode.CancellationToken,
): Promise<{ ok: true; text: string; model: string } | { ok: false; message: string }> {
  try {
    const client = await createEditorLmClient(token);
    if (!client) {
      return {
        ok: false,
        message:
          'No editor language model is available. Sign in to GitHub Copilot (VS Code) or enable Cursor Agent models, then try again.',
      };
    }
    const text = await client.complete(prompt);
    return { ok: true, text, model: client.name };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
