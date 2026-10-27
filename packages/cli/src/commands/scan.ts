import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';

import { loadConfig } from '@cognitivelint/config';
import { parseReactFile } from '@cognitivelint/parser-react';
import { RuleEngine } from '@cognitivelint/rule-engine';
import { getAllRules } from '@cognitivelint/rules';
import { calculateScore } from '@cognitivelint/core';
import { getFormatter } from '@cognitivelint/formatters';
import type { Finding, Report, Severity, CognitiveCategory } from '@cognitivelint/core';
import { readCliVersion } from '../ci/versions.js';
import { collectGitMeta } from '../ci/git.js';
import { reportToRunV1 } from '../ci/build-run.js';

export interface ScanOptions {
  config?: string;
  format?: string;
  output?: string;
  minScore?: string;
  maxFindings?: string;
  upload?: boolean;
  server?: string;
  token?: string;
  projectId?: string;
}

function countBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const key = keyFn(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

export async function executeScan(options: ScanOptions): Promise<Report | null> {
  const spinner = ora('Loading configuration...').start();

  try {
    const config = await loadConfig(options.config);
    spinner.text = 'Finding files...';

    const includePatterns = config.include ?? ['**/*.tsx', '**/*.jsx'];
    const excludePatterns = config.exclude ?? ['**/node_modules/**', '**/dist/**'];

    const files = await glob(includePatterns, {
      ignore: excludePatterns,
      nodir: true,
      absolute: true,
    });

    if (files.length === 0) {
      spinner.warn('No React files found matching patterns');
      return null;
    }

    spinner.text = `Analyzing ${files.length} files...`;

    const rules = getAllRules().filter((rule) => {
      const ruleConfig = config.rules?.[rule.meta.id];
      return ruleConfig !== 'off';
    });

    const engine = new RuleEngine({ rules });
    const allFindings: Finding[] = [];
    let totalComponents = 0;
    const startTime = Date.now();

    for (const file of files) {
      try {
        const sourceCode = await readFile(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);
        const parsed = parseReactFile({ filePath: relativePath, sourceCode });
        totalComponents += parsed.components.length;

        for (const component of parsed.components) {
          const findings = engine.analyze(relativePath, sourceCode, [component]);
          allFindings.push(...findings);
        }
      } catch {
        // Skip files that fail to parse
      }
    }

    const scanDuration = Date.now() - startTime;
    spinner.succeed(`Analyzed ${files.length} files in ${scanDuration}ms`);

    const score = calculateScore(allFindings, config.weights);

    const severityCounts = countBy(allFindings, (f) => f.severity) as Record<Severity, number>;
    const categoryCounts = countBy(allFindings, (f) => f.category) as Record<
      CognitiveCategory,
      number
    >;

    const report: Report = {
      tool: { name: 'CognitiveLint', version: readCliVersion() },
      timestamp: new Date().toISOString(),
      project: {
        name: path.basename(process.cwd()),
        path: process.cwd(),
      },
      score,
      findings: allFindings,
      summary: {
        totalFindings: allFindings.length,
        bySeverity: severityCounts,
        byCategory: categoryCounts,
        filesAnalyzed: files.length,
        componentsAnalyzed: totalComponents,
        scanDurationMs: scanDuration,
      },
      config: config as Record<string, unknown>,
    };

    return report;
  } catch (err) {
    spinner.fail('Scan failed');
    throw err;
  }
}

export async function scan(options: ScanOptions): Promise<void> {
  try {
    const report = await executeScan(options);
    if (!report) {
      return;
    }

    const config = report.config as { format?: string; minScore?: number; maxFindings?: number };
    const formatName = options.format ?? config.format ?? 'terminal';
    const formatter = getFormatter(formatName);
    const output = formatter.format(report);

    if (options.output) {
      await writeFile(options.output, output);
      console.log(chalk.green(`Report saved to ${options.output}`));
    } else {
      console.log(output);
    }

    if (options.upload) {
      if (!options.server || !options.token || !options.projectId) {
        throw new Error('scan --upload requires --server, --token, and --project-id');
      }
      const { uploadRun } = await import('../ci/upload.js');
      const uploaded = await uploadRun({
        server: options.server,
        token: options.token,
        projectId: options.projectId,
        run: reportToRunV1(report, collectGitMeta()),
      });
      console.log(chalk.green(`Uploaded run ${uploaded.sha}`));
    }

    const minScore = options.minScore ? parseInt(options.minScore, 10) : config.minScore;
    const maxFindings = options.maxFindings
      ? parseInt(options.maxFindings, 10)
      : config.maxFindings;

    if (minScore !== undefined && report.score.overall < minScore) {
      console.error(chalk.red(`\nScore ${report.score.overall} is below minimum ${minScore}`));
      process.exit(1);
    }

    if (maxFindings !== undefined && report.findings.length > maxFindings) {
      console.error(
        chalk.red(`\nFindings ${report.findings.length} exceeds maximum ${maxFindings}`),
      );
      process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
