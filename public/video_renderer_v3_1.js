/* AI Video Tool - Video Renderer V3.1
   Duration-accurate local WebM renderer.
   Keeps Pollinations OAuth and image generation untouched.
   No API key is used here.
*/
(() => {
  "use strict";

  function install() {
    const button = document.getElementById("videoBtn");
    const image = document.getElementById("imagePreview");
    const video = document.getElementById("videoPreview");
    const download = document.getElementById("download");
    const durationEl = document.getElementById("duration");
    const aspectEl = document.getElementById("aspect");

    if (!button || !image || !video || !download) return false;

    const setStatusSafe = (text, cls) => {
      if (typeof window.setStatus === "function") {
        window.setStatus(text, cls || "");
      }
    };

    const getDims = (aspect) => {
      if (typeof window.dims === "function") return window.dims(aspect);
      if (aspect === "9:16") return [768, 1365];
      if (aspect === "1:1") return [1024, 1024];
      return [1365, 768];
    };

    function ease(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    async function makeVideoV31() {
      if (!image.src || !image.naturalWidth) {
        setStatusSafe("Buat gambar AI terlebih dahulu.", "err");
        return;
      }

      button.disabled = true;
      setStatusSafe("Membuat video cinematic V3.1...");

      try {
        const duration = Math.max(1, Number(durationEl?.value || 5));
        const [w, h] = getDims(aspectEl?.value || "16:9");
        const fps = 30;
        const totalFrames = Math.max(2, Math.round(duration * fps));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { alpha: false });

        const img = new Image();
        img.src = image.src;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Gambar gagal diproses."));
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

        const baseScale = Math.max(
          w / img.naturalWidth,
          h / img.naturalHeight
        );

        recorder.start(100);

        // Render an exact frame count instead of stopping from elapsed RAF time.
        // This prevents the common 5s -> ~4s / 10s -> ~9s result.
        let frame = 0;

        function renderFrame(frameIndex) {
          const t = frameIndex / (totalFrames - 1);
          const e = ease(t);

          // Same V3 cinematic motion.
          const push = 1 + 0.065 * e;
          const breath = Math.sin(t * Math.PI * 2.2) * 0.002;

          const panX =
            -0.018 +
            0.036 * e +
            Math.sin(t * Math.PI) * 0.018;

          const panY =
            Math.sin(t * Math.PI * 0.85) * 0.012;

          const scale = baseScale * (push + breath);
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;

          const x = (w - dw) / 2 + panX * w;
          const y = (h - dh) / 2 + panY * h;

          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, x, y, dw, dh);

          const vignette = ctx.createRadialGradient(
            w / 2, h / 2, Math.min(w, h) * 0.25,
            w / 2, h / 2, Math.max(w, h) * 0.72
          );
          vignette.addColorStop(0, "rgba(0,0,0,0)");
          vignette.addColorStop(0.72, "rgba(0,0,0,0.045)");
          vignette.addColorStop(1, "rgba(0,0,0,0.25)");
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, w, h);

          const fadeIn = Math.min(1, t / 0.10);
          const fadeOut = Math.min(1, (1 - t) / 0.10);
          const opacity = Math.min(fadeIn, fadeOut);

          if (opacity < 1) {
            ctx.fillStyle = `rgba(0,0,0,${1 - opacity})`;
            ctx.fillRect(0, 0, w, h);
          }
        }

        // Pace frames using the requested duration. The last frame is placed
        // exactly at duration, then MediaRecorder gets a final timeslice.
        const frameInterval = 1000 / fps;
        const renderStart = performance.now();

        await new Promise(resolve => {
          function tick(now) {
            const targetFrame = Math.min(
              totalFrames - 1,
              Math.floor((now - renderStart) / frameInterval)
            );

            while (frame <= targetFrame) {
              renderFrame(frame);
              frame++;
            }

            if (frame < totalFrames) {
              requestAnimationFrame(tick);
            } else {
              // Hold the final frame for one frame interval so the encoded
              // stream contains the complete requested duration.
              setTimeout(resolve, frameInterval);
            }
          }

          // Draw frame 0 immediately.
          renderFrame(0);
          frame = 1;
          requestAnimationFrame(tick);
        });

        recorder.stop();
        await stopped;

        stream.getTracks().forEach(track => track.stop());

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
        download.download = `ai-video-cinematic-v3-1-${duration}s.webm`;
        download.textContent = `Download Video V3.1 (${duration}s)`;
        download.style.display = "block";

        setStatusSafe(
          `Video cinematic V3.1 berhasil dibuat (${duration} detik).`,
          "ok"
        );
      } catch (error) {
        console.error(error);
        setStatusSafe(
          "Gagal membuat video: " + (error.message || error),
          "err"
        );
      } finally {
        button.disabled = false;
      }
    }

    button.onclick = makeVideoV31;
    return true;
  }

  if (!install()) {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  }
})();
