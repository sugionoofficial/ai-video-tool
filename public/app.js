// AI VIDEO TOOL v1.8 - SIMPLE FREE LOCAL MODE
(function () {
  "use strict";

  function start() {
    const $ = id => document.getElementById(id);

    const prompt = $("prompt");
    const provider = $("provider");
    const duration = $("duration");
    const aspect = $("aspectRatio");
    const imageInput = $("image");
    const generateBtn = $("generateBtn");
    const messageEl = $("message");
    const video = $("video");
    const download = $("downloadBtn");
    const statusText = $("statusText");

    if (!generateBtn) {
      console.error("Generate button not found");
      return;
    }

    function setMessage(text) {
      if (messageEl) messageEl.textContent = text;
      console.log(text);
    }

    function setStatus(text) {
      if (statusText) statusText.textContent = text;
    }

    function sizeForRatio(value) {
      if (value === "9:16") return [720, 1280];
      if (value === "1:1") return [720, 720];
      return [1280, 720];
    }

    function loadImage(file) {
      if (!file) return Promise.resolve(null);
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Gagal membaca gambar."));
        img.src = URL.createObjectURL(file);
      });
    }

    function drawFrame(ctx, canvas, img, text, p) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (img) {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const zoom = 1 + p * 0.08;
        const w = img.width * scale * zoom;
        const h = img.height * scale * zoom;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        ctx.fillStyle = "rgba(0,0,0,.38)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const a = Math.round(25 + p * 35);
        g.addColorStop(0, `rgb(${a},${a + 8},${a + 22})`);
        g.addColorStop(1, `rgb(${a + 30},${a + 12},${a})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 25; i++) {
          const x = ((i * 91 + p * 700) % (canvas.width + 160)) - 80;
          const y = (i * 73) % canvas.height;
          ctx.fillStyle = "rgba(255,255,255,.08)";
          ctx.fillRect(x, y, 3, 70 + (i % 5) * 25);
        }
      }

      const words = (text || "Free Local Preview").split(/\s+/);
      const lines = [];
      let line = "";
      const maxWidth = canvas.width * 0.78;
      const fontSize = Math.max(25, Math.round(canvas.width * 0.035));

      ctx.font = `600 ${fontSize}px Arial, sans-serif`;

      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width <= maxWidth) {
          line = test;
        } else {
          if (line) lines.push(line);
          line = word;
        }
      }
      if (line) lines.push(line);

      const shown = lines.slice(0, 5);
      const lh = fontSize * 1.35;
      const boxH = shown.length * lh + fontSize * 1.4;
      const boxY = canvas.height * 0.68;

      ctx.fillStyle = "rgba(0,0,0,.58)";
      ctx.fillRect(canvas.width * 0.08, boxY, canvas.width * 0.84, boxH);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";

      shown.forEach((lineText, i) => {
        ctx.fillText(
          lineText,
          canvas.width / 2,
          boxY + fontSize * 0.7 + i * lh
        );
      });

      ctx.font = `500 ${Math.max(15, Math.round(fontSize * .55))}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,.72)";
      ctx.fillText("FREE LOCAL PREVIEW", canvas.width / 2, canvas.height * 0.09);
    }

    async function makeVideo() {
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder tidak tersedia di browser ini. Gunakan Chrome atau Brave terbaru.");
      }

      if (!HTMLCanvasElement.prototype.captureStream) {
        throw new Error("Browser tidak mendukung Canvas video. Gunakan Chrome atau Brave terbaru.");
      }

      const seconds = Math.max(1, Number(duration && duration.value || 5));
      const [w, h] = sizeForRatio(aspect && aspect.value);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      const img = await loadImage(imageInput && imageInput.files[0]);

      const stream = canvas.captureStream(30);
      const formats = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm"
      ];
      const mime = formats.find(x => MediaRecorder.isTypeSupported(x));

      if (!mime) throw new Error("Format video WebM tidak didukung browser.");

      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 3500000
      });

      const chunks = [];

      recorder.ondataavailable = e => {
        if (e.data && e.data.size) chunks.push(e.data);
      };

      const finished = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = () => reject(new Error("Perekaman video gagal."));
      });

      recorder.start(250);

      const begin = performance.now();

      function render(now) {
        const p = Math.min(1, (now - begin) / (seconds * 1000));
        drawFrame(ctx, canvas, img, prompt && prompt.value.trim(), p);

        const percent = Math.round(p * 100);
        setStatus(`Rendering ${percent}%`);
        setMessage(`Membuat video gratis... ${percent}%`);

        if (p < 1) requestAnimationFrame(render);
        else recorder.stop();
      }

      requestAnimationFrame(render);
      await finished;

      stream.getTracks().forEach(t => t.stop());

      return new Blob(chunks, { type: mime });
    }

    async function generate() {
      generateBtn.disabled = true;
      setStatus("Generating");
      setMessage("Memulai Free Local Testing...");

      try {
        const value = String(provider && provider.value || "").toLowerCase();

        if (value === "mock" || value.includes("free")) {
          const blob = await makeVideo();
          const url = URL.createObjectURL(blob);

          video.src = url;
          video.controls = true;
          video.playsInline = true;
          video.load();

          download.href = url;
          download.download = "free-local-video.webm";
          download.classList.remove("disabled");

          setStatus("Ready");
          setMessage("Video selesai dibuat. Tekan Play atau Download.");
        } else {
          setMessage("Runway dipilih. Mode Runway membutuhkan API credits.");
          setStatus("Ready");
        }
      } catch (error) {
        console.error(error);
        setStatus("Error");
        setMessage("ERROR: " + (error.message || error));
      } finally {
        generateBtn.disabled = false;
      }
    }

    generateBtn.type = "button";
    generateBtn.addEventListener("click", generate);

    if (imageInput) {
      imageInput.addEventListener("change", function () {
        const square = aspect && aspect.querySelector('option[value="1:1"]');
        const hasImage = !!(imageInput.files && imageInput.files[0]);
        if (square) square.disabled = !hasImage;
        if (!hasImage && aspect && aspect.value === "1:1") aspect.value = "16:9";
      });
    }

    setStatus("Ready");
    setMessage("Free Local Testing siap.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
