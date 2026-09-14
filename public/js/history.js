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
    selected: null,
    bound: false
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

  async function getSession() {
    const client = window.GENZ_AUTH_CLIENT;

    if (
      !client ||
      !client.auth ||
      typeof client.auth.getSession !== "function"
    ) {
      throw new Error("Sistem login belum siap.");
    }

    const result = await client.auth.getSession();

    if (result?.error) {
      throw result.error;
    }

    return result?.data?.session || null;
  }

  function normalizeStatus(job) {
    const status = String(
      job?.status || ""
    )
      .trim()
      .toLowerCase();

    const providerStatus = String(
      job?.provider_status || ""
    )
      .trim()
      .toLowerCase();

    const failed = [
      "failed",
      "failure",
      "error",
      "errored",
      "rejected",
      "declined",
      "timeout",
      "timed_out",
      "cancelled",
      "canceled",
      "aborted"
    ];

    const completed = [
      "completed",
      "complete",
      "success",
      "successful",
      "succeeded",
      "done",
      "finished",
      "ready"
    ];

    if (
      completed.includes(status) ||
      completed.includes(providerStatus)
    ) {
      return "completed";
    }

    if (
      failed.includes(status) ||
      failed.includes(providerStatus)
    ) {
      return "failed";
    }

    const combined =
      `${status} ${providerStatus}`.toLowerCase();

    if (
      combined.includes("failed") ||
      combined.includes("failure") ||
      combined.includes("error") ||
      combined.includes("reject") ||
      combined.includes("timeout") ||
      combined.includes("cancel")
    ) {
      return "failed";
    }

    if (
      job?.last_error ||
      job?.last_error_code
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
    const value = String(
      provider || ""
    )
      .trim()
      .toLowerCase();

    const map = {
      veo: "Veo",
      gemini: "Gemini",
      gemini2: "Gemini 2",
      minimax: "MiniMax",
      luma: "Luma",
      chinaapi: "ChinaAPI"
    };

    return (
      map[value] ||
      provider ||
      "Provider"
    );
  }

  function getMetadata(job) {
    let metadata = job?.metadata;

    if (typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata);
      } catch (_) {
        metadata = {};
      }
    }

    return (
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata)
    )
      ? metadata
      : {};
  }

  function getPrompt(job) {
    const metadata = getMetadata(job);

    return (
      metadata.prompt ||
      metadata.originalPrompt ||
      metadata.inputPrompt ||
      job?.prompt ||
      ""
    );
  }

  function getModel(job) {
    const metadata = getMetadata(job);

    return (
      job?.model ||
      metadata.model ||
      metadata.requestedModel ||
      "-"
    );
  }

  function getDuration(job) {
    const metadata = getMetadata(job);

    return (
      metadata.duration ||
      metadata.videoDuration ||
      job?.duration ||
      "-"
    );
  }

  function getAspectRatio(job) {
    const metadata = getMetadata(job);

    return (
      metadata.aspectRatio ||
      metadata.aspect_ratio ||
      job?.aspectRatio ||
      "-"
    );
  }

  function getResolution(job) {
    const metadata = getMetadata(job);

    return (
      metadata.resolution ||
      metadata.resolution_name ||
      job?.resolution ||
      "-"
    );
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    try {
      return new Date(value).toLocaleString(
        "id-ID",
        {
          dateStyle: "medium",
          timeStyle: "short"
        }
      );
    } catch (_) {
      return "-";
    }
  }

  function getFriendlyError(job) {
    const code = String(
      job?.last_error_code || ""
    )
      .trim()
      .toLowerCase();

    const raw = String(
      job?.last_error || ""
    )
      .trim()
      .toLowerCase();

    if (
      code === "429" ||
      raw.includes("quota") ||
      raw.includes("rate limit") ||
      raw.includes("resource exhausted") ||
      raw.includes("too many requests")
    ) {
      return (
        "Provider sedang mengalami gangguan " +
        "atau kuota sedang penuh. " +
        "Silakan coba lagi beberapa saat."
      );
    }

    if (
      code === "408" ||
      code === "504" ||
      raw.includes("timeout") ||
      raw.includes("timed out") ||
      raw.includes("deadline exceeded")
    ) {
      return (
        "Provider terlalu lama merespons. " +
        "Silakan coba lagi beberapa saat."
      );
    }

    if (
      code === "401" ||
      code === "403" ||
      raw.includes("unauthorized") ||
      raw.includes("permission") ||
      raw.includes("api key") ||
      raw.includes("authentication")
    ) {
      return (
        "Layanan provider sedang tidak tersedia. " +
        "Silakan gunakan provider lain atau coba lagi nanti."
      );
    }

    if (
      raw.includes("inlinedata") ||
      raw.includes("inline data") ||
      raw.includes("isn't supported by this model")
    ) {
      return (
        "Reference image belum didukung " +
        "oleh model/provider ini."
      );
    }

    if (
      raw.includes("safety") ||
      raw.includes("blocked") ||
      raw.includes("policy") ||
      raw.includes("sensitive") ||
      raw.includes("unsafe")
    ) {
      return (
        "Permintaan tidak dapat diproses " +
        "oleh provider. Silakan ubah prompt."
      );
    }

    return (
      "Generation gagal diproses. " +
      "Silakan coba lagi."
    );
  }

  /*
   * =======================================================
   * VIDEO URL
   *
   * PRIORITAS:
   * 1. video_url dari database
   * 2. metadata videoUrl
   * 3. metadata video_url
   * 4. metadata result_url
   * 5. metadata url
   * 6. proxy /api/video
   * =======================================================
   */
  function getVideoUrl(job) {
    if (
      normalizeStatus(job) !==
      "completed"
    ) {
      return "";
    }

    const metadata = getMetadata(job);

    const directCandidates = [
      job?.video_url,
      job?.videoUrl,
      metadata.videoUrl,
      metadata.video_url,
      metadata.result_url,
      metadata.resultUrl,
      metadata.url,
      metadata.outputUrl,
      metadata.output?.videoUrl,
      metadata.output?.video_url,
      metadata.output?.url,
      metadata.result?.videoUrl,
      metadata.result?.video_url,
      metadata.result?.url,
      metadata.data?.videoUrl,
      metadata.data?.video_url,
      metadata.data?.url
    ];

    for (
      const candidate of directCandidates
    ) {
      if (
        typeof candidate === "string" &&
        candidate.trim()
      ) {
        const url =
          candidate.trim();

        if (
          url.startsWith("http://") ||
          url.startsWith("https://") ||
          url.startsWith("/")
        ) {
          return url;
        }
      }
    }

    if (
      job?.id &&
      job?.provider
    ) {
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

    return "";
  }

  async function loadJobs() {
    const session =
      await getSession();

    if (
      !session?.user?.id
    ) {
      throw new Error(
        "Sesi login tidak ditemukan."
      );
    }

    const response =
      await fetch(
        "/api/history?limit=1000&offset=0",
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`
          },

          credentials:
            "include",

          cache:
            "no-store"
        }
      );

    let payload = null;

    try {
      payload =
        await response.json();
    } catch (_) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        `Gagal mengambil riwayat. HTTP ${response.status}`
      );
    }

    if (
      !payload ||
      payload.success !== true
    ) {
      throw new Error(
        payload?.error ||
        "API riwayat tidak mengembalikan data."
      );
    }

    const jobs =
      Array.isArray(
        payload.jobs
      )
        ? payload.jobs
        : [];

    /*
     * API sudah memfilter berdasarkan
     * user aktif. Filter client tetap
     * dilakukan jika user_id tersedia,
     * tetapi tidak boleh membuang data
     * hanya karena field tersebut kosong.
     */
    state.jobs =
      jobs.filter(
        job => {
          if (
            !job ||
            typeof job !== "object"
          ) {
            return false;
          }

          if (
            !job.user_id
          ) {
            return true;
          }

          return (
            String(
              job.user_id
            ) ===
            String(
              session.user.id
            )
          );
        }
      );

    return state.jobs;
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
          Belum ada video yang pernah dibuat.
        </div>
      `;

      return;
    }

    grid.innerHTML =
      jobs.map(
        (
          job,
          index
        ) => {
          const status =
            normalizeStatus(job);

          const provider =
            providerLabel(
              job.provider
            );

          const prompt =
            getPrompt(job);

          const model =
            getModel(job);

          const videoUrl =
            getVideoUrl(job);

          const date =
            formatDate(
              job.created_at
            );

          let preview = "";

          if (
            status === "completed" &&
            videoUrl
          ) {
            preview = `
              <video
                class="history-video"
                src="${escapeHtml(videoUrl)}"
                muted
                playsinline
                preload="metadata"
                controls
              ></video>
            `;
          } else if (
            status === "failed"
          ) {
            preview = `
              <div
                class="history-placeholder history-failed"
              >
                <div style="font-size:38px;margin-bottom:8px;">
                  ❌
                </div>

                <strong>
                  Generate Gagal
                </strong>

                <small style="margin-top:6px;opacity:.7;">
                  Klik untuk melihat detail
                </small>
              </div>
            `;
          } else {
            preview = `
              <div
                class="history-placeholder history-processing"
              >
                <div style="font-size:38px;margin-bottom:8px;">
                  ⏳
                </div>

                <strong>
                  Sedang Diproses
                </strong>
              </div>
            `;
          }

          return `
            <div
              class="history-card"
              data-history-index="${index}"
            >
              <div class="history-preview">
                ${preview}
              </div>

              <div class="history-info">
                <div class="history-status">
                  <span>
                    ${escapeHtml(
                      statusLabel(status)
                    )}
                  </span>
                </div>

                <div class="history-provider">
                  ${escapeHtml(provider)}
                </div>

                <div class="history-model">
                  ${escapeHtml(model)}
                </div>

                <div class="history-prompt">
                  ${escapeHtml(
                    prompt ||
                    "Tidak ada prompt"
                  )}
                </div>

                <div class="history-date">
                  ${escapeHtml(date)}
                </div>
              </div>
            </div>
          `;
        }
      ).join("");
  }

  function openDetail(job) {
    if (!job) {
      return;
    }

    const modal =
      $("historyModal");

    const body =
      $("historyDialogBody");

    const title =
      $("historyDialogTitle");

    if (
      !modal ||
      !body
    ) {
      return;
    }

    const status =
      normalizeStatus(job);

    const prompt =
      getPrompt(job);

    const videoUrl =
      getVideoUrl(job);

    const metadata =
      getMetadata(job);

    const friendlyError =
      getFriendlyError(job);

    if (title) {
      title.textContent =
        status === "failed"
          ? "Detail Generate Gagal"
          : "Detail Video";
    }

    let content = "";

    if (
      status === "completed" &&
      videoUrl
    ) {
      content += `
        <video
          class="history-player"
          src="${escapeHtml(videoUrl)}"
          controls
          playsinline
          preload="metadata"
        ></video>

        <a
          class="history-download"
          href="${escapeHtml(videoUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Buka / Download Video
        </a>
      `;
    }

    content += `
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
            ${escapeHtml(
              providerLabel(job.provider)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Model</span>
          <strong>
            ${escapeHtml(
              getModel(job)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Durasi</span>
          <strong>
            ${escapeHtml(
              getDuration(job)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Aspect Ratio</span>
          <strong>
            ${escapeHtml(
              getAspectRatio(job)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Resolusi</span>
          <strong>
            ${escapeHtml(
              getResolution(job)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Tanggal</span>
          <strong>
            ${escapeHtml(
              formatDate(job.created_at)
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Job ID</span>
          <strong>
            ${escapeHtml(
              job.id
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Credit</span>
          <strong>
            ${escapeHtml(
              job.credit_cost ??
              "-"
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Refund</span>
          <strong>
            ${job.refunded
              ? "Ya"
              : "Tidak"}
          </strong>
        </div>

      </div>

      <div class="history-detail-prompt">
        <strong>
          Prompt
        </strong>

        <br><br>

        ${escapeHtml(
          prompt ||
          "-"
        )}
      </div>
    `;

    if (
      status === "failed"
    ) {
      content += `
        <div class="history-error">
          <strong>
            Penyebab:
          </strong>

          <br>

          ${escapeHtml(
            friendlyError
          )}
        </div>
      `;
    }

    /*
     * Informasi teknis kecil hanya untuk
     * membantu debugging jika video belum
     * mempunyai URL langsung.
     */
    if (
      status === "completed" &&
      !videoUrl
    ) {
      content += `
        <div class="history-error">
          Video sudah tercatat selesai,
          tetapi URL hasil video belum tersedia.
        </div>
      `;
    }

    body.innerHTML =
      content;

    modal.classList.remove(
      "hidden"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  function closeDetail() {
    const modal =
      $("historyModal");

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
  }

  function bind() {
    if (
      state.bound
    ) {
      return;
    }

    const grid =
      $("historyGrid");

    if (!grid) {
      return;
    }

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

        /*
         * Jangan membuka modal ketika
         * user sedang menggunakan kontrol
         * video.
         */
        if (
          event.target.closest(
            "video, a, button"
          )
        ) {
          return;
        }

        const index =
          Number(
            card.dataset.historyIndex
          );

        if (
          !Number.isFinite(index)
        ) {
          return;
        }

        state.selected =
          state.jobs[index] ||
          null;

        openDetail(
          state.selected
        );
      }
    );

    const closeButton =
      $("historyClose");

    if (closeButton) {
      closeButton.addEventListener(
        "click",
        closeDetail
      );
    }

    const modal =
      $("historyModal");

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

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Escape"
        ) {
          closeDetail();
        }
      }
    );

    const refreshButton =
      $("historyRefresh");

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        refresh
      );
    }

    state.bound =
      true;
  }

  async function refresh() {
    if (
      state.loading
    ) {
      return;
    }

    state.loading =
      true;

    const grid =
      $("historyGrid");

    const status =
      $("historyStatus");

    if (status) {
      status.textContent =
        "Memuat riwayat...";
    }

    if (grid) {
      grid.innerHTML = `
        <div
          style="
            padding:40px;
            text-align:center;
            opacity:.7;
          "
        >
          Memuat riwayat video...
        </div>
      `;
    }

    try {
      await loadJobs();

      render();

      if (status) {
        status.textContent =
          "";
      }
    } catch (error) {
      console.error(
        "[GEN-Z HISTORY]",
        error
      );

      if (status) {
        status.textContent =
          error?.message ||
          "Riwayat belum dapat dimuat.";
      }

      if (grid) {
        grid.innerHTML = `
          <div class="history-empty">
            Riwayat belum dapat dimuat.
          </div>
        `;
      }
    } finally {
      state.loading =
        false;
    }
  }

  async function load() {
    bind();
    await refresh();
  }

  GENZ.history = {
    load,
    refresh,
    loadJobs,

    get jobs() {
      return state.jobs;
    }
  };

})();
