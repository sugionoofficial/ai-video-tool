/* =========================================================
   GEN-Z.AI
   ADMIN PANEL ENHANCEMENTS

   Fitur:
   - ADD PROVIDER
   - Provider deployment
   - Provider active/inactive
   - ADD ADMIN
   - Admin active/inactive

   File:
   public/js/admin-enhancements.js
========================================================= */

(function () {

  'use strict';

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  /* =======================================================
     HELPERS
  ======================================================= */

  function $(id) {
    return document.getElementById(id);
  }


  function esc(value) {

    if (
      GENZ.escapeHtml &&
      typeof GENZ.escapeHtml === 'function'
    ) {
      return GENZ.escapeHtml(
        String(value ?? '')
      );
    }

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }


  async function getToken() {

    if (
      GENZ.auth &&
      typeof GENZ.auth.token === 'function'
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
      !headers['Content-Type']
    ) {
      headers['Content-Type'] =
        'application/json';
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
          headers
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


  function message(
    text,
    type = ''
  ) {

    const element =
      $('adminStatus');

    if (!element) {
      return;
    }

    element.className =
      `admin-status-message ${type}`;

    element.textContent =
      text || '';

  }


  function normalizeProvider(
    value
  ) {

    const text =
      String(value || '')
        .trim()
        .toLowerCase();

    if (
      text === 'gemini' ||
      text === 'veo' ||
      text.includes('gemini') ||
      text.includes('veo')
    ) {

      return {
        id: 'veo',
        adapter: 'veo',
        name: 'Gemini / Veo'
      };

    }

    if (
      text === 'minimax' ||
      text.includes('minimax') ||
      text.includes('mini max')
    ) {

      return {
        id: 'minimax',
        adapter: 'minimax',
        name: 'MiniMax'
      };

    }

    if (
      text === 'luma' ||
      text.includes('luma')
    ) {

      return {
        id: 'luma',
        adapter: 'luma',
        name: 'Luma'
      };

    }

    return null;

  }


  function providerStatus(
    enabled
  ) {

    if (enabled) {

      return `
        <span class="genz-admin-badge active">
          Aktif
        </span>
      `;

    }

    return `
      <span class="genz-admin-badge inactive">
        Non Aktif
      </span>
    `;

  }


  function adminStatus(
    active
  ) {

    if (active) {

      return `
        <span class="genz-admin-badge active">
          Aktif
        </span>
      `;

    }

    return `
      <span class="genz-admin-badge inactive">
        Non Aktif
      </span>
    `;

  }


  /* =======================================================
     STYLE
  ======================================================= */

  function injectStyle() {

    if (
      document.getElementById(
        'genz-admin-enhancement-style'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'genz-admin-enhancement-style';

    style.textContent = `

      .genz-admin-enhancement {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .genz-admin-box {
        background: rgba(255,255,255,.035);
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 16px;
        padding: 18px;
      }

      .genz-admin-box h3 {
        margin: 0 0 14px;
        font-size: 17px;
      }

      .genz-admin-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .genz-admin-form label {
        font-size: 13px;
        opacity: .75;
      }

      .genz-admin-form input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(0,0,0,.22);
        color: inherit;
        border-radius: 10px;
        padding: 12px 13px;
        outline: none;
      }

      .genz-admin-form input:focus {
        border-color: rgba(255,255,255,.35);
      }

      .genz-admin-submit {
        border: 0;
        border-radius: 10px;
        padding: 12px 16px;
        cursor: pointer;
        font-weight: 700;
        background: #fff;
        color: #111;
      }

      .genz-admin-submit:disabled {
        opacity: .5;
        cursor: wait;
      }

      .genz-admin-table {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .genz-admin-row {
        display: grid;
        grid-template-columns: minmax(0,1fr) auto auto;
        gap: 12px;
        align-items: center;
        padding: 12px;
        border-radius: 11px;
        background: rgba(255,255,255,.025);
        border: 1px solid rgba(255,255,255,.06);
      }

      .genz-admin-row-name {
        min-width: 0;
      }

      .genz-admin-row-name strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .genz-admin-row-name small {
        display: block;
        opacity: .55;
        margin-top: 3px;
      }

      .genz-admin-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 82px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
      }

      .genz-admin-badge.active {
        color: #54e38e;
        background: rgba(84,227,142,.10);
        border: 1px solid rgba(84,227,142,.25);
      }

      .genz-admin-badge.inactive {
        color: #ff6464;
        background: rgba(255,100,100,.10);
        border: 1px solid rgba(255,100,100,.25);
      }

      .genz-admin-toggle {
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.05);
        color: inherit;
        border-radius: 9px;
        padding: 8px 11px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
      }

      .genz-admin-toggle:disabled {
        opacity: .5;
        cursor: wait;
      }

      .genz-admin-empty {
        padding: 18px;
        text-align: center;
        opacity: .55;
        border: 1px dashed rgba(255,255,255,.10);
        border-radius: 12px;
      }

      .genz-admin-note {
        margin-top: 8px;
        font-size: 12px;
        opacity: .55;
        line-height: 1.5;
      }

      @media (max-width: 650px) {

        .genz-admin-row {
          grid-template-columns: 1fr;
          align-items: stretch;
        }

        .genz-admin-row .genz-admin-badge,
        .genz-admin-row .genz-admin-toggle {
          width: 100%;
        }

      }

    `;

    document.head.appendChild(style);

  }


  /* =======================================================
     PROVIDER
  ======================================================= */

  async function loadProviders() {

    const response =
      await api(
        '/api/admin/providers'
      );

    return response.providers || [];

  }


  async function renderProviderManager() {

    const content =
      $('adminContent');

    if (!content) {
      return;
    }

    const providers =
      await loadProviders();

    content.innerHTML = `

      <div class="genz-admin-enhancement">

        <div class="genz-admin-box">

          <h3>ADD PROVIDER</h3>

          <form
            id="genzAddProviderForm"
            class="genz-admin-form"
          >

            <label for="genzProviderName">
              Nama provider
            </label>

            <input
              id="genzProviderName"
              type="text"
              placeholder="Gemini, MiniMax, atau Luma"
              autocomplete="off"
              required
            >

            <label for="genzProviderApiKey">
              API Key
            </label>

            <input
              id="genzProviderApiKey"
              type="password"
              placeholder="Masukkan API key provider"
              autocomplete="new-password"
              required
            >

            <button
              id="genzProviderDeploy"
              class="genz-admin-submit"
              type="submit"
            >
              DEPLOYMENT
            </button>

          </form>

          <div class="genz-admin-note">
            Nama Gemini/Veo otomatis menggunakan adapter Gemini/Veo.
            MiniMax dan Luma juga dikenali otomatis.
            API key tidak ditampilkan kembali di halaman.
          </div>

        </div>


        <div class="genz-admin-box">

          <h3>PROVIDER</h3>

          <div
            id="genzProviderList"
            class="genz-admin-table"
          >

            ${renderProviderRows(
              providers
            )}

          </div>

        </div>

      </div>

    `;


    const form =
      $('genzAddProviderForm');

    if (form) {

      form.addEventListener(
        'submit',
        deployProvider
      );

    }


    bindProviderToggles();

  }


  function renderProviderRows(
    providers
  ) {

    if (!providers.length) {

      return `
        <div class="genz-admin-empty">
          Belum ada provider.
        </div>
      `;

    }


    return providers
      .map(
        provider => {

          const enabled =
            provider.enabled === true;

          return `

            <div
              class="genz-admin-row"
              data-provider-id="${esc(
                provider.id
              )}"
            >

              <div class="genz-admin-row-name">

                <strong>
                  ${esc(
                    provider.name ||
                    provider.id
                  )}
                </strong>

                <small>
                  ${esc(
                    provider.adapter ||
                    provider.id
                  )}
                </small>

              </div>

              ${providerStatus(
                enabled
              )}

              <button
                type="button"
                class="genz-admin-toggle"
                data-provider-toggle="${esc(
                  provider.id
                )}"
              >
                ${
                  enabled
                    ? 'NON AKTIFKAN'
                    : 'AKTIFKAN'
                }
              </button>

            </div>

          `;

        }
      )
      .join('');

  }


  function bindProviderToggles() {

    document
      .querySelectorAll(
        '[data-provider-toggle]'
      )
      .forEach(
        button => {

          button.addEventListener(
            'click',
            toggleProvider
          );

        }
      );

  }


  async function toggleProvider(
    event
  ) {

    const button =
      event.currentTarget;

    const id =
      button.dataset.providerToggle;

    if (!id) {
      return;
    }

    button.disabled =
      true;

    const current =
      button.textContent
        .trim()
        .toUpperCase();

    const enabled =
      current === 'AKTIFKAN';

    try {

      await api(
        `/api/admin/providers/${encodeURIComponent(id)}/toggle`,
        {
          method: 'POST',
          headers: {
            'x-enable':
              enabled
                ? 'true'
                : 'false'
          }
        }
      );

      message(
        enabled
          ? 'Provider berhasil diaktifkan.'
          : 'Provider berhasil dinonaktifkan.',
        'success'
      );

      await renderProviderManager();

    } catch (error) {

      console.error(
        '[GEN-Z.AI] Provider toggle error:',
        error
      );

      message(
        error.message ||
        'Gagal mengubah status provider.',
        'error'
      );

      button.disabled =
        false;

    }

  }


  async function deployProvider(
    event
  ) {

    event.preventDefault();

    const form =
      event.currentTarget;

    const nameInput =
      $('genzProviderName');

    const keyInput =
      $('genzProviderApiKey');

    const deployButton =
      $('genzProviderDeploy');

    const name =
      String(
        nameInput?.value || ''
      ).trim();

    const apiKey =
      String(
        keyInput?.value || ''
      ).trim();

    if (!name) {

      message(
        'Nama provider wajib diisi.',
        'error'
      );

      return;

    }

    if (!apiKey) {

      message(
        'API key wajib diisi.',
        'error'
      );

      return;

    }

    const provider =
      normalizeProvider(name);

    if (!provider) {

      message(
        'Provider tidak dikenali. Gunakan Gemini, Veo, MiniMax, atau Luma.',
        'error'
      );

      return;

    }

    deployButton.disabled =
      true;

    deployButton.textContent =
      'DEPLOYING...';

    try {

      const providers =
        await loadProviders();

      const exists =
        providers.find(
          item =>
            String(item.id) ===
            String(provider.id)
        );

      const payload = {

        id: provider.id,

        name:
          name,

        adapter:
          provider.adapter,

        api_key:
          apiKey,

        enabled:
          true,

        config:
          {}

      };


      if (exists) {

        await api(
          `/api/admin/providers/${encodeURIComponent(provider.id)}`,
          {
            method: 'PUT',
            body: JSON.stringify(
              payload
            )
          }
        );

      } else {

        await api(
          '/api/admin/providers',
          {
            method: 'POST',
            body: JSON.stringify(
              payload
            )
          }
        );

      }


      form.reset();

      message(
        exists
          ? 'Provider berhasil diperbarui dan diaktifkan.'
          : 'Provider berhasil ditambahkan dan diaktifkan.',
        'success'
      );

      await renderProviderManager();

    } catch (error) {

      console.error(
        '[GEN-Z.AI] Provider deployment error:',
        error
      );

      message(
        error.message ||
        'Deployment provider gagal.',
        'error'
      );

      deployButton.disabled =
        false;

      deployButton.textContent =
        'DEPLOYMENT';

    }

  }


  /* =======================================================
     ADMIN
  ======================================================= */

  async function loadAdmins() {

    const response =
      await api(
        '/api/admin/admins'
      );

    return response.admins || [];

  }


  async function loadUsers() {

    const response =
      await api(
        '/api/admin/users'
      );

    return response.users || [];

  }


  async function renderAdminManager() {

    const content =
      $('adminContent');

    if (!content) {
      return;
    }

    const [
      admins,
      users
    ] = await Promise.all([
      loadAdmins(),
      loadUsers()
    ]);


    const activeMap =
      new Map(
        admins.map(
          admin => [
            String(admin.user_id),
            true
          ]
        )
      );


    const rows =
      users.filter(
        user =>
          user.email
      );


    content.innerHTML = `

      <div class="genz-admin-enhancement">

        <div class="genz-admin-box">

          <h3>ADD ADMIN</h3>

          <form
            id="genzAddAdminForm"
            class="genz-admin-form"
          >

            <label for="genzAdminEmail">
              Email admin
            </label>

            <input
              id="genzAdminEmail"
              type="email"
              placeholder="admin@example.com"
              autocomplete="off"
              required
            >

            <label for="genzAdminPassword">
              Password
            </label>

            <input
              id="genzAdminPassword"
              type="password"
              placeholder="Minimal 6 karakter"
              autocomplete="new-password"
              minlength="6"
              required
            >

            <button
              id="genzAdminCreate"
              class="genz-admin-submit"
              type="submit"
            >
              TAMBAH ADMIN
            </button>

          </form>

          <div class="genz-admin-note">
            Akun dibuat melalui Supabase Auth.
            Password tidak disimpan oleh panel admin.
          </div>

        </div>


        <div class="genz-admin-box">

          <h3>ADMIN</h3>

          <div
            id="genzAdminList"
            class="genz-admin-table"
          >

            ${
              renderAdminRows(
                rows,
                activeMap
              )
            }

          </div>

        </div>

      </div>

    `;


    const form =
      $('genzAddAdminForm');

    if (form) {

      form.addEventListener(
        'submit',
        createAdmin
      );

    }


    bindAdminToggles();

  }


  function renderAdminRows(
    users,
    activeMap
  ) {

    if (!users.length) {

      return `
        <div class="genz-admin-empty">
          Belum ada user.
        </div>
      `;

    }


    return users
      .map(
        user => {

          const userId =
            String(
              user.id ||
              user.user_id ||
              ''
            );

          const active =
            activeMap.has(
              userId
            );

          return `

            <div
              class="genz-admin-row"
              data-admin-id="${esc(
                userId
              )}"
            >

              <div class="genz-admin-row-name">

                <strong>
                  ${esc(
                    user.email
                  )}
                </strong>

                <small>
                  ${active
                    ? 'Administrator'
                    : 'User / non aktif'}
                </small>

              </div>

              ${adminStatus(
                active
              )}

              <button
                type="button"
                class="genz-admin-toggle"
                data-admin-toggle="${esc(
                  userId
                )}"
                data-admin-active="${active
                  ? 'true'
                  : 'false'}"
              >
                ${
                  active
                    ? 'NON AKTIFKAN'
                    : 'AKTIFKAN'
                }
              </button>

            </div>

          `;

        }
      )
      .join('');

  }


  function bindAdminToggles() {

    document
      .querySelectorAll(
        '[data-admin-toggle]'
      )
      .forEach(
        button => {

          button.addEventListener(
            'click',
            toggleAdmin
          );

        }
      );

  }


  async function createAdmin(
    event
  ) {

    event.preventDefault();

    const emailInput =
      $('genzAdminEmail');

    const passwordInput =
      $('genzAdminPassword');

    const button =
      $('genzAdminCreate');

    const email =
      String(
        emailInput?.value || ''
      )
      .trim()
      .toLowerCase();

    const password =
      String(
        passwordInput?.value || ''
      );

    if (!email) {

      message(
        'Email admin wajib diisi.',
        'error'
      );

      return;

    }

    if (!password) {

      message(
        'Password admin wajib diisi.',
        'error'
      );

      return;

    }

    if (password.length < 6) {

      message(
        'Password minimal 6 karakter.',
        'error'
      );

      return;

    }

    button.disabled =
      true;

    button.textContent =
      'MEMBUAT...';


    try {

      /*
       * Ambil konfigurasi Supabase
       * tanpa menyentuh session admin.
       */

      const configResponse =
        await fetch(
          '/api/config',
          {
            method: 'GET',
            cache: 'no-store',
            headers: {
              Accept:
                'application/json'
            }
          }
        );

      if (!configResponse.ok) {

        throw new Error(
          'Gagal mengambil konfigurasi Supabase.'
        );

      }

      const config =
        await configResponse.json();

      const supabaseUrl =
        String(
          config.supabaseUrl || ''
        ).trim();

      const publishableKey =
        String(
          config.supabasePublishableKey || ''
        ).trim();

      if (!supabaseUrl) {

        throw new Error(
          'Supabase URL belum tersedia.'
        );

      }

      if (!publishableKey) {

        throw new Error(
          'Supabase Publishable Key belum tersedia.'
        );

      }


      /*
       * Buat user langsung melalui REST Auth.
       * Tidak menggunakan signUp() dari client
       * supaya session admin tidak tergantikan
       * oleh akun baru.
       */

      const signupResponse =
        await fetch(
          `${supabaseUrl}/auth/v1/signup`,
          {
            method: 'POST',
            headers: {
              apikey:
                publishableKey,
              Authorization:
                `Bearer ${publishableKey}`,
              'Content-Type':
                'application/json'
            },
            body:
              JSON.stringify({
                email,
                password
              })
          }
        );


      let signupData = {};

      try {

        signupData =
          await signupResponse.json();

      } catch (_) {

        signupData = {};

      }


      if (!signupResponse.ok) {

        throw new Error(
          signupData?.msg ||
          signupData?.message ||
          signupData?.error_description ||
          'Gagal membuat akun admin.'
        );

      }


      const userId =
        signupData?.user?.id ||
        signupData?.id ||
        null;


      /*
       * Jika user sudah ada dan Supabase
       * tidak mengembalikan user ID,
       * backend akan menangani email tersebut.
       */

      if (!userId) {

        /*
         * Coba endpoint admin lama.
         * Endpoint ini mencari user berdasarkan email.
         */

        await api(
          '/api/admin/admins/add',
          {
            method: 'POST',
            body:
              JSON.stringify({
                email
              })
          }
        );

      } else {

        await api(
          '/api/admin/admins/add',
          {
            method: 'POST',
            body:
              JSON.stringify({
                email
              })
          }
        );

      }


      if (emailInput) {
        emailInput.value = '';
      }

      if (passwordInput) {
        passwordInput.value = '';
      }

      message(
        'Admin berhasil dibuat dan diaktifkan.',
        'success'
      );

      await renderAdminManager();

    } catch (error) {

      console.error(
        '[GEN-Z.AI] Create admin error:',
        error
      );

      message(
        error.message ||
        'Gagal membuat admin.',
        'error'
      );

      button.disabled =
        false;

      button.textContent =
        'TAMBAH ADMIN';

    }

  }


  async function toggleAdmin(
    event
  ) {

    const button =
      event.currentTarget;

    const userId =
      button.dataset.adminToggle;

    const currentlyActive =
      button.dataset.adminActive ===
      'true';

    if (!userId) {
      return;
    }


    /*
     * Jangan izinkan admin menghapus
     * role dirinya sendiri.
     */

    const currentUser =
      GENZ.state?.user ||
      {};

    const currentUserId =
      String(
        currentUser.id ||
        ''
      );


    if (
      currentlyActive &&
      currentUserId &&
      currentUserId ===
        String(userId)
    ) {

      message(
        'Admin yang sedang digunakan tidak dapat dinonaktifkan.',
        'error'
      );

      return;

    }


    button.disabled =
      true;


    try {

      if (currentlyActive) {

        await api(
          '/api/admin/admins/remove',
          {
            method: 'POST',
            body:
              JSON.stringify({
                user_id:
                  userId
              })
          }
        );

        message(
          'Admin berhasil dinonaktifkan.',
          'success'
        );

      } else {

        /*
         * Backend membutuhkan email,
         * jadi ambil dari daftar user.
         */

        const users =
          await loadUsers();

        const user =
          users.find(
            item =>
              String(
                item.id ||
                item.user_id ||
                ''
              ) ===
              String(userId)
          );

        if (!user?.email) {

          throw new Error(
            'Email admin tidak ditemukan.'
          );

        }


        await api(
          '/api/admin/admins/add',
          {
            method: 'POST',
            body:
              JSON.stringify({
                email:
                  user.email
              })
          }
        );

        message(
          'Admin berhasil diaktifkan.',
          'success'
        );

      }


      await renderAdminManager();

    } catch (error) {

      console.error(
        '[GEN-Z.AI] Admin toggle error:',
        error
      );

      message(
        error.message ||
        'Gagal mengubah status admin.',
        'error'
      );

      button.disabled =
        false;

    }

  }


  /* =======================================================
     TAB INTERCEPTOR
  ======================================================= */

  function setupInterceptor() {

    document.addEventListener(
      'click',
      function (event) {

        const target =
          event.target.closest(
            '[data-admin-section]'
          );

        if (!target) {
          return;
        }

        const section =
          target.dataset.adminSection;

        if (
          section !== 'providers' &&
          section !== 'admins'
        ) {
          return;
        }

        /*
         * admin.js sudah lebih dulu menangani
         * event click-nya. Kita tunggu sebentar,
         * kemudian mengganti tampilan section
         * dengan manager baru.
         */

        setTimeout(
          function () {

            if (
              section === 'providers'
            ) {

              renderProviderManager()
                .catch(
                  error => {

                    console.error(
                      '[GEN-Z.AI] Provider manager error:',
                      error
                    );

                    message(
                      error.message ||
                      'Gagal memuat provider.',
                      'error'
                    );

                  }
                );

            }

            if (
              section === 'admins'
            ) {

              renderAdminManager()
                .catch(
                  error => {

                    console.error(
                      '[GEN-Z.AI] Admin manager error:',
                      error
                    );

                    message(
                      error.message ||
                      'Gagal memuat admin.',
                      'error'
                    );

                  }
                );

            }

          },
          80
        );

      },
      true
    );

  }


  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initialize() {

    injectStyle();

    setupInterceptor();

    console.log(
      '[GEN-Z.AI] Admin enhancements aktif.'
    );

  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      initialize
    );

  } else {

    initialize();

  }

})();
