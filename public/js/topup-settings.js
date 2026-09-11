/* =========================================================
   GEN-Z.AI
   TOP UP SETTING
   public/js/topup-settings.js

   Fungsi:
   - Halaman khusus Admin/Owner
   - Memilih user
   - Melihat saldo kredit
   - Menambahkan kredit
   - Menggunakan backend /api/admin/credits/adjust
   - Tidak menyimpan API key
   - Tidak menyimpan data sensitif di localStorage
========================================================= */

(function () {

  "use strict";

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  const state = {

    users: [],

    selectedUser: null,

    loading: false

  };


  /* =======================================================
     HELPERS
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

    return number.toLocaleString("id-ID");

  }


  function setStatus(
    message,
    type = ""
  ) {

    const el =
      $("topupSettingsStatus");

    if (!el) {
      return;
    }

    el.className =
      `topup-settings-status ${type}`;

    el.textContent =
      message || "";

  }


  async function getToken() {

    if (
      GENZ.auth &&
      typeof GENZ.auth.token === "function"
    ) {

      return await GENZ.auth.token();

    }

    return null;

  }


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
     LOAD USERS
  ======================================================= */

  async function loadUsers() {

    const select =
      $("topupUser");

    if (!select) {
      return;
    }

    select.innerHTML = `
      <option value="">
        Memuat user...
      </option>
    `;

    try {

      const data =
        await api(
          "/api/admin/users"
        );

      const users =
        Array.isArray(data)
          ? data
          : (
              Array.isArray(data?.users)
                ? data.users
                : []
            );

      state.users =
        users;

      renderUsers();

    } catch (error) {

      console.error(
        "[GEN-Z.AI] Top Up users error:",
        error
      );

      select.innerHTML = `
        <option value="">
          Gagal memuat user
        </option>
      `;

      setStatus(
        error.message ||
        "Gagal memuat daftar user.",
        "error"
      );

    }

  }


  function renderUsers() {

    const select =
      $("topupUser");

    if (!select) {
      return;
    }

    if (!state.users.length) {

      select.innerHTML = `
        <option value="">
          Tidak ada user
        </option>
      `;

      return;

    }

    const options =
      state.users
        .map(user => {

          const id =
            user.id ||
            user.user_id ||
            "";

          const email =
            user.email ||
            user.user_email ||
            "User";

          const credits =
            user.credits ??
            user.credit ??
            user.balance ??
            0;

          if (!id) {
            return "";
          }

          return `
            <option
              value="${escapeHtml(id)}">

              ${escapeHtml(email)}
              • ${formatNumber(credits)} kredit

            </option>
          `;

        })
        .join("");

    select.innerHTML = `
      <option value="">
        Pilih user
      </option>

      ${options}
    `;

  }


  /* =======================================================
     USER SELECTION
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

      state.selectedUser =
        null;

      hideUserInfo();

      return;

    }

    const user =
      state.users.find(
        item =>
          String(
            item.id ||
            item.user_id ||
            ""
          ) === String(userId)
      );

    if (!user) {

      state.selectedUser =
        null;

      hideUserInfo();

      return;

    }

    state.selectedUser =
      user;

    showUserInfo(
      user
    );

  }


  function showUserInfo(user) {

    const box =
      $("topupUserInfo");

    const email =
      $("topupSelectedEmail");

    const credit =
      $("topupCurrentCredit");

    if (!box) {
      return;
    }

    const userEmail =
      user.email ||
      user.user_email ||
      "-";

    const currentCredit =
      user.credits ??
      user.credit ??
      user.balance ??
      0;

    if (email) {

      email.textContent =
        userEmail;

    }

    if (credit) {

      credit.textContent =
        formatNumber(
          currentCredit
        );

    }

    box.hidden =
      false;

  }


  function hideUserInfo() {

    const box =
      $("topupUserInfo");

    if (box) {

      box.hidden =
        true;

    }

  }


  /* =======================================================
     ADD CREDIT
  ======================================================= */

  async function addCredit() {

    if (
      state.loading
    ) {

      return;

    }

    if (!isAdmin()) {

      setStatus(
        "Akses admin tidak valid.",
        "error"
      );

      return;

    }

    const userSelect =
      $("topupUser");

    const amountInput =
      $("topupAmount");

    const noteInput =
      $("topupNote");

    if (!userSelect) {
      return;
    }

    const userId =
      String(
        userSelect.value ||
        ""
      ).trim();

    const amount =
      Number(
        amountInput?.value || 0
      );

    const note =
      String(
        noteInput?.value ||
        ""
      ).trim();

    if (!userId) {

      setStatus(
        "Pilih user terlebih dahulu.",
        "error"
      );

      return;

    }

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

    if (
      amount > 1000000
    ) {

      setStatus(
        "Jumlah kredit terlalu besar.",
        "error"
      );

      amountInput?.focus();

      return;

    }

    state.loading =
      true;

    updateButton(
      true
    );

    setStatus(
      "Menambahkan kredit...",
      "info"
    );

    try {

      const data =
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
                note ||
                "Top up manual admin"

            })

          }
        );

      const newBalance =
        data?.credits ??
        data?.credit ??
        data?.balance ??
        data?.new_balance ??
        null;

      if (
        newBalance !== null
      ) {

        updateSelectedUserCredit(
          userId,
          newBalance
        );

      } else {

        await loadUsers();

        const select =
          $("topupUser");

        if (select) {

          select.value =
            userId;

          handleUserChange();

        }

      }

      setStatus(
        `Berhasil menambahkan ${formatNumber(amount)} kredit.`,
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

      refreshAccount();

    } catch (error) {

      console.error(
        "[GEN-Z.AI] Add credit error:",
        error
      );

      setStatus(
        error.message ||
        "Gagal menambahkan kredit.",
        "error"
      );

    } finally {

      state.loading =
        false;

      updateButton(
        false
      );

    }

  }


  function updateSelectedUserCredit(
    userId,
    newBalance
  ) {

    const user =
      state.users.find(
        item =>
          String(
            item.id ||
            item.user_id ||
            ""
          ) === String(userId)
      );

    if (user) {

      if (
        Object.prototype.hasOwnProperty.call(
          user,
          "credits"
        )
      ) {

        user.credits =
          newBalance;

      } else if (
        Object.prototype.hasOwnProperty.call(
          user,
          "credit"
        )
      ) {

        user.credit =
          newBalance;

      } else {

        user.credits =
          newBalance;

      }

      state.selectedUser =
        user;

    }

    const credit =
      $("topupCurrentCredit");

    if (credit) {

      credit.textContent =
        formatNumber(
          newBalance
        );

    }

  }


  /* =======================================================
     BUTTON
  ======================================================= */

  function updateButton(
    loading
  ) {

    const button =
      $("topupSubmit");

    if (!button) {
      return;
    }

    button.disabled =
      loading;

    button.textContent =
      loading
        ? "Memproses..."
        : "Tambah Kredit";

  }


  /* =======================================================
     ACCOUNT REFRESH
  ======================================================= */

  function refreshAccount() {

    try {

      if (
        GENZ.account &&
        typeof GENZ.account.refresh ===
          "function"
      ) {

        GENZ.account.refresh();

      }

    } catch (error) {

      console.warn(
        "[GEN-Z.AI] Account refresh failed:",
        error
      );

    }

  }


  /* =======================================================
     EVENTS
  ======================================================= */

  function bind() {

    const back =
      $("topupSettingsBack");

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

    const user =
      $("topupUser");

    if (user) {

      user.addEventListener(
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

    const amount =
      $("topupAmount");

    if (amount) {

      amount.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter"
          ) {

            event.preventDefault();

            addCredit();

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
        "[GEN-Z.AI] pageContent tidak ditemukan."
      );

      return;

    }

    container.innerHTML =
      await getPageHtml();

    bind();

    await loadUsers();

  }


  async function getPageHtml() {

    try {

      const response =
        await fetch(
          "/components/topup-settings.html",
          {
            cache: "no-store"
          }
        );

      if (
        response.ok
      ) {

        return await response.text();

      }

    } catch (error) {

      console.warn(
        "[GEN-Z.AI] Gagal memuat topup-settings.html:",
        error
      );

    }

    /*
     * Fallback.
     * Jadi halaman tetap bisa muncul
     * apabila HTML component gagal dimuat.
     */

    return `
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

            <h2>Top Up Setting</h2>

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

            <div>

              <span>Email</span>

              <strong id="topupSelectedEmail">
                -
              </strong>

            </div>

            <div>

              <span>Kredit Saat Ini</span>

              <strong id="topupCurrentCredit">
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
              placeholder="Contoh: 100">

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
            id="topupDeniedBack">
            ←
          </button>

          <div>

            <h2>
              Akses Ditolak
            </h2>

            <p>
              Top Up Setting hanya tersedia untuk administrator.
            </p>

          </div>

        </div>

      </section>

    `;

    const back =
      $("topupDeniedBack");

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
     PUBLIC MODULE
  ======================================================= */

  GENZ.topupSettings = {

    load,

    refresh: load,

    state

  };


})();
