/* =========================================================
   GEN-Z.AI - ADMIN PANEL
   public/js/admin.js

   STEP 1
   - Jangan generate / replace admin.html
   - Gunakan struktur HTML statis yang sudah tersedia
   - Validasi admin tetap dari GENZ.state.account
   - Isi dashboard dari endpoint admin yang sudah tersedia
========================================================= */

(function () {

  "use strict";


  /* =======================================================
     GEN-Z GLOBAL
  ======================================================= */

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  /* =======================================================
     STATE
  ======================================================= */

  const state = {

    section: "dashboard",

    users: [],

    providers: [],

    topups: [],

    jobs: [],

    events: [],

    admins: [],

    selectedUser: null,

    loading: false

  };


  /* =======================================================
     HELPERS
  ======================================================= */

  function $(id) {

    return document.getElementById(id);

  }


  async function token() {

    if (
      GENZ.auth &&
      typeof GENZ.auth.token === "function"
    ) {

      return await GENZ.auth.token();

    }

    return null;

  }


  async function api(
    path,
    options = {}
  ) {

    const accessToken =
      await token();


    const headers = {
      ...(options.headers || {})
    };


    if (
      options.body &&
      !headers["Content-Type"]
    ) {

      headers["Content-Type"] =
        "application/json";

    }


    if (accessToken) {

      headers.Authorization =
        `Bearer ${accessToken}`;

    }


    const response =
      await fetch(
        path,
        {
          ...options,
          headers,
          credentials: "include"
        }
      );


    let data = {};

    try {

      data =
        await response.json();

    } catch (_) {

      data = {};

    }


    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        `Request gagal (${response.status})`
      );

    }


    return data;

  }


  function esc(value) {

    if (
      GENZ.escapeHtml &&
      typeof GENZ.escapeHtml === "function"
    ) {

      return GENZ.escapeHtml(
        String(value ?? "")
      );

    }


    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function formatNumber(value) {

    return Number(
      value || 0
    ).toLocaleString(
      "id-ID"
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

    } catch (_) {

      return String(value);

    }

  }


  function setText(
    id,
    value
  ) {

    const element =
      $(id);


    if (!element) {

      return;

    }


    element.textContent =
      String(value ?? "");

  }


  function setStatus(
    message,
    type = ""
  ) {

    const element =
      $("adminStatus");


    if (!element) {

      return;

    }


    element.className =
      `admin-status-message ${type}`;


    element.textContent =
      message || "";

  }


  /* =======================================================
     ADMIN AUTH
  ======================================================= */

  function isAdmin() {

    const account =
      GENZ.state?.account || {};


    return (
      account.isAdmin === true &&
      account.roleValidated === true
    );

  }


  /* =======================================================
     ACCESS DENIED
  ======================================================= */

  function renderDenied() {

    const page =
      $("adminPage");


    if (page) {

      page.hidden = true;

    }


    setStatus(
      "Akses admin ditolak.",
      "error"
    );

  }


  /* =======================================================
     ADMIN PAGE VISIBILITY
  ======================================================= */

  function ensureAdminVisible() {

    const page =
      $("adminPage");


    if (!page) {

      console.warn(
        "[GEN-Z.AI] #adminPage tidak ditemukan."
      );

      return false;

    }


    page.hidden = false;

    return true;

  }


  /* =======================================================
     ADMIN EMAIL
  ======================================================= */

  function renderAdminIdentity() {

    const account =
      GENZ.state?.account || {};


    const email =
      account.email ||
      account.user?.email ||
      "";


    if (email) {

      setText(
        "adminEmail",
        email
      );

    }

  }


  /* =======================================================
     DASHBOARD
  ======================================================= */

  async function loadDashboard() {

    if (!isAdmin()) {

      return;

    }


    state.loading = true;


    try {

      const [
        usersResponse,
        providersResponse,
        topupResponse,
        jobsResponse
      ] = await Promise.all([

        api(
          "/api/admin/users"
        ),

        api(
          "/api/admin/providers"
        ),

        api(
          "/api/admin/topup-requests?status=pending&limit=100"
        ),

        api(
          "/api/admin/jobs?limit=200"
        )

      ]);


      state.users =
        usersResponse?.users || [];


      state.providers =
        providersResponse?.providers || [];


      state.topups =
        topupResponse?.requests || [];


      state.jobs =
        jobsResponse?.jobs || [];


      renderDashboardStats();


      renderDashboardProviders();


      renderDashboardTopups();


      setStatus(
        "Dashboard berhasil diperbarui.",
        "success"
      );

    } catch (error) {

      console.error(
        "[GEN-Z.AI] Dashboard error:",
        error
      );


      setStatus(
        error?.message ||
        "Gagal memuat dashboard.",
        "error"
      );

    } finally {

      state.loading = false;

    }

  }


  /* =======================================================
     DASHBOARD STATS
  ======================================================= */

  function renderDashboardStats() {

    const completed =
      state.jobs.filter(
        job =>
          String(job.status || "")
            .toLowerCase() ===
          "completed"
      ).length;


    const processing =
      state.jobs.filter(
        job => {

          const status =
            String(
              job.status || ""
            ).toLowerCase();


          return (
            status === "processing" ||
            status === "reserved"
          );

        }
      ).length;


    const failed =
      state.jobs.filter(
        job =>
          String(job.status || "")
            .toLowerCase() ===
          "failed"
      ).length;


    const totalCredits =
      state.users.reduce(
        (
          total,
          user
        ) => {

          return (
            total +
            Number(
              user.credits || 0
            )
          );

        },
        0
      );


    const activeProviders =
      state.providers.filter(
        provider =>
          provider.enabled === true
      ).length;


    setText(
      "statTotalUsers",
      formatNumber(
        state.users.length
      )
    );


    setText(
      "statTotalCredits",
      formatNumber(
        totalCredits
      )
    );


    setText(
      "statActiveProviders",
      formatNumber(
        activeProviders
      )
    );


    setText(
      "statPendingTopups",
      formatNumber(
        state.topups.length
      )
    );


    setText(
      "statCompletedJobs",
      formatNumber(
        completed
      )
    );


    setText(
      "statProcessingJobs",
      formatNumber(
        processing
      )
    );


    setText(
      "statFailedJobs",
      formatNumber(
        failed
      )

    );

  }


  /* =======================================================
     DASHBOARD PROVIDER SUMMARY
  ======================================================= */

  function renderDashboardProviders() {

    /*
     * admin.html saat ini sudah memiliki
     * struktur statis untuk provider.
     *
     * Pada langkah ini kita sengaja tidak
     * membuat ulang HTML section tersebut.
     *
     * Fungsi ini disiapkan agar integrasi provider
     * dapat dilakukan pada langkah berikutnya
     * tanpa mengubah fondasi admin.html.
     */

  }


  /* =======================================================
     DASHBOARD TOP-UP SUMMARY
  ======================================================= */

  function renderDashboardTopups() {

    /*
     * Sama seperti provider:
     *
     * HTML tetap berasal dari admin.html.
     * Kita belum mengganti markup section lain.
     *
     * Endpoint top-up sudah berhasil diambil dan
     * state.topups sudah tersedia untuk langkah berikutnya.
     */

  }


  /* =======================================================
     NAVIGATION
  ======================================================= */

  function bindNavigation() {

    /*
     * admin.html menggunakan anchor/hash navigation.
     *
     * Jangan membuat navigation baru.
     * Jangan mengganti innerHTML.
     *
     * Kita hanya mencatat section aktif agar state JS
     * tetap konsisten dengan halaman.
     */

    document
      .querySelectorAll(
        "[data-admin-section]"
      )
      .forEach(
        element => {

          element.addEventListener(
            "click",
            () => {

              const section =
                element.dataset.adminSection;


              if (section) {

                state.section =
                  section;

              }

            }
          );

        }
      );


    /*
     * Dukungan tambahan untuk anchor biasa
     * seperti #dashboard, #users, dst.
     */

    document
      .querySelectorAll(
        'a[href^="#"]'
      )
      .forEach(
        link => {

          const href =
            link.getAttribute("href");


          if (!href) {

            return;

          }


          const section =
            href.slice(1);


          const knownSections = [

            "dashboard",
            "users",
            "membership",
            "affiliate",
            "providers",
            "topup",
            "credit",
            "jobs",
            "job-events",
            "admin",
            "contact-section",
            "settings"

          ];


          if (
            !knownSections.includes(
              section
            )
          ) {

            return;

          }


          link.addEventListener(
            "click",
            () => {

              state.section =
                section;

            }
          );

        }
      );

  }


  /* =======================================================
     REFRESH BUTTON
  ======================================================= */

  function bindRefresh() {

    const refresh =
      $("refreshUsers");


    if (refresh) {

      refresh.addEventListener(
        "click",
        async () => {

          try {

            setStatus(
              "Memuat ulang data user..."
            );


            const response =
              await api(
                "/api/admin/users"
              );


            state.users =
              response?.users || [];


            renderDashboardStats();


            setStatus(
              "Data user diperbarui.",
              "success"
            );

          } catch (error) {

            console.error(
              "[GEN-Z.AI] Users refresh error:",
              error
            );


            setStatus(
              error?.message ||
              "Gagal memuat user.",
              "error"
            );

          }

        }
      );

    }


    const refreshTopups =
      $("refreshTopups");


    if (refreshTopups) {

      refreshTopups.addEventListener(
        "click",
        async () => {

          try {

            setStatus(
              "Memuat ulang top-up..."
            );


            const response =
              await api(
                "/api/admin/topup-requests?status=all&limit=200"
              );


            state.topups =
              response?.requests || [];


            renderDashboardStats();


            setStatus(
              "Data top-up diperbarui.",
              "success"
            );

          } catch (error) {

            console.error(
              "[GEN-Z.AI] Top-up refresh error:",
              error
            );


            setStatus(
              error?.message ||
              "Gagal memuat top-up.",
              "error"
            );

          }

        }
      );

    }


    const refreshJobs =
      $("refreshJobs");


    if (refreshJobs) {

      refreshJobs.addEventListener(
        "click",
        async () => {

          try {

            setStatus(
              "Memuat ulang jobs..."
            );


            const response =
              await api(
                "/api/admin/jobs?limit=200"
              );


            state.jobs =
              response?.jobs || [];


            renderDashboardStats();


            setStatus(
              "Data jobs diperbarui.",
              "success"
            );

          } catch (error) {

            console.error(
              "[GEN-Z.AI] Jobs refresh error:",
              error
            );


            setStatus(
              error?.message ||
              "Gagal memuat jobs.",
              "error"
            );

          }

        }
      );

    }

  }


  /* =======================================================
     LOAD
  ======================================================= */

  async function load() {

    /*
     * Admin panel tidak boleh diakses sebelum
     * role berhasil divalidasi.
     */

    if (!isAdmin()) {

      renderDenied();

      return;

    }


    /*
     * PENTING:
     *
     * Tidak ada lagi:
     *
     * container.innerHTML = ...
     *
     * Admin page sekarang sepenuhnya berasal
     * dari public/admin.html.
     */

    if (!ensureAdminVisible()) {

      return;

    }


    renderAdminIdentity();


    bindNavigation();


    bindRefresh();


    /*
     * Dashboard adalah satu-satunya bagian
     * yang kita aktifkan pada langkah ini.
     */

    await loadDashboard();

  }


  /* =======================================================
     SHOW SECTION
  ======================================================= */

  async function showSection(
    section
  ) {

    if (!isAdmin()) {

      renderDenied();

      return;

    }


    state.section =
      section ||
      "dashboard";


    /*
     * HTML section dikontrol oleh admin.html.
     *
     * Jangan replace innerHTML di sini.
     *
     * Browser akan menangani hash navigation
     * melalui anchor yang sudah ada.
     */

    const target =
      $(
        state.section === "contact"
          ? "contact-section"
          : state.section
      );


    if (target) {

      try {

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      } catch (_) {

        target.scrollIntoView();

      }

    }


    if (
      state.section ===
      "dashboard"
    ) {

      await loadDashboard();

    }

  }


  /* =======================================================
     REFRESH
  ======================================================= */

  async function refresh() {

    if (!isAdmin()) {

      renderDenied();

      return;

    }


    await loadDashboard();

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.admin = {

    load,

    showSection,

    refresh,

    state

  };


})();
