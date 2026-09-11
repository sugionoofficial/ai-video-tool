/* =========================================================
   GEN-Z.AI - CREDIT PAGE
   ========================================================= */

(function () {
  'use strict';

  const state = {
    loaded: false,
    loading: false,
    packages: [
      { credit: 10, price: 10000 },
      { credit: 50, price: 50000 },
      { credit: 100, price: 100000 },
      { credit: 200, price: 200000 },
      { credit: 300, price: 300000 },
      { credit: 400, price: 400000 },
      { credit: 500, price: 500000 }
    ]
  };

  function $(id) {
    return document.getElementById(id);
  }

  function isAdmin() {
    const account = window.GENZ?.state?.account || {};

    return (
      account.isAdmin === true &&
      account.roleValidated === true
    );
  }

  function isLoggedIn() {
    const state = window.GENZ?.state || {};

    return Boolean(
      state.user ||
      state.account?.user ||
      state.loggedIn === true
    );
  }

  function formatRupiah(value) {
    const number = Number(value) || 0;

    return 'Rp ' + number.toLocaleString('id-ID');
  }

  function setStatus(text, type = 'info') {
    const el = $('creditStatus');

    if (!el) return;

    el.className = 'credit-status';

    if (text) {
      el.classList.add(type);
    }

    el.textContent = text || '';
  }

  function getToken() {
    try {
      if (
        window.GENZ &&
        window.GENZ.auth &&
        typeof window.GENZ.auth.token === 'function'
      ) {
        return window.GENZ.auth.token();
      }
    } catch (error) {
      console.warn('[GEN-Z CREDIT] token error', error);
    }

    return null;
  }

  async function api(url, options = {}) {
    const token = getToken();

    const headers = {
      Accept: 'application/json',
      ...(options.headers || {})
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = 'Bearer ' + token;
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
      const message =
        data?.error ||
        data?.message ||
        'Permintaan gagal.';

      throw new Error(message);
    }

    return data;
  }

  function getBalance(data) {
    if (!data) return 0;

    const candidates = [
      data.credits,
      data.credit,
      data.balance,
      data.current_credits,
      data.currentCredit,
      data.user?.credits,
      data.account?.credits
    ];

    for (const value of candidates) {
      if (value !== undefined && value !== null) {
        const number = Number(value);

        if (Number.isFinite(number)) {
          return number;
        }
      }
    }

    return 0;
  }

  async function loadBalance() {
    const balanceEl = $('creditBalance');
    const emailEl = $('creditUserEmail');

    try {
      const data = await api('/api/account/credits');

      const balance = getBalance(data);

      if (balanceEl) {
        balanceEl.textContent = balance.toLocaleString('id-ID');
      }

      const user =
        window.GENZ?.state?.user ||
        window.GENZ?.state?.account?.user ||
        null;

      const email =
        data?.email ||
        data?.user?.email ||
        user?.email ||
        window.GENZ?.state?.account?.email ||
        '-';

      if (emailEl) {
        emailEl.textContent = email;
      }

      updateHeaderCredit(balance);

      return balance;

    } catch (error) {
      console.error('[GEN-Z CREDIT] balance error', error);

      if (balanceEl) {
        balanceEl.textContent = '0';
      }

      return 0;
    }
  }

  function updateHeaderCredit(balance) {
    const headerCredits = $('headerCredits');

    if (headerCredits) {
      headerCredits.textContent =
        Number(balance || 0).toLocaleString('id-ID');
    }

    const accountCredits = $('credits');

    if (accountCredits) {
      accountCredits.textContent =
        Number(balance || 0).toLocaleString('id-ID');
    }
  }

  async function loadHistory() {
    const container = $('creditHistory');

    if (!container) return;

    try {
      const data = await api('/api/account/transactions');

      const transactions =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.transactions)
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

      container.innerHTML = transactions
        .slice(0, 20)
        .map(transaction => {
          const amount =
            Number(
              transaction.amount ??
              transaction.credit ??
              transaction.credits ??
              0
            );

          const positive = amount >= 0;

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
              date = new Date(dateValue).toLocaleString('id-ID');
            } catch {
              date = String(dateValue);
            }
          }

          return `
            <div style="
              display:flex;
              justify-content:space-between;
              gap:12px;
              padding:12px;
              border-radius:12px;
              background:rgba(255,255,255,.025);
              border:1px solid rgba(255,255,255,.05);
            ">
              <div style="min-width:0;">
                <div style="
                  color:#fff;
                  font-size:11px;
                  font-weight:700;
                ">
                  ${escapeHtml(note)}
                </div>

                <div style="
                  color:rgba(255,255,255,.35);
                  font-size:9px;
                  margin-top:3px;
                ">
                  ${escapeHtml(date)}
                </div>
              </div>

              <strong style="
                flex-shrink:0;
                color:${positive ? '#86efac' : '#fca5a5'};
                font-size:11px;
              ">
                ${positive ? '+' : ''}${amount.toLocaleString('id-ID')} C
              </strong>
            </div>
          `;
        })
        .join('');

    } catch (error) {
      console.warn('[GEN-Z CREDIT] history unavailable', error);

      container.innerHTML = `
        <div class="credit-history-empty">
          Riwayat credit belum tersedia.
        </div>
      `;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getPackage(credit) {
    return state.packages.find(
      item => Number(item.credit) === Number(credit)
    );
  }

  function handlePackagePurchase(credit) {
    const packageData = getPackage(credit);

    if (!packageData) {
      setStatus('Paket credit tidak ditemukan.', 'error');
      return;
    }

    /*
      ADMIN / OWNER
      Langsung menuju Top Up Setting.
    */
    if (isAdmin()) {
      if (
        typeof window.GENZ?.showPage === 'function'
      ) {
        window.GENZ.showPage('topup-settings');
      } else {
        window.location.hash = '#topup-settings';
      }

      return;
    }

    /*
      USER BIASA
      Untuk sementara halaman pembayaran belum dibuat.
      Kita hanya menampilkan informasi paket yang dipilih.
    */
    setStatus(
      `Paket C ${packageData.credit} dipilih. Total ${formatRupiah(packageData.price)}. Halaman pembayaran akan digunakan pada tahap berikutnya.`,
      'info'
    );

    /*
      Data pilihan disimpan hanya selama sesi halaman.
      Tidak menyimpan API key atau data sensitif.
    */
    try {
      window.GENZ = window.GENZ || {};
      window.GENZ.state = window.GENZ.state || {};

      window.GENZ.state.selectedCreditPackage = {
        credit: packageData.credit,
        price: packageData.price
      };
    } catch (error) {
      console.warn(
        '[GEN-Z CREDIT] package state error',
        error
      );
    }
  }

  function bindPackages() {
    const container = $('creditPackages');

    if (!container) return;

    if (container.dataset.genzBound === '1') {
      return;
    }

    container.dataset.genzBound = '1';

    container.addEventListener('click', event => {
      const button =
        event.target.closest('.credit-package');

      if (!button) return;

      const credit =
        Number(button.dataset.credit);

      handlePackagePurchase(credit);
    });
  }

  function bindBack() {
    const button = $('creditBack');

    if (!button) return;

    if (button.dataset.genzBound === '1') {
      return;
    }

    button.dataset.genzBound = '1';

    button.addEventListener('click', () => {
      if (
        typeof window.GENZ?.showPage === 'function'
      ) {
        window.GENZ.showPage('studio');
      } else {
        window.location.hash = '#studio';
      }
    });
  }

  async function load() {
    if (state.loading) return;

    if (!isLoggedIn()) {
      if (
        typeof window.GENZ?.showPage === 'function'
      ) {
        window.GENZ.showPage('studio');
      }

      return;
    }

    state.loading = true;

    try {
      setStatus('', 'info');

      await loadBalance();

      bindPackages();
      bindBack();

      await loadHistory();

      state.loaded = true;

    } catch (error) {
      console.error('[GEN-Z CREDIT] load error', error);

      setStatus(
        error.message ||
        'Halaman Credit gagal dimuat.',
        'error'
      );

    } finally {
      state.loading = false;
    }
  }

  async function refresh() {
    await loadBalance();
    await loadHistory();
  }

  async function loadHtml() {
    if (
      typeof window.GENZ?.loadComponent === 'function'
    ) {
      return window.GENZ.loadComponent(
        'credit',
        '#pageContainer'
      );
    }

    const container =
      document.querySelector('#pageContainer');

    if (!container) return false;

    try {
      const response = await fetch(
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

      return true;

    } catch (error) {
      console.error(
        '[GEN-Z CREDIT] html error',
        error
      );

      return false;
    }
  }

  async function init() {
    await loadHtml();
    await load();
  }

  window.GENZ = window.GENZ || {};

  window.GENZ.credit = {
    load,
    init,
    refresh,
    loadBalance,
    loadHistory,
    handleTopup: handlePackagePurchase,
    state
  };

})();
