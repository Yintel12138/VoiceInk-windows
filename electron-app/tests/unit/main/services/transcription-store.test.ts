/**
 * Tests for TranscriptionStore.
 * Validates the transcription data persistence that replaces SwiftData.
 *
 * Covers:
 * - CRUD operations
 * - Sorting and retrieval
 * - Cleanup/retention
 * - Persistence to/from disk
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TranscriptionStore } from '../../../../src/main/services/transcription-store';

describe('TranscriptionStore', () => {
  let store: TranscriptionStore;
  let testFilePath: string;

  beforeEach(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voiceink-test-'));
    testFilePath = path.join(tmpDir, 'transcriptions.json');
    store = new TranscriptionStore(testFilePath);
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

  describe('add()', () => {
    it('should add a transcription with text', () => {
      const t = store.add('Hello, world!');
      expect(t.text).toBe('Hello, world!');
      expect(t.id).toBeDefined();
      expect(t.timestamp).toBeDefined();
      expect(t.transcriptionStatus).toBe('pending');
    });

    it('should add a transcription with overrides', () => {
      const t = store.add('Test', {
        duration: 5.5,
        transcriptionModelName: 'whisper-base',
        transcriptionStatus: 'completed',
      });
      expect(t.text).toBe('Test');
      expect(t.duration).toBe(5.5);
      expect(t.transcriptionModelName).toBe('whisper-base');
      expect(t.transcriptionStatus).toBe('completed');
    });

    it('should assign unique IDs to each transcription', () => {
      const t1 = store.add('First');
      const t2 = store.add('Second');
      expect(t1.id).not.toBe(t2.id);
    });
  });

  describe('getAll()', () => {
    it('should return empty array when no transcriptions exist', () => {
      expect(store.getAll()).toEqual([]);
    });

    it('should return all transcriptions sorted by timestamp descending', () => {
      const t1 = store.add('First', { timestamp: '2024-01-01T00:00:00.000Z' });
      const t2 = store.add('Second', { timestamp: '2024-06-15T00:00:00.000Z' });
      const t3 = store.add('Third', { timestamp: '2024-03-10T00:00:00.000Z' });

      const all = store.getAll(true);
      expect(all[0].id).toBe(t2.id);
      expect(all[1].id).toBe(t3.id);
      expect(all[2].id).toBe(t1.id);
    });

    it('should return unsorted when sortDescending is false', () => {
      store.add('First', { timestamp: '2024-01-01T00:00:00.000Z' });
      store.add('Second', { timestamp: '2024-06-15T00:00:00.000Z' });

      const all = store.getAll(false);
      expect(all[0].text).toBe('First');
      expect(all[1].text).toBe('Second');
    });
  });

  describe('getById()', () => {
    it('should find a transcription by ID', () => {
      const t = store.add('Find me');
      const found = store.getById(t.id);
      expect(found).toBeDefined();
      expect(found!.text).toBe('Find me');
    });

    it('should return undefined for non-existent ID', () => {
      expect(store.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('update()', () => {
    it('should update a transcription', () => {
      const t = store.add('Original');
      const updated = store.update(t.id, {
        text: 'Updated',
        enhancedText: 'AI Enhanced',
        transcriptionStatus: 'completed',
      });

      expect(updated).toBeDefined();
      expect(updated!.text).toBe('Updated');
      expect(updated!.enhancedText).toBe('AI Enhanced');
      expect(updated!.transcriptionStatus).toBe('completed');
    });

    it('should return undefined for non-existent ID', () => {
      expect(store.update('nonexistent', { text: 'No' })).toBeUndefined();
    });

    it('should preserve non-updated fields', () => {
      const t = store.add('Original', { duration: 10 });
      store.update(t.id, { text: 'Updated' });

      const found = store.getById(t.id);
      expect(found!.duration).toBe(10);
    });
  });

  describe('delete()', () => {
    it('should delete a transcription by ID', () => {
      const t = store.add('Delete me');
      expect(store.delete(t.id)).toBe(true);
      expect(store.getById(t.id)).toBeUndefined();
      expect(store.count()).toBe(0);
    });

    it('should return false for non-existent ID', () => {
      expect(store.delete('nonexistent')).toBe(false);
    });
  });

  describe('deleteOlderThan()', () => {
    it('should delete transcriptions older than the specified date', () => {
      store.add('Old', { timestamp: '2024-01-01T00:00:00.000Z' });
      store.add('Recent', { timestamp: '2024-12-01T00:00:00.000Z' });

      const cutoff = new Date('2024-06-01T00:00:00.000Z');
      const deleted = store.deleteOlderThan(cutoff);

      expect(deleted).toBe(1);
      expect(store.count()).toBe(1);
      expect(store.getAll()[0].text).toBe('Recent');
    });

    it('should return 0 when nothing to delete', () => {
      store.add('Recent', { timestamp: '2024-12-01T00:00:00.000Z' });
      const deleted = store.deleteOlderThan(new Date('2024-01-01T00:00:00.000Z'));
      expect(deleted).toBe(0);
    });
  });

  describe('getLatest()', () => {
    it('should return the most recent transcription', () => {
      store.add('First', { timestamp: '2024-01-01T00:00:00.000Z' });
      store.add('Latest', { timestamp: '2024-12-01T00:00:00.000Z' });
      store.add('Middle', { timestamp: '2024-06-01T00:00:00.000Z' });

      const latest = store.getLatest();
      expect(latest).toBeDefined();
      expect(latest!.text).toBe('Latest');
    });

    it('should return undefined when store is empty', () => {
      expect(store.getLatest()).toBeUndefined();
    });
  });

  describe('count()', () => {
    it('should return 0 for empty store', () => {
      expect(store.count()).toBe(0);
    });

    it('should return correct count', () => {
      store.add('One');
      store.add('Two');
      store.add('Three');
      expect(store.count()).toBe(3);
    });
  });

  describe('persistence', () => {
    it('should persist transcriptions to disk', () => {
      store.add('Persist me');
      expect(fs.existsSync(testFilePath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
      expect(data).toHaveLength(1);
      expect(data[0].text).toBe('Persist me');
    });

    it('should load transcriptions from disk on init', () => {
      store.add('Saved');
      const store2 = new TranscriptionStore(testFilePath);
      expect(store2.count()).toBe(1);
      expect(store2.getAll()[0].text).toBe('Saved');
    });

    it('should handle corrupted file gracefully', () => {
      fs.writeFileSync(testFilePath, 'broken json!', 'utf-8');
      const store2 = new TranscriptionStore(testFilePath);
      expect(store2.count()).toBe(0);
    });
  });
});
