(function () {
  'use strict';

  let authClient = null;
  let initialized = false;

  const $ = (id) => document.getElementById(id);

  function message(text) {
    const el = $('authMsg');

    if (el) {
      el.textContent = text || '';
    }

    console.log('[GEN-Z AUTH]', text);
  }

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
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(
        'Gagal mengambil konfigurasi GEN-Z.AI.'
      );
    }

    const config = await response.json();

    if (
      !config.supabaseUrl ||
      !config.supabasePublishableKey
    ) {
      throw new Error(
        'Konfigurasi Supabase belum lengkap.'
      );
    }

    authClient =
      window.supabase.createClient(
        config.supabaseUrl,
        config.supabasePublishableKey
      );

    window.GENZ_AUTH_CLIENT = authClient;

    return authClient;
  }

  async function login() {
    const email =
      $('email')?.value.trim() || '';

    const password =
      $('password')?.value || '';

    if (!email || !password) {
      message(
        'Email dan password wajib diisi.'
      );
      return;
    }

    setLoading(true);
    message('Memproses login...');

    try {
      const client =
        await getClient();

      const {
        data,
        error
      } =
        await client.auth.signInWithPassword({
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

      message('Login berhasil.');

      /*
       * Jangan mengubah halaman langsung di sini.
       * app.js akan menjalankan refresh()
       * agar seluruh data akun dan studio
       * dimuat dengan benar.
       */
      window.dispatchEvent(
        new CustomEvent(
          'genz-auth-login',
          {
            detail: {
              user: data.user
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

  async function register() {
    const email =
      $('email')?.value.trim() || '';

    const password =
      $('password')?.value || '';

    if (!email || !password) {
      message(
        'Email dan password wajib diisi.'
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
    message('Mendaftarkan akun...');

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

      if (data?.session) {
        message(
          'Pendaftaran berhasil.'
        );

        window.dispatchEvent(
          new CustomEvent(
            'genz-auth-login',
            {
              detail: {
                user: data.user
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

      const { error } =
        await client.auth
          .resetPasswordForEmail(
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

  async function logout() {
    try {
      const client =
        await getClient();

      await client.auth.signOut();

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
    }
  }

  function setupButtons() {
    if (initialized) {
      return;
    }

    $('login')?.addEventListener(
      'click',
      login
    );

    $('register')?.addEventListener(
      'click',
      register
    );

    $('forgotPassword')?.addEventListener(
      'click',
      forgotPassword
    );

    $('logout')?.addEventListener(
      'click',
      logout
    );

    $('password')?.addEventListener(
      'keydown',
      function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          login();
        }
      }
    );

    initialized = true;

    console.log(
      '[GEN-Z AUTH] Event listener aktif.'
    );
  }

  async function initialize() {
    setupButtons();

    try {
      const client =
        await getClient();

      const {
        data
      } =
        await client.auth.getSession();

      /*
       * Jangan mengatur #auth/#studio di sini.
       * app.js adalah pengendali utama UI.
       */

      if (data?.session) {
        window.dispatchEvent(
          new CustomEvent(
            'genz-auth-login',
            {
              detail: {
                user:
                  data.session.user
              }
            }
          )
        );
      }

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

  window.GENZ_AUTH = {
    login,
    register,
    forgotPassword,
    logout,
    initialize
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})();
