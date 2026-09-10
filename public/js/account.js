/* =========================================================
   GEN-Z.AI ACCOUNT MODULE
   Role validation:
   - ONLY server response: data.isAdmin === true
   - Never trust email
   - Never trust local role
   - Never infer admin from username
========================================================= */

(function () {

  "use strict";

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
        "account-container"
      );


    if (!container) {

      console.warn(
        "[ACCOUNT] account-container belum tersedia"
      );

      return false;

    }


    let button =
      document.getElementById(
        "accountBtn"
      );

    let menu =
      document.getElementById(
        "accountMenu"
      );


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
      document.getElementById(
        "accountBtn"
      );

    menu =
      document.getElementById(
        "accountMenu"
      );


    if (!button) {

      console.error(
        "[ACCOUNT] accountBtn tidak ditemukan"
      );

      return false;

    }


    /*
     * Tombol akun harus selalu terlihat
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


    return true;

  }


  /* -------------------------------------------------------
     OPEN MENU
  ------------------------------------------------------- */

  function openMenu() {

    const menu =
      document.getElementById(
        "accountMenu"
      );


    if (!menu) {
      return;
    }


    menu.classList.remove(
      "hidden"
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
        "accountMenu"
      );


    if (!menu) {
      return;
    }


    menu.classList.add(
      "hidden"
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

    if (!user) {
      return;
    }


    GENZ.state.user =
      user;


    const email =
      user.email ||
      "User";


    const emailElement =
      document.getElementById(
        "userEmail"
      );


    const menuEmail =
      document.getElementById(
        "menuEmail"
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
        "credits"
      );


    if (!element) {
      return;
    }


    const value =
      Number(amount || 0);


    element.textContent =
      `${value} credit`;

  }


  /* -------------------------------------------------------
     UPDATE ROLE
     IMPORTANT:
     ONLY Boolean true from server is accepted.
  ------------------------------------------------------- */

  function updateRole(
    isAdmin
  ) {

    /*
     * Jangan pernah menggunakan:
     *
     * - email
     * - username
     * - local role
     * - string "admin"
     *
     * Satu-satunya nilai valid:
     *
     * data.isAdmin === true
     */

    const admin =
      document.getElementById(
        "adminPanel"
      );


    const contact =
      document.getElementById(
        "contactAdmin"
      );


    const adminState =
      isAdmin === true;


    /*
     * Simpan status yang sudah
     * divalidasi dari server.
     */

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


  /* -------------------------------------------------------
     REFRESH ACCOUNT FROM SERVER
  ------------------------------------------------------- */

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

        /*
         * Kalau validasi account gagal,
         * jangan mempertahankan status admin lama.
         */

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
       * Simpan response account.
       */

      GENZ.state.account =
        data;


      /*
       * Kredit.
       */

      updateCredits(
        data.credits ??
        data.balance ??
        0
      );


      /*
       * ROLE VALIDATION
       *
       * Sangat penting:
       *
       *     data.isAdmin === true
       *
       * bukan:
       *
       *     Boolean(data.isAdmin)
       *
       * bukan:
       *
       *     data.role === "admin"
       */

      updateRole(
        data.isAdmin === true
      );


      /*
       * Tandai bahwa status role
       * berasal dari server.
       */

      GENZ.state.account.roleValidated =
        true;


    } catch (error) {

      /*
       * Network error juga harus
       * menghilangkan privilege admin
       * yang sebelumnya tersimpan.
       */

      invalidateAdmin();


      console.error(
        "[ACCOUNT] refresh error",
        error
      );

    }


    /*
     * Pengaman terakhir untuk UI.
     */

    await ensureUI();

  }


  /* -------------------------------------------------------
     INVALIDATE ADMIN
  ------------------------------------------------------- */

  function invalidateAdmin() {

    GENZ.state.account =
      GENZ.state.account || {};


    GENZ.state.account.isAdmin =
      false;


    GENZ.state.account.roleValidated =
      false;


    const admin =
      document.getElementById(
        "adminPanel"
      );


    const contact =
      document.getElementById(
        "contactAdmin"
      );


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


  /* -------------------------------------------------------
     HAS ADMIN ACCESS
     Frontend guard only.
     Backend remains authoritative.
  ------------------------------------------------------- */

  function hasAdminAccess() {

    return (
      GENZ.state.account &&
      GENZ.state.account.isAdmin === true &&
      GENZ.state.account.roleValidated === true
    );

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
      "page-change",
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

          /*
           * Jangan biarkan user biasa
           * memanggil halaman admin hanya
           * karena HTML dimanipulasi.
           */

          const page =
            pageButton.dataset.page;


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


          navigate(
            page
          );

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


    GENZ.on(
      "auth-login",
      async function (user) {

        GENZ.state.loggedIn =
          true;


        /*
         * Reset privilege terlebih dahulu.
         * Status admin baru boleh muncul
         * setelah server divalidasi.
         */

        GENZ.state.account = {

          isAdmin: false,

          roleValidated: false

        };


        updateUser(
          user
        );


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


  /* -------------------------------------------------------
     INIT
  ------------------------------------------------------- */

  async function init() {

    await ensureUI();

    bindEvents();


    /*
     * Kalau sudah login, langsung
     * validasi status admin dari server.
     */

    if (
      GENZ.state.loggedIn === true
    ) {

      await refresh();

    }


    console.log(
      "[GEN-Z.AI] ACCOUNT READY"
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


  GENZ.account.hasAdminAccess =
    hasAdminAccess;


  GENZ.account.invalidateAdmin =
    invalidateAdmin;


})();

/*Lalu "admin.js" juga harus diperketat

Di "public/js/admin.js", ganti fungsi "isAdmin()" menjadi:*/

function isAdmin() {

  return (
    GENZ.state.account &&
    GENZ.state.account.isAdmin === true &&
    GENZ.state.account.roleValidated === true
  );

}

/*Dengan begitu alurnya menjadi:

Login
  ↓
/api/account/credits
  ↓
data.isAdmin === true ?
  ├── YA  → Admin menu tampil
  └── TIDAK → User menu tampil

Dan yang penting, "role: "admin"" lokal tidak lagi cukup. Bahkan kalau seseorang mengubah JavaScript di browser menjadi "role = "admin"", frontend tetap menolak karena "isAdmin" harus berasal dari respons server. Backend tetap menjadi pagar terakhir melalui "requireAdmin()".

Ini juga memperbaiki masalah stale privilege: kalau request validasi account gagal atau logout, "isAdmin" langsung di-reset ke "false". Browser tidak boleh menyimpan kekuasaan seperti bangsawan abad pertengahan.*/
