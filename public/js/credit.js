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
    const genzState = getGENZState();

    return genzState.account || {};
  }

  function getCurrentUser() {
    const genzState = getGENZState();

    return (
      genzState.user ||
      getAccount().user ||
      null
    );
  }

  /* =========================================================
     AUTH
     ========================================================= */

  function isLoggedIn() {
    const genzState = getGENZState();
    const user = getCurrentUser();

    return Boolean(
      user ||
      genzState.loggedIn === true
    );
  }

  /* =========================================================
     ADMIN
     ========================================================= */

  function isAdmin() {
    const account = getAccount();

    return (
      account.isAdmin === true &&
      account.roleValidated === true
    );
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

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

  /* =========================================================
     RUPIAH
     ========================================================= */

  function formatRupiah(value) {
    const number = Number(value) || 0;

    return 'Rp ' + number.toLocaleString('id-ID');
  }

  /* =========================================================
     STATUS
     ========================================================= */

  function setStatus(text, type = 'info') {
    const el = $('creditStatus');

    if (!el) return;

    el.className = 'credit-status';

    if (text) {
      el.classList.add(type);
    }

    el.textContent = text || '';
  }

  /* =========================================================
     AUTH TOKEN
     ========================================================= */

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

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers
    });

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
     BALANCE PARSER
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
        const number = Number(value);

        if (Number.isFinite(number)) {
          return number;
        }
      }
    }

    return 0;
  }

  /* =========================================================
     EMAIL PARSER
     ========================================================= */

  function getEmail(data) {
    const user = getCurrentUser();
    const account = getAccount();

    return (
      data?.email ||
      data?.user?.email ||
      data?.account?.email ||
      user?.email ||
      account.email ||
      ''
    );
  }

  /* =========================================================
     UPDATE CREDIT UI
     ========================================================= */

  function updateCreditUI(balance) {
    const formatted =
      Number(balance || 0)
        .toLocaleString('id-ID');

    const balanceEl =
      $('creditBalance');

    if (balanceEl) {
      balanceEl.textContent = formatted;
    }

    /*
      Header:
      C 1000
         ↑
       saldo
    */

    const headerCredits =
      $('headerCredits');

    if (headerCredits) {
      headerCredits.textContent =
        formatted;
    }

    /*
      Legacy account credit element.
    */

    const accountCredits =
      $('credits');

    if (accountCredits) {
      accountCredits.textContent =
        formatted;
    }

    /*
      Keep global account state synchronized.
    */

    const account = getAccount();

    account.credits =
      Number(balance || 0);

    const genzState =
      getGENZState();

    genzState.account =
      account;
  }

  /* =========================================================
     UPDATE EMAIL UI
     ========================================================= */

  function updateEmailUI(email) {
    const emailEl =
      $('creditUserEmail');

    if (emailEl) {
      emailEl.textContent =
        email || '-';
    }
  }

  /* =========================================================
     LOAD BALANCE
     ========================================================= */

  async function loadBalance() {
    try {
      const data =
        await api('/api/account/credits');

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

      /*
        Jangan menghapus saldo header menjadi
        0 hanya karena request sementara gagal.
      */

      return null;
    }
  }

  /* =========================================================
     LOAD TRANSACTION HISTORY
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
            : Array.isArray(data?.data)
              ? data.data
              : [];

      if (!transactions.length) {
        container.innerHTML = `
          <div class="credit-history-empty">
            Belum ada riwayat transaksi.
          </div>
        `;

        return;
      }

      container.innerHTML =
        transactions
          .slice(0, 20)
          .map(renderTransaction)
          .join('');

    } catch (error) {
      console.warn(
        '[GEN-Z CREDIT] history unavailable',
        error
      );

      container.innerHTML = `
        <div class="credit-history-empty">
          Riwayat credit belum tersedia.
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
        transaction.amount ??
        transaction.credit ??
        transaction.credits ??
        0
      );

    const positive =
      amount >= 0;

    const note =
      transaction.note ||
      transaction.description ||
      transaction.type ||
      'Transaksi Credit';

    const dateValue =
      transaction.created_at ||
      transaction.createdAt ||
      transaction.date ||
      null;

    let date = '';

    if (dateValue) {
      try {
        date =
          new Date(
            dateValue
          ).toLocaleString('id-ID');
      } catch {
        date =
          String(dateValue);
      }
    }

    return `
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          padding:12px;
          border-radius:12px;
          background:rgba(255,255,255,.025);
          border:1px solid rgba(255,255,255,.05);
        "
      >

        <div style="min-width:0;">

          <div
            style="
              color:#fff;
              font-size:11px;
              font-weight:700;
            "
          >
            ${escapeHtml(note)}
          </div>

          <div
            style="
              color:rgba(255,255,255,.35);
              font-size:9px;
              margin-top:3px;
            "
          >
            ${escapeHtml(date)}
          </div>

        </div>

        <strong
          style="
            flex-shrink:0;
            color:${positive
              ? '#86efac'
              : '#fca5a5'};
            font-size:11px;
          "
        >
          ${positive ? '+' : ''}
          ${amount.toLocaleString('id-ID')} C
        </strong>

      </div>
    `;
  }

  /* =========================================================
     HTML ESCAPE
     ========================================================= */

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* =========================================================
     PACKAGE
     ========================================================= */

  function getPackage(credit) {
    return state.packages.find(
      item =>
        Number(item.credit) ===
        Number(credit)
    );
  }

  /* =========================================================
     SAVE SELECTED PACKAGE
     ========================================================= */

  function saveSelectedPackage(
    packageData
  ) {
    state.selectedPackage = {
      credit:
        Number(packageData.credit),

      price:
        Number(packageData.price)
    };

    const genzState =
      getGENZState();

    genzState.selectedCreditPackage = {
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
        'Paket credit tidak ditemukan.',
        'error'
      );

      return;
    }

    saveSelectedPackage(
      packageData
    );

    /*
      ADMIN / OWNER
      Langsung menuju Top Up Setting.
    */

    if (isAdmin()) {
      setStatus(
        `Paket C ${packageData.credit} dipilih.`,
        'success'
      );

      setTimeout(() => {
        showPage('topup-settings');
      }, 150);

      return;
    }

    /*
      USER BIASA
      Halaman pembayaran belum dibuat.
      Jangan mengurangi saldo.
      Jangan memanggil endpoint top-up.
    */

    setStatus(
      `Paket C ${packageData.credit} dipilih. Total ${formatRupiah(packageData.price)}. Pembayaran akan tersedia pada tahap berikutnya.`,
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

    container.dataset.genzBound = '1';

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
          !Number.isFinite(credit)
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
     BACK BUTTON
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

    button.dataset.genzBound = '1';

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
      Jika app.js sudah mempunyai
      GENZ.loadComponent(), gunakan itu.
    */

    if (
      typeof window.GENZ?.loadComponent ===
      'function'
    ) {
      const result =
        await window.GENZ.loadComponent(
          'credit',
          '#pageContainer'
        );

      state.htmlLoaded = result !== false;

      return state.htmlLoaded;
    }

    /*
      Fallback loader.
    */

    const container =
      document.querySelector(
        '#pageContainer'
      );

    if (!container) {
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
          'Gagal memuat komponen Credit.'
        );
      }

      container.innerHTML =
        await response.text();

      state.htmlLoaded = true;

      return true;

    } catch (error) {
      console.error(
        '[GEN-Z CREDIT] HTML error',
        error
      );

      state.htmlLoaded = false;

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
      setStatus('', 'info');

      /*
        Pastikan komponen HTML sudah ada.
      */

      if (
        !$('creditPage') &&
        !state.htmlLoaded
      ) {
        await loadHtml();
      }

      /*
        Ambil saldo terbaru dari server.
      */

      await loadBalance();

      /*
        Bind hanya sekali.
      */

      bindPackages();
      bindBack();

      /*
        Riwayat tidak boleh membuat
        halaman Credit gagal total.
      */

      await loadHistory();

      state.loaded = true;

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
      state.loading = false;
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

    /*
      Backward compatibility:
      generator / app lama mungkin memanggil
      handleTopup().
    */

    handleTopup:
      handlePackagePurchase,

    handlePackagePurchase,

    getPackage,

    isAdmin,

    state
  };

})();
