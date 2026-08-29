// Logging hook (Phase 2 "hooks" primitive): wraps any agent/skill call and
// records timestamp, agent name, input size, and success/failure, per the
// approved proposal's transparency requirement. Never swallows errors.
function withLogging(agentName, fn) {
  return async function loggedInvocation(...args) {
    const timestamp = new Date().toISOString();
    const inputSize = JSON.stringify(args[0] ?? {}).length;

    try {
      const result = await fn(...args);
      console.log(
        JSON.stringify({
          type: 'ai_call',
          agentName,
          timestamp,
          inputSize,
          success: true,
        }),
      );
      return result;
    } catch (error) {
      console.log(
        JSON.stringify({
          type: 'ai_call',
          agentName,
          timestamp,
          inputSize,
          success: false,
          error: error.message,
        }),
      );
      throw error;
    }
  };
}

module.exports = { withLogging };
