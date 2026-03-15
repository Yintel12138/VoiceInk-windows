/**
 * TranscriptionStore - Manages transcription records persistence.
 * Replaces SwiftData ModelContainer for Transcription entities.
 *
 * Uses a JSON file-based store for cross-platform compatibility.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Transcription, createTranscription } from '../../shared/models/transcription';

export class TranscriptionStore {
  private transcriptions: Transcription[] = [];
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.loadFromDisk();
  }

  /**
   * Get all transcriptions, optionally sorted by timestamp descending.
   */
  getAll(sortDescending = true): Transcription[] {
    const result = [...this.transcriptions];
    if (sortDescending) {
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return result;
  }

  /**
   * Get a transcription by ID.
   */
  getById(id: string): Transcription | undefined {
    return this.transcriptions.find((t) => t.id === id);
  }

  /**
   * Add a new transcription.
   */
  add(text: string, overrides: Partial<Transcription> = {}): Transcription {
    const transcription = createTranscription(text, overrides);
    this.transcriptions.push(transcription);
    this.saveToDisk();
    return transcription;
  }

  /**
   * Update an existing transcription.
   */
  update(id: string, updates: Partial<Transcription>): Transcription | undefined {
    const index = this.transcriptions.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    this.transcriptions[index] = { ...this.transcriptions[index], ...updates };
    this.saveToDisk();
    return this.transcriptions[index];
  }

  /**
   * Delete a transcription by ID.
   */
  delete(id: string): boolean {
    const index = this.transcriptions.findIndex((t) => t.id === id);
    if (index === -1) return false;

    this.transcriptions.splice(index, 1);
    this.saveToDisk();
    return true;
  }

  /**
   * Delete transcriptions older than the specified date.
   * Mirrors TranscriptionAutoCleanupService behavior.
   */
  deleteOlderThan(date: Date): number {
    const cutoff = date.getTime();
    const before = this.transcriptions.length;
    this.transcriptions = this.transcriptions.filter(
      (t) => new Date(t.timestamp).getTime() >= cutoff
    );
    const deleted = before - this.transcriptions.length;
    if (deleted > 0) {
      this.saveToDisk();
    }
    return deleted;
  }

  /**
   * Get the most recent transcription.
   */
  getLatest(): Transcription | undefined {
    if (this.transcriptions.length === 0) return undefined;
    return this.getAll(true)[0];
  }

  /**
   * Get total count of transcriptions.
   */
  count(): number {
    return this.transcriptions.length;
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.transcriptions = JSON.parse(data);
      }
    } catch {
      this.transcriptions = [];
    }
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.transcriptions, null, 2), 'utf-8');
    } catch {
      // Silently fail - data stays in memory
    }
  }
}
