/* =========================================================
   GEN-Z.AI - TOP UP SETTING
   public/js/topup-settings.js

   Fungsi:
   - Khusus Admin
   - Memilih user dari database
   - Menampilkan email user
   - Menampilkan kredit saat ini
   - Menambahkan kredit
   - Catatan transaksi
   - Menggunakan endpoint admin yang sudah ada
   - Tidak menyimpan API key
   - Tidak menggunakan email hardcode
========================================================= */

(function () {

  "use strict";

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  /* =======================================================
     STATE
  ======================================================= */

  const state = {

    users: [],

    selectedUser: null,

    loading: false

  };


  /* =======================================================
     HELPER
  ======================================================= */

  function $(id) {

    return document.getElementById(id);

  }


  function escapeHtml(value) {

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

    const number =
      Number(value || 0);

    return number.toLocaleString(
      "id-ID"
    );

  }


  /* =======================================================
     STATUS
  ======================================================= */

  function setStatus(
    message,
    type = ""
  ) {

    const element =
      $("topupSettingsStatus");

    if (!element) {

      return;

    }

    element.className =
      `topup-settings-status ${type}`;

    element.textContent =
      message || "";

  }


  /* =======================================================
     TOKEN
  ======================================================= */

  async function getToken() {

    if (
      GENZ.auth &&
      typeof GENZ.auth.token === "function"
    ) {

      return await GENZ.auth.token();

    }

    return null;

  }


  /* =======================================================
     API
  ======================================================= */

  async function api(
    path,
    options = {}
  ) {

    const accessToken =
      await getToken();

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


  /* =======================================================
     ADMIN CHECK
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
     USER ID
  ======================================================= */

  function getUserId(user) {

    if (!user) {

      return "";

    }

    return String(
      user.id ||
      user.user_id ||
      user.uid ||
      ""
    );

  }


  /* =======================================================
     USER CREDIT
  ======================================================= */

  function getUserCredits(user) {

    if (!user) {

      return 0;

    }

    return Number(
      user.credits ??
      user.credit ??
      user.balance ??
      0
    );

  }


  /* =======================================================
     LOAD USERS
  ======================================================= */

  async function loadUsers() {

    if (!isAdmin()) {

      renderDenied();

      return;

    }


    const select =
      $("topupUser");

    if (select) {

      select.disabled = true;

    }


    setStatus(
      "Memuat daftar user...",
      "info"
    );


    try {

      const response =
        await api(
          "/api/admin/users"
        );


      state.users =
        Array.isArray(
          response?.users
        )
          ? response.users
          : [];


      renderUsers();


      setStatus(
        "",
        ""
      );


    } catch (error) {

      console.error(
        "[GEN-Z.AI] Top Up Setting users error:",
        error
      );


      state.users = [];

      renderUsers();


      setStatus(
        error?.message ||
        "Gagal memuat daftar user.",
        "error"
      );

    }

  }


  /* =======================================================
     RENDER USERS
  ======================================================= */

  function renderUsers() {

    const select =
      $("topupUser");

    if (!select) {

      return;

    }


    select.innerHTML = "";


    const placeholder =
      document.createElement(
        "option"
      );

    placeholder.value = "";

    placeholder.textContent =
      state.users.length
        ? "Pilih user"
        : "Tidak ada user";

    select.appendChild(
      placeholder
    );


    state.users.forEach(
      user => {

        const id =
          getUserId(user);

        const email =
          String(
            user.email ||
            "-"
          );


        if (!id) {

          return;

        }


        const option =
          document.createElement(
            "option"
          );

        option.value =
          id;

        option.textContent =
          email;

        select.appendChild(
          option
        );

      }
    );


    select.disabled =
      state.users.length === 0;

  }


  /* =======================================================
     FIND USER
  ======================================================= */

  function findUser(
    userId
  ) {

    return state.users.find(
      user =>
        getUserId(user) ===
        String(userId)
    ) || null;

  }


  /* =======================================================
     SHOW USER INFO
  ======================================================= */

  function showUserInfo(
    user
  ) {

    const info =
      $("topupUserInfo");

    const email =
      $("topupSelectedEmail");

    const credit =
      $("topupCurrentCredit");


    if (!user) {

      if (info) {

        info.hidden = true;

      }

      state.selectedUser =
        null;

      return;

    }


    state.selectedUser =
      user;


    if (email) {

      email.textContent =
        user.email ||
        "-";

    }


    if (credit) {

      credit.textContent =
        formatNumber(
          getUserCredits(user)
        );

    }


    if (info) {

      info.hidden = false;

    }

  }


  /* =======================================================
     USER CHANGE
  ======================================================= */

  function handleUserChange() {

    const select =
      $("topupUser");

    if (!select) {

      return;

    }


    const userId =
      select.value;


    if (!userId) {

      showUserInfo(
        null
      );

      return;

    }


    const user =
      findUser(
        userId
      );


    showUserInfo(
      user
    );

  }


  /* =======================================================
     HIDE USER INFO
  ======================================================= */

  function hideUserInfo() {

    const info =
      $("topupUserInfo");

    if (info) {

      info.hidden = true;

    }


    state.selectedUser =
      null;

  }


  /* =======================================================
     UPDATE LOCAL USER CREDIT
  ======================================================= */

  function updateLocalCredit(
    userId,
    newBalance
  ) {

    const user =
      findUser(
        userId
      );

    if (!user) {

      return;

    }


    user.credits =
      Number(
        newBalance || 0
      );


    if (
      state.selectedUser &&
      getUserId(
        state.selectedUser
      ) === String(userId)
    ) {

      state.selectedUser =
        user;

    }


    const credit =
      $("topupCurrentCredit");

    if (credit) {

      credit.textContent =
        formatNumber(
          getUserCredits(user)
        );

    }

  }


  /* =======================================================
     ADD CREDIT
  ======================================================= */

  async function addCredit() {

    if (!isAdmin()) {

      setStatus(
        "Akses ditolak. Hanya admin yang dapat menambahkan kredit.",
        "error"
      );

      return;

    }


    const user =
      state.selectedUser;


    if (!user) {

      setStatus(
        "Pilih user terlebih dahulu.",
        "error"
      );

      return;

    }


    const userId =
      getUserId(user);


    if (!userId) {

      setStatus(
        "ID user tidak ditemukan.",
        "error"
      );

      return;

    }


    const amountInput =
      $("topupAmount");


    const noteInput =
      $("topupNote");


    const amount =
      Number(
        amountInput?.value
      );


    const note =
      String(
        noteInput?.value ||
        ""
      ).trim();


    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {

      setStatus(
        "Jumlah kredit harus berupa angka bulat lebih dari 0.",
        "error"
      );

      amountInput?.focus();

      return;

    }


    if (amount > 1000000) {

      setStatus(
        "Jumlah kredit maksimal 1.000.000.",
        "error"
      );

      amountInput?.focus();

      return;

    }


    const button =
      $("topupSubmit");


    state.loading =
      true;


    if (button) {

      button.disabled = true;

      button.dataset.originalText =
        button.textContent;

      button.textContent =
        "Memproses...";

    }


    setStatus(
      "Menambahkan kredit...",
      "info"
    );


    try {

      const response =
        await api(
          "/api/admin/credits/adjust",
          {
            method: "POST",

            body: JSON.stringify({

              user_id:
                userId,

              amount:
                amount,

              note:
                note

            })

          }
        );


      /*
       * Backend dapat mengembalikan
       * balance/credits/new_balance.
       */

      const newBalance =
        response?.credits ??
        response?.credit ??
        response?.balance ??
        response?.new_balance ??
        response?.newBalance;


      if (
        newBalance !== undefined &&
        newBalance !== null
      ) {

        updateLocalCredit(
          userId,
          Number(newBalance)
        );

      } else {

        /*
         * Jika response tidak membawa
         * saldo terbaru, ambil ulang
         * daftar user dari server.
         */

        await loadUsers();


        const refreshedUser =
          findUser(
            userId
          );


        if (refreshedUser) {

          showUserInfo(
            refreshedUser
          );

        }

      }


      /*
       * Refresh account utama
       * agar saldo di menu aplikasi
       * ikut diperbarui.
       */

      if (
        GENZ.account &&
        typeof GENZ.account.refresh ===
          "function"
      ) {

        try {

          await GENZ.account.refresh();

        } catch (_) {

          console.warn(
            "[GEN-Z.AI] Account refresh gagal."
          );

        }

      }


      if (
        GENZ.credit &&
        typeof GENZ.credit.refresh ===
          "function"
      ) {

        try {

          await GENZ.credit.refresh();

        } catch (_) {

          console.warn(
            "[GEN-Z.AI] Credit refresh gagal."
          );

        }

      }


      setStatus(
        `Berhasil menambahkan ${formatNumber(amount)} kredit ke ${user.email || "user"}.`,
        "success"
      );


      if (amountInput) {

        amountInput.value =
          "";

      }


      if (noteInput) {

        noteInput.value =
          "";

      }


    } catch (error) {

      console.error(
        "[GEN-Z.AI] Top Up Setting error:",
        error
      );


      setStatus(
        error?.message ||
        "Gagal menambahkan kredit.",
        "error"
      );

    } finally {

      state.loading =
        false;


      if (button) {

        button.disabled =
          false;

        button.textContent =
          button.dataset.originalText ||
          "Tambah Kredit";

      }

    }

  }


  /* =======================================================
     BACK
  ======================================================= */

  function bindBackButton() {

    const button =
      $("topupSettingsBack");

    if (!button) {

      return;

    }


    button.addEventListener(
      "click",
      () => {

        if (
          typeof GENZ.emit ===
          "function"
        ) {

          GENZ.emit(
            "show-studio"
          );

        }

      }
    );

  }


  /* =======================================================
     BIND
  ======================================================= */

  function bind() {

    const select =
      $("topupUser");

    if (select) {

      select.addEventListener(
        "change",
        handleUserChange
      );

    }


    const submit =
      $("topupSubmit");

    if (submit) {

      submit.addEventListener(
        "click",
        addCredit
      );

    }


    bindBackButton();

  }


  /* =======================================================
     ACCESS DENIED
  ======================================================= */

  function renderDenied() {

    const container =
      $("pageContent") ||
      $("content");

    if (!container) {

      return;

    }


    container.innerHTML = `

      <section class="page-card">

        <div class="page-header">

          <button
            type="button"
            class="back-btn"
            id="topupSettingsDeniedBack">
            ←
          </button>

          <div>

            <h2>
              Akses Ditolak
            </h2>

            <p>
              Halaman ini hanya untuk administrator.
            </p>

          </div>

        </div>

      </section>

    `;


    const back =
      $("topupSettingsDeniedBack");


    if (back) {

      back.addEventListener(
        "click",
        () => {

          if (
            typeof GENZ.emit ===
            "function"
          ) {

            GENZ.emit(
              "show-studio"
            );

          }

        }
      );

    }

  }


  /* =======================================================
     LOAD PAGE
  ======================================================= */

  async function load() {

    if (!isAdmin()) {

      renderDenied();

      return;

    }


    const container =
      $("pageContent") ||
      $("content");


    if (!container) {

      console.error(
        "[GEN-Z.AI] Top Up Setting container tidak ditemukan."
      );

      return;

    }


    /*
     * Jika HTML halaman belum dimuat,
     * ambil dari components.
     */

    const existing =
      $("topupSettingsPage");


    if (!existing) {

      try {

        const response =
          await fetch(
            "/components/topup-settings.html",
            {
              credentials: "include"
            }
          );


        if (!response.ok) {

          throw new Error(
            `Gagal memuat halaman Top Up Setting (${response.status})`
          );

        }


        const html =
          await response.text();


        container.innerHTML =
          html;

      } catch (error) {

        console.error(
          "[GEN-Z.AI] Top Up Setting HTML error:",
          error
        );


        /*
         * Fallback HTML.
         */

        container.innerHTML = `

          <section
            class="page-card topup-settings-page"
            id="topupSettingsPage">

            <div class="page-header">

              <button
                type="button"
                class="back-btn"
                id="topupSettingsBack">
                ←
              </button>

              <div>

                <h2>
                  Top Up Setting
                </h2>

                <p>
                  Tambah kredit pengguna secara manual
                </p>

              </div>

            </div>

            <div
              id="topupSettingsStatus"
              class="topup-settings-status"
              aria-live="polite">
            </div>

            <div class="topup-settings-card">

              <div class="topup-field">

                <label for="topupUser">
                  USER
                </label>

                <select id="topupUser">

                  <option value="">
                    Pilih user
                  </option>

                </select>

              </div>

              <div
                class="topup-user-info"
                id="topupUserInfo"
                hidden>

                <div class="topup-user-email">

                  <span>
                    Email
                  </span>

                  <strong
                    id="topupSelectedEmail">
                    -
                  </strong>

                </div>

                <div class="topup-user-credit">

                  <span>
                    Kredit Saat Ini
                  </span>

                  <strong
                    id="topupCurrentCredit">
                    0
                  </strong>

                </div>

              </div>

              <div class="topup-field">

                <label for="topupAmount">
                  TAMBAH KREDIT
                </label>

                <input
                  type="number"
                  id="topupAmount"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  placeholder="Contoh: 100"
                  autocomplete="off">

                <small>
                  Masukkan jumlah kredit
                  yang ingin ditambahkan.
                </small>

              </div>

              <div class="topup-field">

                <label for="topupNote">
                  CATATAN
                </label>

                <textarea
                  id="topupNote"
                  rows="3"
                  maxlength="500"
                  placeholder="Contoh: Top up manual admin"></textarea>

              </div>

              <button
                type="button"
                class="primary-btn topup-submit-btn"
                id="topupSubmit">
                Tambah Kredit
              </button>

            </div>

          </section>

        `;

      }

    }


    bind();


    await loadUsers();

  }


  /* =======================================================
     PUBLIC MODULE
  ======================================================= */

  GENZ.topupSettings = {

    load,

    refresh:
      load,

    loadUsers,

    addCredit,

    state

  };


})();
