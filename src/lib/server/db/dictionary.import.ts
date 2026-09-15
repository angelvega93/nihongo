/**
 * Imports the dictionary NDJSON dump into Postgres.
 *
 * Usage:
 *   pnpm db:import:dictionary <ruta-al-archivo.ndjson>
 *
 * The dump interleaves three kinds of lines (`term`, `sentence`, `kanji`) with
 * very different shapes, so each kind is routed to its own table. Rows are
 * streamed and flushed in batches through `COPY ... FROM STDIN`, which is the
 * only sane way to load millions of rows. `COPY` cannot upsert, so every batch
 * lands in a temporary table that is then merged with `ON CONFLICT (id) DO
 * UPDATE`, keyed on the dump's globally unique id. Re-running the import is
 * therefore safe and idempotent.
 *
 * Runs with plain `node --env-file=.env`, so it must not use `$lib` aliases and
 * must import relative paths with their `.ts` extension.
 */
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import postgres from 'postgres';
import {
	DICTIONARY_LOCALES,
	DictionaryHeaderKind,
	DictionaryKind,
	flattenGlosses,
	type DictionaryEntry,
	type DictionaryKanjiPayload,
	type DictionaryLine,
	type DictionarySentencePayload,
	type DictionaryTermPayload
} from '../../types/dictionary.ts';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const source = process.argv[2];
if (!source) {
	throw new Error('Usage: pnpm db:import:dictionary <ruta-al-archivo.ndjson>');
}

/** How many rows to buffer per table before flushing a COPY batch. */
const batchSize = Number(process.env.DICTIONARY_BATCH_SIZE ?? 5000);

/** Dump format version this importer understands. */
const expectedSchemaVersion = 4;

// ---------------------------------------------------------------------------
// CSV / PostgreSQL literal serialisation
// ---------------------------------------------------------------------------

/**
 * Encodes a single CSV cell. `null` becomes an unquoted empty field (which
 * `COPY ... CSV` interprets as NULL); every other value is quoted so embedded
 * commas, quotes and newlines survive.
 */
function csvCell(value: string | null): string {
	if (value === null) return '';
	return `"${value.replace(/"/g, '""')}"`;
}

/** Encodes a full CSV row, terminated by a newline. */
function csvRow(cells: (string | null)[]): string {
	return cells.map(csvCell).join(',') + '\n';
}

/** Serialises a value for a `jsonb` column. */
function jsonCell(value: unknown): string {
	return JSON.stringify(value ?? null);
}

/**
 * Serialises a `text[]` column using the PostgreSQL array literal syntax. Every
 * element is quoted so separators and braces inside the text are preserved.
 */
function arrayCell(values: string[]): string {
	if (values.length === 0) return '{}';
	const parts = values.map((value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
	return `{${parts.join(',')}}`;
}

// ---------------------------------------------------------------------------
// Search text builders
// ---------------------------------------------------------------------------

/** Every gloss of a term, deduplicated and joined for full-text search. */
function termSearchText(entry: DictionaryTermPayload): string {
	const glosses = new Set<string>();
	for (const sense of entry.senses ?? []) {
		for (const gloss of flattenGlosses(sense.glosses)) glosses.add(gloss);
	}
	return [...glosses].join(' ');
}

/** The Japanese sentence plus every translation, joined for full-text search. */
function sentenceSearchText(entry: DictionarySentencePayload): string {
	const parts = [entry.japanese];
	for (const locale of DICTIONARY_LOCALES) {
		const translated = entry.translations?.[locale];
		if (translated) parts.push(translated);
	}
	return parts.join(' ');
}

/** Every meaning of a kanji plus the character itself, joined for search. */
function kanjiSearchText(entry: DictionaryKanjiPayload): string {
	const meanings = new Set<string>(flattenGlosses(entry.meanings));
	return [entry.char, ...meanings].join(' ');
}

/** The empty readings object used when a kanji line omits the field. */
const EMPTY_KANJI_READINGS = {
	pinyin: [],
	korean_r: [],
	korean_h: [],
	vietnam: [],
	on: [],
	kun: []
};

// ---------------------------------------------------------------------------
// Import targets
// ---------------------------------------------------------------------------

/** Describes how one NDJSON kind maps onto a table. */
type Target = {
	/** Temporary staging table used to upsert a COPY batch. */
	temp: string;
	/** Destination table. */
	table: string;
	/** Columns written by the importer, in COPY order. */
	columns: string[];
	/** Serialises one entry of this kind into the matching CSV row. */
	serialise: (entry: DictionaryEntry) => string;
};

const targets: Record<DictionaryKind, Target> = {
	[DictionaryKind.Term]: {
		temp: 'tmp_dictionary_terms',
		table: 'dictionary_terms',
		columns: [
			'id',
			'dictionary',
			'headword',
			'expressions',
			'readings',
			'senses',
			'pitch',
			'frequencies',
			'readings_text',
			'expressions_text',
			'search_text'
		],
		serialise: (raw) => {
			const entry = raw as DictionaryTermPayload;
			return csvRow([
				entry.id,
				entry.dictionary,
				entry.headword,
				jsonCell(entry.expressions ?? []),
				jsonCell(entry.readings ?? []),
				jsonCell(entry.senses ?? []),
				jsonCell(entry.pitch ?? []),
				jsonCell(entry.frequencies ?? []),
				arrayCell((entry.readings ?? []).map((reading) => reading.text)),
				arrayCell((entry.expressions ?? []).map((expression) => expression.text)),
				termSearchText(entry)
			]);
		}
	},
	[DictionaryKind.Sentence]: {
		temp: 'tmp_dictionary_sentences',
		table: 'dictionary_sentences',
		columns: ['id', 'japanese', 'translations', 'search_text'],
		serialise: (raw) => {
			const entry = raw as DictionarySentencePayload;
			return csvRow([
				entry.id,
				entry.japanese,
				jsonCell(entry.translations ?? {}),
				sentenceSearchText(entry)
			]);
		}
	},
	[DictionaryKind.Kanji]: {
		temp: 'tmp_dictionary_kanji',
		table: 'dictionary_kanji',
		columns: [
			'id',
			'char',
			'readings',
			'meanings',
			'strokes',
			'on_readings',
			'kun_readings',
			'search_text'
		],
		serialise: (raw) => {
			const entry = raw as DictionaryKanjiPayload;
			const readings = entry.readings ?? EMPTY_KANJI_READINGS;
			return csvRow([
				entry.id,
				entry.char,
				jsonCell(readings),
				jsonCell(entry.meanings ?? {}),
				entry.strokes === undefined || entry.strokes === null ? null : String(entry.strokes),
				arrayCell(readings.on ?? []),
				arrayCell(readings.kun ?? []),
				kanjiSearchText(entry)
			]);
		}
	}
};

/**
 * Loads one batch into the destination table: stages the rows into a temp table
 * via COPY, then merges them with an upsert so re-imports are safe.
 */
async function flush(sql: postgres.Sql, target: Target, rows: string[]): Promise<void> {
	if (rows.length === 0) return;

	const columns = sql(target.columns);

	await sql`create temp table if not exists ${sql(target.temp)} (like ${sql(target.table)} including defaults)`;
	await sql`truncate ${sql(target.temp)}`;

	const copy = sql`copy ${sql(target.temp)} (${columns}) from stdin with (format csv)`;
	await pipeline(Readable.from(rows), await copy.writable());

	// postgres.js splices nested fragment arrays verbatim, so the separators are
	// emitted as their own fragments. `updated_at` is set by hand because
	// Drizzle's `$onUpdate` only fires through the query builder, not raw SQL.
	const assignments = [
		...target.columns
			.filter((column) => column !== 'id')
			.map((column) => sql`${sql(column)} = excluded.${sql(column)}`),
		sql`${sql('updated_at')} = now()`
	].flatMap((fragment, index) => [index > 0 ? sql`, ` : sql``, fragment]);

	await sql`
		insert into ${sql(target.table)} (${columns})
		select ${columns} from ${sql(target.temp)}
		on conflict (${sql('id')}) do update set ${assignments}
	`;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/** Buffered CSV rows per kind, flushed once they reach `batchSize`. */
const buffers: Record<DictionaryKind, string[]> = {
	[DictionaryKind.Term]: [],
	[DictionaryKind.Sentence]: [],
	[DictionaryKind.Kanji]: []
};

const counts: Record<DictionaryKind, number> = {
	[DictionaryKind.Term]: 0,
	[DictionaryKind.Sentence]: 0,
	[DictionaryKind.Kanji]: 0
};

async function run(): Promise<void> {
	const sql = postgres(DATABASE_URL as string);

	// Pin a single connection: temp tables are per-session, so every COPY and
	// upsert of this import must happen on the same one.
	const conn = await sql.reserve();

	let invalid = 0;
	try {
		const lines = createInterface({
			input: createReadStream(source as string, { encoding: 'utf8' }),
			crlfDelay: Infinity
		});

		for await (const line of lines) {
			if (line.length === 0) continue;

			let parsed: DictionaryLine;
			try {
				parsed = JSON.parse(line) as DictionaryLine;
			} catch {
				invalid += 1;
				if (invalid <= 5) console.warn(`Línea inválida ignorada: ${line.slice(0, 120)}`);
				continue;
			}

			// The first line is metadata about the dump, not an entry.
			if (parsed.type === DictionaryHeaderKind) {
				console.log(
					`Dump ${parsed.source} (schema v${parsed.schemaVersion}), idiomas: ${parsed.languages.join(', ')}.`
				);
				if (parsed.schemaVersion !== expectedSchemaVersion) {
					console.warn(
						`Se esperaba el esquema v${expectedSchemaVersion} pero el archivo es v${parsed.schemaVersion}; algunas columnas pueden quedar vacías.`
					);
				}
				continue;
			}

			const entry = parsed as DictionaryEntry;
			const kind = entry.type;
			const target = targets[kind];
			if (!target) {
				invalid += 1;
				if (invalid <= 5) console.warn(`Tipo desconocido ignorado: ${String(kind)}`);
				continue;
			}

			buffers[kind].push(target.serialise(entry));
			counts[kind] += 1;

			if (buffers[kind].length >= batchSize) {
				await flush(conn, target, buffers[kind]);
				buffers[kind] = [];
			}
		}

		// Flush whatever is left over.
		for (const kind of Object.values(DictionaryKind)) {
			await flush(conn, targets[kind], buffers[kind]);
			buffers[kind] = [];
		}

		for (const kind of Object.values(DictionaryKind)) {
			await conn`drop table if exists ${conn(targets[kind].temp)}`;
		}
		console.log(
			`Importados ${counts.term} términos, ${counts.sentence} oraciones y ${counts.kanji} kanji.`
		);
		if (invalid > 0) console.warn(`Se ignoraron ${invalid} líneas inválidas.`);
	} finally {
		await conn.release();
		await sql.end();
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
