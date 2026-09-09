/* AI Video Tool - Video Renderer V3.2
   Duration compensation for MediaRecorder/captureStream timing.
   The selected duration is rendered plus a 1-second encoder tail,
   so a requested 5s/10s video is much closer to the requested length.
   Pollinations OAuth and image generation are untouched.
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
      if (typeof window.setStatus === "function") window.setStatus(text, cls || "");
    };

    const getDims = (aspect) => {
      if (typeof window.dims === "function") return window.dims(aspect);
      if (aspect === "9:16") return [768, 1365];
      if (aspect === "1:1") return [1024, 1024];
      return [1365, 768];
    };

    const ease = t => t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    async function makeVideoV32() {
      if (!image.src || !image.naturalWidth) {
        setStatusSafe("Buat gambar AI terlebih dahulu.", "err");
        return;
      }

      button.disabled = true;
      setStatusSafe("Membuat video cinematic V3.2...");

      try {
        const requested = Math.max(1, Number(durationEl?.value || 5));
        const [w, h] = getDims(aspectEl?.value || "16:9");
        const fps = 30;

        // MediaRecorder/captureStream commonly reports about one second
        // shorter in this browser setup. Compensate with a real encoded tail.
        const encoderTail = 1.0;
        const recordDuration = requested + encoderTail;
        const contentFrames = Math.max(2, Math.round(requested * fps));

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

        function draw(t) {
          const e = ease(t);
          const push = 1 + 0.065 * e;
          const breath = Math.sin(t * Math.PI * 2.2) * 0.002;
          const panX = -0.018 + 0.036 * e + Math.sin(t * Math.PI) * 0.018;
          const panY = Math.sin(t * Math.PI * 0.85) * 0.012;

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

        recorder.start(100);

        // Drive frames from an elapsed-time clock for stable pacing.
        const start = performance.now();
        await new Promise(resolve => {
          function tick(now) {
            const elapsed = (now - start) / 1000;
            const t = Math.min(1, elapsed / requested);
            draw(t);

            if (elapsed < recordDuration) {
              requestAnimationFrame(tick);
            } else {
              // Keep the final frame encoded through the compensated tail.
              setTimeout(resolve, 100);
            }
          }
          draw(0);
          requestAnimationFrame(tick);
        });

        recorder.stop();
        await stopped;
        stream.getTracks().forEach(track => track.stop());

        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        if (video.dataset.objectUrl) URL.revokeObjectURL(video.dataset.objectUrl);
        video.dataset.objectUrl = url;
        video.src = url;
        video.style.display = "block";
        video.load();

        download.href = url;
        download.download = `ai-video-cinematic-v3-2-${requested}s.webm`;
        download.textContent = `Download Video V3.2 (${requested}s)`;
        download.style.display = "block";

        setStatusSafe(
          `Video cinematic V3.2 selesai (${requested} detik).`,
          "ok"
        );
      } catch (error) {
        console.error(error);
        setStatusSafe("Gagal membuat video: " + (error.message || error), "err");
      } finally {
        button.disabled = false;
      }
    }

    button.onclick = makeVideoV32;
    return true;
  }

  if (!install()) {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  }
})();
