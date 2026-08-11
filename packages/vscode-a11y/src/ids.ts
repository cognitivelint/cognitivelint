/**
 * Canonical VS Code / Cursor extension ID for the installed VSIX.
 * publisher "cognitivelint" + name "cognitivelint-a11y"
 *
 * Do NOT invent parallel IDs like "cognitivelint.cognitive" — those look like
 * separate extensions and break agent/runtime resolution.
 */
export const EXTENSION_ID = 'cognitivelint.cognitivelint-a11y';

/** Chat participant IDs — always namespaced under EXTENSION_ID */
export const CHAT_PARTICIPANTS = {
  screenReader: `${EXTENSION_ID}.screenReader`,
  keyboard: `${EXTENSION_ID}.keyboard`,
  cognitive: `${EXTENSION_ID}.cognitive`,
} as const;

/** Short @-handles shown in Chat (not extension IDs) */
export const CHAT_HANDLES = {
  screenReader: 'a11y-screen-reader',
  keyboard: 'a11y-keyboard',
  cognitive: 'a11y-cognitive',
} as const;
