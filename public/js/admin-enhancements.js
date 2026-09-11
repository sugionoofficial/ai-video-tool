/* =========================================================
   GEN-Z.AI
   ADMIN PANEL ENHANCEMENTS

   Provider:
   - Dynamic provider ID
   - Adapter ditentukan oleh Worker/Provider Registry
   - Tidak menyimpan API key di frontend
   - Mendukung Gemini/Veo, MiniMax, Luma

   Admin:
   - Add admin
   - Active / inactive admin

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
      return GENZ.escapeHtml(String(value ?? ''));
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

  async function api(path, options = {}) {
    const accessToken = await getToken();

    const headers = {
      ...(options.headers || {})
    };

    if (
      options.body &&
      !headers['Content-Type']
    ) {
      headers['Content-Type'] = 'application/json';
    }

    if (accessToken) {
      headers.Authorization =
        `Bearer ${accessToken}`;
    }

    const response = await fetch(path, {
      ...options,
      headers,
      credentials: 'include'
    });

    let data = {};

    try {
      data = await response.json();
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

  function message(text, type = '') {
    const element = $('adminStatus');

    if (!element) {
      return;
    }

    element.className =
      `admin-status-message ${type}`;

    element.textContent =
      text || '';
  }

  /* =======================================================
     PROVIDER RESOLVER
  ======================================================= */

  function normalizeProvider(value) {
    const text =
      String(value || '')
        .trim()
        .toLowerCase();

    if (
      text.includes('gemini') ||
      text.includes('veo')
    ) {
      return {
        adapter: 'veo',
        label: 'Gemini / Veo'
      };
    }

    if (
      text.includes('minimax') ||
      text.includes('mini max')
    ) {
      return {
        adapter: 'minimax',
        label: 'MiniMax'
      };
    }

    if (text.includes('luma')) {
      return {
        adapter: 'luma',
        label: 'Luma'
      };
    }

    return null;
  }

  function slugifyProviderId(value) {
    let id =
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!id) {
      id = 'provider';
    }

    return id;
  }

  function makeUniqueProviderId(
    baseId,
    providers
  ) {
    const used = new Set(
      (providers || [])
        .map(item =>
          String(item?.id || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    );

    if (!used.has(baseId)) {
      return baseId;
    }

    let counter = 2;

    while (
      used.has(`${baseId}-${counter}`)
    ) {
      counter++;
    }

    return `${baseId}-${counter}`;
  }

  /* =======================================================
     STATUS
  ======================================================= */

  function providerStatus(enabled) {
    return enabled
      ? `
        <span class="genz-admin-badge active">
          Aktif
        </span>
      `
      : `
        <span class="genz-admin-badge inactive">
          Non Aktif
        </span>
      `;
  }

  function adminStatus(active) {
    return active
      ? `
        <span class="genz-admin-badge active">
          Aktif
        </span>
      `
      : `
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
        grid-template-columns:
          minmax(0,1fr)
          auto
          auto;
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

        .genz-admin-row
        .genz-admin-badge,
        .genz-admin-row
        .genz-admin-toggle {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     PROVIDER LOAD
  ======================================================= */

  async function loadProviders() {
    const response =
      await api('/api/admin/providers');

    return response.providers || [];
  }

  /* =======================================================
     PROVIDER RENDER
  ======================================================= */

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
              placeholder="Gemini Production"
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
            Nama provider menentukan adapter secara
            otomatis. Contoh: Gemini Production,
            Gemini Backup, MiniMax Production,
            atau Luma Production.
            API key tidak ditampilkan kembali.
          </div>

        </div>

        <div class="genz-admin-box">

          <h3>PROVIDER</h3>

          <div
            id="genzProviderList"
            class="genz-admin-table"
          >
            ${renderProviderRows(providers)}
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
      .map(provider => {
        const enabled =
          provider.enabled === true;

        const name =
          provider.name ||
          provider.id ||
          'Provider';

        const adapter =
          provider.adapter ||
          normalizeProvider(name)?.adapter ||
          provider.id ||
          '-';

        return `
          <div
            class="genz-admin-row"
            data-provider-id="${esc(provider.id)}"
          >

            <div class="genz-admin-row-name">

              <strong>
                ${esc(name)}
              </strong>

              <small>
                ID:
                ${esc(provider.id || '-')}
                · Adapter:
                ${esc(adapter)}
              </small>

            </div>

            ${providerStatus(enabled)}

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
      })
      .join('');
  }

  function bindProviderToggles() {
    document
      .querySelectorAll(
        '[data-provider-toggle]'
      )
      .forEach(button => {
        button.addEventListener(
          'click',
          toggleProvider
        );
      });
  }

  async function toggleProvider(event) {
    const button =
      event.currentTarget;

    const id =
      button.dataset.providerToggle;

    if (!id) {
      return;
    }

    const current =
      button.textContent
        .trim()
        .toUpperCase();

    const enabled =
      current === 'AKTIFKAN';

    button.disabled = true;

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

      button.disabled = false;
    }
  }

  /* =======================================================
     PROVIDER DEPLOYMENT
  ======================================================= */

  async function deployProvider(event) {
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

    /*
      Hanya digunakan untuk validasi nama.
      Adapter TIDAK dikirim dari frontend.
      Worker akan menentukan adapter melalui
      provider registry.
    */
    const providerType =
      normalizeProvider(name);

    if (!providerType) {
      message(
        'Provider tidak dikenali. Gunakan Gemini, Veo, MiniMax, atau Luma.',
        'error'
      );
      return;
    }

    deployButton.disabled = true;
    deployButton.textContent =
      'DEPLOYING...';

    try {
      const providers =
        await loadProviders();

      const baseId =
        slugifyProviderId(name);

      /*
        Jika ID dasar sama persis sudah ada,
        update provider tersebut.

        Contoh:
        Gemini
        -> gemini

        Jika belum ada:
        Gemini Production
        -> gemini-production

        Jika sudah ada:
        Gemini Production
        -> gemini-production-2
      */

      const existing =
        providers.find(item =>
          String(item?.id || '')
            .trim()
            .toLowerCase() ===
          baseId
        );

      let providerId;
      let method;
      let endpoint;

      if (existing) {
        providerId =
          String(existing.id);

        method = 'PUT';

        endpoint =
          `/api/admin/providers/${encodeURIComponent(
            providerId
          )}`;

      } else {
        providerId =
          makeUniqueProviderId(
            baseId,
            providers
          );

        method = 'POST';

        endpoint =
          '/api/admin/providers';
      }

      /*
        PERHATIKAN:
        Tidak ada adapter di sini.

        Worker:
        name/id
           ↓
        Provider Registry
           ↓
        veo / minimax / luma
      */

      const payload = {
        id: providerId,
        name,
        api_key: apiKey,
        enabled: true,
        config: {}
      };

      await api(
        endpoint,
        {
          method,
          body: JSON.stringify(payload)
        }
      );

      form.reset();

      message(
        existing
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

      deployButton.disabled = false;
      deployButton.textContent =
        'DEPLOYMENT';
    }
  }

  /* =======================================================
     ADMIN
  ======================================================= */

  async function loadAdmins() {
    const response =
      await api('/api/admin/admins');

    return response.admins || [];
  }

  async function loadUsers() {
    const response =
      await api('/api/admin/users');

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
      new Map();

    admins.forEach(admin => {
      const id =
        String(
          admin.user_id ||
          admin.id ||
          ''
        );

      if (id) {
        activeMap.set(
          id,
          true
        );
      }
    });

    content.innerHTML = `
      <div class="genz-admin-enhancement">

        <div class="genz-admin-box">

          <h3>ADD ADMIN</h3>

          <form
            id="genzAddAdminForm"
            class="genz-admin-form"
          >

            <label for="genzAdminEmail">
              Email
            </label>

            <input
              id="genzAdminEmail"
              type="email"
              placeholder="admin@email.com"
              autocomplete="off"
              required
            >

            <label for="genzAdminPassword">
              Password
            </label>

            <input
              id="genzAdminPassword"
              type="password"
              placeholder="Password akun admin"
              autocomplete="new-password"
              required
            >

            <button
              id="genzAdminCreate"
              class="genz-admin-submit"
              type="submit"
            >
              ADD ADMIN
            </button>

          </form>

          <div class="genz-admin-note">
            Akun dibuat melalui Supabase Auth,
            kemudian ditambahkan sebagai admin aplikasi.
          </div>

        </div>

        <div class="genz-admin-box">

          <h3>ADMIN</h3>

          <div
            id="genzAdminList"
            class="genz-admin-table"
          >
            ${renderAdminRows(
              users,
              activeMap
            )}
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

    const currentUserId =
      String(
        GENZ.state?.user?.id ||
        ''
      );

    return users
      .map(user => {
        const userId =
          String(
            user.id ||
            user.user_id ||
            ''
          );

        const email =
          user.email ||
          user.user_metadata?.email ||
          'User';

        const active =
          activeMap.has(userId);

        const current =
          currentUserId &&
          currentUserId === userId;

        return `
          <div
            class="genz-admin-row"
            data-admin-id="${esc(userId)}"
          >

            <div class="genz-admin-row-name">

              <strong>
                ${esc(email)}
              </strong>

              <small>
                ${current
                  ? 'Akun yang sedang digunakan'
                  : 'User ID: ' +
                    esc(userId || '-')}
              </small>

            </div>

            ${adminStatus(active)}

            <button
              type="button"
              class="genz-admin-toggle"
              data-admin-toggle="${esc(
                userId
              )}"
              data-admin-email="${esc(
                email
              )}"
              ${current ? 'disabled' : ''}
            >
              ${
                active
                  ? 'NON AKTIFKAN'
                  : 'AKTIFKAN'
              }
            </button>

          </div>
        `;
      })
      .join('');
  }

  function bindAdminToggles() {
    document
      .querySelectorAll(
        '[data-admin-toggle]'
      )
      .forEach(button => {
        button.addEventListener(
          'click',
          toggleAdmin
        );
      });
  }

  /* =======================================================
     CREATE ADMIN
  ======================================================= */

  async function createAdmin(event) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const emailInput =
      $('genzAdminEmail');

    const passwordInput =
      $('genzAdminPassword');

    const createButton =
      $('genzAdminCreate');

    const email =
      String(
        emailInput?.value || ''
      ).trim().toLowerCase();

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

    createButton.disabled = true;
    createButton.textContent =
      'CREATING...';

    try {
      const configResponse =
        await fetch(
          '/api/config',
          {
            credentials: 'include'
          }
        );

      const config =
        await configResponse.json();

      const supabaseUrl =
        config.supabaseUrl ||
        config.supabase_url;

      const publishableKey =
        config.supabasePublishableKey ||
        config.supabase_publishable_key ||
        config.supabaseAnonKey ||
        config.supabase_anon_key;

      if (
        !supabaseUrl ||
        !publishableKey
      ) {
        throw new Error(
          'Konfigurasi Supabase tidak ditemukan.'
        );
      }

      const signupResponse =
        await fetch(
          `${supabaseUrl}/auth/v1/signup`,
          {
            method: 'POST',
            headers: {
              apikey:
                publishableKey,
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify({
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
          signupData?.error ||
          `Gagal membuat akun (${signupResponse.status})`
        );
      }

      /*
        Supabase signup dapat berhasil tetapi
        user belum tentu langsung terautentikasi
        apabila email confirmation aktif.

        Yang penting akun sudah dibuat.
      */

      await api(
        '/api/admin/admins/add',
        {
          method: 'POST',
          body: JSON.stringify({
            email
          })
        }
      );

      form.reset();

      message(
        'Admin berhasil dibuat dan ditambahkan.',
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

    } finally {
      createButton.disabled = false;
      createButton.textContent =
        'ADD ADMIN';
    }
  }

  /* =======================================================
     TOGGLE ADMIN
  ======================================================= */

  async function toggleAdmin(event) {
    const button =
      event.currentTarget;

    const userId =
      button.dataset.adminToggle;

    const email =
      button.dataset.adminEmail || '';

    if (!userId) {
      return;
    }

    const currentUserId =
      String(
        GENZ.state?.user?.id ||
        ''
      );

    if (
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

    const current =
      button.textContent
        .trim()
        .toUpperCase();

    const active =
      current === 'NON AKTIFKAN';

    button.disabled = true;

    try {
      if (active) {
        await api(
          '/api/admin/admins/remove',
          {
            method: 'POST',
            body: JSON.stringify({
              user_id: userId
            })
          }
        );

        message(
          'Admin berhasil dinonaktifkan.',
          'success'
        );

      } else {
        await api(
          '/api/admin/admins/add',
          {
            method: 'POST',
            body: JSON.stringify({
              email
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

      button.disabled = false;
    }
  }

  /* =======================================================
     ADMIN SECTION INTERCEPTOR
  ======================================================= */

  function setupInterceptor() {
    document.addEventListener(
      'click',
      event => {
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
          admin.js lebih dahulu memproses
          perpindahan section.

          Setelah DOM berubah, enhancement
          merender manager yang sesuai.
        */

        setTimeout(
          async () => {
            try {
              if (
                section ===
                'providers'
              ) {
                await renderProviderManager();
              }

              if (
                section ===
                'admins'
              ) {
                await renderAdminManager();
              }

            } catch (error) {
              console.error(
                '[GEN-Z.AI] Admin section render error:',
                error
              );

              message(
                error.message ||
                'Gagal memuat bagian admin.',
                'error'
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
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})();
