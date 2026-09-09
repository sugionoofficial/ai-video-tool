/*
  AI VIDEO RENDERER V1
  Uses Pollinations real video generation instead of local canvas animation.
  Requires an OAuth access token in sessionStorage.
*/

(() => {
  const videoBtn = document.getElementById("videoBtn");
  const videoPreview = document.getElementById("videoPreview");
  const imagePreview = document.getElementById("imagePreview");
  const promptEl = document.getElementById("prompt");
  const durationEl = document.getElementById("duration");
  const statusEl = document.getElementById("status");

  if (!videoBtn) return;

  const setStatusSafe = (text) => {
    if (typeof window.setStatus === "function") {
      window.setStatus(text);
    } else if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const getToken = () =>
    sessionStorage.getItem("pollinations_access_token") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("pollinations_token");

  const getPrompt = () => {
    const p = promptEl ? promptEl.value.trim() : "";
    return p || "cinematic natural motion, realistic camera movement, subtle subject movement";
  };

  const makeVideoUrl = (prompt, imageUrl, duration) => {
    const params = new URLSearchParams();
    params.set("model", "veo");
    params.set("duration", String(duration));

    // If the generated image is a public HTTP(S) URL, use it as the
    // reference image so the AI video starts from the same scene.
    if (/^https?:\/\//i.test(imageUrl || "")) {
      params.set("image", imageUrl);
    }

    return "https://gen.pollinations.ai/video/" +
      encodeURIComponent(prompt) + "?" + params.toString();
  };

  async function generateRealVideo() {
    const token = getToken();

    if (!token) {
      setStatusSafe("Hubungkan Pollinations terlebih dahulu.");
      return;
    }

    const imageUrl = imagePreview ? imagePreview.currentSrc || imagePreview.src : "";
    const duration = durationEl ? Number(durationEl.value) || 5 : 5;

    videoBtn.disabled = true;
    const oldText = videoBtn.textContent;
    videoBtn.textContent = "Membuat Video AI...";

    try {
      setStatusSafe("AI sedang membuat video nyata. Mohon tunggu...");

      const prompt =
        getPrompt() +
        ", preserve the identity, composition and main subject of the reference image, " +
        "photorealistic motion, physically natural movement, cinematic camera motion";

      const url = makeVideoUrl(prompt, imageUrl, duration);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "video/mp4, application/octet-stream"
        }
      });

      if (response.status === 401) {
        sessionStorage.removeItem("pollinations_access_token");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("pollinations_token");
        throw new Error("Sesi Pollinations sudah berakhir. Hubungkan kembali.");
      }

      if (!response.ok) {
        let detail = "";
        try { detail = await response.text(); } catch (_) {}
        throw new Error(
          "Video AI gagal (" + response.status + ")" +
          (detail ? ": " + detail.slice(0, 180) : "")
        );
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("Server mengembalikan video kosong.");
      }

      const objectUrl = URL.createObjectURL(blob);

      if (videoPreview) {
        videoPreview.src = objectUrl;
        videoPreview.controls = true;
        videoPreview.loop = false;
        videoPreview.muted = false;
        videoPreview.playsInline = true;
        videoPreview.load();
      }

      // Replace any existing download link if present.
      const download = document.getElementById("download");
      if (download) {
        download.href = objectUrl;
        download.download = "ai-video-" + duration + "s.mp4";
        download.style.display = "";
      }

      setStatusSafe("Video AI selesai. Ini video MP4 hasil generasi AI.");

      if (videoPreview) {
        try { await videoPreview.play(); } catch (_) {}
      }
    } catch (error) {
      console.error(error);
      setStatusSafe(error && error.message ? error.message : "Gagal membuat video AI.");
    } finally {
      videoBtn.disabled = false;
      videoBtn.textContent = oldText || "Jadikan Video";
    }
  }

  videoBtn.addEventListener("click", generateRealVideo);
})();
