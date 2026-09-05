// Constructing a ModelClient (GroqModelClient/OpenRouterModelClient) never
// makes a network call by itself — only calling .generate() does, and
// these tests never call it — so these can exercise the real classes
// directly with fake keys to verify routing, with no mocking needed and no
// risk of a real API call.
const ai = require('../src/ai');
const env = require('../src/config/env');

describe('createModelClient (Week 7 Phase 5 provider routing)', () => {
  const originalProvider = env.AI_PROVIDER;
  const originalGroqKey = env.GROQ_API_KEY;
  const originalOpenRouterKey = env.OPENROUTER_API_KEY;

  afterEach(() => {
    env.AI_PROVIDER = originalProvider;
    env.GROQ_API_KEY = originalGroqKey;
    env.OPENROUTER_API_KEY = originalOpenRouterKey;
  });

  it('constructs a GroqModelClient when AI_PROVIDER is "groq"', () => {
    env.AI_PROVIDER = 'groq';
    env.GROQ_API_KEY = 'test-groq-key';

    const modelClient = ai.createModelClient();

    expect(modelClient).toBeInstanceOf(ai.GroqModelClient);
    expect(modelClient.provider).toBe('groq');
  });

  it('constructs an OpenRouterModelClient when AI_PROVIDER is "openrouter"', () => {
    env.AI_PROVIDER = 'openrouter';
    env.OPENROUTER_API_KEY = 'test-openrouter-key';

    const modelClient = ai.createModelClient();

    expect(modelClient).toBeInstanceOf(ai.OpenRouterModelClient);
    expect(modelClient.provider).toBe('openrouter');
  });

  it('defaults to groq when AI_PROVIDER is unset', () => {
    delete env.AI_PROVIDER;
    env.GROQ_API_KEY = 'test-groq-key';

    const modelClient = ai.createModelClient();

    expect(modelClient).toBeInstanceOf(ai.GroqModelClient);
  });

  it('throws a clear, catchable error when groq is selected but GROQ_API_KEY is missing', () => {
    env.AI_PROVIDER = 'groq';
    delete env.GROQ_API_KEY;

    expect(() => ai.createModelClient()).toThrow(/missing GROQ_API_KEY/);
  });

  it('throws a clear, catchable error when openrouter is selected but OPENROUTER_API_KEY is missing', () => {
    env.AI_PROVIDER = 'openrouter';
    delete env.OPENROUTER_API_KEY;

    expect(() => ai.createModelClient()).toThrow(/missing OPENROUTER_API_KEY/);
  });

  it('does not fall back to the other provider when the selected one is unconfigured', () => {
    env.AI_PROVIDER = 'openrouter';
    delete env.OPENROUTER_API_KEY;
    env.GROQ_API_KEY = 'test-groq-key'; // configured, but must NOT be used

    expect(() => ai.createModelClient()).toThrow(/missing OPENROUTER_API_KEY/);
  });
});
