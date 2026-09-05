const OpenAI = require('openai');
const { ModelClient } = require('../modelClient');

// Confirmed against OpenRouter's live docs before implementing (no
// OPENROUTER_API_KEY was available in this environment to empirically
// verify with a real call the way the Groq client was — see README/
// prompts.md for this caveat):
// - OpenRouter exposes an OpenAI-compatible Chat Completions API at
//   https://openrouter.ai/api/v1. OpenRouter's own documentation
//   recommends using the standard `openai` SDK pointed at that base URL
//   rather than a dedicated OpenRouter package — there isn't one.
// - `tool_choice` supports forcing one specific function exactly like
//   OpenAI/Groq: { type: 'function', function: { name } }.
// - Checked the LIVE catalog (GET https://openrouter.ai/api/v1/models)
//   rather than assuming: as of this writing, none of the well-known free
//   models (Llama, Gemini, Mistral, Qwen, DeepSeek, etc.) advertise `tools`
//   in their `supported_parameters` — only a handful of smaller providers
//   do. Free-tier availability on OpenRouter rotates over time; re-check
//   that endpoint if this default stops returning tool calls, and override
//   via the `model` constructor option in the meantime.
const DEFAULT_MODEL = 'nvidia/nemotron-3.5-lightning:free';

// Concrete implementation of the ModelClient interface for OpenRouter.
// Same OpenAI-compatible tool-use shape as GroqModelClient (forced tool
// choice; arguments arrive as a JSON string that must be parsed) — the two
// clients are intentionally similar rather than sharing code, since each is
// a distinct concrete provider and the duplication is small and clear.
class OpenRouterModelClient extends ModelClient {
  constructor({ apiKey, model } = {}) {
    super({ provider: 'openrouter' });

    if (!apiKey) {
      throw new Error('OpenRouterModelClient requires an apiKey');
    }

    this.model = model || DEFAULT_MODEL;
    this.client = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' });
  }

  async generate({ system, prompt, tool, maxTokens = 1024 }) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
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
      throw new Error('OpenRouter response did not include a tool call');
    }

    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error('OpenRouter tool call arguments were not valid JSON');
    }
  }
}

module.exports = { OpenRouterModelClient };
