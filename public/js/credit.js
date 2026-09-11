/* =========================================================
   GEN-Z.AI - CREDIT PAGE
   ========================================================= */

(function () {
  'use strict';

  const state = {
    loaded: false,
    loading: false,
    htmlLoaded: false,
    bound: false,

    packages: [
      { credit: 10, price: 10000 },
      { credit: 50, price: 50000 },
      { credit: 100, price: 100000 },
      { credit: 200, price: 200000 },
      { credit: 300, price: 300000 },
      { credit: 400, price: 400000 },
      { credit: 500, price: 500000 }
    ],

    selectedPackage: null
  };


  /* =========================================================
     HELPERS
     ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }


  function getGENZState() {
    window.GENZ = window.GENZ || {};
    window.GENZ.state = window.GENZ.state || {};

    return window.GENZ.state;
  }


  function getAccount() {
    return getGENZState().account || {};
  }


  function getCurrentUser() {
    const state = getGENZState();
    const account = getAccount();

    return (
      state.user ||
      account.user ||
      null
    );
  }


  function isLoggedIn() {
    const state = getGENZState();
    const user = getCurrentUser();

    return Boolean(
      user ||
      state.loggedIn === true
    );
  }


  function isAdmin() {
    const account = getAccount();

    return (
      account.isAdmin === true &&
      account.roleValidated === true
    );
  }


  function showPage(page) {
    if (
      typeof window.GENZ?.showPage === 'function'
    ) {
      window.GENZ.showPage(page);
      return true;
    }

    window.location.hash = '#' + page;
    return false;
  }


  function formatRupiah(value) {
    const number = Number(value) || 0;

    return (
      'Rp ' +
      number.toLocaleString('id-ID')
    );
  }


  function getToken() {
    try {
      if (
        window.GENZ?.auth &&
        typeof window.GENZ.auth.token === 'function'
      ) {
        return window.GENZ.auth.token();
      }
    } catch (error) {
      console.warn(
        '[GEN-Z CREDIT] token error',
        error
      );
    }

    return null;
  }


  /* =========================================================
     API
     ========================================================= */

  async function api(url, options = {}) {
    const token = getToken();

    const headers = {
      Accept: 'application/json',
      ...(options.headers || {})
    };

    if (
      options.body &&
      !headers['Content-Type']
    ) {
      headers['Content-Type'] =
        'application/json';
    }

    if (token) {
      headers.Authorization =
        'Bearer ' + token;
    }

    const response = await fetch(
      url,
      {
        ...options,
        credentials: 'include',
        headers
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        'Permintaan gagal.'
      );
    }

    return data;
  }


  /* =========================================================
     STATUS
     ========================================================= */

  function setStatus(
    text,
    type = 'info'
  ) {
    const el = $('creditStatus');

    if (!el) return;

    el.className =
      'credit-status';

    if (text) {
      el.classList.add(type);
    }

    el.textContent =
      text || '';
  }


  /* =========================================================
     BALANCE
     ========================================================= */

  function getBalance(data) {
    if (!data) return 0;

    const candidates = [
      data.credits,
      data.credit,
      data.balance,
      data.current_credits,
      data.currentCredit,

      data.user?.credits,
      data.user?.credit,
      data.user?.balance,

      data.account?.credits,
      data.account?.credit,
      data.account?.balance,

      data.data?.credits,
      data.data?.credit,
      data.data?.balance,

      data.data?.user?.credits,
      data.data?.account?.credits
    ];

    for (const value of candidates) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        const number =
          Number(value);

        if (
          Number.isFinite(number)
        ) {
          return number;
        }
      }
    }

    return 0;
  }


  function getEmail(data) {
    const user =
      getCurrentUser();

    const account =
      getAccount();

    return (
      data?.email ||
      data?.user?.email ||
      data?.account?.email ||
      user?.email ||
      account.email ||
      ''
    );
  }


  function updateCreditUI(balance) {
    const formatted =
      Number(balance || 0)
        .toLocaleString('id-ID');

    const balanceEl =
      $('creditBalance');

    if (balanceEl) {
      balanceEl.textContent =
        formatted;
    }

    const headerCredits =
      $('headerCredits');

    if (headerCredits) {
      headerCredits.textContent =
        formatted;
    }

    const accountCredits =
      $('credits');

    if (accountCredits) {
      accountCredits.textContent =
        formatted;
    }

    const account =
      getAccount();

    account.credits =
      Number(balance || 0);

    getGENZState().account =
      account;
  }


  function updateEmailUI(email) {
    const emailEl =
      $('creditUserEmail');

    if (emailEl) {
      emailEl.textContent =
        email || '-';
    }
  }


  async function loadBalance() {
    try {
      const data =
        await api(
          '/api/account/credits'
        );

      const balance =
        getBalance(data);

      const email =
        getEmail(data);

      updateCreditUI(balance);
      updateEmailUI(email);

      return balance;

    } catch (error) {
      console.error(
        '[GEN-Z CREDIT] balance error',
        error
      );

      return null;
    }
  }


  /* =========================================================
     TRANSACTION TYPE
     ========================================================= */

  function transactionLabel(transaction) {
    const type =
      String(
        transaction?.type ||
        transaction?.transaction_type ||
        ''
      )
        .trim()
        .toLowerCase();

    switch (type) {

      case 'generation':
      case 'generate':
      case 'video_generation':
        return 'Generate Video';

      case 'image_generation':
      case 'image':
        return 'Generate Image';

      case 'refund':
        return 'Credit Dikembalikan';

      case 'topup':
      case 'top_up':
        return 'Top Up Credit';

      case 'admin_adjustment':
        return 'Penyesuaian Admin';

      default:
        return (
          transaction?.note ||
          transaction?.description ||
          'Transaksi Credit'
        );
    }
  }


  function transactionIcon(transaction) {
    const type =
      String(
        transaction?.type ||
        transaction?.transaction_type ||
        ''
      )
        .trim()
        .toLowerCase();

    switch (type) {

      case 'generation':
      case 'generate':
      case 'video_generation':
        return '🎬';

      case 'image_generation':
      case 'image':
        return '🖼️';

      case 'refund':
        return '↩️';

      case 'topup':
      case 'top_up':
        return '💳';

      case 'admin_adjustment':
        return '🛠️';

      default:
        return 'C';
    }
  }


  /* =========================================================
     TRANSACTION HISTORY
     ========================================================= */

  async function loadHistory() {
    const container =
      $('creditHistory');

    if (!container) {
      return;
    }

    try {
      const data =
        await api(
          '/api/account/transactions'
        );

      const transactions =
        Array.isArray(data)
          ? data
          : Array.isArray(
              data?.transactions
            )
            ? data.transactions
            : Array.isArray(
                data?.data
              )
              ? data.data
              : [];

      if (!transactions.length) {
        container.innerHTML = `
          <div class="credit-history-empty">
            Belum ada riwayat Credit.
          </div>
        `;

        return;
      }

      container.innerHTML =
        transactions
          .slice(0, 50)
          .map(renderTransaction)
          .join('');

    } catch (error) {
      console.warn(
        '[GEN-Z CREDIT] history unavailable',
        error
      );

      container.innerHTML = `
        <div class="credit-history-empty">
          Riwayat Credit belum tersedia.
        </div>
      `;
    }
  }


  /* =========================================================
     RENDER TRANSACTION
     ========================================================= */

  function renderTransaction(
    transaction
  ) {
    const amount =
      Number(
        transaction?.amount ??
        transaction?.credit ??
        transaction?.credits ??
        0
      );

    const positive =
      amount >= 0;

    const label =
      transactionLabel(
        transaction
      );

    const icon =
      transactionIcon(
        transaction
      );

    const note =
      transaction?.note ||
      transaction?.description ||
      '';

    const dateValue =
      transaction?.created_at ||
      transaction?.createdAt ||
      transaction?.date ||
      null;

    let date = '';

    if (dateValue) {
      try {
        date =
          new Date(
            dateValue
          ).toLocaleString(
            'id-ID',
            {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }
          );
      } catch {
        date =
          String(dateValue);
      }
    }

    const balanceAfter =
      transaction?.balance_after ??
      transaction?.balanceAfter ??
      null;

    return `
      <div
        class="credit-history-item"
        style="
          display:flex;
          align-items:center;
          gap:12px;
          padding:13px;
          border-radius:13px;
          background:rgba(255,255,255,.025);
          border:1px solid rgba(255,255,255,.06);
        "
      >

        <div
          style="
            width:34px;
            height:34px;
            flex-shrink:0;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:10px;
            background:${
              positive
                ? 'rgba(34,197,94,.12)'
                : 'rgba(239,68,68,.12)'
            };
            font-size:15px;
          "
        >
          ${icon}
        </div>

        <div
          style="
            min-width:0;
            flex:1;
          "
        >

          <div
            style="
              color:#fff;
              font-size:11px;
              font-weight:800;
            "
          >
            ${escapeHtml(label)}
          </div>

          ${
            note
              ? `
                <div
                  style="
                    margin-top:3px;
                    color:rgba(255,255,255,.42);
                    font-size:9px;
                    line-height:1.4;
                  "
                >
                  ${escapeHtml(note)}
                </div>
              `
              : ''
          }

          <div
            style="
              margin-top:4px;
              color:rgba(255,255,255,.3);
              font-size:8px;
            "
          >
            ${escapeHtml(date)}
          </div>

        </div>

        <div
          style="
            flex-shrink:0;
            text-align:right;
          "
        >

          <div
            style="
              color:${
                positive
                  ? '#86efac'
                  : '#fca5a5'
              };
              font-size:11px;
              font-weight:900;
            "
          >
            ${
              positive
                ? '+'
                : ''
            }${amount.toLocaleString('id-ID')} C
          </div>

          ${
            balanceAfter !== null
              ? `
                <div
                  style="
                    margin-top:3px;
                    color:rgba(255,255,255,.28);
                    font-size:8px;
                  "
                >
                  Saldo:
                  ${Number(balanceAfter).toLocaleString('id-ID')} C
                </div>
              `
              : ''
          }

        </div>

      </div>
    `;
  }


  /* =========================================================
     HTML ESCAPE
     ========================================================= */

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );
  }


  /* =========================================================
     PACKAGE
     ========================================================= */

  function getPackage(
    credit
  ) {
    return state.packages.find(
      item =>
        Number(item.credit) ===
        Number(credit)
    );
  }


  function saveSelectedPackage(
    packageData
  ) {
    state.selectedPackage = {
      credit:
        Number(packageData.credit),

      price:
        Number(packageData.price)
    };

    getGENZState()
      .selectedCreditPackage = {
        credit:
          Number(packageData.credit),

        price:
          Number(packageData.price)
      };
  }


  /* =========================================================
     PACKAGE PURCHASE
     ========================================================= */

  function handlePackagePurchase(
    credit
  ) {
    const packageData =
      getPackage(credit);

    if (!packageData) {
      setStatus(
        'Paket Credit tidak ditemukan.',
        'error'
      );

      return;
    }

    saveSelectedPackage(
      packageData
    );

    if (isAdmin()) {

      setStatus(
        `Paket C ${packageData.credit} dipilih.`,
        'success'
      );

      setTimeout(
        () => {
          showPage(
            'topup-settings'
          );
        },
        150
      );

      return;
    }

    setStatus(
      `Paket C ${packageData.credit} dipilih. Total ${formatRupiah(packageData.price)}. Halaman pembayaran akan digunakan setelah sistem pembayaran diaktifkan.`,
      'info'
    );
  }


  /* =========================================================
     BIND PACKAGES
     ========================================================= */

  function bindPackages() {
    const container =
      $('creditPackages');

    if (!container) {
      return;
    }

    if (
      container.dataset.genzBound === '1'
    ) {
      return;
    }

    container.dataset.genzBound =
      '1';

    container.addEventListener(
      'click',
      event => {

        const button =
          event.target.closest(
            '.credit-package'
          );

        if (!button) {
          return;
        }

        const credit =
          Number(
            button.dataset.credit
          );

        if (
          !Number.isFinite(
            credit
          )
        ) {
          return;
        }

        handlePackagePurchase(
          credit
        );
      }
    );
  }


  /* =========================================================
     BACK
     ========================================================= */

  function bindBack() {
    const button =
      $('creditBack');

    if (!button) {
      return;
    }

    if (
      button.dataset.genzBound === '1'
    ) {
      return;
    }

    button.dataset.genzBound =
      '1';

    button.addEventListener(
      'click',
      () => {
        showPage('studio');
      }
    );
  }


  /* =========================================================
     LOAD HTML
     ========================================================= */

  async function loadHtml() {

    /*
     * core.js:
     *
     * GENZ.loadComponent(target, url)
     *
     * app.js:
     *
     * <div id="pageContent"></div>
     *
     * Jadi target harus #pageContent
     * dan URL harus /components/credit.html.
     */

    if (
      typeof window.GENZ?.loadComponent ===
      'function'
    ) {
      try {

        const result =
          await window.GENZ.loadComponent(
            '#pageContent',
            '/components/credit.html'
          );

        state.htmlLoaded =
          result !== false;

        return state.htmlLoaded;

      } catch (error) {

        console.error(
          '[GEN-Z CREDIT] loadComponent error',
          error
        );

        state.htmlLoaded =
          false;
      }
    }


    /*
     * Fallback apabila core.js
     * belum menyediakan loadComponent().
     */

    const container =
      document.querySelector(
        '#pageContent'
      );

    if (!container) {
      console.error(
        '[GEN-Z CREDIT] #pageContent tidak ditemukan.'
      );

      state.htmlLoaded =
        false;

      return false;
    }

    try {

      const response =
        await fetch(
          '/components/credit.html',
          {
            cache: 'no-store'
          }
        );

      if (!response.ok) {
        throw new Error(
          `Gagal memuat credit.html. HTTP ${response.status}`
        );
      }

      const html =
        await response.text();

      container.innerHTML =
        html;

      state.htmlLoaded =
        true;

      return true;

    } catch (error) {

      console.error(
        '[GEN-Z CREDIT] HTML error',
        error
      );

      state.htmlLoaded =
        false;

      return false;
    }
  }


  /* =========================================================
     LOAD PAGE
     ========================================================= */

  async function load() {

    if (state.loading) {
      return;
    }

    if (!isLoggedIn()) {
      showPage('studio');
      return;
    }

    state.loading = true;

    try {

      setStatus(
        '',
        'info'
      );


      /*
       * Pastikan HTML Credit sudah
       * berada di #pageContent.
       */

      if (!$('creditPage')) {

        const loaded =
          await loadHtml();

        if (!loaded) {
          throw new Error(
            'Komponen Credit gagal dimuat.'
          );
        }
      }


      /*
       * Ambil saldo terbaru.
       */

      await loadBalance();


      /*
       * Pasang event.
       */

      bindPackages();
      bindBack();


      /*
       * Ambil riwayat transaksi.
       */

      await loadHistory();


      state.loaded =
        true;

    } catch (error) {

      console.error(
        '[GEN-Z CREDIT] load error',
        error
      );

      setStatus(
        error?.message ||
        'Halaman Credit gagal dimuat.',
        'error'
      );

    } finally {

      state.loading =
        false;
    }
  }


  /* =========================================================
     REFRESH
     ========================================================= */

  async function refresh() {
    await loadBalance();
    await loadHistory();
  }


  /* =========================================================
     INIT
     ========================================================= */

  async function init() {

    if (!$('creditPage')) {
      await loadHtml();
    }

    await load();
  }


  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.GENZ =
    window.GENZ || {};

  window.GENZ.credit = {

    load,

    init,

    refresh,

    loadBalance,

    loadHistory,

    handleTopup:
      handlePackagePurchase,

    handlePackagePurchase,

    getPackage,

    isAdmin,

    state

  };

})();
