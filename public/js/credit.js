/* =========================================================
   GEN-Z.AI
   CREDIT MODULE
   public/js/credit.js
   ========================================================= */

(function () {

  "use strict";


  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  /* =======================================================
     HELPERS
     ======================================================= */

  function $(id) {

    return document.getElementById(id);

  }


  function isLoggedIn() {

    return Boolean(
      GENZ.state &&
      GENZ.state.loggedIn === true &&
      GENZ.state.user
    );

  }


  function isAdmin() {

    return Boolean(
      GENZ.state &&
      GENZ.state.account &&
      GENZ.state.account.isAdmin === true &&
      GENZ.state.account.roleValidated === true
    );

  }


  function escapeHtml(value) {

    if (
      typeof GENZ.escapeHtml === "function"
    ) {

      return GENZ.escapeHtml(
        String(value ?? "")
      );

    }


    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  async function getToken() {

    try {

      if (
        GENZ.auth &&
        typeof GENZ.auth.token === "function"
      ) {

        return await GENZ.auth.token();

      }

    } catch (_) {}

    return null;

  }


  async function api(
    url,
    options = {}
  ) {

    const authToken =
      await getToken();


    const headers = {
      Accept:
        "application/json",

      ...(options.body
        ? {
            "Content-Type":
              "application/json"
          }
        : {}),

      ...(authToken
        ? {
            Authorization:
              `Bearer ${authToken}`
          }
        : {}),

      ...(options.headers || {})

    };


    const response =
      await fetch(
        url,
        {
          ...options,
          credentials:
            "include",
          headers
        }
      );


    let data =
      null;


    try {

      data =
        await response.json();

    } catch (_) {

      data =
        null;

    }


    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        `HTTP ${response.status}`
      );

    }


    return data;

  }


  /* =======================================================
     BALANCE
     ======================================================= */

  async function loadBalance() {

    const element =
      $("creditBalance");


    if (!element) {
      return 0;
    }


    try {

      const data =
        await api(
          "/api/account/credits",
          {
            method: "GET"
          }
        );


      const credits =
        Number(
          data?.credits ??
          data?.credit ??
          data?.balance ??
          0
        );


      element.textContent =
        credits.toLocaleString(
          "id-ID"
        );


      /*
       * Simpan juga ke global state.
       */

      GENZ.state =
        GENZ.state ||
        {};


      GENZ.state.account =
        {
          ...(GENZ.state.account || {}),
          credits
        };


      /*
       * Sinkronkan modul account
       * jika tersedia.
       */

      if (
        GENZ.account &&
        typeof GENZ.account.updateCredits ===
          "function"
      ) {

        GENZ.account.updateCredits(
          credits
        );

      }


      /*
       * Sinkronkan header jika element tersedia.
       */

      const headerCredits =
        $("headerCredits");


      if (headerCredits) {

        headerCredits.textContent =
          credits.toLocaleString(
            "id-ID"
          );

      }


      return credits;

    } catch (error) {

      console.error(
        "[CREDIT] Gagal memuat saldo:",
        error
      );


      element.textContent =
        "0";


      return 0;

    }

  }


  /* =======================================================
     EMAIL
     ======================================================= */

  function loadUser() {

    const element =
      $("creditUserEmail");


    if (!element) {
      return;
    }


    const email =
      GENZ.state?.user?.email ||
      "User";


    element.textContent =
      email;

  }


  /* =======================================================
     HISTORY
     ======================================================= */

  async function loadHistory() {

    const container =
      $("creditHistory");


    if (!container) {
      return;
    }


    container.innerHTML =
      `
        <div class="credit-history-empty">
          Memuat riwayat...
        </div>
      `;


    try {

      /*
       * Endpoint transaksi akun.
       * Jika backend belum menyediakan endpoint ini,
       * halaman tetap aman dan hanya menampilkan
       * pesan bahwa riwayat belum tersedia.
       */

      const data =
        await api(
          "/api/account/transactions",
          {
            method: "GET"
          }
        );


      const transactions =
        Array.isArray(data)
          ? data
          : (
              data?.transactions ||
              data?.data ||
              []
            );


      if (
        !Array.isArray(transactions) ||
        transactions.length === 0
      ) {

        container.innerHTML =
          `
            <div class="credit-history-empty">
              Belum ada riwayat kredit.
            </div>
          `;

        return;

      }


      container.innerHTML =
        transactions
          .map(
            function (item) {

              const amount =
                Number(
                  item?.amount ??
                  item?.credits ??
                  item?.credit_amount ??
                  0
                );


              const type =
                item?.type ||
                item?.transaction_type ||
                item?.description ||
                "Transaksi Kredit";


              const date =
                item?.created_at ||
                item?.createdAt ||
                item?.date ||
                "";


              const positive =
                amount >= 0;


              return `

                <div
                  class="credit-transaction">

                  <div
                    class="credit-transaction-main">

                    <span
                      class="credit-transaction-type">

                      ${escapeHtml(type)}

                    </span>

                    <span
                      class="credit-transaction-date">

                      ${escapeHtml(
                        formatDate(date)
                      )}

                    </span>

                  </div>


                  <strong
                    class="
                      credit-transaction-amount
                      ${positive ? "plus" : "minus"}
                    ">

                    ${positive ? "+" : ""}
                    ${amount.toLocaleString("id-ID")}

                  </strong>

                </div>

              `;

            }
          )
          .join("");

    } catch (error) {

      console.warn(
        "[CREDIT] Riwayat transaksi belum tersedia:",
        error
      );


      container.innerHTML =
        `
          <div class="credit-history-empty">
            Belum ada riwayat kredit.
          </div>
        `;

    }

  }


  /* =======================================================
     DATE
     ======================================================= */

  function formatDate(value) {

    if (!value) {
      return "-";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return String(value);

    }


    return date.toLocaleString(
      "id-ID",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    );

  }


  /* =======================================================
     PAYMENT PLACEHOLDER
     ======================================================= */

  function showPaymentPage() {

    const pages =
      $("pageContent");


    if (!pages) {
      return;
    }


    pages.innerHTML = `

      <section
        class="page-card credit-payment-page">

        <div class="page-header">

          <button
            type="button"
            class="back-btn"
            id="creditPaymentBack"
            aria-label="Kembali ke Kredit">

            ←

          </button>


          <div>

            <h2>
              Pembayaran
            </h2>

            <p>
              Top Up Kredit GEN-Z.AI
            </p>

          </div>

        </div>


        <div
          class="credit-payment-placeholder">

          <div
            class="credit-payment-icon">
            Rp
          </div>


          <h3>
            Halaman Pembayaran
          </h3>


          <p>
            Sistem pembayaran belum
            diaktifkan.
          </p>


          <small>
            Halaman ini sementara digunakan
            sebagai tujuan Top Up user biasa.
          </small>

        </div>

      </section>

    `;


    const back =
      $("creditPaymentBack");


    if (back) {

      back.addEventListener(
        "click",
        function () {

          load();

        },
        {
          once: true
        }
      );

    }

  }


  /* =======================================================
     TOP UP ROUTER
     ======================================================= */

  function handleTopup() {

    /*
     * ADMIN / OWNER
     *
     * Tidak melewati pembayaran.
     * Langsung ke Top Up Setting.
     */

    if (isAdmin()) {

      if (
        typeof GENZ.showPage ===
        "function"
      ) {

        GENZ.showPage(
          "topup-settings"
        );

      } else if (
        typeof GENZ.emit ===
        "function"
      ) {

        GENZ.emit(
          "show-page",
          "topup-settings"
        );

      }

      return;

    }


    /*
     * USER BIASA
     *
     * Untuk sementara menuju
     * placeholder halaman pembayaran.
     */

    showPaymentPage();

  }


  /* =======================================================
     BACK TO STUDIO
     ======================================================= */

  function backToStudio() {

    if (
      typeof GENZ.showStudio ===
      "function"
    ) {

      GENZ.showStudio();

      return;

    }


    if (
      typeof GENZ.emit ===
      "function"
    ) {

      GENZ.emit(
        "show-studio"
      );

    }

  }


  /* =======================================================
     BIND
     ======================================================= */

  function bind() {

    const back =
      $("creditBack");


    if (back) {

      back.onclick =
        backToStudio;

    }


    const topup =
      $("creditTopupButton");


    if (topup) {

      topup.onclick =
        handleTopup;

    }

  }


  /* =======================================================
     LOAD HTML
     ======================================================= */

  async function loadHtml() {

    const container =
      $("pageContent");


    if (!container) {

      throw new Error(
        "Element #pageContent tidak ditemukan."
      );

    }


    /*
     * Gunakan loader utama jika tersedia.
     */

    if (
      typeof GENZ.loadComponent ===
      "function"
    ) {

      await GENZ.loadComponent(
        "#pageContent",
        "/components/credit.html"
      );

      return;

    }


    /*
     * Fallback.
     */

    const response =
      await fetch(
        "/components/credit.html",
        {
          cache:
            "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `Gagal memuat credit.html (${response.status})`
      );

    }


    container.innerHTML =
      await response.text();

  }


  /* =======================================================
     LOAD
     ======================================================= */

  async function load() {

    if (!isLoggedIn()) {

      backToStudio();

      return;

    }


    try {

      await loadHtml();

    } catch (error) {

      console.error(
        "[CREDIT] Gagal memuat halaman:",
        error
      );


      const container =
        $("pageContent");


      if (container) {

        container.innerHTML = `

          <section
            class="page-card">

            <div
              class="page-header">

              <button
                type="button"
                class="back-btn"
                id="creditBack">

                ←

              </button>


              <div>

                <h2>
                  Kredit
                </h2>

                <p>
                  Halaman kredit tidak dapat dimuat.
                </p>

              </div>

            </div>

          </section>

        `;

      }

    }


    loadUser();

    bind();

    await loadBalance();

    await loadHistory();

  }


  /* =======================================================
     REFRESH
     ======================================================= */

  async function refresh() {

    loadUser();

    await loadBalance();

    await loadHistory();

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  GENZ.credit = {

    load,

    refresh,

    loadBalance,

    loadHistory,

    handleTopup

  };


})();
