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

function sleep(ms) {
return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModel(model) {
const selectedModel = model || DEFAULT_MODEL;
const config = CHINAAPI_MODELS[selectedModel];

if (!config) {
throw new Error("ChinaAPI model is not configured: " + selectedModel);
}

return config;
}

function getHeaders(apiKey) {
if (!apiKey) {
throw new Error("CHINAAPI_KEY is not configured.");
}

return {
Authorization: "Bearer " + apiKey,
"Content-Type": "application/json",
};
}

export async function createVideo(options = {}, env = {}) {
const {
prompt,
model = DEFAULT_MODEL,
duration,
resolution,
extra = {},
} = options;

if (!prompt || typeof prompt !== "string") {
throw new Error("ChinaAPI video prompt is required.");
}

const modelConfig = getModel(model);
const apiKey = env.CHINAAPI_KEY;

const payload = {
model: modelConfig.id,
prompt,
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
headers: getHeaders(apiKey),
body: JSON.stringify(payload),
});

const data = await response.json();

if (!response.ok) {
throw new Error(
"ChinaAPI video creation failed: HTTP " + response.status
);
}

if (!data || !data.id) {
throw new Error("ChinaAPI did not return a task id.");
}

return {
...data,
provider: "chinaapi",
model: modelConfig.id,
taskId: data.id,
};
}

export async function getVideoStatus(taskId, env = {}) {
if (!taskId) {
throw new Error("ChinaAPI task id is required.");
}

const apiKey = env.CHINAAPI_KEY;

const response = await fetch(
CHINAAPI_BASE_URL + "/videos/" + encodeURIComponent(taskId),
{
method: "GET",
headers: getHeaders(apiKey),
}
);

const data = await response.json();

if (!response.ok) {
throw new Error(
"ChinaAPI status request failed: HTTP " + response.status
);
}

return data;
}

export async function waitForVideo(taskId, env = {}, options = {}) {
const pollInterval =
options.pollInterval || DEFAULT_POLL_INTERVAL;

const timeout =
options.timeout || DEFAULT_TIMEOUT;

const onStatus = options.onStatus;

const startedAt = Date.now();

while (true) {
if (Date.now() - startedAt >= timeout) {
throw new Error("ChinaAPI video generation timed out.");
}

const status = await getVideoStatus(taskId, env);

if (typeof onStatus === "function") {
  await onStatus(status);
}

const currentStatus = String(
  status.status || ""
).toLowerCase();

if (currentStatus === "completed") {
  return status;
}

if (currentStatus === "failed") {
  throw new Error("ChinaAPI video generation failed.");
}

await sleep(pollInterval);

}
}

export async function generateVideo(options = {}, env = {}) {
const task = await createVideo(options, env);

const taskId = task.id || task.taskId;

return waitForVideo(taskId, env, {
pollInterval: options.pollInterval,
timeout: options.timeout,
onStatus: options.onStatus,
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
createVideo,
getVideoStatus,
waitForVideo,
generateVideo,
getModels,
};

export default provider;
