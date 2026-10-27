#!/usr/bin/env node

import { Command } from 'commander';
import { readCliVersion } from './ci/versions.js';

const program = new Command();

program
  .name('cognitivelint')
  .description('Cognitive UX linting for React applications')
  .version(readCliVersion());

program
  .command('scan')
  .description('Analyze a project for cognitive UX issues')
  .option('-c, --config <path>', 'Path to config file')
  .option('-f, --format <format>', 'Output format (terminal|json|sarif|html)', 'terminal')
  .option('-o, --output <path>', 'Output file path')
  .option('--min-score <score>', 'Minimum passing score')
  .option('--max-findings <count>', 'Maximum allowed findings')
  .option('--upload', 'Upload the scan to CognitiveLint CI')
  .option('--server <url>', 'CognitiveLint CI server URL')
  .option('--token <token>', 'Project token')
  .option('--project-id <id>', 'CI project id')
  .action(async (options) => {
    const { scan } = await import('./commands/scan.js');
    await scan(options);
  });

program
  .command('explain')
  .description('Get AI explanations for findings')
  .option('-r, --rule <ruleId>', 'Explain a specific rule')
  .action(async (_options) => {
    console.log('AI explanations coming soon. Run "cognitivelint scan" to analyze your project.');
  });

program
  .command('report')
  .description('Generate a report from the last scan')
  .option('-f, --format <format>', 'Output format (terminal|json|sarif|html)', 'html')
  .option('-o, --output <path>', 'Output file path')
  .action(async (_options) => {
    console.log('Report generation coming soon. Use "cognitivelint scan -f html -o report.html" for now.');
  });

program
  .command('fix')
  .description('Apply suggested fixes')
  .option('--dry-run', 'Preview fixes without applying')
  .option('-r, --rule <ruleId>', 'Only fix a specific rule')
  .action(async (_options) => {
    console.log('Auto-fix coming soon. Check the findings from "cognitivelint scan" for manual suggestions.');
  });

program
  .command('a11y')
  .description('Analyze JSX/TSX with CognitiveLint Accessibility Agent (jsx-a11y + personas)')
  .option('-p, --path <path>', 'Project path to scan')
  .option('-f, --format <format>', 'Output format (terminal|json)', 'terminal')
  .option('--fix', 'Generate and apply safe accessibility fixes')
  .option('--dry-run', 'Preview fixes without writing files')
  .action(async (options) => {
    const { a11y } = await import('./commands/a11y.js');
    await a11y(options);
  });

program
  .command('upload')
  .description('Upload a CognitiveLint run to a CI server')
  .requiredOption('--server <url>', 'CI server URL')
  .requiredOption('--token <token>', 'Project token')
  .requiredOption('--project-id <id>', 'Project id')
  .option('--file <path>', 'RunV1 or scan JSON report path')
  .action(async (options) => {
    const { uploadCommand } = await import('./ci/upload.js');
    await uploadCommand(options);
  });

program
  .command('assert')
  .description('Compare two uploaded SHAs and fail on new high/critical findings')
  .requiredOption('--server <url>', 'CI server URL')
  .option('--token <token>', 'Project token (optional; compare is public)')
  .requiredOption('--project-id <id>', 'Project id')
  .requiredOption('--base <sha>', 'Base git sha')
  .requiredOption('--head <sha>', 'Head git sha')
  .option('--fail-on-new-high', 'Exit 1 on new high/critical findings (default)', true)
  .option('--no-fail-on-new-high', 'Do not fail the process')
  .action(async (options) => {
    const { assertCommand } = await import('./ci/assert.js');
    await assertCommand({
      server: options.server,
      token: options.token,
      projectId: options.projectId,
      base: options.base,
      head: options.head,
      failOnNewHigh: options.failOnNewHigh,
    });
  });

program.parse();
