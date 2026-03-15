/**
 * Vocabulary word for custom dictionary.
 * Mirrors VoiceInk/Models/VocabularyWord.swift.
 */
export interface VocabularyWord {
  id: string;
  word: string;
  createdAt: string; // ISO 8601
}

/**
 * Word replacement entry for automatic text replacement.
 * Mirrors VoiceInk/Models/WordReplacement.swift.
 */
export interface WordReplacement {
  id: string;
  original: string;
  replacement: string;
  createdAt: string; // ISO 8601
}

export function createVocabularyWord(word: string, id?: string): VocabularyWord {
  return {
    id: id ?? generateId(),
    word,
    createdAt: new Date().toISOString(),
  };
}

export function createWordReplacement(
  original: string,
  replacement: string,
  id?: string
): WordReplacement {
  return {
    id: id ?? generateId(),
    original,
    replacement,
    createdAt: new Date().toISOString(),
  };
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
