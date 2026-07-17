#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('cognitivelint')
  .description('Cognitive UX linting for React applications')
  .version('0.1.0');

program
  .command('scan')
  .description('Analyze a project for cognitive UX issues')
  .option('-c, --config <path>', 'Path to config file')
  .option('-f, --format <format>', 'Output format (terminal|json|sarif|html)', 'terminal')
  .option('-o, --output <path>', 'Output file path')
  .option('--min-score <score>', 'Minimum passing score')
  .option('--max-findings <count>', 'Maximum allowed findings')
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

program.parse();
