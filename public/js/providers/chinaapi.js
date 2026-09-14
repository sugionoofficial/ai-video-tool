import axios from "axios";

const CHINAAPI_BASE_URL = "https://api.chinaapi.ai/v1";
const DEFAULT_MODEL = "agnes-video-2.5-flash";
const DEFAULT_POLL_INTERVAL = 5000;
const DEFAULT_TIMEOUT = 30 * 60 * 1000;

/**

* ChinaAPI Video Provider
* 
* Model aktif saat ini:
* - agnes-video-2.5-flash
* 
* Model lain nantinya dapat ditambahkan ke CHINAAPI_MODELS
* tanpa perlu mengubah alur generate/polling utama.
  */

const CHINAAPI_MODELS = {
"agnes-video-2.5-flash": {
id: "agnes-video-2.5-flash",
name: "Agnes Video 2.5 Flash",
},
};

function getApiKey() {
const apiKey = process.env.CHINAAPI_KEY;

if (!apiKey) {
throw new Error("CHINAAPI_KEY is not configured.");
}

return apiKey;
}

function getHeaders() {
return {
Authorization: "Bearer ${getApiKey()}",
"Content-Type": "application/json",
};
}

function sleep(ms) {
return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModel(model = DEFAULT_MODEL) {
const config = CHINAAPI_MODELS[model];

if (!config) {
throw new Error(
"ChinaAPI model "${model}" is not configured. Available models: ${Object.keys( CHINAAPI_MODELS ).join(", ")}"
);
}

return config;
}

/**

* Create a video generation task.
* 
* @param {Object} options
* @param {string} options.prompt
* @param {string} [options.model]
* @param {number} [options.duration]
* @param {string} [options.resolution]
* @param {Object} [options.extra]
* @returns {Promise<Object>}
  */
  export async function createVideo({
  prompt,
  model = DEFAULT_MODEL,
  duration,
  resolution,
  extra = {},
  }) {
  if (!prompt || typeof prompt !== "string") {
  throw new Error("ChinaAPI video prompt is required.");
  }

const modelConfig = getModel(model);

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

const response = await axios.post(
"${CHINAAPI_BASE_URL}/videos",
payload,
{
headers: getHeaders(),
timeout: 60000,
}
);

if (!response.data) {
throw new Error("ChinaAPI returned an empty response.");
}

if (!response.data.id) {
throw new Error(
"ChinaAPI did not return a task id: ${JSON.stringify(response.data)}"
);
}

return {
...response.data,
provider: "chinaapi",
model: modelConfig.id,
taskId: response.data.id,
};
}

/**

* Get the current status of a video generation task.
* 
* @param {string} taskId
* @returns {Promise<Object>}
  */
  export async function getVideoStatus(taskId) {
  if (!taskId) {
  throw new Error("ChinaAPI task id is required.");
  }

const response = await axios.get(
"${CHINAAPI_BASE_URL}/videos/${encodeURIComponent(taskId)}",
{
headers: getHeaders(),
timeout: 60000,
}
);

if (!response.data) {
throw new Error("ChinaAPI returned an empty status response.");
}

return response.data;
}

/**

* Wait until the video generation task is completed or failed.
* 
* @param {string} taskId
* @param {Object} [options]
* @param {number} [options.pollInterval]
* @param {number} [options.timeout]
* @param {Function} [options.onStatus]
* @returns {Promise<Object>}
  */
  export async function waitForVideo(
  taskId,
  {
  pollInterval = DEFAULT_POLL_INTERVAL,
  timeout = DEFAULT_TIMEOUT,
  onStatus,
  } = {}
  ) {
  const startedAt = Date.now();

while (true) {
if (Date.now() - startedAt >= timeout) {
throw new Error(
"ChinaAPI video generation timed out after ${Math.round( timeout / 1000 )} seconds."
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
    status.error?.message ||
    status.error ||
    status.message ||
    "ChinaAPI video generation failed.";

  const error = new Error(String(errorMessage));
  error.provider = "chinaapi";
  error.taskId = taskId;
  error.response = status;

  throw error;
}

await sleep(pollInterval);

}
}

/**

* Generate a video and wait for completion.
* 
* @param {Object} options
* @returns {Promise<Object>}
  */
  export async function generateVideo(options) {
  const task = await createVideo(options);

return waitForVideo(task.id || task.taskId, {
pollInterval: options?.pollInterval,
timeout: options?.timeout,
onStatus: options?.onStatus,
});
}

/**

* Return configured ChinaAPI models.
* 
* This makes it easy for the application UI to discover
* available models later.
  */
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
