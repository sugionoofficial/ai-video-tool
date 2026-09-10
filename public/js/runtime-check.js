/* GEN-Z.AI Runtime Check
 * Memastikan dependency utama tersedia sebelum aplikasi digunakan.
 * Tidak mengubah alur generator video.
 */

(function () {
  'use strict';

  function showError(message) {
    const authMsg = document.getElementById('authMsg');
    const status = document.getElementById('status');

    if (authMsg) {
      authMsg.textContent = message;
    }

    if (status) {
      status.textContent = message;
    }

    console.error('[GEN-Z.AI]', message);
  }

  function checkRuntime() {
    if (!window.supabase) {
      showError(
        'Supabase belum termuat. Periksa koneksi internet dan CDN Supabase.'
      );
      return false;
    }

    if (
      typeof window.supabase.createClient !== 'function'
    ) {
      showError(
        'Supabase library tidak valid atau gagal dimuat.'
      );
      return false;
    }

    if (
      !window.supabaseJs ||
      typeof window.supabaseJs.createClient !== 'function'
    ) {
      window.supabaseJs = window.supabase;
    }

    return true;
  }

  window.GENZ_RUNTIME = {
    check: checkRuntime
  };

  window.addEventListener('load', function () {
    setTimeout(checkRuntime, 100);
  });
})();
