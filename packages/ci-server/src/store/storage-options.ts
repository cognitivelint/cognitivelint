export type SqlDialect = 'sqlite' | 'postgres' | 'mysql';

export interface StorageOptions {
  /** Always `sql` for now (LHCI-compatible shape). */
  storageMethod: 'sql';
  sqlDialect: SqlDialect;
  /** SQLite file path (relative to cwd). Use `:memory:` for tests. */
  sqlDatabasePath?: string;
  /** Postgres or MySQL connection URL. */
  sqlConnectionUrl?: string;
  sqlConnectionSsl?: boolean;
  /** Drop all tables and re-run migrations (dev only). */
  sqlDangerouslyResetDatabase?: boolean;
}

export function defaultSqlitePath(): string {
  return process.env.SQLITE_PATH ?? './data/cognitivelint-ci.sqlite';
}

export function resolveStorageOptionsFromEnv(): StorageOptions {
  const dialectEnv = process.env.CI_STORAGE_SQL_DIALECT?.toLowerCase();
  const databaseUrl = process.env.DATABASE_URL;
  const sqlitePath = process.env.SQLITE_PATH ?? './data/cognitivelint-ci.sqlite';

  let sqlDialect: SqlDialect = 'sqlite';
  if (dialectEnv === 'postgres' || dialectEnv === 'postgresql') sqlDialect = 'postgres';
  else if (dialectEnv === 'mysql') sqlDialect = 'mysql';
  else if (dialectEnv === 'sqlite') sqlDialect = 'sqlite';
  else if (databaseUrl) {
    if (databaseUrl.startsWith('postgres')) sqlDialect = 'postgres';
    else if (databaseUrl.startsWith('mysql')) sqlDialect = 'mysql';
    else sqlDialect = 'postgres';
  }

  const reset =
    process.env.CI_SQL_DANGEROUSLY_RESET_DATABASE === '1' ||
    process.env.CI_SQL_DANGEROUSLY_RESET_DATABASE === 'true';

  if (sqlDialect === 'sqlite') {
    return {
      storageMethod: 'sql',
      sqlDialect: 'sqlite',
      sqlDatabasePath: sqlitePath,
      sqlDangerouslyResetDatabase: reset,
    };
  }

  const url = databaseUrl ?? process.env.CI_STORAGE_SQL_CONNECTION_URL;
  if (!url) {
    throw new Error(
      `${sqlDialect} requires DATABASE_URL or CI_STORAGE_SQL_CONNECTION_URL`,
    );
  }

  return {
    storageMethod: 'sql',
    sqlDialect,
    sqlConnectionUrl: url,
    sqlConnectionSsl:
      process.env.CI_STORAGE_SQL_SSL === '1' || process.env.CI_STORAGE_SQL_SSL === 'true',
    sqlDangerouslyResetDatabase: reset,
  };
}
