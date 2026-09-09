/*
 AI VIDEO V2 — REAL AI VIDEO
 Flow:
 prompt -> Pollinations text AI creates motion direction -> Pollinations video AI -> MP4
 Existing OAuth/sessionStorage is reused. No secret key is stored.
*/

(() => {
  const videoBtn = document.getElementById("videoBtn");
  const videoPreview = document.getElementById("videoPreview");
  const imagePreview = document.getElementById("imagePreview");
  const promptEl = document.getElementById("prompt");
  const durationEl = document.getElementById("duration");
  const statusEl = document.getElementById("status");

  if (!videoBtn) return;

  const token = () =>
    sessionStorage.getItem("pollinations_access_token") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("pollinations_token");

  const status = (s) => {
    if (typeof window.setStatus === "function") window.setStatus(s);
    else if (statusEl) statusEl.textContent = s;
  };

  const basePrompt = () =>
    (promptEl?.value || "").trim() ||
    "a realistic cinematic scene with natural movement";

  async function createMotionPrompt(apiKey, userPrompt) {
    const body = {
      model: "openai-fast",
      messages: [
        {
          role: "system",
          content:
            "You write concise prompts for an AI video generator. " +
            "Return ONLY one plain-text video prompt, no title, no bullets, no quotes. " +
            "Preserve the subject and scene from the user's prompt. " +
            "Describe believable subject motion, secondary environmental motion, " +
            "camera movement, lighting continuity and cinematic realism. " +
            "Never invent a different main subject."
        },
        {
          role: "user",
          content:
            "Turn this image/scene concept into a realistic video direction:\n" +
            userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 220
    };

    const r = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) throw new Error("Motion prompt AI gagal (" + r.status + ").");

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Motion prompt AI tidak mengembalikan teks.");
    return text;
  }

  function videoUrl(prompt, duration, imageUrl) {
    const q = new URLSearchParams();
    q.set("model", "veo");
    q.set("duration", String(duration));

    // Pollinations supports reference-image video generation.
    // Only send an image when the browser has a real public HTTP(S) URL.
    if (/^https?:\/\//i.test(imageUrl || "")) q.set("image", imageUrl);

    return "https://gen.pollinations.ai/video/" +
      encodeURIComponent(prompt) + "?" + q.toString();
  }

  async function run() {
    const apiKey = token();
    if (!apiKey) {
      status("Hubungkan Pollinations terlebih dahulu.");
      return;
    }

    const duration = durationEl ? Number(durationEl.value) || 5 : 5;
    const imageUrl = imagePreview
      ? (imagePreview.currentSrc || imagePreview.src || "")
      : "";

    const old = videoBtn.textContent;
    videoBtn.disabled = true;
    videoBtn.textContent = "Membuat Video AI...";

    try {
      status("AI sedang menyusun gerakan video...");
      let motion;

      try {
        motion = await createMotionPrompt(apiKey, basePrompt());
      } catch (e) {
        // Safe fallback: video generation still works if text AI is unavailable.
        motion =
          basePrompt() +
          ". Natural subject movement, subtle environmental motion, " +
          "smooth cinematic camera movement, consistent identity and lighting, photorealistic.";
      }

      const finalPrompt =
        motion +
        " Photorealistic AI video, temporal consistency, stable anatomy, " +
        "natural physics, realistic depth and motion, no text, no logos.";

      status("AI sedang membuat video nyata. Mohon tunggu...");

      const r = await fetch(videoUrl(finalPrompt, duration, imageUrl), {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Accept": "video/mp4, application/octet-stream"
        }
      });

      if (r.status === 401) {
        sessionStorage.removeItem("pollinations_access_token");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("pollinations_token");
        throw new Error("Sesi Pollinations berakhir. Hubungkan kembali.");
      }

      if (!r.ok) {
        let detail = "";
        try { detail = await r.text(); } catch (_) {}
        throw new Error(
          "Video AI gagal (" + r.status + ")" +
          (detail ? ": " + detail.slice(0, 180) : "")
        );
      }

      const blob = await r.blob();
      if (!blob.size) throw new Error("Video AI kosong.");

      const url = URL.createObjectURL(blob);

      if (videoPreview) {
        videoPreview.src = url;
        videoPreview.controls = true;
        videoPreview.loop = false;
        videoPreview.muted = false;
        videoPreview.playsInline = true;
        videoPreview.load();
      }

      const dl = document.getElementById("download");
      if (dl) {
        dl.href = url;
        dl.download = "ai-video-" + duration + "s.mp4";
        dl.style.display = "";
      }

      status("Selesai. Video MP4 dibuat langsung oleh AI.");

      if (videoPreview) {
        try { await videoPreview.play(); } catch (_) {}
      }
    } catch (e) {
      console.error(e);
      status(e?.message || "Gagal membuat video AI.");
    } finally {
      videoBtn.disabled = false;
      videoBtn.textContent = old || "Jadikan Video";
    }
  }

  videoBtn.addEventListener("click", run);
})();
