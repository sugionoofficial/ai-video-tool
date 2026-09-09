/* ai_video_real_v7.js
   FINAL - Pollinations image-to-video with Amazon Nova Reel.
   Flow:
   AI image blob -> Pollinations media upload -> public HTTPS image URL
   -> Amazon Nova Reel -> MP4 blob.

   Required elements in index.html:
   - sessionStorage polli_access_token
   - #prompt
   - #duration
   - #aspect
   - #imagePreview
   - #videoPreview
   - #download
   - #videoBtn
   - #status
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

  let videoObjectUrl = null;

  function getToken() {
    return (
      sessionStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem("pollinations_access_token") ||
      sessionStorage.getItem("access_token") ||
      null
    );
  }

  function setStatus(text, cls = "") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = "status " + cls;
  }

  function getRatio() {
    const value = aspectEl ? aspectEl.value : "16:9";
    if (value === "9:16") return "9:16";
    if (value === "1:1") return "1:1";
    return "16:9";
  }

  function getDuration() {
    const value = durationEl ? Number(durationEl.value) : 5;
    return value === 10 ? 10 : 5;
  }

  function buildPrompt() {
    const p = promptEl.value.trim();

    return (
      p +
      ". Image-to-video animation. Use the reference image as the exact " +
      "visual starting point. Preserve the same subject, identity, anatomy, " +
      "appearance, colors, clothing or fur, background and environment. " +
      "Create clear continuous natural motion from the first frame. " +
      "The subject must visibly move throughout the video with realistic " +
      "body movement and secondary motion. Use realistic physical motion, " +
      "natural timing and subtle camera movement. Keep the subject consistent " +
      "from frame to frame. Do not freeze the subject. Do not morph, warp, " +
      "duplicate or replace the subject. No new subjects. No text. No logo. " +
      "No watermark."
    ).trim();
  }

  async function uploadReferenceImage(blob, token) {
    const form = new FormData();
    form.append("file", blob, "reference-image.png");

    const response = await fetch(
      "https://media.pollinations.ai/upload",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token
        },
        body: form
      }
    );

    const text = await response.text().catch(() => "");
    let data = {};

    try {
      data = JSON.parse(text);
    } catch (_) {}

    if (!response.ok) {
      throw new Error(
        "Upload gambar gagal: HTTP " +
        response.status +
        (text ? " - " + text.slice(0, 500) : "")
      );
    }

    const url =
      data.url ||
      data.publicUrl ||
      data.imageUrl ||
      (data.data &&
        (data.data.url ||
          data.data.publicUrl ||
          data.data.imageUrl));

    if (!url || !/^https?:\/\//i.test(url)) {
      throw new Error(
        "Upload berhasil, tetapi URL gambar publik HTTPS tidak ditemukan."
      );
    }

    return url;
  }

  async function requestVideo(imageUrl, token) {
    const params = new URLSearchParams({
      model: VIDEO_MODEL,
      duration: String(getDuration()),
      aspectRatio: getRatio(),
      image: imageUrl
    });

    const url =
      "https://gen.pollinations.ai/video/" +
      encodeURIComponent(buildPrompt()) +
      "?" +
      params.toString();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");

      if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
      }

      throw new Error(
        "Video gagal: HTTP " +
        response.status +
        (text ? " - " + text.slice(0, 700) : "")
      );
    }

    const blob = await response.blob();

    if (!blob || !blob.size) {
      throw new Error("Server mengembalikan video kosong.");
    }

    const type = (blob.type || "").toLowerCase();

    if (
      !type.includes("video") &&
      !type.includes("mp4") &&
      !type.includes("octet-stream")
    ) {
      throw new Error(
        "Server tidak mengembalikan MP4/video. Content-Type: " +
        (blob.type || "tidak diketahui")
      );
    }

    return blob;
  }

  async function makeVideo() {
    const token = getToken();

    if (!token) {
      setStatus(
        "Token OAuth tidak ditemukan. Hubungkan Pollinations terlebih dahulu.",
        "err"
      );
      return;
    }

    if (!imageEl.src || !imageEl.src.startsWith("blob:")) {
      setStatus("Buat gambar AI terlebih dahulu.", "err");
      return;
    }

    videoBtn.disabled = true;

    if (videoEl) {
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
      videoEl.style.display = "none";
    }

    if (downloadEl) {
      downloadEl.style.display = "none";
      downloadEl.removeAttribute("href");
    }

    try {
      setStatus(
        "Menyiapkan gambar referensi untuk " +
          VIDEO_MODEL +
          "..."
      );

      const imageResponse = await fetch(imageEl.src);

      if (!imageResponse.ok) {
        throw new Error(
          "Gagal membaca gambar AI dari browser: HTTP " +
            imageResponse.status
        );
      }

      const imageBlob = await imageResponse.blob();

      if (!imageBlob.size) {
        throw new Error("Gambar AI kosong.");
      }

      setStatus(
        "Mengunggah gambar referensi ke Pollinations..."
      );

      const imageUrl = await uploadReferenceImage(
        imageBlob,
        token
      );

      setStatus(
        "Gambar referensi berhasil diunggah. " +
          "Meminta video AI " +
          VIDEO_MODEL +
          " (" +
          getDuration() +
          " detik, " +
          getRatio() +
          ")..."
      );

      const videoBlob = await requestVideo(
        imageUrl,
        token
      );

      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
        videoObjectUrl = null;
      }

      videoObjectUrl = URL.createObjectURL(videoBlob);

      videoEl.src = videoObjectUrl;
      videoEl.style.display = "block";
      videoEl.controls = true;
      videoEl.preload = "metadata";
      videoEl.load();

      if (downloadEl) {
        downloadEl.href = videoObjectUrl;
        downloadEl.download = "ai-video-nova-reel.mp4";
        downloadEl.textContent = "Download Video";
        downloadEl.style.display = "block";
      }

      setStatus(
        "Video AI berhasil dibuat dengan Amazon Nova Reel.",
        "ok"
      );
    } catch (error) {
      setStatus(
        error && error.message
          ? error.message
          : String(error),
        "err"
      );
    } finally {
      /*
       * Setelah request selesai, tombol tetap nonaktif.
       * Pengguna dapat membuat gambar baru; index.html akan
       * mengaktifkan tombol video kembali setelah gambar baru selesai.
       */
      videoBtn.disabled = true;
    }
  }

  videoBtn.addEventListener("click", makeVideo);

  /*
   * Jika index.html menghasilkan gambar baru, fungsi generateImage()
   * akan mengatur disabled=false ketika model video tersedia.
   * Jangan melakukan pengecekan model di sini agar request video
   * tidak tertahan oleh deteksi model yang stale.
   */
})();
