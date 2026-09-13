/* =========================================================
   GEN-Z.AI
   public/js/history.js

   RIWAYAT VIDEO GENERATION

   Data diambil melalui:
   GET /api/history

   Backend:
   worker.js
      ↓
   router/index.js
      ↓
   router/history.js
      ↓
   requireUser()
      ↓
   Supabase video_jobs

   Semua status ditampilkan:
   - completed
   - failed
   - processing
   - cancelled
   - error
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


  /* =======================================================
     DOM
  ======================================================= */

  function $(id) {

    return document.getElementById(id);

  }


  /* =======================================================
     HTML ESCAPE
  ======================================================= */

  function escapeHtml(value) {

    return String(
      value ?? ""
    )

      .replace(
        /&/g,
        "&amp;"
      )

      .replace(
        /</g,
        "&lt;"
      )

      .replace(
        />/g,
        "&gt;"
      )

      .replace(
        /"/g,
        "&quot;"
      )

      .replace(
        /'/g,
        "&#039;"
      );

  }


  /* =======================================================
     SESSION
  ======================================================= */

  async function getSession() {

    const client =
      window.GENZ_AUTH_CLIENT;


    if (
      !client ||
      !client.auth ||
      typeof client.auth.getSession !==
        "function"
    ) {

      throw new Error(
        "Sistem login belum siap."
      );

    }


    const result =
      await client.auth.getSession();


    if (
      result?.error
    ) {

      throw result.error;

    }


    return (
      result?.data?.session ||
      null
    );

  }


  /* =======================================================
     STATUS
  ======================================================= */

  function normalizeStatus(job) {

    const status =
      String(
        job?.status || ""
      )
        .trim()
        .toLowerCase();


    const providerStatus =
      String(
        job?.provider_status || ""
      )
        .trim()
        .toLowerCase();


    const failedStatuses = [

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


    const completedStatuses = [

      "completed",
      "complete",
      "success",
      "successful",
      "succeeded",
      "done",
      "finished",
      "ready"

    ];


    const processingStatuses = [

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

    ];


    if (
      completedStatuses.includes(
        status
      ) ||
      completedStatuses.includes(
        providerStatus
      )
    ) {

      return "completed";

    }


    if (
      failedStatuses.includes(
        status
      ) ||
      failedStatuses.includes(
        providerStatus
      )
    ) {

      return "failed";

    }


    const combined =
      `${status} ${providerStatus}`;


    if (
      combined.includes(
        "failed"
      ) ||
      combined.includes(
        "failure"
      ) ||
      combined.includes(
        "error"
      ) ||
      combined.includes(
        "reject"
      ) ||
      combined.includes(
        "timeout"
      ) ||
      combined.includes(
        "cancel"
      )
    ) {

      return "failed";

    }


    if (
      job?.last_error ||
      job?.last_error_code
    ) {

      return "failed";

    }


    if (
      processingStatuses.includes(
        status
      ) ||
      processingStatuses.includes(
        providerStatus
      )
    ) {

      return "processing";

    }


    return "processing";

  }


  /* =======================================================
     STATUS LABEL
  ======================================================= */

  function statusLabel(status) {

    if (
      status ===
      "completed"
    ) {

      return "Selesai";

    }


    if (
      status ===
      "failed"
    ) {

      return "Gagal";

    }


    return "Diproses";

  }


  /* =======================================================
     PROVIDER
  ======================================================= */

  function providerLabel(
    provider
  ) {

    const value =
      String(
        provider || ""
      )
        .trim()
        .toLowerCase();


    const map = {

      veo:
        "Veo",

      gemini:
        "Gemini",

      gemini2:
        "Gemini 2",

      minimax:
        "MiniMax",

      luma:
        "Luma"

    };


    return (
      map[value] ||
      provider ||
      "Provider"
    );

  }


  /* =======================================================
     METADATA
  ======================================================= */

  function getMetadata(job) {

    let metadata =
      job?.metadata;


    if (
      typeof metadata ===
      "string"
    ) {

      try {

        metadata =
          JSON.parse(
            metadata
          );

      } catch (_) {

        metadata = {};

      }

    }


    return (
      metadata &&
      typeof metadata ===
        "object"
    )
      ? metadata
      : {};

  }


  /* =======================================================
     PROMPT
  ======================================================= */

  function getPrompt(job) {

    const metadata =
      getMetadata(
        job
      );


    return (

      metadata.prompt ||

      metadata.originalPrompt ||

      metadata.inputPrompt ||

      job?.prompt ||

      ""

    );

  }


  /* =======================================================
     MODEL
  ======================================================= */

  function getModel(job) {

    const metadata =
      getMetadata(
        job
      );


    return (

      job?.model ||

      metadata.model ||

      metadata.requestedModel ||

      "-"

    );

  }


  /* =======================================================
     DURATION
  ======================================================= */

  function getDuration(job) {

    const metadata =
      getMetadata(
        job
      );


    return (

      metadata.duration ||

      metadata.videoDuration ||

      job?.duration ||

      "-"

    );

  }


  /* =======================================================
     ASPECT RATIO
  ======================================================= */

  function getAspectRatio(job) {

    const metadata =
      getMetadata(
        job
      );


    return (

      metadata.aspectRatio ||

      metadata.aspect_ratio ||

      job?.aspectRatio ||

      "-"

    );

  }


  /* =======================================================
     RESOLUTION
  ======================================================= */

  function getResolution(job) {

    const metadata =
      getMetadata(
        job
      );


    return (

      metadata.resolution ||

      job?.resolution ||

      "-"

    );

  }


  /* =======================================================
     DATE
  ======================================================= */

  function formatDate(
    value
  ) {

    if (!value) {

      return "-";

    }


    try {

      return new Date(
        value
      ).toLocaleString(
        "id-ID",
        {
          dateStyle:
            "medium",

          timeStyle:
            "short"
        }
      );

    } catch (_) {

      return String(
        value
      );

    }

  }


  /* =======================================================
     VIDEO URL
  ======================================================= */

  function getVideoUrl(
    job
  ) {

    if (
      normalizeStatus(
        job
      ) !==
      "completed"
    ) {

      return "";

    }


    if (
      !job?.id ||
      !job?.provider
    ) {

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
     LOAD HISTORY
  ======================================================= */

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


    const userId =
      session.user.id;


    console.log(
      "[GEN-Z HISTORY] User:",
      userId
    );


    const response =
      await fetch(
        "/api/history?limit=1000&offset=0",
        {
          method:
            "GET",

          headers: {

            "Accept":
              "application/json",

            "Authorization":
              `Bearer ${session.access_token}`

          },

          credentials:
            "include",

          cache:
            "no-store"

        }
      );


    let payload =
      null;


    try {

      payload =
        await response.json();

    } catch (_) {

      payload =
        null;

    }


    if (
      !response.ok
    ) {

      console.error(
        "[GEN-Z HISTORY] API error:",
        response.status,
        payload
      );


      throw new Error(

        payload?.error ||

        `Gagal mengambil riwayat. HTTP ${response.status}`

      );

    }


    if (
      !payload?.success
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
        job =>
          String(
            job?.user_id ||
            ""
          ) ===
          String(
            userId
          )
      );


    console.log(
      "[GEN-Z HISTORY] API total:",
      jobs.length
    );


    console.log(
      "[GEN-Z HISTORY] User total:",
      state.jobs.length
    );


    const failed =
      state.jobs.filter(
        job =>
          normalizeStatus(
            job
          ) ===
          "failed"
      ).length;


    const completed =
      state.jobs.filter(
        job =>
          normalizeStatus(
            job
          ) ===
          "completed"
      ).length;


    const processing =
      state.jobs.filter(
        job =>
          normalizeStatus(
            job
          ) ===
          "processing"
      ).length;


    console.log(
      "[GEN-Z HISTORY]",
      {
        total:
          state.jobs.length,

        completed,

        failed,

        processing
      }
    );


    return state.jobs;

  }


  /* =======================================================
     RENDER
  ======================================================= */

  function render() {

    const grid =
      $(
        "historyGrid"
      );


    const count =
      $(
        "historyCount"
      );


    if (!grid) {

      console.error(
        "[GEN-Z HISTORY] historyGrid tidak ditemukan."
      );

      return;

    }


    const jobs =
      state.jobs ||
      [];


    if (count) {

      count.textContent =
        `${jobs.length} percobaan`;

    }


    if (
      !jobs.length
    ) {

      grid.innerHTML = `

        <div
          class="history-empty"
          style="
            padding:40px 20px;
            text-align:center;
            opacity:.75;
          "
        >

          Belum ada percobaan
          generate video.

        </div>

      `;

      return;

    }


    grid.innerHTML =

      jobs.map(

        (job) => {

          const status =
            normalizeStatus(
              job
            );


          const provider =
            providerLabel(
              job.provider
            );


          const prompt =
            getPrompt(
              job
            );


          const videoUrl =
            getVideoUrl(
              job
            );


          const model =
            getModel(
              job
            );


          const date =
            formatDate(
              job.created_at
            );


          let preview = "";


          /* COMPLETED */

          if (
            status ===
              "completed" &&
            videoUrl
          ) {

            preview = `

              <video
                src="${escapeHtml(
                  videoUrl
                )}"
                muted
                playsinline
                preload="metadata"
                controls
                style="
                  width:100%;
                  height:100%;
                  object-fit:cover;
                  border-radius:12px;
                "
              ></video>

            `;

          }


          /* FAILED */

          else if (
            status ===
            "failed"
          ) {

            preview = `

              <div
                class="history-placeholder history-failed"
                style="
                  width:100%;
                  height:100%;
                  min-height:180px;
                  display:flex;
                  flex-direction:column;
                  align-items:center;
                  justify-content:center;
                  text-align:center;
                  border-radius:12px;
                  background:rgba(255,60,60,.08);
                "
              >

                <div
                  style="
                    font-size:38px;
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
                    margin-top:6px;
                    opacity:.7;
                  "
                >
                  Klik untuk melihat detail
                </small>

              </div>

            `;

          }


          /* PROCESSING */

          else {

            preview = `

              <div
                class="history-placeholder history-processing"
                style="
                  width:100%;
                  height:100%;
                  min-height:180px;
                  display:flex;
                  flex-direction:column;
                  align-items:center;
                  justify-content:center;
                  text-align:center;
                  border-radius:12px;
                "
              >

                <div
                  style="
                    font-size:38px;
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


          const error =
            job?.last_error ||
            "";


          return `

            <div
              class="history-card"
              data-history-index="${escapeHtml(
                jobs.indexOf(
                  job
                )
              )}"
              style="
                cursor:pointer;
              "
            >

              <div
                class="history-preview"
              >

                ${preview}

              </div>


              <div
                class="history-info"
              >

                <div
                  class="history-status"
                >

                  <span>

                    ${escapeHtml(
                      statusLabel(
                        status
                      )
                    )}

                  </span>

                </div>


                <div
                  class="history-provider"
                >

                  ${escapeHtml(
                    provider
                  )}

                </div>


                <div
                  class="history-model"
                >

                  ${escapeHtml(
                    model
                  )}

                </div>


                <div
                  class="history-prompt"
                >

                  ${escapeHtml(
                    prompt ||
                    "Tidak ada prompt"
                  )}

                </div>


                <div
                  class="history-date"
                >

                  ${escapeHtml(
                    date
                  )}

                </div>


                ${
                  error
                    ? `
                      <div
                        style="
                          margin-top:8px;
                          font-size:12px;
                          opacity:.65;
                        "
                      >
                        ${escapeHtml(
                          error
                        )}
                      </div>
                    `
                    : ""
                }

              </div>

            </div>

          `;

        }

      ).join("");

  }


  /* =======================================================
     DETAIL
  ======================================================= */

  function openDetail(
    job
  ) {

    if (!job) {

      return;

    }


    const metadata =
      getMetadata(
        job
      );


    const status =
      normalizeStatus(
        job
      );


    const prompt =
      getPrompt(
        job
      );


    const error =
      job?.last_error ||
      "-";


    const details = `

      <div
        style="
          padding:20px;
        "
      >

        <h3>
          Detail Generate
        </h3>

        <p>
          <strong>Status:</strong>
          ${escapeHtml(
            statusLabel(
              status
            )
          )}
        </p>

        <p>
          <strong>Provider:</strong>
          ${escapeHtml(
            providerLabel(
              job.provider
            )
          )}
        </p>

        <p>
          <strong>Model:</strong>
          ${escapeHtml(
            getModel(
              job
            )
          )}
        </p>

        <p>
          <strong>Durasi:</strong>
          ${escapeHtml(
            getDuration(
              job
            )
          )}
        </p>

        <p>
          <strong>Aspect Ratio:</strong>
          ${escapeHtml(
            getAspectRatio(
              job
            )
          )}
        </p>

        <p>
          <strong>Resolusi:</strong>
          ${escapeHtml(
            getResolution(
              job
            )
          )}
        </p>

        <p>
          <strong>Tanggal:</strong>
          ${escapeHtml(
            formatDate(
              job.created_at
            )
          )}
        </p>

        <p>
          <strong>Job ID:</strong>
          ${escapeHtml(
            job.id
          )}
        </p>

        <p>
          <strong>Prompt:</strong>
          ${escapeHtml(
            prompt ||
            "-"
          )}
        </p>

        <p>
          <strong>Error:</strong>
          ${escapeHtml(
            error
          )}
        </p>

        <p>
          <strong>Error Code:</strong>
          ${escapeHtml(
            job.last_error_code ||
            "-"
          )}
        </p>

        <p>
          <strong>Refund:</strong>
          ${job.refunded
            ? "Ya"
            : "Tidak"}
        </p>

      </div>

    `;


    const modal =
      document.createElement(
        "div"
      );


    modal.style.cssText = `

      position:fixed;
      inset:0;
      z-index:99999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      background:rgba(0,0,0,.65);

    `;


    const box =
      document.createElement(
        "div"
      );


    box.style.cssText = `

      width:min(600px,100%);
      max-height:90vh;
      overflow:auto;
      background:#111;
      color:#fff;
      border-radius:16px;

    `;


    box.innerHTML =
      details;


    modal.appendChild(
      box
    );


    modal.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          modal
        ) {

          modal.remove();

        }

      }
    );


    document.body.appendChild(
      modal
    );

  }


  /* =======================================================
     EVENTS
  ======================================================= */

  function bind() {

    if (
      state.bound
    ) {

      return;

    }


    const grid =
      $(
        "historyGrid"
      );


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


        openDetail(
          state.jobs[index]
        );

      }
    );


    state.bound =
      true;

  }


  /* =======================================================
     REFRESH
  ======================================================= */

  async function refresh() {

    if (
      state.loading
    ) {

      return;

    }


    state.loading =
      true;


    const grid =
      $(
        "historyGrid"
      );


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

    } catch (
      error
    ) {

      console.error(
        "[GEN-Z HISTORY]",
        error
      );


      if (grid) {

        grid.innerHTML = `

          <div
            style="
              padding:30px;
              text-align:center;
            "
          >

            <strong>
              Riwayat belum dapat dimuat
            </strong>

            <div
              style="
                margin-top:10px;
                opacity:.7;
                font-size:13px;
              "
            >

              ${escapeHtml(
                error?.message ||
                "Terjadi kesalahan."
              )}

            </div>

          </div>

        `;

      }

    } finally {

      state.loading =
        false;

    }

  }


  /* =======================================================
     LOAD COMPONENT
  ======================================================= */

  async function load() {

    const container =
      $(
        "profilePage"
      ) ||
      $(
        "page-profile"
      ) ||
      $(
        "historyPage"
      );


    if (!container) {

      console.warn(
        "[GEN-Z HISTORY] Container history tidak ditemukan."
      );

    }


    try {

      const response =
        await fetch(
          "/components/history.html",
          {
            cache:
              "no-store"
          }
        );


      if (
        response.ok &&
        container
      ) {

        container.innerHTML =
          await response.text();

      }

    } catch (
      error
    ) {

      console.error(
        "[GEN-Z HISTORY] Component error:",
        error
      );

    }


    bind();

    await refresh();

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.history = {

    load,

    refresh,

    loadJobs,

    get jobs() {

      return state.jobs;

    }

  };


})();
