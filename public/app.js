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
const statusDot = document.getElementById("statusDot");

const timeline = new VideoTimeline(document.getElementById("timeline"));
timeline.onChange = scenes => console.log("Timeline:", scenes);
document.getElementById("addSceneBtn").addEventListener("click", () => timeline.addScene());

let currentObjectUrl = null;

function setStatus(text, busy = false) {
  statusText.textContent = text;
  statusDot.style.background = busy ? "#d7a63d" : "#48c774";
}

function message(text) {
  messageEl.textContent = text;
}

function updateRatioOptions() {
  const hasImage = Boolean(imageEl.files && imageEl.files[0]);
  const square = ratioEl.querySelector('option[value="1:1"]');
  if (square) square.disabled = !hasImage;
  if (!hasImage && ratioEl.value === "1:1") ratioEl.value = "16:9";
}

function updateProviderUI() {
  const isMock = providerEl.value === "mock";
  const localOption = modelEl.querySelector('option[value="local"]');
  const runwayOption = modelEl.querySelector('option[value="gen4.5"]');
  if (localOption) localOption.hidden = !isMock;
  if (runwayOption) runwayOption.hidden = isMock;
  modelEl.value = isMock ? "local" : "gen4.5";
  if (isMock) {
    message("Free Local Testing: no Runway credits required.");
  } else {
    message("Runway mode requires Runway API credits.");
  }
}

imageEl.addEventListener("change", updateRatioOptions);
providerEl.addEventListener("change", updateProviderUI);
updateRatioOptions();
updateProviderUI();

async function loadImage(file) {
  if (!file) return null;
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function fitImage(ctx, img, w, h) {
  if (!img) return;
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

function drawFrame(ctx, w, h, t, total, prompt, img) {
  const p = Math.min(1, t / Math.max(total, 0.001));

  if (img) {
    ctx.save();
    ctx.translate(Math.sin(t * 0.35) * 8, Math.cos(t * 0.28) * 5);
    ctx.scale(1.02 + p * 0.025, 1.02 + p * 0.025);
    fitImage(ctx, img, w, h);
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.fillRect(0, 0, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, w, h);
    const shift = Math.sin(t * 0.55) * 80;
    g.addColorStop(0, `hsl(${220 + shift / 4}, 55%, 18%)`);
    g.addColorStop(0.5, `hsl(${270 + shift / 5}, 50%, 24%)`);
    g.addColorStop(1, `hsl(${190 + shift / 3}, 55%, 14%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 18; i++) {
      const x = ((i * 137 + t * (18 + i)) % (w + 180)) - 90;
      const y = (i * 71) % h;
      const r = 8 + (i % 5) * 4;
      ctx.fillStyle = `rgba(255,255,255,${0.025 + (i % 3) * 0.015})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `${Math.max(22, Math.round(w / 34))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapText(ctx, prompt || "Free Local Video Preview", w * 0.82);
  const lineH = Math.max(32, Math.round(w / 25));
  const startY = h * 0.76 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, startY + i * lineH));

  ctx.font = `${Math.max(14, Math.round(w / 70))}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("FREE LOCAL TEST", w / 2, h - 28);

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(0, h - 6, w, 6);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillRect(0, h - 6, w * p, 6);
}

async function generateLocalVideo({ prompt, duration, aspectRatio, imageFile, scenes }) {
  if (!window.MediaRecorder) {
    throw new Error("Browser does not support local video recording. Try Chrome or Brave.");
  }

  const sizes = {
    "16:9": [1280, 720],
    "9:16": [720, 1280],
    "1:1": [720, 720]
  };
  const [w, h] = sizes[aspectRatio] || sizes["16:9"];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const stream = canvas.captureStream(30);

  const mimeTypes = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  const mimeType = mimeTypes.find(x => MediaRecorder.isTypeSupported(x));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };

  const img = await loadImage(imageFile);
  const sceneList = scenes.length
    ? scenes.filter(s => String(s.prompt || "").trim()).map(s => ({
        prompt: String(s.prompt).trim(),
        duration: Math.max(1, Number(s.duration) || 1)
      }))
    : [{ prompt: prompt || "Free Local Video Preview", duration: Math.max(1, Number(duration) || 5) }];

  const total = sceneList.reduce((sum, s) => sum + s.duration, 0);
  recorder.start(250);

  const start = performance.now();
  return await new Promise((resolve, reject) => {
    function frame(now) {
      const elapsed = (now - start) / 1000;
      if (elapsed >= total) {
        drawFrame(ctx, w, h, total, total, sceneList[sceneList.length - 1].prompt, img);
        recorder.stop();
        return;
      }

      let acc = 0;
      let current = sceneList[0];
      let localT = elapsed;
      for (const scene of sceneList) {
        if (elapsed < acc + scene.duration) {
          current = scene;
          localT = elapsed - acc;
          break;
        }
        acc += scene.duration;
      }

      drawFrame(ctx, w, h, localT, current.duration, current.prompt, img);
      message(`Creating free local video: ${Math.floor((elapsed / total) * 100)}%`);
      requestAnimationFrame(frame);
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      resolve(blob);
    };
    recorder.onerror = e => reject(e.error || new Error("Local recording failed"));
    requestAnimationFrame(frame);
  });
}

async function generate() {
  const prompt = promptEl.value.trim();
  const scenes = timeline.getScenes();
  if (!prompt && !scenes.length) return message("Enter a prompt or add a scene.");

  if (providerEl.value === "mock") {
    generateBtn.disabled = true;
    downloadBtn.classList.add("disabled");
    setStatus("Creating", true);
    message("Creating a free local video. No API credits are used...");
    try {
      const blob = await generateLocalVideo({
        prompt,
        duration: Number(durationEl.value),
        aspectRatio: ratioEl.value,
        imageFile: imageEl.files[0],
        scenes
      });
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = URL.createObjectURL(blob);
      videoEl.src = currentObjectUrl;
      previewEl.classList.add("has-video");
      downloadBtn.href = currentObjectUrl;
      downloadBtn.download = `ai-video-free-${Date.now()}.webm`;
      downloadBtn.classList.remove("disabled");
      message("Free video created successfully. You can play and download it.");
      setStatus("Ready", false);
    } catch (err) {
      message(err.message || "Free local generation failed.");
      setStatus("Error", false);
    } finally {
      generateBtn.disabled = false;
    }
    return;
  }

  if (!imageEl.files[0] && ratioEl.value === "1:1") ratioEl.value = "16:9";
  generateBtn.disabled = true;
  setStatus("Generating", true);
  message("Submitting Runway generation job...");
  downloadBtn.classList.add("disabled");

  try {
    const image = imageEl.files[0] ? await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(imageEl.files[0]);
    }) : null;

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
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`${API_BASE}/api/video/status?jobId=${encodeURIComponent(jobId)}`);
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
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

generateBtn.addEventListener("click", generate);
setStatus("Ready", false);
