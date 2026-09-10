/* GEN-Z.AI SYSTEM DIAGNOSTIC
 * Diagnostic frontend -> Worker -> provider.
 * Output langsung di halaman Account.
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

      color =
        '#35d07f';

    }


    if (status === 'ERROR') {

      symbol = '✕';

      color =
        '#ff5c5c';

    }


    const item =
      document.createElement(
        'div'
      );


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


    if (!button || !results) {

      return;

    }


    button.disabled = true;

    button.textContent =
      'MEMERIKSA...';


    results.innerHTML =
      '';


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


    /* =====================================================
       1. SUPABASE LIBRARY
    ===================================================== */

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


    /* =====================================================
       2. SUPABASE BRIDGE
    ===================================================== */

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


    /* =====================================================
       3. API CONFIG
    ===================================================== */

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


    /* =====================================================
       4. PROVIDERS
    ===================================================== */

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
        list.length
          ? 'OK'
          : 'WARNING',
        list.length
          ? `${list.length} provider ditemukan.`
          : 'Backend tidak mengembalikan provider.'
      );


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


    /* =====================================================
       5. BACKEND DIAGNOSTIC
    ===================================================== */

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


    /* =====================================================
       6. DETAIL
    ===================================================== */

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


    /* =====================================================
       SELESAI
    ===================================================== */

    button.disabled =
      false;

    button.textContent =
      'PERIKSA ULANG';


    return report;
  }


  window.GENZ_DIAGNOSTIC = {

    run:
      runDiagnostic

  };


})();
