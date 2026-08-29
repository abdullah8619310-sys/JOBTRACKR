const Anthropic = require('@anthropic-ai/sdk');
const { ModelClient } = require('../modelClient');

const DEFAULT_MODEL = 'claude-sonnet-5';

// Concrete implementation of the ModelClient interface for the Anthropic
// Claude API. Uses tool use (function calling) so the model returns
// structured arguments rather than free-form chat text, per the proposal's
// "Function calling" primitive.
class AnthropicModelClient extends ModelClient {
  constructor({ apiKey, model } = {}) {
    super({ provider: 'anthropic' });

    if (!apiKey) {
      throw new Error('AnthropicModelClient requires an apiKey');
    }

    this.model = model || DEFAULT_MODEL;
    this.client = new Anthropic({ apiKey });
  }

  async generate({ system, prompt, tool, maxTokens = 1024 }) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
      tools: [
        {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: tool.name },
    });

    const toolUseBlock = response.content.find((block) => block.type === 'tool_use');

    if (!toolUseBlock) {
      throw new Error('Anthropic response did not include a tool_use block');
    }

    return toolUseBlock.input;
  }
}

module.exports = { AnthropicModelClient };
