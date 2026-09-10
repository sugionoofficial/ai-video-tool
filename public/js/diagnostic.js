/* GEN-Z.AI Diagnostic
 * Pemeriksaan frontend -> Worker -> provider configuration.
 * Hasil tampil langsung di halaman.
 * Tidak menggunakan Console sebagai output utama.
 * Tidak melakukan generate video.
 */

(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>'"]/g,
      function (char) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[char];
      }
    );
  }


  function createPanel() {

    if (
      document.getElementById(
        'genzDiagnosticPanel'
      )
    ) {
      return;
    }

    const panel =
      document.createElement('section');

    panel.id =
      'genzDiagnosticPanel';

    panel.className =
      'card hidden';

    panel.innerHTML = `
      <div class="page-head">

        <h2>
          System Diagnostic
        </h2>

        <button
          id="genzDiagnosticBack"
          type="button"
        >
          ← Kembali
        </button>

      </div>

      <p>
        Pemeriksaan sistem GEN-Z.AI
        tanpa menggunakan Console.
      </p>

      <button
        id="genzDiagnosticRun"
        class="primary"
        type="button"
      >
        PERIKSA SISTEM
      </button>

      <div
        id="genzDiagnosticResults"
        style="margin-top:20px;"
      ></div>

      <pre
        id="genzDiagnosticDetails"
        style="
          display:none;
          margin-top:20px;
          padding:14px;
          background:#0b0b0f;
          border-radius:10px;
          color:#aaa;
          font-size:12px;
          white-space:pre-wrap;
          word-break:break-word;
          overflow:auto;
        "
      ></pre>
    `;

    const accountPage =
      document.getElementById(
        'accountPage'
      );

    if (accountPage) {
      accountPage.parentNode.insertBefore(
        panel,
        accountPage.nextSibling
      );
    } else {
      document.body.appendChild(panel);
    }


    document
      .getElementById(
        'genzDiagnosticRun'
      )
      ?.addEventListener(
        'click',
        runDiagnostic
      );


    document
      .getElementById(
        'genzDiagnosticBack'
      )
      ?.addEventListener(
        'click',
        function () {

          panel.classList.add(
            'hidden'
          );

          document
            .getElementById(
              'accountPage'
            )
            ?.classList.remove(
              'hidden'
            );
        }
      );
  }


  function showPanel() {

    createPanel();

    document
      .getElementById(
        'accountPage'
      )
      ?.classList.add(
        'hidden'
      );

    document
      .getElementById(
        'studio'
      )
      ?.classList.add(
        'hidden'
      );

    const panel =
      document.getElementById(
        'genzDiagnosticPanel'
      );

    panel?.classList.remove(
      'hidden'
    );
  }


  async function request(path) {

    try {

      const response =
        await fetch(
          path,
          {
            method: 'GET',
            cache: 'no-store',
            headers: {
              Accept:
                'application/json'
            }
          }
        );

      const text =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(text);
      } catch {
        data = {
          raw: text
        };
      }

      return {
        ok: response.ok,
        status: response.status,
        data
      };

    } catch (error) {

      return {
        ok: false,
        status: 0,
        error:
          error?.message ||
          'Request gagal.'
      };
    }
  }


  function addResult(
    name,
    status,
    message
  ) {

    const box =
      document.getElementById(
        'genzDiagnosticResults'
      );

    if (!box) return;

    let symbol = '⚠';

    let color =
      '#ffc857';

    if (status === 'OK') {
      symbol = '✓';
      color = '#35d07f';
    }

    if (status === 'ERROR') {
      symbol = '✕';
      color = '#ff5c5c';
    }

    const item =
      document.createElement('div');

    item.style.cssText = `
      margin-bottom:10px;
      padding:14px;
      background:#0f0f14;
      border:1px solid #292933;
      border-radius:10px;
    `;

    item.innerHTML = `
      <div style="
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:center;
      ">

        <strong>
          ${escapeHtml(name)}
        </strong>

        <strong style="
          color:${color};
          white-space:nowrap;
        ">
          ${symbol}
          ${escapeHtml(status)}
        </strong>

      </div>

      <div style="
        margin-top:8px;
        color:#aaa;
        font-size:13px;
        line-height:1.5;
      ">
        ${escapeHtml(message)}
      </div>
    `;

    box.appendChild(item);
  }


  function endpointMessage(
    result,
    endpoint
  ) {

    if (result?.error) {
      return result.error;
    }

    if (result?.status) {
      return (
        `HTTP ${result.status} dari ${endpoint}.`
      );
    }

    return (
      `Tidak dapat mengakses ${endpoint}.`
    );
  }


  function getProviders(data) {

    if (
      Array.isArray(
        data?.providers
      )
    ) {
      return data.providers;
    }

    if (
      Array.isArray(data)
    ) {
      return data;
    }

    return [];
  }


  async function runDiagnostic() {

    const button =
      document.getElementById(
        'genzDiagnosticRun'
      );

    const results =
      document.getElementById(
        'genzDiagnosticResults'
      );

    const details =
      document.getElementById(
        'genzDiagnosticDetails'
      );

    if (button) {
      button.disabled = true;
      button.textContent =
        'MEMERIKSA...';
    }

    if (results) {
      results.innerHTML = '';
    }

    if (details) {
      details.style.display =
        'none';
      details.textContent = '';
    }


    const report = {
      timestamp:
        new Date().toISOString(),

      browser: {
        online:
          navigator.onLine,

        userAgent:
          navigator.userAgent
      },

      frontend: {},

      endpoints: {},

      providers: []
    };


    /*
     * FRONTEND
     */

    const supabaseOK =
      Boolean(
        window.supabase &&
        typeof window.supabase
          .createClient ===
          'function'
      );

    report.frontend.supabase =
      supabaseOK;

    addResult(
      'Supabase Library',
      supabaseOK
        ? 'OK'
        : 'ERROR',
      supabaseOK
        ? 'Library Supabase berhasil dimuat.'
        : 'Library Supabase tidak berhasil dimuat.'
    );


    const bridgeOK =
      Boolean(
        window.supabaseJs &&
        typeof window.supabaseJs
          .createClient ===
          'function'
      );

    report.frontend.supabaseJs =
      bridgeOK;

    addResult(
      'Supabase Bridge',
      bridgeOK
        ? 'OK'
        : 'ERROR',
      bridgeOK
        ? 'window.supabaseJs tersedia.'
        : 'window.supabaseJs tidak tersedia.'
    );


    /*
     * CONFIG
     */

    report.endpoints.config =
      await request(
        '/api/config'
      );

    if (
      report.endpoints.config.ok
    ) {

      const data =
        report.endpoints
          .config.data;

      const valid =
        Boolean(
          data?.supabaseUrl &&
          data?.supabasePublishableKey
        );

      addResult(
        'Backend Config',
        valid
          ? 'OK'
          : 'ERROR',
        valid
          ? 'Konfigurasi Supabase tersedia.'
          : 'Endpoint aktif tetapi konfigurasi Supabase belum lengkap.'
      );

    } else {

      addResult(
        'Backend Config',
        'ERROR',
        endpointMessage(
          report.endpoints.config,
          '/api/config'
        )
      );
    }


    /*
     * PROVIDERS
     */

    report.endpoints.providers =
      await request(
        '/api/providers'
      );

    if (
      report.endpoints.providers.ok
    ) {

      const list =
        getProviders(
          report.endpoints
            .providers.data
        );

      report.providers =
        list;

      addResult(
        'Video Providers',
        'OK',
        `${list.length} provider ditemukan.`
      );


      if (!list.length) {

        addResult(
          'Provider Configuration',
          'WARNING',
          'Backend tidak mengembalikan provider.'
        );

      }


      list.forEach(
        function (provider) {

          const name =
            provider.name ||
            provider.id ||
            provider.provider ||
            'Provider';

          const enabled =
            provider.enabled ===
            true;

          const configured =
            provider.configured ===
            true;

          if (
            enabled &&
            configured
          ) {

            addResult(
              `Provider: ${name}`,
              'OK',
              'Aktif dan konfigurasi API tersedia.'
            );

          } else if (
            enabled &&
            !configured
          ) {

            addResult(
              `Provider: ${name}`,
              'WARNING',
              'Provider aktif tetapi konfigurasi API belum tersedia.'
            );

          } else {

            addResult(
              `Provider: ${name}`,
              'WARNING',
              'Provider tidak aktif.'
            );
          }
        }
      );

    } else {

      addResult(
        'Video Providers',
        'ERROR',
        endpointMessage(
          report.endpoints.providers,
          '/api/providers'
        )
      );
    }


    /*
     * BACKEND DIAGNOSTIC
     */

    report.endpoints.diagnostic =
      await request(
        '/api/diagnostic'
      );

    if (
      report.endpoints
        .diagnostic.ok
    ) {

      addResult(
        'Backend Diagnostic',
        'OK',
        'Worker merespons dengan normal.'
      );

    } else {

      addResult(
        'Backend Diagnostic',
        'ERROR',
        endpointMessage(
          report.endpoints.diagnostic,
          '/api/diagnostic'
        )
      );
    }


    /*
     * DETAIL
     */

    if (details) {

      details.textContent =
        JSON.stringify(
          report,
          null,
          2
        );

      details.style.display =
        'block';
    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        'PERIKSA ULANG';
    }


    return report;
  }


  window.GENZ_DIAGNOSTIC = {

    run:
      runDiagnostic,

    createPanel:
      createPanel,

    show:
      showPanel
  };

})();
