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

let currentVideoUrl = null;

function updateRatioOptions() {
  if (!ratioEl || !imageEl) return;
  const hasImage = Boolean(imageEl.files && imageEl.files[0]);
  const square = ratioEl.querySelector('option[value="1:1"]');

  if (square) square.disabled = !hasImage;
  if (!hasImage && ratioEl.value === "1:1") ratioEl.value = "16:9";
}

if (imageEl) {
  imageEl.addEventListener("change", updateRatioOptions);
  updateRatioOptions();
}

let timeline = null;
const timelineEl = document.getElementById("timeline");
if (timelineEl && typeof VideoTimeline !== "undefined") {
  timeline = new VideoTimeline(timelineEl);
  timeline.onChange = scenes => console.log("Timeline:", scenes);
}

const addSceneBtn = document.getElementById("addSceneBtn");
if (addSceneBtn && timeline) {
  addSceneBtn.addEventListener("click", () => timeline.addScene());
}

function setStatus(text, busy = false) {
  if (statusText) statusText.textContent = text;
  if (statusDot) statusDot.style.background = busy ? "#d7a63d" : "#48c774";
}

function message(text) {
  if (messageEl) messageEl.textContent = text;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toDataUrl(file) {
  if (!file) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getCanvasSize(ratio) {
  if (ratio === "9:16") return [720, 1280];
  if (ratio === "1:1") return [720, 720];
  return [1280, 720];
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

function loadImage(dataUrl) {
  if (!dataUrl) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Reference image could not be loaded"));
    img.src = dataUrl;
  });
}

function drawCover(ctx, img, canvas, progress) {
  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  const zoom = 1 + progress * 0.08;
  const w = img.width * scale * zoom;
  const h = img.height * scale * zoom;
  const x = (canvas.width - w) / 2 - Math.sin(progress * Math.PI) * 20;
  const y = (canvas.height - h) / 2 - Math.cos(progress * Math.PI) * 10;
  ctx.drawImage(img, x, y, w, h);
}

function drawLocalFrame(ctx, canvas, img, prompt, progress) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (img) {
    drawCover(ctx, img, canvas, progress);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const p = (Math.sin(progress * Math.PI * 2) + 1) / 2;
    g.addColorStop(0, `rgb(${18 + Math.round(p * 15)}, ${22 + Math.round(p * 12)}, ${34 + Math.round(p * 18)})`);
    g.addColorStop(1, `rgb(${45 + Math.round(p * 18)}, ${35 + Math.round(p * 12)}, ${28 + Math.round(p * 20)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 18; i++) {
      const x = ((i * 97) + progress * 500) % (canvas.width + 120) - 60;
      const y = (i * 83) % canvas.height;
      const r = 18 + (i % 4) * 8;
      ctx.fillStyle = `rgba(255,255,255,${0.035 + (i % 3) * 0.015})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const fontSize = Math.max(26, Math.round(canvas.width * 0.035));
  ctx.font = `600 ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapText(ctx, prompt || "Free Local Preview", canvas.width * 0.78);
  const lineHeight = fontSize * 1.35;
  const totalHeight = lines.length * lineHeight;
  const startY = canvas.height * 0.72 - totalHeight / 2;

  ctx.fillStyle = "rgba(0,0,0,0.52)";
  const boxH = totalHeight + fontSize * 1.3;
  ctx.fillRect(canvas.width * 0.08, startY - fontSize * 0.65, canvas.width * 0.84, boxH);

  ctx.fillStyle = "#ffffff";
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });

  ctx.font = `500 ${Math.max(16, Math.round(fontSize * 0.55))}px Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("FREE LOCAL PREVIEW", canvas.width / 2, canvas.height * 0.10);
}

async function generateFreeLocal() {
  if (!("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error("Browser ini tidak mendukung local video recording. Coba Chrome atau Brave terbaru.");
  }

  const duration = Math.max(1, Number(durationEl?.value || 5));
  const ratio = ratioEl?.value || "16:9";
  const prompt = promptEl?.value.trim() || "Free Local Preview";
  const imageData = await toDataUrl(imageEl?.files?.[0]);

  const [width, height] = getCanvasSize(ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  const img = await loadImage(imageData);

  const stream = canvas.captureStream(30);
  const mimeCandidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  const mimeType = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type));

  if (!mimeType) {
    throw new Error("Browser tidak mendukung format video WebM.");
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000
  });

  const chunks = [];
  recorder.ondataavailable = event => {
    if (event.data && event.data.size) chunks.push(event.data);
  };

  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = resolve;
    recorder.onerror = event => reject(event.error || new Error("Video recorder error"));
  });

  recorder.start(250);

  const start = performance.now();
  const end = start + duration * 1000;

  function frame(now) {
    const progress = Math.min(1, (now - start) / (duration * 1000));
    drawLocalFrame(ctx, canvas, img, prompt, progress);

    if (now < end) {
      requestAnimationFrame(frame);
    } else {
      recorder.stop();
    }
  }

  requestAnimationFrame(frame);
  await stopped;

  stream.getTracks().forEach(track => track.stop());

  return new Blob(chunks, { type: mimeType });
}

async function generateRunway() {
  const prompt = promptEl?.value.trim() || "";
  const scenes = timeline ? timeline.getScenes() : [];

  if (!prompt && !scenes.length) {
    throw new Error("Enter a prompt or add a scene.");
  }

  if (
    providerEl?.value === "runway" &&
    !imageEl?.files?.[0] &&
    ratioEl?.value === "1:1"
  ) {
    ratioEl.value = "16:9";
  }

  const image = await toDataUrl(imageEl?.files?.[0]);

  const payload = {
    prompt,
    image,
    duration: Number(durationEl?.value || 5),
    aspectRatio: ratioEl?.value || "16:9",
    provider: providerEl?.value || "runway",
    model: modelEl?.value || "gen4.5",
    scenes
  };

  const res = await fetch(`${API_BASE}/api/video/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Generation request failed");
  }

  message(`Job ${data.jobId} submitted.`);
  await pollRunway(data.jobId);
}

async function pollRunway(jobId) {
  for (;;) {
    const res = await fetch(
      `${API_BASE}/api/video/status?jobId=${encodeURIComponent(jobId)}`
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Status request failed");
    }

    if (data.status === "completed") {
      showVideo(data.videoUrl);
      message("Video generation completed.");
      setStatus("Ready", false);
      return;
    }

    if (data.status === "failed") {
      throw new Error(data.error || "Video generation failed");
    }

    message(`Status: ${data.status}...`);
    await sleep(2000);
  }
}

function showVideo(url) {
  if (currentVideoUrl && currentVideoUrl.startsWith("blob:")) {
    URL.revokeObjectURL(currentVideoUrl);
  }

  currentVideoUrl = url;

  if (videoEl) {
    videoEl.src = url;
    videoEl.controls = true;
    videoEl.muted = false;
    videoEl.load();
  }

  if (previewEl) previewEl.classList.add("has-video");

  if (downloadBtn) {
    downloadBtn.href = url;
    downloadBtn.download = "free-local-video.webm";
    downloadBtn.classList.remove("disabled");
  }
}

async function generate() {
  generateBtn.disabled = true;
  setStatus("Generating", true);
  message("Preparing video...");

  if (downloadBtn) downloadBtn.classList.add("disabled");

  try {
    if ((providerEl?.value || "").toLowerCase().includes("free")) {
      message("Rendering video locally in this browser...");
      const blob = await generateFreeLocal();
      const url = URL.createObjectURL(blob);
      showVideo(url);
      message("Video selesai dibuat secara gratis di perangkat.");
      setStatus("Ready", false);
    } else {
      await generateRunway();
    }
  } catch (err) {
    message(err.message || "Generation failed.");
    setStatus("Error", false);
  } finally {
    generateBtn.disabled = false;
  }
}

if (generateBtn) generateBtn.addEventListener("click", generate);
setStatus("Ready", false);
