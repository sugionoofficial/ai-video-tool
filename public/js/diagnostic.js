/* GEN-Z.AI Diagnostic
 * Pemeriksaan frontend -> Worker -> provider configuration.
 * Hasil ditampilkan langsung di halaman.
 * Tidak mengubah proses generate video.
 */

(function () {
  'use strict';

  function getElement(id) {
    return document.getElementById(id);
  }

  function createPanel() {
    if (getElement('genzDiagnosticPanel')) {
      return getElement('genzDiagnosticPanel');
    }

    const panel = document.createElement('section');

    panel.id = 'genzDiagnosticPanel';

    panel.style.cssText = `
      margin:20px auto;
      padding:18px;
      max-width:900px;
      background:#15151b;
      border:1px solid #292933;
      border-radius:14px;
      color:#f5f5f5;
      font-family:Arial,sans-serif;
      box-sizing:border-box;
    `;

    panel.innerHTML = `
      <div style="
        font-size:20px;
        font-weight:bold;
        margin-bottom:6px;
      ">
        GEN-Z.AI System Diagnostic
      </div>

      <div style="
        color:#999;
        font-size:13px;
        margin-bottom:16px;
      ">
        Pemeriksaan sistem tanpa menggunakan Console.
      </div>

      <button
        id="genzDiagnosticRun"
        type="button"
        style="
          width:100%;
          padding:12px;
          border:0;
          border-radius:10px;
          background:#fff;
          color:#000;
          font-weight:bold;
          cursor:pointer;
        "
      >
        PERIKSA SISTEM
      </button>

      <div
        id="genzDiagnosticResults"
        style="margin-top:16px;"
      ></div>

      <pre
        id="genzDiagnosticDetails"
        style="
          display:none;
          margin-top:16px;
          padding:12px;
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

    const target =
      getElement('studio') ||
      getElement('auth') ||
      document.body;

    target.appendChild(panel);

    getElement('genzDiagnosticRun')
      .addEventListener(
        'click',
        runDiagnostic
      );

    return panel;
  }


  function addResult(
    name,
    status,
    message
  ) {

    const results =
      getElement(
        'genzDiagnosticResults'
      );

    if (!results) {
      return;
    }

    const row =
      document.createElement('div');

    let statusColor =
      '#ffc857';

    if (status === 'OK') {
      statusColor =
        '#35d07f';
    }

    if (status === 'ERROR') {
      statusColor =
        '#ff5c5c';
    }

    row.style.cssText = `
      margin-bottom:10px;
      padding:12px;
      background:#0f0f14;
      border:1px solid #292933;
      border-radius:10px;
    `;

    row.innerHTML = `
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
          color:${statusColor};
        ">
          ${escapeHtml(status)}
        </strong>
      </div>

      <div style="
        margin-top:7px;
        color:#aaa;
        font-size:13px;
        line-height:1.5;
      ">
        ${escapeHtml(message)}
      </div>
    `;

    results.appendChild(row);
  }


  function escapeHtml(value) {

    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll(
        "'",
        '&#039;'
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
              'Accept':
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
          error.message ||
          'Request gagal.'
      };
    }
  }


  function providerList(data) {

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
      getElement(
        'genzDiagnosticRun'
      );

    const results =
      getElement(
        'genzDiagnosticResults'
      );

    const details =
      getElement(
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

      details.textContent =
        '';
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
     * 1. Supabase Library
     */

    if (
      window.supabase &&
      typeof window.supabase
        .createClient ===
        'function'
    ) {

      report.frontend.supabase =
        true;

      addResult(
        'Supabase Library',
        'OK',
        'Library Supabase berhasil dimuat.'
      );

    } else {

      report.frontend.supabase =
        false;

      addResult(
        'Supabase Library',
        'ERROR',
        'Library Supabase tidak berhasil dimuat.'
      );
    }


    /*
     * 2. Supabase compatibility bridge
     */

    if (
      window.supabaseJs &&
      typeof window.supabaseJs
        .createClient ===
        'function'
    ) {

      report.frontend.supabaseJs =
        true;

      addResult(
        'Supabase Bridge',
        'OK',
        'window.supabaseJs tersedia.'
      );

    } else if (
      window.supabase &&
      typeof window.supabase
        .createClient ===
        'function'
    ) {

      report.frontend.supabaseJs =
        false;

      addResult(
        'Supabase Bridge',
        'WARNING',
        'window.supabase tersedia tetapi window.supabaseJs belum tersedia.'
      );

    } else {

      report.frontend.supabaseJs =
        false;

      addResult(
        'Supabase Bridge',
        'ERROR',
        'Supabase client tidak tersedia.'
      );
    }


    /*
     * 3. /api/config
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

      if (valid) {

        addResult(
          'Backend Config',
          'OK',
          'Supabase URL dan Publishable Key tersedia.'
        );

      } else {

        addResult(
          'Backend Config',
          'ERROR',
          'Endpoint aktif tetapi konfigurasi Supabase belum lengkap.'
        );
      }

    } else {

      addResult(
        'Backend Config',
        'ERROR',
        getRequestError(
          report.endpoints.config,
          '/api/config'
        )
      );
    }


    /*
     * 4. /api/providers
     */

    report.endpoints.providers =
      await request(
        '/api/providers'
      );

    if (
      report.endpoints.providers.ok
    ) {

      const list =
        providerList(
          report.endpoints
            .providers.data
        );

      report.providers =
        list;

      addResult(
        'Video Providers',
        'OK',
        `Endpoint provider aktif. ${list.length} provider ditemukan.`
      );

      if (list.length === 0) {

        addResult(
          'Provider Configuration',
          'WARNING',
          'Tidak ada provider yang dikembalikan oleh backend.'
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
              'Aktif dan konfigurasi API terdeteksi.'
            );

          } else if (
            enabled &&
            !configured
          ) {

            addResult(
              `Provider: ${name}`,
              'WARNING',
              'Provider aktif tetapi konfigurasi API belum terdeteksi.'
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
        getRequestError(
          report.endpoints.providers,
          '/api/providers'
        )
      );
    }


    /*
     * 5. /api/diagnostic
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
        'Worker diagnostic merespons dengan normal.'
      );

    } else {

      addResult(
        'Backend Diagnostic',
        'ERROR',
        getRequestError(
          report.endpoints
            .diagnostic,
          '/api/diagnostic'
        )
      );
    }


    /*
     * Detail
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


  function getRequestError(
    result,
    endpoint
  ) {

    if (
      result?.error
    ) {
      return result.error;
    }

    if (
      result?.status
    ) {
      return `HTTP ${result.status} dari ${endpoint}.`;
    }

    return `Tidak dapat mengakses ${endpoint}.`;
  }


  /*
   * Public API
   */

  window.GENZ_DIAGNOSTIC = {
    run:
      runDiagnostic
  };


  /*
   * Jangan otomatis menjalankan
   * diagnostic ketika halaman dibuka.
   *
   * Panel hanya dibuat jika
   * elemen diagnostic memang diminta.
   */

  window.GENZ_DIAGNOSTIC.createPanel =
    createPanel;

})();
