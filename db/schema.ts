import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const rsvps = sqliteTable('rsvps', {id:text('id').primaryKey(),camp:text('camp').notNull(),name:text('name').notNull(),email:text('email').notNull(),createdAt:text('created_at').notNull()},t=>[uniqueIndex('camp_email').on(t.camp,t.email)]);
