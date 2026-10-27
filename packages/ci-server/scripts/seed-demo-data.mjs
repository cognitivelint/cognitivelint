#!/usr/bin/env node
/**
 * Adds demo runs to packages/ci-server/data/cognitivelint-ci.sqlite for UI testing.
 * Usage (from repo root):
 *   pnpm --filter @cognitivelint/ci-server build
 *   node packages/ci-server/scripts/seed-demo-data.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSqliteStore } from '../dist/store/index.js';
import { parseRunV1 } from '../dist/protocol/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDb = join(__dirname, '../data/cognitivelint-ci.sqlite');
const dbPath = process.env.SQLITE_PATH ?? defaultDb;

/** Project to enrich (roommen in default DB). Override with SEED_PROJECT_ID. */
const PROJECT_ID =
  process.env.SEED_PROJECT_ID ?? '0715d0ff-0d5b-4f47-9e8f-b8fd4e045ef3';

const template = parseRunV1(
  JSON.parse(readFileSync(join(__dirname, '../examples/run.v1.json'), 'utf8')),
);

const GRADE = (n) =>
  n >= 90 ? 'A' : n >= 80 ? 'B' : n >= 70 ? 'C' : n >= 60 ? 'D' : 'F';

const DEMO_RUNS = [
  { sha: 'sample01aaaaaaa', branch: 'main', overall: 88, findings: 0 },
  { sha: 'sample02bbbbbbb', branch: 'main', overall: 81, findings: 1 },
  { sha: 'sample03ccccccc', branch: 'feat/checkout', overall: 74, findings: 2 },
  { sha: 'sample04ddddddd', branch: 'feat/checkout', overall: 79, findings: 1 },
];

function buildRun({ sha, branch, overall, findings }) {
  const report = structuredClone(template.report);
  report.score.overall = overall;
  report.score.grade = GRADE(overall);
  const baseFinding = template.report.findings[0];
  report.findings =
    findings === 0 || !baseFinding
      ? []
      : findings === 1
        ? [baseFinding]
        : [
            baseFinding,
            {
              ...baseFinding,
              ruleId: 'feedback/missing-empty-state',
              message: 'Empty state is missing for this view.',
              location: { ...baseFinding.location, file: 'src/Dashboard.tsx' },
            },
          ];
  report.summary.totalFindings = report.findings.length;
  report.summary.bySeverity = report.findings.length
    ? { high: report.findings.length }
    : {};
  report.summary.byCategory = report.findings.length
    ? { 'error-prevention': report.findings.length }
    : {};

  const ep = report.score.categories.find((c) => c.category === 'error-prevention');
  if (ep) ep.findingCount = report.findings.length;

  return parseRunV1({
    ...template,
    git: { sha, branch },
    report,
  });
}

const store = await openSqliteStore(dbPath);
const project = await store.getProjectById(PROJECT_ID);
if (!project) {
  console.error(`Project ${PROJECT_ID} not found in ${dbPath}`);
  console.error('Create a project in the UI first, or set SEED_PROJECT_ID.');
  process.exit(1);
}

let inserted = 0;
let skipped = 0;
for (const spec of DEMO_RUNS) {
  const run = buildRun(spec);
  try {
    await store.insertRun(PROJECT_ID, run);
    inserted += 1;
    console.log(`+ ${spec.sha.slice(0, 12)} ${spec.branch} score ${spec.overall}`);
  } catch (err) {
    if (err?.name === 'DuplicateRunError') {
      skipped += 1;
      console.log(`= ${spec.sha.slice(0, 12)} already exists`);
    } else {
      throw err;
    }
  }
}

store.close();
console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
console.log(`Trends: http://127.0.0.1:3848/projects/${PROJECT_ID}/trends`);
console.log(`Example run URL: .../trends?run=sample02bbbbbbb`);
