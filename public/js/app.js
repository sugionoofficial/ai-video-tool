let supabase = null;

const $ = id => document.getElementById(id);

const cfg = {
veo: {
name: 'Gemini / Veo',
models: [
'veo-3.1-fast-generate-preview',
'veo-3.1-generate-preview',
'veo-3.1-lite-generate-preview'
],
durations: [4, 6, 8],
aspects: ['16:9', '9:16'],
res: ['720p', '1080p', '4k']
},

minimax: {
name: 'MiniMax',
models: [
'MiniMax-Hailuo-2.3',
'MiniMax-Hailuo-2.3-Fast',
'MiniMax-Hailuo-02'
],
durations: [6, 10],
aspects: ['16:9', '9:16'],
res: ['512P', '768P', '1080P']
},

luma: {
name: 'Luma',
models: [
'ray-2',
'ray-flash-2'
],
durations: ['5s', '9s'],
aspects: [
'1:1',
'16:9',
'9:16',
'4:3',
'3:4',
'21:9',
'9:21'
],
res: ['720p', '1080p', '4k']
}
};

let provider = null;
let imageData = null;
let poll = null;
let providers = [];
let account = null;
let currentVideoObjectUrl = null;

/* =========================================================
UTILITY
========================================================= */

function opts(el, arr) {
if (!el) return;

el.innerHTML = (arr || [])
.map(x =>
"<option value="${escapeAttr(x)}">${escapeHtml(x)}</option>"
)
.join('');
}

function escapeHtml(s) {
return String(s ?? '').replace(
/[&<>'"]/g,
c => ({
'&': '&',
'<': '<',
'>': '>',
"'": ''',
'"': '"'
}[c])
);
}

function escapeAttr(s) {
return escapeHtml(s);
}

/* =========================================================
AUTH CLIENT
========================================================= */

function getAuthClient() {
const client = window.GENZ_AUTH_CLIENT;

if (
client &&
client.auth &&
typeof client.auth.getSession === 'function'
) {
supabase = client;
return client;
}

return null;
}

/* =========================================================
UI STATE
========================================================= */

function showLoggedInUI() {
const auth = $('auth');
const studio = $('studio');
const accountBtn = $('accountBtn');
const accountPage = $('accountPage');

if (auth) {
auth.classList.add('hidden');
auth.style.display = 'none';
}

if (studio) {
studio.classList.remove('hidden');
studio.style.display = '';
}

if (accountPage) {
accountPage.classList.add('hidden');
}

if (accountBtn) {
accountBtn.classList.remove('hidden');
}

$('backToStudio')?.classList.add('hidden');
$('pageBack')?.classList.add('hidden');
}

function showLoggedOutUI() {
const auth = $('auth');
const studio = $('studio');
const accountBtn = $('accountBtn');
const accountPage = $('accountPage');

if (auth) {
auth.classList.remove('hidden');
auth.style.display = '';
}

if (studio) {
studio.classList.add('hidden');
studio.style.display = 'none';
}

if (accountPage) {
accountPage.classList.add('hidden');
}

if (accountBtn) {
accountBtn.classList.add('hidden');
}

$('accountMenu')?.classList.add('hidden');
$('backToStudio')?.classList.add('hidden');
$('pageBack')?.classList.add('hidden');

stopPolling();

clearVideo();

account = null;
provider = null;
imageData = null;
}

/* =========================================================
ROLE MENU
========================================================= */

function updateRoleMenu(isAdmin) {
const adminPanel = $('adminPanel');
const contactAdmin = $('contactAdmin');

if (adminPanel) {
adminPanel.classList.toggle(
'hidden',
!Boolean(isAdmin)
);
}

if (contactAdmin) {
contactAdmin.classList.toggle(
'hidden',
Boolean(isAdmin)
);

contactAdmin.textContent =
  'Chat Admin';

}
}

/*

* Default aman:
* sebelum role berhasil diketahui,
* kedua menu khusus disembunyikan.
  */
  function resetRoleMenu() {
  $('adminPanel')?.classList.add('hidden');
  $('contactAdmin')?.classList.add('hidden');

if ($('contactAdmin')) {
$('contactAdmin').textContent =
'Chat Admin';
}
}

/* =========================================================
PROVIDER
========================================================= */

function selectProvider(p) {
provider = p;

document
.querySelectorAll('.provider')
.forEach(button => {
button.classList.toggle(
'active',
button.dataset.provider === p
);
});

const c =
cfg[p] ||
providers.find(x => x.id === p)?.capabilities;

if (!c) return;

opts(
$('model'),
c.models || []
);

opts(
$('duration'),
c.durations || []
);

opts(
$('aspect'),
c.aspects || []
);

opts(
$('resolution'),
c.resolutions || c.res || []
);
}

function renderProviders() {
const box = $('providers');

if (!box) return;

box.innerHTML = '';

providers.forEach(p => {
const button =
document.createElement('button');

button.className = 'provider';
button.dataset.provider = p.id;
button.type = 'button';

button.innerHTML = `
  ${escapeHtml(p.name)}
  <small>${escapeHtml(p.adapter || '')}</small>
`;

button.addEventListener(
  'click',
  () => {
    selectProvider(p.id);
  }
);

box.append(button);

});

if (providers[0]) {
selectProvider(
providers[0].id
);

if ($('generate')) {
  $('generate').disabled = false;
}

} else {
if ($('status')) {
$('status').textContent =
'Belum ada provider aktif.';
}

if ($('generate')) {
  $('generate').disabled = true;
}

}
}

async function loadProviders() {
const r =
await fetch(
'/api/providers',
{
cache: 'no-store'
}
);

const d =
await r.json();

if (
!r.ok ||
d.success === false
) {
throw Error(
d.error ||
'Gagal memuat provider'
);
}

providers =
Array.isArray(d.providers)
? d.providers
: [];

renderProviders();
}

/* =========================================================
TOKEN
========================================================= */

async function token() {
const client =
getAuthClient();

if (!client) {
throw Error(
'Supabase Auth belum siap.'
);
}

const {
data,
error
} =
await client.auth.getSession();

if (error) {
throw Error(
error.message ||
'Gagal membaca session.'
);
}

if (!data?.session) {
throw Error(
'Silakan login.'
);
}

return data.session.access_token;
}

/* =========================================================
API
========================================================= */

async function api(
path,
body,
method = 'POST',
extraHeaders = {}
) {
const t =
await token();

const r =
await fetch(
path,
{
method,

    headers: {
      'Content-Type':
        'application/json',

      Authorization:
        `Bearer ${t}`,

      ...extraHeaders
    },

    body:
      body === undefined
        ? undefined
        : JSON.stringify(body)
  }
);

let d;

try {
d =
await r.json();

} catch {
throw Error(
"Server mengembalikan respons tidak valid (${r.status})."
);
}

if (
!r.ok ||
d.success === false
) {
throw Error(
d.error ||
'Request gagal'
);
}

return d;
}

/* =========================================================
REFRESH ACCOUNT
========================================================= */

async function refresh() {
const client =
getAuthClient();

if (!client) {
showLoggedOutUI();
return false;
}

try {
const {
data,
error
} =
await client.auth.getUser();

if (error) {
  console.error(
    '[GEN-Z.AI] Gagal membaca user:',
    error
  );

  showLoggedOutUI();

  return false;
}

const user =
  data?.user;

if (!user) {
  showLoggedOutUI();

  return false;
}

/*
 * UI login ditampilkan terlebih dahulu.
 */
showLoggedInUI();

if ($('userEmail')) {
  $('userEmail').textContent =
    user.email || '';
}

if ($('menuEmail')) {
  $('menuEmail').textContent =
    user.email || '';
}

/*
 * Jangan menebak role sebelum server
 * memberikan informasi account.
 */
try {
  const d =
    await api(
      '/api/account/credits',
      undefined,
      'GET'
    );

  account = {
    ...d,
    user
  };

  const isAdmin =
    Boolean(d.isAdmin);

  if ($('credits')) {
    $('credits').textContent =
      `${d.credits ?? 0} credit`;
  }

  updateRoleMenu(
    isAdmin
  );

} catch (e) {
  console.error(
    '[GEN-Z.AI] Gagal memuat account:',
    e
  );

  /*
   * Jika sebelumnya role sudah diketahui,
   * pertahankan role tersebut.
   *
   * Jangan otomatis mengubah Admin
   * menjadi User hanya karena endpoint
   * account sedang gagal.
   */
  const previousIsAdmin =
    Boolean(
      account?.isAdmin
    );

  account = {
    ...(account || {}),
    user,
    credits:
      account?.credits ?? 0,
    isAdmin:
      previousIsAdmin
  };

  updateRoleMenu(
    previousIsAdmin
  );

  if ($('credits')) {
    $('credits').textContent =
      account.credits !== undefined
        ? `${account.credits} credit`
        : '— credit';
  }
}

return true;

} catch (e) {
console.error(
'[GEN-Z.AI] Refresh error:',
e
);

return false;

}
}

/* =========================================================
LOGIN SESSION SYNC
========================================================= */

async function syncLoginState() {
const client =
getAuthClient();

if (!client) {
return false;
}

try {
const {
data,
error
} =
await client.auth.getSession();

if (error) {
  console.error(
    '[GEN-Z.AI] Session error:',
    error
  );

  return false;
}

if (data?.session?.user) {
  showLoggedInUI();

  resetRoleMenu();

  await refresh();

  try {
    await loadProviders();

  } catch (e) {
    console.error(
      '[GEN-Z.AI] Provider error:',
      e
    );
  }

  return true;
}

showLoggedOutUI();

} catch (e) {
console.error(
'[GEN-Z.AI] Sync login error:',
e
);
}

return false;
}

/* =========================================================
MENU
========================================================= */

function closeMenu() {
$('accountMenu')?.classList.add(
'hidden'
);
}

function showStudio() {
$('accountPage')?.classList.add(
'hidden'
);

$('studio')?.classList.remove(
'hidden'
);

$('backToStudio')?.classList.add(
'hidden'
);

$('pageBack')?.classList.add(
'hidden'
);

closeMenu();
}

/* =========================================================
CREDIT HISTORY
========================================================= */

async function loadCreditHistory() {
try {
const d =
await api(
'/api/account/transactions?limit=30',
undefined,
'GET'
);

const box =
  $('creditHistory');

if (!box) return;

if (
  !d.transactions?.length
) {
  box.innerHTML =
    '<p>Belum ada transaksi credit.</p>';

  return;
}

box.innerHTML =
  '<h3>Riwayat Credit</h3>' +
  d.transactions
    .map(t => {
      const sign =
        Number(t.amount) > 0
          ? '+'
          : '';

      const label = {
        generation:
          'Generation',

        refund:
          'Refund',

        admin_adjustment:
          'Penyesuaian Admin',

        topup:
          'Top-up'
      }[t.type] ||
        t.type;

      return `
        <div class="credit-history-row">

          <div>

            <strong>
              ${escapeHtml(label)}
            </strong>

            <small>
              ${escapeHtml(t.note || '')}
            </small>

          </div>

          <span>
            ${sign}${Number(t.amount)}
            · ${Number(t.balance_after ?? 0)}
            saldo
          </span>

        </div>
      `;
    })
    .join('');

} catch (e) {
console.error(
'[GEN-Z.AI] Credit history error:',
e
);

const box =
  $('creditHistory');

if (box) {
  box.innerHTML =
    '<p>Riwayat credit belum dapat dimuat.</p>';
}

}
}

/* =========================================================
TOP UP
========================================================= */

async function loadTopups() {
const box =
$('topupState');

if (!box) return;

try {
const d =
await api(
'/api/account/topup-requests?limit=20',
undefined,
'GET'
);

if (
  !d.requests?.length
) {
  box.innerHTML =
    '<p>Belum ada request top-up.</p>';

} else {
  box.innerHTML =
    '<h3>Request Terakhir</h3>' +
    d.requests
      .map(r => `
        <div class="credit-history-row">

          <div>

            <strong>
              ${Number(r.amount)}
              credit ·
              ${escapeHtml(r.status)}
            </strong>

            <small>
              ${escapeHtml(r.note || '')}

              ${
                r.admin_note
                  ? ' · ' +
                    escapeHtml(
                      r.admin_note
                    )
                  : ''
              }
            </small>

          </div>

          <span>
            ${new Date(
              r.created_at
            ).toLocaleString()}
          </span>

        </div>
      `)
      .join('');
}

} catch (e) {
console.error(
'[GEN-Z.AI] Topup history error:',
e
);

box.innerHTML =
  '<p>Request belum dapat dimuat.</p>';

}

const btn =
$('submitTopup');

if (!btn) return;

btn.onclick =
async () => {
const amount =
Number(
$('topupAmount')?.value
);

  const note =
    $('topupNote')
      ?.value
      .trim() || '';

  if (
    !Number.isInteger(amount) ||
    amount <= 0 ||
    amount > 1000000
  ) {
    alert(
      'Jumlah harus integer 1–1.000.000.'
    );

    return;
  }

  try {
    btn.disabled = true;

    await api(
      '/api/account/topup-requests',
      {
        amount,
        note
      }
    );

    alert(
      'Request top-up berhasil dikirim.'
    );

    showPage('topup');

  } catch (e) {
    alert(
      e.message ||
      'Gagal mengirim request top-up.'
    );

  } finally {
    btn.disabled = false;
  }
};

}

/* =========================================================
ACCOUNT PAGES
========================================================= */

function showPage(page) {
/*

* Role protection.
* 
* Admin:
* - boleh membuka profile
* - boleh membuka credit
* - boleh membuka topup
* - tidak boleh membuka Chat Admin
* 
* User:
* - boleh membuka profile
* - boleh membuka credit
* - boleh membuka topup
* - boleh membuka Chat Admin
    */
    if (
    page === 'contact' &&
    account?.isAdmin
    ) {
    console.warn(
    '[GEN-Z.AI] Admin tidak memiliki akses Chat Admin.'
    );

return;

}

/*

* Diagnostic tidak lagi menjadi halaman
* yang tersedia dari menu utama.
  */
  if (page === 'diagnostic') {
  console.warn(
  '[GEN-Z.AI] System Diagnostic tidak tersedia dari menu utama.'
  );

return;

}

$('studio')?.classList.add(
'hidden'
);

$('accountPage')?.classList.remove(
'hidden'
);

$('backToStudio')?.classList.remove(
'hidden'
);

$('pageBack')?.classList.remove(
'hidden'
);

closeMenu();

const title =
$('pageTitle');

const content =
$('pageContent');

if (!title || !content) {
return;
}

const email =
escapeHtml(
account?.user?.email || ''
);

const credits =
Number(
account?.credits || 0
);

/* =======================================================
PROFILE
====================================================== */

if (page === 'profile') {
title.textContent =
'Profil';

content.innerHTML = `
  <div class="profile-card">

    <div class="avatar">
      ${
        email.charAt(0).toUpperCase() ||
        'U'
      }
    </div>

    <div>

      <h3>
        ${email}
      </h3>

      <p>
        Akun ${
          account?.isAdmin
            ? 'Administrator'
            : 'User'
        }
      </p>

    </div>

  </div>
`;

return;

}

/* =======================================================
CREDIT
====================================================== */

if (page === 'credit') {
title.textContent =
'Kredit';

content.innerHTML = `
  <div class="credit-big">
    ${credits}
    <span>credit</span>
  </div>

  <p>
    Credit digunakan setiap kali
    membuat video. Setiap perubahan
    credit tercatat di riwayat.
  </p>

  <button
    class="primary"
    data-page="topup"
    type="button"
  >
    Top-up
  </button>

  <div
    id="creditHistory"
    class="credit-history"
  >
    <p>
      Memuat riwayat...
    </p>
  </div>
`;

content
  .querySelector(
    '[data-page="topup"]'
  )
  ?.addEventListener(
    'click',
    () => {
      showPage('topup');
    }
  );

loadCreditHistory();

return;

}

/* =======================================================
TOP UP
====================================================== */

if (page === 'topup') {
title.textContent =
'Top-up';

content.innerHTML = `
  <div class="topup-box">

    <h3>
      Ajukan Top-up
    </h3>

    <p>
      Masukkan jumlah kredit.
      Admin akan memeriksa dan
      menyetujui atau menolak
      permintaan Anda.
    </p>

    <label>
      Jumlah credit

      <input
        id="topupAmount"
        type="number"
        min="1"
        max="1000000"
        step="1"
        placeholder="Contoh: 100"
      >
    </label>

    <label>
      Catatan (opsional)

      <textarea
        id="topupNote"
        maxlength="500"
        placeholder="Keterangan pembayaran atau kebutuhan"
      ></textarea>
    </label>

    <button
      class="primary"
      id="submitTopup"
      type="button"
    >
      Kirim Request Top-up
    </button>

    <div
      id="topupState"
      class="credit-history"
    >
      <p>
        Memuat request...
      </p>
    </div>

  </div>
`;

loadTopups();

return;

}

/* =======================================================
CHAT ADMIN
====================================================== */

if (page === 'contact') {
/*
* Pemeriksaan tambahan.
* Hanya User yang boleh sampai ke sini.
*/
if (account?.isAdmin) {
showStudio();
return;
}

title.textContent =
  'Chat Admin';

const contact =
  account?.adminContactUrl;

content.innerHTML =
  contact
    ? `
      <p>
        Gunakan kontak berikut untuk
        bantuan, top-up, atau
        kendala akun.
      </p>

      <a
        class="contact-btn"
        href="${escapeAttr(contact)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Chat Admin
      </a>
    `
    : `
      <p>
        Kontak admin belum
        dikonfigurasi.
      </p>
    `;

return;

}
}

/* =========================================================
IMAGE UPLOAD
========================================================= */

function setupImageUpload() {
const input =
$('image');

if (!input) return;

input.onchange =
event => {
const file =
event.target.files?.[0];

  if (!file) {
    imageData = null;
    return;
  }

  if (
    file.size >
    12 * 1024 * 1024
  ) {
    imageData = null;

    if ($('status')) {
      $('status').textContent =
        'Gambar maksimal 12 MB.';
    }

    input.value = '';

    return;
  }

  if (
    !file.type.startsWith(
      'image/'
    )
  ) {
    imageData = null;

    if ($('status')) {
      $('status').textContent =
        'File harus berupa gambar.';
    }

    input.value = '';

    return;
  }

  const reader =
    new FileReader();

  reader.onload =
    () => {
      imageData =
        reader.result;
    };

  reader.onerror =
    () => {
      imageData = null;

      if ($('status')) {
        $('status').textContent =
          'Gagal membaca gambar.';
      }
    };

  reader.readAsDataURL(file);
};

}

/* =========================================================
VIDEO CLEANUP
========================================================= */

function stopPolling() {
if (poll) {
clearTimeout(poll);
poll = null;
}
}

function clearVideo() {
stopPolling();

const video =
$('video');

const download =
$('download');

if (video) {
video.pause();
video.removeAttribute('src');
video.load();
video.classList.add('hidden');
}

if (download) {
download.removeAttribute('href');
download.classList.add('hidden');
}

if (currentVideoObjectUrl) {
try {
URL.revokeObjectURL(
currentVideoObjectUrl
);
} catch {}

currentVideoObjectUrl = null;

}
}

/* =========================================================
VIDEO GENERATION
========================================================= */

async function generateVideo() {
const generate =
$('generate');

if (!generate) return;

try {
generate.disabled = true;

clearVideo();

if ($('status')) {
  $('status').textContent =
    'Memulai generation...';
}

const idem =
  typeof crypto !== 'undefined' &&
  typeof crypto.randomUUID ===
    'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

const d =
  await api(
    '/api/generate',
    {
      provider,

      model:
        $('model')?.value,

      duration:
        $('duration')?.value,

      aspectRatio:
        $('aspect')?.value,

      resolution:
        $('resolution')?.value,

      prompt:
        $('prompt')?.value || '',

      imageData
    },
    'POST',
    {
      'Idempotency-Key':
        idem
    }
  );

if ($('status')) {
  $('status').textContent =
    'Processing...';
}

const id =
  d.externalId;

if (!id) {
  throw Error(
    'Server tidak mengembalikan ID generation.'
  );
}

stopPolling();

const run =
  async () => {
    try {
      const s =
        await api(
          '/api/generate/status',
          {
            provider,
            operationName: id,
            taskId: id,
            id
          }
        );

      if (
        s.status === 'completed' &&
        s.videoUrl
      ) {
        let url =
          s.videoUrl;

        if (
          url.startsWith(
            '/api/video'
          )
        ) {
          const t =
            await token();

          const r =
            await fetch(
              url,
              {
                headers: {
                  Authorization:
                    `Bearer ${t}`
                }
              }
            );

          if (!r.ok) {
            throw Error(
              'Gagal mengambil file video.'
            );
          }

          const blob =
            await r.blob();

          url =
            URL.createObjectURL(
              blob
            );

          currentVideoObjectUrl =
            url;
        }

        const video =
          $('video');

        if (video) {
          video.src = url;

          video.classList.remove(
            'hidden'
          );

          video.load();
        }

        const download =
          $('download');

        if (download) {
          download.href =
            url;

          download.classList.remove(
            'hidden'
          );
        }

        if ($('status')) {
          $('status').textContent =
            'Video selesai.';
        }

        generate.disabled =
          false;

        await refresh();

        return;
      }


      if (
        s.status === 'failed' ||
        s.status === 'error' ||
        s.status === 'cancelled'
      ) {
        if ($('status')) {
          $('status').textContent =
            s.error ||
            s.message ||
            'Generation gagal.';
        }

        generate.disabled =
          false;

        await refresh();

        return;
      }


      if ($('status')) {
        $('status').textContent =
          'Processing...';
      }

      poll =
        setTimeout(
          run,
          7000
        );

    } catch (e) {
      console.error(
        '[GEN-Z.AI] Polling error:',
        e
      );

      if ($('status')) {
        $('status').textContent =
          e.message ||
          'Gagal mengecek status video.';
      }

      generate.disabled =
        false;
    }
  };

run();

} catch (e) {
console.error(
'[GEN-Z.AI] Generation error:',
e
);

if ($('status')) {
  $('status').textContent =
    e.message ||
    'Generation gagal.';
}

generate.disabled =
  false;

}
}

/* =========================================================
EVENTS
========================================================= */

function setupEvents() {
$('accountBtn')?.addEventListener(
'click',
event => {
event.stopPropagation();

  $('accountMenu')?.classList.toggle(
    'hidden'
  );
}

);

/*

* Menu utama.
  */
  document
  .querySelectorAll(
  '#accountMenu [data-page]'
  )
  .forEach(button => {
  button.addEventListener(
  'click',
  () => {
  const page =
  button.dataset.page;
  
   if (page) {
   showPage(page);
 }
  
  }
  );
  });

/*

* Panel Admin.
  */
  $('adminPanel')?.addEventListener(
  'click',
  () => {
  if (
  !account?.isAdmin
  ) {
  return;
  }
  
  closeMenu();
  
  location.href =
  '/admin.html';
  }
  );

/*

* Chat Admin.
  */
  $('contactAdmin')?.addEventListener(
  'click',
  () => {
  if (
  account?.isAdmin
  ) {
  return;
  }
  
  showPage('contact');
  }
  );

$('backToStudio')?.addEventListener(
'click',
showStudio
);

$('pageBack')?.addEventListener(
'click',
showStudio
);

/*

* Tutup menu ketika klik di luar.
  */
  document.addEventListener(
  'click',
  event => {
  const menu =
  $('accountMenu');
  
  const button =
  $('accountBtn');
  
  if (!menu || !button) {
  return;
  }
  
  if (
  !menu.contains(event.target) &&
  !button.contains(event.target)
  ) {
  closeMenu();
  }
  }
  );

setupImageUpload();

$('generate')?.addEventListener(
'click',
generateVideo
);
}

/* =========================================================
AUTH LOGIN EVENT
========================================================= */

window.addEventListener(
'genz-auth-login',
async event => {
console.log(
'[GEN-Z.AI] LOGIN EVENT DITERIMA',
event?.detail || null
);

/*
 * UI langsung pindah ke studio.
 */
showLoggedInUI();

/*
 * Role menu disembunyikan terlebih dahulu
 * sampai account berhasil dibaca.
 */
resetRoleMenu();

const success =
  await syncLoginState();

if (!success) {
  console.warn(
    '[GEN-Z.AI] Login event diterima tetapi session belum tersedia.'
  );

  setTimeout(
    syncLoginState,
    500
  );
}

}
);

/* =========================================================
LOGOUT EVENT
========================================================= */

window.addEventListener(
'genz-auth-logout',
() => {
console.log(
'[GEN-Z.AI] LOGOUT EVENT DITERIMA'
);

showLoggedOutUI();

}
);

/* =========================================================
BOOTSTRAP
========================================================= */

async function bootstrap() {
console.log(
'[GEN-Z.AI] APP BOOTSTRAP'
);

setupEvents();

/*

* Tunggu auth.js membuat client.
  */
  let attempts = 0;

while (
!getAuthClient() &&
attempts < 60
) {
await new Promise(
resolve =>
setTimeout(
resolve,
100
)
);

attempts++;

}

const client =
getAuthClient();

if (!client) {
console.error(
'[GEN-Z.AI] Supabase Auth tidak tersedia.'
);

return;

}

/*

* Sinkronkan session awal.
  */
  await syncLoginState();

/*

* Listener tambahan langsung pada Supabase.
  */
  try {
  client.auth.onAuthStateChange(
  async (
  event,
  session
  ) => {
  console.log(
  '[GEN-Z.AI] Supabase event:',
  event
  );
  
  if (
  event === 'SIGNED_IN' &&
  session?.user
  ) {
  showLoggedInUI();
  
   resetRoleMenu();

 await refresh();

 try {
   await loadProviders();

 } catch (e) {
   console.error(
     '[GEN-Z.AI] Provider error:',
     e
   );
 }
  
  }
  
  if (
  event === 'SIGNED_OUT'
  ) {
  showLoggedOutUI();
  }
  }
  );

} catch (e) {
console.error(
'[GEN-Z.AI] Auth listener error:',
e
);
}
}

/* =========================================================
START
========================================================= */

if (
document.readyState ===
'loading'
) {
document.addEventListener(
'DOMContentLoaded',
bootstrap,
{
once: true
}
);

} else {
bootstrap();
}
