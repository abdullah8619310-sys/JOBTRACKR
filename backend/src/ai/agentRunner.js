const { NotImplementedError } = require('./errors');

// Defines the shape a real agent loop (planner -> executor -> memory) will
// be built against: a model client to call and a tool registry to consult.
// No agent logic exists yet — this only fixes the interface.
class AgentRunner {
  constructor({ modelClient, toolRegistry } = {}) {
    this.modelClient = modelClient ?? null;
    this.toolRegistry = toolRegistry ?? null;
  }

  // eslint-disable-next-line no-unused-vars
  async run(input) {
    throw new NotImplementedError(
      'AgentRunner.run is not implemented yet — no agent has been built. ' +
        'This stub only defines the interface (modelClient + toolRegistry) that a real agent will use in a later milestone.',
    );
  }
}

module.exports = { AgentRunner };
