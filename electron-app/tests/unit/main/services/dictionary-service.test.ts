/**
 * Tests for DictionaryService.
 * Validates custom vocabulary and word replacement functionality.
 * Mirrors CustomVocabularyService.swift and WordReplacementService.swift behavior.
 *
 * Covers:
 * - Vocabulary word CRUD
 * - Word replacement CRUD
 * - Text replacement application
 * - Import/Export
 * - Duplicate handling
 * - Persistence
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DictionaryService } from '../../../../src/main/services/dictionary-service';

describe('DictionaryService', () => {
  let service: DictionaryService;
  let testFilePath: string;

  beforeEach(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voiceink-test-'));
    testFilePath = path.join(tmpDir, 'dictionary.json');
    service = new DictionaryService(testFilePath);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
      const dir = path.dirname(testFilePath);
      if (fs.existsSync(dir)) fs.rmdirSync(dir);
    } catch {
      // Ignore
    }
  });

  describe('Vocabulary Words', () => {
    it('should return empty array initially', () => {
      expect(service.getWords()).toEqual([]);
    });

    it('should add a vocabulary word', () => {
      const word = service.addWord('TypeScript');
      expect(word.word).toBe('TypeScript');
      expect(word.id).toBeDefined();
      expect(word.createdAt).toBeDefined();
    });

    it('should retrieve added words', () => {
      service.addWord('React');
      service.addWord('Electron');
      const words = service.getWords();
      expect(words).toHaveLength(2);
      expect(words.map((w) => w.word)).toContain('React');
      expect(words.map((w) => w.word)).toContain('Electron');
    });

    it('should prevent duplicate words (case-insensitive)', () => {
      service.addWord('TypeScript');
      const dup = service.addWord('typescript');
      expect(service.getWords()).toHaveLength(1);
      expect(dup.word).toBe('TypeScript'); // Returns existing
    });

    it('should delete a word by ID', () => {
      const word = service.addWord('DeleteMe');
      expect(service.deleteWord(word.id)).toBe(true);
      expect(service.getWords()).toHaveLength(0);
    });

    it('should return false when deleting non-existent word', () => {
      expect(service.deleteWord('nonexistent')).toBe(false);
    });
  });

  describe('Word Replacements', () => {
    it('should return empty array initially', () => {
      expect(service.getReplacements()).toEqual([]);
    });

    it('should add a word replacement', () => {
      const rep = service.addReplacement('gonna', 'going to');
      expect(rep.original).toBe('gonna');
      expect(rep.replacement).toBe('going to');
      expect(rep.id).toBeDefined();
    });

    it('should update existing replacement for same original word', () => {
      service.addReplacement('gonna', 'going to');
      service.addReplacement('gonna', 'going to do');
      expect(service.getReplacements()).toHaveLength(1);
      expect(service.getReplacements()[0].replacement).toBe('going to do');
    });

    it('should delete a replacement by ID', () => {
      const rep = service.addReplacement('u', 'you');
      expect(service.deleteReplacement(rep.id)).toBe(true);
      expect(service.getReplacements()).toHaveLength(0);
    });
  });

  describe('applyReplacements()', () => {
    it('should replace words in text', () => {
      service.addReplacement('gonna', 'going to');
      service.addReplacement('wanna', 'want to');

      const result = service.applyReplacements("I'm gonna wanna do this");
      expect(result).toBe("I'm going to want to do this");
    });

    it('should be case-insensitive', () => {
      service.addReplacement('API', 'Application Programming Interface');
      const result = service.applyReplacements('The api is working');
      expect(result).toBe('The Application Programming Interface is working');
    });

    it('should respect word boundaries', () => {
      service.addReplacement('is', 'was');
      const result = service.applyReplacements('This is a test');
      // "This" should NOT be changed, only standalone "is"
      expect(result).toBe('This was a test');
    });

    it('should return unchanged text when no replacements configured', () => {
      const text = 'No replacements here';
      expect(service.applyReplacements(text)).toBe(text);
    });

    it('should handle special characters in replacement patterns', () => {
      service.addReplacement('C++', 'CPlusPlus');
      const result = service.applyReplacements('I love C++ programming');
      expect(result).toBe('I love CPlusPlus programming');
    });
  });

  describe('Import/Export', () => {
    it('should export dictionary data as JSON', () => {
      service.addWord('React');
      service.addReplacement('JS', 'JavaScript');

      const json = service.exportToJSON();
      const parsed = JSON.parse(json);
      expect(parsed.words).toHaveLength(1);
      expect(parsed.replacements).toHaveLength(1);
      expect(parsed.words[0].word).toBe('React');
      expect(parsed.replacements[0].original).toBe('JS');
    });

    it('should import dictionary data from JSON', () => {
      const importData = JSON.stringify({
        words: [
          { id: '1', word: 'Imported', createdAt: new Date().toISOString() },
        ],
        replacements: [
          {
            id: '2',
            original: 'imp',
            replacement: 'imported',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      const result = service.importFromJSON(importData);
      expect(result.wordsAdded).toBe(1);
      expect(result.replacementsAdded).toBe(1);
      expect(service.getWords()).toHaveLength(1);
      expect(service.getReplacements()).toHaveLength(1);
    });

    it('should avoid duplicates during import', () => {
      service.addWord('React');

      const importData = JSON.stringify({
        words: [
          { id: '1', word: 'React', createdAt: new Date().toISOString() },
          { id: '2', word: 'Vue', createdAt: new Date().toISOString() },
        ],
        replacements: [],
      });

      const result = service.importFromJSON(importData);
      expect(result.wordsAdded).toBe(1); // Only Vue is new
      expect(service.getWords()).toHaveLength(2);
    });
  });

  describe('persistence', () => {
    it('should persist data to disk', () => {
      service.addWord('Persistent');
      expect(fs.existsSync(testFilePath)).toBe(true);
    });

    it('should load data from disk on init', () => {
      service.addWord('Saved');
      service.addReplacement('a', 'b');

      const service2 = new DictionaryService(testFilePath);
      expect(service2.getWords()).toHaveLength(1);
      expect(service2.getReplacements()).toHaveLength(1);
    });

    it('should handle corrupted file gracefully', () => {
      fs.writeFileSync(testFilePath, '{bad json', 'utf-8');
      const service2 = new DictionaryService(testFilePath);
      expect(service2.getWords()).toEqual([]);
      expect(service2.getReplacements()).toEqual([]);
    });
  });
});
