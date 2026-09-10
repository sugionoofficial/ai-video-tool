/* GEN-Z.AI runtime config bridge.
 * Supabase CDN exposes the client library as window.supabase.
 * app.js expects window.supabaseJs, so keep an explicit compatibility alias.
 */

window.GENZ_CONFIG = null;

if (
  window.supabase &&
  typeof window.supabase.createClient === 'function'
) {
  window.supabaseJs = window.supabase;
} else {
  window.supabaseJs = {
    createClient() {
      throw new Error(
        'Supabase library gagal dimuat. Periksa koneksi atau CDN Supabase.'
      );
    }
  };
}
