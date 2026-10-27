# Run protocol (`cognitivelint.run.v1`)

Shared between server and CLI via **`@cognitivelint/ci-server/protocol`**.

## Envelope

```ts
{
  schema: 'cognitivelint.run.v1',
  git: { sha, branch, baseSha?, prNumber? },
  ci?: { provider?, jobUrl? },
  runKind: string,        // default 'cognitive'
  configHash: string,     // hash of lint config (stable JSON)
  report: { /* CognitiveLint report */ }
}
```

Validation: Zod schema in `src/protocol/schema.ts` (`parseRunV1`).

## Report contents

The embedded report matches CognitiveLint scan JSON:

- **tool** — name and version
- **score** — overall, letter grade, per-category scores
- **findings** — ruleId, severity, category, message, location, optional context
- **summary** — counts by severity/category, files analyzed, duration
- **config** — snapshot used for `configHash`

Severities: `critical`, `high`, `medium`, `low`, `info`.

Categories: `cognitive-load`, `trust-confidence`, `feedback`, `discoverability`, `consistency`, `error-prevention`.

## Fingerprint

`fingerprintFinding(finding)` builds a stable id for compare:

- Rule id, severity, message, and normalized location fields.

Used when persisting `findings` rows and in `compareRuns`.

## Config hash

`configHash` is derived from the report’s `config` object (stable key ordering). When base and head runs differ in `configHash`, compare still returns added/removed findings, but **`shouldFailOnNewHigh`** is false so CI assert does not fail on config churn.

## Compare

`compareRuns(baseRun, headRun)` returns:

- `added` / `removed` / `unchanged` (by fingerprint)
- `newHighOrCritical` — subset of added with severity high or critical
- `configHashMismatch`
- `shouldFailOnNewHigh` — false when config hashes differ

## Uniqueness

The database enforces one run per **`(project_id, sha, run_kind)`**. Re-uploading the same SHA returns **409** from the API.

## Importing in other packages

```ts
import {
  parseRunV1,
  compareRuns,
  fingerprintFinding,
  type RunV1,
} from '@cognitivelint/ci-server/protocol';
```
