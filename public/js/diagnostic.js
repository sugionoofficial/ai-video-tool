/* GEN-Z.AI Diagnostic
 * Pemeriksaan frontend -> Worker -> provider configuration.
 * Tidak mengubah proses generate video.
 */

(function () {
  'use strict';

  async function request(path) {
    const response = await fetch(path, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
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
  }

  function print(title, value) {
    console.log(
      `%c[GEN-Z.AI] ${title}`,
      'font-weight:bold;',
      value
    );
  }

  async function runDiagnostic() {
    const result = {
      timestamp: new Date().toISOString(),
      frontend: {},
      config: {},
      providers: {},
      diagnostic: {}
    };

    /* Frontend */
    result.frontend.supabase =
      Boolean(window.supabase);

    result.frontend.supabaseJs =
      Boolean(
        window.supabaseJs &&
        typeof window.supabaseJs.createClient === 'function'
      );

    result.frontend.genZConfig =
      Boolean(window.GENZ_CONFIG);

    /* /api/config */
    try {
      const config =
        await request('/api/config');

      result.config = config;
    } catch (error) {
      result.config = {
        ok: false,
        error: error.message
      };
    }

    /* /api/providers */
    try {
      const providers =
        await request('/api/providers');

      result.providers = providers;
    } catch (error) {
      result.providers = {
        ok: false,
        error: error.message
      };
    }

    /* /api/diagnostic */
    try {
      const diagnostic =
        await request('/api/diagnostic');

      result.diagnostic = diagnostic;
    } catch (error) {
      result.diagnostic = {
        ok: false,
        error: error.message
      };
    }

    print(
      'Diagnostic result',
      result
    );

    return result;
  }

  window.GENZ_DIAGNOSTIC = {
    run: runDiagnostic
  };

  window.addEventListener(
    'load',
    function () {
      console.info(
        '[GEN-Z.AI] Diagnostic loaded.'
      );
    }
  );
})();
