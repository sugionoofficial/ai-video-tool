(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function setStatus(text, busy) {
    $("statusText").textContent = text;
    $("statusDot").style.background = busy ? "#d69e2e" : "#38a169";
  }

  function setMessage(text) {
    $("message").textContent = text || "";
  }

  function setProgress(value, text) {
    $("progressWrap").classList.remove("hidden");
    $("progressBar").style.width = Math.max(0, Math.min(100, value)) + "%";
    $("progressText").textContent = text || "";
  }

  function resetDownload() {
    const a = $("downloadBtn");
    a.classList.add("disabled");
    a.removeAttribute("href");
  }

  function makeSize(aspect) {
    if (aspect === "9:16") return [540, 960];
    if (aspect === "1:1") return [720, 720];
    return [960, 540];
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Reference image tidak dapat dibaca."));
      };
      img.src = url;
    });
  }

  function drawCover(ctx, img, w, h, scale) {
    const ratio = Math.max(w / img.width, h / img.height) * scale;
    const dw = img.width * ratio;
    const dh = img.height * ratio;
    const x = (w - dw) / 2;
    const y = (h - dh) / 2;
    ctx.drawImage(img, x, y, dw, dh);
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return ["Free Local Video"];
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, 4);
  }

  async function renderLocalVideo(prompt, duration, aspect, imageFile) {
    if (!window.MediaRecorder) throw new Error("Browser ini tidak mendukung MediaRecorder.");
    const [w, h] = makeSize(aspect);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const img = await loadImage(imageFile);

    const stream = canvas.captureStream(30);
    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];
    const mime = mimeTypes.find(x => MediaRecorder.isTypeSupported(x));
    if (!mime) throw new Error("Browser ini tidak mendukung perekaman WebM.");

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };

    const totalMs = duration * 1000;
    const start = performance.now();

    return new Promise((resolve, reject) => {
      let stopped = false;

      recorder.onerror = () => reject(new Error("Perekaman video gagal."));
      recorder.onstop = () => {
        if (stopped) return;
        stopped = true;
        stream.getTracks().forEach(t => t.stop());
        resolve(new Blob(chunks, { type: mime }));
      };

      recorder.start(100);

      function frame(now) {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / totalMs);

        ctx.fillStyle = "#101418";
        ctx.fillRect(0, 0, w, h);

        if (img) {
          ctx.save();
          drawCover(ctx, img, w, h, 1 + t * 0.05);
          ctx.restore();
          ctx.fillStyle = "rgba(0,0,0,.38)";
          ctx.fillRect(0, 0, w, h);
        } else {
          const g = ctx.createLinearGradient(0, 0, w, h);
          const p = 0.5 + Math.sin(t * Math.PI * 2) * 0.25;
          g.addColorStop(0, "rgb(" + Math.round(25 + p*30) + ",35,55)");
          g.addColorStop(1, "rgb(20," + Math.round(35 + p*25) + ",45)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);

          for (let i = 0; i < 35; i++) {
            const x = ((i * 83 + t * 240) % (w + 80)) - 40;
            const y = (i * 47) % h;
            const r = 1 + (i % 3);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,.35)";
            ctx.fill();
          }
        }

        const lines = wrapText(ctx, prompt || "Free Local Video", w * .82);
        ctx.font = Math.max(18, Math.round(w * .026)) + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        const lineH = Math.max(25, w * .035);
        const totalH = lines.length * lineH;
        lines.forEach((line, i) => {
          ctx.fillText(line, w / 2, h / 2 - totalH / 2 + i * lineH + lineH / 2);
        });

        const pct = Math.round(t * 100);
        setProgress(pct, "Rendering video... " + pct + "%");

        if (elapsed >= totalMs) {
          recorder.stop();
          return;
        }
        requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    });
  }

  async function generate() {
    const button = $("generateBtn");
    button.disabled = true;
    resetDownload();
    $("video").removeAttribute("src");
    $("video").load();
    $("emptyPreview").style.display = "block";
    setMessage("");
    setStatus("Rendering", true);
    setProgress(0, "Preparing...");
    try {
      const prompt = $("prompt").value.trim();
      const duration = Number($("duration").value);
      const aspect = $("aspect").value;
      const imageFile = $("image").files[0] || null;

      if (!prompt && !imageFile) {
        throw new Error("Isi prompt atau pilih reference image terlebih dahulu.");
      }

      const blob = await renderLocalVideo(prompt, duration, aspect, imageFile);
      const url = URL.createObjectURL(blob);

      $("video").src = url;
      $("video").load();
      $("emptyPreview").style.display = "none";

      const a = $("downloadBtn");
      a.href = url;
      a.classList.remove("disabled");

      setProgress(100, "Selesai.");
      setMessage("Video berhasil dibuat secara lokal.");
      setStatus("Ready", false);
    } catch (err) {
      setMessage(err && err.message ? err.message : "Terjadi kesalahan.");
      setStatus("Error", false);
      $("progressText").textContent = "Gagal";
    } finally {
      button.disabled = false;
    }
  }

  function init() {
    $("generateBtn").addEventListener("click", generate);
    setStatus("Ready", false);
    resetDownload();
    setMessage("FREE LOCAL V2 aktif.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
