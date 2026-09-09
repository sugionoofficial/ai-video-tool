"use strict";

(() => {
  const C = window.AIVideoConfig || {};

  const $ = (id) =>
    document.getElementById(id);

  // ==========================================
  // TOKEN
  // ==========================================

  function getToken() {
    const key =
      C.TOKEN_KEY ||
      "polli_access_token";

    /*
     * OAuth Pollinations sebaiknya disimpan
     * di sessionStorage untuk aplikasi browser.
     */

    return (
      sessionStorage.getItem(key) ||
      ""
    );
  }

  function saveToken(token) {
    if (!token) return;

    const key =
      C.TOKEN_KEY ||
      "polli_access_token";

    sessionStorage.setItem(
      key,
      token
    );
  }

  function clearToken() {
    const key =
      C.TOKEN_KEY ||
      "polli_access_token";

    sessionStorage.removeItem(key);

    /*
     * Bersihkan juga key lama agar token
     * dari versi sebelumnya tidak mengganggu.
     */

    localStorage.removeItem(key);

    sessionStorage.removeItem(
      "pollinations_access_token"
    );

    sessionStorage.removeItem(
      "access_token"
    );
  }

  window.getPollinationsToken =
    getToken;

  // ==========================================
  // STATUS UTAMA
  // ==========================================

  function setStatus(
    message,
    type = ""
  ) {
    const el =
      $("status");

    if (!el) return;

    el.textContent =
      message;

    el.className =
      "status " + type;
  }

  window.setAIStatus =
    setStatus;

  // ==========================================
  // CONNECTION STATUS
  // ==========================================

  function updateConnectionStatus(
    message = ""
  ) {
    /*
     * index.html saat ini menggunakan
     * connectionStatus.
     *
     * polliStatus tetap didukung untuk
     * kompatibilitas versi lama.
     */

    const box =
      $("connectionStatus") ||
      $("polliStatus");

    const connectButton =
      $("connectPolli");

    const disconnectButton =
      $("disconnectPolli");

    const connected =
      Boolean(
        getToken()
      );

    if (connected) {

      if (box) {
        box.textContent =
          "● Terhubung ke Pollinations";

        box.classList.add(
          "connected"
        );
      }

      if (connectButton) {
        connectButton.style.display =
          "none";
      }

      if (disconnectButton) {
        disconnectButton.style.display =
          "block";
      }

      if (message) {
        setStatus(
          message,
          "ok"
        );
      }

    } else {

      if (box) {
        box.textContent =
          "● Belum terhubung ke Pollinations";

        box.classList.remove(
          "connected"
        );
      }

      if (connectButton) {
        connectButton.style.display =
          "block";
      }

      if (disconnectButton) {
        disconnectButton.style.display =
          "none";
      }
    }

    return connected;
  }

  // ==========================================
  // RANDOM STATE
  // ==========================================

  function createState() {
    const array =
      new Uint32Array(4);

    crypto.getRandomValues(
      array
    );

    return Array.from(array)
      .map(
        value =>
          value.toString(16)
      )
      .join("");
  }

  // ==========================================
  // BASE64URL
  // ==========================================

  function base64UrlEncode(
    buffer
  ) {
    return btoa(
      String.fromCharCode(
        ...new Uint8Array(
          buffer
        )
      )
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  // ==========================================
  // CONNECT POLLINATIONS
  // ==========================================

  async function connectPollinations() {
    try {

      if (
        !window.crypto ||
        !crypto.subtle
      ) {
        throw new Error(
          "Browser tidak mendukung Web Crypto."
        );
      }

      if (
        !C.CLIENT_ID ||
        !C.REDIRECT_URI ||
        !C.AUTH_URL
      ) {
        throw new Error(
          "Konfigurasi OAuth Pollinations belum lengkap."
        );
      }

      /*
       * PKCE verifier
       */

      const verifier =
        crypto.randomUUID() +
        crypto.randomUUID();

      /*
       * PKCE challenge
       */

      const hash =
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(
            verifier
          )
        );

      const challenge =
        base64UrlEncode(
          hash
        );

      /*
       * CSRF state
       */

      const state =
        createState();

      sessionStorage.setItem(
        "polli_code_verifier",
        verifier
      );

      sessionStorage.setItem(
        "polli_oauth_state",
        state
      );

      setStatus(
        "Membuka halaman otorisasi Pollinations..."
      );

      /*
       * Authorization URL
       */

      const authURL =
        new URL(
          C.AUTH_URL
        );

      authURL.searchParams.set(
        "client_id",
        C.CLIENT_ID
      );

      authURL.searchParams.set(
        "redirect_uri",
        C.REDIRECT_URI
      );

      authURL.searchParams.set(
        "response_type",
        "code"
      );

      authURL.searchParams.set(
        "code_challenge",
        challenge
      );

      authURL.searchParams.set(
        "code_challenge_method",
        "S256"
      );

      /*
       * Minta scope yang relevan.
       */

      authURL.searchParams.set(
        "scope",
        "profile usage"
      );

      /*
       * State untuk validasi callback.
       */

      authURL.searchParams.set(
        "state",
        state
      );

      window.location.href =
        authURL.toString();

    } catch (error) {

      console.error(
        "Pollinations OAuth ERROR:",
        error
      );

      setStatus(
        "Gagal memulai koneksi Pollinations: " +
        (
          error?.message ||
          "Unknown error"
        ),
        "err"
      );
    }
  }

  // ==========================================
  // OAUTH CALLBACK
  // ==========================================

  async function handleOAuthCallback() {

    const params =
      new URLSearchParams(
        window.location.search
      );

    /*
     * OAuth error
     */

    const oauthError =
      params.get("error");

    if (oauthError) {

      const description =
        params.get(
          "error_description"
        ) ||
        oauthError;

      setStatus(
        "OAuth Pollinations ditolak: " +
        description,
        "err"
      );

      sessionStorage.removeItem(
        "polli_code_verifier"
      );

      sessionStorage.removeItem(
        "polli_oauth_state"
      );

      return;
    }

    /*
     * Authorization code
     */

    const code =
      params.get("code");

    if (!code) {

      /*
       * Tidak ada callback.
       * Hanya update status berdasarkan
       * token yang sudah tersimpan.
       */

      updateConnectionStatus();

      return;
    }

    /*
     * Validasi state
     */

    const returnedState =
      params.get("state");

    const savedState =
      sessionStorage.getItem(
        "polli_oauth_state"
      );

    if (
      savedState &&
      returnedState !== savedState
    ) {

      sessionStorage.removeItem(
        "polli_code_verifier"
      );

      sessionStorage.removeItem(
        "polli_oauth_state"
      );

      setStatus(
        "OAuth gagal: state tidak cocok.",
        "err"
      );

      return;
    }

    /*
     * PKCE verifier
     */

    const verifier =
      sessionStorage.getItem(
        "polli_code_verifier"
      );

    if (!verifier) {

      setStatus(
        "Code verifier tidak ditemukan. Silakan hubungkan kembali Pollinations.",
        "err"
      );

      return;
    }

    try {

      setStatus(
        "Menghubungkan ke Pollinations..."
      );

      /*
       * Pollinations menggunakan
       * application/x-www-form-urlencoded
       * untuk token exchange.
       */

      const body =
        new URLSearchParams();

      body.set(
        "grant_type",
        "authorization_code"
      );

      body.set(
        "code",
        code
      );

      body.set(
        "client_id",
        C.CLIENT_ID
      );

      body.set(
        "redirect_uri",
        C.REDIRECT_URI
      );

      body.set(
        "code_verifier",
        verifier
      );

      const response =
        await fetch(
          C.TOKEN_URL,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",

              "Accept":
                "application/json"
            },

            body:
              body.toString()
          }
        );

      const text =
        await response.text();

      let data = {};

      try {
        data =
          JSON.parse(text);
      } catch (_) {
        /*
         * Respons bukan JSON.
         */
      }

      if (!response.ok) {

        console.error(
          "Pollinations token error:",
          {
            status:
              response.status,

            response:
              data
          }
        );

        throw new Error(
          data.error_description ||
          data.error ||
          data.message ||
          (
            "Token exchange gagal. HTTP " +
            response.status
          )
        );
      }

      /*
       * Ambil access token.
       */

      const token =
        data.access_token ||
        data.token;

      if (!token) {

        throw new Error(
          "Pollinations tidak mengembalikan access token."
        );
      }

      /*
       * Simpan token.
       */

      saveToken(
        token
      );

      /*
       * Bersihkan OAuth session.
       */

      sessionStorage.removeItem(
        "polli_code_verifier"
      );

      sessionStorage.removeItem(
        "polli_oauth_state"
      );

      /*
       * Bersihkan ?code= dari URL.
       */

      const cleanURL =
        window.location.origin +
        window.location.pathname;

      window.history.replaceState(
        {},
        document.title,
        cleanURL
      );

      /*
       * Update UI.
       */

      updateConnectionStatus(
        "Pollinations berhasil terhubung."
      );

      /*
       * Pastikan status tetap terlihat
       * setelah halaman selesai.
       */

      setTimeout(
        () => {
          updateConnectionStatus(
            "Pollinations berhasil terhubung."
          );
        },
        100
      );

    } catch (error) {

      console.error(
        "Pollinations OAuth CALLBACK ERROR:",
        error
      );

      sessionStorage.removeItem(
        "polli_code_verifier"
      );

      sessionStorage.removeItem(
        "polli_oauth_state"
      );

      updateConnectionStatus();

      setStatus(
        "Gagal menghubungkan Pollinations: " +
        (
          error?.message ||
          "Unknown error"
        ),
        "err"
      );
    }
  }

  // ==========================================
  // DISCONNECT
  // ==========================================

  function disconnect() {

    clearToken();

    sessionStorage.removeItem(
      "polli_code_verifier"
    );

    sessionStorage.removeItem(
      "polli_oauth_state"
    );

    updateConnectionStatus();

    setStatus(
      "Koneksi Pollinations diputus."
    );
  }

  // ==========================================
  // INIT
  // ==========================================

  function init() {

    const connectButton =
      $("connectPolli");

    const disconnectButton =
      $("disconnectPolli");

    if (connectButton) {

      connectButton.onclick =
        connectPollinations;
    }

    if (disconnectButton) {

      disconnectButton.onclick =
        disconnect;
    }

    /*
     * Tampilkan status token yang sudah ada.
     */

    updateConnectionStatus();

    /*
     * Periksa apakah halaman ini merupakan
     * callback OAuth.
     */

    handleOAuthCallback();
  }

  // ==========================================
  // START
  // ==========================================

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();
