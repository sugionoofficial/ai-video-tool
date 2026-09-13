import {
getAdapter,
getAdapterInfo,
normalizeProviderId
} from "./index.js";

import {
HttpError
} from "../lib/http.js";

/*

* ============================================================
* GEN-Z.AI
* PROVIDER UTILS
* ============================================================
* 
* Utilitas provider bersifat generic.
* 
* Jangan menaruh daftar provider/adapter di sini.
* Provider baru cukup dibuat sebagai adapter tersendiri
* dan didaftarkan melalui providers/index.js.
* ============================================================
  */

/**

* Normalisasi nama provider.
* 
* Provider ID sekarang bersifat fleksibel.
* Alias adapter ditangani oleh registry.
  */
  export function canonicalProvider(value) {
  const raw =
  String(
  value || ""
  )
  .trim()
  .toLowerCase();

if (!raw) {
return "";
}

return normalizeProviderId
? normalizeProviderId(raw)
: raw;
}

/**

* Validasi dan normalisasi ID provider.
* 
* Contoh:
* veo
* minimax
* luma
* kling
* runway
* seedance
* 
* Semua ID mengikuti format generic yang sama.
  */
  export function providerId(value) {
  const id =
  String(
  value || ""
  )
  .trim()
  .toLowerCase();

if (
!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(
id
)
) {
throw new HttpError(
"ID provider tidak valid. Gunakan 2-64 karakter berupa huruf kecil, angka, underscore, atau tanda minus.",
400
);
}

/*

* "gemini" tidak lagi diperlakukan sebagai
* provider khusus di utilitas ini.
* 
* Jika Gemini digunakan sebagai alias,
* registry adapter yang menentukan resolusinya.
  */

return id;
}

/**

* Ambil metadata adapter.
  */
  export function adapterInfo(adapter) {
  return getAdapterInfo(
  adapter
  );
  }

/**

* Cari implementasi adapter.
* 
* Tidak ada whitelist di sini.
* Adapter yang belum terdaftar akan menghasilkan null.
  */
  export function inferAdapter(value) {
  if (!value) {
  return null;
  }

const normalized =
canonicalProvider(
value
);

if (!normalized) {
return null;
}

const adapter =
getAdapter(
normalized
);

if (adapter) {
return adapter;
}

return null;
}
