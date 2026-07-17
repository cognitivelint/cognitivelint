import type { Report, Finding, Severity } from '@cognitivelint/cognitivelint-core';
import type { Formatter, FormatterOptions } from './types.js';

type SarifLevel = 'error' | 'warning' | 'note' | 'none';

interface SarifResult {
  ruleId: string;
  level: SarifLevel;
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      };
    };
  }>;
  properties?: Record<string, unknown>;
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription?: { text: string };
  helpUri?: string;
  properties?: Record<string, unknown>;
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

function mapSeverityToLevel(severity: Severity): SarifLevel {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'note';
    case 'info':
      return 'none';
    default:
      return 'warning';
  }
}

function findingToResult(finding: Finding): SarifResult {
  return {
    ruleId: finding.ruleId,
    level: mapSeverityToLevel(finding.severity),
    message: { text: finding.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: finding.location.file },
          region: {
            startLine: finding.location.startLine,
            startColumn: finding.location.startColumn + 1,
            endLine: finding.location.endLine,
            endColumn: finding.location.endColumn + 1,
          },
        },
      },
    ],
    properties: {
      confidence: finding.confidence,
      category: finding.category,
      ...finding.context,
    },
  };
}

export const sarifFormatter: Formatter = {
  name: 'sarif',
  mimeType: 'application/sarif+json',
  fileExtension: 'sarif',

  format(report: Report, _options?: FormatterOptions): string {
    const rulesMap = new Map<string, SarifRule>();

    for (const finding of report.findings) {
      if (!rulesMap.has(finding.ruleId)) {
        rulesMap.set(finding.ruleId, {
          id: finding.ruleId,
          name: finding.ruleId.split('/').pop() ?? finding.ruleId,
          shortDescription: { text: finding.message },
          properties: {
            category: finding.category,
          },
        });
      }
    }

    const sarifLog: SarifLog = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: report.tool.name,
              version: report.tool.version,
              informationUri: 'https://cognitivelint.dev',
              rules: Array.from(rulesMap.values()),
            },
          },
          results: report.findings.map(findingToResult),
        },
      ],
    };

    return JSON.stringify(sarifLog, null, 2);
  },
};
