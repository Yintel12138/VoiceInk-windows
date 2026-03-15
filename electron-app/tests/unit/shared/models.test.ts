/**
 * Tests for shared models.
 * Validates data model creation and behavior.
 */
import {
  createTranscription,
  Transcription,
} from '../../../src/shared/models/transcription';
import {
  createVocabularyWord,
  createWordReplacement,
} from '../../../src/shared/models/dictionary';

describe('Transcription model', () => {
  it('should create a transcription with required fields', () => {
    const t = createTranscription('Hello world');
    expect(t.text).toBe('Hello world');
    expect(t.id).toBeDefined();
    expect(t.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(t.timestamp).toBeDefined();
    expect(t.duration).toBe(0);
    expect(t.transcriptionStatus).toBe('pending');
  });

  it('should accept overrides', () => {
    const t = createTranscription('Test', {
      id: 'custom-id',
      duration: 10,
      transcriptionModelName: 'whisper-base',
      transcriptionStatus: 'completed',
      enhancedText: 'Enhanced test',
    });

    expect(t.id).toBe('custom-id');
    expect(t.duration).toBe(10);
    expect(t.transcriptionModelName).toBe('whisper-base');
    expect(t.transcriptionStatus).toBe('completed');
    expect(t.enhancedText).toBe('Enhanced test');
  });

  it('should generate unique IDs for each transcription', () => {
    const t1 = createTranscription('First');
    const t2 = createTranscription('Second');
    expect(t1.id).not.toBe(t2.id);
  });

  it('should use provided timestamp when available', () => {
    const ts = '2024-06-15T12:00:00.000Z';
    const t = createTranscription('Timed', { timestamp: ts });
    expect(t.timestamp).toBe(ts);
  });
});

describe('VocabularyWord model', () => {
  it('should create a vocabulary word', () => {
    const w = createVocabularyWord('TypeScript');
    expect(w.word).toBe('TypeScript');
    expect(w.id).toBeDefined();
    expect(w.createdAt).toBeDefined();
  });

  it('should accept custom ID', () => {
    const w = createVocabularyWord('React', 'custom-id');
    expect(w.id).toBe('custom-id');
  });
});

describe('WordReplacement model', () => {
  it('should create a word replacement', () => {
    const r = createWordReplacement('gonna', 'going to');
    expect(r.original).toBe('gonna');
    expect(r.replacement).toBe('going to');
    expect(r.id).toBeDefined();
    expect(r.createdAt).toBeDefined();
  });

  it('should accept custom ID', () => {
    const r = createWordReplacement('u', 'you', 'custom-id');
    expect(r.id).toBe('custom-id');
  });
});
