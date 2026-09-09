"use strict";

/*
 * GEN-Z.AI ACCOUNT SYSTEM
 *
 * Supabase:
 * - Register
 * - Login
 * - Logout
 * - Forgot password
 * - Reset password
 * - Session
 * - Per-user API keys
 *
 * API keys are encrypted in the browser with AES-GCM.
 * The encryption key is derived from the user's password.
 *
 * IMPORTANT:
 * The plaintext password is never stored.
 * The encryption key exists only in memory.
 */

(() => {

  const C = window.AIVideoConfig || {};

  if (!window.supabase) {
    console.error("GEN-Z.AI: Supabase JS belum dimuat.");
    return;
  }

  if (!C.SUPABASE_URL || !C.SUPABASE_PUBLISHABLE_KEY) {
    console.error("GEN-Z.AI: konfigurasi Supabase belum tersedia.");
    return;
  }

  const sb = window.supabase.createClient(
    C.SUPABASE_URL,
    C.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  let currentUser = null;
  let cryptoKey = null;
  let currentSalt = null;

  window.GENZAccount = {
    supabase: sb,

    getUser() {
      return currentUser;
    },

    isAuthenticated() {
      return !!currentUser;
    },

    getCryptoKey() {
      return cryptoKey;
    }
  };


  /* =========================================================
     CRYPTO
     ========================================================= */

  function bytesToBase64(bytes) {
    let binary = "";

    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary);
  }


  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }


  async function deriveKey(password, saltBase64) {

    const encoder = new TextEncoder();

    const passwordMaterial =
      await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
      );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: base64ToBytes(saltBase64),
        iterations: 250000,
        hash: "SHA-256"
      },
      passwordMaterial,
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["encrypt", "decrypt"]
    );
  }


  async function encryptValue(value) {

    if (!cryptoKey) {
      throw new Error(
        "Kunci enkripsi belum tersedia. Silakan login kembali."
      );
    }

    const iv =
      crypto.getRandomValues(
        new Uint8Array(12)
      );

    const encoded =
      new TextEncoder().encode(value);

    const encrypted =
      await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv
        },
        cryptoKey,
        encoded
      );

    return {
      ciphertext:
        bytesToBase64(
          new Uint8Array(encrypted)
        ),

      iv:
        bytesToBase64(iv)
    };
  }


  async function decryptValue(
    ciphertext,
    ivBase64
  ) {

    if (!ciphertext || !ivBase64) {
      return "";
    }

    if (!cryptoKey) {
      throw new Error(
        "Kunci enkripsi tidak tersedia. Silakan login kembali."
      );
    }

    const decrypted =
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: base64ToBytes(ivBase64)
        },
        cryptoKey,
        base64ToBytes(ciphertext)
      );

    return new TextDecoder().decode(
      decrypted
    );
  }


  /* =========================================================
     USER API KEYS
     ========================================================= */

  async function getKeyRecord() {

    if (!currentUser) {
      return null;
    }

    const {
      data,
      error
    } = await sb
      .from("user_api_keys")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }


  async function ensureKeyRecord() {

    let record =
      await getKeyRecord();

    if (record) {
      currentSalt =
        record.kdf_salt;

      return record;
    }

    const saltBytes =
      crypto.getRandomValues(
        new Uint8Array(16)
      );

    const salt =
      bytesToBase64(saltBytes);

    const {
      data,
      error
    } = await sb
      .from("user_api_keys")
      .insert({
        user_id: currentUser.id,
        kdf_salt: salt
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    currentSalt = salt;

    return data;
  }


  async function loadApiKeys() {

    const record =
      await ensureKeyRecord();

    if (!record) {
      return {
        gemini: "",
        minimax: "",
        luma: ""
      };
    }

    return {
      gemini:
        await decryptValue(
          record.gemini_ciphertext,
          record.gemini_iv
        ),

      minimax:
        await decryptValue(
          record.minimax_ciphertext,
          record.minimax_iv
        ),

      luma:
        await decryptValue(
          record.luma_ciphertext,
          record.luma_iv
        )
    };
  }


  async function saveApiKeys(
    gemini,
    minimax,
    luma
  ) {

    if (!currentUser) {
      throw new Error(
        "Anda belum login."
      );
    }

    const record =
      await ensureKeyRecord();

    const geminiEncrypted =
      gemini
        ? await encryptValue(gemini)
        : null;

    const minimaxEncrypted =
      minimax
        ? await encryptValue(minimax)
        : null;

    const lumaEncrypted =
      luma
        ? await encryptValue(luma)
        : null;

    const {
      error
    } = await sb
      .from("user_api_keys")
      .update({
        gemini_ciphertext:
          geminiEncrypted
            ? geminiEncrypted.ciphertext
            : null,

        gemini_iv:
          geminiEncrypted
            ? geminiEncrypted.iv
            : null,

        minimax_ciphertext:
          minimaxEncrypted
            ? minimaxEncrypted.ciphertext
            : null,

        minimax_iv:
          minimaxEncrypted
            ? minimaxEncrypted.iv
            : null,

        luma_ciphertext:
          lumaEncrypted
            ? lumaEncrypted.ciphertext
            : null,

        luma_iv:
          lumaEncrypted
            ? lumaEncrypted.iv
            : null,

        updated_at:
          new Date().toISOString()
      })
      .eq(
        "user_id",
        currentUser.id
      );

    if (error) {
      throw error;
    }
  }


  window.GENZAccount.getApiKeys =
    loadApiKeys;

  window.GENZAccount.saveApiKeys =
    saveApiKeys;


  /* =========================================================
     AUTH
     ========================================================= */

  async function register(
    email,
    password
  ) {

    const {
      data,
      error
    } = await sb.auth.signUp({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (data.user) {

      currentUser =
        data.user;

      const record =
        await ensureKeyRecord();

      cryptoKey =
        await deriveKey(
          password,
          record.kdf_salt
        );
    }

    return data;
  }


  async function login(
    email,
    password
  ) {

    const {
      data,
      error
    } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    currentUser =
      data.user;

    const record =
      await ensureKeyRecord();

    cryptoKey =
      await deriveKey(
        password,
        record.kdf_salt
      );

    return data;
  }


  async function logout() {

    cryptoKey = null;
    currentSalt = null;
    currentUser = null;

    await sb.auth.signOut();

    renderLoggedOut();
  }


  async function forgotPassword(email) {

    const {
      error
    } = await sb.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
          `${location.origin}/reset-password.html`
      }
    );

    if (error) {
      throw error;
    }
  }


  async function updatePassword(
    newPassword
  ) {

    const {
      error
    } = await sb.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    /*
     * Existing encrypted API keys are tied
     * to the old password-derived key.
     *
     * After password reset, API keys must be
     * entered again for security.
     */
    cryptoKey = null;
  }


  window.GENZAccount.register =
    register;

  window.GENZAccount.login =
    login;

  window.GENZAccount.logout =
    logout;

  window.GENZAccount.forgotPassword =
    forgotPassword;

  window.GENZAccount.updatePassword =
    updatePassword;


  /* =========================================================
     UI
     ========================================================= */

  function injectStyles() {

    if (
      document.getElementById(
        "genz-account-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "genz-account-styles";

    style.textContent = `

      #genzAccountOverlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: #08090d;
        overflow-y: auto;
        padding: 20px;
      }

      .genz-auth-box {
        width: 100%;
        max-width: 430px;
        margin: 40px auto;
        background: #111217;
        border: 1px solid #292c34;
        border-radius: 20px;
        padding: 25px;
      }

      .genz-auth-logo {
        text-align: center;
        font-size: 30px;
        font-weight: 900;
        margin-bottom: 5px;
      }

      .genz-auth-subtitle {
        text-align: center;
        color: #858892;
        font-size: 13px;
        margin-bottom: 25px;
      }

      .genz-auth-group {
        margin-bottom: 14px;
      }

      .genz-auth-group label {
        display: block;
        color: #bbb;
        font-size: 12px;
        margin-bottom: 6px;
      }

      .genz-auth-group input {
        width: 100%;
        padding: 13px;
        border-radius: 10px;
        border: 1px solid #30333c;
        background: #090a0e;
        color: white;
        outline: none;
      }

      .genz-auth-button {
        width: 100%;
        border: 0;
        padding: 13px;
        border-radius: 10px;
        background: white;
        color: #08090d;
        font-weight: 800;
        cursor: pointer;
        margin-top: 5px;
      }

      .genz-auth-secondary {
        width: 100%;
        border: 1px solid #30333c;
        padding: 11px;
        border-radius: 10px;
        background: #0b0c10;
        color: white;
        cursor: pointer;
        margin-top: 9px;
      }

      .genz-auth-link {
        text-align: center;
        margin-top: 14px;
        color: #aaa;
        font-size: 12px;
        cursor: pointer;
      }

      .genz-auth-status {
        margin-top: 14px;
        padding: 10px;
        border-radius: 9px;
        background: #0b0c10;
        color: #aaa;
        font-size: 12px;
        display: none;
      }

      #genzAccountPanel {
        margin-bottom: 16px;
      }

      .genz-account-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      .genz-account-email {
        color: #aaa;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .genz-logout {
        border: 1px solid #30333c;
        background: #0b0c10;
        color: white;
        padding: 8px 12px;
        border-radius: 9px;
        cursor: pointer;
      }

      .genz-api-box {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid #292c34;
      }

      .genz-api-title {
        font-size: 14px;
        font-weight: 800;
        margin-bottom: 12px;
      }

      .genz-api-row {
        margin-bottom: 11px;
      }

      .genz-api-row label {
        display: block;
        color: #bbb;
        font-size: 11px;
        margin-bottom: 5px;
      }

      .genz-api-row input {
        width: 100%;
        background: #090a0e;
        border: 1px solid #30333c;
        border-radius: 9px;
        padding: 10px;
        color: white;
      }

      .genz-save-api {
        width: 100%;
        padding: 11px;
        border: 0;
        border-radius: 9px;
        background: white;
        color: #08090d;
        font-weight: 800;
        cursor: pointer;
      }

    `;

    document.head.appendChild(style);
  }


  function createOverlay() {

    if (
      document.getElementById(
        "genzAccountOverlay"
      )
    ) {
      return;
    }

    const overlay =
      document.createElement("div");

    overlay.id =
      "genzAccountOverlay";

    overlay.innerHTML = `

      <div class="genz-auth-box">

        <div class="genz-auth-logo">
          GEN-Z.AI
        </div>

        <div class="genz-auth-subtitle">
          Character Reference → AI Video
        </div>

        <div id="genzLoginView">

          <div class="genz-auth-group">
            <label>Email</label>
            <input
              id="genzEmail"
              type="email"
              autocomplete="email"
              placeholder="email@example.com"
            >
          </div>

          <div class="genz-auth-group">
            <label>Password</label>
            <input
              id="genzPassword"
              type="password"
              autocomplete="current-password"
              placeholder="Password"
            >
          </div>

          <button
            id="genzLoginButton"
            class="genz-auth-button"
          >
            LOGIN
          </button>

          <button
            id="genzRegisterButton"
            class="genz-auth-secondary"
          >
            DAFTAR AKUN
          </button>

          <div
            id="genzForgotButton"
            class="genz-auth-link"
          >
            Lupa password?
          </div>

        </div>

        <div
          id="genzAuthStatus"
          class="genz-auth-status"
        ></div>

      </div>
    `;

    document.body.appendChild(
      overlay
    );

    bindAuthEvents();
  }


  function showAuthStatus(
    message,
    isError = false
  ) {

    const box =
      document.getElementById(
        "genzAuthStatus"
      );

    if (!box) {
      return;
    }

    box.textContent =
      message;

    box.style.display =
      "block";

    box.style.color =
      isError
        ? "#ffb4b4"
        : "#bff1c9";
  }


  function bindAuthEvents() {

    const loginButton =
      document.getElementById(
        "genzLoginButton"
      );

    const registerButton =
      document.getElementById(
        "genzRegisterButton"
      );

    const forgotButton =
      document.getElementById(
        "genzForgotButton"
      );


    loginButton.onclick =
      async () => {

        const email =
          document
            .getElementById("genzEmail")
            .value
            .trim();

        const password =
          document
            .getElementById("genzPassword")
            .value;

        if (!email || !password) {

          showAuthStatus(
            "Email dan password wajib diisi.",
            true
          );

          return;
        }

        try {

          loginButton.disabled =
            true;

          showAuthStatus(
            "Sedang login..."
          );

          await login(
            email,
            password
          );

          showAuthStatus(
            "Login berhasil."
          );

          setTimeout(
            renderLoggedIn,
            300
          );

        } catch (error) {

          showAuthStatus(
            error.message ||
            "Login gagal.",
            true
          );

        } finally {

          loginButton.disabled =
            false;
        }
      };


    registerButton.onclick =
      async () => {

        const email =
          document
            .getElementById("genzEmail")
            .value
            .trim();

        const password =
          document
            .getElementById("genzPassword")
            .value;

        if (!email || !password) {

          showAuthStatus(
            "Email dan password wajib diisi.",
            true
          );

          return;
        }

        if (password.length < 6) {

          showAuthStatus(
            "Password minimal 6 karakter.",
            true
          );

          return;
        }

        try {

          registerButton.disabled =
            true;

          showAuthStatus(
            "Membuat akun..."
          );

          const data =
            await register(
              email,
              password
            );

          if (
            data &&
            data.user &&
            !data.session
          ) {

            showAuthStatus(
              "Akun berhasil dibuat. Periksa email untuk verifikasi."
            );

            return;
          }

          showAuthStatus(
            "Akun berhasil dibuat."
          );

          setTimeout(
            renderLoggedIn,
            500
          );

        } catch (error) {

          showAuthStatus(
            error.message ||
            "Registrasi gagal.",
            true
          );

        } finally {

          registerButton.disabled =
            false;
        }
      };


    forgotButton.onclick =
      async () => {

        const email =
          document
            .getElementById("genzEmail")
            .value
            .trim();

        if (!email) {

          showAuthStatus(
            "Masukkan email terlebih dahulu.",
            true
          );

          return;
        }

        try {

          showAuthStatus(
            "Mengirim email reset password..."
          );

          await forgotPassword(
            email
          );

          showAuthStatus(
            "Email reset password sudah dikirim. Periksa inbox."
          );

        } catch (error) {

          showAuthStatus(
            error.message ||
            "Gagal mengirim email reset.",
            true
          );
        }
      };
  }


  async function renderLoggedIn() {

    const overlay =
      document.getElementById(
        "genzAccountOverlay"
      );

    if (overlay) {
      overlay.remove();
    }

    const app =
      document.querySelector(".app");

    if (!app) {
      return;
    }

    let panel =
      document.getElementById(
        "genzAccountPanel"
      );

    if (!panel) {

      panel =
        document.createElement("div");

      panel.id =
        "genzAccountPanel";

      panel.className =
        "card";

      app.insertBefore(
        panel,
        app.firstChild
      );
    }

    panel.innerHTML = `

      <div class="genz-account-head">

        <div>

          <div class="title">
            👤 Akun GEN-Z.AI
          </div>

          <div
            class="genz-account-email"
          >
            ${escapeHtml(
              currentUser.email || ""
            )}
          </div>

        </div>

        <button
          id="genzLogout"
          class="genz-logout"
        >
          Logout
        </button>

      </div>

      <div class="genz-api-box">

        <div class="genz-api-title">
          🔐 API KEY
        </div>

        <div class="genz-api-row">
          <label>
            Google Gemini / Veo
          </label>

          <input
            id="genzGeminiKey"
            type="password"
            placeholder="Masukkan API key Gemini"
          >
        </div>

        <div class="genz-api-row">
          <label>
            MiniMax / Hailuo
          </label>

          <input
            id="genzMinimaxKey"
            type="password"
            placeholder="Masukkan API key MiniMax"
          >
        </div>

        <div class="genz-api-row">
          <label>
            Luma
          </label>

          <input
            id="genzLumaKey"
            type="password"
            placeholder="Masukkan API key Luma"
          >
        </div>

        <button
          id="genzSaveApi"
          class="genz-save-api"
        >
          SIMPAN API KEY
        </button>

        <div
          id="genzApiStatus"
          class="genz-auth-status"
        ></div>

      </div>
    `;


    document
      .getElementById(
        "genzLogout"
      )
      .onclick =
      logout;


    try {

      const keys =
        await loadApiKeys();

      document
        .getElementById(
          "genzGeminiKey"
        )
        .value =
        keys.gemini || "";

      document
        .getElementById(
          "genzMinimaxKey"
        )
        .value =
        keys.minimax || "";

      document
        .getElementById(
          "genzLumaKey"
        )
        .value =
        keys.luma || "";

    } catch (error) {

      showApiStatus(
        "API key belum dapat dibuka. Login ulang diperlukan.",
        true
      );
    }


    document
      .getElementById(
        "genzSaveApi"
      )
      .onclick =
      async () => {

        const gemini =
          document
            .getElementById(
              "genzGeminiKey"
            )
            .value
            .trim();

        const minimax =
          document
            .getElementById(
              "genzMinimaxKey"
            )
            .value
            .trim();

        const luma =
          document
            .getElementById(
              "genzLumaKey"
            )
            .value
            .trim();

        try {

          const button =
            document
              .getElementById(
                "genzSaveApi"
              );

          button.disabled =
            true;

          showApiStatus(
            "Menyimpan API key..."
          );

          await saveApiKeys(
            gemini,
            minimax,
            luma
          );

          showApiStatus(
            "API key berhasil disimpan."
          );

        } catch (error) {

          showApiStatus(
            error.message ||
            "Gagal menyimpan API key.",
            true
          );

        } finally {

          document
            .getElementById(
              "genzSaveApi"
            )
            .disabled =
            false;
        }
      };
  }


  function showApiStatus(
    message,
    isError = false
  ) {

    const box =
      document.getElementById(
        "genzApiStatus"
      );

    if (!box) {
      return;
    }

    box.textContent =
      message;

    box.style.display =
      "block";

    box.style.color =
      isError
        ? "#ffb4b4"
        : "#bff1c9";
  }


  function renderLoggedOut() {

    const panel =
      document.getElementById(
        "genzAccountPanel"
      );

    if (panel) {
      panel.remove();
    }

    createOverlay();
  }


  function escapeHtml(value) {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /* =========================================================
     SESSION INITIALIZATION
     ========================================================= */

  async function init() {

    injectStyles();

    const {
      data
    } = await sb.auth.getSession();

    if (
      data &&
      data.session &&
      data.session.user
    ) {

      /*
       * Supabase restores the login session,
       * but deliberately does NOT restore the
       * password-derived encryption key.
       *
       * Therefore API keys remain locked until
       * the user authenticates again.
       */

      currentUser =
        data.session.user;

      createOverlay();

      showAuthStatus(
        "Sesi ditemukan. Login kembali untuk membuka API key."
      );

      return;
    }

    renderLoggedOut();
  }


  sb.auth.onAuthStateChange(
    (event, session) => {

      if (
        event === "SIGNED_OUT"
      ) {

        cryptoKey = null;
        currentUser = null;
        currentSalt = null;

        renderLoggedOut();
      }

    }
  );


  window.addEventListener(
    "DOMContentLoaded",
    init
  );


  document.dispatchEvent(
    new CustomEvent(
      "genz:account-ready"
    )
  );

})();
