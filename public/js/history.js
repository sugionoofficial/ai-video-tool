/* =========================================================
   GEN-Z.AI
   public/js/history.js

   Riwayat video generation.
   Sumber data:
   - Supabase video_jobs
   - User hanya dapat membaca job miliknya sendiri
   - Video tetap diambil melalui Worker /api/video
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

  function normalizeStatus(job) {

    const value =
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
      ].includes(value)
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
      ].includes(value)
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

    const names = {
      veo: "Veo",
      gemini: "Veo",
      minimax: "MiniMax",
      luma: "Luma"
    };

    return (
      names[id] ||
      provider ||
      "Provider"
    );
  }

  function metadata(job) {

    if (
      job?.metadata &&
      typeof job.metadata === "object"
    ) {
      return job.metadata;
    }

    return {};
  }

  function promptOf(job) {

    const meta =
      metadata(job);

    return (
      meta.prompt ||
      meta.originalPrompt ||
      meta.text ||
      meta.inputPrompt ||
      job.prompt ||
      ""
    );
  }

  function modelOf(job) {

    const meta =
      metadata(job);

    return (
      job.model ||
      meta.model ||
      meta.requestedModel ||
      "-"
    );
  }

  function durationOf(job) {

    const meta =
      metadata(job);

    return (
      meta.duration ||
      meta.videoDuration ||
      "-"
    );
  }

  function ratioOf(job) {

    const meta =
      metadata(job);

    return (
      meta.aspectRatio ||
      meta.aspect_ratio ||
      "-"
    );
  }

  function resolutionOf(job) {

    const meta =
      metadata(job);

    return (
      meta.resolution ||
      "-"
    );
  }

  function dateOf(value) {

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

  function videoUrlOf(job) {

    if (
      normalizeStatus(job) !==
      "completed"
    ) {
      return "";
    }

    /*
     * Selalu gunakan Worker proxy.
     * Ini penting untuk MiniMax dan provider
     * yang URL videonya tidak boleh dibuka
     * langsung dari browser.
     */

    return (
      `/api/video?provider=${encodeURIComponent(
        job.provider
      )}&jobId=${encodeURIComponent(
        job.id
      )}`
    );
  }

  async function getAuthSession() {

    if (
      window.GENZ_AUTH_CLIENT &&
      window.GENZ_AUTH_CLIENT.auth
    ) {

      const result =
        await window.GENZ_AUTH_CLIENT
          .auth
          .getSession();

      return (
        result?.data?.session ||
        null
      );
    }

    if (
      window.GENZ_AUTH &&
      typeof window.GENZ_AUTH
        .getSession === "function"
    ) {
      return await window.GENZ_AUTH
        .getSession();
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
        "Gagal mengambil konfigurasi Supabase."
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

  async function loadJobs() {

    const session =
      await getAuthSession();

    if (!session?.user?.id) {
      throw new Error(
        "Sesi login tidak valid."
      );
    }

    const config =
      await getConfig();

    const userId =
      session.user.id;

    const params = new URLSearchParams();

    params.set(
      "user_id",
      `eq.${userId}`
    );

    params.set(
      "select",
      [
        "id",
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

    params.set(
      "order",
      "created_at.desc"
    );

    params.set(
      "limit",
      "100"
    );

    const response =
      await fetch(
        `${config.supabaseUrl}/rest/v1/video_jobs?${params.toString()}`,
        {
          method: "GET",

          headers: {
            apikey:
              config.publishableKey,

            Authorization:
              `Bearer ${session.access_token}`,

            Accept:
              "application/json"
          },

          cache: "no-store"
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

      throw new Error(
        message
      );
    }

    return await response.json();
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
      jobs.map(
        (job, index) => {

          const status =
            normalizeStatus(job);

          const provider =
            providerLabel(
              job.provider
            );

          const prompt =
            promptOf(job);

          const videoUrl =
            videoUrlOf(job);

          const preview =
            status === "completed" &&
            videoUrl
              ? `
                <video
                  src="${escapeHtml(videoUrl)}"
                  muted
                  playsinline
                  preload="metadata"
                ></video>
              `
              : `
                <div class="history-placeholder">
                  ${
                    status === "failed"
                      ? "Video gagal dibuat"
                      : "Video sedang diproses"
                  }
                </div>
              `;

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
                    dateOf(job.created_at)
                  )}
                </div>

                <div class="history-prompt">
                  ${
                    escapeHtml(
                      prompt ||
                      "Prompt tidak tersimpan."
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

  function detailHtml(job) {

    const status =
      normalizeStatus(job);

    const provider =
      providerLabel(
        job.provider
      );

    const videoUrl =
      videoUrlOf(job);

    const prompt =
      promptOf(job);

    const model =
      modelOf(job);

    const duration =
      durationOf(job);

    const ratio =
      ratioOf(job);

    const resolution =
      resolutionOf(job);

    const error =
      job.last_error ||
      "";

    const player =
      status === "completed" &&
      videoUrl
        ? `
          <video
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
        `;

    const download =
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
        : "";

    return `
      ${player}

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
            ${escapeHtml(model)}
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
              dateOf(job.created_at)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Job ID</span>
          <strong>
            ${escapeHtml(
              String(job.id || "-")
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
              "Prompt tidak tersimpan pada data job ini."
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

      ${download}
    `;
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

    body.innerHTML =
      detailHtml(job);

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

    if (!modal) {
      return;
    }

    modal.classList.add(
      "hidden"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    if (body) {
      body.innerHTML = "";
    }

    state.selected =
      null;
  }

  async function downloadVideo(job) {

    const status =
      normalizeStatus(job);

    if (
      status !== "completed"
    ) {
      return;
    }

    const url =
      videoUrlOf(job);

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

      const token =
        typeof GENZ.auth?.token ===
        "function"
          ? await GENZ.auth.token()
          : null;

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
            credentials: "include"
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

      const a =
        document.createElement("a");

      a.href =
        objectUrl;

      a.download =
        `GEN-Z.AI-${job.id}.mp4`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        2000
      );

    } catch (error) {

      console.error(
        "[GEN-Z.AI] Download history error:",
        error
      );

      if (button) {
        button.textContent =
          "Download gagal";
      }

      setTimeout(
        () => {
          if (button) {
            button.textContent =
              original;
          }
        },
        1800
      );

      return;
    }

    if (button) {
      button.disabled = false;
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
        grid.innerHTML = "";
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
        () => refresh()
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
          } else {
            GENZ.emit?.(
              "show-studio"
            );
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
          "[GEN-Z.AI] Gagal memuat history.html:",
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
