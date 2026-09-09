/* ai_video_real_v3.js
   Pollinations image-to-video V3
   - Uploads the generated image blob to Pollinations Media
   - Sends the resulting public HTTPS image URL to the video endpoint
   - Uses wan-pro by default because current Pollinations docs describe it as supporting image/reference-to-video
   - Keeps the existing OAuth/session token
*/
"use strict";

(function () {
  const videoBtn = document.getElementById("videoBtn");
  const promptEl = document.getElementById("prompt");
  const durationEl = document.getElementById("duration");
  const aspectEl = document.getElementById("aspect");
  const imageEl = document.getElementById("imagePreview");
  const videoEl = document.getElementById("videoPreview");
  const downloadEl = document.getElementById("download");

  if (!videoBtn || !imageEl || !videoEl || !downloadEl) return;

  const VIDEO_MODEL = "wan-pro";
  let currentVideoUrl = null;

  function status(text, cls) {
    if (typeof window.setStatus === "function") {
      window.setStatus(text, cls || "");
      return;
    }
    const el = document.getElementById("status");
    if (el) {
      el.textContent = text;
      el.className = "status " + (cls || "");
    }
  }

  function token() {
    return sessionStorage.getItem("polli_access_token") ||
           sessionStorage.getItem("pollinations_access_token") ||
           sessionStorage.getItem("access_token") ||
           sessionStorage.getItem("pollinations_token");
  }

  function aspectRatio() {
    const a = aspectEl ? aspectEl.value : "16:9";
    return a === "9:16" ? "9:16" : a === "1:1" ? "1:1" : "16:9";
  }

  async function uploadImage(blob) {
    const key = token();
    if (!key) throw new Error("Sesi Pollinations tidak ditemukan. Hubungkan kembali.");

    const form = new FormData();
    form.append("file", blob, "ai-reference.png");

    const r = await fetch("https://media.pollinations.ai/upload", {
      method: "POST",
      headers: { Authorization: "Bearer " + key },
      body: form
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.url) {
      throw new Error(data.error || data.message || ("Upload gambar HTTP " + r.status));
    }
    return data.url;
  }

  async function makeRealVideo() {
    const key = token();
    if (!key) {
      status("Hubungkan Pollinations terlebih dahulu.", "err");
      return;
    }

    if (!imageEl.src || !imageEl.src.startsWith("blob:")) {
      status("Buat gambar AI terlebih dahulu.", "err");
      return;
    }

    videoBtn.disabled = true;
    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
      currentVideoUrl = null;
    }

    try {
      const duration = Number(durationEl ? durationEl.value : 5);
      const ratio = aspectRatio();

      status("1/3 Mengambil gambar AI...");

      const imageResponse = await fetch(imageEl.src);
      if (!imageResponse.ok) throw new Error("Gagal membaca gambar AI.");
      const imageBlob = await imageResponse.blob();

      status("2/3 Mengunggah gambar sebagai reference image...");
      const imageUrl = await uploadImage(imageBlob);

      status("3/3 Membuat video AI dengan reference image...");

      const userPrompt = (promptEl ? promptEl.value : "").trim();
      const motionPrompt =
        userPrompt +
        ". Animate the exact subject from the reference image. " +
        "The subject must move continuously and naturally from the first frame to the last frame. " +
        "Preserve the subject's identity, appearance, colors, proportions and environment. " +
        "Do not create a new subject. " +
        "For a walking animal, show clear alternating leg steps, body weight shifting, natural head movement and tail movement. " +
        "Use realistic physics and continuous motion. " +
        "Camera movement should be subtle and cinematic. " +
        "No frozen pose, no slideshow, no morphing, no sudden scene change.";

      const params = new URLSearchParams({
        model: VIDEO_MODEL,
        duration: String(duration),
        aspectRatio: ratio,
        image: imageUrl
      });

      const videoUrl =
        "https://gen.pollinations.ai/video/" +
        encodeURIComponent(motionPrompt) +
        "?" + params.toString();

      const r = await fetch(videoUrl, {
        headers: { Authorization: "Bearer " + key }
      });

      if (!r.ok) {
        if (r.status === 401) {
          sessionStorage.removeItem("polli_access_token");
        }
        const text = await r.text().catch(() => "");
        throw new Error("Video HTTP " + r.status + (text ? ": " + text.slice(0, 180) : ""));
      }

      const blob = await r.blob();
      if (!blob.size) throw new Error("Video kosong.");
      currentVideoUrl = URL.createObjectURL(blob);

      videoEl.src = currentVideoUrl;
      videoEl.style.display = "block";
      videoEl.controls = true;
      videoEl.load();

      downloadEl.href = currentVideoUrl;
      downloadEl.download = "ai-video-wan-pro.mp4";
      downloadEl.textContent = "Download Video MP4";
      downloadEl.style.display = "block";

      status(
        "Video AI berhasil dibuat dengan reference image (" +
        VIDEO_MODEL + ").",
        "ok"
      );
    } catch (e) {
      status("Gagal membuat video AI: " + (e && e.message ? e.message : e), "err");
    } finally {
      videoBtn.disabled = false;
    }
  }

  videoBtn.onclick = makeRealVideo;
})();
