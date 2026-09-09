"use strict";

(() => {

  const C =
    window.AIVideoConfig;

  const $ =
    id => document.getElementById(id);


  function getToken() {

    return (
      localStorage.getItem(C.TOKEN_KEY) ||
      sessionStorage.getItem(C.TOKEN_KEY) ||
      sessionStorage.getItem(
        "pollinations_access_token"
      ) ||
      sessionStorage.getItem(
        "access_token"
      ) ||
      ""
    );

  }


  function saveToken(token) {

    if (!token) return;

    localStorage.setItem(
      C.TOKEN_KEY,
      token
    );

    sessionStorage.setItem(
      C.TOKEN_KEY,
      token
    );

  }


  window.getPollinationsToken =
    getToken;


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


  function updateConnectionStatus() {

    const box =
      $("polliStatus");

    if (!box) return;

    if (getToken()) {

      box.textContent =
        "● Terhubung ke Pollinations";

      box.classList.add(
        "connected"
      );

    } else {

      box.textContent =
        "● Belum terhubung ke Pollinations";

      box.classList.remove(
        "connected"
      );

    }

  }


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


      const verifier =
        crypto.randomUUID() +
        crypto.randomUUID();


      const hash =
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(
            verifier
          )
        );


      const challenge =
        btoa(
          String.fromCharCode(
            ...new Uint8Array(hash)
          )
        )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");


      sessionStorage.setItem(
        "polli_code_verifier",
        verifier
      );


      const authURL =
        new URL(C.AUTH_URL);


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


      window.location.href =
        authURL.toString();

    } catch (error) {

      setStatus(
        "Gagal memulai koneksi Pollinations: " +
        error.message,
        "err"
      );

    }

  }


  async function handleOAuthCallback() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    const error =
      params.get("error");


    if (error) {

      setStatus(
        "OAuth Pollinations ditolak: " +
        (
          params.get(
            "error_description"
          ) ||
          error
        ),
        "err"
      );

      return;

    }


    const code =
      params.get("code");


    if (!code) return;


    const verifier =
      sessionStorage.getItem(
        "polli_code_verifier"
      );


    if (!verifier) {

      setStatus(
        "Code verifier tidak ditemukan. Ulangi koneksi Pollinations.",
        "err"
      );

      return;

    }


    try {

      setStatus(
        "Menghubungkan ke Pollinations..."
      );


      const response =
        await fetch(
          C.TOKEN_URL,
          {

            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({

                grant_type:
                  "authorization_code",

                code:
                  code,

                client_id:
                  C.CLIENT_ID,

                redirect_uri:
                  C.REDIRECT_URI,

                code_verifier:
                  verifier

              })

          }
        );


      const text =
        await response.text();


      let data = {};

      try {
        data =
          JSON.parse(text);
      } catch (_) {}


      if (!response.ok) {

        throw new Error(
          data.error ||
          data.message ||
          "Token gagal diperoleh."
        );

      }


      const token =
        data.access_token ||
        data.token;


      if (!token) {

        throw new Error(
          "Access token tidak ditemukan."
        );

      }


      saveToken(token);


      sessionStorage.removeItem(
        "polli_code_verifier"
      );


      window.history.replaceState(
        {},
        document.title,
        C.REDIRECT_URI
      );


      updateConnectionStatus();


      setStatus(
        "Pollinations berhasil terhubung.",
        "ok"
      );


    } catch (error) {

      setStatus(
        "Gagal menghubungkan Pollinations: " +
        error.message,
        "err"
      );

    }

  }


  function disconnect() {

    localStorage.removeItem(
      C.TOKEN_KEY
    );

    sessionStorage.removeItem(
      C.TOKEN_KEY
    );

    sessionStorage.removeItem(
      "pollinations_access_token"
    );

    sessionStorage.removeItem(
      "access_token"
    );

    sessionStorage.removeItem(
      "polli_code_verifier"
    );


    updateConnectionStatus();


    setStatus(
      "Koneksi Pollinations diputus."
    );

  }


  $("connectPolli").onclick =
    connectPollinations;


  $("disconnectPolli").onclick =
    disconnect;


  updateConnectionStatus();

  handleOAuthCallback();

})();
