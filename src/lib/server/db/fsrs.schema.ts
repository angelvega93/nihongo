import {
	bigint,
	doublePrecision,
	integer,
	jsonb,
	pgTable,
	serial,
	smallint,
	text,
	timestamp
} from 'drizzle-orm/pg-core';
import type { FSRSParameters } from 'ts-fsrs';
import { z } from 'zod';
import { user } from './auth.schema.ts';

export const NoteType = {
	Vocabulary: 1,
	Grammar: 2,
	Kanji: 3
} as const;

export const cardLimitSchema = z.object({
	new: z.number().min(0).optional().default(50),
	review: z.number().min(0).optional().default(Number.MAX_SAFE_INTEGER),
	learning: z.number().min(0).optional().default(Number.MAX_SAFE_INTEGER),
	suspended: z.number().min(1).optional().default(8)
});

export type CardLimit = z.infer<typeof cardLimitSchema>;

export const notes = pgTable('notes', {
	id: serial('id').primaryKey(),
	type: smallint('type').default(0).notNull(),
	question: text('question'),
	answer: text('answer'),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const decks = pgTable('decks', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	type: smallint('type').notNull(),
	// FSRS parameters for this deck, including learning_steps / relearning_steps.
	fsrs: jsonb('fsrs').$type<FSRSParameters>(),
	cardLimit: jsonb('card_limit').$type<CardLimit>(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const cards = pgTable('cards', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	deckId: integer('deck_id')
		.notNull()
		.references(() => decks.id, { onDelete: 'cascade' }),
	noteId: integer('note_id')
		.notNull()
		.references(() => notes.id, { onDelete: 'cascade' }),
	due: bigint('due', { mode: 'number' }).notNull(),
	stability: doublePrecision('stability').notNull(),
	difficulty: doublePrecision('difficulty').notNull(),
	elapsedDays: integer('elapsed_days').notNull(),
	scheduledDays: integer('scheduled_days').notNull(),
	learningSteps: integer('learning_steps').default(0).notNull(),
	reps: integer('reps').notNull(),
	lapses: integer('lapses').notNull(),
	state: smallint('state').notNull(),
	lastReview: bigint('last_review', { mode: 'number' }),
	suspended: smallint('suspended').default(0).notNull(),
	deleted: smallint('deleted').default(0).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const revLog = pgTable('rev_log', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	cardId: integer('card_id')
		.notNull()
		.references(() => cards.id, { onDelete: 'cascade' }),
	grade: smallint('grade').notNull(),
	state: smallint('state').notNull(),
	due: bigint({ mode: 'number' }).notNull(),
	stability: doublePrecision('stability').notNull(),
	difficulty: doublePrecision('difficulty').notNull(),
	elapsedDays: integer('elapsed_days').notNull(),
	lastElapsedDays: integer('last_elapsed_days').notNull(),
	scheduledDays: integer('scheduled_days').notNull(),
	learningSteps: integer('learning_steps').notNull(),
	review: bigint({ mode: 'number' }).notNull(),
	duration: integer('duration').notNull(),
	offset: integer('offset').default(0).notNull(),
	deleted: smallint('deleted').default(0).notNull()
});
