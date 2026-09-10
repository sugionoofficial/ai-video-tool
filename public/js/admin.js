"use strict";

/*

GEN-Z.AI ADMIN PANEL

Frontend Admin API

Semua operasi sensitif dilakukan melalui Cloudflare Worker:

GET  /api/admin/users
GET  /api/admin/admins

POST /api/admin/users/find
POST /api/admin/admins/add
POST /api/admin/admins/remove
POST /api/admin/credits/adjust
POST /api/admin/topups/process

Service-role key TIDAK pernah berada di browser.

============================================================
*/

(function () {

let supabaseClient = null;
let currentUser = null;
let accessToken = null;

/*

CONFIG

*/

const WORKER_URL =
"https://ai-video-tool.sugionoofficial88.workers.dev";

/*

INITIALIZE SUPABASE

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

MESSAGE

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

/*

WORKER API

*/

async function workerRequest(
path,
options = {}
) {

if (!accessToken) {

  throw new Error(
    "Sesi administrator tidak tersedia."
  );
}

const headers = {
  "Content-Type":
    "application/json",

  "Authorization":
    "Bearer " +
    accessToken
};

const response =
  await fetch(
    WORKER_URL + path,
    {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    }
  );

let data = null;

try {

  data =
    await response.json();

} catch {

  data = null;
}

if (!response.ok) {

  throw new Error(
    data?.error ||
    data?.message ||
    "Request ke Worker gagal."
  );
}

return data || {};

}

/*

AUTH CHECK

*/

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

const session =
  data.session;

currentUser =
  session.user;

accessToken =
  session.access_token;

/*
----------------------------------------------------------
Jangan membaca user_roles langsung dari browser.

Validasi administrator dilakukan Worker.
----------------------------------------------------------
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

/*

ACCESS DENIED

*/

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
        ${
          escapeHtml(
            message ||
            "Halaman ini hanya dapat diakses administrator GEN-Z.AI."
          )
        }
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

/*

PROVIDER API KEY

*/

/*
Worker saat ini belum memiliki endpoint:

GET/POST /api/admin/providers

Karena itu browser TIDAK boleh langsung membaca
admin_provider_keys.

UI provider tetap dipertahankan dan akan aktif setelah
endpoint Worker provider dibuat.
*/

async function loadProviders() {

const providers = [
  "veo",
  "minimax",
  "luma"
];

providers.forEach(
  provider => {

    const input =
      document.getElementById(
        provider + "Key"
      );

    if (!input) {
      return;
    }

    input.value = "";

    input.placeholder =
      "Konfigurasi dikelola melalui Worker";
  }
);

}

async function saveProvider(
provider
) {

showMessage(
  "Endpoint konfigurasi API provider belum tersedia di Worker.",
  "error"
);

}

/*

ADMIN MANAGEMENT

*/

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
                    onclick="GENZAdmin.removeAdmin('${escapeHtml(userId)}')"
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

        body:
          JSON.stringify({
            email
          })
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

        body:
          JSON.stringify({
            user_id:
              userId
          })
      }
    );

  showMessage(
    data?.message ||
    "Hak admin berhasil dihapus.",
    "success"
  );

  await loadAdmins();

} catch (error) {

  showMessage(
    error.message,
    "error"
  );
}

}

/*

USER CREDIT

*/

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
              <strong class="credit-value"
                style="font-size:18px"
              >
                ${credits}
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
                onclick="GENZAdmin.updateCredit('${escapeHtml(userId)}')"
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

try {

  const data =
    await workerRequest(
      "/api/admin/credits/adjust",
      {
        method: "POST",

        body:
          JSON.stringify({
            user_id:
              userId,

            credits:
              credits,

            description:
              "Penyesuaian credit oleh admin"
          })
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

/*

TOP UP

*/

async function loadTopups() {

const tbody =
  document.getElementById(
    "topupTable"
  );

if (!tbody) {
  return;
}

/*
Worker saat ini belum menyediakan:

GET /api/admin/topups

Jadi data top-up belum dapat diambil melalui API.

Kita tidak kembali ke query langsung Supabase karena
tujuan arsitektur adalah seluruh operasi admin melalui
Worker.
*/

tbody.innerHTML = `
  <tr>
    <td colspan="6">
      <div class="empty">
        Daftar top-up akan tersedia setelah endpoint
        Worker top-up dibuat.
      </div>
    </td>
  </tr>
`;

}

async function processTopup(
id,
status
) {

if (!id) {
  return;
}

if (
  ![
    "approved",
    "rejected"
  ].includes(status)
) {

  showMessage(
    "Status top-up tidak valid.",
    "error"
  );

  return;
}

const question =
  status === "approved"
    ? "Setujui top-up ini?"
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

        body:
          JSON.stringify({
            request_id:
              Number(id),

            status
          })
      }
    );

  showMessage(
    data?.message ||
    (
      status === "approved"
        ? "Top-up disetujui."
        : "Top-up ditolak."
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

/*

ADMIN CONTACT

*/

async function loadContact() {

const input =
  document.getElementById(
    "adminContact"
  );

if (!input) {
  return;
}

/*
Endpoint Worker untuk contact belum tersedia.
*/

input.placeholder =
  "Endpoint kontak admin belum tersedia di Worker";

input.value = "";

}

async function saveContact() {

showMessage(
  "Endpoint konfigurasi kontak admin belum tersedia di Worker.",
  "error"
);

}

/*

LOGOUT

*/

async function logout() {

try {

  await supabaseClient.auth.signOut();

} catch {
  // Tetap redirect walaupun signOut gagal.
}

accessToken = null;
currentUser = null;

window.location.href =
  "/";

}

/*

UTILITIES

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

if (!value) {
  return "-";
}

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

PUBLIC API

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

EVENTS

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
