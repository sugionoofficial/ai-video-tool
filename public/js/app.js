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
  let authSubscription = null;


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


    /*
     * Main application shell
     */

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


    /* -----------------------------------------------------
       HEADER
    ----------------------------------------------------- */

    if (
      typeof GENZ.loadComponent !==
      'function'
    ) {

      throw new Error(
        'GENZ.loadComponent tidak tersedia. Pastikan core.js dimuat.'
      );

    }


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

      /*
       * Jangan membuat aplikasi berhenti total hanya
       * karena component generator gagal dimuat.
       */

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
     AUTH STATE
  ======================================================= */

  async function syncAuth() {

    const client =
      window.GENZ_AUTH_CLIENT;


    if (!client) {

      console.warn(
        '[GEN-Z.AI] Auth client belum tersedia'
      );

      return false;

    }


    try {

      const result =
        await client.auth.getSession();


      const session =
        result?.data?.session;


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
    emitEvent = true
  ) {

    if (user) {

      GENZ.state.loggedIn =
        true;

      GENZ.state.user =
        user;

    }


    /*
     * Pastikan account UI tersedia.
     */

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


    /*
     * Update email/user pada account menu.
     */

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


    /*
     * Refresh kredit + role dari backend.
     */

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


    /*
     * Provider.
     */

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


    /*
     * Pastikan upload module siap.
     */

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


    /*
     * Generator event.
     */

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


    /*
     * Tampilkan Studio.
     */

    showStudio();


    if (emitEvent) {

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
    emitEvent = true
  ) {

    GENZ.state.loggedIn =
      false;

    GENZ.state.user =
      null;

    GENZ.state.account =
      GENZ.state.account || {};


    /*
     * Hentikan polling video.
     */

    if (
      GENZ.video &&
      typeof GENZ.video.stopPolling ===
      'function'
    ) {

      try {
        GENZ.video.stopPolling();
      } catch (_) {}

    }


    /*
     * Bersihkan video.
     */

    if (
      GENZ.video &&
      typeof GENZ.video.clear ===
      'function'
    ) {

      try {
        GENZ.video.clear();
      } catch (_) {}

    }


    /*
     * Tutup account menu.
     */

    if (
      GENZ.account &&
      typeof GENZ.account.close ===
      'function'
    ) {

      try {
        GENZ.account.close();
      } catch (_) {}

    }


    /*
     * Kembali ke halaman login/auth.
     */

    if (
      GENZ.auth &&
      typeof GENZ.auth.showLoggedOutUI ===
      'function'
    ) {

      try {
        GENZ.auth.showLoggedOutUI();
      } catch (_) {}

    }


    if (emitEvent) {

      GENZ.emit(
        'auth-logout'
      );

    }

  }


  /* =======================================================
     BIND AUTH EVENTS
  ======================================================= */

  function bindAuth() {

    if (authBound) {
      return;
    }

    authBound = true;


    /*
     * Custom login event dari auth.js
     */

    window.addEventListener(
      'genz-auth-login',
      function (event) {

        const user =
          event?.detail ||
          GENZ.state.user;


        handleLogin(
          user,
          true
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


    /*
     * Custom logout event dari auth.js
     */

    window.addEventListener(
      'genz-auth-logout',
      function () {

        handleLogout(
          true
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


    /*
     * Supabase auth listener.
     *
     * Hanya dibuat jika client tersedia.
     */

    const client =
      window.GENZ_AUTH_CLIENT;


    if (
      client &&
      client.auth &&
      typeof client.auth.onAuthStateChange ===
      'function'
    ) {

      try {

        const result =
          client.auth.onAuthStateChange(
            function (
              event,
              session
            ) {

              /*
               * Supaya event awal tidak men-trigger
               * proses login dua kali, state hanya
               * diperbarui di sini.
               */

              if (
                event === 'SIGNED_IN' ||
                event === 'TOKEN_REFRESHED'
              ) {

                if (
                  session &&
                  session.user
                ) {

                  GENZ.state.loggedIn =
                    true;

                  GENZ.state.user =
                    session.user;

                }

              }


              if (
                event === 'SIGNED_OUT'
              ) {

                GENZ.state.loggedIn =
                  false;

                GENZ.state.user =
                  null;

                handleLogout(
                  true
                ).catch(
                  authError => {
                    error(
                      'Supabase logout error:',
                      authError
                    );
                  }
                );

              }

            }
          );


        /*
         * Simpan subscription agar tidak hilang.
         */

        authSubscription =
          result?.data?.subscription ||
          null;

      } catch (listenerError) {

        error(
          'Auth listener error:',
          listenerError
        );

      }

    }

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


    /*
     * Header back button tidak diperlukan
     * pada halaman Studio.
     */

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
            <h2>Chat Admin</h2>

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

    /*
     * Account menu menggunakan data-page.
     */

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


    /*
     * Back to studio.
     */

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


    /*
     * Header back button.
     */

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


    /*
     * Event bus.
     */

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
       * Load HTML components.
       */

      await loadComponents();


      /*
       * Sinkronisasi login.
       */

      await syncAuth();


      started = true;

      GENZ.state.initialized =
        true;


      log(
        'APPLICATION READY'
      );


    } catch (startupError) {

      /*
       * Jangan mengunci initialized=true
       * jika startup gagal.
       */

      GENZ.state.initialized =
        false;


      error(
        'APPLICATION START ERROR:',
        startupError
      );


      const app =
        $('app');

      if (app) {

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
              ${GENZ.escapeHtml
                ? GENZ.escapeHtml(
                    startupError.message ||
                    'Unknown error'
                  )
                : (
                    startupError.message ||
                    'Unknown error'
                  )
              }
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
