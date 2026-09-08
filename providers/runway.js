const API_BASE = "https://api.dev.runwayml.com/v1";
const API_VERSION = "2024-11-06";

function getHeaders() {
  const key = process.env.RUNWAYML_API_SECRET;

  if (!key) {
    throw new Error("RUNWAYML_API_SECRET is not configured");
  }

  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
    "X-Runway-Version": API_VERSION
  };
}

function ratio(value, hasImage) {
  if (hasImage) {
    return {
      "16:9": "1280:720",
      "9:16": "720:1280",
      "1:1": "960:960"
    }[value] || "1280:720";
  }

  return {
    "16:9": "1280:720",
    "9:16": "720:1280"
  }[value] || "1280:720";
}

async function createJob(input) {
  const prompt = String(input.prompt || "").trim();

  if (!prompt) {
    throw new Error("Prompt is required");
  }

  const image = String(input.image || "").trim();
  const hasImage = Boolean(image);

  const endpoint = hasImage
    ? `${API_BASE}/image_to_video`
    : `${API_BASE}/text_to_video`;

  const body = {
    model: input.model || process.env.RUNWAY_MODEL || "gen4.5",
    promptText: prompt,
    ratio: ratio(input.aspectRatio, hasImage),
    duration: Number(input.duration || 5)
  };

  if (hasImage) {
    body.promptImage = image;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `${response.status} ${JSON.stringify(data)}`
    );
  }

  if (!data.id) {
    throw new Error("Runway did not return a task id");
  }

  return `runway_${data.id}`;
}

async function getJob(jobId) {
  const runwayId = String(jobId).replace(/^runway_/, "");

  const response = await fetch(
    `${API_BASE}/tasks/${encodeURIComponent(runwayId)}`,
    {
      method: "GET",
      headers: getHeaders()
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `${response.status} ${JSON.stringify(data)}`
    );
  }

  if (data.status === "SUCCEEDED") {
    return {
      status: "completed",
      output: data.output && data.output[0]
        ? data.output[0]
        : null,
      raw: data
    };
  }

  if (
    data.status === "FAILED" ||
    data.status === "CANCELLED"
  ) {
    return {
      status: "failed",
      error: data.failure || data.failureCode || "Runway task failed",
      raw: data
    };
  }

  return {
    status: "processing",
    raw: data
  };
}

async function getResult(jobId) {
  const job = await getJob(jobId);

  if (job.status !== "completed" || !job.output) {
    return null;
  }

  return job.output;
}

module.exports = {
  createJob,
  getJob,
  getResult
};
