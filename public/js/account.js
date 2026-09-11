/* =========================================================
   GEN-Z.AI ACCOUNT MODULE
   ========================================================= */

(function () {

  "use strict";

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  /* =======================================================
     STATE
  ======================================================= */

  GENZ.account =
    GENZ.account || {

      initialized: false,

      menuOpen: false

    };


  /* =======================================================
     HELPERS
  ======================================================= */

  function getElement(id) {

    return document.getElementById(id);

  }


  function setExpanded(expanded) {

    const button =
      getElement("accountBtn");

    if (!button) {
      return;
    }

    button.setAttribute(
      "aria-expanded",
      expanded ? "true" : "false"
    );

  }


  /* =======================================================
     ENSURE ACCOUNT UI
  ======================================================= */

  async function ensureUI() {

    const container =
      getElement("account-container");

    if (!container) {

      console.warn(
        "[ACCOUNT] account-container belum tersedia"
      );

      return false;

    }


    let button =
      getElement("accountBtn");

    let menu =
      getElement("accountMenu");


    if (!button || !menu) {

      try {

        await GENZ.loadComponent(
          container,
          "/components/account.html"
        );

      } catch (error) {

        console.error(
          "[ACCOUNT] Gagal memuat account component",
          error
        );

        return false;

      }

    }


    button =
      getElement("accountBtn");

    menu =
      getElement("accountMenu");


    if (!button) {

      console.error(
        "[ACCOUNT] accountBtn tidak ditemukan"
      );

      return false;

    }


    button.classList.remove("hidden");

    button.removeAttribute("hidden");

    button.style.setProperty(
      "display",
      "flex",
      "important"
    );

    button.style.setProperty(
      "visibility",
      "visible",
      "important"
    );

    button.style.setProperty(
      "opacity",
      "1",
      "important"
    );


    if (menu) {

      menu.classList.toggle(
        "hidden",
        !GENZ.account.menuOpen
      );

    }


    setExpanded(
      GENZ.account.menuOpen
    );


    return true;

  }


  /* =======================================================
     OPEN MENU
  ======================================================= */

  function openMenu() {

    const menu =
      getElement("accountMenu");

    if (!menu) {
      return;
    }


    menu.classList.remove(
      "hidden"
    );


    GENZ.account.menuOpen =
      true;


    setExpanded(true);

  }


  /* =======================================================
     CLOSE MENU
  ======================================================= */

  function closeMenu() {

    const menu =
      getElement("accountMenu");

    if (!menu) {
      return;
    }


    menu.classList.add(
      "hidden"
    );


    GENZ.account.menuOpen =
      false;


    setExpanded(false);

  }


  /* =======================================================
     TOGGLE MENU
  ======================================================= */

  function toggleMenu() {

    if (
      GENZ.account.menuOpen
    ) {

      closeMenu();

    } else {

      openMenu();

    }

  }


  /* =======================================================
     UPDATE USER
  ======================================================= */

  function updateUser(user) {

    if (!user) {
      return;
    }


    GENZ.state.user =
      user;


    const email =
      user.email ||
      "User";


    const emailElement =
      getElement("userEmail");

    const menuEmail =
      getElement("menuEmail");


    if (emailElement) {

      emailElement.textContent =
        email;

    }


    if (menuEmail) {

      menuEmail.textContent =
        email;

    }

  }


  /* =======================================================
     UPDATE CREDIT
  ======================================================= */

  function updateCredits(amount) {

    const element =
      getElement("credits");

    if (!element) {
      return;
    }


    const value =
      Number(amount || 0);


    element.textContent =
      `${value} credit`;

  }


  /* =======================================================
     UPDATE ROLE
     
     Hanya Boolean true dari server
     yang dianggap sebagai admin.
  ======================================================= */

  function updateRole(isAdmin) {

    const admin =
      getElement("adminPanel");

    const contact =
      getElement("contactAdmin");


    const adminState =
      isAdmin === true;


    GENZ.state.account =
      GENZ.state.account || {};


    GENZ.state.account.isAdmin =
      adminState;


    if (adminState) {

      if (admin) {

        admin.classList.remove(
          "hidden"
        );

      }


      if (contact) {

        contact.classList.add(
          "hidden"
        );

      }

    } else {

      if (admin) {

        admin.classList.add(
          "hidden"
        );

      }


      if (contact) {

        contact.classList.remove(
          "hidden"
        );

      }

    }

  }


  /* =======================================================
     INVALIDATE ADMIN
  ======================================================= */

  function invalidateAdmin() {

    GENZ.state.account =
      GENZ.state.account || {};


    GENZ.state.account.isAdmin =
      false;

    GENZ.state.account.roleValidated =
      false;


    const admin =
      getElement("adminPanel");

    const contact =
      getElement("contactAdmin");


    if (admin) {

      admin.classList.add(
        "hidden"
      );

    }


    if (contact) {

      contact.classList.remove(
        "hidden"
      );

    }

  }


  /* =======================================================
     REFRESH ACCOUNT FROM SERVER
  ======================================================= */

  async function refresh() {

    if (
      GENZ.state.loggedIn !== true
    ) {

      return;

    }


    await ensureUI();


    try {

      const response =
        await fetch(
          "/api/account/credits",
          {
            method: "GET",

            credentials: "include",

            headers: {
              "Accept":
                "application/json"
            }

          }
        );


      if (!response.ok) {

        invalidateAdmin();

        console.warn(
          "[ACCOUNT] credits request:",
          response.status
        );

        return;

      }


      const data =
        await response.json();


      if (
        !data ||
        data.success === false
      ) {

        invalidateAdmin();

        return;

      }


      GENZ.state.account =
        data;


      updateCredits(
        data.credits ??
        data.balance ??
        0
      );


      /*
       * Server adalah sumber kebenaran.
       *
       * Hanya:
       *
       * data.isAdmin === true
       *
       * yang boleh membuka Admin.
       */

      updateRole(
        data.isAdmin === true
      );


      GENZ.state.account.roleValidated =
        true;


    } catch (error) {

      invalidateAdmin();


      console.error(
        "[ACCOUNT] refresh error",
        error
      );

    }


    await ensureUI();

  }


  /* =======================================================
     HAS ADMIN ACCESS
     
     Frontend guard saja.
     Backend tetap menjadi otoritas utama.
  ======================================================= */

  function hasAdminAccess() {

    return (
      GENZ.state.account &&
      GENZ.state.account.isAdmin === true &&
      GENZ.state.account.roleValidated === true
    );

  }


  /* =======================================================
     PAGE NAVIGATION
  ======================================================= */

  function navigate(page) {

    closeMenu();


    GENZ.state.currentPage =
      page;


    if (
      typeof GENZ.emit ===
      "function"
    ) {

      GENZ.emit(
        "page-change",
        page
      );

    }

  }


  /* =======================================================
     EVENTS
  ======================================================= */

  function bindEvents() {

    if (
      GENZ.account.initialized
    ) {

      return;

    }


    GENZ.account.initialized =
      true;


    document.addEventListener(
      "click",
      function (event) {

        const button =
          event.target.closest(
            "#accountBtn"
          );


        if (button) {

          event.preventDefault();

          toggleMenu();

          return;

        }


        const pageButton =
          event.target.closest(
            "[data-page]"
          );


        if (pageButton) {

          const page =
            pageButton.dataset.page;


          /*
           * Admin hanya boleh dibuka
           * setelah server memvalidasi
           * isAdmin === true.
           */

          if (
            page === "admin" &&
            !hasAdminAccess()
          ) {

            closeMenu();

            console.warn(
              "[ACCOUNT] Admin access denied"
            );

            return;

          }


          navigate(page);

          return;

        }


        if (
          !event.target.closest(
            "#accountMenu"
          )
        ) {

          closeMenu();

        }

      }
    );


    if (
      typeof GENZ.on ===
      "function"
    ) {

      GENZ.on(
        "auth-login",
        async function (user) {

          GENZ.state.loggedIn =
            true;


          GENZ.state.account = {

            isAdmin: false,

            roleValidated: false

          };


          updateUser(user);

          await ensureUI();

          await refresh();

        }
      );


      GENZ.on(
        "auth-logout",
        function () {

          GENZ.state.loggedIn =
            false;

          GENZ.state.user =
            null;


          GENZ.state.account = {

            isAdmin: false,

            roleValidated: false

          };


          closeMenu();

        }
      );

    }

  }


  /* =======================================================
     INIT
  ======================================================= */

  async function init() {

    await ensureUI();

    bindEvents();


    if (
      GENZ.state.loggedIn === true
    ) {

      await refresh();

    }


    console.log(
      "[GEN-Z.AI] ACCOUNT READY"
    );

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

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

  GENZ.account.hasAdminAccess =
    hasAdminAccess;

  GENZ.account.invalidateAdmin =
    invalidateAdmin;


})();
