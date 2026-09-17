import { getRequestEvent, query } from '$app/server';
import type { FsrsCardRow } from '$lib/fsrs/card';
import { db } from '$lib/server/db';
import { cards } from '$lib/server/db/schema';
import { japaneseTokenizerService } from '$lib/server/services/japanese/tokenizer';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { JapaneseToken } from './furigana';

/** Upper bound on the text a single call may tokenize. */
const maxLength = 2000;

function toFsrsCardRow(card: typeof cards.$inferSelect): FsrsCardRow {
	return {
		due: card.due,
		stability: card.stability,
		difficulty: card.difficulty,
		elapsedDays: card.elapsedDays,
		scheduledDays: card.scheduledDays,
		learningSteps: card.learningSteps,
		reps: card.reps,
		lapses: card.lapses,
		state: card.state,
		lastReview: card.lastReview
	};
}

/** Tokenize japanese text into words with readings and furigana segments. */
export const tokenizeJapanese = query(
	z.string().max(maxLength),
	async (text): Promise<JapaneseToken[]> => {
		const { locals } = getRequestEvent();
		const userId = locals.user?.id;
		if (!userId) error(401, { message: 'No autenticado' });

		const tokenized = await japaneseTokenizerService.tokenize(text)
		const termsSet = new Set<string>();
		for (const token of tokenized) {
			if (token.category !== 'verb' && token.category !== 'noun') continue;
			termsSet.add(`vocab:${token.baseForm}`);
		}

		const cards = await db.query.cards.findMany({
			where: (cards, { inArray, eq, and }) => and(inArray(cards.termId, Array.from(termsSet)), eq(cards.userId, userId))
		});


		const newTokenized = tokenized.map(token => {
			if (token.category !== 'verb' && token.category !== 'noun') return token;
			const card = cards.find(card => card.termId === `vocab:${token.baseForm}`);
			return {
				...token,
				card: card && toFsrsCardRow(card)
			};
		});

		return newTokenized;
	}
);
