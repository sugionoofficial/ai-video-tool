const API_BASE = window.VIDEO_API_BASE || "";
const promptEl = document.getElementById("prompt");
const providerEl = document.getElementById("provider");
const durationEl = document.getElementById("duration");
const ratioEl = document.getElementById("aspectRatio");
const modelEl = document.getElementById("model");
const imageEl = document.getElementById("image");
const generateBtn = document.getElementById("generateBtn");
const messageEl = document.getElementById("message");
const videoEl = document.getElementById("video");
const previewEl = document.querySelector(".preview");
const downloadBtn = document.getElementById("downloadBtn");
const statusText = document.getElementById("statusText");
const timeline = new VideoTimeline(document.getElementById("timeline"));

timeline.onChange = scenes => console.log("Timeline:", scenes);
document.getElementById("addSceneBtn").addEventListener("click", () => timeline.addScene());

function setStatus(text, busy=false) {
  statusText.textContent = text;
  document.getElementById("statusDot").style.background = busy ? "#d7a63d" : "#48c774";
}
function message(text) { messageEl.textContent = text; }

async function toDataUrl(file) {
  if (!file) return null;
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function generate() {
  const prompt = promptEl.value.trim();
  const scenes = timeline.getScenes();
  if (!prompt && !scenes.length) return message("Enter a prompt or add a scene.");

  generateBtn.disabled = true;
  setStatus("Generating", true);
  message("Submitting generation job...");
  downloadBtn.classList.add("disabled");

  try {
    const image = await toDataUrl(imageEl.files[0]);
    const payload = {
      prompt,
      image,
      duration: Number(durationEl.value),
      aspectRatio: ratioEl.value,
      provider: providerEl.value,
      model: modelEl.value,
      scenes
    };

    const res = await fetch(`${API_BASE}/api/video/generate`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Generation request failed");

    message(`Job ${data.jobId} submitted.`);
    await poll(data.jobId);
  } catch (err) {
    message(err.message);
    setStatus("Error", false);
  } finally {
    generateBtn.disabled = false;
  }
}

async function poll(jobId) {
  for (;;) {
    const res = await fetch(`${API_BASE}/api/video/status/${encodeURIComponent(jobId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Status request failed");

    if (data.status === "completed") {
      videoEl.src = data.videoUrl;
      previewEl.classList.add("has-video");
      downloadBtn.href = data.videoUrl;
      downloadBtn.classList.remove("disabled");
      message("Video generation completed.");
      setStatus("Ready", false);
      return;
    }
    if (data.status === "failed") throw new Error(data.error || "Video generation failed");
    message(`Status: ${data.status}...`);
    await new Promise(r => setTimeout(r, 2000));
  }
}
generateBtn.addEventListener("click", generate);
setStatus("Ready", false);
