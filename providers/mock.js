const jobs = new Map();

async function createJob(input) {
  const jobId = `mock_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  // Note: Vercel functions are stateless. This mock is intended only for
  // a single warm instance test; production jobs should use a persistent store.
  jobs.set(jobId, { status: "processing", input });
  setTimeout(() => {
    const j = jobs.get(jobId);
    if (j) jobs.set(jobId, { ...j, status: "completed" });
  }, 2500);
  return { success:true, jobId, status:"processing", provider:"mock" };
}

async function getJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) throw new Error("Job not found on this server instance");
  return {
    success:true,
    jobId,
    status:job.status,
    videoUrl: job.status === "completed" ? `/api/video/result?jobId=${encodeURIComponent(jobId)}` : null
  };
}

async function getResult(jobId) {
  const job = jobs.get(jobId);
  if (!job || job.status !== "completed") throw new Error("Result not ready");
  return { videoUrl:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" };
}

module.exports = { createJob, getJob, getResult };
