import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

export interface MigrationContext {
  queryInterface: QueryInterface;
}

export async function up({ queryInterface }: MigrationContext): Promise<void> {
  const tables = await queryInterface.showAllTables();
  if (!tables.some((t) => t.toLowerCase() === 'projects')) return;

  const desc = await queryInterface.describeTable('projects');
  if (!desc.admin_token_hash) {
    await queryInterface.addColumn('projects', 'admin_token_hash', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'sqlite') {
      await queryInterface.sequelize.query(
        `UPDATE projects SET admin_token_hash = token_hash WHERE admin_token_hash = ''`,
      );
    } else {
      await queryInterface.sequelize.query(
        `UPDATE projects SET admin_token_hash = token_hash WHERE admin_token_hash = ''`,
      );
    }
  }
}

export async function down(): Promise<void> {
  // non-destructive legacy patch; no down
}
