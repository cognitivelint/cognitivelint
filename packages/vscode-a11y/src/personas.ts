import * as vscode from 'vscode';
import { completeWithEditorLm } from './editorLm';
import { CHAT_HANDLES, CHAT_PARTICIPANTS, EXTENSION_ID } from './ids';

type PersonaId = 'screen-reader' | 'keyboard' | 'cognitive';

interface PersonaDef {
  id: PersonaId;
  participantId: string;
  handle: string;
  label: string;
  icon: string;
  description: string;
  mission: string;
}

const PERSONAS: PersonaDef[] = [
  {
    id: 'screen-reader',
    participantId: CHAT_PARTICIPANTS.screenReader,
    handle: CHAT_HANDLES.screenReader,
    label: 'Screen Reader Agent',
    icon: '🔊',
    description:
      'CognitiveLint subagent for screen-reader semantics, accessible names, ARIA, and announcements',
    mission:
      'Evaluate whether important information and interactions are understandable through screen-reader-oriented semantics (names, roles, states, headings, labels, announcements).',
  },
  {
    id: 'keyboard',
    participantId: CHAT_PARTICIPANTS.keyboard,
    handle: CHAT_HANDLES.keyboard,
    label: 'Keyboard Agent',
    icon: '⌨',
    description:
      'CognitiveLint subagent for keyboard reachability, focus order, and non-pointer interactions',
    mission:
      'Evaluate whether interactions can be completed without a mouse (focus, keyboard activation, non-semantic click handlers, dialogs/menus/tabs).',
  },
  {
    id: 'cognitive',
    participantId: CHAT_PARTICIPANTS.cognitive,
    handle: CHAT_HANDLES.cognitive,
    label: 'Cognitive Agent',
    icon: '🧠',
    description:
      'CognitiveLint subagent for ambiguous labels, cognitive load, and destructive-action clarity',
    mission:
      'Identify unnecessary cognitive burden: ambiguous labels, unclear actions, poor errors, missing recovery, inconsistent terminology, destructive actions without clarity.',
  },
];

/**
 * Register accessibility personas as Chat participants under the installed extension ID.
 * Handles: @a11y-screen-reader, @a11y-keyboard, @a11y-cognitive
 */
export function registerPersonaSubagents(context: vscode.ExtensionContext): void {
  for (const persona of PERSONAS) {
    try {
      const participant = vscode.chat.createChatParticipant(
        persona.participantId,
        createHandler(persona),
      );
      context.subscriptions.push(participant);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[${EXTENSION_ID}] Failed to register chat participant ${persona.participantId}: ${message}`,
      );
    }
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
      `You are ${persona.icon} ${persona.label}, a CognitiveLint accessibility subagent in extension ${EXTENSION_ID}.`,
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
          `Extension: \`${EXTENSION_ID}\` · Chat handle: \`@${persona.handle}\``,
          '',
          'CognitiveLint personas use your editor’s built-in agent models — no separate API key.',
        ].join('\n'),
      );
      return {};
    }

    stream.markdown(result.text);
    stream.markdown(`\n\n---\n_Model: \`${result.model}\` · Extension: \`${EXTENSION_ID}\`_`);
    return {};
  };
}
