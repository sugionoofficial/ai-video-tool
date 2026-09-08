const { status } = require("../../providers/videoService");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const jobId = req.query.jobId;
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    return res.json(await status(jobId));
  } catch (e) {
    return res.status(404).json({ error: e.message });
  }
};
