export * from './types.js';
export { terminalFormatter } from './terminal.js';
export { jsonFormatter } from './json.js';
export { sarifFormatter } from './sarif.js';
export { htmlFormatter } from './html.js';

import type { Formatter } from './types.js';
import { terminalFormatter } from './terminal.js';
import { jsonFormatter } from './json.js';
import { sarifFormatter } from './sarif.js';
import { htmlFormatter } from './html.js';

const formatters: Record<string, Formatter> = {
  terminal: terminalFormatter,
  json: jsonFormatter,
  sarif: sarifFormatter,
  html: htmlFormatter,
};

export function getFormatter(name: string): Formatter {
  const formatter = formatters[name];
  if (!formatter) {
    throw new Error(`Unknown formatter: ${name}. Available: ${Object.keys(formatters).join(', ')}`);
  }
  return formatter;
}
