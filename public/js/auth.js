(function () {
  'use strict';

  /*
   * =========================================================
   * GEN-Z.AI AUTH SYSTEM
   * =========================================================
   *
   * Fungsi:
   * - Login
   * - Register
   * - Forgot password
   * - Logout
   * - Session management
   * - Supabase auth state
   * - Token access
   * - Password visibility toggle
   *
   * Session dibuat persistent dan konsisten di seluruh halaman
   * GEN-Z.AI, termasuk:
   *
   * /index.html
   * /admin.html
   * /admin-control.html
   * /admin-users.html
   * /admin-membership.html
   *
   * =========================================================
   */

  let authClient = null;
  let initialized = false;
  let authListenerRegistered = false;
  let lastSessionUserId = null;
  let logoutInProgress = false;


  /* =========================================================
     HELPER
  ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }


  /* =========================================================
     AUTH MESSAGE
  ========================================================= */

  function message(text, type = 'auto') {

    const el = $('authMsg');

    if (!el) {

      if (text) {
        console.log(
          '[GEN-Z AUTH]',
          text
        );
      }

      return;
    }

    const value =
      String(text || '').trim();

    el.classList.remove(
      'success',
      'error',
      'info'
    );

    el.style.removeProperty('color');

    if (!value) {

      el.textContent = '';

      return;
    }

    let messageType = type;

    if (messageType === 'auto') {

      if (
        /pendaftaran berhasil/i.test(value) ||
        /email reset password telah dikirim/i.test(value) ||
        /berhasil/i.test(value) ||
        /dikirim/i.test(value) ||
        /verifikasi/i.test(value)
      ) {

        messageType = 'success';

      } else if (
        /gagal/i.test(value) ||
        /error/i.test(value) ||
        /salah/i.test(value) ||
        /ditolak/i.test(value) ||
        /tidak valid/i.test(value) ||
        /belum tersedia/i.test(value) ||
        /wajib diisi/i.test(value) ||
        /minimal/i.test(value)
      ) {

        messageType = 'error';

      } else {

        messageType = 'info';
      }
    }

    if (messageType === 'success') {

      el.classList.add('success');

      el.style.setProperty(
        'color',
        '#86efac',
        'important'
      );

    } else if (messageType === 'error') {

      el.classList.add('error');

      el.style.setProperty(
        'color',
        '#fca5a5',
        'important'
      );

    } else {

      el.classList.add('info');

      el.style.setProperty(
        'color',
        'rgba(255,255,255,.55)',
        'important'
      );
    }

    el.textContent = value;

    console.log(
      '[GEN-Z AUTH]',
      value,
      '| type:',
      messageType
    );
  }


  /* =========================================================
     LOADING
  ========================================================= */

  function setLoading(loading) {

    const login =
      $('login');

    const register =
      $('register');

    const forgot =
      $('forgotPassword');

    if (login) {

      login.disabled =
        loading;

      login.setAttribute(
        'aria-busy',
        loading
          ? 'true'
          : 'false'
      );

      const buttonText =
        login.querySelector(
          '.auth-btn-text'
        );

      const buttonArrow =
        login.querySelector(
          '.auth-btn-arrow'
        );

      if (buttonText) {

        buttonText.textContent =
          loading
            ? 'MEMPROSES...'
            : 'MASUK KE GEN-Z.AI';

      } else {

        login.textContent =
          loading
            ? 'MEMPROSES...'
            : 'LOGIN';
      }

      if (buttonArrow) {

        buttonArrow.style.opacity =
          loading
            ? '0'
            : '';
      }
    }

    if (register) {

      register.disabled =
        loading;
    }

    if (forgot) {

      forgot.disabled =
        loading;
    }
  }


  /* =========================================================
     PASSWORD VISIBILITY
  ========================================================= */

  function togglePassword() {

    const password =
      $('password');

    const toggle =
      $('togglePassword');

    if (
      !password ||
      !toggle
    ) {

      return;
    }

    const showing =
      password.type === 'text';

    password.type =
      showing
        ? 'password'
        : 'text';

    toggle.setAttribute(
      'aria-label',
      showing
        ? 'Tampilkan password'
        : 'Sembunyikan password'
    );

    toggle.setAttribute(
      'aria-pressed',
      showing
        ? 'false'
        : 'true'
    );
  }


  /* =========================================================
     SUPABASE CLIENT
  ========================================================= */

  async function getClient() {

    if (authClient) {

      return authClient;
    }

    /*
     * Jika client sudah dibuat oleh file lain,
     * gunakan client yang sama.
     */

    if (
      window.GENZ_AUTH_CLIENT &&
      window.GENZ_AUTH_CLIENT.auth
    ) {

      authClient =
        window.GENZ_AUTH_CLIENT;

      return authClient;
    }

    if (
      !window.supabase ||
      typeof window.supabase.createClient !==
        'function'
    ) {

      throw new Error(
        'Library Supabase belum termuat.'
      );
    }

    const response =
      await fetch(
        '/api/config',
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Accept':
              'application/json'
          }
        }
      );

    if (!response.ok) {

      throw new Error(
        'Gagal mengambil konfigurasi GEN-Z.AI.'
      );
    }

    const config =
      await response.json();

    const supabaseUrl =
      String(
        config.supabaseUrl || ''
      ).trim();

    const supabaseKey =
      String(
        config.supabasePublishableKey || ''
      ).trim();

    if (!supabaseUrl) {

      throw new Error(
        'Supabase URL belum tersedia.'
      );
    }

    if (!supabaseKey) {

      throw new Error(
        'Supabase Publishable Key belum tersedia.'
      );
    }

    /*
     * Validasi URL Supabase.
     */

    let parsedUrl;

    try {

      parsedUrl =
        new URL(
          supabaseUrl
        );

    } catch {

      throw new Error(
        'Supabase URL tidak valid.'
      );
    }

    if (
      parsedUrl.protocol !== 'https:' ||
      !parsedUrl.hostname.endsWith(
        '.supabase.co'
      )
    ) {

      throw new Error(
        'Supabase URL tidak valid.'
      );
    }

    /*
     * =======================================================
     * SUPABASE AUTH CONFIGURATION
     * =======================================================
     *
     * Bagian penting untuk masalah:
     *
     * Admin Control
     *      ↓
     * Generate
     *      ↓
     * /index.html
     *      ↓
     * LOGIN
     *
     * Session disimpan pada localStorage dengan storageKey
     * yang sama untuk seluruh halaman GEN-Z.AI.
     */

    authClient =
      window.supabase.createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: {

            /*
             * Session tetap tersedia ketika berpindah halaman.
             */

            persistSession: true,

            /*
             * Supabase otomatis memperbarui access token.
             */

            autoRefreshToken: true,

            /*
             * Membaca session dari URL ketika diperlukan,
             * misalnya setelah proses recovery password.
             */

            detectSessionInUrl: true,

            /*
             * Storage browser yang sama untuk semua halaman.
             */

            storage:
              window.localStorage,

            /*
             * Nama storage dibuat eksplisit.
             * Semua halaman GEN-Z.AI akan menggunakan key yang sama.
             */

            storageKey:
              'genz-ai-auth-session'
          }
        }
      );

    /*
     * Expose client global agar app.js, admin.js,
     * account.js, dan modul lainnya memakai client yang sama.
     */

    window.GENZ_AUTH_CLIENT =
      authClient;

    console.log(
      '[GEN-Z AUTH] Supabase client initialized.'
    );

    return authClient;
  }


  /* =========================================================
     SESSION
  ========================================================= */

  async function getSession() {

    const client =
      await getClient();

    const {
      data,
      error
    } =
      await client.auth.getSession();

    if (error) {

      throw error;
    }

    const session =
      data?.session ||
      null;

    /*
     * Simpan user ID terakhir agar event tidak
     * dipancarkan berkali-kali.
     */

    if (session?.user?.id) {

      lastSessionUserId =
        session.user.id;

    } else {

      lastSessionUserId =
        null;
    }

    return session;
  }


  async function getUser() {

    const session =
      await getSession();

    return (
      session?.user ||
      null
    );
  }


  async function token() {

    const session =
      await getSession();

    return (
      session?.access_token ||
      null
    );
  }


  /* =========================================================
     UI
  ========================================================= */

  function showStudio() {

    const authPage =
      $('auth');

    const studio =
      $('studio');

    const accountPage =
      $('accountPage');

    const accountBtn =
      $('accountBtn');

    if (authPage) {

      authPage.classList.add(
        'hidden'
      );

      authPage.style.display =
        'none';
    }

    if (studio) {

      studio.classList.remove(
        'hidden'
      );

      studio.style.display =
        'block';
    }

    if (accountPage) {

      accountPage.classList.add(
        'hidden'
      );

      accountPage.style.display =
        'none';
    }

    if (accountBtn) {

      accountBtn.classList.remove(
        'hidden'
      );

      accountBtn.style.display =
        'flex';
    }

    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }


  function showLoggedOutUI() {

    const authPage =
      $('auth');

    const studio =
      $('studio');

    const accountPage =
      $('accountPage');

    const accountBtn =
      $('accountBtn');

    if (studio) {

      studio.classList.add(
        'hidden'
      );

      studio.style.display =
        'none';
    }

    if (accountPage) {

      accountPage.classList.add(
        'hidden'
      );

      accountPage.style.display =
        'none';
    }

    if (accountBtn) {

      accountBtn.classList.add(
        'hidden'
      );

      accountBtn.style.display =
        'none';
    }

    if (authPage) {

      authPage.classList.remove(
        'hidden'
      );

      authPage.style.removeProperty(
        'display'
      );
    }
  }


  /* =========================================================
     AUTH EVENTS
  ========================================================= */

  function emitLogin(
    user,
    session
  ) {

    if (!user) {

      return;
    }

    if (
      lastSessionUserId ===
        user.id &&
      session?.access_token
    ) {

      return;
    }

    lastSessionUserId =
      user.id;

    window.dispatchEvent(
      new CustomEvent(
        'genz-auth-login',
        {
          detail: {
            user:
              user,

            session:
              session ||
              null
          }
        }
      )
    );
  }


  function emitLogout() {

    if (
      lastSessionUserId === null &&
      !logoutInProgress
    ) {

      return;
    }

    lastSessionUserId =
      null;

    window.dispatchEvent(
      new CustomEvent(
        'genz-auth-logout'
      )
    );
  }


  /* =========================================================
     LOGIN
  ========================================================= */

  async function login() {

    const email =
      $('email')?.value.trim() ||
      '';

    const password =
      $('password')?.value ||
      '';

    if (!email) {

      message(
        'Email wajib diisi.',
        'error'
      );

      $('email')?.focus();

      return;
    }

    if (!password) {

      message(
        'Password wajib diisi.',
        'error'
      );

      $('password')?.focus();

      return;
    }

    setLoading(true);

    message(
      'Memproses login...',
      'info'
    );

    try {

      const client =
        await getClient();

      const {
        data,
        error
      } =
        await client.auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {

        throw error;
      }

      if (!data?.user) {

        throw new Error(
          'Login gagal. User tidak ditemukan.'
        );
      }

      /*
       * Pastikan session benar-benar tersimpan.
       */

      const storedSession =
        await client.auth.getSession();

      if (
        !storedSession?.data?.session
      ) {

        throw new Error(
          'Login berhasil tetapi session tidak dapat disimpan.'
        );
      }

      message('');

      showStudio();

      emitLogin(
        data.user,
        data.session ||
          storedSession.data.session ||
          null
      );

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Login error:',
        error
      );

      message(
        error?.message ||
        'Login gagal.',
        'error'
      );

    } finally {

      setLoading(false);
    }
  }


  /* =========================================================
     REGISTER
  ========================================================= */

  async function register() {

    const email =
      $('email')?.value.trim() ||
      '';

    const password =
      $('password')?.value ||
      '';

    if (!email) {

      message(
        'Email wajib diisi.',
        'error'
      );

      $('email')?.focus();

      return;
    }

    if (!password) {

      message(
        'Password wajib diisi.',
        'error'
      );

      $('password')?.focus();

      return;
    }

    if (
      password.length < 6
    ) {

      message(
        'Password minimal 6 karakter.',
        'error'
      );

      $('password')?.focus();

      return;
    }

    setLoading(true);

    message(
      'Mendaftarkan akun...',
      'info'
    );

    try {

      const client =
        await getClient();

      const {
        data,
        error
      } =
        await client.auth.signUp({
          email,
          password
        });

      if (error) {

        throw error;
      }

      if (
        data?.session &&
        data?.user
      ) {

        message(
          'Pendaftaran berhasil.',
          'success'
        );

        showStudio();

        emitLogin(
          data.user,
          data.session
        );

      } else {

        message(
          'Pendaftaran berhasil. Periksa email untuk verifikasi akun.',
          'success'
        );
      }

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Register error:',
        error
      );

      message(
        error?.message ||
        'Pendaftaran gagal.',
        'error'
      );

    } finally {

      setLoading(false);
    }
  }


  /* =========================================================
     FORGOT PASSWORD
  ========================================================= */

  async function forgotPassword() {

    const email =
      $('email')?.value.trim() ||
      '';

    if (!email) {

      message(
        'Masukkan email terlebih dahulu.',
        'error'
      );

      $('email')?.focus();

      return;
    }

    setLoading(true);

    message(
      'Mengirim email reset password...',
      'info'
    );

    try {

      const client =
        await getClient();

      const {
        error
      } =
        await client.auth
          .resetPasswordForEmail(
            email,
            {
              redirectTo:
                window.location.origin +
                '/index.html'
            }
          );

      if (error) {

        throw error;
      }

      message(
        'Email reset password telah dikirim.',
        'success'
      );

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Reset password error:',
        error
      );

      message(
        error?.message ||
        'Gagal mengirim reset password.',
        'error'
      );

    } finally {

      setLoading(false);
    }
  }


  /* =========================================================
     LOGOUT
  ========================================================= */

  async function logout() {

    if (
      logoutInProgress
    ) {

      return;
    }

    logoutInProgress =
      true;

    try {

      const client =
        await getClient();

      const {
        error
      } =
        await client.auth.signOut();

      if (error) {

        throw error;
      }

      showLoggedOutUI();

      emitLogout();

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Logout error:',
        error
      );

      message(
        error?.message ||
        'Logout gagal.',
        'error'
      );

    } finally {

      logoutInProgress =
        false;
    }
  }


  /* =========================================================
     EVENT DELEGATION
  ========================================================= */

  function setupDelegatedEvents() {

    if (initialized) {

      return;
    }

    document.addEventListener(
      'click',
      function (event) {

        const target =
          event.target.closest(
            '#login, #register, #forgotPassword, #logout, #togglePassword'
          );

        if (!target) {

          return;
        }

        if (
          target.id === 'login'
        ) {

          event.preventDefault();

          if (!target.disabled) {

            login();
          }

          return;
        }

        if (
          target.id === 'register'
        ) {

          event.preventDefault();

          if (!target.disabled) {

            register();
          }

          return;
        }

        if (
          target.id === 'forgotPassword'
        ) {

          event.preventDefault();

          if (!target.disabled) {

            forgotPassword();
          }

          return;
        }

        if (
          target.id === 'togglePassword'
        ) {

          event.preventDefault();

          if (!target.disabled) {

            togglePassword();
          }

          return;
        }

        if (
          target.id === 'logout'
        ) {

          event.preventDefault();

          logout();
        }
      }
    );


    document.addEventListener(
      'keydown',
      function (event) {

        const target =
          event.target;

        if (
          !target ||
          target.id !==
            'password'
        ) {

          return;
        }

        if (
          event.key ===
          'Enter'
        ) {

          event.preventDefault();

          if (!target.disabled) {

            login();
          }
        }
      }
    );


    initialized =
      true;

    console.log(
      '[GEN-Z AUTH] Event delegation aktif.'
    );
  }


  /* =========================================================
     SUPABASE AUTH STATE
  ========================================================= */

  function setupAuthStateListener(
    client
  ) {

    if (
      authListenerRegistered
    ) {

      return;
    }

    authListenerRegistered =
      true;

    client.auth.onAuthStateChange(
      function (
        event,
        session
      ) {

        console.log(
          '[GEN-Z AUTH] Auth event:',
          event
        );


        if (
          event ===
          'SIGNED_IN'
        ) {

          if (
            session?.user
          ) {

            showStudio();

            emitLogin(
              session.user,
              session
            );
          }

          return;
        }


        if (
          event ===
          'SIGNED_OUT'
        ) {

          showLoggedOutUI();

          emitLogout();

          return;
        }


        if (
          event ===
          'TOKEN_REFRESHED'
        ) {

          if (
            session?.user
          ) {

            /*
             * Jangan memaksa UI berpindah halaman.
             * Cukup pastikan user tetap dikenali.
             */

            if (
              lastSessionUserId ===
                null
            ) {

              emitLogin(
                session.user,
                session
              );
            }
          }

          return;
        }


        if (
          event ===
          'INITIAL_SESSION'
        ) {

          if (
            session?.user
          ) {

            showStudio();

            emitLogin(
              session.user,
              session
            );

          } else {

            /*
             * Jangan langsung menghapus storage.
             * Tidak ada session berarti memang belum login.
             */

            showLoggedOutUI();
          }
        }
      }
    );
  }


  /* =========================================================
     INITIALIZE
  ========================================================= */

  async function initialize() {

    setupDelegatedEvents();

    try {

      const client =
        await getClient();

      const session =
        await getSession();

      if (
        session?.user
      ) {

        console.log(
          '[GEN-Z AUTH] Existing session ditemukan:',
          session.user.id
        );

        showStudio();

        emitLogin(
          session.user,
          session
        );

      } else {

        console.log(
          '[GEN-Z AUTH] Tidak ada session aktif.'
        );

        showLoggedOutUI();
      }

      setupAuthStateListener(
        client
      );

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Initialization error:',
        error
      );

      message(
        error?.message ||
        'Sistem login gagal diinisialisasi.',
        'error'
      );
    }
  }


  /* =========================================================
     PUBLIC API
  ========================================================= */

  const API = {

    login,

    register,

    forgotPassword,

    logout,

    initialize,

    getClient,

    getSession,

    getUser,

    token,

    showStudio,

    showLoggedOutUI,

    togglePassword
  };


  window.GENZ_AUTH =
    API;


  window.GENZ =
    window.GENZ || {};


  window.GENZ.auth =
    API;


  /*
   * Jangan membuat client lain.
   * Semua modul harus mengambil client dari GENZ_AUTH.
   */

  console.log(
    '[GEN-Z AUTH] Auth module loaded.'
  );


  /* =========================================================
     START
  ========================================================= */

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
