import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Sequelize } from 'sequelize';
import type { StorageOptions } from '../storage-options.js';

export function createSequelize(options: StorageOptions): Sequelize {
  const logging =
    process.env.CI_SEQUELIZE_LOG === '1' || process.env.CI_SEQUELIZE_LOG === 'true'
      ? console.log
      : false;

  if (options.sqlDialect === 'sqlite') {
    const path = options.sqlDatabasePath;
    if (!path) throw new Error('sqlite requires sqlDatabasePath (or SQLITE_PATH)');
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true });
    }
    return new Sequelize({
      dialect: 'sqlite',
      storage: path,
      logging,
    });
  }

  const url = options.sqlConnectionUrl;
  if (!url) {
    throw new Error(`${options.sqlDialect} requires DATABASE_URL or CI_STORAGE_SQL_CONNECTION_URL`);
  }

  return new Sequelize(url, {
    dialect: options.sqlDialect,
    logging,
    ...(options.sqlConnectionSsl ? { dialectOptions: { ssl: { require: true } } } : {}),
  });
}
