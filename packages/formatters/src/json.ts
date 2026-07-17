import type { Report } from '@cognitivelint/core';
import type { Formatter, FormatterOptions } from './types.js';

export const jsonFormatter: Formatter = {
  name: 'json',
  mimeType: 'application/json',
  fileExtension: 'json',

  format(report: Report, _options?: FormatterOptions): string {
    return JSON.stringify(report, null, 2);
  },
};
