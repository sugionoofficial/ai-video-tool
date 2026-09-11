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
     UPDATE MENU ROLE
  ======================================================= */

  function updateMenuVisibility(isAdmin) {

    const adminMenu =
      getElement("adminMenu");

    const topupSetting =
      getElement("topupSettingMenu");

    const contactAdmin =
      getElement("contactAdmin");

    const membership =
      getElement("membershipMenu");

    const roleElement =
      getElement("accountMenuRole");


    const adminState =
      isAdmin === true;


    /*
     * ADMIN
     */

    if (adminState) {

      if (adminMenu) {

        adminMenu.classList.remove(
          "hidden"
        );

        adminMenu.style.setProperty(
          "display",
          "block",
          "important"
        );

      }


      if (topupSetting) {

        topupSetting.classList.remove(
          "hidden"
        );

        topupSetting.style.setProperty(
          "display",
          "block",
          "important"
        );

      }


      /*
       * Admin tidak melihat Hub Admin
       */

      if (contactAdmin) {

        contactAdmin.classList.add(
          "hidden"
        );

        contactAdmin.style.setProperty(
          "display",
          "none",
          "important"
        );

      }


      /*
       * Admin tidak melihat Membership
       */

      if (membership) {

        membership.classList.add(
          "hidden"
        );

        membership.style.setProperty(
          "display",
          "none",
          "important"
        );

      }


      if (roleElement) {

        roleElement.textContent =
          "ADMIN / OWNER";

      }

    }

    /*
     * USER BIASA
     */

    else {

      /*
       * Admin Panel disembunyikan
       */

      if (adminMenu) {

        adminMenu.classList.add(
          "hidden"
        );

        adminMenu.style.setProperty(
          "display",
          "none",
          "important"
        );

      }


      /*
       * Top up Setting disembunyikan
       */

      if (topupSetting) {

        topupSetting.classList.add(
          "hidden"
        );

        topupSetting.style.setProperty(
          "display",
          "none",
          "important"
        );

      }


      /*
       * Hub Admin tampil
       */

      if (contactAdmin) {

        contactAdmin.classList.remove(
          "hidden"
        );

        contactAdmin.style.setProperty(
          "display",
          "block",
          "important"
        );

      }


      /*
       * Membership tampil
       */

      if (membership) {

        membership.classList.remove(
          "hidden"
        );

        membership.style.setProperty(
          "display",
          "block",
          "important"
        );

      }


      if (roleElement) {

        roleElement.textContent =
          "USER";

      }

    }

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


    button.classList.remove(
      "hidden"
    );

    button.removeAttribute(
      "hidden"
    );


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


    /*
     * Terapkan role terakhir yang diketahui.
     */

    const currentAccount =
      GENZ.state.account || {};


    updateMenuVisibility(
      currentAccount.isAdmin === true &&
      currentAccount.roleValidated === true
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
  ======================================================= */

  function updateRole(isAdmin) {

    const adminState =
      isAdmin === true;


    GENZ.state.account =
      GENZ.state.account || {};


    GENZ.state.account.isAdmin =
      adminState;


    updateMenuVisibility(
      adminState &&
      GENZ.state.account.roleValidated === true
    );

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


    updateMenuVisibility(false);

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


      /*
       * Simpan data account
       */

      GENZ.state.account =
        data;


      /*
       * Credit
       */

      updateCredits(
        data.credits ??
        data.balance ??
        0
      );


      /*
       * Server adalah sumber kebenaran.
       *
       * Hanya data.isAdmin === true
       * yang boleh dianggap admin.
       */

      const serverIsAdmin =
        data.isAdmin === true;


      GENZ.state.account.isAdmin =
        serverIsAdmin;


      /*
       * Tandai role sudah divalidasi
       * setelah response server berhasil.
       */

      GENZ.state.account.roleValidated =
        true;


      /*
       * Terapkan menu.
       */

      updateMenuVisibility(
        serverIsAdmin
      );


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

        /*
         * ACCOUNT BUTTON
         */

        const button =
          event.target.closest(
            "#accountBtn"
          );


        if (button) {

          event.preventDefault();

          toggleMenu();

          return;

        }


        /*
         * PAGE BUTTON
         */

        const pageButton =
          event.target.closest(
            "[data-page]"
          );


        if (pageButton) {

          const page =
            pageButton.dataset.page;


          /*
           * ADMIN PAGE
           *
           * Frontend guard.
           * Backend tetap otoritas utama.
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


          /*
           * TOP UP SETTING
           *
           * Hanya admin.
           */

          if (
            page === "topup-settings" &&
            !hasAdminAccess()
          ) {

            closeMenu();

            console.warn(
              "[ACCOUNT] Top up Setting access denied"
            );

            return;

          }


          /*
           * Membership dan Hub Admin
           * hanya tersedia pada menu user.
           */

          if (
            (
              page === "membership" ||
              page === "contact"
            ) &&
            hasAdminAccess()
          ) {

            closeMenu();

            console.warn(
              "[ACCOUNT] User-only page access denied"
            );

            return;

          }


          navigate(page);

          return;

        }


        /*
         * CLICK DI LUAR MENU
         */

        if (
          !event.target.closest(
            "#accountMenu"
          )
        ) {

          closeMenu();

        }

      }
    );


    /*
     * AUTH LOGIN
     */

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


      /*
       * AUTH LOGOUT
       */

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


          updateMenuVisibility(
            false
          );


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
