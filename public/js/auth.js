(function () {

  'use strict';

  /* =========================================================
     GEN-Z.AI AUTH SYSTEM
     ========================================================= */

  let authClient = null;
  let initialized = false;
  let initializePromise = null;
  let authListenerRegistered = false;
  let lastSessionUserId = null;
  let logoutInProgress = false;
  let configPromise = null;
  let passwordToggleObserver = null;

  /* =========================================================
     HELPER
     ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function log(...args) {
    console.log('[GEN-Z AUTH]', ...args);
  }

  function error(...args) {
    console.error('[GEN-Z AUTH]', ...args);
  }

  /* =========================================================
     MESSAGE
     ========================================================= */

  function message(text, type = 'auto') {

    const el = $('authMsg');

    if (!el) {
      if (text) {
        log(text);
      }
      return;
    }

    const value = String(text || '').trim();

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

  }

  /* =========================================================
     LOADING
     ========================================================= */

  function setLoading(loading) {

    const login = $('login');
    const register = $('register');
    const forgot = $('forgotPassword');

    if (login) {

      login.disabled = loading;

      login.setAttribute(
        'aria-busy',
        loading ? 'true' : 'false'
      );

      const buttonText =
        login.querySelector('.auth-btn-text');

      const buttonArrow =
        login.querySelector('.auth-btn-arrow');

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
          loading ? '0' : '';
      }
    }

    if (register) {
      register.disabled = loading;
    }

    if (forgot) {
      forgot.disabled = loading;
    }
  }

  /* =========================================================
     PASSWORD
     ========================================================= */

  function updatePasswordToggleUI() {

    const password = $('password');
    const toggle = $('togglePassword');

    if (!password || !toggle) {
      return;
    }

    const showing =
      password.type === 'text';

    const openIcon =
      toggle.querySelector('.eye-open');

    const closedIcon =
      toggle.querySelector('.eye-closed');

    if (openIcon) {

      openIcon.style.display =
        showing
          ? 'none'
          : '';

      openIcon.setAttribute(
        'aria-hidden',
        showing
          ? 'true'
          : 'false'
      );
    }

    if (closedIcon) {

      closedIcon.style.display =
        showing
          ? ''
          : 'none';

      closedIcon.setAttribute(
        'aria-hidden',
        showing
          ? 'false'
          : 'true'
      );
    }

    toggle.setAttribute(
      'aria-label',
      showing
        ? 'Sembunyikan password'
        : 'Tampilkan password'
    );

    toggle.setAttribute(
      'aria-pressed',
      showing
        ? 'true'
        : 'false'
    );

    toggle.setAttribute(
      'title',
      showing
        ? 'Sembunyikan password'
        : 'Tampilkan password'
    );
  }

  function togglePassword() {

    const password = $('password');
    const toggle = $('togglePassword');

    if (!password || !toggle) {
      return;
    }

    const showing =
      password.type === 'text';

    try {

      password.type =
        showing
          ? 'password'
          : 'text';

    } catch (err) {

      error(
        'Password toggle error:',
        err
      );

      return;
    }

    updatePasswordToggleUI();

    if (password.type === 'text') {

      try {
        password.focus();

        const length =
          password.value.length;

        password.setSelectionRange(
          length,
          length
        );

      } catch (_) {}

    }
  }

  function bindPasswordToggle() {

    const toggle = $('togglePassword');

    if (!toggle) {
      return false;
    }

    if (
      toggle.dataset.genzPasswordToggleBound === 'true'
    ) {
      updatePasswordToggleUI();
      return true;
    }

    toggle.dataset.genzPasswordToggleBound =
      'true';

    toggle.addEventListener(
      'click',
      function (event) {

        event.preventDefault();
        event.stopPropagation();

        if (toggle.disabled) {
          return;
        }

        togglePassword();
      },
      false
    );

    toggle.addEventListener(
      'pointerdown',
      function (event) {

        if (toggle.disabled) {
          return;
        }

        event.stopPropagation();
      },
      false
    );

    toggle.addEventListener(
      'keydown',
      function (event) {

        if (
          event.key !== 'Enter' &&
          event.key !== ' '
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (!toggle.disabled) {
          togglePassword();
        }
      },
      false
    );

    updatePasswordToggleUI();

    return true;
  }

  function setupPasswordToggleObserver() {

    bindPasswordToggle();

    if (
      passwordToggleObserver ||
      typeof MutationObserver === 'undefined'
    ) {
      return;
    }

    passwordToggleObserver =
      new MutationObserver(
        function () {
          bindPasswordToggle();
        }
      );

    passwordToggleObserver.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  /* =========================================================
     CONFIG
     ========================================================= */

  async function loadConfig() {

    if (configPromise) {
      return configPromise;
    }

    configPromise = (async function () {

      const controller =
        typeof AbortController !== 'undefined'
          ? new AbortController()
          : null;

      let timer = null;

      if (controller) {

        timer = setTimeout(
          function () {
            controller.abort();
          },
          8000
        );
      }

      try {

        const response =
          await fetch(
            '/api/config',
            {
              method: 'GET',
              cache: 'no-store',
              headers: {
                'Accept': 'application/json'
              },
              signal:
                controller
                  ? controller.signal
                  : undefined
            }
          );

        if (!response.ok) {

          throw new Error(
            'Gagal mengambil konfigurasi GEN-Z.AI.'
          );
        }

        const config =
          await response.json();

        return config;

      } catch (err) {

        if (err?.name === 'AbortError') {

          throw new Error(
            'Koneksi konfigurasi GEN-Z.AI terlalu lama.'
          );
        }

        throw err;

      } finally {

        if (timer) {
          clearTimeout(timer);
        }
      }

    })();

    try {

      return await configPromise;

    } catch (err) {

      configPromise = null;

      throw err;
    }
  }

  /* =========================================================
     SUPABASE CLIENT
     ========================================================= */

  async function getClient() {

    if (authClient) {
      return authClient;
    }

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
      typeof window.supabase.createClient !== 'function'
    ) {

      throw new Error(
        'Library Supabase belum termuat.'
      );
    }

    const config =
      await loadConfig();

    const supabaseUrl =
      String(
        config?.supabaseUrl || ''
      ).trim();

    const supabaseKey =
      String(
        config?.supabasePublishableKey || ''
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
        new URL(supabaseUrl);

    } catch (_) {

      throw new Error(
        'Supabase URL tidak valid.'
      );
    }

    if (
      parsedUrl.protocol !== 'https:' ||
      !parsedUrl.hostname.endsWith('.supabase.co')
    ) {

      throw new Error(
        'Supabase URL tidak valid.'
      );
    }

    authClient =
      window.supabase.createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        }
      );

    window.GENZ_AUTH_CLIENT =
      authClient;

    log('Supabase client initialized.');

    return authClient;
  }

  /* =========================================================
     SESSION
     ========================================================= */

  async function getSession() {

    const client =
      await getClient();

    const result =
      await client.auth.getSession();

    if (result?.error) {
      throw result.error;
    }

    return (
      result?.data?.session ||
      null
    );
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

      authPage.classList.add('hidden');
      authPage.style.display = 'none';
    }

    if (studio) {

      studio.classList.remove('hidden');
      studio.style.display = 'block';
    }

    if (accountPage) {

      accountPage.classList.add('hidden');
      accountPage.style.display = 'none';
    }

    if (accountBtn) {

      accountBtn.classList.remove('hidden');
      accountBtn.style.display = 'flex';
    }

    try {

      window.scrollTo({
        top: 0,
        behavior: 'instant'
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

      studio.classList.add('hidden');
      studio.style.display = 'none';
    }

    if (accountPage) {

      accountPage.classList.add('hidden');
      accountPage.style.display = 'none';
    }

    if (accountBtn) {

      accountBtn.classList.add('hidden');
      accountBtn.style.display = 'none';
    }

    if (authPage) {

      authPage.classList.remove('hidden');
      authPage.style.removeProperty('display');
    }

    bindPasswordToggle();
  }

  /* =========================================================
     AUTH EVENTS
     ========================================================= */

  function emitLogin(user, session) {

    if (!user?.id) {
      return;
    }

    if (
      lastSessionUserId === user.id
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
            user: user,
            session: session || null
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
      $('email')?.value.trim() || '';

    const password =
      $('password')?.value || '';

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

      const result =
        await client.auth.signInWithPassword(
          {
            email: email,
            password: password
          }
        );

      if (result?.error) {
        throw result.error;
      }

      const user =
        result?.data?.user;

      const session =
        result?.data?.session;

      if (!user) {

        throw new Error(
          'Login gagal. User tidak ditemukan.'
        );
      }

      if (!session) {

        throw new Error(
          'Login berhasil tetapi session tidak tersedia.'
        );
      }

      log(
        'Login berhasil:',
        user.id
      );

      message('');

      showStudio();

      emitLogin(
        user,
        session
      );

    } catch (err) {

      error(
        'Login error:',
        err
      );

      message(
        err?.message ||
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
      $('email')?.value.trim() || '';

    const password =
      $('password')?.value || '';

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

    if (password.length < 6) {

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

      const result =
        await client.auth.signUp(
          {
            email: email,
            password: password
          }
        );

      if (result?.error) {
        throw result.error;
      }

      const user =
        result?.data?.user;

      const session =
        result?.data?.session;

      if (session && user) {

        message(
          'Pendaftaran berhasil.',
          'success'
        );

        showStudio();

        emitLogin(
          user,
          session
        );

      } else {

        message(
          'Pendaftaran berhasil. Periksa email untuk verifikasi akun.',
          'success'
        );
      }

    } catch (err) {

      error(
        'Register error:',
        err
      );

      message(
        err?.message ||
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
      $('email')?.value.trim() || '';

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

      const result =
        await client.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              window.location.origin +
              '/index.html'
          }
        );

      if (result?.error) {
        throw result.error;
      }

      message(
        'Email reset password telah dikirim.',
        'success'
      );

    } catch (err) {

      error(
        'Reset password error:',
        err
      );

      message(
        err?.message ||
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

    if (logoutInProgress) {
      return;
    }

    logoutInProgress = true;

    try {

      const client =
        await getClient();

      const result =
        await client.auth.signOut();

      if (result?.error) {
        throw result.error;
      }

      showLoggedOutUI();

      emitLogout();

    } catch (err) {

      error(
        'Logout error:',
        err
      );

      message(
        err?.message ||
        'Logout gagal.',
        'error'
      );

    } finally {

      logoutInProgress = false;
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
            '#login, #register, #forgotPassword, #logout'
          );

        if (!target) {
          return;
        }

        if (target.id === 'login') {

          event.preventDefault();

          if (!target.disabled) {
            login();
          }

          return;
        }

        if (target.id === 'register') {

          event.preventDefault();

          if (!target.disabled) {
            register();
          }

          return;
        }

        if (target.id === 'forgotPassword') {

          event.preventDefault();

          if (!target.disabled) {
            forgotPassword();
          }

          return;
        }

        if (target.id === 'logout') {

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
          target.id !== 'password'
        ) {
          return;
        }

        if (event.key === 'Enter') {

          event.preventDefault();

          if (!target.disabled) {
            login();
          }
        }
      }
    );

    initialized = true;
  }

  /* =========================================================
     AUTH STATE LISTENER
     ========================================================= */

  function setupAuthStateListener(client) {

    if (authListenerRegistered) {
      return;
    }

    authListenerRegistered = true;

    client.auth.onAuthStateChange(
      function (event, session) {

        log(
          'Auth event:',
          event
        );

        if (event === 'SIGNED_IN') {

          if (session?.user) {

            showStudio();

            emitLogin(
              session.user,
              session
            );
          }

          return;
        }

        if (event === 'SIGNED_OUT') {

          showLoggedOutUI();

          emitLogout();

          return;
        }

        if (event === 'INITIAL_SESSION') {

          if (session?.user) {

            showStudio();

            emitLogin(
              session.user,
              session
            );

          } else {

            showLoggedOutUI();
          }

          return;
        }

        if (event === 'TOKEN_REFRESHED') {

          if (
            session?.user &&
            lastSessionUserId === null
          ) {

            emitLogin(
              session.user,
              session
            );
          }
        }
      }
    );
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  async function initialize() {

    if (initializePromise) {
      return initializePromise;
    }

    initializePromise =
      (async function () {

        setupDelegatedEvents();

        setupPasswordToggleObserver();

        try {

          const client =
            await getClient();

          /*
           * Register listener sebelum membaca session.
           * Ini mencegah event INITIAL_SESSION terlewat.
           */
          setupAuthStateListener(
            client
          );

          const session =
            await getSession();

          if (session?.user) {

            log(
              'Existing session ditemukan:',
              session.user.id
            );

            showStudio();

            emitLogin(
              session.user,
              session
            );

          } else {

            log(
              'Tidak ada session aktif.'
            );

            showLoggedOutUI();
          }

          bindPasswordToggle();

        } catch (err) {

          error(
            'Initialization error:',
            err
          );

          message(
            err?.message ||
            'Sistem login gagal diinisialisasi.',
            'error'
          );

          bindPasswordToggle();
        }

      })();

    return initializePromise;
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */

  const API = {

    login: login,

    register: register,

    forgotPassword: forgotPassword,

    logout: logout,

    initialize: initialize,

    getClient: getClient,

    getSession: getSession,

    getUser: getUser,

    token: token,

    showStudio: showStudio,

    showLoggedOutUI: showLoggedOutUI,

    togglePassword: togglePassword
  };

  window.GENZ_AUTH =
    API;

  window.GENZ =
    window.GENZ || {};

  window.GENZ.auth =
    API;

  window.GENZ_AUTH_INITIALIZED =
    initialize();

  log(
    'Auth module loaded.'
  );

})();
