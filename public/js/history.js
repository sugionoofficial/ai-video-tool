/* =========================================================
   GEN-Z.AI
   public/js/history.js

   RIWAYAT VIDEO GENERATION
   Menampilkan SEMUA percobaan generation milik akun aktif,
   termasuk berhasil, gagal, dibatalkan, dan diproses.
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

  /* =======================================================
     UTILITY
  ======================================================= */

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

  /* =======================================================
     GET SESSION
  ======================================================= */

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

  /* =======================================================
     GET CONFIG
  ======================================================= */

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

  /* =======================================================
     NORMALIZE STATUS
  ======================================================= */

  function normalizeStatus(job) {
    const rawStatus =
      String(
        job?.status ||
        ""
      )
        .trim()
        .toLowerCase();

    const rawProviderStatus =
      String(
        job?.provider_status ||
        ""
      )
        .trim()
        .toLowerCase();

    const combined =
      `${rawStatus} ${rawProviderStatus}`;

    /* SUCCESS */

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
      ].some(
        value =>
          rawStatus === value ||
          rawProviderStatus === value
      )
    ) {
      return "completed";
    }

    /* FAILED */

    if (
      [
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
      ].some(
        value =>
          rawStatus === value ||
          rawProviderStatus === value
      )
    ) {
      return "failed";
    }

    /* EXTRA FAILURE DETECTION */

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

    /* PROCESSING */

    if (
      [
        "pending",
        "queued",
        "queue",
        "processing",
        "generating",
        "submitted",
        "running",
        "in_progress",
        "in-progress",
        "starting"
      ].some(
        value =>
          rawStatus === value ||
          rawProviderStatus === value
      )
    ) {
      return "processing";
    }

    /*
      Jika status database kosong/aneh tetapi terdapat
      last_error, anggap sebagai gagal.
    */

    if (
      job?.last_error ||
      job?.last_error_code
    ) {
      return "failed";
    }

    return "processing";
  }

  /* =======================================================
     STATUS LABEL
  ======================================================= */

  function statusLabel(status) {
    if (status === "completed") {
      return "Selesai";
    }

    if (status === "failed") {
      return "Gagal";
    }

    return "Diproses";
  }

  /* =======================================================
     PROVIDER LABEL
  ======================================================= */

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

  /* =======================================================
     METADATA
  ======================================================= */

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

  /* =======================================================
     FORMAT DATE
  ======================================================= */

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

  /* =======================================================
     VIDEO URL
  ======================================================= */

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

  /* =======================================================
     LOAD ALL JOBS
     
     Tidak lagi hanya mengambil 100.
     Menggunakan pagination Supabase.
  ======================================================= */

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

    const allJobs = [];

    const pageSize = 1000;

    let offset = 0;

    const maxRecords = 10000;

    while (
      offset < maxRecords
    ) {
      const query =
        new URLSearchParams();

      /*
        PENTING:
        Hanya user_id yang difilter.
        Tidak ada filter status.

        Jadi:
        completed  -> masuk
        failed     -> masuk
        cancelled  -> masuk
        processing -> masuk
      */

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
        String(pageSize)
      );

      query.set(
        "offset",
        String(offset)
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
                "application/json",

              Prefer:
                "count=exact"
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

      const page =
        await response.json();

      if (
        !Array.isArray(page) ||
        page.length === 0
      ) {
        break;
      }

      allJobs.push(
        ...page
      );

      if (
        page.length < pageSize
      ) {
        break;
      }

      offset += pageSize;
    }

    /*
      Pastikan hanya record milik akun aktif.
      Ini juga menjadi perlindungan tambahan di sisi UI.
    */

    const filteredJobs =
      allJobs.filter(
        job =>
          String(
            job?.user_id || ""
          ) ===
          String(userId)
      );

    /*
      Urutkan ulang agar yang terbaru
      tetap berada paling atas.
    */

    filteredJobs.sort(
      (a, b) => {
        const aTime =
          new Date(
            a?.created_at || 0
          ).getTime();

        const bTime =
          new Date(
            b?.created_at || 0
          ).getTime();

        return bTime - aTime;
      }
    );

    return filteredJobs;
  }

  /* =======================================================
     RENDER
  ======================================================= */

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
        `${jobs.length} percobaan`;
    }

    if (!jobs.length) {
      grid.innerHTML = `
        <div class="history-empty">
          Belum ada percobaan generate video.
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

            /* =================================================
               COMPLETED
            ================================================= */

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
            }

            /* =================================================
               FAILED
            ================================================= */

            else if (
              status ===
              "failed"
            ) {
              preview = `
                <div class="history-placeholder history-failed">
                  <div
                    style="
                      font-size:32px;
                      margin-bottom:8px;
                    "
                  >
                    ❌
                  </div>

                  <strong>
                    Generate Gagal
                  </strong>

                  <small
                    style="
                      display:block;
                      margin-top:6px;
                      opacity:.75;
                    "
                  >
                    Tap untuk melihat detail
                  </small>
                </div>
              `;
            }

            /* =================================================
               PROCESSING
            ================================================= */

            else {
              preview = `
                <div class="history-placeholder history-processing">
                  <div
                    style="
                      font-size:32px;
                      margin-bottom:8px;
                    "
                  >
                    ⏳
                  </div>

                  <strong>
                    Sedang Diproses
                  </strong>
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

                  <span
                    class="history-badge"
                  >
                    ${escapeHtml(
                      statusLabel(status)
                    )}
                  </span>

                </div>

                <div class="history-info">

                  <div
                    class="history-provider"
                  >
                    ${escapeHtml(
                      provider
                    )}
                  </div>

                  <div
                    class="history-date"
                  >
                    ${escapeHtml(
                      formatDate(
                        job.created_at
                      )
                    )}
                  </div>

                  <div
                    class="history-prompt"
                  >
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

  /* =======================================================
     OPEN DETAIL
  ======================================================= */

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

    const lastError =
      job.last_error ||
      "";

    const errorCode =
      job.last_error_code ||
      "";

    const providerStatus =
      job.provider_status ||
      "";

    const attemptCount =
      job.attempt_count ??
      "-";

    const creditCost =
      job.credit_cost ??
      0;

    const refunded =
      job.refunded === true;

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
            <div
              class="history-empty"
              style="
                padding:30px 20px;
                text-align:center;
              "
            >
              ${
                status === "failed"
                  ? `
                    <div
                      style="
                        font-size:42px;
                        margin-bottom:10px;
                      "
                    >
                      ❌
                    </div>

                    <strong>
                      Generate video gagal
                    </strong>

                    <div
                      style="
                        margin-top:8px;
                        opacity:.75;
                      "
                    >
                      Percobaan ini tetap tersimpan
                      dalam riwayat akun.
                    </div>
                  `
                  : `
                    <div
                      style="
                        font-size:42px;
                        margin-bottom:10px;
                      "
                    >
                      ⏳
                    </div>

                    <strong>
                      Generate masih diproses
                    </strong>
                  `
              }
            </div>
          `
      }

      <div
        class="history-detail-grid"
      >

        <div
          class="history-detail-item"
        >
          <span>Status</span>

          <strong>
            ${escapeHtml(
              statusLabel(status)
            )}
          </strong>
        </div>

        <div
          class="history-detail-item"
        >
          <span>Provider</span>

          <strong>
            ${escapeHtml(
              provider
            )}
          </strong>
        </div>

        <div
          class="history-detail-item"
        >
          <span>Model</span>

          <strong>
            ${escapeHtml(
              String(model)
            )}
          </strong>
        </div>

        <div
          class="history-detail-item"
        >
          <span>Durasi</span>

          <strong>
            ${escapeHtml(
              String(duration)
            )}
          </strong>
        </div>

        <div
          class="history-detail-item"
        >
          <span>Aspect Ratio</span>

          <strong>
            ${escapeHtml(
              String(ratio)
            )}
          </strong>
        </div>

        <div
          class="history-detail-item"
        >
          <span>Resolusi</span>

          <strong>
            ${escapeHtml(
              String(resolution)
            )}
          </strong>
        </div>

        <div
          class="history-detail-item"
        >
          <span>Dibuat</span>

          <strong>
            ${escapeHtml(
              formatDate(
                job.created_at
              )
            )}
          </strong>
        </div>

        <div
          class="history-detail-item"
        >
          <span>Job ID</span>

          <strong>
            ${escapeHtml(
              String(
                job.id || "-"
              )
            )}
          </strong>
        </div>

        <div
          class="history-detail-item"
        >
          <span>Percobaan</span>

          <strong>
            ${escapeHtml(
              String(
                attemptCount
              )
            )}
          </strong>
        </div>

        <div
          class="history-detail-item"
        >
          <span>Kredit</span>

          <strong>
            ${escapeHtml(
              String(
                creditCost
              )
            )}
          </strong>
        </div>

        ${
          refunded
            ? `
              <div
                class="history-detail-item"
              >
                <span>Kredit</span>

                <strong>
                  Dikembalikan
                </strong>
              </div>
            `
            : ""
        }

      </div>

      <div
        class="history-detail-prompt"
      >

        <strong>
          Prompt
        </strong>

        <div
          style="margin-top:7px;"
        >
          ${
            escapeHtml(
              prompt ||
              "Prompt tidak tersimpan pada job ini."
            )
          }
        </div>

      </div>

      ${
        providerStatus
          ? `
            <div
              class="history-detail-prompt"
              style="margin-top:12px;"
            >
              <strong>
                Provider Status
              </strong>

              <div
                style="margin-top:7px;"
              >
                ${escapeHtml(
                  String(
                    providerStatus
                  )
                )}
              </div>
            </div>
          `
          : ""
      }

      ${
        errorCode
          ? `
            <div
              class="history-error"
              style="margin-top:12px;"
            >
              <strong>
                Error Code:
              </strong>

              ${escapeHtml(
                String(
                  errorCode
                )
              )}
            </div>
          `
          : ""
      }

      ${
        lastError
          ? `
            <div
              class="history-error"
              style="margin-top:12px;"
            >
              <strong>
                Error:
              </strong>

              <div
                style="margin-top:6px;"
              >
                ${escapeHtml(
                  String(
                    lastError
                  )
                )}
              </div>
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
        function () {
          downloadVideo(
            job
          );
        }
      );
    }
  }

  /* =======================================================
     DOWNLOAD VIDEO
  ======================================================= */

  async function downloadVideo(job) {
    if (
      normalizeStatus(job) !==
      "completed"
    ) {
      return;
    }

    const url =
      getVideoUrl(job);

    if (!url) {
      return;
    }

    try {
      const response =
        await fetch(
          url,
          {
            method: "GET",
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          "Video tidak dapat diunduh."
        );
      }

      const blob =
        await response.blob();

      const objectUrl =
        URL.createObjectURL(
          blob
        );

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
        function () {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        1000
      );

    } catch (error) {
      console.error(
        "[GEN-Z.AI] Download error:",
        error
      );

      alert(
        error?.message ||
        "Video gagal diunduh."
      );
    }
  }

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  function closeModal() {
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

    state.selected =
      null;
  }

  /* =======================================================
     REFRESH
  ======================================================= */

  async function refresh() {
    if (state.loading) {
      return;
    }

    state.loading =
      true;

    const status =
      $("historyStatus");

    const refreshButton =
      $("historyRefresh");

    try {
      if (status) {
        status.textContent =
          "Memuat riwayat...";
      }

      if (refreshButton) {
        refreshButton.disabled =
          true;
      }

      const jobs =
        await loadJobs();

      state.jobs =
        jobs;

      render();

      /*
        Hitung status untuk debugging dan
        memastikan job gagal benar-benar masuk.
      */

      const failedCount =
        jobs.filter(
          job =>
            normalizeStatus(job) ===
            "failed"
        ).length;

      const completedCount =
        jobs.filter(
          job =>
            normalizeStatus(job) ===
            "completed"
        ).length;

      const processingCount =
        jobs.filter(
          job =>
            normalizeStatus(job) ===
            "processing"
        ).length;

      console.log(
        "[GEN-Z.AI] History:",
        {
          total:
            jobs.length,

          completed:
            completedCount,

          failed:
            failedCount,

          processing:
            processingCount
        }
      );

      if (status) {
        status.textContent =
          `${jobs.length} percobaan`;
      }

    } catch (error) {
      console.error(
        "[GEN-Z.AI] History loading error:",
        error
      );

      state.jobs =
        [];

      const grid =
        $("historyGrid");

      if (grid) {
        grid.innerHTML = `
          <div
            class="history-empty"
          >
            Gagal memuat riwayat.
            <br>

            <small>
              ${escapeHtml(
                error?.message ||
                "Terjadi kesalahan."
              )}
            </small>
          </div>
        `;
      }

      if (status) {
        status.textContent =
          "Gagal memuat riwayat";
      }

    } finally {
      state.loading =
        false;

      if (refreshButton) {
        refreshButton.disabled =
          false;
      }
    }
  }

  /* =======================================================
     BIND EVENTS
  ======================================================= */

  function bind() {
    const grid =
      $("historyGrid");

    if (grid) {
      grid.addEventListener(
        "click",
        function (event) {
          const card =
            event.target.closest(
              "[data-history-index]"
            );

          if (!card) {
            return;
          }

          const index =
            Number(
              card.dataset.historyIndex
            );

          if (
            Number.isNaN(index)
          ) {
            return;
          }

          openDetail(
            index
          );
        }
      );
    }

    const refreshButton =
      $("historyRefresh");

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        function () {
          refresh();
        }
      );
    }

    const closeButton =
      $("historyClose");

    if (closeButton) {
      closeButton.addEventListener(
        "click",
        closeModal
      );
    }

    const modal =
      $("historyModal");

    if (modal) {
      modal.addEventListener(
        "click",
        function (event) {
          if (
            event.target ===
            modal
          ) {
            closeModal();
          }
        }
      );
    }

    const back =
      $("historyBack");

    if (back) {
      back.addEventListener(
        "click",
        function () {
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
      function (event) {
        if (
          event.key ===
          "Escape"
        ) {
          closeModal();
        }
      }
    );
  }

  /* =======================================================
     LOAD COMPONENT
  ======================================================= */

  async function load() {
    const page =
      $("pageContent");

    if (!page) {
      throw new Error(
        "Element #pageContent tidak ditemukan."
      );
    }

    /*
      history.html harus dimuat setiap kali
      halaman Riwayat dibuka.
    */

    if (
      typeof GENZ.loadComponent !==
      "function"
    ) {
      throw new Error(
        "GENZ.loadComponent tidak tersedia."
      );
    }

    await GENZ.loadComponent(
      "#pageContent",
      "/components/history.html"
    );

    bind();

    await refresh();
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.history = {
    state,

    async load() {
      await load();
    },

    refresh
  };

})();
