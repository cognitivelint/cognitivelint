import { createSqlStore, SqlStore } from './sql-store.js';
import { defaultSqlitePath, resolveStorageOptionsFromEnv } from './storage-options.js';
import type { CiStore } from './types.js';

export async function createStoreFromEnv(): Promise<CiStore> {
  const options = resolveStorageOptionsFromEnv();
  return createSqlStore(options);
}

/** Open SQLite storage (tests, seed script). */
export async function openSqliteStore(path = defaultSqlitePath()): Promise<SqlStore> {
  return createSqlStore({
    storageMethod: 'sql',
    sqlDialect: 'sqlite',
    sqlDatabasePath: path,
  });
}

export { MemoryStore } from './memory.js';
export { SqlStore, createSqlStore } from './sql-store.js';
export {
  defaultSqlitePath,
  resolveStorageOptionsFromEnv,
  type StorageOptions,
  type SqlDialect,
} from './storage-options.js';
export {
  DuplicateRunError,
  type CiStore,
  type CreateProjectResult,
  type PublicProject,
  type ProjectRecord,
  type StoredFinding,
  type StoredRun,
} from './types.js';
export { hashToken, tokensMatch } from './tokens.js';
