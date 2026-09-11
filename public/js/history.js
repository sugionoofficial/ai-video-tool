/* =========================================================
   GEN-Z.AI
   public/js/history.js

   RIWAYAT VIDEO GENERATION
========================================================= */

(function () {
  "use strict";

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});

  const state = {
    jobs: [],
    loading: false,
    selected: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeSession(result) {
    if (!result) {
      return null;
    }

    if (result?.data?.session) {
      return result.data.session;
    }

    if (result?.session) {
      return result.session;
    }

    if (result?.user?.id) {
      return result;
    }

    return null;
  }

  async function getSession() {
    try {
      if (
        window.GENZ_AUTH_CLIENT?.auth &&
        typeof window.GENZ_AUTH_CLIENT.auth.getSession ===
          "function"
      ) {
        const result =
          await window.GENZ_AUTH_CLIENT.auth.getSession();

        const session =
          normalizeSession(result);

        if (session) {
          return session;
        }
      }
    } catch (error) {
      console.warn(
        "[GEN-Z.AI] GENZ_AUTH_CLIENT session error:",
        error
      );
    }

    try {
      if (
        window.GENZ_AUTH &&
        typeof window.GENZ_AUTH.getSession ===
          "function"
      ) {
        const result =
          await window.GENZ_AUTH.getSession();

        const session =
          normalizeSession(result);

        if (session) {
          return session;
        }
      }
    } catch (error) {
      console.warn(
        "[GEN-Z.AI] GENZ_AUTH session error:",
        error
      );
    }

    return null;
  }

  async function getConfig() {
    const response =
      await fetch(
        "/api/config",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        "Konfigurasi aplikasi gagal dimuat."
      );
    }

    const data =
      await response.json();

    const supabaseUrl =
      String(
        data?.supabaseUrl ||
        ""
      ).trim();

    const publishableKey =
      String(
        data?.supabasePublishableKey ||
        ""
      ).trim();

    if (
      !supabaseUrl ||
      !publishableKey
    ) {
      throw new Error(
        "Konfigurasi Supabase belum tersedia."
      );
    }

    return {
      supabaseUrl,
      publishableKey
    };
  }

  function normalizeStatus(job) {
    const status =
      String(
        job?.status ||
        job?.provider_status ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      [
        "completed",
        "complete",
        "success",
        "successful",
        "succeeded",
        "done",
        "finished",
        "ready"
      ].includes(status)
    ) {
      return "completed";
    }

    if (
      [
        "failed",
        "failure",
        "error",
        "cancelled",
        "canceled",
        "rejected"
      ].includes(status)
    ) {
      return "failed";
    }

    return "processing";
  }

  function statusLabel(status) {
    if (status === "completed") {
      return "Selesai";
    }

    if (status === "failed") {
      return "Gagal";
    }

    return "Diproses";
  }

  function providerLabel(provider) {
    const id =
      String(provider || "")
        .trim()
        .toLowerCase();

    const map = {
      veo: "Veo",
      gemini: "Veo",
      minimax: "MiniMax",
      luma: "Luma"
    };

    return (
      map[id] ||
      provider ||
      "Provider"
    );
  }

  function getMetadata(job) {
    if (
      job?.metadata &&
      typeof job.metadata ===
        "object"
    ) {
      return job.metadata;
    }

    return {};
  }

  function getPrompt(job) {
    const metadata =
      getMetadata(job);

    return (
      metadata.prompt ||
      metadata.originalPrompt ||
      metadata.inputPrompt ||
      job?.prompt ||
      ""
    );
  }

  function getModel(job) {
    const metadata =
      getMetadata(job);

    return (
      job?.model ||
      metadata.model ||
      metadata.requestedModel ||
      "-"
    );
  }

  function getDuration(job) {
    const metadata =
      getMetadata(job);

    return (
      metadata.duration ||
      metadata.videoDuration ||
      job?.duration ||
      "-"
    );
  }

  function getAspectRatio(job) {
    const metadata =
      getMetadata(job);

    return (
      metadata.aspectRatio ||
      metadata.aspect_ratio ||
      job?.aspectRatio ||
      "-"
    );
  }

  function getResolution(job) {
    const metadata =
      getMetadata(job);

    return (
      metadata.resolution ||
      job?.resolution ||
      "-"
    );
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    try {
      return new Date(value)
        .toLocaleString(
          "id-ID",
          {
            dateStyle: "medium",
            timeStyle: "short"
          }
        );
    } catch {
      return String(value);
    }
  }

  function getVideoUrl(job) {
    if (
      normalizeStatus(job) !==
      "completed"
    ) {
      return "";
    }

    if (!job?.id) {
      return "";
    }

    if (!job?.provider) {
      return "";
    }

    return (
      "/api/video" +
      "?provider=" +
      encodeURIComponent(
        job.provider
      ) +
      "&jobId=" +
      encodeURIComponent(
        job.id
      )
    );
  }

  async function loadJobs() {
    const session =
      await getSession();

    if (!session?.user?.id) {
      throw new Error(
        "Sesi login tidak ditemukan."
      );
    }

    if (!session.access_token) {
      throw new Error(
        "Token login tidak tersedia."
      );
    }

    const config =
      await getConfig();

    const userId =
      session.user.id;

    const query =
      new URLSearchParams();

    query.set(
      "user_id",
      `eq.${userId}`
    );

    query.set(
      "select",
      [
        "id",
        "user_id",
        "provider",
        "external_id",
        "status",
        "credit_cost",
        "refunded",
        "model",
        "video_url",
        "attempt_count",
        "last_error",
        "last_error_code",
        "provider_status",
        "created_at",
        "updated_at",
        "metadata"
      ].join(",")
    );

    query.set(
      "order",
      "created_at.desc"
    );

    query.set(
      "limit",
      "100"
    );

    const response =
      await fetch(
        `${config.supabaseUrl}/rest/v1/video_jobs?${query.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            apikey:
              config.publishableKey,

            Authorization:
              `Bearer ${session.access_token}`,

            Accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      let message =
        "Gagal mengambil riwayat video.";

      try {
        const data =
          await response.json();

        message =
          data?.message ||
          data?.error ||
          message;
      } catch (_) {}

      throw new Error(message);
    }

    const jobs =
      await response.json();

    if (!Array.isArray(jobs)) {
      return [];
    }

    return jobs;
  }

  function render() {
    const grid =
      $("historyGrid");

    const count =
      $("historyCount");

    if (!grid) {
      return;
    }

    const jobs =
      state.jobs || [];

    if (count) {
      count.textContent =
        `${jobs.length} video`;
    }

    if (!jobs.length) {
      grid.innerHTML = `
        <div class="history-empty">
          Belum ada video yang pernah digenerate.
        </div>
      `;

      return;
    }

    grid.innerHTML =
      jobs
        .map(
          (job, index) => {

            const status =
              normalizeStatus(job);

            const provider =
              providerLabel(
                job.provider
              );

            const prompt =
              getPrompt(job);

            const videoUrl =
              getVideoUrl(job);

            let preview = "";

            if (
              status ===
                "completed" &&
              videoUrl
            ) {
              preview = `
                <video
                  src="${escapeHtml(videoUrl)}"
                  muted
                  playsinline
                  preload="metadata"
                ></video>
              `;
            } else {
              preview = `
                <div class="history-placeholder">
                  ${
                    status ===
                    "failed"
                      ? "Generate gagal"
                      : "Video sedang diproses"
                  }
                </div>
              `;
            }

            return `
              <article
                class="history-card"
                data-history-index="${index}"
              >

                <div class="history-thumb">

                  ${preview}

                  <span class="history-badge">
                    ${escapeHtml(
                      statusLabel(status)
                    )}
                  </span>

                </div>

                <div class="history-info">

                  <div class="history-provider">
                    ${escapeHtml(provider)}
                  </div>

                  <div class="history-date">
                    ${escapeHtml(
                      formatDate(
                        job.created_at
                      )
                    )}
                  </div>

                  <div class="history-prompt">
                    ${
                      escapeHtml(
                        prompt ||
                        "Prompt tidak tersedia."
                      )
                    }
                  </div>

                </div>

              </article>
            `;
          }
        )
        .join("");
  }

  function openDetail(index) {
    const job =
      state.jobs?.[index];

    if (!job) {
      return;
    }

    state.selected =
      job;

    const modal =
      $("historyModal");

    const body =
      $("historyDialogBody");

    if (!modal || !body) {
      return;
    }

    const status =
      normalizeStatus(job);

    const videoUrl =
      getVideoUrl(job);

    const provider =
      providerLabel(
        job.provider
      );

    const prompt =
      getPrompt(job);

    const model =
      getModel(job);

    const duration =
      getDuration(job);

    const ratio =
      getAspectRatio(job);

    const resolution =
      getResolution(job);

    const error =
      job.last_error ||
      "";

    body.innerHTML = `
      ${
        status === "completed" &&
        videoUrl
          ? `
            <video
              id="historyDetailVideo"
              class="history-player"
              controls
              playsinline
              preload="metadata"
              src="${escapeHtml(videoUrl)}"
            ></video>
          `
          : `
            <div class="history-empty">
              ${
                status === "failed"
                  ? "Video gagal dibuat."
                  : "Video masih dalam proses."
              }
            </div>
          `
      }

      <div class="history-detail-grid">

        <div class="history-detail-item">
          <span>Status</span>
          <strong>
            ${escapeHtml(
              statusLabel(status)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Provider</span>
          <strong>
            ${escapeHtml(provider)}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Model</span>
          <strong>
            ${escapeHtml(
              String(model)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Durasi</span>
          <strong>
            ${escapeHtml(
              String(duration)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Aspect Ratio</span>
          <strong>
            ${escapeHtml(
              String(ratio)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Resolusi</span>
          <strong>
            ${escapeHtml(
              String(resolution)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Dibuat</span>
          <strong>
            ${escapeHtml(
              formatDate(
                job.created_at
              )
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Job ID</span>
          <strong>
            ${escapeHtml(
              String(
                job.id || "-"
              )
            )}
          </strong>
        </div>

      </div>

      <div class="history-detail-prompt">
        <strong>Prompt</strong>

        <div style="margin-top:7px;">
          ${
            escapeHtml(
              prompt ||
              "Prompt tidak tersimpan pada job ini."
            )
          }
        </div>
      </div>

      ${
        error
          ? `
            <div class="history-error">
              ${escapeHtml(error)}
            </div>
          `
          : ""
      }

      ${
        status === "completed"
          ? `
            <button
              type="button"
              class="history-download"
              id="historyDownload"
            >
              Download Video
            </button>
          `
          : ""
      }
    `;

    modal.classList.remove(
      "hidden"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    const download =
      $("historyDownload");

    if (download) {
      download.addEventListener(
        "click",
        () => {
          downloadVideo(job);
        },
        {
          once: true
        }
      );
    }
  }

  function closeDetail() {
    const modal =
      $("historyModal");

    const body =
      $("historyDialogBody");

    if (modal) {
      modal.classList.add(
        "hidden"
      );

      modal.setAttribute(
        "aria-hidden",
        "true"
      );
    }

    if (body) {
      body.innerHTML = "";
    }

    state.selected =
      null;
  }

  async function downloadVideo(job) {
    const url =
      getVideoUrl(job);

    if (!url) {
      return;
    }

    const button =
      $("historyDownload");

    const original =
      button?.textContent ||
      "Download Video";

    try {
      if (button) {
        button.disabled = true;
        button.textContent =
          "Menyiapkan video...";
      }

      let token = null;

      if (
        typeof GENZ.auth?.token ===
        "function"
      ) {
        token =
          await GENZ.auth.token();
      }

      if (!token) {
        const session =
          await getSession();

        token =
          session?.access_token ||
          null;
      }

      const headers = {};

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      const response =
        await fetch(
          url,
          {
            method: "GET",
            headers,
            credentials: "include",
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `Gagal mengambil video (${response.status}).`
        );
      }

      const blob =
        await response.blob();

      if (!blob.size) {
        throw new Error(
          "File video kosong."
        );
      }

      const objectUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement(
          "a"
        );

      link.href =
        objectUrl;

      link.download =
        `GEN-Z.AI-${job.id}.mp4`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        3000
      );

    } catch (error) {
      console.error(
        "[GEN-Z.AI] Download history error:",
        error
      );

      if (button) {
        button.textContent =
          "Download gagal";

        setTimeout(
          () => {
            button.disabled =
              false;

            button.textContent =
              original;
          },
          1800
        );
      }

      return;
    }

    if (button) {
      button.disabled =
        false;

      button.textContent =
        original;
    }
  }

  async function refresh() {
    if (state.loading) {
      return;
    }

    const status =
      $("historyStatus");

    state.loading =
      true;

    if (status) {
      status.textContent =
        "Memuat riwayat video...";
    }

    try {
      state.jobs =
        await loadJobs();

      render();

      if (status) {
        status.textContent =
          state.jobs.length
            ? ""
            : "Belum ada riwayat video.";
      }

    } catch (error) {
      console.error(
        "[GEN-Z.AI] History error:",
        error
      );

      if (status) {
        status.textContent =
          error?.message ||
          "Gagal memuat riwayat video.";
      }

      const grid =
        $("historyGrid");

      if (grid) {
        grid.innerHTML = `
          <div class="history-empty">
            Gagal memuat riwayat video.
          </div>
        `;
      }

    } finally {
      state.loading =
        false;
    }
  }

  function bind() {
    const grid =
      $("historyGrid");

    const refreshButton =
      $("historyRefresh");

    const close =
      $("historyClose");

    const modal =
      $("historyModal");

    const back =
      $("historyBack");

    if (grid) {
      grid.addEventListener(
        "click",
        event => {

          const card =
            event.target.closest(
              "[data-history-index]"
            );

          if (!card) {
            return;
          }

          openDetail(
            Number(
              card.dataset.historyIndex
            )
          );
        }
      );
    }

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        refresh
      );
    }

    if (close) {
      close.addEventListener(
        "click",
        closeDetail
      );
    }

    if (modal) {
      modal.addEventListener(
        "click",
        event => {
          if (
            event.target ===
            modal
          ) {
            closeDetail();
          }
        }
      );
    }

    if (back) {
      back.addEventListener(
        "click",
        () => {
          if (
            typeof GENZ.showStudio ===
            "function"
          ) {
            GENZ.showStudio();
          }
        }
      );
    }

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Escape"
        ) {
          const modal =
            $("historyModal");

          if (
            modal &&
            !modal.classList.contains(
              "hidden"
            )
          ) {
            closeDetail();
          }
        }
      }
    );
  }

  GENZ.history = {

    state,

    async load() {
      const container =
        document.getElementById(
          "pageContent"
        );

      if (!container) {
        return;
      }

      try {
        await GENZ.loadComponent(
          "#pageContent",
          "/components/history.html"
        );
      } catch (error) {

        console.error(
          "[GEN-Z.AI] history.html gagal:",
          error
        );

        container.innerHTML = `
          <section class="page-card">
            <h2>Riwayat Video</h2>
            <p>
              Gagal memuat halaman riwayat.
            </p>
          </section>
        `;

        return;
      }

      bind();

      await refresh();
    },

    refresh
  };

})();
