/* =========================================================
   GEN-Z.AI APPLICATION CONTROLLER
========================================================= */

(function () {

  'use strict';

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  /* -------------------------------------------------------
     LOAD MAIN COMPONENTS
  ------------------------------------------------------- */

  async function loadComponents() {

    const app =
      document.getElementById(
        'app'
      );

    if (!app) {

      throw new Error(
        'Element #app tidak ditemukan'
      );

    }


    app.innerHTML = `

      <div id="header-container"></div>

      <main id="main-container"></main>

    `;


    /*
     * Header
     */

    await GENZ.loadComponent(
      '#header-container',
      '/components/header.html'
    );


    /*
     * Account
     */

    await GENZ.account.init();

  }


  /* -------------------------------------------------------
     AUTH STATE
  ------------------------------------------------------- */

  async function syncAuth() {

    const client =
      window.GENZ_AUTH_CLIENT;

    if (!client) {

      console.warn(
        '[GEN-Z.AI] Auth client belum tersedia'
      );

      return;

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


        GENZ.emit(
          'auth-login',
          session.user
        );

      } else {

        GENZ.state.loggedIn =
          false;

        GENZ.emit(
          'auth-logout'
        );

      }

    } catch (error) {

      console.error(
        '[GEN-Z.AI] Auth sync error',
        error
      );

    }

  }


  /* -------------------------------------------------------
     AUTH EVENTS
  ------------------------------------------------------- */

  function bindAuth() {

    window.addEventListener(
      'genz-auth-login',
      function (event) {

        const user =
          event?.detail ||
          GENZ.state.user;


        GENZ.state.loggedIn =
          true;

        GENZ.state.user =
          user;


        GENZ.emit(
          'auth-login',
          user
        );

      }
    );


    window.addEventListener(
      'genz-auth-logout',
      function () {

        GENZ.state.loggedIn =
          false;

        GENZ.state.user =
          null;


        GENZ.emit(
          'auth-logout'
        );

      }
    );

  }


  /* -------------------------------------------------------
     START
  ------------------------------------------------------- */

  async function start() {

    if (
      GENZ.state.initialized
    ) {
      return;
    }


    GENZ.state.initialized =
      true;


    console.log(
      '[GEN-Z.AI] APPLICATION START'
    );


    bindAuth();


    await loadComponents();


    await syncAuth();


    console.log(
      '[GEN-Z.AI] APPLICATION READY'
    );

  }


  /* -------------------------------------------------------
     PUBLIC API
  ------------------------------------------------------- */

  GENZ.start =
    start;


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      start
    );

  } else {

    start();

  }


})();
