import { bigint, doublePrecision, integer, jsonb, pgTable, serial, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  type: smallint("type").default(0).notNull(), // TODO: Define the possible note types (e.g., vocabulary, grammar, kanji)
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const decks = pgTable("decks", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: smallint("type").notNull(),
  fsrs: jsonb("fsrs"),
  cardLimit: jsonb("card_limit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  due: bigint("due", { mode: "number" }).notNull(),
  stability: doublePrecision("stability").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  elapsedDays: integer("elapsed_days").notNull(),
  scheduledDays: integer("scheduled_days").notNull(),
  reps: integer("reps").notNull(),
  lapses: integer("lapses").notNull(),
  state: smallint("state").notNull(),
  lastReview: bigint("last_review", { mode: "number" }),
  suspended: smallint("suspended").default(0).notNull(),
  deleted: smallint("deleted").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const revLog = pgTable("rev_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  cardId: integer("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  grade: smallint("grade").notNull(),
  state: smallint("state").notNull(),
  due: bigint({ mode: "number" }).notNull(),
  stability: doublePrecision("stability").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  elapsedDays: integer("elapsed_days").notNull(),
  lastElapsedDays: integer("last_elapsed_days").notNull(),
  scheduledDays: integer("scheduled_days").notNull(),
  review: bigint({ mode: "number" }).notNull(),
  duration: integer("duration").notNull(),
  offset: integer("offset").default(0).notNull(),
});

