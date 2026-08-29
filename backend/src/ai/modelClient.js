const { NotImplementedError } = require('./errors');

// Provider-agnostic model client interface. A later milestone will add
// concrete implementations (Anthropic Claude, an OpenRouter-hosted model)
// behind this same `generate` shape. No API calls happen here.
class ModelClient {
  constructor({ provider } = {}) {
    this.provider = provider ?? null;
  }

  // eslint-disable-next-line no-unused-vars
  async generate(request) {
    throw new NotImplementedError(
      `ModelClient.generate is not implemented yet (provider: ${
        this.provider ?? 'none configured'
      }). No LLM API calls are wired up in this milestone.`,
    );
  }
}

module.exports = { ModelClient };
