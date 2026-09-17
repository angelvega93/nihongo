CREATE TABLE "task" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"term_id" text,
	"due" bigint NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"elapsed_days" integer NOT NULL,
	"scheduled_days" integer NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"reps" integer NOT NULL,
	"lapses" integer NOT NULL,
	"state" smallint NOT NULL,
	"last_review" bigint,
	"suspended" smallint DEFAULT 0 NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cards_user_id_term_id_unique" UNIQUE("user_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" smallint NOT NULL,
	"fsrs" jsonb,
	"card_limit" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decks_cards" (
	"deck_id" integer NOT NULL,
	"card_id" integer NOT NULL,
	"source" text,
	"source_id" text NOT NULL,
	CONSTRAINT "decks_cards_deck_id_card_id_unique" UNIQUE("deck_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" smallint DEFAULT 0 NOT NULL,
	"question" text,
	"answer" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rev_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_id" integer NOT NULL,
	"grade" smallint NOT NULL,
	"state" smallint NOT NULL,
	"due" bigint NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"elapsed_days" integer NOT NULL,
	"last_elapsed_days" integer NOT NULL,
	"scheduled_days" integer NOT NULL,
	"learning_steps" integer NOT NULL,
	"review" bigint NOT NULL,
	"duration" integer NOT NULL,
	"offset" integer DEFAULT 0 NOT NULL,
	"deleted" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"glyph" text,
	"level" text DEFAULT 'N5' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"published" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_notes" (
	"lesson_id" integer NOT NULL,
	"note_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "lesson_notes_lesson_id_note_id_pk" PRIMARY KEY("lesson_id","note_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"label" text NOT NULL,
	"correct" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"explanation" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_course_enrollment" (
	"user_id" text NOT NULL,
	"course_id" integer NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"last_lesson_id" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_course_enrollment_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "user_lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" integer NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "dictionary_kanji" (
	"id" text PRIMARY KEY NOT NULL,
	"char" text NOT NULL,
	"readings" jsonb DEFAULT '{"pinyin":[],"korean_r":[],"korean_h":[],"vietnam":[],"on":[],"kun":[]}'::jsonb NOT NULL,
	"meanings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"strokes" smallint,
	"on_readings" text[] DEFAULT '{}' NOT NULL,
	"kun_readings" text[] DEFAULT '{}' NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dictionary_sentences" (
	"id" text PRIMARY KEY NOT NULL,
	"japanese" text NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dictionary_terms" (
	"id" text PRIMARY KEY NOT NULL,
	"dictionary" text NOT NULL,
	"headword" text NOT NULL,
	"expressions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"readings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"senses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pitch" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"frequencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"readings_text" text[] DEFAULT '{}' NOT NULL,
	"expressions_text" text[] DEFAULT '{}' NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks_cards" ADD CONSTRAINT "decks_cards_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks_cards" ADD CONSTRAINT "decks_cards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rev_log" ADD CONSTRAINT "rev_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rev_log" ADD CONSTRAINT "rev_log_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_units" ADD CONSTRAINT "course_units_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_notes" ADD CONSTRAINT "lesson_notes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_notes" ADD CONSTRAINT "lesson_notes_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_course_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."course_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_options" ADD CONSTRAINT "quiz_options_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_course_enrollment" ADD CONSTRAINT "user_course_enrollment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_course_enrollment" ADD CONSTRAINT "user_course_enrollment_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_course_enrollment" ADD CONSTRAINT "user_course_enrollment_last_lesson_id_lessons_id_fk" FOREIGN KEY ("last_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "course_units_course_id_idx" ON "course_units" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_slug_idx" ON "courses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "courses_level_idx" ON "courses" USING btree ("level");--> statement-breakpoint
CREATE INDEX "lesson_notes_note_id_idx" ON "lesson_notes" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "lessons_unit_id_idx" ON "lessons" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "quiz_options_question_id_idx" ON "quiz_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_lesson_id_idx" ON "quiz_questions" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "user_course_enrollment_course_id_idx" ON "user_course_enrollment" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "user_lesson_progress_lesson_id_idx" ON "user_lesson_progress" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "dictionary_kanji_char_idx" ON "dictionary_kanji" USING btree ("char");--> statement-breakpoint
CREATE INDEX "dictionary_kanji_on_readings_idx" ON "dictionary_kanji" USING gin ("on_readings");--> statement-breakpoint
CREATE INDEX "dictionary_kanji_kun_readings_idx" ON "dictionary_kanji" USING gin ("kun_readings");--> statement-breakpoint
CREATE INDEX "dictionary_kanji_search_idx" ON "dictionary_kanji" USING gin (to_tsvector('simple', "search_text"));--> statement-breakpoint
CREATE INDEX "dictionary_kanji_strokes_idx" ON "dictionary_kanji" USING btree ("strokes");--> statement-breakpoint
CREATE INDEX "dictionary_sentences_search_idx" ON "dictionary_sentences" USING gin (to_tsvector('simple', "search_text"));--> statement-breakpoint
CREATE INDEX "dictionary_terms_readings_text_idx" ON "dictionary_terms" USING gin ("readings_text");--> statement-breakpoint
CREATE INDEX "dictionary_terms_expressions_text_idx" ON "dictionary_terms" USING gin ("expressions_text");--> statement-breakpoint
CREATE INDEX "dictionary_terms_search_idx" ON "dictionary_terms" USING gin (to_tsvector('simple', "search_text"));--> statement-breakpoint
CREATE INDEX "dictionary_terms_headword_idx" ON "dictionary_terms" USING btree ("headword");--> statement-breakpoint
CREATE INDEX "dictionary_terms_headword_prefix_idx" ON "dictionary_terms" USING btree ("headword" text_pattern_ops);--> statement-breakpoint
CREATE INDEX "dictionary_terms_frequency_rank_idx" ON "dictionary_terms" USING btree ((("frequencies"->0->>'rank')::int));--> statement-breakpoint
CREATE INDEX "dictionary_terms_dictionary_idx" ON "dictionary_terms" USING btree ("dictionary");