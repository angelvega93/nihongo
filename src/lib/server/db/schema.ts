import { pgTable, serial, integer, text } from 'drizzle-orm/pg-core';

export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export * from './auth.schema';
export * from './fsrs.schema';
export * from './course.schema';
export * from './dictionary.schema';
export * from './kana.schema';
