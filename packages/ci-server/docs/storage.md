# Storage

Database access follows the same **pattern as [LHCI server](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/server.md)**:

1. **One SQL storage method** (no separate “file store” in production).
2. **Sequelize** for queries and models.
3. **Umzug** for migrations, tracked in Sequelize’s meta table.

Application code depends on the **`CiStore`** interface (`src/store/types.ts`), not on Sequelize directly. Only `SqlStore` talks to the database.

## Dialects

| Dialect | When | Connection |
| --- | --- | --- |
| `sqlite` | Default | `SQLITE_PATH` (file path; use `:memory:` in tests) |
| `postgres` | `DATABASE_URL` starts with `postgres`, or `CI_STORAGE_SQL_DIALECT=postgres` | `DATABASE_URL` or `CI_STORAGE_SQL_CONNECTION_URL` |
| `mysql` | `DATABASE_URL` starts with `mysql`, or `CI_STORAGE_SQL_DIALECT=mysql` | Same as Postgres |

SQLite uses the **`sqlite3`** npm driver (native addon). Postgres uses **`pg`**; MySQL uses **`mysql2`**.

## Environment variables

| Variable | Meaning |
| --- | --- |
| `SQLITE_PATH` | SQLite file path. Default `./data/cognitivelint-ci.sqlite`. Docker image default `/data/cognitivelint-ci.sqlite`. |
| `DATABASE_URL` | Postgres or MySQL URL. When set (and dialect not forced to sqlite), selects that backend. |
| `CI_STORAGE_SQL_DIALECT` | Explicit `sqlite` \| `postgres` \| `mysql`. |
| `CI_STORAGE_SQL_CONNECTION_URL` | DB URL if you prefer not to use `DATABASE_URL`. |
| `CI_STORAGE_SQL_SSL` | `true` / `1` — require SSL for Postgres/MySQL. |
| `CI_SQL_DANGEROUSLY_RESET_DATABASE` | `true` — **drops all tables** and re-runs migrations. Dev only. |
| `CI_SEQUELIZE_LOG` | `true` — log SQL to stdout. |

## Schema (logical)

| Table | Purpose |
| --- | --- |
| `projects` | `id`, `name`, hashed upload token, hashed admin token, `created_at` |
| `runs` | Denormalized score fields + full `run_json`; unique `(project_id, sha, run_kind)` |
| `findings` | Per-run rows for list/compare (fingerprint, rule, severity, location JSON) |

`run_kind` defaults to `cognitive` in the run envelope.

## Migrations

Files live in `src/store/sql/migrations/`:

| Migration | Purpose |
| --- | --- |
| `2025032801-initial` | Creates tables and indexes (idempotent if tables already exist from pre-Sequelize installs) |
| `2025032802-legacy-admin-token` | Adds `admin_token_hash` on old databases missing the column |

On startup, `createStoreFromEnv()` → `SqlStore.initialize()` → `umzug.up()`.

### Adding a migration

1. Add `src/store/sql/migrations/YYYYMMDD-description.ts` with `up` / `down`.
2. Register it in `src/store/sql/migrate.ts` in the `MIGRATIONS` array.
3. Extend Sequelize models in `sql-store.ts` if columns change.

## Programmatic access

```ts
import {
  createStoreFromEnv,
  createSqlStore,
  openSqliteStore,
  type StorageOptions,
} from '@cognitivelint/ci-server/store';

// Server entry
const store = await createStoreFromEnv();

// Explicit SQLite (seed script, tests)
const store = await openSqliteStore('./data/cognitivelint-ci.sqlite');

// Explicit options
const store = await createSqlStore({
  storageMethod: 'sql',
  sqlDialect: 'postgres',
  sqlConnectionUrl: process.env.DATABASE_URL!,
});
```

## Docker volume

```bash
docker run --rm -p 3848:3848 \
  -v cognitivelint-ci-data:/data \
  -e SQLITE_PATH=/data/cognitivelint-ci.sqlite \
  cognitivelint-ci
```

## Postgres compose

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ci
      POSTGRES_DB: cognitivelint
  ci:
    image: cognitivelint-ci
    environment:
      DATABASE_URL: postgres://postgres:ci@db:5432/cognitivelint
    ports: ["3848:3848"]
    depends_on: [db]
```

## pnpm native build

Root `package.json` lists `sqlite3` under `pnpm.onlyBuiltDependencies` so installs compile the SQLite driver. If tests fail with “install sqlite3”, run `pnpm rebuild sqlite3` from the repo root.
