/* AI Video Tool - Video Renderer V3.3
   Exact-duration frame renderer.
   No fade transition. OAuth and Pollinations image generation untouched.
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

    const status = text => {
      if (typeof window.setStatus === "function") window.setStatus(text, "");
    };

    const dims = aspect => {
      if (typeof window.dims === "function") return window.dims(aspect);
      if (aspect === "9:16") return [768, 1365];
      if (aspect === "1:1") return [1024, 1024];
      return [1365, 768];
    };

    const ease = t => t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    async function render() {
      if (!image.src || !image.naturalWidth) {
        status("Buat gambar AI terlebih dahulu.");
        return;
      }

      button.disabled = true;
      status("Membuat video V3.3...");

      try {
        const duration = Math.max(1, Number(durationEl?.value || 5));
        const [w, h] = dims(aspectEl?.value || "16:9");
        const fps = 30;
        const frames = Math.round(duration * fps);

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

        // captureStream is intentionally kept at the exact target FPS.
        const stream = canvas.captureStream(fps);
        const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

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

        function drawFrame(i) {
          const t = frames <= 1 ? 0 : i / (frames - 1);
          const e = ease(t);

          // Same cinematic motion, without fade.
          const scale = baseScale * (1 + 0.065 * e);
          const breath = Math.sin(t * Math.PI * 2.2) * 0.002;
          const finalScale = scale * (1 + breath);

          const panX =
            -0.018 +
            0.036 * e +
            Math.sin(t * Math.PI) * 0.018;

          const panY = Math.sin(t * Math.PI * 0.85) * 0.012;

          const dw = img.naturalWidth * finalScale;
          const dh = img.naturalHeight * finalScale;
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
        }

        recorder.start();

        /*
          Render exactly N frames at the requested FPS.
          The renderer itself is not shortened by an elapsed-time cutoff.
        */
        for (let i = 0; i < frames; i++) {
          drawFrame(i);
          await new Promise(resolve => setTimeout(resolve, 1000 / fps));
        }

        // Give the final frame one complete frame interval.
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));

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
        download.download = `ai-video-v3-3-${duration}s.webm`;
        download.textContent = `Download Video V3.3 (${duration}s)`;
        download.style.display = "block";

        status(`Video V3.3 selesai — target ${duration} detik.`);
      } catch (err) {
        console.error(err);
        status("Gagal membuat video: " + (err.message || err));
      } finally {
        button.disabled = false;
      }
    }

    button.onclick = render;
    return true;
  }

  if (!install()) {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  }
})();
