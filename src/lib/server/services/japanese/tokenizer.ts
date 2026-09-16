import { createRequire } from 'node:module';
import path from 'node:path';
import {
	toCategory,
	toFuriganaSegments,
	toHiragana,
	type JapaneseToken
} from '$lib/japanese/furigana';

// kuromoji is CommonJS and resolves its dictionary relative to its own files.
const require = createRequire(import.meta.url);

type KuromojiToken = {
	surface_form: string;
	basic_form: string;
	reading?: string;
	pos: string;
	pos_detail_1: string;
};

type KuromojiTokenizer = { tokenize(text: string): KuromojiToken[] };

type KuromojiModule = {
	builder(options: { dicPath: string }): {
		build(callback: (error: Error | null, tokenizer: KuromojiTokenizer) => void): void;
	};
};

/** Path to the IPADIC files shipped inside the kuromoji package. */
function dictionaryPath(): string {
	return path.join(path.dirname(require.resolve('kuromoji')), '..', 'dict') + path.sep;
}

/**
 * Japanese word segmentation with furigana, backed by kuromoji.
 *
 * Building the tokenizer loads ~50MB of dictionary, so it happens once per
 * process and every caller shares the same promise.
 */
export class JapaneseTokenizerService {
	private tokenizer: Promise<KuromojiTokenizer> | null = null;

	/** Build (or reuse) the shared kuromoji tokenizer. */
	private load(): Promise<KuromojiTokenizer> {
		this.tokenizer ??= new Promise<KuromojiTokenizer>((resolve, reject) => {
			const kuromoji = require('kuromoji') as KuromojiModule;
			kuromoji.builder({ dicPath: dictionaryPath() }).build((error, tokenizer) => {
				if (error) reject(error);
				else resolve(tokenizer);
			});
		});

		// A failed build must not be cached, otherwise every later call rejects.
		return this.tokenizer.catch((error) => {
			this.tokenizer = null;
			throw error;
		});
	}

	/** Split `text` into words, each carrying its reading and ruby segments. */
	async tokenize(text: string): Promise<JapaneseToken[]> {
		const trimmed = text.trim();
		if (!trimmed) return [];

		const tokenizer = await this.load();

		return tokenizer.tokenize(trimmed).map((token) => {
			const surface = token.surface_form;
			// kuromoji leaves `reading` out for words missing from the dictionary.
			const reading = token.reading ? toHiragana(token.reading) : '';

			return {
				surface,
				reading,
				baseForm: token.basic_form && token.basic_form !== '*' ? token.basic_form : surface,
				pos: token.pos,
				category: toCategory(token.pos),
				segments: toFuriganaSegments(surface, reading)
			};
		});
	}
}

export const japaneseTokenizerService = new JapaneseTokenizerService();
export default japaneseTokenizerService;
