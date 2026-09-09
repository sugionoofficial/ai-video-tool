/* ai_video_real_v4.js - Pollinations wan-fast */
"use strict";

(() => {
  const MODEL = "wan-fast";
  const API_BASE = "https://gen.pollinations.ai";
  const MEDIA_UPLOAD_URL = "https://media.pollinations.ai/upload";

  const videoBtn = document.getElementById("videoBtn");
  const statusEl = document.getElementById("status");
  const imageEl = document.getElementById("imagePreview");
  const videoEl = document.getElementById("videoPreview");
  const downloadEl = document.getElementById("download");

  if (!videoBtn || !statusEl || !imageEl || !videoEl || !downloadEl) {
    console.error("ai_video_real_v4.js: elemen UI tidak ditemukan.");
    return;
  }

  let videoObjectUrl = null;

  function status(text, cls = "") {
    statusEl.textContent = text;
    statusEl.className = "status " + cls;
  }

  function getToken() {
    return sessionStorage.getItem("polli_access_token") ||
           sessionStorage.getItem("pollinations_access_token") ||
           sessionStorage.getItem("access_token") || null;
  }

  function getDuration() {
    const n = Number(document.getElementById("duration")?.value || 5);
    return Math.max(1, Math.min(10, n));
  }

  function getAspect() {
    return document.getElementById("aspect")?.value || "16:9";
  }

  async function uploadImage(token) {
    if (!imageEl.src || !imageEl.src.startsWith("blob:")) {
      throw new Error("Gambar hasil AI tidak tersedia.");
    }

    const imageResponse = await fetch(imageEl.src);
    if (!imageResponse.ok) throw new Error("Tidak dapat membaca gambar hasil AI.");

    const blob = await imageResponse.blob();
    const form = new FormData();
    form.append("file", blob, "reference-image.jpg");

    const response = await fetch(MEDIA_UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: form
    });

    const text = await response.text();
    let data = {};
    try { data = JSON.parse(text); } catch (_) {}

    if (!response.ok) {
      throw new Error(
        "Upload gambar HTTP " + response.status + ": " +
        (data?.error?.message || data?.error || text || "unknown error")
      );
    }

    const imageUrl = data?.url || data?.data?.url || data?.media?.url;
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      throw new Error("Upload berhasil tetapi URL gambar tidak ditemukan.");
    }
    return imageUrl;
  }

  function buildPrompt() {
    const source =
      document.getElementById("prompt")?.value?.trim() ||
      "a realistic orange cat walking naturally through a green garden";

    return [
      "Create a photorealistic image-to-video clip from the supplied reference image.",
      "Preserve the exact main subject, appearance, colors, environment and composition.",
      "The subject must visibly move continuously and naturally.",
      "If the subject is an animal, show a clear natural walking sequence with alternating leg steps, body weight shifting, head movement and subtle tail movement.",
      "Use realistic motion and physics with temporal consistency.",
      "Do not freeze, morph, duplicate or distort the subject.",
      "No text, subtitles or watermark.",
      "Source description: " + source
    ].join(" ");
  }

  async function generateVideo() {
    const token = getToken();

    if (!token) {
      status("Hubungkan Pollinations terlebih dahulu.", "err");
      return;
    }
    if (!imageEl.src) {
      status("Buat gambar AI terlebih dahulu.", "err");
      return;
    }

    videoBtn.disabled = true;

    try {
      status("Mengunggah gambar referensi...");
      const imageUrl = await uploadImage(token);

      const params = new URLSearchParams({
        model: MODEL,
        duration: String(getDuration()),
        aspectRatio: getAspect(),
        image: imageUrl
      });

      status("Membuat video AI dengan wan-fast...");

      const response = await fetch(
        API_BASE + "/video/" + encodeURIComponent(buildPrompt()) +
        "?" + params.toString(),
        { headers: { Authorization: "Bearer " + token } }
      );

      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try {
          const data = JSON.parse(text);
          message = data?.error?.message || data?.error || data?.message || text;
        } catch (_) {}
        throw new Error("Video HTTP " + response.status + ": " + message);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("video")) {
        throw new Error("Server tidak mengembalikan video.");
      }

      const videoBlob = await response.blob();

      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
      videoObjectUrl = URL.createObjectURL(videoBlob);

      videoEl.src = videoObjectUrl;
      videoEl.style.display = "block";
      videoEl.load();

      downloadEl.href = videoObjectUrl;
      downloadEl.download = "ai-video-wan-fast.mp4";
      downloadEl.style.display = "block";

      status("Video AI berhasil dibuat dengan wan-fast.", "ok");
    } catch (error) {
      console.error(error);
      status(
        "Gagal membuat video AI: " + (error?.message || String(error)),
        "err"
      );
    } finally {
      videoBtn.disabled = false;
    }
  }

  videoBtn.onclick = generateVideo;
  videoBtn.disabled = !imageEl.src;
})();
