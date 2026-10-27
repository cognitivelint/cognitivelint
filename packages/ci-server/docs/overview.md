# Overview

## Purpose

CognitiveLint CI is an **API-first** service inspired by [Lighthouse CI Server](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/server.md), tailored for CognitiveLint:

- **Upload** scan results from CI (or your laptop) keyed by git SHA.
- **Compare** two SHAs to detect new high/critical findings.
- **Trend** overall score, grades, and findings over time in a PatternFly HTML UI.

The server **does not** run scans, parse React, or execute rules. It only validates, stores, and compares **`cognitivelint.run.v1`** JSON produced by the CLI.

## Package layout

| Path | Role |
| --- | --- |
| `src/app.ts` | Hono app: REST API + HTML routes |
| `src/store/` | `CiStore` persistence (`SqlStore`, `MemoryStore`) |
| `src/protocol/` | Run schema (Zod), fingerprints, `configHash`, `compareRuns` |
| `src/ui/` | Server-rendered trends and project admin pages |
| `examples/` | Sample `report.json` and `run.v1.json` for manual testing |

The protocol is also published as **`@cognitivelint/ci-server/protocol`** so the CLI and server share one contract.

## Supported capabilities

### Persistence

- **SQLite** (default) — file on disk, ideal for Docker volumes and local dev.
- **PostgreSQL** — via `DATABASE_URL`.
- **MySQL** — via `DATABASE_URL` or `CI_STORAGE_SQL_CONNECTION_URL` with `CI_STORAGE_SQL_DIALECT=mysql`.
- **Versioned schema** — Umzug migrations under `src/store/sql/migrations/`.
- **In-memory** — `MemoryStore` for unit tests only.

### API (`/v1/...`)

- Create project (returns upload + admin tokens once).
- Upload run (upload token).
- Rotate upload token, delete project (admin token).
- List runs, get run by SHA, compare two SHAs (read — no token).

### HTML UI

- Project list, create project, rotate upload token, delete project.
- Per-project **trends** dashboard: filters, charts, run history, findings table, `?run=` deep links.

### CLI

- `cognitivelint upload` — push a report or full run envelope.
- `cognitivelint scan --upload` — scan then upload in one step.
- `cognitivelint assert` — fail CI when head introduces new high/critical findings (with config-hash guard).

### Compare semantics

- Findings matched by stable **fingerprint** (rule + location + message).
- **`configHash`** mismatch: compare still runs, but assert will not fail on new highs (config changed).
- Duplicate uploads rejected: unique on `(projectId, sha, runKind)`.

## Default port

`3848` (`PORT` env).

## Binary

`cognitivelint-ci-server` (from `@cognitivelint/ci-server`) or `pnpm --filter @cognitivelint/ci-server start` after build.
