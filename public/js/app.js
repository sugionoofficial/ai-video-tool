(function () {
  'use strict';

  const GENZ = window.GENZ || (window.GENZ = {});

  let started = false;
  let authComponentLoaded = false;
  let studioLoading = null;
  let navigationBound = false;

  function $(id) {
    return document.getElementById(id);
  }

  function log() {
    console.log.apply(
      console,
      ['[GEN-Z.AI]'].concat(Array.from(arguments))
    );
  }

  function error() {
    console.error.apply(
      console,
      ['[GEN-Z.AI]'].concat(Array.from(arguments))
    );
  }

  function isLoggedIn() {
    return !!(
      GENZ.state &&
      GENZ.state.loggedIn === true &&
      GENZ.state.user
    );
  }

  function isAdmin() {
    return !!(
      GENZ.state &&
      GENZ.state.account &&
      GENZ.state.account.isAdmin === true &&
      GENZ.state.account.roleValidated === true
    );
  }

  function escapeHtml(value) {
    if (typeof GENZ.escapeHtml === 'function') {
      return GENZ.escapeHtml(value);
    }

    const div = document.createElement('div');

    div.textContent =
      value == null
        ? ''
        : String(value);

    return div.innerHTML;
  }

  function createShell() {
    const app = $('app');

    if (!app) {
      error(
        'Element #app tidak ditemukan.'
      );

      return null;
    }

    app.innerHTML =
      '<div id="auth-container">' +

        '<section id="auth" class="auth-page">' +

          '<div class="auth-card">' +

            '<div class="auth-header">' +

              '<div class="auth-logo">' +
                'GEN-Z.AI' +
              '</div>' +

              '<h1>' +
                'Selamat Datang' +
              '</h1>' +

              '<p>' +
                'Login untuk menggunakan GEN-Z.AI' +
              '</p>' +

            '</div>' +

            '<form id="authForm">' +

              '<div class="form-group">' +

                '<label for="email">' +
                  'Email' +
                '</label>' +

                '<input' +
                  ' id="email"' +
                  ' name="email"' +
                  ' type="email"' +
                  ' placeholder="Masukkan email"' +
                  ' autocomplete="email"' +
                  ' required>' +

              '</div>' +

              '<div class="form-group">' +

                '<label for="password">' +
                  'Password' +
                '</label>' +

                '<input' +
                  ' id="password"' +
                  ' name="password"' +
                  ' type="password"' +
                  ' placeholder="Masukkan password"' +
                  ' autocomplete="current-password"' +
                  ' required>' +

              '</div>' +

              '<div' +
                ' id="authMsg"' +
                ' class="auth-message"' +
                ' aria-live="polite">' +
              '</div>' +

              '<button' +
                ' id="login"' +
                ' type="submit"' +
                ' class="auth-primary-btn">' +
                'LOGIN' +
              '</button>' +

              '<div class="auth-actions">' +

                '<button' +
                  ' id="register"' +
                  ' type="button"' +
                  ' class="auth-secondary-btn">' +
                  'DAFTAR' +
                '</button>' +

                '<button' +
                  ' id="forgotPassword"' +
                  ' type="button"' +
                  ' class="auth-link-btn">' +
                  'LUPA PASSWORD?' +
                '</button>' +

              '</div>' +

            '</form>' +

          '</div>' +

        '</section>' +

      '</div>' +

      '<div id="application-container" class="hidden">' +

        '<div id="header-container"></div>' +

        '<main id="main-container"></main>' +

        '<div' +
          ' id="pageContent"' +
          ' class="hidden">' +
        '</div>' +

      '</div>';

    return app;
  }

  async function loadAuthComponent() {
    if (authComponentLoaded) {
      return;
    }

    const container =
      $('auth-container');

    if (!container) {
      return;
    }

    if (
      typeof GENZ.loadComponent !==
      'function'
    ) {
      error(
        'GENZ.loadComponent tidak tersedia.'
      );

      return;
    }

    try {
      await GENZ.loadComponent(
        container,
        '/components/auth.html'
      );

      authComponentLoaded = true;

      log(
        'auth.html berhasil dimuat.'
      );

    } catch (err) {

      error(
        'auth.html gagal dimuat:',
        err
      );

      /*
       * Jangan kosongkan form fallback.
       * Form login yang dibuat oleh
       * createShell() tetap dipertahankan.
       */
    }
  }

  async function loadStudioComponents() {
    if (studioLoading) {
      return studioLoading;
    }

    if (
      $('header-container') &&
      $('main-container') &&
      $('header-container').children.length > 0 &&
      $('main-container').children.length > 0
    ) {
      return;
    }

    studioLoading =
      (async function () {

        const header =
          $('header-container');

        const main =
          $('main-container');

        if (!header || !main) {
          throw new Error(
            'Container studio tidak ditemukan.'
          );
        }

        if (
          typeof GENZ.loadComponent !==
          'function'
        ) {
          throw new Error(
            'GENZ.loadComponent tidak tersedia.'
          );
        }

        try {

          await GENZ.loadComponent(
            header,
            '/components/header.html'
          );

        } catch (err) {

          error(
            'Header gagal dimuat:',
            err
          );
        }

        try {

          await GENZ.loadComponent(
            main,
            '/components/generator.html'
          );

        } catch (err) {

          error(
            'Generator gagal dimuat:',
            err
          );

          main.innerHTML =
            '<section class="page-card">' +

              '<h2>' +
                'GEN-Z.AI' +
              '</h2>' +

              '<p>' +
                'Generator sedang dimuat.' +
              '</p>' +

            '</section>';
        }

        if (
          GENZ.account &&
          typeof GENZ.account.init ===
          'function'
        ) {

          try {

            await GENZ.account.init();

          } catch (err) {

            error(
              'Account init gagal:',
              err
            );
          }
        }

        if (
          GENZ.account &&
          typeof GENZ.account.updateUser ===
          'function' &&
          GENZ.state.user
        ) {

          try {

            GENZ.account.updateUser(
              GENZ.state.user
            );

          } catch (err) {

            error(
              'Account update gagal:',
              err
            );
          }
        }

        if (
          GENZ.upload &&
          typeof GENZ.upload.init ===
          'function'
        ) {

          try {

            GENZ.upload.init();

          } catch (err) {

            error(
              'Upload init gagal:',
              err
            );
          }
        }

        if (
          GENZ.generator &&
          typeof GENZ.generator.init ===
          'function'
        ) {

          try {

            GENZ.generator.init();

          } catch (err) {

            error(
              'Generator init gagal:',
              err
            );
          }
        }

        if (
          GENZ.providers &&
          typeof GENZ.providers.load ===
          'function'
        ) {

          GENZ.providers.load()
            .catch(function (err) {

              error(
                'Provider loading gagal:',
                err
              );

            });
        }

      })();

    try {

      await studioLoading;

    } finally {

      studioLoading = null;
    }
  }

  function showLogin() {

    const authContainer =
      $('auth-container');

    const application =
      $('application-container');

    const auth =
      $('auth');

    if (application) {

      application.classList.add(
        'hidden'
      );

      application.style.display =
        'none';
    }

    if (authContainer) {

      authContainer.classList.remove(
        'hidden'
      );

      authContainer.style.display =
        '';
    }

    if (auth) {

      auth.classList.remove(
        'hidden'
      );

      auth.style.display =
        '';
    }
  }

  function showStudio() {

    const authContainer =
      $('auth-container');

    const application =
      $('application-container');

    const auth =
      $('auth');

    const main =
      $('main-container');

    const pages =
      $('pageContent');

    if (authContainer) {

      authContainer.classList.add(
        'hidden'
      );

      authContainer.style.display =
        'none';
    }

    if (auth) {

      auth.classList.add(
        'hidden'
      );

      auth.style.display =
        'none';
    }

    if (application) {

      application.classList.remove(
        'hidden'
      );

      application.style.display =
        '';
    }

    if (main) {

      main.classList.remove(
        'hidden'
      );
    }

    if (pages) {

      pages.classList.add(
        'hidden'
      );
    }

    if (GENZ.state) {

      GENZ.state.currentPage =
        'studio';
    }
  }

  async function handleLogin(user) {

    if (!user) {
      return;
    }

    GENZ.state.loggedIn =
      true;

    GENZ.state.user =
      user;

    if (!GENZ.state.account) {

      GENZ.state.account = {};
    }

    showStudio();

    loadStudioComponents()
      .catch(function (err) {

        error(
          'Studio loading error:',
          err
        );

      });
  }

  function handleLogout() {

    if (GENZ.state) {

      GENZ.state.loggedIn =
        false;

      GENZ.state.user =
        null;

      GENZ.state.account = {
        isAdmin: false,
        roleValidated: false
      };

      GENZ.state.currentPage =
        'studio';
    }

    showLogin();
  }

  function showPageUnavailable(
    title,
    message
  ) {

    const pages =
      $('pageContent');

    if (!pages) {
      return;
    }

    pages.innerHTML =
      '<section class="page-card">' +

        '<div class="page-header">' +

          '<button' +
            ' type="button"' +
            ' class="back-btn"' +
            ' id="pageBackButton">' +
            '←' +
          '</button>' +

          '<div>' +

            '<h2>' +
              escapeHtml(title) +
            '</h2>' +

            '<p>' +
              escapeHtml(message) +
            '</p>' +

          '</div>' +

        '</div>' +

      '</section>';

    const back =
      $('pageBackButton');

    if (back) {

      back.addEventListener(
        'click',
        showStudio,
        { once: true }
      );
    }
  }

  async function showPage(page) {

    if (!isLoggedIn()) {

      showLogin();

      return;
    }

    if (
      !page ||
      page === 'studio'
    ) {

      showStudio();

      return;
    }

    await loadStudioComponents();

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

    if (GENZ.state) {

      GENZ.state.currentPage =
        page;
    }

    switch (page) {

      case 'credit':

        if (
          GENZ.credit &&
          typeof GENZ.credit.load ===
          'function'
        ) {

          try {

            await GENZ.credit.load();

          } catch (err) {

            error(
              'Credit error:',
              err
            );

            showPageUnavailable(
              'Credit',
              'Halaman Credit tidak dapat dimuat.'
            );
          }

        } else {

          showPageUnavailable(
            'Credit',
            'Module Credit belum tersedia.'
          );
        }

        break;

      case 'profile':

        if (
          GENZ.profile &&
          typeof GENZ.profile.load ===
          'function'
        ) {

          try {

            await GENZ.profile.load();

          } catch (err) {

            error(
              'Profile error:',
              err
            );

            showPageUnavailable(
              'Riwayat Video',
              'Riwayat video tidak dapat dimuat.'
            );
          }

        } else {

          showPageUnavailable(
            'Riwayat Video',
            'Module riwayat belum tersedia.'
          );
        }

        break;

      case 'dashboard':

        if (
          GENZ.dashboard &&
          typeof GENZ.dashboard.load ===
          'function'
        ) {

          try {

            await GENZ.dashboard.load();

          } catch (err) {

            error(
              'Dashboard error:',
              err
            );

            showPageUnavailable(
              'Dashboard',
              'Dashboard tidak dapat dimuat.'
            );
          }

        } else {

          showPageUnavailable(
            'Dashboard',
            'Module Dashboard belum tersedia.'
          );
        }

        break;

      case 'topup':

        await showPage(
          'credit'
        );

        break;

      case 'affiliate':

        showPageUnavailable(
          'Affiliate',
          'Halaman Affiliate sedang disiapkan.'
        );

        break;

      case 'membership':

        if (isAdmin()) {

          showPageUnavailable(
            'Membership',
            'Menu Membership tidak tersedia untuk Admin / Owner.'
          );

        } else {

          showPageUnavailable(
            'Membership',
            'Halaman Membership sedang disiapkan.'
          );
        }

        break;

      case 'contact':

        showPageUnavailable(
          'Hubungi Admin',
          'Silakan hubungi Admin untuk bantuan.'
        );

        break;

      case 'admin':

        if (!isAdmin()) {

          showPageUnavailable(
            'Akses Ditolak',
            'Panel Admin hanya dapat diakses oleh Admin / Owner.'
          );

          return;
        }

        window.location.href =
          '/admin.html';

        break;

      case 'topup-settings':

        if (!isAdmin()) {

          showPageUnavailable(
            'Akses Ditolak',
            'Top Up Setting hanya untuk Admin / Owner.'
          );

          return;
        }

        if (
          GENZ.topupSettings &&
          typeof GENZ.topupSettings.load ===
          'function'
        ) {

          try {

            await GENZ.topupSettings.load();

          } catch (err) {

            error(
              'Topup settings error:',
              err
            );

            showPageUnavailable(
              'Top Up Setting',
              'Top Up Setting tidak dapat dimuat.'
            );
          }

        } else {

          showPageUnavailable(
            'Top Up Setting',
            'Module Top Up Setting belum tersedia.'
          );
        }

        break;

      default:

        showStudio();
    }
  }

  function bindNavigation() {

    if (navigationBound) {
      return;
    }

    navigationBound =
      true;

    document.addEventListener(
      'click',
      function (event) {

        const target =
          event.target &&
          event.target.closest
            ? event.target.closest(
                '[data-page]'
              )
            : null;

        if (!target) {
          return;
        }

        const page =
          target.getAttribute(
            'data-page'
          );

        if (!page) {
          return;
        }

        event.preventDefault();

        showPage(page)
          .catch(function (err) {

            error(
              'Navigation error:',
              err
            );

          });
      }
    );
  }

  function bindAuthEvents() {

    window.addEventListener(
      'genz-auth-login',
      function (event) {

        const detail =
          event && event.detail
            ? event.detail
            : {};

        const user =
          detail.user ||
          detail;

        handleLogin(user);
      }
    );

    window.addEventListener(
      'genz-auth-logout',
      function () {

        handleLogout();
      }
    );
  }

  async function syncExistingSession() {

    try {

      if (
        window.GENZ_AUTH &&
        typeof window.GENZ_AUTH.getSession ===
        'function'
      ) {

        const session =
          await window.GENZ_AUTH.getSession();

        if (
          session &&
          session.user
        ) {

          await handleLogin(
            session.user
          );

          return;
        }

        handleLogout();

        return;
      }

      handleLogout();

    } catch (err) {

      error(
        'Session sync gagal:',
        err
      );

      showLogin();
    }
  }

  async function start() {

    if (started) {
      return;
    }

    started =
      true;

    if (!GENZ.state) {

      GENZ.state = {
        initialized: false,
        loggedIn: false,
        user: null,
        account: null,
        providers: [],
        currentPage: 'studio',
        imageData: null,
        provider: null,
        poll: null,
        currentVideoObjectUrl: null
      };
    }

    /*
     * UI login dibuat terlebih dahulu.
     * Tidak menunggu API atau component.
     */
    createShell();

    bindAuthEvents();

    bindNavigation();

    GENZ.state.initialized =
      true;

    /*
     * auth.html hanya enhancement.
     * Jika gagal, form fallback tetap ada.
     */
    loadAuthComponent()
      .catch(function (err) {

        error(
          'Auth component error:',
          err
        );

      });

    /*
     * Session dicek setelah UI tampil.
     */
    syncExistingSession()
      .catch(function (err) {

        error(
          'Initial session error:',
          err
        );

        showLogin();

      });

    log(
      'APPLICATION READY'
    );
  }

  window.GENZ_APP = {
    start: start,
    showStudio: showStudio,
    showLogin: showLogin,
    showPage: showPage
  };

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );

  } else {

    start();
  }

})();
