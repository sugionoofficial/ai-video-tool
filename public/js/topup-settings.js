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
- Aman saat halaman dibuka berulang kali
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

loading: false,

bound: false

};

/* =======================================================
HELPER
======================================================= */

function $(id) {

return document.getElementById(id);

}

function formatNumber(value) {

const number =
  Number(value);

if (!Number.isFinite(number)) {

  return "0";

}

return Math.trunc(number)
  .toLocaleString("id-ID");

}

function getUserId(user) {

if (!user) {

  return "";

}

const id =
  user.id ??
  user.user_id ??
  user.uid ??
  user.userId ??
  "";

return String(id);

}

function getUserEmail(user) {

if (!user) {

  return "-";

}

return String(
  user.email ??
  user.user_email ??
  user.userEmail ??
  "-"
);

}

function getUserCredits(user) {

if (!user) {

  return 0;

}

const value =
  user.credits ??
  user.credit ??
  user.balance ??
  user.current_credits ??
  user.currentCredit ??
  0;

const number =
  Number(value);

return Number.isFinite(number)
  ? number
  : 0;

}

function findUser(userId) {

const id =
  String(userId || "");

if (!id) {

  return null;

}

return (
  state.users.find(
    user =>
      getUserId(user) === id
  ) || null
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
  `topup-settings-status ${type}`.trim();

element.textContent =
  String(message || "");

}

function clearStatus() {

setStatus("", "");

}

/* =======================================================
TOKEN
======================================================= */

async function getToken() {

try {

  if (
    GENZ.auth &&
    typeof GENZ.auth.token === "function"
  ) {

    return await GENZ.auth.token();

  }

} catch (error) {

  console.warn(
    "[GEN-Z.AI] Gagal mengambil access token:",
    error
  );

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
  !headers["Content-Type"] &&
  !headers["content-type"]
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

const contentType =
  response.headers.get(
    "content-type"
  ) || "";


if (
  contentType.includes(
    "application/json"
  )
) {

  try {

    data =
      await response.json();

  } catch (_) {

    data = {};

  }

} else {

  try {

    const text =
      await response.text();

    data = {

      message:
        text || ""

    };

  } catch (_) {

    data = {};

  }

}


if (!response.ok) {

  const message =
    data?.error ||
    data?.message ||
    data?.details ||
    `Request gagal (${response.status})`;

  throw new Error(
    String(message)
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

  <section
    class="page-card"
    id="topupSettingsDenied">

    <div class="page-header">

      <button
        type="button"
        class="back-btn"
        id="topupSettingsDeniedBack"
        aria-label="Kembali">

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

  back.onclick =
    function () {

      if (
        typeof GENZ.emit ===
        "function"
      ) {

        GENZ.emit(
          "show-studio"
        );

      }

    };

}

}

/* =======================================================
LOAD USERS
======================================================= */

async function loadUsers() {

if (!isAdmin()) {

  renderDenied();

  return false;

}


const select =
  $("topupUser");


const previousUserId =
  state.selectedUser
    ? getUserId(
        state.selectedUser
      )
    : (
        select?.value ||
        ""
      );


if (select) {

  select.disabled =
    true;

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


  let users =
    response?.users;


  /*
   * Beberapa response backend
   * mungkin langsung berupa array.
   */

  if (!Array.isArray(users)) {

    if (Array.isArray(response)) {

      users =
        response;

    } else if (
      Array.isArray(
        response?.data
      )
    ) {

      users =
        response.data;

    } else {

      users =
        [];

    }

  }


  state.users =
    users.filter(
      user =>
        Boolean(
          getUserId(user)
        )
    );


  renderUsers(
    previousUserId
  );


  if (
    previousUserId &&
    findUser(previousUserId)
  ) {

    showUserInfo(
      findUser(previousUserId)
    );

  } else {

    hideUserInfo();

  }


  clearStatus();

  return true;


} catch (error) {

  console.error(
    "[GEN-Z.AI] Top Up Setting users error:",
    error
  );


  state.users = [];

  renderUsers("");

  hideUserInfo();


  setStatus(
    error?.message ||
    "Gagal memuat daftar user.",
    "error"
  );


  return false;

}

}

/* =======================================================
RENDER USERS
======================================================= */

function renderUsers(
selectedUserId = ""
) {

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


placeholder.value =
  "";


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
      getUserEmail(user);


    if (
      selectedUserId &&
      id === String(
        selectedUserId
      )
    ) {

      option.selected =
        true;

    }


    select.appendChild(
      option
    );

  }
);


select.disabled =
  state.users.length === 0;

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

  hideUserInfo();

  return;

}


state.selectedUser =
  user;


if (email) {

  email.textContent =
    getUserEmail(user);

}


if (credit) {

  credit.textContent =
    formatNumber(
      getUserCredits(user)
    );

}


if (info) {

  info.hidden =
    false;

}

}

/* =======================================================
HIDE USER INFO
======================================================= */

function hideUserInfo() {

const info =
  $("topupUserInfo");

const email =
  $("topupSelectedEmail");

const credit =
  $("topupCurrentCredit");


if (info) {

  info.hidden =
    true;

}


if (email) {

  email.textContent =
    "-";

}


if (credit) {

  credit.textContent =
    "0";

}


state.selectedUser =
  null;

}

/* =======================================================
USER CHANGE
======================================================= */

function handleUserChange(
event
) {

const select =
  event?.currentTarget ||
  $("topupUser");


if (!select) {

  return;

}


const userId =
  String(
    select.value ||
    ""
  );


if (!userId) {

  hideUserInfo();

  clearStatus();

  return;

}


const user =
  findUser(userId);


if (!user) {

  hideUserInfo();

  setStatus(
    "Data user tidak ditemukan.",
    "error"
  );

  return;

}


showUserInfo(
  user
);


clearStatus();

}

/* =======================================================
UPDATE LOCAL USER CREDIT
======================================================= */

function updateLocalCredit(
userId,
newBalance
) {

const user =
  findUser(userId);


if (!user) {

  return;

}


const balance =
  Number(newBalance);


if (
  !Number.isFinite(balance)
) {

  return;

}


user.credits =
  balance;


user.credit =
  balance;


user.balance =
  balance;


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
    formatNumber(balance);

}

}

/* =======================================================
RESPONSE CREDIT
======================================================= */

function extractNewBalance(
response
) {

if (!response) {

  return null;

}


const directValues = [

  response.credits,

  response.credit,

  response.balance,

  response.new_balance,

  response.newBalance,

  response.current_credits,

  response.currentCredit,

  response.updated_credits,

  response.updatedCredit

];


for (
  const value
  of directValues
) {

  if (
    value !== undefined &&
    value !== null &&
    value !== ""
  ) {

    const number =
      Number(value);

    if (
      Number.isFinite(number)
    ) {

      return number;

    }

  }

}


const nested =
  response.data ||
  response.user ||
  response.result ||
  null;


if (nested) {

  return extractNewBalance(
    nested
  );

}


return null;

}

/* =======================================================
ADD CREDIT
======================================================= */

async function addCredit() {

if (state.loading) {

  return;

}


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


const amountRaw =
  String(
    amountInput?.value ||
    ""
  ).trim();


if (!amountRaw) {

  setStatus(
    "Masukkan jumlah kredit.",
    "error"
  );

  amountInput?.focus();

  return;

}


const amount =
  Number(amountRaw);


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


const note =
  String(
    noteInput?.value ||
    ""
  ).trim();


const button =
  $("topupSubmit");


state.loading =
  true;


if (button) {

  button.disabled =
    true;

  button.dataset.originalText =
    button.textContent ||
    "Tambah Kredit";

  button.textContent =
    "Memproses...";

}


if (amountInput) {

  amountInput.disabled =
    true;

}


if (noteInput) {

  noteInput.disabled =
    true;

}


if ($("topupUser")) {

  $("topupUser").disabled =
    true;

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

        method:
          "POST",

        body:
          JSON.stringify({

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
   * Backend idealnya mengembalikan
   * saldo terbaru setelah adjustment.
   */

  const newBalance =
    extractNewBalance(
      response
    );


  if (
    newBalance !== null
  ) {

    updateLocalCredit(
      userId,
      newBalance
    );

  } else {

    /*
     * Jika backend tidak mengirim
     * saldo terbaru, reload database.
     */

    await loadUsers();


    const refreshedUser =
      findUser(
        userId
      );


    if (refreshedUser) {

      const select =
        $("topupUser");


      if (select) {

        select.value =
          userId;

      }


      showUserInfo(
        refreshedUser
      );

    }

  }


  /*
   * Refresh account utama.
   */

  if (
    GENZ.account &&
    typeof GENZ.account.refresh ===
      "function"
  ) {

    try {

      await GENZ.account.refresh();

    } catch (error) {

      console.warn(
        "[GEN-Z.AI] Account refresh gagal:",
        error
      );

    }

  }


  /*
   * Refresh credit module.
   */

  if (
    GENZ.credit &&
    typeof GENZ.credit.refresh ===
      "function"
  ) {

    try {

      await GENZ.credit.refresh();

    } catch (error) {

      console.warn(
        "[GEN-Z.AI] Credit refresh gagal:",
        error
      );

    }

  }


  const email =
    getUserEmail(
      state.selectedUser ||
      user
    );


  setStatus(
    `Berhasil menambahkan ${formatNumber(amount)} kredit ke ${email}.`,
    "success"
  );


  /*
   * Bersihkan form setelah
   * transaksi berhasil.
   */

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


  if (amountInput) {

    amountInput.disabled =
      false;

  }


  if (noteInput) {

    noteInput.disabled =
      false;

  }


  const select =
    $("topupUser");


  if (select) {

    select.disabled =
      state.users.length === 0;

  }

}

}

/* =======================================================
BACK
======================================================= */

function goBack() {

if (
  typeof GENZ.emit ===
  "function"
) {

  GENZ.emit(
    "show-studio"
  );

  return;

}


if (
  typeof GENZ.showStudio ===
  "function"
) {

  GENZ.showStudio();

}

}

/* =======================================================
BIND
======================================================= */

function bind() {

/*
 * Hindari event listener
 * terpasang berkali-kali ketika
 * halaman dibuka ulang.
 */

const select =
  $("topupUser");


if (
  select &&
  select.dataset.genzBound !==
    "true"
) {

  select.addEventListener(
    "change",
    handleUserChange
  );

  select.dataset.genzBound =
    "true";

}


const submit =
  $("topupSubmit");


if (
  submit &&
  submit.dataset.genzBound !==
    "true"
) {

  submit.addEventListener(
    "click",
    addCredit
  );

  submit.dataset.genzBound =
    "true";

}


const back =
  $("topupSettingsBack");


if (
  back &&
  back.dataset.genzBound !==
    "true"
) {

  back.addEventListener(
    "click",
    goBack
  );

  back.dataset.genzBound =
    "true";

}


state.bound =
  true;

}

/* =======================================================
LOAD HTML
======================================================= */

async function loadHtml(
container
) {

const existing =
  $("topupSettingsPage");


if (existing) {

  return true;

}


try {

  const response =
    await fetch(
      "/components/topup-settings.html",
      {
        credentials:
          "include",

        cache:
          "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `Gagal memuat halaman Top Up Setting (${response.status})`
    );

  }


  const html =
    await response.text();


  if (!html.trim()) {

    throw new Error(
      "Halaman Top Up Setting kosong."
    );

  }


  container.innerHTML =
    html;


  return true;

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
          id="topupSettingsBack"
          aria-label="Kembali">

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


  return false;

}

}

/* =======================================================
LOAD PAGE
======================================================= */

async function load() {

/*
 * Validasi admin dilakukan
 * sebelum halaman dimuat.
 */

if (!isAdmin()) {

  renderDenied();

  return false;

}


const container =
  $("pageContent") ||
  $("content");


if (!container) {

  console.error(
    "[GEN-Z.AI] Top Up Setting container tidak ditemukan."
  );

  return false;

}


const htmlLoaded =
  await loadHtml(
    container
  );


if (!htmlLoaded) {

  setStatus(
    "Halaman Top Up Setting menggunakan tampilan cadangan.",
    "info"
  );

}


/*
 * Setelah HTML tersedia,
 * pasang event handler.
 */

bind();


/*
 * Muat daftar user.
 */

return await loadUsers();

}

/* =======================================================
REFRESH
======================================================= */

async function refresh() {

if (!isAdmin()) {

  renderDenied();

  return false;

}


if (!$("topupSettingsPage")) {

  return await load();

}


bind();

return await loadUsers();

}

/* =======================================================
PUBLIC MODULE
======================================================= */

GENZ.topupSettings = {

load,

refresh,

loadUsers,

addCredit,

state

};

})();
