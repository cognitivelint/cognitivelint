# CognitiveLint CI (`@cognitivelint/ci-server`)

Self-hosted **findings ledger** for CognitiveLint: upload scan runs from CI, compare SHAs, and browse **trends** in a PatternFly dashboard.

**Full documentation:** [docs/README.md](./docs/README.md)

| Topic | Doc |
| --- | --- |
| What it supports | [docs/overview.md](./docs/overview.md) |
| Database (SQLite / Postgres / MySQL, Sequelize, migrations) | [docs/storage.md](./docs/storage.md) |
| REST API | [docs/api.md](./docs/api.md) |
| Web UI | [docs/ui.md](./docs/ui.md) |
| CLI (`upload`, `assert`, `scan --upload`) | [docs/cli.md](./docs/cli.md) |
| `cognitivelint.run.v1` protocol | [docs/protocol.md](./docs/protocol.md) |
| Security & tokens | [docs/security.md](./docs/security.md) |
| Local dev & Docker | [docs/development.md](./docs/development.md) |

## Quick start

```bash
# Monorepo root
pnpm install
pnpm --filter @cognitivelint/ci-server... build
SQLITE_PATH=./packages/ci-server/data/cognitivelint-ci.sqlite pnpm start
```

Open `http://127.0.0.1:3848/` → create a project → use the upload token with the CLI.

```bash
cognitivelint upload --server http://127.0.0.1:3848 \
  --token "$TOKEN" --project-id "$ID" \
  --file packages/ci-server/examples/report.json
```

Trends: `http://127.0.0.1:3848/projects/<projectId>/trends`

## Docker

```bash
docker build -f packages/ci-server/Dockerfile -t cognitivelint-ci .
docker run --rm -p 3848:3848 -v cognitivelint-ci-data:/data cognitivelint-ci
```

## Package exports

- **`@cognitivelint/ci-server`** — HTTP server (`cognitivelint-ci-server` bin).
- **`@cognitivelint/ci-server/protocol`** — shared run schema and compare logic for the CLI.

The server stores JSON only; it does not run CognitiveLint rules or parse React source.
