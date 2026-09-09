/* AI Video Tool - Improved Local Video Renderer V2
   Uses the existing generated AI image and creates a smoother cinematic WebM.
   No API key is used here.
*/
(() => {
  "use strict";

  function install() {
    const button = document.getElementById("videoBtn");
    const image = document.getElementById("imagePreview");
    const video = document.getElementById("videoPreview");
    const download = document.getElementById("download");
    const status = document.getElementById("status");
    const durationEl = document.getElementById("duration");
    const aspectEl = document.getElementById("aspect");

    if (!button || !image || !video || !download) return false;

    const setStatusSafe = (text, cls) => {
      if (typeof window.setStatus === "function") {
        window.setStatus(text, cls || "");
      } else if (status) {
        status.textContent = text;
        status.className = "status " + (cls || "");
      }
    };

    const getDims = (aspect) => {
      if (typeof window.dims === "function") return window.dims(aspect);
      if (aspect === "9:16") return [768, 1365];
      if (aspect === "1:1") return [1024, 1024];
      return [1365, 768];
    };

    function easeInOut(t) {
      return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
    }

    function smoothStep(t) {
      return t*t*(3 - 2*t);
    }

    async function makeBetterVideo() {
      if (!image.src || !image.naturalWidth) {
        setStatusSafe("Buat gambar AI terlebih dahulu.", "err");
        return;
      }

      button.disabled = true;
      setStatusSafe("Membuat video cinematic V2...");

      try {
        const duration = Math.max(1, Number(durationEl?.value || 5));
        const [w, h] = getDims(aspectEl?.value || "16:9");
        const fps = 30;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { alpha: false });

        const img = new Image();
        img.src = image.src;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const stream = canvas.captureStream(fps);
        let mime = "video/webm;codecs=vp9";
        if (!MediaRecorder.isTypeSupported(mime)) mime = "video/webm";
        const recorder = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: 8_000_000
        });

        const chunks = [];
        recorder.ondataavailable = e => {
          if (e.data && e.data.size) chunks.push(e.data);
        };

        const stopped = new Promise(resolve => {
          recorder.onstop = resolve;
        });

        // Cover image while preserving aspect ratio.
        const baseScale = Math.max(w / img.naturalWidth, h / img.naturalHeight);

        recorder.start(250);
        const start = performance.now();

        function draw(now) {
          const elapsed = (now - start) / 1000;
          const raw = Math.min(1, elapsed / duration);

          // Smooth cinematic motion: slow push-in + gentle lateral drift.
          const e = easeInOut(raw);
          const push = 1 + 0.055 * e;

          // Small breathing motion prevents the result from feeling static.
          const breath = Math.sin(raw * Math.PI * 4) * 0.0025;

          const scale = baseScale * (push + breath);
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;

          // Gentle arc from left to right, then settle.
          const arc = Math.sin(raw * Math.PI) * 0.035 - 0.012 * e;
          const vertical = Math.sin(raw * Math.PI * 0.9) * 0.012;

          const x = (w - dw) / 2 + arc * w;
          const y = (h - dh) / 2 + vertical * h;

          // Black background avoids transparent-frame flashes.
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, w, h);

          // Slight cinematic vignette.
          ctx.drawImage(img, x, y, dw, dh);

          const vignette = ctx.createRadialGradient(
            w/2, h/2, Math.min(w,h)*0.25,
            w/2, h/2, Math.max(w,h)*0.72
          );
          vignette.addColorStop(0, "rgba(0,0,0,0)");
          vignette.addColorStop(0.72, "rgba(0,0,0,0.05)");
          vignette.addColorStop(1, "rgba(0,0,0,0.28)");
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, w, h);

          // Very subtle exposure fade at the first/last frames.
          const fadeIn = Math.min(1, raw / 0.08);
          const fadeOut = Math.min(1, (1 - raw) / 0.08);
          const opacity = Math.min(fadeIn, fadeOut);
          if (opacity < 1) {
            ctx.fillStyle = `rgba(0,0,0,${1-opacity})`;
            ctx.fillRect(0, 0, w, h);
          }

          if (raw < 1) {
            requestAnimationFrame(draw);
          } else {
            // Keep final frame visible briefly before stopping.
            setTimeout(() => recorder.stop(), 80);
          }
        }

        requestAnimationFrame(draw);
        await stopped;

        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        if (video.dataset.objectUrl) {
          URL.revokeObjectURL(video.dataset.objectUrl);
        }
        video.dataset.objectUrl = url;
        video.src = url;
        video.style.display = "block";
        video.load();

        download.href = url;
        download.download = "ai-video-cinematic-v2.webm";
        download.textContent = "Download Video V2";
        download.style.display = "block";

        setStatusSafe("Video cinematic V2 berhasil dibuat.", "ok");
      } catch (error) {
        console.error(error);
        setStatusSafe("Gagal membuat video: " + (error.message || error), "err");
      } finally {
        button.disabled = false;
      }
    }

    // Replace only the video action. OAuth and image generation remain untouched.
    button.onclick = makeBetterVideo;
    return true;
  }

  if (!install()) {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  }
})();
