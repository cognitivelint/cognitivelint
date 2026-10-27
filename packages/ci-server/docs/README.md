# CognitiveLint CI — documentation

Self-hosted **findings ledger** for CognitiveLint scans: store run history, compare builds in CI, and browse trends in a read-only dashboard.

| Doc | Contents |
| --- | --- |
| [Overview](./overview.md) | What the server does, architecture, what it does *not* do |
| [Storage](./storage.md) | SQLite / Postgres / MySQL, Sequelize, Umzug migrations, env vars |
| [HTTP API](./api.md) | REST endpoints, auth, status codes |
| [Web UI](./ui.md) | Projects home, trends dashboard, deep links |
| [CLI integration](./cli.md) | `upload`, `assert`, `scan --upload` |
| [Run protocol](./protocol.md) | `cognitivelint.run.v1`, fingerprints, compare semantics |
| [Security](./security.md) | Tokens, public vs protected operations |
| [Development](./development.md) | Local run, tests, seed data, Docker |

**Quick start:** [../README.md](../README.md)
