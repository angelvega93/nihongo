import { query } from '$app/server';
import { z } from 'zod';
import { japaneseTokenizerService } from '$lib/server/services/japanese/tokenizer';
import type { JapaneseToken } from './furigana';

/** Upper bound on the text a single call may tokenize. */
const maxLength = 2000;

/** Tokenize japanese text into words with readings and furigana segments. */
export const tokenizeJapanese = query(
	z.string().max(maxLength),
	async (text): Promise<JapaneseToken[]> => japaneseTokenizerService.tokenize(text)
);
