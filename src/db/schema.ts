import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  activeScriptIds: text('active_script_ids').notNull(), // JSON array of active scripts
  openedWidgetIds: text('opened_widget_ids').notNull(), // JSON array of open widgets
  widgetCustomizations: text('widget_customizations').notNull(), // JSON serialized object
  activeWallpaperId: text('active_wallpaper_id').notNull(),
  isSystemDarkMode: boolean('is_system_dark_mode').notNull().default(true),
  isPremiumUnlocked: boolean('is_premium_unlocked').notNull().default(false),
  refreshIntervalSec: integer('refresh_interval_sec').notNull().default(25),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
}));
