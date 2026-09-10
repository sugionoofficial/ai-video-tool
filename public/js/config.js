/* GEN-Z.AI runtime config bridge */

window.GENZ_CONFIG = null;

window.supabaseJs = window.supabase;

if (
  !window.supabaseJs ||
  typeof window.supabaseJs.createClient !== 'function'
) {
  console.error(
    'GEN-Z.AI: Supabase library belum berhasil dimuat.'
  );
}
