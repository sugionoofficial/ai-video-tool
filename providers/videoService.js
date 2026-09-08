const mock = require("./mock");
const runway = require("./runway");
const providers = { mock, runway };

async function generate(input) {
  const name = input.provider || process.env.DEFAULT_PROVIDER || "mock";
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown provider: ${name}`);
  return provider.createJob(input);
}

async function status(jobId) {
  const provider = jobId.startsWith("runway_") ? runway : mock;
  return provider.getJob(jobId);
}

async function result(jobId) {
  const provider = jobId.startsWith("runway_") ? runway : mock;
  return provider.getResult(jobId);
}

module.exports = { generate, status, result };
