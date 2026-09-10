(function () {
  'use strict';

  let authClient = null;
  let initialized = false;

  const $ = (id) => document.getElementById(id);

  /* =========================================================
     MESSAGE
  ========================================================= */

  function message(text) {
    const el = $('authMsg');

    if (el) {
      el.textContent = text || '';
    }

    console.log('[GEN-Z AUTH]', text);
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
      login.textContent = loading
        ? 'MEMPROSES...'
        : 'LOGIN';
    }

    if (register) {
      register.disabled = loading;
    }

    if (forgot) {
      forgot.disabled = loading;
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
      !window.supabase ||
      typeof window.supabase.createClient !== 'function'
    ) {
      throw new Error(
        'Library Supabase belum termuat.'
      );
    }

    const response = await fetch(
      '/api/config',
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        'Gagal mengambil konfigurasi GEN-Z.AI.'
      );
    }

    const config = await response.json();

    const supabaseUrl =
      String(config.supabaseUrl || '').trim();

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

    if (
      !/^https:\/\/[a-z0-9-]+\.supabase\.co/i.test(
        supabaseUrl
      )
    ) {
      throw new Error(
        'Supabase URL tidak valid.'
      );
    }

    authClient =
      window.supabase.createClient(
        supabaseUrl,
        supabaseKey
      );

    window.GENZ_AUTH_CLIENT =
      authClient;

    return authClient;
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
        'Email wajib diisi.'
      );
      return;
    }

    if (!password) {
      message(
        'Password wajib diisi.'
      );
      return;
    }

    setLoading(true);

    message(
      'Memproses login...'
    );

    try {

      const client =
        await getClient();

      const {
        data,
        error
      } =
        await client.auth.signInWithPassword({
          email: email,
          password: password
        });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error(
          'Login gagal. User tidak ditemukan.'
        );
      }

      message(
  'Login berhasil.'
);

/*
 * Fallback UI langsung.
 * Jangan bergantung pada app.js/event listener.
 */
const authPage = document.getElementById('auth');
const studio = document.getElementById('studio');
const accountBtn = document.getElementById('accountBtn');

if (authPage) {
  authPage.classList.add('hidden');
}

if (studio) {
  studio.classList.remove('hidden');
}

if (accountBtn) {
  accountBtn.classList.remove('hidden');
}

/*
 * Tetap kirim event ke app.js
 * untuk memuat account, credit,
 * provider, dan fitur studio.
 */
window.dispatchEvent(
        new CustomEvent(
          'genz-auth-login',
          {
            detail: {
              user: data.user,
              session: data.session || null
            }
          }
        )
      );

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Login error:',
        error
      );

      message(
        error?.message ||
        'Login gagal.'
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
        'Email wajib diisi.'
      );
      return;
    }

    if (!password) {
      message(
        'Password wajib diisi.'
      );
      return;
    }

    if (password.length < 6) {
      message(
        'Password minimal 6 karakter.'
      );
      return;
    }

    setLoading(true);

    message(
      'Mendaftarkan akun...'
    );

    try {

      const client =
        await getClient();

      const {
        data,
        error
      } =
        await client.auth.signUp({
          email: email,
          password: password
        });

      if (error) {
        throw error;
      }

      /*
       * Jika Supabase langsung memberikan session,
       * user langsung masuk ke studio.
       */
      if (data?.session && data?.user) {

        message(
          'Pendaftaran berhasil.'
        );

        window.dispatchEvent(
          new CustomEvent(
            'genz-auth-login',
            {
              detail: {
                user: data.user,
                session: data.session
              }
            }
          )
        );

      } else {

        message(
          'Pendaftaran berhasil. Periksa email untuk verifikasi akun.'
        );

      }

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Register error:',
        error
      );

      message(
        error?.message ||
        'Pendaftaran gagal.'
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
        'Masukkan email terlebih dahulu.'
      );
      return;
    }

    setLoading(true);

    message(
      'Mengirim email reset password...'
    );

    try {

      const client =
        await getClient();

      const {
        error
      } =
        await client.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              window.location.origin
          }
        );

      if (error) {
        throw error;
      }

      message(
        'Email reset password telah dikirim.'
      );

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Reset password error:',
        error
      );

      message(
        error?.message ||
        'Gagal mengirim reset password.'
      );

    } finally {

      setLoading(false);

    }
  }


  /* =========================================================
     LOGOUT
  ========================================================= */

  async function logout() {

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

      window.dispatchEvent(
        new CustomEvent(
          'genz-auth-logout'
        )
      );

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Logout error:',
        error
      );

      message(
        error?.message ||
        'Logout gagal.'
      );
    }
  }


  /* =========================================================
     EVENT LISTENER
  ========================================================= */

  function setupButtons() {

    if (initialized) {
      return;
    }

    const loginButton =
      $('login');

    const registerButton =
      $('register');

    const forgotButton =
      $('forgotPassword');

    const logoutButton =
      $('logout');


    if (loginButton) {
      loginButton.addEventListener(
        'click',
        login
      );
    }


    if (registerButton) {
      registerButton.addEventListener(
        'click',
        register
      );
    }


    if (forgotButton) {
      forgotButton.addEventListener(
        'click',
        forgotPassword
      );
    }


    if (logoutButton) {
      logoutButton.addEventListener(
        'click',
        logout
      );
    }


    const password =
      $('password');

    if (password) {

      password.addEventListener(
        'keydown',
        function (event) {

          if (event.key === 'Enter') {

            event.preventDefault();

            login();

          }

        }
      );

    }


    initialized = true;

    console.log(
      '[GEN-Z AUTH] Event listener aktif.'
    );
  }


  /* =========================================================
     INITIALIZE
  ========================================================= */

  async function initialize() {

    setupButtons();

    try {

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

      /*
       * Jangan mengubah #auth dan #studio
       * secara langsung.
       *
       * app.js adalah pengendali utama UI.
       */

      if (data?.session?.user) {

        window.dispatchEvent(
          new CustomEvent(
            'genz-auth-login',
            {
              detail: {
                user:
                  data.session.user,

                session:
                  data.session
              }
            }
          )
        );

      }

      /*
       * Pantau perubahan session.
       */

      client.auth.onAuthStateChange(
        function (event, session) {

          console.log(
            '[GEN-Z AUTH] Auth event:',
            event
          );

          if (event === 'SIGNED_IN') {

            window.dispatchEvent(
              new CustomEvent(
                'genz-auth-login',
                {
                  detail: {
                    user:
                      session?.user || null,

                    session:
                      session || null
                  }
                }
              )
            );

          }

          if (
            event === 'SIGNED_OUT'
          ) {

            window.dispatchEvent(
              new CustomEvent(
                'genz-auth-logout'
              )
            );

          }

        }
      );

    } catch (error) {

      console.error(
        '[GEN-Z AUTH] Initialization error:',
        error
      );

      message(
        error?.message ||
        'Sistem login gagal diinisialisasi.'
      );
    }
  }


  /* =========================================================
     PUBLIC API
  ========================================================= */

  window.GENZ_AUTH = {
    login,
    register,
    forgotPassword,
    logout,
    initialize
  };


  /* =========================================================
     START
  ========================================================= */

  if (
    document.readyState === 'loading'
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
