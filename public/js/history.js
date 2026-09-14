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
    bound: false,
    statusTimer: null,
    statusChecking: false
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

    const result =
      await client.auth.getSession();

    if (result?.error) {
      throw result.error;
    }

    return result?.data?.session || null;
  }

  function normalizeStatus(job) {
    const status =
      String(job?.status || "")
        .trim()
        .toLowerCase();

    const providerStatus =
      String(job?.provider_status || "")
        .trim()
        .toLowerCase();

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
    const value =
      String(provider || "")
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
    let metadata =
      job?.metadata;

    if (
      typeof metadata ===
      "string"
    ) {
      try {
        metadata =
          JSON.parse(metadata);
      } catch (_) {
        metadata = {};
      }
    }

    return (
      metadata &&
      typeof metadata ===
        "object" &&
      !Array.isArray(metadata)
    )
      ? metadata
      : {};
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
      return new Date(
        value
      ).toLocaleString(
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
    const code =
      String(
        job?.last_error_code || ""
      )
        .trim()
        .toLowerCase();

    const raw =
      String(
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
      raw.includes(
        "isn't supported by this model"
      )
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

  function isUsableVideoUrl(value) {
    if (
      typeof value !==
      "string"
    ) {
      return false;
    }

    const url =
      value.trim();

    if (!url) {
      return false;
    }

    if (
      url.startsWith(
        "/api/video"
      )
    ) {
      return false;
    }

    return (
      url.startsWith(
        "http://"
      ) ||
      url.startsWith(
        "https://"
      ) ||
      url.startsWith("/")
    );
  }

  function getVideoUrl(job) {
    const metadata =
      getMetadata(job);

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
      metadata.output?.result_url,
      metadata.output?.url,

      metadata.result?.videoUrl,
      metadata.result?.video_url,
      metadata.result?.result_url,
      metadata.result?.url,

      metadata.data?.videoUrl,
      metadata.data?.video_url,
      metadata.data?.result_url,
      metadata.data?.url,

      metadata.data?.metadata?.url,
      metadata.data?.metadata?.videoUrl,
      metadata.data?.metadata?.video_url,
      metadata.data?.metadata?.result_url
    ];

    for (
      const candidate of
      directCandidates
    ) {
      if (
        isUsableVideoUrl(
          candidate
        )
      ) {
        return candidate.trim();
      }
    }

    if (
      normalizeStatus(job) ===
      "completed" &&
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

    state.jobs =
      jobs.filter(
        job => {
          if (
            !job ||
            typeof job !==
              "object"
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

  async function checkProcessingJobs() {
    if (
      state.statusChecking
    ) {
      return false;
    }

    const processingJobs =
      state.jobs.filter(
        job =>
          normalizeStatus(
            job
          ) === "processing" &&
          job?.provider &&
          (
            job?.external_id ||
            job?.externalId
          )
      );

    if (
      !processingJobs.length
    ) {
      return false;
    }

    state.statusChecking =
      true;

    let changed = false;

    try {
      const session =
        await getSession();

      if (
        !session?.access_token
      ) {
        return false;
      }

      /*
       * Batasi pemeriksaan agar
       * halaman tidak membebani API
       * jika terdapat banyak job lama.
       */
      const targets =
        processingJobs.slice(
          0,
          10
        );

      const results =
        await Promise.allSettled(
          targets.map(
            async job => {
              const externalId =
                String(
                  job.external_id ||
                  job.externalId ||
                  ""
                ).trim();

              if (!externalId) {
                return;
              }

              const response =
                await fetch(
                  "/api/generate/status",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",

                      Accept:
                        "application/json",

                      Authorization:
                        "Bearer " +
                        session.access_token
                    },

                    credentials:
                      "include",

                    body:
                      JSON.stringify(
                        {
                          provider:
                            job.provider,

                          operationName:
                            externalId
                        }
                      )
                  }
                );

              let data = null;

              try {
                data =
                  await response.json();
              } catch (_) {
                data = null;
              }

              if (
                !response.ok
              ) {
                throw new Error(
                  data?.error ||
                  data?.message ||
                  "Gagal mengambil status video."
                );
              }

              const status =
                String(
                  data?.status ||
                  ""
                )
                  .trim()
                  .toLowerCase();

              if (
                status ===
                "completed"
              ) {
                job.status =
                  "completed";

                job.provider_status =
                  "completed";

                if (
                  data.videoUrl
                ) {
                  job.video_url =
                    data.videoUrl;
                }

                if (
                  data.video_url
                ) {
                  job.video_url =
                    data.video_url;
                }

                if (
                  data.metadata
                ) {
                  job.metadata =
                    data.metadata;
                }

                changed = true;

                return;
              }

              if (
                status ===
                "failed"
              ) {
                job.status =
                  "failed";

                job.provider_status =
                  "failed";

                job.last_error =
                  data.error ||
                  data.message ||
                  job.last_error ||
                  "Generation gagal.";

                job.last_error_code =
                  data.errorCode ||
                  job.last_error_code ||
                  "provider_failed";

                changed = true;

                return;
              }

              if (
                data?.videoUrl &&
                isUsableVideoUrl(
                  data.videoUrl
                )
              ) {
                job.video_url =
                  data.videoUrl;
              }

              if (
                data?.video_url &&
                isUsableVideoUrl(
                  data.video_url
                )
              ) {
                job.video_url =
                  data.video_url;
              }
            }
          )
        );

      results.forEach(
        result => {
          if (
            result.status ===
            "rejected"
          ) {
            console.warn(
              "[GEN-Z HISTORY] Status polling gagal:",
              result.reason
            );
          }
        }
      );
    } finally {
      state.statusChecking =
        false;
    }

    return changed;
  }

  function scheduleStatusCheck() {
    if (
      state.statusTimer
    ) {
      clearTimeout(
        state.statusTimer
      );

      state.statusTimer =
        null;
    }

    const hasProcessing =
      state.jobs.some(
        job =>
          normalizeStatus(
            job
          ) === "processing"
      );

    if (!hasProcessing) {
      return;
    }

    state.statusTimer =
      setTimeout(
        async () => {
          try {
            const changed =
              await checkProcessingJobs();

            if (changed) {
              render();

              /*
               * Ambil ulang data dari
               * database agar video_url,
               * metadata, dan status final
               * benar-benar sinkron.
               */
              await loadJobs();

              render();
            }
          } catch (error) {
            console.warn(
              "[GEN-Z HISTORY] Auto status check:",
              error
            );
          }

          scheduleStatusCheck();
        },
        4000
      );
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
            normalizeStatus(
              job
            );

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

          let preview =
            "";

          if (
            status ===
              "completed" &&
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
            status ===
            "failed"
          ) {
            preview = `
              <div
                class="history-placeholder history-failed"
              >
                <div
                  style="font-size:38px;margin-bottom:8px;"
                >
                  ❌
                </div>

                <strong>
                  Generate Gagal
                </strong>

                <small
                  style="margin-top:6px;opacity:.7;"
                >
                  Klik untuk melihat detail
                </small>
              </div>
            `;
          } else {
            preview = `
              <div
                class="history-placeholder history-processing"
              >
                <div
                  style="font-size:38px;margin-bottom:8px;"
                >
                  ⏳
                </div>

                <strong>
                  Sedang Diproses
                </strong>

                <small
                  style="margin-top:6px;opacity:.7;"
                >
                  Sistem sedang memeriksa hasil video
                </small>
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
                      statusLabel(
                        status
                      )
                    )}
                  </span>
                </div>

                <div class="history-provider">
                  ${escapeHtml(
                    provider
                  )}
                </div>

                <div class="history-model">
                  ${escapeHtml(
                    model
                  )}
                </div>

                <div class="history-prompt">
                  ${escapeHtml(
                    prompt ||
                    "Tidak ada prompt"
                  )}
                </div>

                <div class="history-date">
                  ${escapeHtml(
                    date
                  )}
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

    const friendlyError =
      getFriendlyError(job);

    if (title) {
      title.textContent =
        status === "failed"
          ? "Detail Generate Gagal"
          : "Detail Video";
    }

    let content =
      "";

    if (
      status ===
        "completed" &&
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
              statusLabel(
                status
              )
            )}
          </strong>
        </div>

        <div class="history-detail-item">
          <span>Provider</span>
          <strong>
            ${escapeHtml(
              providerLabel(
                job.provider
              )
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
      status ===
      "failed"
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

    if (
      status ===
      "processing"
    ) {
      content += `
        <div class="history-error">
          Video masih diproses.
          Halaman ini akan memeriksa status
          secara otomatis.
        </div>
      `;
    }

    if (
      status ===
        "completed" &&
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

        if (
          event.target.closest(
            "video, a, button"
          )
        ) {
          return;
        }

        const index =
          Number(
            card.dataset
              .historyIndex
          );

        if (
          !Number.isFinite(
            index
          )
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

      /*
       * Penting:
       * cek job processing sekarang juga.
       * Tidak perlu menunggu user kembali
       * ke halaman Generate.
       */
      await checkProcessingJobs();

      /*
       * Ambil ulang data setelah polling
       * supaya video_url/status final
       * berasal dari database.
       */
      await loadJobs();

      render();

      scheduleStatusCheck();

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
