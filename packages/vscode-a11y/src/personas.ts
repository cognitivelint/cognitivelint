import * as vscode from 'vscode';
import { completeWithEditorLm } from './editorLm';

type PersonaId = 'screen-reader' | 'keyboard' | 'cognitive';

interface PersonaDef {
  id: PersonaId;
  participantId: string;
  label: string;
  icon: string;
  description: string;
  mission: string;
}

const PERSONAS: PersonaDef[] = [
  {
    id: 'screen-reader',
    participantId: 'cognitivelint.screenReader',
    label: 'Screen Reader Agent',
    icon: '🔊',
    description:
      'CognitiveLint subagent for screen-reader semantics, accessible names, ARIA, and announcements',
    mission:
      'Evaluate whether important information and interactions are understandable through screen-reader-oriented semantics (names, roles, states, headings, labels, announcements).',
  },
  {
    id: 'keyboard',
    participantId: 'cognitivelint.keyboard',
    label: 'Keyboard Agent',
    icon: '⌨',
    description:
      'CognitiveLint subagent for keyboard reachability, focus order, and non-pointer interactions',
    mission:
      'Evaluate whether interactions can be completed without a mouse (focus, keyboard activation, non-semantic click handlers, dialogs/menus/tabs).',
  },
  {
    id: 'cognitive',
    participantId: 'cognitivelint.cognitive',
    label: 'Cognitive Agent',
    icon: '🧠',
    description:
      'CognitiveLint subagent for ambiguous labels, cognitive load, and destructive-action clarity',
    mission:
      'Identify unnecessary cognitive burden: ambiguous labels, unclear actions, poor errors, missing recovery, inconsistent terminology, destructive actions without clarity.',
  },
];

/**
 * Register accessibility personas as Chat participants (editor subagents).
 * Invoked in VS Code / Cursor Chat as @Screen Reader Agent, @Keyboard Agent, @Cognitive Agent.
 * Backed by the host's built-in agent models via vscode.lm — no API keys.
 */
export function registerPersonaSubagents(context: vscode.ExtensionContext): void {
  for (const persona of PERSONAS) {
    const participant = vscode.chat.createChatParticipant(
      persona.participantId,
      createHandler(persona),
    );
    context.subscriptions.push(participant);
  }
}

function createHandler(persona: PersonaDef): vscode.ChatRequestHandler {
  return async (request, _chatContext, stream, token) => {
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.document.getText(editor.selection) || '';
    const nearby =
      editor && !selection
        ? editor.document.getText(
            new vscode.Range(
              Math.max(0, editor.selection.active.line - 20),
              0,
              Math.min(editor.document.lineCount - 1, editor.selection.active.line + 20),
              200,
            ),
          )
        : selection;

    const prompt = [
      `You are ${persona.icon} ${persona.label}, a CognitiveLint accessibility subagent running inside the user's editor (VS Code or Cursor).`,
      '',
      persona.mission,
      '',
      'Speak in first person as this persona. Explain human impact clearly, cite relevant WCAG when useful, and propose the smallest safe code fix when asked. Prefer semantic HTML over ARIA when both work.',
      '',
      'User question:',
      request.prompt || 'Explain accessibility issues in the current selection.',
      '',
      nearby
        ? `Current editor context (${editor?.document.fileName ?? 'untitled'}):\n\`\`\`tsx\n${nearby}\n\`\`\``
        : 'No editor selection available.',
    ].join('\n');

    stream.progress(`Consulting ${persona.label} via editor agent…`);

    const result = await completeWithEditorLm(prompt, token);
    if (!result.ok) {
      stream.markdown(
        [
          `**${persona.icon} ${persona.label}**`,
          '',
          result.message,
          '',
          'CognitiveLint personas use your editor’s built-in agent models — no separate API key.',
        ].join('\n'),
      );
      return {};
    }

    stream.markdown(result.text);
    stream.markdown(`\n\n---\n_Model: \`${result.model}\`_`);
    return {};
  };
}
