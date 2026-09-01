const Groq = require('groq-sdk');
const { ModelClient } = require('../modelClient');

// Confirmed against Groq's official docs (console.groq.com/docs/tool-use,
// /docs/openai, /docs/api-reference) and the live GET /openai/v1/models
// endpoint (docs alone were not enough — an earlier default model,
// llama-3.3-70b-versatile, returned a real 404 model_not_found at runtime
// despite docs suggesting it was supported; the live models list is the
// only reliable source of truth for what's actually deployed):
// - Groq exposes an OpenAI-compatible Chat Completions API at
//   https://api.groq.com/openai/v1, and the official `groq-sdk` client
//   mirrors the OpenAI SDK shape (`client.chat.completions.create`).
// - `openai/gpt-oss-120b` is confirmed live and tool-use capable (it's the
//   model used in Groq's own official tool-calling example), supporting a
//   single forced tool call via `tool_choice: { type: 'function', function }`.
// - A forced tool call's arguments come back as a JSON *string* at
//   `message.tool_calls[0].function.arguments` (unlike Anthropic's
//   `tool_use` block, which returns an already-parsed object) — this
//   client parses it before returning, so callers see the same shape
//   as before regardless of provider.
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

// Concrete implementation of the ModelClient interface for the Groq API.
// Uses forced tool/function calling so the model returns structured
// arguments rather than free-form chat text, per the proposal's
// "Function calling" primitive.
class GroqModelClient extends ModelClient {
  constructor({ apiKey, model } = {}) {
    super({ provider: 'groq' });

    if (!apiKey) {
      throw new Error('GroqModelClient requires an apiKey');
    }

    this.model = model || DEFAULT_MODEL;
    this.client = new Groq({ apiKey });
  }

  async generate({ system, prompt, tool, maxTokens = 1024 }) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: tool.name } },
    });

    const toolCall = response.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('Groq response did not include a tool call');
    }

    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error('Groq tool call arguments were not valid JSON');
    }
  }
}

module.exports = { GroqModelClient };
