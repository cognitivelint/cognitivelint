import type { Report } from '@cognitivelint/cognitivelint-core';

export interface FormatterOptions {
  colors?: boolean;
  verbose?: boolean;
}

export interface Formatter {
  name: string;
  mimeType: string;
  fileExtension: string;
  format(report: Report, options?: FormatterOptions): string;
}
