/* AI Video Tool - Improved Local Video Renderer V3
   Keeps OAuth and Pollinations image generation untouched.
   Uses the selected 5/10 second duration and adds smoother cinematic motion.
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

    async function makeVideoV3() {
      if (!image.src || !image.naturalWidth) {
        setStatusSafe("Buat gambar AI terlebih dahulu.", "err");
        return;
      }

      button.disabled = true;
      setStatusSafe("Membuat video cinematic V3...");

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

        recorder.start(250);
        const start = performance.now();

        function draw(now) {
          const elapsed = (now - start) / 1000;
          const raw = Math.min(1, elapsed / duration);
          const e = ease(raw);

          /*
            V3 motion:
            - slow push-in
            - horizontal camera drift
            - slight vertical drift
            - very subtle breathing
            - motion reverses gently near the end
          */
          const push = 1 + 0.065 * e;
          const breath = Math.sin(raw * Math.PI * 2.2) * 0.002;

          const panX =
            -0.018 +
            0.036 * e +
            Math.sin(raw * Math.PI) * 0.018;

          const panY =
            Math.sin(raw * Math.PI * 0.85) * 0.012;

          const scale = baseScale * (push + breath);
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;

          const x = (w - dw) / 2 + panX * w;
          const y = (h - dh) / 2 + panY * h;

          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, w, h);

          ctx.drawImage(img, x, y, dw, dh);

          // Cinematic vignette.
          const vignette = ctx.createRadialGradient(
            w / 2, h / 2, Math.min(w, h) * 0.25,
            w / 2, h / 2, Math.max(w, h) * 0.72
          );
          vignette.addColorStop(0, "rgba(0,0,0,0)");
          vignette.addColorStop(0.72, "rgba(0,0,0,0.045)");
          vignette.addColorStop(1, "rgba(0,0,0,0.25)");
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, w, h);

          // Smooth fade.
          const fadeIn = Math.min(1, raw / 0.10);
          const fadeOut = Math.min(1, (1 - raw) / 0.10);
          const opacity = Math.min(fadeIn, fadeOut);

          if (opacity < 1) {
            ctx.fillStyle = `rgba(0,0,0,${1 - opacity})`;
            ctx.fillRect(0, 0, w, h);
          }

          if (raw < 1) {
            requestAnimationFrame(draw);
          } else {
            setTimeout(() => recorder.stop(), 100);
          }
        }

        requestAnimationFrame(draw);
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
        download.download = `ai-video-cinematic-v3-${duration}s.webm`;
        download.textContent = `Download Video V3 (${duration}s)`;
        download.style.display = "block";

        setStatusSafe(
          `Video cinematic V3 berhasil dibuat (${duration} detik).`,
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

    button.onclick = makeVideoV3;
    return true;
  }

  if (!install()) {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  }
})();
