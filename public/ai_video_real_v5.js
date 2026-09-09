/* ai_video_real_v5.js
   Pollinations image-to-video using detected Amazon Nova Reel.
   The index page must expose:
   - sessionStorage polli_access_token
   - #prompt, #duration, #aspect
   - #imagePreview, #videoPreview, #download, #videoBtn
   - window.detectedVideoModels (optional)
*/
"use strict";

(() => {
  const VIDEO_MODEL = "amazon/nova-reel-v1";
  const TOKEN_KEY = "polli_access_token";

  const videoBtn = document.getElementById("videoBtn");
  const imageEl = document.getElementById("imagePreview");
  const videoEl = document.getElementById("videoPreview");
  const downloadEl = document.getElementById("download");
  const promptEl = document.getElementById("prompt");
  const durationEl = document.getElementById("duration");
  const aspectEl = document.getElementById("aspect");
  const statusEl = document.getElementById("status");

  if (!videoBtn || !imageEl || !videoEl || !promptEl) return;

  function token() {
    return sessionStorage.getItem(TOKEN_KEY) ||
           sessionStorage.getItem("pollinations_access_token") ||
           sessionStorage.getItem("access_token") || null;
  }

  function setStatus(text, cls="") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = "status " + cls;
  }

  function detectedNovaReel() {
    const models = Array.isArray(window.detectedVideoModels)
      ? window.detectedVideoModels
      : [];
    return models.some(m => String(m).toLowerCase() === VIDEO_MODEL);
  }

  function ratio() {
    const a = aspectEl ? aspectEl.value : "16:9";
    return a === "9:16" ? "9:16" : a === "1:1" ? "1:1" : "16:9";
  }

  async function uploadReferenceImage(blob, t) {
    const form = new FormData();
    form.append("file", blob, "reference-image.png");

    const r = await fetch("https://media.pollinations.ai/upload", {
      method: "POST",
      headers: { Authorization: "Bearer " + t },
      body: form
    });

    const text = await r.text();
    let data = {};
    try { data = JSON.parse(text); } catch (_) {}

    if (!r.ok) {
      throw new Error(
        "Upload gambar gagal: HTTP " + r.status +
        (text ? " - " + text.slice(0,300) : "")
      );
    }

    const url = data.url || data.publicUrl || data.imageUrl ||
      (data.data && (data.data.url || data.data.publicUrl));

    if (!url || !/^https?:\/\//i.test(url)) {
      throw new Error("Upload berhasil tetapi URL gambar publik tidak ditemukan.");
    }

    return url;
  }

  function buildPrompt() {
    const p = promptEl.value.trim();
    return (
      p +
      ". Image-to-video animation. Preserve the exact subject, appearance, " +
      "colors and environment from the reference image. Natural continuous " +
      "motion, realistic body movement, realistic camera motion, consistent " +
      "identity, no frozen pose, no morphing, no duplicate subject, no text, " +
      "no watermark."
    ).trim();
  }

  async function makeVideo() {
    const t = token();

    if (!t) {
      setStatus("Token OAuth tidak ditemukan. Hubungkan Pollinations terlebih dahulu.", "err");
      return;
    }

    if (!detectedNovaReel()) {
      setStatus(
        "amazon/nova-reel-v1 tidak terdeteksi pada token ini. Video tidak dijalankan.",
        "err"
      );
      videoBtn.disabled = true;
      return;
    }

    if (!imageEl.src || !imageEl.src.startsWith("blob:")) {
      setStatus("Buat gambar AI terlebih dahulu.", "err");
      return;
    }

    videoBtn.disabled = true;
    videoEl.style.display = "none";
    if (downloadEl) downloadEl.style.display = "none";

    try {
      setStatus("Menyiapkan gambar referensi...");

      const imageResponse = await fetch(imageEl.src);
      const imageBlob = await imageResponse.blob();

      setStatus("Mengunggah gambar referensi ke Pollinations...");
      const imageUrl = await uploadReferenceImage(imageBlob, t);

      const requestedDuration = durationEl ? Number(durationEl.value) : 5;
      const duration = requestedDuration === 10 ? 10 : 5;

      const params = new URLSearchParams({
        model: VIDEO_MODEL,
        duration: String(duration),
        aspectRatio: ratio(),
        image: imageUrl
      });

      const url =
        "https://gen.pollinations.ai/video/" +
        encodeURIComponent(buildPrompt()) +
        "?" + params.toString();

      setStatus(
        "Membuat video AI dengan " + VIDEO_MODEL +
        ". Ini adalah request video yang dapat menggunakan Pollen."
      );

      const r = await fetch(url, {
        headers: { Authorization: "Bearer " + t }
      });

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        if (r.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
        }
        throw new Error(
          "Video gagal: HTTP " + r.status +
          (text ? " - " + text.slice(0,500) : "")
        );
      }

      const blob = await r.blob();

      if (!blob.type || !blob.type.toLowerCase().includes("video")) {
        throw new Error(
          "Server tidak mengembalikan video. Content-Type: " +
          (blob.type || "tidak diketahui")
        );
      }

      const videoUrl = URL.createObjectURL(blob);
      videoEl.src = videoUrl;
      videoEl.style.display = "block";

      if (downloadEl) {
        downloadEl.href = videoUrl;
        downloadEl.download = "ai-video-nova-reel.mp4";
        downloadEl.style.display = "block";
        downloadEl.textContent = "Download Video";
      }

      setStatus("Video AI berhasil dibuat dengan Amazon Nova Reel.", "ok");
    } catch (e) {
      setStatus(e.message || String(e), "err");
    } finally {
      videoBtn.disabled = !detectedNovaReel();
    }
  }

  videoBtn.addEventListener("click", makeVideo);
})();
