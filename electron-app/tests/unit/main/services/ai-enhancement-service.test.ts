/**
 * Unit tests for AIEnhancementService.
 * Tests provider management, prompt CRUD, API key management, and enhancement flow.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AIEnhancementService,
  AI_PROVIDERS,
  BUILTIN_PROMPTS,
} from '../../../../src/main/services/ai-enhancement-service';

describe('AIEnhancementService', () => {
  let service: AIEnhancementService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voiceink-ai-test-'));
    service = new AIEnhancementService(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create data directory if it does not exist', () => {
      const newDir = path.join(tempDir, 'nested', 'ai');
      new AIEnhancementService(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
    });
  });

  // --- Provider Tests ---

  describe('AI_PROVIDERS', () => {
    it('should have at least 6 providers', () => {
      expect(AI_PROVIDERS.length).toBeGreaterThanOrEqual(6);
    });

    it('should include OpenAI, Groq, Anthropic', () => {
      const ids = AI_PROVIDERS.map((p) => p.id);
      expect(ids).toContain('openai');
      expect(ids).toContain('groq');
      expect(ids).toContain('anthropic');
    });

    it('should include local Ollama provider', () => {
      const ollama = AI_PROVIDERS.find((p) => p.id === 'ollama');
      expect(ollama).toBeDefined();
      expect(ollama!.requiresAPIKey).toBe(false);
      expect(ollama!.baseURL).toContain('localhost');
    });

    it('should have models for each provider', () => {
      for (const provider of AI_PROVIDERS) {
        expect(provider.models.length).toBeGreaterThan(0);
        for (const model of provider.models) {
          expect(model.id).toBeTruthy();
          expect(model.displayName).toBeTruthy();
          expect(model.providerId).toBe(provider.id);
        }
      }
    });
  });

  describe('getProviders', () => {
    it('should return all providers', () => {
      expect(service.getProviders()).toEqual(AI_PROVIDERS);
    });
  });

  describe('getProvider', () => {
    it('should return provider by ID', () => {
      const provider = service.getProvider('openai');
      expect(provider).toBeDefined();
      expect(provider!.displayName).toBe('OpenAI');
    });

    it('should return undefined for unknown ID', () => {
      expect(service.getProvider('nonexistent')).toBeUndefined();
    });
  });

  describe('setProvider / getSelectedProviderId', () => {
    it('should set and get selected provider', () => {
      service.setProvider('groq');
      expect(service.getSelectedProviderId()).toBe('groq');
    });

    it('should default to openai', () => {
      expect(service.getSelectedProviderId()).toBe('openai');
    });
  });

  describe('setModel / getSelectedModelId', () => {
    it('should set and get selected model', () => {
      service.setModel('claude-3-5-sonnet-20241022');
      expect(service.getSelectedModelId()).toBe('claude-3-5-sonnet-20241022');
    });

    it('should default to gpt-4o-mini', () => {
      expect(service.getSelectedModelId()).toBe('gpt-4o-mini');
    });
  });

  // --- API Key Tests ---

  describe('API key management', () => {
    it('should save and retrieve API key', () => {
      service.saveApiKey('openai', 'sk-test-123');
      expect(service.getApiKey('openai')).toBe('sk-test-123');
    });

    it('should check if API key exists', () => {
      expect(service.hasApiKey('openai')).toBe(false);
      service.saveApiKey('openai', 'sk-test-123');
      expect(service.hasApiKey('openai')).toBe(true);
    });

    it('should delete API key', () => {
      service.saveApiKey('openai', 'sk-test-123');
      service.deleteApiKey('openai');
      expect(service.hasApiKey('openai')).toBe(false);
      expect(service.getApiKey('openai')).toBe('');
    });

    it('should persist API keys to disk', () => {
      service.saveApiKey('groq', 'gsk-test-456');

      // Create a new service instance pointing to same directory
      const service2 = new AIEnhancementService(tempDir);
      expect(service2.getApiKey('groq')).toBe('gsk-test-456');
    });

    it('should support multiple provider keys', () => {
      service.saveApiKey('openai', 'sk-openai');
      service.saveApiKey('groq', 'gsk-groq');
      service.saveApiKey('anthropic', 'sk-ant');

      expect(service.getApiKey('openai')).toBe('sk-openai');
      expect(service.getApiKey('groq')).toBe('gsk-groq');
      expect(service.getApiKey('anthropic')).toBe('sk-ant');
    });
  });

  // --- Prompt Tests ---

  describe('BUILTIN_PROMPTS', () => {
    it('should have at least 5 built-in prompts', () => {
      expect(BUILTIN_PROMPTS.length).toBeGreaterThanOrEqual(5);
    });

    it('should include Fix Grammar prompt', () => {
      const grammar = BUILTIN_PROMPTS.find((p) => p.id === 'fix-grammar');
      expect(grammar).toBeDefined();
      expect(grammar!.name).toBe('Fix Grammar');
      expect(grammar!.isBuiltIn).toBe(true);
    });

    it('should have {text} placeholder in all user prompt templates', () => {
      for (const prompt of BUILTIN_PROMPTS) {
        expect(prompt.userPromptTemplate).toContain('{text}');
      }
    });
  });

  describe('getPrompts', () => {
    it('should return built-in prompts when no custom prompts exist', () => {
      const prompts = service.getPrompts();
      expect(prompts.length).toBe(BUILTIN_PROMPTS.length);
    });

    it('should include custom prompts after built-in prompts', () => {
      service.addPrompt({
        name: 'Custom',
        systemPrompt: 'Test system prompt',
        userPromptTemplate: '{text}',
      });

      const prompts = service.getPrompts();
      expect(prompts.length).toBe(BUILTIN_PROMPTS.length + 1);
      expect(prompts[prompts.length - 1].name).toBe('Custom');
    });
  });

  describe('addPrompt', () => {
    it('should create custom prompt with generated ID', () => {
      const prompt = service.addPrompt({
        name: 'My Prompt',
        systemPrompt: 'Do something',
        userPromptTemplate: '{text}',
      });

      expect(prompt.id).toBeTruthy();
      expect(prompt.name).toBe('My Prompt');
      expect(prompt.isBuiltIn).toBe(false);
      expect(prompt.createdAt).toBeTruthy();
    });

    it('should persist custom prompts to disk', () => {
      service.addPrompt({
        name: 'Persistent',
        systemPrompt: 'Test',
        userPromptTemplate: '{text}',
      });

      const service2 = new AIEnhancementService(tempDir);
      const prompts = service2.getPrompts();
      const custom = prompts.find((p) => p.name === 'Persistent');
      expect(custom).toBeDefined();
    });
  });

  describe('updatePrompt', () => {
    it('should update custom prompt', () => {
      const prompt = service.addPrompt({
        name: 'Original',
        systemPrompt: 'Original system',
        userPromptTemplate: '{text}',
      });

      const updated = service.updatePrompt(prompt.id, {
        name: 'Updated',
        systemPrompt: 'Updated system',
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated');
      expect(updated!.systemPrompt).toBe('Updated system');
    });

    it('should return null for non-existent prompt', () => {
      const result = service.updatePrompt('non-existent', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deletePrompt', () => {
    it('should delete custom prompt', () => {
      const prompt = service.addPrompt({
        name: 'To Delete',
        systemPrompt: 'Test',
        userPromptTemplate: '{text}',
      });

      expect(service.deletePrompt(prompt.id)).toBe(true);
      const prompts = service.getPrompts();
      const found = prompts.find((p) => p.id === prompt.id);
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent prompt', () => {
      expect(service.deletePrompt('non-existent')).toBe(false);
    });
  });

  describe('setActivePrompt / getActivePromptId', () => {
    it('should set and get active prompt', () => {
      service.setActivePrompt('professional');
      expect(service.getActivePromptId()).toBe('professional');
    });

    it('should default to fix-grammar', () => {
      expect(service.getActivePromptId()).toBe('fix-grammar');
    });
  });

  // --- Enhancement ---

  describe('setEnabled / getEnabled', () => {
    it('should toggle enhancement', () => {
      expect(service.getEnabled()).toBe(false);
      service.setEnabled(true);
      expect(service.getEnabled()).toBe(true);
    });
  });

  describe('enhance', () => {
    it('should return original text when disabled', async () => {
      const result = await service.enhance('Hello world');
      expect(result.enhancedText).toBe('Hello world');
      expect(result.duration).toBe(0);
    });

    it('should throw when no API key is configured', async () => {
      service.setEnabled(true);
      service.setProvider('openai');
      await expect(service.enhance('Hello')).rejects.toThrow(
        'No API key configured'
      );
    });

    it('should throw for unknown provider', async () => {
      service.setEnabled(true);
      service.setProvider('nonexistent');
      await expect(service.enhance('Hello')).rejects.toThrow(
        'Provider not found'
      );
    });

    it('should throw for unknown prompt', async () => {
      service.setEnabled(true);
      service.setProvider('openai');
      service.saveApiKey('openai', 'sk-test');
      service.setActivePrompt('nonexistent');
      await expect(service.enhance('Hello')).rejects.toThrow(
        'Prompt not found'
      );
    });
  });

  describe('verifyApiKey', () => {
    it('should return valid for ollama (no API key needed)', async () => {
      const result = await service.verifyApiKey('ollama', '');
      expect(result.valid).toBe(true);
    });

    it('should return error for unknown provider', async () => {
      const result = await service.verifyApiKey('nonexistent', 'key');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown provider');
    });
  });
});
