import { relations } from 'drizzle-orm';
import {
	index,
	integer,
	pgTable,
	primaryKey,
	serial,
	smallint,
	text,
	timestamp,
	unique
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema.ts';
import { KanaMastery } from '../../kana/progress.ts';
import type { KanaScript } from '../../kana/data.ts';

/**
 * Per-user progress on a single kana. The kana catalog itself is static (see
 * `$lib/kana/data.ts`), so only the counters and mastery level are stored.
 *
 * `kanaId` is the romaji of the kana (e.g. `ka`), which is unique inside a
 * script but shared between hiragana and katakana, hence the composite key.
 */
export const kanaProgress = pgTable(
	'kana_progress',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		script: text('script').$type<KanaScript>().notNull(),
		kanaId: text('kana_id').notNull(),
		correct: integer('correct').notNull().default(0),
		attempts: integer('attempts').notNull().default(0),
		streak: integer('streak').notNull().default(0),
		mastery: smallint('mastery').$type<KanaMastery>().notNull().default(KanaMastery.New),
		lastPracticedAt: timestamp('last_practiced_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		unique('kana_progress_user_script_kana_idx').on(table.userId, table.script, table.kanaId),
		index('kana_progress_user_id_idx').on(table.userId)
	]
);

export const kanaProgressRelations = relations(kanaProgress, ({ one }) => ({
	user: one(user, {
		fields: [kanaProgress.userId],
		references: [user.id]
	})
}));

/**
 * Per-user set of kana the user has enabled for free practice. The kana
 * catalog itself is static (see `$lib/kana/data.ts`), so only the composite
 * key is stored; a row means "enabled", its absence means "disabled".
 *
 * Kana are enabled automatically when their lesson is completed for the first
 * time, and can also be toggled manually from the selection dialog.
 */
export const kanaEnabled = pgTable(
	'kana_enabled',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		script: text('script').$type<KanaScript>().notNull(),
		kanaId: text('kana_id').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.script, table.kanaId] }),
		index('kana_enabled_user_id_idx').on(table.userId)
	]
);

export const kanaEnabledRelations = relations(kanaEnabled, ({ one }) => ({
	user: one(user, {
		fields: [kanaEnabled.userId],
		references: [user.id]
	})
}));

/**
 * Per-user completion of a guided kana lesson. The lesson catalog itself is
 * static (see `$lib/kana/lessons.ts`), so only the lesson id and status are
 * stored; `lessonSlug` is the stable id of the lesson.
 */
export const kanaLessonProgress = pgTable(
	'kana_lesson_progress',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		lessonSlug: text('lesson_slug').notNull(),
		status: smallint('status').notNull().default(0),
		completedAt: timestamp('completed_at'),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.lessonSlug] }),
		index('kana_lesson_progress_user_id_idx').on(table.userId)
	]
);

export const kanaLessonProgressRelations = relations(kanaLessonProgress, ({ one }) => ({
	user: one(user, {
		fields: [kanaLessonProgress.userId],
		references: [user.id]
	})
}));
