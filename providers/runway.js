const RunwayML = require("@runwayml/sdk");

let sdk;

function client() {
  if (!process.env.RUNWAYML_API_SECRET) {
    throw new Error("RUNWAYML_API_SECRET is not configured in Vercel.");
  }
  if (!sdk) sdk = new RunwayML({ apiKey: process.env.RUNWAYML_API_SECRET });
  return sdk;
}

function ratio(value) {
  return ({ "16:9":"1280:720", "9:16":"720:1280", "1:1":"960:960" })[value] || "1280:720";
}

async function createJob(input) {
  const task = await client().imageToVideo.create({
    model: input.model || process.env.RUNWAY_MODEL || "gen4.5",
    promptText: input.prompt || "",
    ratio: ratio(input.aspectRatio),
    duration: Number(input.duration || 5),
    ...(input.image ? { promptImage: input.image } : {})
  });

  return {
    success:true,
    jobId:`runway_${task.id}`,
    provider:"runway",
    providerTaskId:task.id,
    status:"processing"
  };
}

async function getJob(jobId) {
  const id = jobId.replace(/^runway_/, "");
  const task = await client().tasks.retrieve(id);
  const state = String(task.status || "").toLowerCase();

  if (state === "succeeded") {
    return {
      success:true,
      jobId,
      status:"completed",
      videoUrl: task.output && task.output[0] ? task.output[0] : null
    };
  }
  if (state === "failed" || state === "cancelled") {
    return { success:false, jobId, status:"failed",
      error:task.failure || task.failureCode || "Runway task failed" };
  }
  return { success:true, jobId, status:"processing" };
}

async function getResult(jobId) {
  const data = await getJob(jobId);
  if (data.status !== "completed" || !data.videoUrl) throw new Error("Result not ready");
  return { videoUrl:data.videoUrl };
}

module.exports = { createJob, getJob, getResult };
