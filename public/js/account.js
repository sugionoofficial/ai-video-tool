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
     GET ACCESS TOKEN
  ======================================================= */

  async function getAccessToken() {

    try {

      /*
       * Auth module GEN-Z.AI
       */
      if (
        GENZ.auth &&
        typeof GENZ.auth.token === "function"
      ) {

        const token =
          await GENZ.auth.token();

        if (token) {
          return String(token).trim();
        }

      }


      /*
       * Fallback langsung ke GENZ_AUTH_CLIENT
       */
      if (
        window.GENZ_AUTH_CLIENT &&
        window.GENZ_AUTH_CLIENT.auth &&
        typeof window.GENZ_AUTH_CLIENT.auth.getSession === "function"
      ) {

        const result =
          await window.GENZ_AUTH_CLIENT.auth.getSession();

        const token =
          result?.data?.session?.access_token;

        if (token) {
          return String(token).trim();
        }

      }

    } catch (error) {

      console.warn(
        "[ACCOUNT] Gagal mengambil access token:",
        error
      );

    }


    return null;

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
     * =====================================================
     * ADMIN / OWNER
     * =====================================================
     */

    if (adminState) {

      if (adminMenu) {

        adminMenu.classList.remove(
          "hidden"
        );

        adminMenu.removeAttribute(
          "hidden"
        );

        adminMenu.style.setProperty(
          "display",
          "block",
          "important"
        );

        adminMenu.style.setProperty(
          "visibility",
          "visible",
          "important"
        );

      }


      if (topupSetting) {

        topupSetting.classList.remove(
          "hidden"
        );

        topupSetting.removeAttribute(
          "hidden"
        );

        topupSetting.style.setProperty(
          "display",
          "block",
          "important"
        );

        topupSetting.style.setProperty(
          "visibility",
          "visible",
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
     * =====================================================
     * USER BIASA
     * =====================================================
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

        contactAdmin.removeAttribute(
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

        membership.removeAttribute(
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


    /*
     * Load component jika belum tersedia.
     */

    if (!button || !menu) {

      try {

        if (
          typeof GENZ.loadComponent !==
          "function"
        ) {

          console.error(
            "[ACCOUNT] GENZ.loadComponent tidak tersedia"
          );

          return false;

        }


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


    /*
     * Pastikan tombol account selalu terlihat
     * setelah user berhasil login.
     */

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
      GENZ.state?.account || {};


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

    menu.removeAttribute(
      "hidden"
    );


    GENZ.account.menuOpen =
      true;


    setExpanded(
      true
    );

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


    setExpanded(
      false
    );

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


    GENZ.state =
      GENZ.state || {};


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
     FORMAT CREDIT
  ======================================================= */

  function normalizeCredit(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return 0;

    }


    /*
     * Supabase biasanya mengembalikan
     * numeric sebagai number atau string.
     */

    const number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {

      return 0;

    }


    return number;

  }


  /* =======================================================
     UPDATE CREDIT
  ======================================================= */

  function updateCredits(amount) {

    const value =
      normalizeCredit(amount);


    /*
     * Elemen utama account menu.
     */

    const element =
      getElement("credits");


    if (element) {

      element.textContent =
        `${value.toLocaleString("id-ID")} credit`;

    }


    /*
     * Header credit jika tersedia.
     */

    const headerCredits =
      getElement("headerCredits");


    if (headerCredits) {

      headerCredits.textContent =
        `${value.toLocaleString("id-ID")} credit`;

    }


    /*
     * Simpan ke state.
     */

    GENZ.state =
      GENZ.state || {};


    GENZ.state.account =
      GENZ.state.account || {};


    GENZ.state.account.credits =
      value;


    return value;

  }


  /* =======================================================
     READ CREDIT FROM RESPONSE
  ======================================================= */

  function getCreditFromResponse(data) {

    if (!data) {
      return 0;
    }


    const candidates = [

      data.credits,

      data.credit,

      data.balance,

      data.credit_balance,

      data.creditBalance,

      data.data?.credits,

      data.data?.credit,

      data.data?.balance,

      data.data?.credit_balance,

      data.account?.credits,

      data.account?.credit,

      data.account?.balance,

      data.account?.credit_balance

    ];


    for (
      const candidate of candidates
    ) {

      if (
        candidate !== null &&
        candidate !== undefined &&
        candidate !== ""
      ) {

        const number =
          Number(candidate);


        if (
          Number.isFinite(number)
        ) {

          return number;

        }

      }

    }


    return 0;

  }


  /* =======================================================
     UPDATE ROLE
  ======================================================= */

  function updateRole(isAdmin) {

    const adminState =
      isAdmin === true;


    GENZ.state =
      GENZ.state || {};


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

    GENZ.state =
      GENZ.state || {};


    GENZ.state.account =
      GENZ.state.account || {};


    /*
     * Jangan menghapus credit yang sudah diketahui.
     */

    GENZ.state.account.isAdmin =
      false;


    GENZ.state.account.roleValidated =
      false;


    updateMenuVisibility(
      false
    );

  }


  /* =======================================================
     REFRESH ACCOUNT FROM SERVER
  ======================================================= */

  async function refresh() {

    if (
      GENZ.state?.loggedIn !== true
    ) {

      return false;

    }


    await ensureUI();


    try {

      /*
       * ===================================================
       * AMBIL ACCESS TOKEN
       * ===================================================
       */

      const accessToken =
        await getAccessToken();


      if (!accessToken) {

        console.warn(
          "[ACCOUNT] Access token belum tersedia."
        );

        /*
         * Jangan menghapus role.
         * Session bisa saja masih dalam proses
         * INITIAL_SESSION / TOKEN_REFRESHED.
         */

        return false;

      }


      /*
       * ===================================================
       * REQUEST ACCOUNT
       * ===================================================
       */

      const response =
        await fetch(
          "/api/account/credits",
          {

            method: "GET",

            credentials: "include",

            cache: "no-store",

            headers: {

              "Accept":
                "application/json",

              "Authorization":
                `Bearer ${accessToken}`

            }

          }
        );


      /*
       * ===================================================
       * UNAUTHORIZED
       * ===================================================
       */

      if (
        response.status === 401
      ) {

        console.warn(
          "[ACCOUNT] Worker menolak session: 401"
        );

        /*
         * Jangan langsung menganggap
         * user bukan admin.
         */

        return false;

      }


      /*
       * ===================================================
       * ERROR SERVER
       * ===================================================
       */

      if (!response.ok) {

        console.warn(
          "[ACCOUNT] credits request:",
          response.status
        );

        return false;

      }


      /*
       * ===================================================
       * PARSE RESPONSE
       * ===================================================
       */

      const data =
        await response.json();


      if (
        !data ||
        data.success === false
      ) {

        console.warn(
          "[ACCOUNT] Response account tidak valid:",
          data
        );

        return false;

      }


      /*
       * ===================================================
       * SIMPAN DATA ACCOUNT
       * ===================================================
       */

      GENZ.state =
        GENZ.state || {};


      GENZ.state.account =
        data;


      /*
       * ===================================================
       * CREDIT
       * ===================================================
       */

      const credit =
        getCreditFromResponse(
          data
        );


      updateCredits(
        credit
      );


      /*
       * ===================================================
       * ROLE
       * ===================================================
       *
       * Server adalah sumber kebenaran.
       *
       * data.isAdmin === true
       * berarti role admin atau owner.
       */

      const serverIsAdmin =
        data.isAdmin === true;


      GENZ.state.account.isAdmin =
        serverIsAdmin;


      /*
       * Role sudah berhasil divalidasi
       * oleh Worker.
       */

      GENZ.state.account.roleValidated =
        true;


      /*
       * Simpan role jika tersedia.
       */

      if (
        data.role
      ) {

        GENZ.state.account.role =
          data.role;

      }


      /*
       * ===================================================
       * UPDATE MENU
       * ===================================================
       */

      updateMenuVisibility(
        serverIsAdmin
      );


      /*
       * ===================================================
       * LOG
       * ===================================================
       */

      console.log(
        "[ACCOUNT] Account berhasil dimuat:",
        {

          credits:
            GENZ.state.account.credits,

          role:
            GENZ.state.account.role ||
            "unknown",

          isAdmin:
            serverIsAdmin,

          roleValidated:
            true

        }
      );


      return true;


    } catch (error) {

      console.error(
        "[ACCOUNT] refresh error",
        error
      );

      /*
       * Jangan invalidate admin hanya karena
       * jaringan atau session sedang refresh.
       */

      return false;

    }


  }


  /* =======================================================
     HAS ADMIN ACCESS
  ======================================================= */

  function hasAdminAccess() {

    return Boolean(

      GENZ.state?.account &&

      GENZ.state.account.isAdmin === true &&

      GENZ.state.account.roleValidated === true

    );

  }


  /* =======================================================
     PAGE NAVIGATION
  ======================================================= */

  function navigate(page) {

    closeMenu();


    GENZ.state =
      GENZ.state || {};


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
         * =================================================
         * ACCOUNT BUTTON
         * =================================================
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
         * =================================================
         * PAGE BUTTON
         * =================================================
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
           * USER ONLY
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


          navigate(
            page
          );

          return;

        }


        /*
         * =================================================
         * CLICK DI LUAR MENU
         * =================================================
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


    /* =====================================================
       AUTH LOGIN
    ===================================================== */

    if (
      typeof GENZ.on ===
      "function"
    ) {

      GENZ.on(
        "auth-login",
        async function (user) {

          GENZ.state =
            GENZ.state || {};


          GENZ.state.loggedIn =
            true;


          /*
           * Jangan langsung menganggap user
           * bukan admin sebagai status permanen.
           */

          GENZ.state.account =
            {

              isAdmin:
                false,

              roleValidated:
                false

            };


          updateUser(
            user
          );


          await ensureUI();


          /*
           * Beri sedikit waktu agar
           * Supabase session tersedia.
           */

          await refresh();

        }
      );


      /* ===================================================
         AUTH LOGOUT
      =================================================== */

      GENZ.on(
        "auth-logout",
        function () {

          GENZ.state =
            GENZ.state || {};


          GENZ.state.loggedIn =
            false;


          GENZ.state.user =
            null;


          GENZ.state.account =
            {

              isAdmin:
                false,

              roleValidated:
                false,

              credits:
                0

            };


          updateMenuVisibility(
            false
          );


          updateCredits(
            0
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

    GENZ.state =
      GENZ.state || {

        loggedIn:
          false,

        user:
          null,

        account:
          null

      };


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


  GENZ.account.getAccessToken =
    getAccessToken;


})();
