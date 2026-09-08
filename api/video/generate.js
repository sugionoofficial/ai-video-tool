const { generate } = require("../../providers/videoService");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const job = await generate(req.body || {});
    return res.status(202).json(job);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
