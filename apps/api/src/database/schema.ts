import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const installedPlugins = sqliteTable('installed_plugins', {
  id: text('id').primaryKey(),
  manifestJson: text('manifest_json').notNull(),
  installedAt: integer('installed_at', { mode: 'timestamp' }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull()
});
