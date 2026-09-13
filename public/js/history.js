/* =========================================================
   GEN-Z.AI
   public/js/history.js

   RIWAYAT VIDEO GENERATION

   Menampilkan seluruh percobaan generate milik
   akun yang sedang login.

   Sumber data:
   Supabase client yang sudah dibuat oleh auth.js

   Tidak menggunakan:
   - /api/config
   - service role key
   - anonymous client baru
   - filter status

   Status yang ditampilkan:
   - completed
   - failed
   - processing
   - cancelled
   - error
========================================================= */

(function () {

  "use strict";


  /* =======================================================
     GLOBAL
  ======================================================= */

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
     ESCAPE HTML
  ======================================================= */

  function escapeHtml(value) {

    return String(value ?? "")

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;")

      .replace(/'/g, "&#039;");

  }


  /* =======================================================
     SUPABASE CLIENT
  ======================================================= */

  function getSupabaseClient() {

    const client =
      window.GENZ_AUTH_CLIENT;


    if (
      client &&
      client.auth &&
      typeof client.from === "function"
    ) {

      return client;

    }


    throw new Error(
      "Koneksi Supabase belum siap. Silakan login kembali."
    );

  }


  /* =======================================================
     SESSION
  ======================================================= */

  async function getSession() {

    const client =
      getSupabaseClient();


    const result =
      await client.auth.getSession();


    if (result?.error) {

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


    const combined =
      `${status} ${providerStatus}`;


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
      ].includes(status)

      ||

      [
        "completed",
        "complete",
        "success",
        "successful",
        "succeeded",
        "done",
        "finished",
        "ready"
      ].includes(providerStatus)

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
      ].includes(status)

      ||

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
      ].includes(providerStatus)

    ) {

      return "failed";

    }


    /* EXTRA FAILURE */

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
      ].includes(status)

      ||

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
      ].includes(providerStatus)

    ) {

      return "processing";

    }


    /*
      Kalau status tidak dikenal tetapi
      ada error, tetap dianggap gagal.
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

    if (
      status === "completed"
    ) {

      return "Selesai";

    }


    if (
      status === "failed"
    ) {

      return "Gagal";

    }


    return "Diproses";

  }


  /* =======================================================
     PROVIDER
  ======================================================= */

  function providerLabel(provider) {

    const value =
      String(provider || "")
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
      typeof metadata === "string"
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


    if (
      metadata &&
      typeof metadata === "object"
    ) {

      return metadata;

    }


    return {};

  }


  /* =======================================================
     PROMPT
  ======================================================= */

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


  /* =======================================================
     MODEL
  ======================================================= */

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


  /* =======================================================
     DURATION
  ======================================================= */

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


  /* =======================================================
     ASPECT RATIO
  ======================================================= */

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


  /* =======================================================
     RESOLUTION
  ======================================================= */

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

            dateStyle:
              "medium",

            timeStyle:
              "short"

          }

        );

    } catch (_) {

      return String(value);

    }

  }


  /* =======================================================
     VIDEO URL
  ======================================================= */

  function getVideoUrl(job) {

    const status =
      normalizeStatus(job);


    if (
      status !== "completed"
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
     LOAD JOBS
  ======================================================= */

  async function loadJobs() {

    const client =
      getSupabaseClient();


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


    /*
      Query langsung menggunakan Supabase client
      yang sudah terautentikasi.

      Tidak memakai /api/config.
      Tidak memakai service-role key.
    */

    const {

      data,

      error

    } =

      await client

        .from("video_jobs")

        .select(

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
            "metadata",
            "attempt_count",
            "last_error",
            "last_error_code",
            "provider_status",
            "created_at",
            "updated_at"
          ].join(",")

        )

        .eq(
          "user_id",
          userId
        )

        .order(
          "created_at",
          {
            ascending:
              false
          }
        );


    if (error) {

      console.error(
        "[GEN-Z HISTORY] Supabase error:",
        error
      );


      throw new Error(

        error.message ||

        "Gagal mengambil riwayat video dari Supabase."

      );

    }


    const jobs =
      Array.isArray(data)
        ? data
        : [];


    /*
      Perlindungan tambahan.
    */

    state.jobs =
      jobs.filter(

        job =>

          String(
            job?.user_id || ""
          ) ===

          String(userId)

      );


    console.log(
      "[GEN-Z HISTORY] Total:",
      state.jobs.length
    );


    const failed =
      state.jobs.filter(

        job =>
          normalizeStatus(job) ===
          "failed"

      ).length;


    const completed =
      state.jobs.filter(

        job =>
          normalizeStatus(job) ===
          "completed"

      ).length;


    const processing =
      state.jobs.filter(

        job =>
          normalizeStatus(job) ===
          "processing"

      ).length;


    console.log(
      "[GEN-Z HISTORY] Selesai:",
      completed,
      "| Gagal:",
      failed,
      "| Diproses:",
      processing
    );


    return state.jobs;

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

          Belum ada percobaan
          generate video.

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
            getPrompt(job);


          const videoUrl =
            getVideoUrl(job);


          const model =
            getModel(job);


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

              >

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


          /* PROCESSING */

          else {

            preview = `

              <div

                class="history-placeholder history-processing"

              >

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


          const safePrompt =
            escapeHtml(
              prompt
            );


          return `

            <article

              class="history-card"

              data-history-index="${index}"

              style="cursor:pointer"

            >

              <div

                class="history-preview"

              >

                ${preview}

              </div>


              <div

                class="history-card-body"

              >

                <div

                  class="history-card-top"

                >

                  <span

                    class="history-status history-status-${status}"

                  >

                    ${escapeHtml(
                      statusLabel(
                        status
                      )
                    )}

                  </span>


                  <span

                    class="history-provider"

                  >

                    ${escapeHtml(
                      provider
                    )}

                  </span>

                </div>


                <h3>

                  ${escapeHtml(
                    model
                  )}

                </h3>


                <p

                  class="history-prompt"

                >

                  ${
                    safePrompt ||

                    "Tidak ada prompt."
                  }

                </p>


                <div

                  class="history-meta"

                >

                  <span>

                    ${escapeHtml(
                      date
                    )}

                  </span>


                  <span>

                    ${
                      Number(
                        job.credit_cost
                      ) || 0
                    } kredit

                  </span>

                </div>

              </div>

            </article>

          `;

        }

      ).join("");


    grid
      .querySelectorAll(
        "[data-history-index]"
      )
      .forEach(

        card => {

          card.addEventListener(

            "click",

            () => {

              const index =
                Number(
                  card.dataset
                    .historyIndex
                );


              openDetail(
                state.jobs[index]
              );

            }

          );

        }

      );

  }


  /* =======================================================
     DETAIL MODAL
  ======================================================= */

  function openDetail(job) {

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


    const metadata =
      getMetadata(job);


    const prompt =
      getPrompt(job);


    const provider =
      providerLabel(
        job.provider
      );


    const model =
      getModel(job);


    const duration =
      getDuration(job);


    const aspectRatio =
      getAspectRatio(job);


    const resolution =
      getResolution(job);


    const error =
      job.last_error || "";


    const errorCode =
      job.last_error_code || "";


    const providerStatus =
      job.provider_status || "";


    const refunded =
      job.refunded === true;


    const videoUrl =
      getVideoUrl(job);


    let videoHtml = "";


    if (

      status ===
        "completed" &&

      videoUrl

    ) {

      videoHtml = `

        <div

          style="
            margin-bottom:18px;
          "

        >

          <video

            src="${escapeHtml(
              videoUrl
            )}"

            controls

            playsinline

            preload="metadata"

            style="
              width:100%;
              max-height:420px;
              border-radius:14px;
              background:#000;
            "

          ></video>

        </div>

      `;

    }


    body.innerHTML = `

      ${videoHtml}


      <div

        class="history-detail"

      >

        <div

          class="history-detail-row"

        >

          <strong>Status</strong>

          <span>

            ${escapeHtml(
              statusLabel(
                status
              )
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Provider</strong>

          <span>

            ${escapeHtml(
              provider
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Model</strong>

          <span>

            ${escapeHtml(
              model
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Durasi</strong>

          <span>

            ${escapeHtml(
              duration
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Aspect Ratio</strong>

          <span>

            ${escapeHtml(
              aspectRatio
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Resolusi</strong>

          <span>

            ${escapeHtml(
              resolution
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Tanggal</strong>

          <span>

            ${escapeHtml(
              formatDate(
                job.created_at
              )
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Job ID</strong>

          <span

            style="
              word-break:break-all;
            "

          >

            ${escapeHtml(
              job.id
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Percobaan</strong>

          <span>

            ${escapeHtml(
              job.attempt_count ??
              "-"
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Kredit</strong>

          <span>

            ${escapeHtml(
              job.credit_cost ??
              0
            )}

          </span>

        </div>


        <div

          class="history-detail-row"

        >

          <strong>Refund</strong>

          <span>

            ${
              refunded
                ? "Ya"
                : "Tidak"
            }

          </span>

        </div>


        ${
          providerStatus
            ? `

              <div

                class="history-detail-row"

              >

                <strong>
                  Provider Status
                </strong>

                <span>

                  ${escapeHtml(
                    providerStatus
                  )}

                </span>

              </div>

            `
            : ""
        }


        ${
          errorCode
            ? `

              <div

                class="history-detail-row"

              >

                <strong>
                  Error Code
                </strong>

                <span>

                  ${escapeHtml(
                    errorCode
                  )}

                </span>

              </div>

            `
            : ""
        }


        ${
          error
            ? `

              <div

                style="
                  margin-top:16px;
                  padding:14px;
                  border-radius:12px;
                  background:rgba(239,68,68,.10);
                  border:1px solid rgba(239,68,68,.25);
                "

              >

                <strong

                  style="
                    display:block;
                    margin-bottom:7px;
                  "

                >

                  Detail Error

                </strong>


                <div

                  style="
                    white-space:pre-wrap;
                    word-break:break-word;
                    line-height:1.5;
                    opacity:.9;
                  "

                >

                  ${escapeHtml(
                    error
                  )}

                </div>

              </div>

            `
            : ""
        }


        ${
          prompt
            ? `

              <div

                style="
                  margin-top:16px;
                "

              >

                <strong>

                  Prompt

                </strong>


                <div

                  style="
                    margin-top:8px;
                    padding:14px;
                    border-radius:12px;
                    background:rgba(255,255,255,.05);
                    white-space:pre-wrap;
                    word-break:break-word;
                    line-height:1.5;
                  "

                >

                  ${escapeHtml(
                    prompt
                  )}

                </div>

              </div>

            `
            : ""
        }

      </div>

    `;


    modal.classList.remove(
      "hidden"
    );


    modal.style.display =
      "flex";

  }


  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  function closeDetail() {

    const modal =
      $("historyModal");


    if (!modal) {

      return;

    }


    modal.classList.add(
      "hidden"
    );


    modal.style.display =
      "none";


    state.selected =
      null;

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


    const status =
      $("historyStatus");


    state.loading =
      true;


    if (status) {

      status.textContent =
        "Memuat riwayat...";

    }


    try {

      await loadJobs();


      render();


      const failed =
        state.jobs.filter(

          job =>
            normalizeStatus(job) ===
            "failed"

        ).length;


      if (status) {

        status.textContent =

          failed > 0

            ? `${failed} generate gagal ditemukan.`

            : "Riwayat berhasil dimuat.";

      }


    } catch (error) {

      console.error(
        "[GEN-Z HISTORY] Load error:",
        error
      );


      state.jobs =
        [];


      render();


      if (status) {

        status.textContent =

          error?.message ||

          "Gagal memuat riwayat.";

      }

    } finally {

      state.loading =
        false;

    }

  }


  /* =======================================================
     BIND EVENTS
  ======================================================= */

  function bindEvents() {

    if (
      state.bound
    ) {

      return;

    }


    state.bound =
      true;


    const back =
      $("historyBack");


    const refreshButton =
      $("historyRefresh");


    const close =
      $("historyClose");


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


    if (refreshButton) {

      refreshButton.addEventListener(

        "click",

        () => {

          refresh();

        }

      );

    }


    if (close) {

      close.addEventListener(

        "click",

        () => {

          closeDetail();

        }

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

  }


  /* =======================================================
     LOAD COMPONENT
  ======================================================= */

  async function load() {

    /*
      Jangan memuat history.html
      kalau GENZ.loadComponent belum tersedia.
    */

    if (
      typeof GENZ.loadComponent !==
      "function"
    ) {

      throw new Error(
        "Loader komponen GEN-Z.AI belum siap."
      );

    }


    await GENZ.loadComponent(

      "#pageContent",

      "/components/history.html"

    );


    /*
      Reset binding karena DOM
      history.html baru saja dibuat.
    */

    state.bound =
      false;


    bindEvents();


    await refresh();

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.history = {

    state,

    load,

    refresh,

    openDetail,

    closeDetail

  };


  console.log(
    "[GEN-Z HISTORY] Module ready."
  );


})();
