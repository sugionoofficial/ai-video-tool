/* =========================================================
GEN-Z.AI APPLICATION CONTROLLER
public/js/app.js
========================================================= */

(function () {

'use strict';

const GENZ =
window.GENZ ||
(window.GENZ = {});

/* =========================================================
INTERNAL STATE
========================================================= */

let started = false;
let authBound = false;
let navigationBound = false;

let topupSettingsLoading = null;

/* =========================================================
UTILITY
========================================================= */

function $(id) {
return document.getElementById(id);
}

function log(...args) {

console.log(
  '[GEN-Z.AI]',
  ...args
);

}

function error(...args) {

console.error(
  '[GEN-Z.AI]',
  ...args
);

}

function isLoggedIn() {

return (
  GENZ.state &&
  GENZ.state.loggedIn === true &&
  !!GENZ.state.user
);

}

function isAdmin() {

return (
  GENZ.state &&
  GENZ.state.account &&
  GENZ.state.account.isAdmin === true &&
  GENZ.state.account.roleValidated === true
);

}

/* =========================================================
DYNAMIC MODULE LOADER
========================================================= */

function loadScriptOnce(
src,
moduleName
) {

if (
  moduleName === 'topupSettings' &&
  GENZ.topupSettings &&
  typeof GENZ.topupSettings.load === 'function'
) {

  return Promise.resolve(
    GENZ.topupSettings
  );

}


if (
  moduleName === 'topupSettings' &&
  topupSettingsLoading
) {

  return topupSettingsLoading;

}


const promise =
  new Promise(
    function (resolve, reject) {

      const existing =
        document.querySelector(
          `script[data-genz-module="${moduleName}"]`
        );


      if (existing) {

        if (
          moduleName === 'topupSettings' &&
          GENZ.topupSettings &&
          typeof GENZ.topupSettings.load === 'function'
        ) {

          resolve(
            GENZ.topupSettings
          );

          return;

        }


        const onLoad =
          function () {

            if (
              moduleName === 'topupSettings' &&
              GENZ.topupSettings &&
              typeof GENZ.topupSettings.load === 'function'
            ) {

              resolve(
                GENZ.topupSettings
              );

            } else {

              reject(
                new Error(
                  `Modul ${moduleName} tidak mendaftarkan GENZ.${moduleName}.`
                )
              );

            }

          };


        const onError =
          function () {

            reject(
              new Error(
                `Gagal memuat ${src}`
              )
            );

          };


        existing.addEventListener(
          'load',
          onLoad,
          {
            once: true
          }
        );


        existing.addEventListener(
          'error',
          onError,
          {
            once: true
          }
        );


        return;

      }


      const script =
        document.createElement(
          'script'
        );


      script.src =
        src;

      script.async =
        true;

      script.dataset.genzModule =
        moduleName;


      script.onload =
        function () {

          if (
            moduleName === 'topupSettings' &&
            GENZ.topupSettings &&
            typeof GENZ.topupSettings.load === 'function'
          ) {

            resolve(
              GENZ.topupSettings
            );

          } else {

            reject(
              new Error(
                `Modul ${moduleName} berhasil dimuat tetapi GENZ.${moduleName} tidak tersedia.`
              )
            );

          }

        };


      script.onerror =
        function () {

          reject(
            new Error(
              `Gagal memuat ${src}`
            )
          );

        };


      document.head.appendChild(
        script
      );

    }
  );


if (
  moduleName === 'topupSettings'
) {

  topupSettingsLoading =
    promise;

  promise.finally(
    function () {

      if (
        topupSettingsLoading ===
        promise
      ) {

        topupSettingsLoading =
          null;

      }

    }
  );

}


return promise;

}

async function ensureTopupSettings() {

if (
  GENZ.topupSettings &&
  typeof GENZ.topupSettings.load === 'function'
) {

  return GENZ.topupSettings;

}


return await loadScriptOnce(
  '/js/topup-settings.js',
  'topupSettings'
);

}

/* =========================================================
LOAD MAIN COMPONENTS
========================================================= */

async function loadComponents() {

const app =
  $('app');

if (!app) {

  throw new Error(
    'Element #app tidak ditemukan'
  );

}


app.innerHTML = `

  <div
    id="auth-container">
  </div>

  <div
    id="application-container"
    class="hidden">

    <div
      id="header-container">
    </div>

    <main
      id="main-container">
    </main>

    <div
      id="pageContent"
      class="hidden">
    </div>

  </div>

`;


if (
  typeof GENZ.loadComponent !== 'function'
) {

  throw new Error(
    'GENZ.loadComponent tidak tersedia. Pastikan core.js dimuat.'
  );

}


/* =======================================================
   AUTH
======================================================= */

const authContainer =
  $('auth-container');

if (!authContainer) {

  throw new Error(
    'Element #auth-container tidak ditemukan'
  );

}


try {

  await GENZ.loadComponent(
    '#auth-container',
    '/components/auth.html'
  );

} catch (authComponentError) {

  error(
    'Gagal memuat auth.html:',
    authComponentError
  );


  authContainer.innerHTML = `

    <section
      id="auth"
      class="auth-page">

      <div
        class="auth-card">

        <div
          class="auth-header">

          <div
            class="auth-logo">
            GEN-Z.AI
          </div>

          <h1>
            Selamat Datang
          </h1>

          <p>
            Login untuk menggunakan GEN-Z.AI
          </p>

        </div>


        <form
          id="authForm">

          <div
            class="form-group">

            <label
              for="email">
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Masukkan email"
              autocomplete="email"
              required>

          </div>


          <div
            class="form-group">

            <label
              for="password">
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              placeholder="Masukkan password"
              autocomplete="current-password"
              required>

          </div>


          <div
            id="authMsg"
            class="auth-message"
            aria-live="polite">
          </div>


          <button
            id="login"
            type="submit"
            class="auth-primary-btn">

            LOGIN

          </button>


          <div
            class="auth-actions">

            <button
              id="register"
              type="button"
              class="auth-secondary-btn">

              DAFTAR

            </button>


            <button
              id="forgotPassword"
              type="button"
              class="auth-link-btn">

              LUPA PASSWORD?

            </button>

          </div>

        </form>

      </div>

    </section>

  `;

}


/* =======================================================
   HEADER
======================================================= */

const headerContainer =
  $('header-container');

if (!headerContainer) {

  throw new Error(
    'Element #header-container tidak ditemukan'
  );

}


try {

  await GENZ.loadComponent(
    '#header-container',
    '/components/header.html'
  );

} catch (headerError) {

  error(
    'Gagal memuat header.html:',
    headerError
  );


  headerContainer.innerHTML = `

    <header
      class="app-header">

      <div>
        <strong>
          GEN-Z.AI
        </strong>
      </div>

    </header>

  `;

}


/* =======================================================
   GENERATOR
======================================================= */

const main =
  $('main-container');

if (!main) {

  throw new Error(
    'Element #main-container tidak ditemukan'
  );

}


try {

  await GENZ.loadComponent(
    '#main-container',
    '/components/generator.html'
  );

} catch (componentError) {

  error(
    'Gagal memuat generator.html:',
    componentError
  );


  main.innerHTML = `

    <section
      class="page-card">

      <h2>
        GEN-Z.AI
      </h2>

      <p>
        Generator belum dapat dimuat.
      </p>

      <small>
        Periksa file
        /components/generator.html
      </small>

    </section>

  `;

}


/* =======================================================
   ACCOUNT
======================================================= */

if (
  GENZ.account &&
  typeof GENZ.account.init === 'function'
) {

  try {

    await GENZ.account.init();

  } catch (accountError) {

    error(
      'Account module error:',
      accountError
    );

  }

} else {

  console.warn(
    '[GEN-Z.AI] account.js belum tersedia'
  );

}

}

/* =========================================================
AUTH SESSION SYNC
========================================================= */

async function syncAuth() {

try {

  let session =
    null;


  /* -----------------------------------------------------
     Gunakan auth.js jika tersedia
  ----------------------------------------------------- */

  if (
    window.GENZ_AUTH &&
    typeof window.GENZ_AUTH.getSession === 'function'
  ) {

    session =
      await window.GENZ_AUTH.getSession();

  }


  /* -----------------------------------------------------
     Fallback Supabase client
  ----------------------------------------------------- */

  else {

    const client =
      window.GENZ_AUTH_CLIENT;


    if (
      !client ||
      !client.auth ||
      typeof client.auth.getSession !== 'function'
    ) {

      console.warn(
        '[GEN-Z.AI] Auth client belum tersedia'
      );


      await handleLogout(
        false
      );


      return false;

    }


    const result =
      await client.auth.getSession();


    session =
      result?.data?.session ||
      null;

  }


  /* -----------------------------------------------------
     SESSION AKTIF
  ----------------------------------------------------- */

  if (
    session &&
    session.user
  ) {

    GENZ.state.loggedIn =
      true;

    GENZ.state.user =
      session.user;


    await handleLogin(
      session.user,
      false
    );


    return true;

  }


  /* -----------------------------------------------------
     TIDAK LOGIN
  ----------------------------------------------------- */

  GENZ.state.loggedIn =
    false;

  GENZ.state.user =
    null;


  await handleLogout(
    false
  );


  return false;


} catch (authError) {

  error(
    'Auth sync error:',
    authError
  );


  await handleLogout(
    false
  );


  return false;

}

}

/* =========================================================
LOGIN HANDLER
========================================================= */

async function handleLogin(
user,
emitEvent = false
) {

if (user) {

  GENZ.state.loggedIn =
    true;

  GENZ.state.user =
    user;

}


if (!GENZ.state.user) {

  return;

}


/* =======================================================
   RESET PRIVILEGE SEBELUM VALIDASI SERVER
======================================================= */

GENZ.state.account = {

  ...(GENZ.state.account || {}),

  isAdmin:
    false,

  roleValidated:
    false

};


/* =======================================================
   ACCOUNT UI
======================================================= */

if (
  GENZ.account &&
  typeof GENZ.account.ensureUI === 'function'
) {

  try {

    await GENZ.account.ensureUI();

  } catch (accountError) {

    error(
      'Account UI error:',
      accountError
    );

  }

}


/* =======================================================
   UPDATE USER
======================================================= */

if (
  GENZ.account &&
  typeof GENZ.account.updateUser === 'function'
) {

  try {

    GENZ.account.updateUser(
      GENZ.state.user
    );

  } catch (updateError) {

    error(
      'Account user update error:',
      updateError
    );

  }

}


/* =======================================================
   ACCOUNT REFRESH
   SERVER ADALAH SUMBER KEBENARAN ROLE
======================================================= */

if (
  GENZ.account &&
  typeof GENZ.account.refresh === 'function'
) {

  try {

    await GENZ.account.refresh();

  } catch (refreshError) {

    error(
      'Account refresh error:',
      refreshError
    );

  }

}


/* =======================================================
   PROVIDERS
======================================================= */

if (
  GENZ.providers &&
  typeof GENZ.providers.load === 'function'
) {

  try {

    await GENZ.providers.load();

  } catch (providerError) {

    error(
      'Provider loading error:',
      providerError
    );

  }

}


/* =======================================================
   UPLOAD MODULE
======================================================= */

if (
  GENZ.upload &&
  typeof GENZ.upload.init === 'function'
) {

  try {

    GENZ.upload.init();

  } catch (uploadError) {

    error(
      'Upload module error:',
      uploadError
    );

  }

}


/* =======================================================
   GENERATOR MODULE
======================================================= */

if (
  GENZ.generator &&
  typeof GENZ.generator.init === 'function'
) {

  try {

    GENZ.generator.init();

  } catch (generatorError) {

    error(
      'Generator module error:',
      generatorError
    );

  }

}


/* =======================================================
   TAMPILKAN STUDIO
======================================================= */

showStudio();


/* =======================================================
   EVENT INTERNAL
======================================================= */

if (
  emitEvent &&
  typeof GENZ.emit === 'function'
) {

  GENZ.emit(
    'auth-login',
    GENZ.state.user
  );

}

}

/* =========================================================
LOGOUT HANDLER
========================================================= */

async function handleLogout(
emitEvent = false
) {

GENZ.state.loggedIn =
  false;

GENZ.state.user =
  null;


/* =======================================================
   RESET ACCOUNT / ADMIN
======================================================= */

GENZ.state.account = {

  isAdmin:
    false,

  roleValidated:
    false

};


/* =======================================================
   HENTIKAN POLLING VIDEO
======================================================= */

if (
  GENZ.video &&
  typeof GENZ.video.stopPolling === 'function'
) {

  try {

    GENZ.video.stopPolling();

  } catch (_) {}

}


/* =======================================================
   BERSIHKAN VIDEO
======================================================= */

if (
  GENZ.video &&
  typeof GENZ.video.clear === 'function'
) {

  try {

    GENZ.video.clear();

  } catch (_) {}

}


/* =======================================================
   TUTUP ACCOUNT MENU
======================================================= */

if (
  GENZ.account &&
  typeof GENZ.account.close === 'function'
) {

  try {

    GENZ.account.close();

  } catch (_) {}

}


/* =======================================================
   SEMBUNYIKAN APPLICATION
======================================================= */

const application =
  $('application-container');

if (application) {

  application.classList.add(
    'hidden'
  );

}


/* =======================================================
   TAMPILKAN LOGIN
======================================================= */

const authContainer =
  $('auth-container');

if (authContainer) {

  authContainer.classList.remove(
    'hidden'
  );

}


if (
  GENZ.auth &&
  typeof GENZ.auth.showLoggedOutUI === 'function'
) {

  try {

    GENZ.auth.showLoggedOutUI();

  } catch (_) {}

} else {

  const auth =
    $('auth');

  if (auth) {

    auth.style.display =
      'block';

    auth.classList.remove(
      'hidden'
    );

  }

}


/* =======================================================
   EVENT INTERNAL
======================================================= */

if (
  emitEvent &&
  typeof GENZ.emit === 'function'
) {

  GENZ.emit(
    'auth-logout'
  );

}

}

/* =========================================================
BIND AUTH EVENTS
========================================================= */

function bindAuth() {

if (authBound) {

  return;

}


authBound =
  true;


/* =======================================================
   LOGIN EVENT
======================================================= */

window.addEventListener(
  'genz-auth-login',
  function (event) {

    const detail =
      event?.detail || {};


    const user =
      detail?.user ||
      (
        detail?.email ||
        detail?.id
          ? detail
          : GENZ.state.user
      );


    if (!user) {

      return;

    }


    handleLogin(
      user,
      false
    ).catch(
      authError => {

        error(
          'Login handler error:',
          authError
        );

      }
    );

  }
);


/* =======================================================
   LOGOUT EVENT
======================================================= */

window.addEventListener(
  'genz-auth-logout',
  function () {

    handleLogout(
      false
    ).catch(
      authError => {

        error(
          'Logout handler error:',
          authError
        );

      }
    );

  }
);

}

/* =========================================================
SHOW STUDIO
========================================================= */

function showStudio() {

const authContainer =
  $('auth-container');

const application =
  $('application-container');

const main =
  $('main-container');

const pages =
  $('pageContent');


/* =======================================================
   HIDE LOGIN
======================================================= */

if (authContainer) {

  authContainer.classList.add(
    'hidden'
  );

}


const auth =
  $('auth');

if (auth) {

  auth.style.display =
    'none';

}


/* =======================================================
   SHOW APPLICATION
======================================================= */

if (application) {

  application.classList.remove(
    'hidden'
  );

}


if (pages) {

  pages.classList.add(
    'hidden'
  );

}


if (main) {

  main.classList.remove(
    'hidden'
  );

}


GENZ.state.currentPage =
  'studio';


const back =
  $('backToStudio');

if (back) {

  back.classList.add(
    'hidden'
  );

}

}

/* =========================================================
SHOW PAGE
========================================================= */

async function showPage(
page
) {

if (!page) {

  showStudio();

  return;

}


/* -------------------------------------------------------
   Semua halaman internal membutuhkan login.
------------------------------------------------------- */

if (!isLoggedIn()) {

  await handleLogout(
    false
  );

  return;

}


const main =
  $('main-container');

const pages =
  $('pageContent');


if (!pages) {

  return;

}


if (main) {

  main.classList.add(
    'hidden'
  );

}


pages.classList.remove(
  'hidden'
);


GENZ.state.currentPage =
  page;


const back =
  $('backToStudio');

if (back) {

  back.classList.remove(
    'hidden'
  );

}


/* =======================================================
   ROUTING
======================================================= */

switch (page) {


  /* =====================================================
     PROFILE
  ===================================================== */

  case 'profile':

    if (
      GENZ.profile &&
      typeof GENZ.profile.load === 'function'
    ) {

      await GENZ.profile.load();

    } else {

      showModuleUnavailable(
        'Profile',
        '/js/profile.js'
      );

    }

    break;


  /* =====================================================
     CREDIT
  ===================================================== */

  case 'credit':

    if (
      GENZ.credit &&
      typeof GENZ.credit.load === 'function'
    ) {

      await GENZ.credit.load();

    } else {

      showModuleUnavailable(
        'Credit',
        '/js/credit.js'
      );

    }

    break;


  /* =====================================================
     TOP UP USER
  ===================================================== */

  case 'topup':

    if (
      GENZ.topup &&
      typeof GENZ.topup.load === 'function'
    ) {

      await GENZ.topup.load();

    } else {

      showModuleUnavailable(
        'Top Up',
        '/js/topup.js'
      );

    }

    break;


  /* =====================================================
     TOP UP SETTING
     ADMIN / OWNER ONLY
  ===================================================== */

  case 'topup-settings':

    if (!isAdmin()) {

      showAccessDenied(
        'Akses Top Up Setting hanya untuk Admin / Owner.'
      );

      break;

    }


    try {

      const topupSettings =
        await ensureTopupSettings();


      if (
        topupSettings &&
        typeof topupSettings.load === 'function'
      ) {

        await topupSettings.load();

      } else {

        showModuleUnavailable(
          'Top Up Setting',
          '/js/topup-settings.js'
        );

      }

    } catch (moduleError) {

      error(
        'Top Up Setting module error:',
        moduleError
      );


      showModuleUnavailable(
        'Top Up Setting',
        '/js/topup-settings.js'
      );

    }

    break;


  /* =====================================================
     ADMIN PANEL
  ===================================================== */

  case 'admin':

    if (!isAdmin()) {

      showAccessDenied(
        'Panel Admin hanya dapat diakses oleh Admin / Owner.'
      );

      break;

    }


    if (
      GENZ.admin &&
      typeof GENZ.admin.load === 'function'
    ) {

      await GENZ.admin.load();

    } else {

      showModuleUnavailable(
        'Admin Panel',
        '/js/admin.js'
      );

    }

    break;


  /* =====================================================
     CONTACT ADMIN
     USER BIASA ONLY
  ===================================================== */

  case 'contact':

    if (isAdmin()) {

      showAccessDenied(
        'Menu Hub Admin tidak tersedia untuk Admin / Owner.'
      );

      break;

    }


    showContactAdmin();

    break;


  /* =====================================================
     MEMBERSHIP
     USER BIASA ONLY
  ===================================================== */

  case 'membership':

    if (isAdmin()) {

      showAccessDenied(
        'Menu Membership tidak tersedia untuk Admin / Owner.'
      );

      break;

    }


    showMembership();

    break;


  /* =====================================================
     AFFILIATE
  ===================================================== */

  case 'affiliate':

    showAffiliate();

    break;


  /* =====================================================
     DEFAULT
  ===================================================== */

  default:

    showStudio();

    break;

}

}

/* =========================================================
ACCESS DENIED
========================================================= */

function showAccessDenied(
message
) {

const pages =
  $('pageContent');

if (!pages) {

  return;

}


pages.innerHTML = `

  <section
    class="page-card">

    <div
      class="page-header">

      <button
        type="button"
        class="back-btn"
        id="accessDeniedBack">

        ←

      </button>


      <div>

        <h2>
          Akses Ditolak
        </h2>

        <p>
          ${escapeHtml(
            message ||
            'Anda tidak memiliki akses ke halaman ini.'
          )}
        </p>

      </div>

    </div>

  </section>

`;


const back =
  $('accessDeniedBack');

if (back) {

  back.addEventListener(
    'click',
    showStudio,
    {
      once: true
    }
  );

}

}

/* =========================================================
MODULE UNAVAILABLE
========================================================= */

function showModuleUnavailable(
moduleName,
fileName
) {

const pages =
  $('pageContent');

if (!pages) {

  return;

}


pages.innerHTML = `

  <section
    class="page-card">

    <div
      class="page-header">

      <button
        type="button"
        class="back-btn"
        id="moduleUnavailableBack">

        ←

      </button>


      <div>

        <h2>
          ${escapeHtml(
            moduleName
          )}
        </h2>

        <p>
          Modul belum tersedia.
        </p>

      </div>

    </div>


    <div
      class="contact-admin">

      <p>
        File modul belum dimuat oleh aplikasi.
      </p>

      <small>
        Periksa:
        ${escapeHtml(
          fileName
        )}
      </small>

    </div>

  </section>

`;


const back =
  $('moduleUnavailableBack');

if (back) {

  back.addEventListener(
    'click',
    showStudio,
    {
      once: true
    }
  );

}

}

/* =========================================================
CONTACT ADMIN
========================================================= */

function showContactAdmin() {

const pages =
  $('pageContent');

if (!pages) {

  return;

}


pages.innerHTML = `

  <section
    class="page-card">

    <div
      class="page-header">

      <button
        type="button"
        class="back-btn"
        id="contactBack">

        ←

      </button>


      <div>

        <h2>
          Chat Admin
        </h2>

        <p>
          Hubungi administrator GEN-Z.AI
        </p>

      </div>

    </div>


    <div
      class="contact-admin">

      <p>
        Silakan hubungi admin untuk
        bantuan akun, kredit, atau
        kendala penggunaan GEN-Z.AI.
      </p>

    </div>

  </section>

`;


const back =
  $('contactBack');

if (back) {

  back.addEventListener(
    'click',
    showStudio,
    {
      once: true
    }
  );

}

}

/* =========================================================
MEMBERSHIP
========================================================= */

function showMembership() {

const pages =
  $('pageContent');

if (!pages) {

  return;

}


pages.innerHTML = `

  <section
    class="page-card">

    <div
      class="page-header">

      <button
        type="button"
        class="back-btn"
        id="membershipBack">

        ←

      </button>


      <div>

        <h2>
          Membership
        </h2>

        <p>
          Informasi membership GEN-Z.AI
        </p>

      </div>

    </div>


    <div
      class="contact-admin">

      <p>
        Halaman membership sedang
        dipersiapkan.
      </p>

    </div>

  </section>

`;


const back =
  $('membershipBack');

if (back) {

  back.addEventListener(
    'click',
    showStudio,
    {
      once: true
    }
  );

}

}

/* =========================================================
AFFILIATE
========================================================= */

function showAffiliate() {

const pages =
  $('pageContent');

if (!pages) {

  return;

}


pages.innerHTML = `

  <section
    class="page-card">

    <div
      class="page-header">

      <button
        type="button"
        class="back-btn"
        id="affiliateBack">

        ←

      </button>


      <div>

        <h2>
          Affiliate
        </h2>

        <p>
          Program affiliate GEN-Z.AI
        </p>

      </div>

    </div>


    <div
      class="contact-admin">

      <p>
        Halaman affiliate sedang
        dipersiapkan.
      </p>

    </div>

  </section>

`;


const back =
  $('affiliateBack');

if (back) {

  back.addEventListener(
    'click',
    showStudio,
    {
      once: true
    }
  );

}

}

/* =========================================================
ESCAPE HTML
========================================================= */

function escapeHtml(
value
) {

if (
  GENZ.escapeHtml &&
  typeof GENZ.escapeHtml === 'function'
) {

  return GENZ.escapeHtml(
    String(value ?? '')
  );

}


return String(value ?? '')
  .replace(
    /&/g,
    '&amp;'
  )
  .replace(
    /</g,
    '&lt;'
  )
  .replace(
    />/g,
    '&gt;'
  )
  .replace(
    /"/g,
    '&quot;'
  )
  .replace(
    /'/g,
    '&#039;'
  );

}

/* =========================================================
ACCOUNT NAVIGATION
========================================================= */

function bindNavigation() {

if (navigationBound) {

  return;

}


navigationBound =
  true;


/* =======================================================
   ACCOUNT MENU
======================================================= */

document.addEventListener(
  'click',
  function (event) {

    const target =
      event.target;


    if (
      !target ||
      typeof target.closest !== 'function'
    ) {

      return;

    }


    const button =
      target.closest(
        '[data-page]'
      );


    if (!button) {

      return;

    }


    const page =
      button.dataset.page;


    if (!page) {

      return;

    }


    event.preventDefault();


    showPage(
      page
    ).catch(
      pageError => {

        error(
          'Page loading error:',
          pageError
        );

      }
    );

  }
);


/* =======================================================
   DATA BACK STUDIO
======================================================= */

document.addEventListener(
  'click',
  function (event) {

    const target =
      event.target;


    if (
      !target ||
      typeof target.closest !== 'function'
    ) {

      return;

    }


    const button =
      target.closest(
        '[data-back-studio]'
      );


    if (!button) {

      return;

    }


    event.preventDefault();

    showStudio();

  }
);


/* =======================================================
   HEADER BACK BUTTON
======================================================= */

document.addEventListener(
  'click',
  function (event) {

    const target =
      event.target;


    if (
      !target ||
      typeof target.closest !== 'function'
    ) {

      return;

    }


    const button =
      target.closest(
        '#backToStudio'
      );


    if (!button) {

      return;

    }


    event.preventDefault();

    showStudio();

  }
);


/* =======================================================
   EVENT BUS
======================================================= */

if (
  typeof GENZ.on === 'function'
) {

  GENZ.on(
    'show-studio',
    showStudio
  );


  GENZ.on(
    'show-page',
    function (page) {

      showPage(
        page
      ).catch(
        pageError => {

          error(
            'show-page error:',
            pageError
          );

        }
      );

    }
  );

}

}

/* =========================================================
START APPLICATION
========================================================= */

async function start() {

if (started) {

  return;

}


log(
  'APPLICATION START'
);


try {

  /* -----------------------------------------------------
     Pastikan state dasar tersedia
  ----------------------------------------------------- */

  GENZ.state =
    GENZ.state ||
    {};


  GENZ.state.account =
    GENZ.state.account ||
    {

      isAdmin:
        false,

      roleValidated:
        false

    };


  GENZ.state.loggedIn =
    GENZ.state.loggedIn === true;


  /* -----------------------------------------------------
     Bind event terlebih dahulu
  ----------------------------------------------------- */

  bindNavigation();

  bindAuth();


  /* -----------------------------------------------------
     Load components
  ----------------------------------------------------- */

  await loadComponents();


  /* -----------------------------------------------------
     Aplikasi internal disembunyikan
     sebelum session selesai diperiksa
  ----------------------------------------------------- */

  const application =
    $('application-container');

  if (application) {

    application.classList.add(
      'hidden'
    );

  }


  /* -----------------------------------------------------
     Sinkronisasi session
  ----------------------------------------------------- */

  await syncAuth();


  started =
    true;

  GENZ.state.initialized =
    true;


  log(
    'APPLICATION READY'
  );


} catch (startupError) {

  GENZ.state.initialized =
    false;


  error(
    'APPLICATION START ERROR:',
    startupError
  );


  const app =
    $('app');


  if (app) {

    const errorMessage =
      startupError?.message ||
      'Unknown error';


    const safeMessage =
      escapeHtml(
        errorMessage
      );


    app.innerHTML = `

      <section
        class="page-card">

        <h2>
          GEN-Z.AI
        </h2>

        <p>
          Aplikasi gagal dimuat.
        </p>

        <small>
          ${safeMessage}
        </small>

      </section>

    `;

  }

}

}

/* =========================================================
PUBLIC API
========================================================= */

GENZ.start =
start;

GENZ.showStudio =
showStudio;

GENZ.showPage =
showPage;

/* =========================================================
DOM READY
========================================================= */

if (
document.readyState === 'loading'
) {

document.addEventListener(
  'DOMContentLoaded',
  function () {

    start().catch(
      startupError => {

        error(
          'Unhandled startup error:',
          startupError
        );

      }
    );

  },
  {
    once: true
  }
);

} else {

start().catch(
  startupError => {

    error(
      'Unhandled startup error:',
      startupError
    );

  }
);

}

})();
