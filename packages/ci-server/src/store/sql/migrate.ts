import { Umzug, SequelizeStorage } from 'umzug';
import type { Sequelize } from 'sequelize';
import type { StorageOptions } from '../storage-options.js';
import * as initial from './migrations/2025032801-initial.js';
import * as legacyAdmin from './migrations/2025032802-legacy-admin-token.js';

const MIGRATIONS = [
  {
    name: '2025032801-initial',
    up: (ctx: initial.MigrationContext) => initial.up(ctx),
    down: (ctx: initial.MigrationContext) => initial.down(ctx),
  },
  {
    name: '2025032802-legacy-admin-token',
    up: (ctx: legacyAdmin.MigrationContext) => legacyAdmin.up(ctx),
    down: () => legacyAdmin.down(),
  },
];

export async function runMigrations(
  sequelize: Sequelize,
  options: StorageOptions,
): Promise<void> {
  if (options.sqlDangerouslyResetDatabase) {
    await sequelize.drop({ cascade: true });
  }

  const queryInterface = sequelize.getQueryInterface();
  const context: initial.MigrationContext = { queryInterface };

  const umzug = new Umzug({
    migrations: MIGRATIONS.map((m) => ({
      name: m.name,
      up: async () => m.up(context),
      down: async () => m.down(context),
    })),
    context,
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined,
  });

  await umzug.up();
}
