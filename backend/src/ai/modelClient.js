const { NotImplementedError } = require('./errors');

// Provider-agnostic model client interface. Concrete implementations sit
// behind this same `generate` shape — currently `GroqModelClient` for the
// Resume Reviewer Agent; a second provider will be added for the future
// Follow-up Agent. No API calls happen in this base class.
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
