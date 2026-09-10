/* =========================================================
   GEN-Z.AI ACCOUNT MODULE
========================================================= */

(function () {

  'use strict';

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  GENZ.account =
    GENZ.account || {

      initialized: false,

      menuOpen: false

    };


  /* -------------------------------------------------------
     ENSURE ACCOUNT UI
  ------------------------------------------------------- */

  async function ensureUI() {

    const container =
      document.getElementById(
        'account-container'
      );

    if (!container) {

      console.warn(
        '[ACCOUNT] account-container belum tersedia'
      );

      return false;

    }


    let button =
      document.getElementById(
        'accountBtn'
      );

    let menu =
      document.getElementById(
        'accountMenu'
      );


    /*
     * Kalau component account belum dimuat,
     * muat secara otomatis.
     */

    if (!button || !menu) {

      try {

        await GENZ.loadComponent(
          container,
          '/components/account.html'
        );

      } catch (error) {

        console.error(
          '[ACCOUNT] Gagal memuat account component',
          error
        );

        return false;

      }

    }


    button =
      document.getElementById(
        'accountBtn'
      );


    menu =
      document.getElementById(
        'accountMenu'
      );


    if (!button) {

      console.error(
        '[ACCOUNT] accountBtn tidak ditemukan'
      );

      return false;

    }


    /*
     * Paksa tombol terlihat.
     * Tidak bergantung pada .hidden.
     */

    button.classList.remove(
      'hidden'
    );

    button.removeAttribute(
      'hidden'
    );

    button.style.setProperty(
      'display',
      'flex',
      'important'
    );

    button.style.setProperty(
      'visibility',
      'visible',
      'important'
    );

    button.style.setProperty(
      'opacity',
      '1',
      'important'
    );


    return true;

  }


  /* -------------------------------------------------------
     OPEN MENU
  ------------------------------------------------------- */

  function openMenu() {

    const menu =
      document.getElementById(
        'accountMenu'
      );

    if (!menu) return;

    menu.classList.remove(
      'hidden'
    );

    GENZ.account.menuOpen =
      true;

  }


  /* -------------------------------------------------------
     CLOSE MENU
  ------------------------------------------------------- */

  function closeMenu() {

    const menu =
      document.getElementById(
        'accountMenu'
      );

    if (!menu) return;

    menu.classList.add(
      'hidden'
    );

    GENZ.account.menuOpen =
      false;

  }


  /* -------------------------------------------------------
     TOGGLE
  ------------------------------------------------------- */

  function toggleMenu() {

    if (
      GENZ.account.menuOpen
    ) {

      closeMenu();

    } else {

      openMenu();

    }

  }


  /* -------------------------------------------------------
     UPDATE USER
  ------------------------------------------------------- */

  function updateUser(
    user
  ) {

    if (!user) return;

    GENZ.state.user =
      user;

    const email =
      user.email ||
      'User';


    const emailElement =
      document.getElementById(
        'userEmail'
      );

    const menuEmail =
      document.getElementById(
        'menuEmail'
      );


    if (emailElement) {

      emailElement.textContent =
        email;

    }


    if (menuEmail) {

      menuEmail.textContent =
        email;

    }

  }


  /* -------------------------------------------------------
     UPDATE CREDIT
  ------------------------------------------------------- */

  function updateCredits(
    amount
  ) {

    const element =
      document.getElementById(
        'credits'
      );

    if (!element) return;

    const value =
      Number(amount || 0);

    element.textContent =
      `${value} credit`;

  }


  /* -------------------------------------------------------
     UPDATE ROLE
  ------------------------------------------------------- */

  function updateRole(
    isAdmin
  ) {

    const admin =
      document.getElementById(
        'adminPanel'
      );

    const contact =
      document.getElementById(
        'contactAdmin'
      );


    if (isAdmin) {

      if (admin) {

        admin.classList.remove(
          'hidden'
        );

      }

      if (contact) {

        contact.classList.add(
          'hidden'
        );

      }

    } else {

      if (admin) {

        admin.classList.add(
          'hidden'
        );

      }

      if (contact) {

        contact.classList.remove(
          'hidden'
        );

      }

    }

  }


  /* -------------------------------------------------------
     ACCOUNT API
  ------------------------------------------------------- */

  async function refresh() {

    if (!GENZ.state.loggedIn) {
      return;
    }


    await ensureUI();


    try {

      const response =
        await fetch(
          '/api/account/credits',
          {
            credentials: 'include'
          }
        );


      if (!response.ok) {

        console.warn(
          '[ACCOUNT] credits request:',
          response.status
        );

        return;

      }


      const data =
        await response.json();


      if (
        data &&
        data.success !== false
      ) {

        GENZ.state.account =
          data;


        updateCredits(
          data.credits ??
          data.balance ??
          0
        );


        updateRole(
          Boolean(
            data.isAdmin
          )
        );

      }

    } catch (error) {

      console.error(
        '[ACCOUNT] refresh error',
        error
      );

    }


    /*
     * Pengaman terakhir.
     */

    await ensureUI();

  }


  /* -------------------------------------------------------
     PAGE NAVIGATION
  ------------------------------------------------------- */

  function navigate(
    page
  ) {

    closeMenu();

    GENZ.state.currentPage =
      page;

    GENZ.emit(
      'page-change',
      page
    );

  }


  /* -------------------------------------------------------
     EVENTS
  ------------------------------------------------------- */

  function bindEvents() {

    if (
      GENZ.account.initialized
    ) {
      return;
    }


    GENZ.account.initialized =
      true;


    document.addEventListener(
      'click',
      function (event) {

        const button =
          event.target.closest(
            '#accountBtn'
          );

        if (button) {

          event.preventDefault();

          toggleMenu();

          return;

        }


        const pageButton =
          event.target.closest(
            '[data-page]'
          );

        if (pageButton) {

          navigate(
            pageButton.dataset.page
          );

          return;

        }


        if (
          !event.target.closest(
            '#accountMenu'
          )
        ) {

          closeMenu();

        }

      }
    );


    GENZ.on(
      'auth-login',
      async function (user) {

        GENZ.state.loggedIn =
          true;

        updateUser(user);

        await ensureUI();

        await refresh();

      }
    );


    GENZ.on(
      'auth-logout',
      function () {

        GENZ.state.loggedIn =
          false;

        GENZ.state.user =
          null;

        closeMenu();

      }
    );

  }


  /* -------------------------------------------------------
     INIT
  ------------------------------------------------------- */

  async function init() {

    await ensureUI();

    bindEvents();

    console.log(
      '[GEN-Z.AI] ACCOUNT READY'
    );

  }


  /* -------------------------------------------------------
     PUBLIC API
  ------------------------------------------------------- */

  GENZ.account.init =
    init;

  GENZ.account.refresh =
    refresh;

  GENZ.account.ensureUI =
    ensureUI;

  GENZ.account.open =
    openMenu;

  GENZ.account.close =
    closeMenu;

  GENZ.account.updateUser =
    updateUser;

  GENZ.account.updateCredits =
    updateCredits;

  GENZ.account.updateRole =
    updateRole;


})();
