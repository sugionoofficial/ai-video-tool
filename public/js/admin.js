/* =========================================================
   GEN-Z.AI - ADMIN PANEL
   public/js/admin.js
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

    section: "dashboard",

    jobs: [],

    events: [],

    providers: [],

    topups: [],

    users: [],

    admins: [],

    selectedUser: null,

    loading: false

  };


  /* =======================================================
     HELPERS
  ======================================================= */

  function $(id) {
    return document.getElementById(id);
  }


  async function token() {

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
      await token();


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


  function esc(value) {

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


  function formatDate(value) {

    if (!value) {
      return "-";
    }


    try {

      return new Date(value)
        .toLocaleString(
          "id-ID",
          {
            dateStyle: "medium",
            timeStyle: "short"
          }
        );

    } catch (_) {

      return String(value);

    }

  }


  function formatNumber(value) {

    return Number(
      value || 0
    ).toLocaleString(
      "id-ID"
    );

  }


  function statusBadge(status) {

    const safe =
      String(
        status || "unknown"
      ).toLowerCase();


    return `
      <span class="
        admin-status
        admin-status-${esc(safe)}
      ">
        ${esc(safe)}
      </span>
    `;

  }


  function setStatus(
    message,
    type = ""
  ) {

    const element =
      $("adminStatus");

    if (!element) {
      return;
    }


    element.className =
      `admin-status-message ${type}`;


    element.textContent =
      message || "";

  }


  /* =======================================================
     AUTH CHECK
     
     Admin hanya dianggap valid apabila:
     1. Backend sudah mengembalikan isAdmin = true
     2. Role tersebut sudah divalidasi server
     
     Tidak menggunakan email atau username.
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
     LOAD
  ======================================================= */

  async function load() {

    /*
     * Jangan pernah membuka Admin Panel
     * sebelum role berhasil divalidasi.
     */

    if (!isAdmin()) {

      renderDenied();

      return;

    }


    const container =
      $("pageContent") ||
      $("content");


    if (!container) {

      console.error(
        "[GEN-Z.AI] Admin container tidak ditemukan."
      );

      return;

    }


    container.innerHTML = `

      <section
        class="admin-page"
        id="adminPage">

        <div class="admin-header">

          <button
            type="button"
            class="back-btn"
            id="adminBack">
            ←
          </button>

          <div>

            <h2>
              Panel Admin
            </h2>

            <p>
              Kelola GEN-Z.AI
            </p>

          </div>

        </div>


        <div
          id="adminStatus"
          class="admin-status-message">
        </div>


        <nav
          class="admin-tabs"
          id="adminTabs">

          <button
            type="button"
            data-admin-section="dashboard">
            Dashboard
          </button>

          <button
            type="button"
            data-admin-section="users">
            Users
          </button>

          <button
            type="button"
            data-admin-section="providers">
            Providers
          </button>

          <button
            type="button"
            data-admin-section="topups">
            Top-up
          </button>

          <button
            type="button"
            data-admin-section="jobs">
            Jobs
          </button>

          <button
            type="button"
            data-admin-section="admins">
            Admin
          </button>

          <button
            type="button"
            data-admin-section="contact">
            Kontak
          </button>

        </nav>


        <div
          id="adminContent">
        </div>

      </section>

    `;


    bind();


    await showSection(
      "dashboard"
    );

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
            id="adminDeniedBack">
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
      $("adminDeniedBack");


    if (back) {

      back.addEventListener(
        "click",
        () => {

          if (
            typeof GENZ.emit === "function"
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
     EVENTS
  ======================================================= */

  function bind() {

    const back =
      $("adminBack");


    if (back) {

      back.addEventListener(
        "click",
        () => {

          if (
            typeof GENZ.emit === "function"
          ) {

            GENZ.emit(
              "show-studio"
            );

          }

        }
      );

    }


    document
      .querySelectorAll(
        "[data-admin-section]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              showSection(
                button.dataset.adminSection
              );

            }
          );

        }
      );

  }


  /* =======================================================
     SECTION
  ======================================================= */

  async function showSection(
    section
  ) {

    /*
     * Validasi ulang setiap perpindahan section.
     */

    if (!isAdmin()) {

      renderDenied();

      return;

    }


    state.section =
      section;


    document
      .querySelectorAll(
        "[data-admin-section]"
      )
      .forEach(
        button => {

          button.classList.toggle(
            "active",
            button.dataset.adminSection ===
            section
          );

        }
      );


    const content =
      $("adminContent");


    if (!content) {
      return;
    }


    content.innerHTML = `

      <div class="admin-loading">
        Memuat...
      </div>

    `;


    try {

      switch (section) {

        case "dashboard":
          await renderDashboard();
          break;

        case "users":
          await renderUsers();
          break;

        case "providers":
          await renderProviders();
          break;

        case "topups":
          await renderTopups();
          break;

        case "jobs":
          await renderJobs();
          break;

        case "admins":
          await renderAdmins();
          break;

        case "contact":
          await renderContact();
          break;

        default:
          await renderDashboard();

      }

    } catch (error) {

      console.error(
        "[GEN-Z.AI] Admin error:",
        error
      );


      content.innerHTML = `

        <div class="admin-error">

          <strong>
            Gagal memuat data
          </strong>

          <p>
            ${esc(
              error?.message ||
              "Terjadi kesalahan."
            )}
          </p>

        </div>

      `;

    }

  }


  /* =======================================================
     DASHBOARD
  ======================================================= */

  async function renderDashboard() {

    const [
      usersResponse,
      providersResponse,
      topupResponse,
      jobsResponse
    ] = await Promise.all([

      api(
        "/api/admin/users"
      ),

      api(
        "/api/admin/providers"
      ),

      api(
        "/api/admin/topup-requests?status=pending&limit=100"
      ),

      api(
        "/api/admin/jobs?limit=100"
      )

    ]);


    state.users =
      usersResponse.users || [];


    state.providers =
      providersResponse.providers || [];


    state.topups =
      topupResponse.requests || [];


    state.jobs =
      jobsResponse.jobs || [];


    const completed =
      state.jobs.filter(
        job =>
          job.status === "completed"
      ).length;


    const processing =
      state.jobs.filter(
        job =>
          job.status === "processing" ||
          job.status === "reserved"
      ).length;


    const failed =
      state.jobs.filter(
        job =>
          job.status === "failed"
      ).length;


    const credits =
      state.users.reduce(
        (
          total,
          user
        ) =>
          total +
          Number(
            user.credits || 0
          ),
        0
      );


    $("adminContent").innerHTML = `

      <div class="admin-dashboard">

        <div class="admin-stat-grid">

          <div class="admin-stat">

            <span>
              Total User
            </span>

            <strong>
              ${formatNumber(
                state.users.length
              )}
            </strong>

          </div>


          <div class="admin-stat">

            <span>
              Total Kredit
            </span>

            <strong>
              ${formatNumber(
                credits
              )}
            </strong>

          </div>


          <div class="admin-stat">

            <span>
              Provider Aktif
            </span>

            <strong>
              ${formatNumber(
                state.providers.filter(
                  provider =>
                    provider.enabled
                ).length
              )}
            </strong>

          </div>


          <div class="admin-stat">

            <span>
              Top-up Pending
            </span>

            <strong>
              ${formatNumber(
                state.topups.length
              )}
            </strong>

          </div>


          <div class="admin-stat">

            <span>
              Job Berhasil
            </span>

            <strong>
              ${formatNumber(
                completed
              )}
            </strong>

          </div>


          <div class="admin-stat">

            <span>
              Job Diproses
            </span>

            <strong>
              ${formatNumber(
                processing
              )}
            </strong>

          </div>


          <div class="admin-stat">

            <span>
              Job Gagal
            </span>

            <strong>
              ${formatNumber(
                failed
              )}
            </strong>

          </div>

        </div>


        <div class="admin-card">

          <div class="admin-card-header">

            <h3>
              Provider
            </h3>

            <button
              type="button"
              data-admin-section="providers">
              Kelola
            </button>

          </div>


          <div class="admin-list">

            ${
              state.providers.length
                ? state.providers.map(
                    provider => `

                      <div
                        class="admin-list-row">

                        <div>

                          <strong>
                            ${esc(
                              provider.name
                            )}
                          </strong>

                          <small>
                            ${esc(
                              provider.adapter ||
                              provider.id ||
                              "-"
                            )}
                          </small>

                        </div>

                        ${
                          provider.enabled
                            ? statusBadge(
                                "enabled"
                              )
                            : statusBadge(
                                "disabled"
                              )
                        }

                      </div>

                    `
                  ).join("")
                : `

                  <div class="admin-empty">
                    Belum ada provider.
                  </div>

                `
            }

          </div>

        </div>


        <div class="admin-card">

          <div class="admin-card-header">

            <h3>
              Top-up Pending
            </h3>

            <button
              type="button"
              data-admin-section="topups">
              Kelola
            </button>

          </div>


          ${
            state.topups.length
              ? state.topups
                  .slice(0, 5)
                  .map(
                    topup => `

                      <div
                        class="admin-list-row">

                        <div>

                          <strong>
                            ${formatNumber(
                              topup.amount
                            )} Kredit
                          </strong>

                          <small>
                            ${esc(
                              topup.user_id
                            )}
                          </small>

                        </div>

                        ${statusBadge(
                          topup.status
                        )}

                      </div>

                    `
                  ).join("")
              : `

                <div class="admin-empty">
                  Tidak ada top-up pending.
                </div>

              `
          }

        </div>

      </div>

    `;


    $("adminContent")
      .querySelectorAll(
        "[data-admin-section]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () =>
              showSection(
                button.dataset.adminSection
              )
          );

        }
      );

  }


  /* =======================================================
     USERS
  ======================================================= */

  async function renderUsers() {

    const response =
      await api(
        "/api/admin/users"
      );


    state.users =
      response.users || [];


    $("adminContent").innerHTML = `

      <div class="admin-card">

        <div class="admin-card-header">

          <h3>
            Users
          </h3>

          <button
            type="button"
            id="refreshUsers">
            Refresh
          </button>

        </div>


        <div class="admin-table-wrap">

          <table class="admin-table">

            <thead>

              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Kredit</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>

            </thead>


            <tbody>

              ${
                state.users.length
                  ? state.users.map(
                      user => `

                        <tr>

                          <td>
                            ${esc(
                              user.email
                            )}
                          </td>

                          <td>
                            ${esc(
                              user.role ||
                              "user"
                            )}
                          </td>

                          <td>
                            ${formatNumber(
                              user.credits
                            )}
                          </td>

                          <td>
                            ${formatDate(
                              user.created_at
                            )}
                          </td>

                          <td>

                            <button
                              type="button"
                              class="admin-small-btn"
                              data-user-id="${esc(
                                user.id
                              )}"
                              data-user-action="credit">
                              Kredit
                            </button>

                            <button
                              type="button"
                              class="admin-small-btn"
                              data-user-id="${esc(
                                user.id
                              )}"
                              data-user-action="transactions">
                              Riwayat
                            </button>

                          </td>

                        </tr>

                      `
                    ).join("")
                  : `

                    <tr>

                      <td colspan="5">
                        Tidak ada user.
                      </td>

                    </tr>

                  `
              }

            </tbody>

          </table>

        </div>

      </div>


      <div
        id="userAdminPanel">
      </div>

    `;


    $("refreshUsers")
      ?.addEventListener(
        "click",
        () => renderUsers()
      );


    $("adminContent")
      .querySelectorAll(
        "[data-user-action]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const userId =
                button.dataset.userId;

              const action =
                button.dataset.userAction;


              if (
                action === "credit"
              ) {

                showCreditAdjustment(
                  userId
                );

              }


              if (
                action === "transactions"
              ) {

                showTransactions(
                  userId
                );

              }

            }
          );

        }
      );

  }


  /* =======================================================
     CREDIT ADJUSTMENT
  ======================================================= */

  function showCreditAdjustment(
    userId
  ) {

    const user =
      state.users.find(
        item =>
          String(item.id) ===
          String(userId)
      );


    const panel =
      $("userAdminPanel");


    if (!panel) {
      return;
    }


    panel.innerHTML = `

      <div class="admin-card">

        <h3>
          Penyesuaian Kredit
        </h3>

        <p>
          ${esc(
            user?.email ||
            userId
          )}
        </p>


        <form id="creditAdjustForm">

          <input
            type="hidden"
            id="creditUserId"
            value="${esc(userId)}"
          >


          <label>
            Jumlah Kredit
          </label>

          <input
            id="creditAmount"
            type="number"
            step="1"
            placeholder="Contoh: 100 atau -100"
            required
          >


          <label>
            Catatan
          </label>

          <textarea
            id="creditNote"
            rows="3"
            placeholder="Alasan penyesuaian kredit"
          ></textarea>


          <button
            type="submit"
            class="admin-primary-btn">
            Simpan
          </button>

        </form>


        <div
          id="creditAdjustStatus">
        </div>

      </div>

    `;


    $("creditAdjustForm")
      ?.addEventListener(
        "submit",
        async event => {

          event.preventDefault();


          const amount =
            Number(
              $("creditAmount")?.value
            );


          const note =
            $("creditNote")?.value.trim() ||
            "Admin adjustment";


          const status =
            $("creditAdjustStatus");


          if (
            !Number.isInteger(amount) ||
            amount === 0
          ) {

            if (status) {

              status.textContent =
                "Jumlah kredit harus integer dan bukan 0.";

            }

            return;

          }


          try {

            if (status) {

              status.textContent =
                "Menyimpan...";

            }


            await api(
              "/api/admin/credits/adjust",
              {
                method: "POST",
                body: JSON.stringify({
                  user_id: userId,
                  amount,
                  note
                })
              }
            );


            if (status) {

              status.textContent =
                "Kredit berhasil diperbarui.";

            }


            await renderUsers();


          } catch (error) {

            if (status) {

              status.textContent =
                error?.message ||
                "Gagal memperbarui kredit.";

            }

          }

        }
      );

  }


  /* =======================================================
     USER TRANSACTIONS
  ======================================================= */

  async function showTransactions(
    userId
  ) {

    const panel =
      $("userAdminPanel");


    if (!panel) {
      return;
    }


    panel.innerHTML = `

      <div class="admin-card">
        Memuat riwayat...
      </div>

    `;


    try {

      const response =
        await api(
          `/api/admin/transactions?user_id=${encodeURIComponent(
            userId
          )}`
        );


      const transactions =
        response.transactions || [];


      panel.innerHTML = `

        <div class="admin-card">

          <h3>
            Riwayat Kredit
          </h3>


          ${
            transactions.length
              ? transactions.map(
                  transaction => `

                    <div
                      class="admin-list-row">

                      <div>

                        <strong>
                          ${formatNumber(
                            transaction.amount
                          )}
                        </strong>

                        <small>
                          ${esc(
                            transaction.type
                          )}
                          ·
                          ${formatDate(
                            transaction.created_at
                          )}
                        </small>

                      </div>


                      <span>
                        Saldo:
                        ${formatNumber(
                          transaction.balance_after
                        )}
                      </span>

                    </div>

                  `
                ).join("")
              : `

                <div class="admin-empty">
                  Belum ada transaksi.
                </div>

              `
          }

        </div>

      `;

    } catch (error) {

      panel.innerHTML = `

        <div class="admin-error">

          ${esc(
            error?.message ||
            "Gagal memuat transaksi."
          )}

        </div>

      `;

    }

  }


  /* =======================================================
     PROVIDERS
  ======================================================= */

  async function renderProviders() {

    const response =
      await api(
        "/api/admin/providers"
      );


    state.providers =
      response.providers || [];


    $("adminContent").innerHTML = `

      <div class="admin-card">

        <div class="admin-card-header">

          <h3>
            Provider
          </h3>

          <button
            type="button"
            id="addProviderBtn">
            + Tambah
          </button>

        </div>


        <div
          id="providerList">

          ${
            state.providers.length
              ? state.providers.map(
                  provider => `

                    <div
                      class="admin-list-row">

                      <div>

                        <strong>
                          ${esc(
                            provider.name
                          )}
                        </strong>

                        <small>

                          ID:
                          ${esc(
                            provider.id
                          )}

                          · Adapter:
                          ${esc(
                            provider.adapter ||
                            "-"
                          )}

                          · API Key:
                          ${
                            provider.apiKeySet
                              ? "tersedia"
                              : "belum ada"
                          }

                        </small>

                      </div>


                      <div
                        class="admin-actions">

                        ${
                          provider.enabled
                            ? `

                              <button
                                type="button"
                                data-provider-action="toggle"
                                data-provider-id="${esc(
                                  provider.id
                                )}">
                                Nonaktifkan
                              </button>

                            `
                            : `

                              <button
                                type="button"
                                data-provider-action="toggle"
                                data-provider-id="${esc(
                                  provider.id
                                )}">
                                Aktifkan
                              </button>

                            `
                        }


                        <button
                          type="button"
                          data-provider-action="edit"
                          data-provider-id="${esc(
                            provider.id
                          )}">
                          Edit
                        </button>


                        <button
                          type="button"
                          data-provider-action="delete"
                          data-provider-id="${esc(
                            provider.id
                          )}">
                          Hapus
                        </button>

                      </div>

                    </div>

                  `
                ).join("")
              : `

                <div class="admin-empty">
                  Belum ada provider.
                </div>

              `
          }

        </div>

      </div>


      <div
        id="providerEditor">
      </div>

    `;


    $("addProviderBtn")
      ?.addEventListener(
        "click",
        () => showProviderEditor()
      );


    $("adminContent")
      .querySelectorAll(
        "[data-provider-action]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const action =
                button.dataset.providerAction;

              const id =
                button.dataset.providerId;


              if (
                action === "toggle"
              ) {

                toggleProvider(id);

              }


              if (
                action === "edit"
              ) {

                showProviderEditor(id);

              }


              if (
                action === "delete"
              ) {

                deleteProvider(id);

              }

            }
          );

        }
      );

  }


  /* =======================================================
     PROVIDER EDITOR
  ======================================================= */

  function showProviderEditor(
    providerId = null
  ) {

    const provider =
      state.providers.find(
        item =>
          String(item.id) ===
          String(providerId)
      );


    const editor =
      $("providerEditor");


    if (!editor) {
      return;
    }


    editor.innerHTML = `

      <div class="admin-card">

        <h3>

          ${
            provider
              ? "Edit Provider"
              : "Tambah Provider"
          }

        </h3>


        <form id="providerForm">

          ${
            provider
              ? `

                <input
                  type="hidden"
                  id="providerId"
                  value="${esc(
                    provider.id
                  )}"
                >

              `
              : `

                <label>
                  ID Provider
                </label>

                <input
                  id="providerId"
                  placeholder="contoh: gemini-production"
                  required
                >

              `
          }


          <label>
            Nama Provider
          </label>

          <input
            id="providerName"
            value="${esc(
              provider?.name || ""
            )}"
            placeholder="Nama provider"
            required
          >


          <label>
            Adapter
          </label>

          <select
            id="providerAdapter">

            <option
              value="veo"
              ${
                provider?.adapter === "veo"
                  ? "selected"
                  : ""
              }>
              Gemini / Veo
            </option>

            <option
              value="minimax"
              ${
                provider?.adapter === "minimax"
                  ? "selected"
                  : ""
              }>
              MiniMax
            </option>

            <option
              value="luma"
              ${
                provider?.adapter === "luma"
                  ? "selected"
                  : ""
              }>
              Luma
            </option>

          </select>


          <label>
            API Key
          </label>

          <input
            id="providerApiKey"
            type="password"
            autocomplete="new-password"
            placeholder="${
              provider
                ? "Kosongkan jika tidak diubah"
                : "Masukkan API key"
            }"
          >


          <label>
            Config JSON
          </label>

          <textarea
            id="providerConfig"
            rows="6"
            placeholder="{}"
          >${
            provider?.config
              ? JSON.stringify(
                  provider.config,
                  null,
                  2
                )
              : "{}"
          }</textarea>


          <label
            class="admin-checkbox">

            <input
              id="providerEnabled"
              type="checkbox"
              ${
                provider?.enabled !== false
                  ? "checked"
                  : ""
              }
            >

            Aktif

          </label>


          <div
            class="admin-actions">

            <button
              type="submit"
              class="admin-primary-btn">
              Simpan
            </button>

            <button
              type="button"
              id="cancelProvider">
              Batal
            </button>

          </div>


          <div
            id="providerFormStatus">
          </div>

        </form>

      </div>

    `;


    $("cancelProvider")
      ?.addEventListener(
        "click",
        () => {

          editor.innerHTML = "";

        }
      );


    $("providerForm")
      ?.addEventListener(
        "submit",
        event => {

          event.preventDefault();

          saveProvider(
            providerId
          );

        }
      );

  }


  /* =======================================================
     SAVE PROVIDER
  ======================================================= */

  async function saveProvider(
    existingId
  ) {

    const id =
      $("providerId")
        ?.value
        .trim();


    const name =
      $("providerName")
        ?.value
        .trim();


    const adapter =
      $("providerAdapter")
        ?.value;


    const apiKey =
      $("providerApiKey")
        ?.value
        .trim();


    const enabled =
      $("providerEnabled")
        ?.checked;


    const configText =
      $("providerConfig")
        ?.value
        .trim() ||
      "{}";


    const status =
      $("providerFormStatus");


    if (!id) {

      if (status) {

        status.textContent =
          "ID provider wajib diisi.";

      }

      return;

    }


    if (!name) {

      if (status) {

        status.textContent =
          "Nama provider wajib diisi.";

      }

      return;

    }


    let config;


    try {

      config =
        JSON.parse(
          configText
        );

    } catch (_) {

      if (status) {

        status.textContent =
          "Config JSON tidak valid.";

      }

      return;

    }


    if (
      !config ||
      typeof config !== "object" ||
      Array.isArray(config)
    ) {

      if (status) {

        status.textContent =
          "Config harus berupa object JSON.";

      }

      return;

    }


    try {

      if (status) {

        status.textContent =
          "Menyimpan...";

      }


      if (existingId) {

        const body = {

          name,

          adapter,

          enabled,

          config

        };


        /*
         * API key hanya dikirim jika admin
         * benar-benar memasukkan key baru.
         */

        if (apiKey) {

          body.api_key =
            apiKey;

        }


        await api(
          `/api/admin/providers/${encodeURIComponent(
            existingId
          )}`,
          {
            method: "PUT",
            body:
              JSON.stringify(
                body
              )
          }
        );

      } else {

        if (!apiKey) {

          throw new Error(
            "API key wajib diisi."
          );

        }


        await api(
          "/api/admin/providers",
          {
            method: "POST",
            body:
              JSON.stringify({

                id,

                name,

                adapter,

                api_key:
                  apiKey,

                enabled,

                config

              })
          }
        );

      }


      await renderProviders();

    } catch (error) {

      if (status) {

        status.textContent =
          error?.message ||
          "Gagal menyimpan provider.";

      }

    }

  }


  /* =======================================================
     TOGGLE PROVIDER
  ======================================================= */

  async function toggleProvider(
    id
  ) {

    try {

      await api(
        `/api/admin/providers/${encodeURIComponent(
          id
        )}/toggle`,
        {
          method: "POST"
        }
      );


      await renderProviders();

    } catch (error) {

      alert(
        error?.message ||
        "Gagal mengubah status provider."
      );

    }

  }


  /* =======================================================
     DELETE PROVIDER
  ======================================================= */

  async function deleteProvider(
    id
  ) {

    if (
      !confirm(
        `Hapus provider "${id}"?`
      )
    ) {

      return;

    }


    try {

      await api(
        `/api/admin/providers/${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE"
        }
      );


      await renderProviders();

    } catch (error) {

      alert(
        error?.message ||
        "Gagal menghapus provider."
      );

    }

  }


  /* =======================================================
     TOP-UP
  ======================================================= */

  async function renderTopups() {

    const response =
      await api(
        "/api/admin/topup-requests?status=all&limit=200"
      );


    state.topups =
      response.requests || [];


    $("adminContent").innerHTML = `

      <div class="admin-card">

        <div class="admin-card-header">

          <h3>
            Permintaan Top-up
          </h3>

          <button
            type="button"
            id="refreshTopups">
            Refresh
          </button>

        </div>


        <div class="admin-list">

          ${
            state.topups.length
              ? state.topups.map(
                  topup => `

                    <div
                      class="admin-list-row">

                      <div>

                        <strong>
                          ${formatNumber(
                            topup.amount
                          )} Kredit
                        </strong>

                        <small>

                          User:
                          ${esc(
                            topup.user_id
                          )}

                          ·

                          ${formatDate(
                            topup.created_at
                          )}

                        </small>

                        ${
                          topup.note
                            ? `

                              <small>

                                Catatan:
                                ${esc(
                                  topup.note
                                )}

                              </small>

                            `
                            : ""
                        }

                      </div>


                      <div
                        class="admin-actions">

                        ${statusBadge(
                          topup.status
                        )}


                        ${
                          topup.status ===
                          "pending"
                            ? `

                              <button
                                type="button"
                                data-topup-action="approve"
                                data-topup-id="${esc(
                                  topup.id
                                )}">
                                Setujui
                              </button>

                              <button
                                type="button"
                                data-topup-action="reject"
                                data-topup-id="${esc(
                                  topup.id
                                )}">
                                Tolak
                              </button>

                            `
                            : ""
                        }

                      </div>

                    </div>

                  `
                ).join("")
              : `

                <div class="admin-empty">
                  Belum ada request top-up.
                </div>

              `
          }

        </div>

      </div>

    `;


    $("refreshTopups")
      ?.addEventListener(
        "click",
        () => renderTopups()
      );


    $("adminContent")
      .querySelectorAll(
        "[data-topup-action]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              reviewTopup(
                button.dataset.topupId,
                button.dataset.topupAction
              );

            }
          );

        }
      );

  }


  /* =======================================================
     REVIEW TOP-UP
  ======================================================= */

  async function reviewTopup(
    id,
    action
  ) {

    const label =
      action === "approve"
        ? "menyetujui"
        : "menolak";


    const note =
      prompt(
        `Catatan admin untuk ${label} top-up:`
      );


    if (note === null) {
      return;
    }


    try {

      await api(
        `/api/admin/topup-requests/${encodeURIComponent(
          id
        )}/${action}`,
        {
          method: "POST",
          body:
            JSON.stringify({
              note
            })
        }
      );


      await renderTopups();

    } catch (error) {

      alert(
        error?.message ||
        "Gagal memproses top-up."
      );

    }

  }


  /* =======================================================
     JOBS
  ======================================================= */

  async function renderJobs() {

    const response =
      await api(
        "/api/admin/jobs?limit=200"
      );


    state.jobs =
      response.jobs || [];


    $("adminContent").innerHTML = `

      <div class="admin-card">

        <div class="admin-card-header">

          <h3>
            Video Jobs
          </h3>

          <button
            type="button"
            id="refreshJobs">
            Refresh
          </button>

        </div>


        <div class="admin-table-wrap">

          <table class="admin-table">

            <thead>

              <tr>

                <th>
                  Provider
                </th>

                <th>
                  Status
                </th>

                <th>
                  Model
                </th>

                <th>
                  Credit
                </th>

                <th>
                  Created
                </th>

                <th>
                  Error
                </th>

              </tr>

            </thead>


            <tbody>

              ${
                state.jobs.length
                  ? state.jobs.map(
                      job => `

                        <tr>

                          <td>
                            ${esc(
                              job.provider
                            )}
                          </td>

                          <td>
                            ${statusBadge(
                              job.status
                            )}
                          </td>

                          <td>
                            ${esc(
                              job.model
                            )}
                          </td>

                          <td>
                            ${formatNumber(
                              job.credit_cost
                            )}
                          </td>

                          <td>
                            ${formatDate(
                              job.created_at
                            )}
                          </td>

                          <td>

                            ${
                              job.last_error
                                ? esc(
                                    job.last_error
                                  )
                                : "-"
                            }

                          </td>

                        </tr>

                      `
                    ).join("")
                  : `

                    <tr>

                      <td colspan="6">
                        Belum ada job.
                      </td>

                    </tr>

                  `
              }

            </tbody>

          </table>

        </div>


        <div
          id="jobEvents"
          class="admin-events">
        </div>

      </div>

    `;


    $("refreshJobs")
      ?.addEventListener(
        "click",
        () => renderJobs()
      );

  }


  /* =======================================================
     ADMINS
  ======================================================= */

  async function renderAdmins() {

    const response =
      await api(
        "/api/admin/admins"
      );


    state.admins =
      response.admins || [];


    $("adminContent").innerHTML = `

      <div class="admin-card">

        <div class="admin-card-header">

          <h3>
            Administrator
          </h3>

        </div>


        <form
          id="addAdminForm"
          class="admin-inline-form">

          <input
            id="adminEmail"
            type="email"
            placeholder="Email user yang sudah terdaftar"
            required
          >

          <button
            type="submit"
            class="admin-primary-btn">
            Tambah Admin
          </button>

        </form>


        <div
          id="adminFormStatus">
        </div>


        <div class="admin-list">

          ${
            state.admins.length
              ? state.admins.map(
                  admin => `

                    <div
                      class="admin-list-row">

                      <div>

                        <strong>
                          ${esc(
                            admin.email ||
                            admin.user_id
                          )}
                        </strong>

                        <small>
                          ${esc(
                            admin.role ||
                            "admin"
                          )}
                        </small>

                      </div>


                      <button
                        type="button"
                        data-remove-admin="${esc(
                          admin.user_id
                        )}">
                        Hapus
                      </button>

                    </div>

                  `
                ).join("")
              : `

                <div class="admin-empty">
                  Belum ada admin.
                </div>

              `
          }

        </div>

      </div>

    `;


    $("addAdminForm")
      ?.addEventListener(
        "submit",
        event => {

          event.preventDefault();

          addAdmin();

        }
      );


    $("adminContent")
      .querySelectorAll(
        "[data-remove-admin]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () =>
              removeAdmin(
                button.dataset.removeAdmin
              )
          );

        }
      );

  }


  /* =======================================================
     ADD ADMIN
  ======================================================= */

  async function addAdmin() {

    const email =
      $("adminEmail")
        ?.value
        .trim();


    const status =
      $("adminFormStatus");


    if (!email) {

      if (status) {

        status.textContent =
          "Email wajib diisi.";

      }

      return;

    }


    try {

      if (status) {

        status.textContent =
          "Menambahkan...";

      }


      await api(
        "/api/admin/admins/add",
        {
          method: "POST",
          body:
            JSON.stringify({
              email
            })
        }
      );


      await renderAdmins();

    } catch (error) {

      if (status) {

        status.textContent =
          error?.message ||
          "Gagal menambahkan admin.";

      }

    }

  }


  /* =======================================================
     REMOVE ADMIN
  ======================================================= */

  async function removeAdmin(
    userId
  ) {

    if (
      !confirm(
        "Hapus akses admin user ini?"
      )
    ) {

      return;

    }


    try {

      await api(
        "/api/admin/admins/remove",
        {
          method: "POST",
          body:
            JSON.stringify({
              user_id: userId
            })
        }
      );


      await renderAdmins();

    } catch (error) {

      alert(
        error?.message ||
        "Gagal menghapus akses admin."
      );

    }

  }


  /* =======================================================
     CONTACT ADMIN
  ======================================================= */

  async function renderContact() {

    const response =
      await api(
        "/api/admin/contact"
      );


    const currentUrl =
      response.url || "";


    $("adminContent").innerHTML = `

      <div class="admin-card">

        <h3>
          Kontak Admin
        </h3>

        <p>
          URL ini digunakan untuk tombol
          Chat Admin.
        </p>


        <form
          id="contactForm">

          <label>
            URL Kontak
          </label>

          <input
            id="adminContactUrl"
            type="url"
            value="${esc(
              currentUrl
            )}"
            placeholder="https://..."
          >


          <button
            type="submit"
            class="admin-primary-btn">
            Simpan
          </button>

        </form>


        <div
          id="contactStatus">
        </div>

      </div>

    `;


    $("contactForm")
      ?.addEventListener(
        "submit",
        event => {

          event.preventDefault();

          saveContact();

        }
      );

  }


  /* =======================================================
     SAVE CONTACT
  ======================================================= */

  async function saveContact() {

    const url =
      $("adminContactUrl")
        ?.value
        .trim() ||
      "";


    const status =
      $("contactStatus");


    try {

      if (status) {

        status.textContent =
          "Menyimpan...";

      }


      await api(
        "/api/admin/contact",
        {
          method: "POST",
          body:
            JSON.stringify({
              url
            })
        }
      );


      if (status) {

        status.textContent =
          "Kontak admin berhasil disimpan.";

      }

    } catch (error) {

      if (status) {

        status.textContent =
          error?.message ||
          "Gagal menyimpan kontak admin.";

      }

    }

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.admin = {

    load,

    showSection,

    refresh: load,

    state

  };


})();
