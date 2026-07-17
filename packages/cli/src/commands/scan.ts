import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';

import { loadConfig } from '@dkoul/cognitivelint-config';
import { parseReactFile } from '@dkoul/cognitivelint-parser-react';
import { RuleEngine } from '@dkoul/cognitivelint-rule-engine';
import { getAllRules } from '@dkoul/cognitivelint-rules';
import { calculateScore } from '@dkoul/cognitivelint-core';
import { getFormatter } from '@dkoul/cognitivelint-formatters';
import type { Finding, Report, Severity, CognitiveCategory } from '@dkoul/cognitivelint-core';

export interface ScanOptions {
  config?: string;
  format?: string;
  output?: string;
  minScore?: string;
  maxFindings?: string;
}

function countBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const key = keyFn(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

export async function scan(options: ScanOptions): Promise<void> {
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
      return;
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
      } catch (err) {
        // Skip files that fail to parse
      }
    }

    const scanDuration = Date.now() - startTime;
    spinner.succeed(`Analyzed ${files.length} files in ${scanDuration}ms`);

    const score = calculateScore(allFindings, config.weights);

    const severityCounts = countBy(allFindings, (f) => f.severity) as Record<Severity, number>;
    const categoryCounts = countBy(allFindings, (f) => f.category) as Record<CognitiveCategory, number>;

    const report: Report = {
      tool: { name: 'CognitiveLint', version: '0.1.0' },
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

    const formatName = options.format ?? config.format ?? 'terminal';
    const formatter = getFormatter(formatName);
    const output = formatter.format(report);

    if (options.output) {
      await writeFile(options.output, output);
      console.log(chalk.green(`Report saved to ${options.output}`));
    } else {
      console.log(output);
    }

    const minScore = options.minScore ? parseInt(options.minScore, 10) : config.minScore;
    const maxFindings = options.maxFindings ? parseInt(options.maxFindings, 10) : config.maxFindings;

    if (minScore !== undefined && score.overall < minScore) {
      console.error(chalk.red(`\nScore ${score.overall} is below minimum ${minScore}`));
      process.exit(1);
    }

    if (maxFindings !== undefined && allFindings.length > maxFindings) {
      console.error(chalk.red(`\nFindings ${allFindings.length} exceeds maximum ${maxFindings}`));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail('Scan failed');
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
