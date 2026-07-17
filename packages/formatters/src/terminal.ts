import chalk from 'chalk';
import type { Report, Finding, CognitiveScore, Severity } from '@cognitivelint/cognitivelint-core';
import type { Formatter, FormatterOptions } from './types.js';

const SEVERITY_COLORS: Record<Severity, (text: string) => string> = {
  critical: chalk.red,
  high: chalk.redBright,
  medium: chalk.yellow,
  low: chalk.blue,
  info: chalk.gray,
};

const SEVERITY_ICONS: Record<Severity, string> = {
  critical: '●',
  high: '●',
  medium: '●',
  low: '○',
  info: '○',
};

const GRADE_COLORS: Record<string, (text: string) => string> = {
  A: chalk.green,
  B: chalk.greenBright,
  C: chalk.yellow,
  D: chalk.yellowBright,
  F: chalk.red,
};

function groupByFile(findings: Finding[]): Record<string, Finding[]> {
  const result: Record<string, Finding[]> = {};
  for (const finding of findings) {
    const file = finding.location.file;
    if (!result[file]) {
      result[file] = [];
    }
    result[file].push(finding);
  }
  return result;
}

function formatScore(score: CognitiveScore): string {
  const gradeColor = GRADE_COLORS[score.grade] ?? chalk.white;
  return `${chalk.bold('Cognitive Score:')} ${gradeColor(String(score.overall))} ${gradeColor(`(${score.grade})`)}`;
}

function formatFinding(finding: Finding): string {
  const color = SEVERITY_COLORS[finding.severity];
  const icon = SEVERITY_ICONS[finding.severity];
  const loc = `${finding.location.startLine}:${finding.location.startColumn}`;

  return `  ${color(icon)} ${chalk.gray(loc.padEnd(8))} ${finding.message} ${chalk.dim(`[${finding.ruleId}]`)}`;
}

function formatCategoryScores(score: CognitiveScore): string[] {
  const lines: string[] = [];
  lines.push(chalk.bold('Category Breakdown:'));

  for (const cat of score.categories) {
    const scoreColor = cat.score >= 80 ? chalk.green : cat.score >= 60 ? chalk.yellow : chalk.red;
    const bar = '█'.repeat(Math.floor(cat.score / 10)) + '░'.repeat(10 - Math.floor(cat.score / 10));
    lines.push(
      `  ${cat.category.padEnd(18)} ${scoreColor(bar)} ${scoreColor(String(cat.score).padStart(3))}  ${chalk.dim(`(${cat.findingCount} findings)`)}`
    );
  }

  return lines;
}

function formatSummary(report: Report): string[] {
  const lines: string[] = [];
  const s = report.summary;

  lines.push(chalk.bold('Summary:'));
  lines.push(`  Files analyzed:    ${s.filesAnalyzed}`);
  lines.push(`  Components found:  ${s.componentsAnalyzed}`);
  lines.push(`  Total findings:    ${s.totalFindings}`);
  lines.push(`  Scan duration:     ${s.scanDurationMs}ms`);

  if (s.totalFindings > 0) {
    lines.push('');
    lines.push(chalk.bold('  By Severity:'));
    const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (const sev of severities) {
      const count = s.bySeverity[sev] ?? 0;
      if (count > 0) {
        const color = SEVERITY_COLORS[sev];
        lines.push(`    ${color(SEVERITY_ICONS[sev])} ${sev.padEnd(10)} ${count}`);
      }
    }
  }

  return lines;
}

export const terminalFormatter: Formatter = {
  name: 'terminal',
  mimeType: 'text/plain',
  fileExtension: 'txt',

  format(report: Report, _options?: FormatterOptions): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(chalk.bold.cyan('CognitiveLint Report'));
    lines.push(chalk.gray('─'.repeat(60)));

    lines.push('');
    lines.push(formatScore(report.score));

    lines.push('');
    lines.push(...formatCategoryScores(report.score));

    if (report.findings.length > 0) {
      lines.push('');
      lines.push(chalk.bold('Findings'));
      lines.push(chalk.gray('─'.repeat(60)));

      const byFile = groupByFile(report.findings);
      for (const [file, findings] of Object.entries(byFile)) {
        lines.push('');
        lines.push(chalk.underline(file));
        for (const finding of findings) {
          lines.push(formatFinding(finding));
        }
      }
    }

    lines.push('');
    lines.push(chalk.gray('─'.repeat(60)));
    lines.push(...formatSummary(report));
    lines.push('');

    return lines.join('\n');
  },
};
