import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import chalk from 'chalk';
import {
  analyzeFile,
  buildContext,
  generateHeuristicFix,
  validateFix,
  type EnrichedFinding,
} from '@cognitivelint/a11y';

interface A11yOptions {
  path?: string;
  format?: string;
  fix?: boolean;
  dryRun?: boolean;
}

export async function a11y(options: A11yOptions): Promise<void> {
  const root = path.resolve(options.path ?? process.cwd());
  const files = await glob('**/*.{jsx,tsx}', {
    cwd: root,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'],
  });

  if (files.length === 0) {
    console.log(chalk.yellow('No JSX/TSX files found.'));
    return;
  }

  console.log();
  console.log(chalk.bold('  CognitiveLint Accessibility Agent'));
  console.log(chalk.dim(`  Scanning ${files.length} files with eslint-plugin-jsx-a11y + personas…`));
  console.log();

  const allFindings: Array<{ file: string; finding: EnrichedFinding }> = [];

  for (const file of files) {
    const sourceCode = await readFile(file, 'utf8');
    const result = await analyzeFile({
      filePath: file,
      sourceCode,
      enrich: true,
      useAi: false,
    });

    for (const finding of result.findings) {
      allFindings.push({ file, finding });
    }

    if (result.findings.length === 0) continue;

    const rel = path.relative(root, file);
    console.log(chalk.cyan(rel));

    for (const finding of result.findings) {
      const icon =
        finding.primaryPersona === 'screen-reader'
          ? '🔊'
          : finding.primaryPersona === 'keyboard'
            ? '⌨'
            : '🧠';
      const loc = `${finding.location.startLine}:${finding.location.startColumn}`;
      console.log(
        `  ${chalk.yellow('⚠')} ${chalk.dim(loc)}  ${icon} ${finding.humanImpact.personaLabel}`,
      );
      console.log(`             ${finding.humanImpact.whatHappened}`);
      console.log(
        chalk.dim(
          `             ${finding.ruleId} · ${finding.humanImpact.impactLevel} impact · ${finding.humanImpact.confidence}% confidence`,
        ),
      );

      if (options.fix) {
        const context = buildContext(file, sourceCode, finding, result.findings);
        const fix = generateHeuristicFix(finding, context);
        if (!fix) {
          console.log(chalk.dim('             (no automated fix)'));
          continue;
        }
        const validation = validateFix(sourceCode, file, fix, finding.ruleId);
        console.log(chalk.green(`             ✨ ${fix.description}`));
        console.log(chalk.dim(`             ${validation.messages.join(' · ')}`));
        if (!options.dryRun && validation.ok) {
          const { writeFile } = await import('node:fs/promises');
          const { applyFixToSource } = await import('@cognitivelint/a11y');
          const next = applyFixToSource(await readFile(file, 'utf8'), fix);
          await writeFile(file, next, 'utf8');
          console.log(chalk.green('             Applied.'));
        } else if (options.dryRun) {
          console.log(fix.diff);
        }
      }
      console.log();
    }
  }

  console.log(chalk.bold(`  Findings: ${allFindings.length}`));
  const byPersona = {
    'screen-reader': 0,
    keyboard: 0,
    cognitive: 0,
  };
  for (const { finding } of allFindings) {
    byPersona[finding.primaryPersona] += 1;
  }
  console.log(
    chalk.dim(
      `  🔊 Screen Reader ${byPersona['screen-reader']}  ⌨ Keyboard ${byPersona.keyboard}  🧠 Cognitive ${byPersona.cognitive}`,
    ),
  );
  console.log();

  if (options.format === 'json') {
    console.log(JSON.stringify(allFindings, null, 2));
  }
}
