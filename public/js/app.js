/* =========================================================
   GEN-Z.AI APPLICATION CONTROLLER
   public/js/app.js
========================================================= */

(function () {

  'use strict';

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  /* =======================================================
     INTERNAL STATE
  ======================================================= */

  let started = false;
  let authBound = false;


  /* =======================================================
     UTILITY
  ======================================================= */

  function $(id) {
    return document.getElementById(id);
  }


  function log(...args) {
    console.log(
      '[GEN-Z.AI]',
      ...args
    );
  }


  function error(...args) {
    console.error(
      '[GEN-Z.AI]',
      ...args
    );
  }


  /* =======================================================
     LOAD MAIN COMPONENTS
  ======================================================= */

  async function loadComponents() {

    const app =
      $('app');

    if (!app) {

      throw new Error(
        'Element #app tidak ditemukan'
      );

    }


    app.innerHTML = `

      <div id="header-container"></div>

      <main
        id="main-container">
      </main>

      <div
        id="pageContent"
        class="hidden">
      </div>

    `;


    if (
      typeof GENZ.loadComponent !==
      'function'
    ) {

      throw new Error(
        'GENZ.loadComponent tidak tersedia. Pastikan core.js dimuat.'
      );

    }


    /* -----------------------------------------------------
       HEADER
    ----------------------------------------------------- */

    await GENZ.loadComponent(
      '#header-container',
      '/components/header.html'
    );


    /* -----------------------------------------------------
       GENERATOR
    ----------------------------------------------------- */

    const main =
      $('main-container');

    if (!main) {

      throw new Error(
        'Element #main-container tidak ditemukan'
      );

    }


    try {

      await GENZ.loadComponent(
        '#main-container',
        '/components/generator.html'
      );

    } catch (componentError) {

      error(
        'Gagal memuat generator.html:',
        componentError
      );

      main.innerHTML = `

        <section class="page-card">

          <h2>GEN-Z.AI</h2>

          <p>
            Generator belum dapat dimuat.
          </p>

          <small>
            Periksa file
            /components/generator.html
          </small>

        </section>

      `;

    }


    /* -----------------------------------------------------
       ACCOUNT
    ----------------------------------------------------- */

    if (
      GENZ.account &&
      typeof GENZ.account.init ===
      'function'
    ) {

      try {

        await GENZ.account.init();

      } catch (accountError) {

        error(
          'Account module error:',
          accountError
        );

      }

    } else {

      console.warn(
        '[GEN-Z.AI] account.js belum tersedia'
      );

    }

  }


  /* =======================================================
     AUTH SESSION SYNC
     
     auth.js adalah pemilik utama Supabase auth state.
     app.js hanya melakukan pengecekan session awal.
  ======================================================= */

  async function syncAuth() {

    try {

      let session = null;


      /* ---------------------------------------------------
         Gunakan API auth.js jika tersedia
      --------------------------------------------------- */

      if (
        window.GENZ_AUTH &&
        typeof window.GENZ_AUTH.getSession ===
        'function'
      ) {

        session =
          await window.GENZ_AUTH.getSession();

      }


      /* ---------------------------------------------------
         Fallback ke client langsung
      --------------------------------------------------- */

      else {

        const client =
          window.GENZ_AUTH_CLIENT;

        if (
          !client ||
          !client.auth ||
          typeof client.auth.getSession !==
          'function'
        ) {

          console.warn(
            '[GEN-Z.AI] Auth client belum tersedia'
          );

          return false;

        }


        const result =
          await client.auth.getSession();

        session =
          result?.data?.session ||
          null;

      }


      /* ---------------------------------------------------
         SESSION AKTIF
      --------------------------------------------------- */

      if (
        session &&
        session.user
      ) {

        GENZ.state.loggedIn =
          true;

        GENZ.state.user =
          session.user;


        await handleLogin(
          session.user,
          false
        );


        return true;

      }


      /* ---------------------------------------------------
         TIDAK LOGIN
      --------------------------------------------------- */

      GENZ.state.loggedIn =
        false;

      GENZ.state.user =
        null;


      await handleLogout(
        false
      );


      return false;


    } catch (authError) {

      error(
        'Auth sync error:',
        authError
      );

      return false;

    }

  }


  /* =======================================================
     LOGIN HANDLER
  ======================================================= */

  async function handleLogin(
    user,
    emitEvent = false
  ) {

    /*
     * Pastikan state user benar.
     */

    if (user) {

      GENZ.state.loggedIn =
        true;

      GENZ.state.user =
        user;

    }


    /*
     * Jika user tidak tersedia,
     * jangan jalankan proses login.
     */

    if (
      !GENZ.state.user
    ) {

      return;

    }


    /* -----------------------------------------------------
       ACCOUNT UI
    ----------------------------------------------------- */

    if (
      GENZ.account &&
      typeof GENZ.account.ensureUI ===
      'function'
    ) {

      try {

        await GENZ.account.ensureUI();

      } catch (accountError) {

        error(
          'Account UI error:',
          accountError
        );

      }

    }


    /* -----------------------------------------------------
       UPDATE USER
    ----------------------------------------------------- */

    if (
      GENZ.account &&
      typeof GENZ.account.updateUser ===
      'function'
    ) {

      try {

        GENZ.account.updateUser(
          GENZ.state.user
        );

      } catch (updateError) {

        error(
          'Account user update error:',
          updateError
        );

      }

    }


    /* -----------------------------------------------------
       RESET PRIVILEGE SEBELUM VALIDASI SERVER
    ----------------------------------------------------- */

    if (
      GENZ.state.account &&
      typeof GENZ.state.account ===
      'object'
    ) {

      GENZ.state.account.isAdmin =
        false;

      GENZ.state.account.roleValidated =
        false;

    } else {

      GENZ.state.account = {

        isAdmin: false,

        roleValidated: false

      };

    }


    /* -----------------------------------------------------
       REFRESH ACCOUNT
       Kredit dan role berasal dari server.
    ----------------------------------------------------- */

    if (
      GENZ.account &&
      typeof GENZ.account.refresh ===
      'function'
    ) {

      try {

        await GENZ.account.refresh();

      } catch (refreshError) {

        error(
          'Account refresh error:',
          refreshError
        );

      }

    }


    /* -----------------------------------------------------
       PROVIDERS
    ----------------------------------------------------- */

    if (
      GENZ.providers &&
      typeof GENZ.providers.load ===
      'function'
    ) {

      try {

        await GENZ.providers.load();

      } catch (providerError) {

        error(
          'Provider loading error:',
          providerError
        );

      }

    }


    /* -----------------------------------------------------
       UPLOAD MODULE
    ----------------------------------------------------- */

    if (
      GENZ.upload &&
      typeof GENZ.upload.init ===
      'function'
    ) {

      try {

        GENZ.upload.init();

      } catch (uploadError) {

        error(
          'Upload module error:',
          uploadError
        );

      }

    }


    /* -----------------------------------------------------
       GENERATOR MODULE
    ----------------------------------------------------- */

    if (
      GENZ.generator &&
      typeof GENZ.generator.init ===
      'function'
    ) {

      try {

        GENZ.generator.init();

      } catch (generatorError) {

        error(
          'Generator module error:',
          generatorError
        );

      }

    }


    /* -----------------------------------------------------
       TAMPILKAN STUDIO
    ----------------------------------------------------- */

    showStudio();


    /*
     * Event internal hanya jika memang diminta.
     *
     * auth.js tetap menjadi sumber event autentikasi.
     */

    if (
      emitEvent &&
      typeof GENZ.emit ===
      'function'
    ) {

      GENZ.emit(
        'auth-login',
        GENZ.state.user
      );

    }

  }


  /* =======================================================
     LOGOUT HANDLER
  ======================================================= */

  async function handleLogout(
    emitEvent = false
  ) {

    GENZ.state.loggedIn =
      false;

    GENZ.state.user =
      null;


    /*
     * Jangan mempertahankan privilege admin
     * setelah logout.
     */

    GENZ.state.account = {

      isAdmin: false,

      roleValidated: false

    };


    /* -----------------------------------------------------
       HENTIKAN POLLING VIDEO
    ----------------------------------------------------- */

    if (
      GENZ.video &&
      typeof GENZ.video.stopPolling ===
      'function'
    ) {

      try {

        GENZ.video.stopPolling();

      } catch (_) {}

    }


    /* -----------------------------------------------------
       BERSIHKAN VIDEO
    ----------------------------------------------------- */

    if (
      GENZ.video &&
      typeof GENZ.video.clear ===
      'function'
    ) {

      try {

        GENZ.video.clear();

      } catch (_) {}

    }


    /* -----------------------------------------------------
       TUTUP ACCOUNT MENU
    ----------------------------------------------------- */

    if (
      GENZ.account &&
      typeof GENZ.account.close ===
      'function'
    ) {

      try {

        GENZ.account.close();

      } catch (_) {}

    }


    /* -----------------------------------------------------
       UI LOGOUT
    ----------------------------------------------------- */

    if (
      GENZ.auth &&
      typeof GENZ.auth.showLoggedOutUI ===
      'function'
    ) {

      try {

        GENZ.auth.showLoggedOutUI();

      } catch (_) {}

    }


    /* -----------------------------------------------------
       EVENT INTERNAL
    ----------------------------------------------------- */

    if (
      emitEvent &&
      typeof GENZ.emit ===
      'function'
    ) {

      GENZ.emit(
        'auth-logout'
      );

    }

  }


  /* =======================================================
     BIND AUTH EVENTS
     
     TIDAK ADA lagi Supabase listener di app.js.
     
     Supabase listener hanya dimiliki auth.js.
  ======================================================= */

  function bindAuth() {

    if (authBound) {
      return;
    }

    authBound = true;


    /* -----------------------------------------------------
       LOGIN EVENT DARI auth.js
    ----------------------------------------------------- */

    window.addEventListener(
      'genz-auth-login',
      function (event) {

        /*
         * auth.js mengirim:
         *
         * detail: {
         *   user,
         *   session
         * }
         */

        const detail =
          event?.detail || {};


        const user =
          detail?.user ||
          (
            detail?.email ||
            detail?.id
              ? detail
              : GENZ.state.user
          );


        if (!user) {
          return;
        }


        handleLogin(
          user,
          false
        ).catch(
          authError => {

            error(
              'Login handler error:',
              authError
            );

          }
        );

      }
    );


    /* -----------------------------------------------------
       LOGOUT EVENT DARI auth.js
    ----------------------------------------------------- */

    window.addEventListener(
      'genz-auth-logout',
      function () {

        handleLogout(
          false
        ).catch(
          authError => {

            error(
              'Logout handler error:',
              authError
            );

          }
        );

      }
    );

  }


  /* =======================================================
     SHOW STUDIO
  ======================================================= */

  function showStudio() {

    const main =
      $('main-container');

    const pages =
      $('pageContent');


    if (pages) {

      pages.classList.add(
        'hidden'
      );

    }


    if (main) {

      main.classList.remove(
        'hidden'
      );

    }


    GENZ.state.currentPage =
      'studio';


    const back =
      $('backToStudio');

    if (back) {

      back.classList.add(
        'hidden'
      );

    }

  }


  /* =======================================================
     SHOW PAGE
  ======================================================= */

  async function showPage(
    page
  ) {

    const main =
      $('main-container');

    const pages =
      $('pageContent');


    if (!pages) {
      return;
    }


    if (main) {

      main.classList.add(
        'hidden'
      );

    }


    pages.classList.remove(
      'hidden'
    );


    GENZ.state.currentPage =
      page;


    const back =
      $('backToStudio');

    if (back) {

      back.classList.remove(
        'hidden'
      );

    }


    switch (page) {

      case 'profile':

        if (
          GENZ.profile &&
          typeof GENZ.profile.load ===
          'function'
        ) {

          await GENZ.profile.load();

        }

        break;


      case 'credit':

        if (
          GENZ.credit &&
          typeof GENZ.credit.load ===
          'function'
        ) {

          await GENZ.credit.load();

        }

        break;


      case 'topup':

        if (
          GENZ.topup &&
          typeof GENZ.topup.load ===
          'function'
        ) {

          await GENZ.topup.load();

        }

        break;


      case 'admin':

        if (
          GENZ.admin &&
          typeof GENZ.admin.load ===
          'function'
        ) {

          await GENZ.admin.load();

        }

        break;


      case 'contact':

        showContactAdmin();

        break;


      default:

        showStudio();

        break;

    }

  }


  /* =======================================================
     CONTACT ADMIN
  ======================================================= */

  function showContactAdmin() {

    const pages =
      $('pageContent');

    if (!pages) {
      return;
    }


    pages.innerHTML = `

      <section class="page-card">

        <div class="page-header">

          <button
            type="button"
            class="back-btn"
            id="contactBack">
            ←
          </button>

          <div>

            <h2>
              Chat Admin
            </h2>

            <p>
              Hubungi administrator GEN-Z.AI
            </p>

          </div>

        </div>


        <div class="contact-admin">

          <p>
            Silakan hubungi admin untuk
            bantuan akun, kredit, atau
            kendala penggunaan GEN-Z.AI.
          </p>

        </div>

      </section>

    `;


    const back =
      $('contactBack');

    if (back) {

      back.addEventListener(
        'click',
        showStudio
      );

    }

  }


  /* =======================================================
     ACCOUNT NAVIGATION
  ======================================================= */

  function bindNavigation() {


    /* -----------------------------------------------------
       ACCOUNT MENU
    ----------------------------------------------------- */

    document.addEventListener(
      'click',
      function (event) {

        const button =
          event.target.closest(
            '[data-page]'
          );


        if (!button) {
          return;
        }


        const page =
          button.dataset.page;


        if (!page) {
          return;
        }


        event.preventDefault();


        showPage(
          page
        ).catch(
          pageError => {

            error(
              'Page loading error:',
              pageError
            );

          }
        );

      }
    );


    /* -----------------------------------------------------
       DATA BACK STUDIO
    ----------------------------------------------------- */

    document.addEventListener(
      'click',
      function (event) {

        const button =
          event.target.closest(
            '[data-back-studio]'
          );


        if (!button) {
          return;
        }


        event.preventDefault();

        showStudio();

      }
    );


    /* -----------------------------------------------------
       HEADER BACK BUTTON
    ----------------------------------------------------- */

    document.addEventListener(
      'click',
      function (event) {

        const button =
          event.target.closest(
            '#backToStudio'
          );


        if (!button) {
          return;
        }


        event.preventDefault();

        showStudio();

      }
    );


    /* -----------------------------------------------------
       EVENT BUS
    ----------------------------------------------------- */

    if (
      typeof GENZ.on ===
      'function'
    ) {

      GENZ.on(
        'show-studio',
        showStudio
      );


      GENZ.on(
        'show-page',
        function (page) {

          showPage(
            page
          ).catch(
            pageError => {

              error(
                'show-page error:',
                pageError
              );

            }
          );

        }
      );

    }

  }


  /* =======================================================
     START APPLICATION
  ======================================================= */

  async function start() {

    if (started) {
      return;
    }


    log(
      'APPLICATION START'
    );


    try {

      /*
       * Bind event terlebih dahulu.
       */

      bindNavigation();

      bindAuth();


      /*
       * Load seluruh component.
       */

      await loadComponents();


      /*
       * Sinkronisasi session.
       */

      await syncAuth();


      started = true;

      GENZ.state.initialized =
        true;


      log(
        'APPLICATION READY'
      );


    } catch (startupError) {

      GENZ.state.initialized =
        false;


      error(
        'APPLICATION START ERROR:',
        startupError
      );


      const app =
        $('app');


      if (app) {

        const errorMessage =
          startupError?.message ||
          'Unknown error';


        const safeMessage =
          typeof GENZ.escapeHtml ===
          'function'
            ? GENZ.escapeHtml(
                errorMessage
              )
            : errorMessage;


        app.innerHTML = `

          <section
            class="page-card">

            <h2>
              GEN-Z.AI
            </h2>

            <p>
              Aplikasi gagal dimuat.
            </p>

            <small>
              ${safeMessage}
            </small>

          </section>

        `;

      }

    }

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.start =
    start;


  GENZ.showStudio =
    showStudio;


  GENZ.showPage =
    showPage;


  /* =======================================================
     DOM READY
  ======================================================= */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      function () {

        start().catch(
          startupError => {

            error(
              'Unhandled startup error:',
              startupError
            );

          }
        );

      },
      {
        once: true
      }
    );

  } else {

    start().catch(
      startupError => {

        error(
          'Unhandled startup error:',
          startupError
        );

      }
    );

  }


})();
