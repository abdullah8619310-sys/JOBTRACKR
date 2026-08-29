// Registry for named, callable "skills" (Phase 2 primitive). Agents will
// register narrow-scoped functions here (e.g. resume_review, draft_followup)
// in a later milestone — no skills are registered yet.
class ToolRegistry {
  constructor() {
    this._tools = new Map();
  }

  register(name, handler) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Tool name must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError(`Tool "${name}" handler must be a function`);
    }
    if (this._tools.has(name)) {
      throw new Error(`Tool "${name}" is already registered`);
    }

    this._tools.set(name, handler);
  }

  get(name) {
    return this._tools.get(name);
  }

  has(name) {
    return this._tools.has(name);
  }

  list() {
    return Array.from(this._tools.keys());
  }

  clear() {
    this._tools.clear();
  }
}

module.exports = { ToolRegistry };
