import { fsrs, State, type CardInput, type FSRSParameters, type IPreview } from 'ts-fsrs';

/** Memory-state metrics shown to the user (only meaningful for Review cards). */
export type DSR = {
	/** Difficulty */
	D: number;
	/** Stability (days) */
	S: number;
	/** Retrievability, formatted as a percentage string */
	R: string;
};

export type ReviewSnapshot = {
	/** Preview of the next interval for each grade. */
	preview: IPreview;
	/** Difficulty / Stability / Retrievability of the current card. */
	DSR: DSR | undefined;
};

/**
 * Build the scheduling preview for a card using the deck's own FSRS parameters,
 * plus the current DSR metrics when the card is already in the Review state.
 */
export function createReviewSnapshot(
	card: CardInput,
	params: FSRSParameters | null | undefined,
	now: number | Date = new Date()
): ReviewSnapshot {
	let DSR: DSR | undefined;
	if (card.state === State.Review) {
		const r = fsrs().get_retrievability(card, now, true);
		DSR = {
			D: card.difficulty,
			S: card.stability,
			R: String(r)
		};
	}

	const f = fsrs(params ?? undefined);
	return {
		preview: f.repeat(card, now),
		DSR
	};
}
