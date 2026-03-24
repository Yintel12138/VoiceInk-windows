/**
 * CustomSpeechApiService - Custom speech recognition API with WebSocket streaming support.
 * Supports both HTTP batch transcription and WebSocket real-time streaming.
 */
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import WebSocket from 'ws';

export type CustomSpeechApiType = 'http' | 'websocket';

export interface CustomSpeechApiConfig {
  enabled: boolean;
  type: CustomSpeechApiType;
  url: string;
  apiKey?: string;
  language?: string;
}

export interface StreamingTranscriptionCallbacks {
  onPartialResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError: (error: Error) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

export class CustomSpeechApiService {
  private config: CustomSpeechApiConfig;
  private activeWebSocket: WebSocket | null = null;

  constructor(config: CustomSpeechApiConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<CustomSpeechApiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * HTTP batch transcription: POST audio file to endpoint.
   */
  async transcribeFile(audioFilePath: string, language?: string): Promise<string> {
    if (!this.config.url) throw new Error('Custom API URL not configured');
    const audioData = fs.readFileSync(audioFilePath);
    const url = new URL(this.config.url);
    const isHttps = url.protocol === 'https:';
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': audioData.length,
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
        ...(language ? { 'X-Language': language } : {}),
      },
    };
    return new Promise((resolve, reject) => {
      const req = (isHttps ? https : http).request(options, (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.text || parsed.transcript || parsed.result || data);
          } catch {
            resolve(data);
          }
        });
      });
      req.on('error', reject);
      req.write(audioData);
      req.end();
    });
  }

  /**
   * WebSocket streaming transcription.
   * Connects to WS server, sends audio chunks, receives partial/final results.
   */
  async startStreamingTranscription(
    callbacks: StreamingTranscriptionCallbacks,
    language?: string
  ): Promise<void> {
    if (!this.config.url) throw new Error('Custom API WebSocket URL not configured');
    if (this.activeWebSocket) {
      this.activeWebSocket.close();
      this.activeWebSocket = null;
    }
    const wsUrl = this.config.url.replace(/^http/, 'ws');
    const headers: Record<string, string> = {};
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    if (language) headers['X-Language'] = language;

    const ws = new WebSocket(wsUrl, { headers });
    this.activeWebSocket = ws;

    ws.on('open', () => {
      callbacks.onConnected();
      ws.send(JSON.stringify({
        type: 'config',
        language: language || 'auto',
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
      }));
    });

    ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'partial' || msg.is_final === false) {
          callbacks.onPartialResult(msg.text || msg.transcript || '');
        } else if (msg.type === 'final' || msg.is_final === true || msg.text) {
          callbacks.onFinalResult(msg.text || msg.transcript || '');
        }
      } catch {
        callbacks.onFinalResult(data.toString());
      }
    });

    ws.on('error', (err: Error) => callbacks.onError(err));
    ws.on('close', () => {
      this.activeWebSocket = null;
      callbacks.onDisconnected();
    });
  }

  /**
   * Send an audio chunk during active WebSocket streaming.
   */
  sendAudioChunk(audioData: Buffer): void {
    if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
      this.activeWebSocket.send(audioData);
    }
  }

  /**
   * Stop active WebSocket streaming.
   */
  stopStreamingTranscription(): void {
    if (this.activeWebSocket) {
      try {
        this.activeWebSocket.send(JSON.stringify({ type: 'end' }));
      } catch { /* ignore */ }
      this.activeWebSocket.close();
      this.activeWebSocket = null;
    }
  }

  /**
   * Test connection to the API endpoint.
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.url) return false;
    try {
      if (this.config.type === 'websocket' || this.config.url.startsWith('ws')) {
        return await this.testWebSocketConnection();
      }
      return await this.testHttpConnection();
    } catch {
      return false;
    }
  }

  private testHttpConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const url = new URL(this.config.url);
      const isHttps = url.protocol === 'https:';
      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'HEAD',
        headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {},
      };
      const req = (isHttps ? https : http).request(options, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => { req.destroy(); resolve(false); });
      req.end();
    });
  }

  private testWebSocketConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = this.config.url.startsWith('ws')
          ? this.config.url
          : this.config.url.replace(/^http/, 'ws');
        const ws = new WebSocket(wsUrl, {
          headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {},
        });
        const timer = setTimeout(() => { ws.close(); resolve(false); }, 5000);
        ws.on('open', () => { clearTimeout(timer); ws.close(); resolve(true); });
        ws.on('error', () => { clearTimeout(timer); resolve(false); });
      } catch {
        resolve(false);
      }
    });
  }
}
