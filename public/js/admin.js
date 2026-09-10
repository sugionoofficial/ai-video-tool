"use strict";

/*
============================================================
GEN-Z.AI ADMIN PANEL
============================================================

Fitur:

- Proteksi admin
- Provider API key
- Multiple admin
- User credit
- Top up request
- Admin contact
- Tidak menggunakan service-role key
- Tidak menyimpan API key provider di browser

============================================================
*/

(function () {

  let supabaseClient = null;
  let currentUser = null;


  /*
  ==========================================================
  INITIALIZE SUPABASE
  ==========================================================
  */

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


  /*
  ==========================================================
  MESSAGE
  ==========================================================
  */

  function showMessage(
    message,
    type = "info"
  ) {

    const box =
      document.getElementById(
        "adminMessage"
      );

    if (!box) {
      return;
    }

    box.textContent = message;
    box.style.display = "block";

    if (type === "error") {
      box.style.background = "#991b1b";
    }
    else if (type === "success") {
      box.style.background = "#166534";
    }
    else {
      box.style.background = "#111827";
    }

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {

      box.style.display = "none";

    }, 4000);
  }


  /*
  ==========================================================
  AUTH CHECK
  ==========================================================
  */

  async function checkAdminAccess() {

    const {
      data: {
        session
      },
      error
    } =
      await supabaseClient.auth.getSession();

    if (error || !session) {

      window.location.href = "/";

      return false;
    }

    currentUser =
      session.user;

    const {
      data: role,
      error: roleError
    } =
      await supabaseClient
        .from("user_roles")
        .select("role")
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();

    if (
      roleError ||
      !role ||
      role.role !== "admin"
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
              Halaman ini hanya dapat diakses
              administrator GEN-Z.AI.
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

      return false;
    }

    const email =
      document.getElementById(
        "adminEmail"
      );

    if (email) {

      email.textContent =
        currentUser.email;
    }

    return true;
  }


  /*
  ==========================================================
  PROVIDER API KEY
  ==========================================================
  */

  async function loadProviders() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("admin_provider_keys")
        .select(
          "provider,api_key"
        );

    if (error) {

      showMessage(
        "Gagal membaca provider API.",
        "error"
      );

      return;
    }

    for (
      const item of data || []
    ) {

      const input =
        document.getElementById(
          item.provider + "Key"
        );

      if (!input) {
        continue;
      }

      if (item.api_key) {

        input.placeholder =
          "API key sudah tersimpan";

      }
    }
  }


  async function saveProvider(
    provider
  ) {

    const input =
      document.getElementById(
        provider + "Key"
      );

    if (!input) {
      return;
    }

    const apiKey =
      String(
        input.value || ""
      ).trim();

    if (!apiKey) {

      showMessage(
        "API key belum diisi.",
        "error"
      );

      return;
    }

    const {
      error
    } =
      await supabaseClient
        .from(
          "admin_provider_keys"
        )
        .upsert(
          {
            provider,
            api_key: apiKey,
            updated_at:
              new Date().toISOString()
          },
          {
            onConflict:
              "provider"
          }
        );

    if (error) {

      showMessage(
        "Gagal menyimpan API key: " +
        error.message,
        "error"
      );

      return;
    }

    input.value = "";

    input.placeholder =
      "API key sudah tersimpan";

    showMessage(
      "API key " +
      provider +
      " berhasil disimpan.",
      "success"
    );
  }


  /*
  ==========================================================
  ADMIN MANAGEMENT
  ==========================================================
  */

  async function loadAdmins() {

    const container =
      document.getElementById(
        "adminList"
      );

    if (!container) {
      return;
    }

    const {
      data,
      error
    } =
      await supabaseClient
        .from("user_roles")
        .select(
          "user_id,role"
        )
        .eq(
          "role",
          "admin"
        );

    if (error) {

      container.innerHTML = `
        <div class="danger-text">
          Gagal memuat administrator.
        </div>
      `;

      return;
    }

    if (!data || !data.length) {

      container.innerHTML =
        `<div class="muted">
          Belum ada administrator.
        </div>`;

      return;
    }

    const ids =
      data.map(
        item => item.user_id
      );

    const {
      data: users
    } =
      await supabaseClient
        .rpc(
          "get_admin_user_emails",
          {
            user_ids: ids
          }
        )
        .then(result => result)
        .catch(() => ({
          data: null
        }));


    /*
    Jika RPC belum tersedia,
    tampilkan user ID.
    */

    const emailMap = {};

    if (users) {

      for (
        const user of users
      ) {

        emailMap[
          user.user_id
        ] =
          user.email;
      }
    }


    container.innerHTML =
      data.map(
        item => {

          const email =
            emailMap[
              item.user_id
            ] ||
            item.user_id;

          const isCurrent =
            item.user_id ===
            currentUser.id;

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
                  ${item.user_id}
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
                    onclick="GENZAdmin.removeAdmin('${item.user_id}')"
                  >
                    Hapus
                  </button>
                `
              }

            </div>
          `;
        }
      ).join("");
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


    /*
    --------------------------------------------------------
    Supabase Auth user tidak dapat dicari lewat auth.users
    menggunakan publishable key.

    Kita cari user melalui tabel profile jika tersedia.
    Jika belum tersedia, berikan instruksi.
    --------------------------------------------------------
    */

    showMessage(
      "User harus sudah terdaftar. Pembuatan admin dilakukan setelah ID user ditemukan.",
      "info"
    );


    /*
    Untuk keamanan, pencarian auth.users dan pemberian role
    sebaiknya dilakukan melalui Worker Admin API.

    Untuk sementara kita cek tabel user_roles berdasarkan
    email tidak memungkinkan karena user_roles hanya menyimpan
    user_id.

    Sistem admin management penuh akan disambungkan pada
    Worker tahap berikutnya.
    */

    input.value = "";
  }


  async function removeAdmin(
    userId
  ) {

    if (
      !confirm(
        "Hapus hak administrator user ini?"
      )
    ) {
      return;
    }

    const {
      error
    } =
      await supabaseClient
        .from("user_roles")
        .delete()
        .eq(
          "user_id",
          userId
        );

    if (error) {

      showMessage(
        "Gagal menghapus admin: " +
        error.message,
        "error"
      );

      return;
    }

    showMessage(
      "Administrator berhasil dihapus.",
      "success"
    );

    await loadAdmins();
  }


  /*
  ==========================================================
  USER CREDIT
  ==========================================================
  */

  async function loadUsers() {

    const tbody =
      document.getElementById(
        "usersTable"
      );

    if (!tbody) {
      return;
    }

    const {
      data,
      error
    } =
      await supabaseClient
        .from("user_credits")
        .select(
          "user_id,credits,updated_at"
        )
        .order(
          "updated_at",
          {
            ascending: false
          }
        );

    if (error) {

      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty">
              Gagal memuat credit.
            </div>
          </td>
        </tr>
      `;

      return;
    }

    if (!data || !data.length) {

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
      data.map(
        item => {

          return `
            <tr>

              <td>
                <span
                  class="muted"
                  title="${item.user_id}"
                >
                  User
                </span>
              </td>

              <td>
                <small>
                  ${item.user_id}
                </small>
              </td>

              <td>
                <strong>
                  ${Number(item.credits || 0)}
                </strong>
              </td>

              <td>
                <input
                  id="credit-${item.user_id}"
                  type="number"
                  min="0"
                  value="${Number(item.credits || 0)}"
                  style="max-width:130px"
                >
              </td>

              <td>
                <button
                  class="btn btn-primary"
                  onclick="GENZAdmin.updateCredit('${item.user_id}')"
                >
                  Simpan
                </button>
              </td>

            </tr>
          `;
        }
      ).join("");
  }


  async function updateCredit(
    userId
  ) {

    const input =
      document.getElementById(
        "credit-" + userId
      );

    if (!input) {
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
        "Jumlah credit tidak valid.",
        "error"
      );

      return;
    }


    const {
      data: current
    } =
      await supabaseClient
        .from("user_credits")
        .select("credits")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();


    const previous =
      Number(
        current?.credits || 0
      );

    const {
      error
    } =
      await supabaseClient
        .from("user_credits")
        .upsert(
          {
            user_id: userId,
            credits,
            updated_at:
              new Date().toISOString()
          },
          {
            onConflict:
              "user_id"
          }
        );

    if (error) {

      showMessage(
        "Gagal mengubah credit: " +
        error.message,
        "error"
      );

      return;
    }


    const difference =
      credits - previous;

    if (difference !== 0) {

      await supabaseClient
        .from(
          "credit_transactions"
        )
        .insert({
          user_id: userId,
          amount: difference,
          transaction_type:
            "adjustment",
          description:
            "Penyesuaian credit oleh admin"
        });
    }


    showMessage(
      "Credit berhasil diperbarui.",
      "success"
    );

    await loadUsers();
  }


  /*
  ==========================================================
  TOP UP
  ==========================================================
  */

  async function loadTopups() {

    const tbody =
      document.getElementById(
        "topupTable"
      );

    if (!tbody) {
      return;
    }

    const {
      data,
      error
    } =
      await supabaseClient
        .from(
          "topup_requests"
        )
        .select(
          "id,user_id,amount,credits,status,created_at"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {

      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty">
              Gagal memuat top-up.
            </div>
          </td>
        </tr>
      `;

      return;
    }

    if (!data || !data.length) {

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
      data.map(
        item => {

          let statusClass =
            "status-pending";

          if (
            item.status ===
            "approved"
          ) {
            statusClass =
              "status-approved";
          }

          if (
            item.status ===
            "rejected"
          ) {
            statusClass =
              "status-rejected";
          }


          const actions =
            item.status ===
            "pending"
            ? `
              <div style="
                display:flex;
                gap:6px;
              ">

                <button
                  class="btn btn-success"
                  onclick="GENZAdmin.processTopup(${item.id}, 'approved')"
                >
                  Setujui
                </button>

                <button
                  class="btn btn-danger"
                  onclick="GENZAdmin.processTopup(${item.id}, 'rejected')"
                >
                  Tolak
                </button>

              </div>
            `
            : "-";


          return `
            <tr>

              <td>
                <small>
                  ${item.user_id}
                </small>
              </td>

              <td>
                ${formatRupiah(item.amount)}
              </td>

              <td>
                ${Number(item.credits || 0)}
              </td>

              <td>
                <span
                  class="status ${statusClass}"
                >
                  ${item.status}
                </span>
              </td>

              <td>
                ${formatDate(item.created_at)}
              </td>

              <td>
                ${actions}
              </td>

            </tr>
          `;
        }
      ).join("");
  }


  async function processTopup(
    id,
    status
  ) {

    if (
      !confirm(
        status === "approved"
        ? "Setujui top-up ini?"
        : "Tolak top-up ini?"
      )
    ) {
      return;
    }


    const {
      data: request,
      error: requestError
    } =
      await supabaseClient
        .from(
          "topup_requests"
        )
        .select(
          "id,user_id,credits,status"
        )
        .eq(
          "id",
          id
        )
        .maybeSingle();

    if (
      requestError ||
      !request
    ) {

      showMessage(
        "Permintaan top-up tidak ditemukan.",
        "error"
      );

      return;
    }


    if (
      request.status !==
      "pending"
    ) {

      showMessage(
        "Permintaan sudah diproses.",
        "error"
      );

      return;
    }


    if (
      status ===
      "approved"
    ) {

      const {
        data: current
      } =
        await supabaseClient
          .from(
            "user_credits"
          )
          .select(
            "credits"
          )
          .eq(
            "user_id",
            request.user_id
          )
          .maybeSingle();

      const oldCredits =
        Number(
          current?.credits || 0
        );

      const newCredits =
        oldCredits +
        Number(
          request.credits || 0
        );


      const {
        error:
          creditError
      } =
        await supabaseClient
          .from(
            "user_credits"
          )
          .upsert(
            {
              user_id:
                request.user_id,

              credits:
                newCredits,

              updated_at:
                new Date().toISOString()
            },
            {
              onConflict:
                "user_id"
            }
          );


      if (creditError) {

        showMessage(
          "Gagal menambahkan credit.",
          "error"
        );

        return;
      }


      await supabaseClient
        .from(
          "credit_transactions"
        )
        .insert({
          user_id:
            request.user_id,

          amount:
            Number(
              request.credits
            ),

          transaction_type:
            "topup",

          description:
            "Top up disetujui admin"
        });
    }


    const {
      error
    } =
      await supabaseClient
        .from(
          "topup_requests"
        )
        .update({
          status,
          processed_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          id
        );


    if (error) {

      showMessage(
        "Gagal memproses top-up.",
        "error"
      );

      return;
    }


    showMessage(
      status === "approved"
      ? "Top-up disetujui."
      : "Top-up ditolak.",
      "success"
    );

    await loadTopups();
    await loadUsers();
  }


  /*
  ==========================================================
  ADMIN CONTACT
  ==========================================================
  */

  async function loadContact() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from(
          "app_settings"
        )
        .select(
          "setting_value"
        )
        .eq(
          "setting_key",
          "admin_contact_url"
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      return;
    }

    const input =
      document.getElementById(
        "adminContact"
      );

    if (input) {

      input.value =
        data.setting_value || "";
    }
  }


  async function saveContact() {

    const input =
      document.getElementById(
        "adminContact"
      );

    const value =
      String(
        input?.value || ""
      ).trim();

    const {
      error
    } =
      await supabaseClient
        .from(
          "app_settings"
        )
        .upsert(
          {
            setting_key:
              "admin_contact_url",

            setting_value:
              value,

            updated_at:
              new Date().toISOString()
          },
          {
            onConflict:
              "setting_key"
          }
        );

    if (error) {

      showMessage(
        "Gagal menyimpan kontak.",
        "error"
      );

      return;
    }

    showMessage(
      "Kontak admin berhasil disimpan.",
      "success"
    );
  }


  /*
  ==========================================================
  LOGOUT
  ==========================================================
  */

  async function logout() {

    await supabaseClient.auth.signOut();

    window.location.href = "/";
  }


  /*
  ==========================================================
  UTILITIES
  ==========================================================
  */

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

    try {

      return new Date(
        value
      ).toLocaleString(
        "id-ID"
      );

    } catch {

      return "-";
    }
  }


  function escapeHtml(
    value
  ) {

    return String(value || "")
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
  ==========================================================
  PUBLIC API
  ==========================================================
  */

  window.GENZAdmin = {

    saveProvider,

    addAdmin,

    removeAdmin,

    updateCredit,

    processTopup,

    saveContact,

    logout

  };


  /*
  ==========================================================
  EVENTS
  ==========================================================
  */

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

      await loadProviders();

      await loadAdmins();

      await loadUsers();

      await loadTopups();

      await loadContact();


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
