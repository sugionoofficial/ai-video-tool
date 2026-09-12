(function () {

  'use strict';

  /*
   * =========================================================
   * GEN-Z.AI AUTH SYSTEM
   * =========================================================
   *
   * Login
   * Register
   * Forgot password
   * Logout
   * Persistent Supabase session
   * Auth state listener
   * Access token
   * Password visibility
   *
   * =========================================================
   */

  let authClient = null;
  let initialized = false;
  let initializePromise = null;
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

  function message(
    text,
    type = 'auto'
  ) {

    const el =
      $('authMsg');

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

    el.style.removeProperty(
      'color'
    );

    if (!value) {

      el.textContent =
        '';

      return;

    }

    let messageType =
      type;

    if (
      messageType ===
      'auto'
    ) {

      if (
        /pendaftaran berhasil/i.test(value) ||
        /email reset password telah dikirim/i.test(value) ||
        /berhasil/i.test(value) ||
        /dikirim/i.test(value) ||
        /verifikasi/i.test(value)
      ) {

        messageType =
          'success';

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

        messageType =
          'error';

      } else {

        messageType =
          'info';

      }

    }

    if (
      messageType ===
      'success'
    ) {

      el.classList.add(
        'success'
      );

      el.style.setProperty(
        'color',
        '#86efac',
        'important'
      );

    } else if (
      messageType ===
      'error'
    ) {

      el.classList.add(
        'error'
      );

      el.style.setProperty(
        'color',
        '#fca5a5',
        'important'
      );

    } else {

      el.classList.add(
        'info'
      );

      el.style.setProperty(
        'color',
        'rgba(255,255,255,.55)',
        'important'
      );

    }

    el.textContent =
      value;

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

  function setLoading(
    loading
  ) {

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
      password.type ===
      'text';

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
     * Gunakan client global apabila sudah dibuat
     * oleh modul lain.
     */

    if (
      window.GENZ_AUTH_CLIENT &&
      window.GENZ_AUTH_CLIENT.auth
    ) {

      authClient =
        window.GENZ_AUTH_CLIENT;

      console.log(
        '[GEN-Z AUTH] Menggunakan Supabase client global.'
      );

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
          method:
            'GET',

          cache:
            'no-store',

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
        config.supabaseUrl ||
        ''
      ).trim();

    const supabaseKey =
      String(
        config.supabasePublishableKey ||
        ''
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
      parsedUrl.protocol !==
        'https:' ||
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
     * SUPABASE CLIENT
     * =======================================================
     *
     * PENTING:
     *
     * Tidak menggunakan storageKey custom.
     *
     * Supabase menggunakan storage key default berdasarkan
     * project Supabase.
     *
     * Ini membuat seluruh halaman GEN-Z.AI menggunakan
     * session yang sama selama:
     *
     * - Supabase URL sama
     * - Publishable key sama
     * - Origin sama
     */

    authClient =
      window.supabase.createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: {

            persistSession:
              true,

            autoRefreshToken:
              true,

            detectSessionInUrl:
              true,

            storage:
              window.localStorage

          }
        }
      );

    /*
     * Simpan satu client global.
     */

    window.GENZ_AUTH_CLIENT =
      authClient;

    console.log(
      '[GEN-Z AUTH] Supabase client initialized.'
    );

    console.log(
      '[GEN-Z AUTH] Origin:',
      window.location.origin
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

    if (
      session?.user?.id
    ) {

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

    try {

      window.scrollTo({
        top:
          0,
        behavior:
          'instant'
      });

    } catch (_) {}

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

    /*
     * Jangan emit login berkali-kali untuk user yang sama.
     */

    if (
      lastSessionUserId ===
        user.id
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
      lastSessionUserId ===
        null &&
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
       * Pastikan session tersedia.
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

      console.log(
        '[GEN-Z AUTH] Session berhasil tersimpan.'
      );

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
      password.length <
      6
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
        await client.auth
          .signUp({
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
          event.target?.closest?.(
            '#login, #register, #forgotPassword, #logout, #togglePassword'
          );

        if (!target) {

          return;

        }

        if (
          target.id ===
          'login'
        ) {

          event.preventDefault();

          if (!target.disabled) {

            login();

          }

          return;

        }

        if (
          target.id ===
          'register'
        ) {

          event.preventDefault();

          if (!target.disabled) {

            register();

          }

          return;

        }

        if (
          target.id ===
          'forgotPassword'
        ) {

          event.preventDefault();

          if (!target.disabled) {

            forgotPassword();

          }

          return;

        }

        if (
          target.id ===
          'togglePassword'
        ) {

          event.preventDefault();

          if (!target.disabled) {

            togglePassword();

          }

          return;

        }

        if (
          target.id ===
          'logout'
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

          /*
           * Token refresh bukan logout.
           *
           * Jangan mengubah UI.
           */

          if (
            session?.user &&
            lastSessionUserId ===
              null
          ) {

            emitLogin(
              session.user,
              session
            );

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

    /*
     * Jangan initialize dua kali.
     */

    if (
      initializePromise
    ) {

      return initializePromise;

    }

    initializePromise =
      (async function () {

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

          /*
           * PENTING:
           *
           * Jangan menghapus session hanya karena
           * initialization error.
           */

          message(
            error?.message ||
            'Sistem login gagal diinisialisasi.',
            'error'
          );

        }

      })();

    return initializePromise;

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


  window.GENZ_AUTH_INITIALIZED =
    initialize();


  console.log(
    '[GEN-Z AUTH] Auth module loaded.'
  );


  /* =========================================================
     START
  ========================================================= */

  /*
   * Tidak melakukan initialize kedua kali.
   *
   * initialize() sudah dipanggil melalui
   * GENZ_AUTH_INITIALIZED di atas.
   */

})();
