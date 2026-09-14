const CHINAAPI_BASE_URL = "https://api.chinaapi.ai/v1";
const DEFAULT_MODEL = "agnes-video-2.5-flash";
const DEFAULT_POLL_INTERVAL = 5000;
const DEFAULT_TIMEOUT = 30 * 60 * 1000;

const CHINAAPI_MODELS = {
"agnes-video-2.5-flash": {
id: "agnes-video-2.5-flash",
name: "Agnes Video 2.5 Flash",
},
};

function getApiKey() {
const apiKey =
typeof globalThis !== "undefined" &&
globalThis.process &&
globalThis.process.env
? globalThis.process.env.CHINAAPI_KEY
: undefined;

if (!apiKey) {
throw new Error("CHINAAPI_KEY is not configured.");
}

return apiKey;
}

function getHeaders() {
return {
Authorization: "Bearer " + getApiKey(),
"Content-Type": "application/json",
};
}

function sleep(ms) {
return new Promise(function (resolve) {
setTimeout(resolve, ms);
});
}

function getModel(model) {
const selectedModel = model || DEFAULT_MODEL;
const config = CHINAAPI_MODELS[selectedModel];

if (!config) {
throw new Error(
"ChinaAPI model "" +
selectedModel +
"" is not configured. Available models: " +
Object.keys(CHINAAPI_MODELS).join(", ")
);
}

return config;
}

export async function createVideo(options) {
const settings = options || {};
const prompt = settings.prompt;
const model = settings.model || DEFAULT_MODEL;
const duration = settings.duration;
const resolution = settings.resolution;
const extra = settings.extra || {};

if (!prompt || typeof prompt !== "string") {
throw new Error("ChinaAPI video prompt is required.");
}

const modelConfig = getModel(model);

const payload = {
model: modelConfig.id,
prompt: prompt,
...extra,
};

if (duration !== undefined && duration !== null) {
payload.duration = duration;
}

if (resolution) {
payload.resolution = resolution;
}

const response = await fetch(CHINAAPI_BASE_URL + "/videos", {
method: "POST",
headers: getHeaders(),
body: JSON.stringify(payload),
});

const data = await response.json();

if (!response.ok) {
throw new Error(
data && data.message
? data.message
: "ChinaAPI video creation failed with HTTP " + response.status
);
}

if (!data || !data.id) {
throw new Error(
"ChinaAPI did not return a task id: " + JSON.stringify(data)
);
}

return {
...data,
provider: "chinaapi",
model: modelConfig.id,
taskId: data.id,
};
}

export async function getVideoStatus(taskId) {
if (!taskId) {
throw new Error("ChinaAPI task id is required.");
}

const response = await fetch(
CHINAAPI_BASE_URL + "/videos/" + encodeURIComponent(taskId),
{
method: "GET",
headers: getHeaders(),
}
);

const data = await response.json();

if (!response.ok) {
throw new Error(
data && data.message
? data.message
: "ChinaAPI status request failed with HTTP " + response.status
);
}

return data;
}

export async function waitForVideo(taskId, options) {
const settings = options || {};
const pollInterval =
settings.pollInterval || DEFAULT_POLL_INTERVAL;
const timeout = settings.timeout || DEFAULT_TIMEOUT;
const onStatus = settings.onStatus;

const startedAt = Date.now();

while (true) {
if (Date.now() - startedAt >= timeout) {
throw new Error(
"ChinaAPI video generation timed out after " +
Math.round(timeout / 1000) +
" seconds."
);
}

const status = await getVideoStatus(taskId);

if (typeof onStatus === "function") {
  await onStatus(status);
}

const currentStatus = String(status.status || "").toLowerCase();

if (currentStatus === "completed") {
  return status;
}

if (currentStatus === "failed") {
  const errorMessage =
    status && status.error && status.error.message
      ? status.error.message
      : status && status.error
        ? status.error
        : status && status.message
          ? status.message
          : "ChinaAPI video generation failed.";

  const error = new Error(String(errorMessage));
  error.provider = "chinaapi";
  error.taskId = taskId;
  error.response = status;

  throw error;
}

await sleep(pollInterval);

}
}

export async function generateVideo(options) {
const settings = options || {};
const task = await createVideo(settings);
const taskId = task.id || task.taskId;

return waitForVideo(taskId, {
pollInterval: settings.pollInterval,
timeout: settings.timeout,
onStatus: settings.onStatus,
});
}

export function getModels() {
return Object.values(CHINAAPI_MODELS);
}

export const provider = {
id: "chinaapi",
name: "ChinaAPI",
type: "video",
models: CHINAAPI_MODELS,
createVideo: createVideo,
getVideoStatus: getVideoStatus,
waitForVideo: waitForVideo,
generateVideo: generateVideo,
getModels: getModels,
};

export default provider;
