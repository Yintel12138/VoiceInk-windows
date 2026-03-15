/**
 * DictionaryService - Manages custom vocabulary words and word replacements.
 * Mirrors VoiceInk/Services/CustomVocabularyService.swift and WordReplacementService.swift.
 *
 * Persists vocabulary data as JSON for cross-platform compatibility.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  VocabularyWord,
  WordReplacement,
  createVocabularyWord,
  createWordReplacement,
} from '../../shared/models/dictionary';

interface DictionaryData {
  words: VocabularyWord[];
  replacements: WordReplacement[];
}

export class DictionaryService {
  private data: DictionaryData = { words: [], replacements: [] };
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.loadFromDisk();
  }

  // --- Vocabulary Words ---

  getWords(): VocabularyWord[] {
    return [...this.data.words];
  }

  addWord(word: string): VocabularyWord {
    // Check for duplicates (case-insensitive)
    const existing = this.data.words.find(
      (w) => w.word.toLowerCase() === word.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    const vocabularyWord = createVocabularyWord(word);
    this.data.words.push(vocabularyWord);
    this.saveToDisk();
    return vocabularyWord;
  }

  deleteWord(id: string): boolean {
    const index = this.data.words.findIndex((w) => w.id === id);
    if (index === -1) return false;

    this.data.words.splice(index, 1);
    this.saveToDisk();
    return true;
  }

  // --- Word Replacements ---

  getReplacements(): WordReplacement[] {
    return [...this.data.replacements];
  }

  addReplacement(original: string, replacement: string): WordReplacement {
    // Check for duplicates
    const existing = this.data.replacements.find(
      (r) => r.original.toLowerCase() === original.toLowerCase()
    );
    if (existing) {
      // Update existing replacement
      existing.replacement = replacement;
      this.saveToDisk();
      return existing;
    }

    const wordReplacement = createWordReplacement(original, replacement);
    this.data.replacements.push(wordReplacement);
    this.saveToDisk();
    return wordReplacement;
  }

  deleteReplacement(id: string): boolean {
    const index = this.data.replacements.findIndex((r) => r.id === id);
    if (index === -1) return false;

    this.data.replacements.splice(index, 1);
    this.saveToDisk();
    return true;
  }

  /**
   * Apply word replacements to transcribed text.
   * Case-insensitive matching with word boundary awareness.
   */
  applyReplacements(text: string): string {
    let result = text;
    for (const { original, replacement } of this.data.replacements) {
      // Escape special regex characters for safe pattern construction
      const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use word boundary when the pattern starts/ends with word characters,
      // otherwise use lookahead/lookbehind for non-word chars (e.g., C++)
      const startsWithWord = /^\w/.test(original);
      const endsWithWord = /\w$/.test(original);
      const prefix = startsWithWord ? '\\b' : '(?<=\\s|^)';
      const suffix = endsWithWord ? '\\b' : '(?=\\s|$)';
      const regex = new RegExp(`${prefix}${escaped}${suffix}`, 'gi');
      result = result.replace(regex, replacement);
    }
    return result;
  }

  /**
   * Export dictionary data as JSON string.
   * Mirrors DictionaryImportExportService.swift.
   */
  exportToJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import dictionary data from JSON string.
   * Merges with existing data, avoiding duplicates.
   */
  importFromJSON(json: string): { wordsAdded: number; replacementsAdded: number } {
    const imported: DictionaryData = JSON.parse(json);
    let wordsAdded = 0;
    let replacementsAdded = 0;

    if (imported.words) {
      for (const word of imported.words) {
        const existing = this.data.words.find(
          (w) => w.word.toLowerCase() === word.word.toLowerCase()
        );
        if (!existing) {
          this.data.words.push(word);
          wordsAdded++;
        }
      }
    }

    if (imported.replacements) {
      for (const rep of imported.replacements) {
        const existing = this.data.replacements.find(
          (r) => r.original.toLowerCase() === rep.original.toLowerCase()
        );
        if (!existing) {
          this.data.replacements.push(rep);
          replacementsAdded++;
        }
      }
    }

    this.saveToDisk();
    return { wordsAdded, replacementsAdded };
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch {
      this.data = { words: [], replacements: [] };
    }
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // Silently fail
    }
  }
}
