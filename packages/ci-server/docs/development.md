# Development

## Prerequisites

- Node **≥ 24.18** (repo engines)
- `pnpm` at repo root
- Native build chain for **`sqlite3`** (Xcode CLT on macOS, build-essential on Linux)

## Build and run

From monorepo root:

```bash
pnpm install
pnpm --filter @cognitivelint/ci-server... build
cd packages/ci-server
SQLITE_PATH=./data/cognitivelint-ci.sqlite pnpm start
```

Or from root:

```bash
SQLITE_PATH=packages/ci-server/data/cognitivelint-ci.sqlite pnpm start
```

Open `http://127.0.0.1:3848/`.

## Tests

```bash
pnpm test -- packages/ci-server/tests
```

Store contract tests use in-memory SQLite. Postgres tests run only when `CI_POSTGRES_URL` is set.

## Seed script

```bash
pnpm --filter @cognitivelint/ci-server build
pnpm --filter @cognitivelint/ci-server seed
```

Env:

| Variable | Default |
| --- | --- |
| `SQLITE_PATH` | `packages/ci-server/data/cognitivelint-ci.sqlite` |
| `SEED_PROJECT_ID` | Demo project UUID in script |

## Docker

```bash
docker build -f packages/ci-server/Dockerfile -t cognitivelint-ci .
docker run --rm -p 3848:3848 -v cognitivelint-ci-data:/data cognitivelint-ci
```

## Exports

| Import path | Contents |
| --- | --- |
| `@cognitivelint/ci-server` | Server binary / `createApp` (from built `dist`) |
| `@cognitivelint/ci-server/protocol` | Run schema, compare, fingerprint |

## E2E

`packages/cli/tests/ci-e2e.test.ts` spins up `createApp` with `openSqliteStore` and exercises upload, assert, and trends HTML.
