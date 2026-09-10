"use strict";

/*
============================================================
GEN-Z.AI ADMIN PANEL
============================================================

Semua operasi admin melalui Cloudflare Worker.

GET
/api/admin/users
/api/admin/admins
/api/admin/providers
/api/admin/topups
/api/admin/contact

POST
/api/admin/users/find
/api/admin/admins/add
/api/admin/admins/remove
/api/admin/credits/adjust
/api/admin/topups/process
/api/admin/providers
/api/admin/contact

Security:
- Service-role key TIDAK pernah berada di browser.
- Provider API key TIDAK pernah dikembalikan ke browser.
- Browser hanya mengirim Supabase access token.
- Worker melakukan validasi administrator.

============================================================
*/

(function () {

  let supabaseClient = null;
  let currentUser = null;
  let accessToken = null;

  const WORKER_URL =
    "https://ai-video-tool.sugionoofficial88.workers.dev";


  /* ========================================================
     SUPABASE
  ======================================================== */

  function initSupabase() {

    const config =
      window.AIVideoConfig || {};

    if (
      !window.supabase ||
      !config.SUPABASE_URL ||
      !config.SUPABASE_PUBLISHABLE_KEY
    ) {
      showMessage(
        "Konfigurasi Supabase belum lengkap.",
        "error"
      );

      return false;
    }

    supabaseClient =
      window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

    return true;
  }


  /* ========================================================
     MESSAGE
  ======================================================== */

  function showMessage(
    message,
    type = "info"
  ) {

    const box =
      document.getElementById(
        "adminMessage"
      );

    if (!box) {
      console[type === "error" ? "error" : "log"](
        message
      );
      return;
    }

    box.textContent =
      String(message || "");

    box.style.display =
      "block";

    if (type === "error") {

      box.style.background =
        "#991b1b";

    } else if (type === "success") {

      box.style.background =
        "#166534";

    } else {

      box.style.background =
        "#111827";
    }

    clearTimeout(
      box._timer
    );

    box._timer =
      setTimeout(() => {

        box.style.display =
          "none";

      }, 4000);
  }


  /* ========================================================
     WORKER REQUEST
  ======================================================== */

  async function workerRequest(
    path,
    options = {}
  ) {

    /*
    Selalu ambil session terbaru supaya access token
    mengikuti refresh token Supabase.
    */

    if (!supabaseClient) {
      throw new Error(
        "Supabase belum diinisialisasi."
      );
    }

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (
      error ||
      !data?.session
    ) {
      throw new Error(
        "Sesi administrator sudah berakhir."
      );
    }

    accessToken =
      data.session.access_token;

    const headers = {
      "Authorization":
        "Bearer " + accessToken
    };

    /*
    Hanya tambahkan Content-Type jika memang ada body.
    */

    let requestBody =
      options.body;

    if (
      requestBody &&
      typeof requestBody === "object" &&
      !(requestBody instanceof FormData)
    ) {

      requestBody =
        JSON.stringify(
          requestBody
        );

      headers["Content-Type"] =
        "application/json";
    }

    if (
      typeof requestBody === "string"
    ) {

      headers["Content-Type"] =
        "application/json";
    }

    const response =
      await fetch(
        WORKER_URL + path,
        {
          ...options,

          body:
            requestBody,

          headers: {
            ...headers,
            ...(options.headers || {})
          }
        }
      );

    let result = null;

    try {

      result =
        await response.json();

    } catch {

      result = null;
    }

    if (!response.ok) {

      throw new Error(
        result?.error ||
        result?.message ||
        `Worker gagal (${response.status}).`
      );
    }

    if (
      result &&
      result.success === false
    ) {

      throw new Error(
        result.error ||
        "Operasi gagal."
      );
    }

    return result || {};
  }


  /* ========================================================
     ADMIN ACCESS
  ======================================================== */

  async function checkAdminAccess() {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (
      error ||
      !data?.session
    ) {

      window.location.href =
        "/";

      return false;
    }

    currentUser =
      data.session.user;

    accessToken =
      data.session.access_token;

    /*
    Jangan membaca user_roles langsung dari browser.

    Worker yang menentukan apakah user benar-benar admin.
    */

    try {

      await workerRequest(
        "/api/admin/admins"
      );

    } catch (error) {

      renderAccessDenied(
        error.message
      );

      return false;
    }

    const email =
      document.getElementById(
        "adminEmail"
      );

    if (email) {

      email.textContent =
        currentUser.email ||
        "Administrator";
    }

    return true;
  }


  /* ========================================================
     ACCESS DENIED
  ======================================================== */

  function renderAccessDenied(
    message
  ) {

    document.body.innerHTML = `
      <div style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#080b12;
        color:white;
        font-family:Arial,sans-serif;
        text-align:center;
        padding:30px;
      ">

        <div>

          <h1>
            Akses Ditolak
          </h1>

          <p style="
            color:#94a3b8;
            margin-bottom:20px;
          ">
            ${escapeHtml(
              message ||
              "Halaman ini hanya dapat diakses administrator GEN-Z.AI."
            )}
          </p>

          <button
            onclick="window.location.href='/'"
            style="
              border:0;
              padding:12px 18px;
              border-radius:9px;
              cursor:pointer;
              font-weight:700;
            "
          >
            Kembali
          </button>

        </div>

      </div>
    `;
  }


  /* ========================================================
     PROVIDER
  ======================================================== */

  async function loadProviders() {

    const providers = [
      "veo",
      "minimax",
      "luma"
    ];

    try {

      const data =
        await workerRequest(
          "/api/admin/providers"
        );

      const list =
        Array.isArray(
          data?.providers
        )
          ? data.providers
          : [];

      const configured =
        new Map(
          list.map(
            item => [
              item.provider,
              Boolean(
                item.configured
              )
            ]
          )
        );

      providers.forEach(
        provider => {

          const input =
            document.getElementById(
              provider + "Key"
            );

          if (!input) {
            return;
          }

          /*
          Jangan pernah menampilkan API key
          yang tersimpan.
          */

          input.value = "";

          input.placeholder =
            configured.get(provider)
              ? "API key sudah tersimpan. Isi untuk mengganti."
              : "Masukkan API key";
        }
      );

    } catch (error) {

      console.error(
        "loadProviders:",
        error
      );

      providers.forEach(
        provider => {

          const input =
            document.getElementById(
              provider + "Key"
            );

          if (input) {

            input.value = "";

            input.placeholder =
              "Gagal membaca status provider";
          }
        }
      );
    }
  }


  async function saveProvider(
    provider
  ) {

    const normalizedProvider =
      String(
        provider || ""
      )
        .trim()
        .toLowerCase();

    if (
      ![
        "veo",
        "minimax",
        "luma"
      ].includes(
        normalizedProvider
      )
    ) {

      showMessage(
        "Provider tidak didukung.",
        "error"
      );

      return;
    }

    const input =
      document.getElementById(
        normalizedProvider + "Key"
      );

    if (!input) {

      showMessage(
        "Input API key tidak ditemukan.",
        "error"
      );

      return;
    }

    const apiKey =
      String(
        input.value || ""
      ).trim();

    if (!apiKey) {

      showMessage(
        "API key wajib diisi.",
        "error"
      );

      return;
    }

    if (apiKey.length > 1000) {

      showMessage(
        "API key tidak valid.",
        "error"
      );

      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/providers",
          {
            method: "POST",

            body: {
              provider:
                normalizedProvider,

              api_key:
                apiKey
            }
          }
        );

      input.value = "";

      showMessage(
        data?.message ||
        `API key ${normalizedProvider} berhasil disimpan.`,
        "success"
      );

      await loadProviders();

    } catch (error) {

      showMessage(
        error.message,
        "error"
      );
    }
  }


  /* ========================================================
     ADMIN MANAGEMENT
  ======================================================== */

  async function loadAdmins() {

    const container =
      document.getElementById(
        "adminList"
      );

    if (!container) {
      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/admins"
        );

      const admins =
        Array.isArray(
          data?.admins
        )
          ? data.admins
          : [];

      if (!admins.length) {

        container.innerHTML =
          `<div class="muted">
            Belum ada administrator.
          </div>`;

        return;
      }

      container.innerHTML =
        admins.map(
          item => {

            const userId =
              String(
                item.user_id || ""
              );

            const email =
              String(
                item.email ||
                "(email tidak ditemukan)"
              );

            const isCurrent =
              userId ===
              currentUser?.id;

            return `
              <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
                padding:10px 0;
                border-bottom:1px solid #1e293b;
              ">

                <div>

                  <div class="admin-email">
                    ${escapeHtml(email)}
                  </div>

                  <div class="muted">
                    ${escapeHtml(userId)}
                  </div>

                </div>

                ${
                  isCurrent
                    ? `
                      <span class="status status-approved">
                        AKUN ANDA
                      </span>
                    `
                    : `
                      <button
                        class="btn btn-danger"
                        onclick="GENZAdmin.removeAdmin('${escapeJs(userId)}')"
                      >
                        Hapus
                      </button>
                    `
                }

              </div>
            `;
          }
        ).join("");

    } catch (error) {

      container.innerHTML = `
        <div class="danger-text">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }


  async function addAdmin() {

    const input =
      document.getElementById(
        "newAdminEmail"
      );

    const email =
      String(
        input?.value || ""
      )
        .trim()
        .toLowerCase();

    if (!email) {

      showMessage(
        "Masukkan email user.",
        "error"
      );

      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/admins/add",
          {
            method: "POST",

            body: {
              email
            }
          }
        );

      showMessage(
        data?.message ||
        "User berhasil menjadi admin.",
        "success"
      );

      if (input) {
        input.value = "";
      }

      await loadAdmins();

      await loadUsers();

    } catch (error) {

      showMessage(
        error.message,
        "error"
      );
    }
  }


  async function removeAdmin(
    userId
  ) {

    if (!userId) {
      return;
    }

    if (
      !confirm(
        "Hapus hak administrator user ini?"
      )
    ) {
      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/admins/remove",
          {
            method: "POST",

            body: {
              user_id:
                userId
            }
          }
        );

      showMessage(
        data?.message ||
        "Hak admin berhasil dihapus.",
        "success"
      );

      await loadAdmins();

      await loadUsers();

    } catch (error) {

      showMessage(
        error.message,
        "error"
      );
    }
  }


  /* ========================================================
     USERS + CREDIT
  ======================================================== */

  async function loadUsers() {

    const tbody =
      document.getElementById(
        "usersTable"
      );

    if (!tbody) {
      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/users"
        );

      const users =
        Array.isArray(
          data?.users
        )
          ? data.users
          : [];

      if (!users.length) {

        tbody.innerHTML = `
          <tr>
            <td colspan="5">
              <div class="empty">
                Belum ada user.
              </div>
            </td>
          </tr>
        `;

        return;
      }

      tbody.innerHTML =
        users.map(
          item => {

            const userId =
              String(
                item.id || ""
              );

            const email =
              String(
                item.email ||
                "(email tidak ditemukan)"
              );

            const credits =
              Number(
                item.credits || 0
              );

            return `
              <tr>

                <td>
                  <strong>
                    ${escapeHtml(email)}
                  </strong>
                </td>

                <td>
                  <small>
                    ${escapeHtml(userId)}
                  </small>
                </td>

                <td>
                  <strong
                    class="credit-value"
                    style="font-size:18px"
                  >
                    ${formatNumber(credits)}
                  </strong>
                </td>

                <td>

                  <input
                    id="credit-${escapeHtml(userId)}"
                    type="number"
                    min="0"
                    step="1"
                    value="${credits}"
                    style="max-width:130px"
                  >

                </td>

                <td>

                  <button
                    class="btn btn-primary"
                    onclick="GENZAdmin.updateCredit('${escapeJs(userId)}')"
                  >
                    Simpan
                  </button>

                </td>

              </tr>
            `;
          }
        ).join("");

    } catch (error) {

      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty danger-text">
              ${escapeHtml(error.message)}
            </div>
          </td>
        </tr>
      `;
    }
  }


  async function updateCredit(
    userId
  ) {

    if (!userId) {
      return;
    }

    const input =
      document.getElementById(
        "credit-" + userId
      );

    if (!input) {

      showMessage(
        "Input credit tidak ditemukan.",
        "error"
      );

      return;
    }

    const credits =
      Number(
        input.value
      );

    if (
      !Number.isInteger(credits) ||
      credits < 0
    ) {

      showMessage(
        "Jumlah credit harus berupa bilangan bulat 0 atau lebih.",
        "error"
      );

      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/credits/adjust",
          {
            method: "POST",

            body: {
              user_id:
                userId,

              credits:
                credits,

              description:
                "Penyesuaian credit oleh admin"
            }
          }
        );

      showMessage(
        data?.message ||
        "Credit berhasil diperbarui.",
        "success"
      );

      await loadUsers();

    } catch (error) {

      showMessage(
        error.message,
        "error"
      );
    }
  }


  /* ========================================================
     TOP UP
  ======================================================== */

  async function loadTopups() {

    const tbody =
      document.getElementById(
        "topupTable"
      );

    if (!tbody) {
      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/topups"
        );

      const topups =
        Array.isArray(
          data?.topups
        )
          ? data.topups
          : [];

      if (!topups.length) {

        tbody.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="empty">
                Belum ada permintaan top-up.
              </div>
            </td>
          </tr>
        `;

        return;
      }

      tbody.innerHTML =
        topups.map(
          item => {

            const id =
              Number(
                item.id || 0
              );

            const email =
              String(
                item.email || ""
              );

            const amount =
              Number(
                item.amount || 0
              );

            const credits =
              Number(
                item.credits || 0
              );

            const status =
              String(
                item.status || "pending"
              ).toLowerCase();

            let statusHtml = "";

            if (
              status === "approved"
            ) {

              statusHtml = `
                <span class="status status-approved">
                  DISETUJUI
                </span>
              `;

            } else if (
              status === "rejected"
            ) {

              statusHtml = `
                <span class="status status-rejected">
                  DITOLAK
                </span>
              `;

            } else {

              statusHtml = `
                <span class="status">
                  MENUNGGU
                </span>
              `;
            }

            let actionHtml = "";

            if (
              status === "pending"
            ) {

              actionHtml = `
                <div style="
                  display:flex;
                  gap:6px;
                  flex-wrap:wrap;
                ">

                  <button
                    class="btn btn-primary"
                    onclick="GENZAdmin.processTopup(${id}, 'approved')"
                  >
                    Setujui
                  </button>

                  <button
                    class="btn btn-danger"
                    onclick="GENZAdmin.processTopup(${id}, 'rejected')"
                  >
                    Tolak
                  </button>

                </div>
              `;

            } else {

              actionHtml = `
                <span class="muted">
                  Selesai
                </span>
              `;
            }

            return `
              <tr>

                <td>
                  <strong>
                    ${escapeHtml(email)}
                  </strong>
                </td>

                <td>
                  ${formatRupiah(amount)}
                </td>

                <td>
                  <strong>
                    ${formatNumber(credits)}
                  </strong>
                </td>

                <td>
                  ${statusHtml}
                </td>

                <td>
                  ${formatDate(item.created_at)}
                </td>

                <td>
                  ${actionHtml}
                </td>

              </tr>
            `;
          }
        ).join("");

    } catch (error) {

      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty danger-text">
              ${escapeHtml(error.message)}
            </div>
          </td>
        </tr>
      `;
    }
  }


  async function processTopup(
    id,
    status
  ) {

    const requestId =
      Number(id);

    const normalizedStatus =
      String(
        status || ""
      )
        .trim()
        .toLowerCase();

    if (
      !Number.isInteger(requestId) ||
      requestId <= 0
    ) {

      showMessage(
        "ID top-up tidak valid.",
        "error"
      );

      return;
    }

    if (
      ![
        "approved",
        "rejected"
      ].includes(
        normalizedStatus
      )
    ) {

      showMessage(
        "Status top-up tidak valid.",
        "error"
      );

      return;
    }

    const question =
      normalizedStatus === "approved"
        ? "Setujui top-up ini? Credit akan ditambahkan ke akun user."
        : "Tolak top-up ini?";

    if (!confirm(question)) {
      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/topups/process",
          {
            method: "POST",

            body: {
              request_id:
                requestId,

              status:
                normalizedStatus
            }
          }
        );

      showMessage(
        data?.message ||
        (
          normalizedStatus === "approved"
            ? "Top-up berhasil disetujui."
            : "Top-up berhasil ditolak."
        ),
        "success"
      );

      await loadTopups();

      await loadUsers();

    } catch (error) {

      showMessage(
        error.message,
        "error"
      );
    }
  }


  /* ========================================================
     ADMIN CONTACT
  ======================================================== */

  async function loadContact() {

    const input =
      document.getElementById(
        "adminContact"
      );

    if (!input) {
      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/contact"
        );

      input.value =
        String(
          data?.url || ""
        );

      input.placeholder =
        "Masukkan link WhatsApp, Telegram, email, atau kontak admin";

    } catch (error) {

      console.error(
        "loadContact:",
        error
      );

      input.placeholder =
        "Gagal mengambil kontak admin";
    }
  }


  async function saveContact() {

    const input =
      document.getElementById(
        "adminContact"
      );

    if (!input) {

      showMessage(
        "Input kontak admin tidak ditemukan.",
        "error"
      );

      return;
    }

    const value =
      String(
        input.value || ""
      ).trim();

    if (value.length > 1000) {

      showMessage(
        "Kontak admin terlalu panjang.",
        "error"
      );

      return;
    }

    try {

      const data =
        await workerRequest(
          "/api/admin/contact",
          {
            method: "POST",

            body: {
              url:
                value
            }
          }
        );

      showMessage(
        data?.message ||
        "Kontak admin berhasil disimpan.",
        "success"
      );

    } catch (error) {

      showMessage(
        error.message,
        "error"
      );
    }
  }


  /* ========================================================
     LOGOUT
  ======================================================== */

  async function logout() {

    try {

      if (supabaseClient) {

        await supabaseClient.auth.signOut();
      }

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    } finally {

      accessToken = null;
      currentUser = null;

      window.location.href =
        "/";
    }
  }


  /* ========================================================
     UTILITIES
  ======================================================== */

  function formatNumber(
    value
  ) {

    return new Intl.NumberFormat(
      "id-ID"
    ).format(
      Number(value || 0)
    );
  }


  function formatRupiah(
    value
  ) {

    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }
    ).format(
      Number(value || 0)
    );
  }


  function formatDate(
    value
  ) {

    if (!value) {
      return "-";
    }

    try {

      return new Date(
        value
      ).toLocaleString(
        "id-ID",
        {
          dateStyle: "medium",
          timeStyle: "short"
        }
      );

    } catch {

      return "-";
    }
  }


  function escapeHtml(
    value
  ) {

    return String(
      value ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  /*
  Untuk nilai yang dipakai di onclick.
  */

  function escapeJs(
    value
  ) {

    return String(
      value ?? ""
    )
      .replace(
        /\\/g,
        "\\\\"
      )
      .replace(
        /'/g,
        "\\'"
      )
      .replace(
        /\r/g,
        "\\r"
      )
      .replace(
        /\n/g,
        "\\n"
      );
  }


  /* ========================================================
     PUBLIC API
  ======================================================== */

  window.GENZAdmin = {

    loadProviders,
    saveProvider,

    loadAdmins,
    addAdmin,
    removeAdmin,

    loadUsers,
    updateCredit,

    loadTopups,
    processTopup,

    loadContact,
    saveContact,

    logout
  };


  /* ========================================================
     EVENTS
  ======================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    async function () {

      if (!initSupabase()) {
        return;
      }

      const allowed =
        await checkAdminAccess();

      if (!allowed) {
        return;
      }

      /*
      Load data secara berurutan.
      Ini sengaja supaya error satu bagian tidak
      membuat seluruh panel berhenti.
      */

      try {
        await loadProviders();
      } catch (error) {
        console.error(
          "Provider load error:",
          error
        );
      }

      try {
        await loadAdmins();
      } catch (error) {
        console.error(
          "Admin load error:",
          error
        );
      }

      try {
        await loadUsers();
      } catch (error) {
        console.error(
          "User load error:",
          error
        );
      }

      try {
        await loadTopups();
      } catch (error) {
        console.error(
          "Topup load error:",
          error
        );
      }

      try {
        await loadContact();
      } catch (error) {
        console.error(
          "Contact load error:",
          error
        );
      }


      /* Logout */

      const logoutButton =
        document.getElementById(
          "logoutButton"
        );

      if (logoutButton) {

        logoutButton.addEventListener(
          "click",
          logout
        );
      }


      /* Add admin */

      const addAdminButton =
        document.getElementById(
          "addAdminButton"
        );

      if (addAdminButton) {

        addAdminButton.addEventListener(
          "click",
          addAdmin
        );
      }


      /* Save contact */

      const saveContactButton =
        document.getElementById(
          "saveContactButton"
        );

      if (saveContactButton) {

        saveContactButton.addEventListener(
          "click",
          saveContact
        );
      }

    }
  );

})();
