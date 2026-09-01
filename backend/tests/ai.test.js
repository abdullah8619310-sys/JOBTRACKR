const {
  ToolRegistry,
  ModelClient,
  AgentRunner,
  NotImplementedError,
  toolRegistry,
  resumeReview,
} = require('../src/ai');

describe('ToolRegistry', () => {
  it('registers, retrieves, and lists tools', () => {
    const registry = new ToolRegistry();
    const handler = async () => 'ok';

    registry.register('example_tool', handler);

    expect(registry.has('example_tool')).toBe(true);
    expect(registry.get('example_tool')).toBe(handler);
    expect(registry.list()).toEqual(['example_tool']);
  });

  it('returns undefined and false for unknown tools', () => {
    const registry = new ToolRegistry();

    expect(registry.get('missing')).toBeUndefined();
    expect(registry.has('missing')).toBe(false);
    expect(registry.list()).toEqual([]);
  });

  it('rejects a duplicate tool name', () => {
    const registry = new ToolRegistry();
    registry.register('dup', async () => {});

    expect(() => registry.register('dup', async () => {})).toThrow(
      'Tool "dup" is already registered',
    );
  });

  it('rejects a non-function handler', () => {
    const registry = new ToolRegistry();

    expect(() => registry.register('bad', 'not a function')).toThrow(TypeError);
  });

  it('clears all registered tools', () => {
    const registry = new ToolRegistry();
    registry.register('a', async () => {});
    registry.register('b', async () => {});

    registry.clear();

    expect(registry.list()).toEqual([]);
  });
});

describe('ModelClient', () => {
  it('can be constructed with no arguments', () => {
    expect(() => new ModelClient()).not.toThrow();
  });

  it('rejects with NotImplementedError when invoked, without making any network call', async () => {
    const client = new ModelClient({ provider: 'groq' });

    await expect(client.generate({ prompt: 'hello' })).rejects.toBeInstanceOf(
      NotImplementedError,
    );
  });
});

describe('AgentRunner', () => {
  it('can be constructed with a model client and tool registry', () => {
    const modelClient = new ModelClient();
    const toolRegistry = new ToolRegistry();

    const runner = new AgentRunner({ modelClient, toolRegistry });

    expect(runner.modelClient).toBe(modelClient);
    expect(runner.toolRegistry).toBe(toolRegistry);
  });

  it('rejects with NotImplementedError when run, without making any network call', async () => {
    const runner = new AgentRunner({
      modelClient: new ModelClient(),
      toolRegistry: new ToolRegistry(),
    });

    await expect(runner.run({ task: 'analyze' })).rejects.toBeInstanceOf(
      NotImplementedError,
    );
  });
});

describe('shared registry composition root', () => {
  it('has resume_review registered against the real resumeReview skill', () => {
    expect(toolRegistry.has('resume_review')).toBe(true);
    expect(toolRegistry.get('resume_review')).toBe(resumeReview);
  });
});
