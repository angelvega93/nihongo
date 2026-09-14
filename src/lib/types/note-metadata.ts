export type VocabularySentence = {
	sentence: string;
	meaning: string;
	furigana: string;
};

export type VocabularyMetadata = {
	word: string;
	word_reading: string;
	word_meaning: string;
	word_furigana: string;
	word_sentences: VocabularySentence[];
};
