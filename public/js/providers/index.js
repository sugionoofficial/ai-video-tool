/*

* GEN-Z.AI
* Provider Adapter Registry
* 
* Arsitektur:
* public/js/providers/
* index.js
* veo.js
* minimax.js
* luma.js
* provider-baru.js
* 
* Setiap provider memiliki implementasi sendiri.
* Registry ini hanya bertugas mendaftarkan dan mencari adapter.
  */

import * as veo from "./veo.js";
import * as minimax from "./minimax.js";
import * as luma from "./luma.js";

/**

* Adapter registry.
* 
* Gunakan nama adapter sebagai key.
* Nama akan dinormalisasi sehingga:
* 
* "Veo"
* "VEO"
* " veo "
* 
* semuanya mengarah ke adapter "veo".
  */
  const PROVIDERS = Object.create(null);

/**

* Normalisasi nama adapter.
  */
  function normalizeProviderId(value) {
  if (value === null || value === undefined) {
  return "";
  }

return String(value)
.trim()
.toLowerCase()
.replace(/[_\s]+/g, "-");
}

/**

* Daftarkan adapter baru.
* 
* Contoh:
* 
* registerAdapter("kling", kling);
* registerAdapter("runway", runway);
* registerAdapter("seedance", seedance);
  */
  function registerAdapter(id, adapter, aliases) {
  const normalizedId = normalizeProviderId(id);

if (!normalizedId) {
throw new Error(
"Adapter ID tidak boleh kosong."
);
}

if (!adapter || typeof adapter !== "object") {
throw new Error(
'Implementasi adapter "' +
normalizedId +
'" tidak valid.'
);
}

PROVIDERS[normalizedId] = adapter;

if (Array.isArray(aliases)) {
aliases.forEach(function (alias) {
const normalizedAlias =
normalizeProviderId(alias);

  if (normalizedAlias) {
    PROVIDERS[normalizedAlias] = adapter;
  }
});

}

return adapter;
}

/**

* Registrasi adapter bawaan GEN-Z.AI.
  */
  registerAdapter(
  "veo",
  veo,
  [
  "gemini",
  "google-veo",
  "google veo",
  "gemini-veo",
  "gemini/veo"
  ]
  );

registerAdapter(
"minimax",
minimax,
[
"mini max",
"mini-max",
"minimax-ai",
"minimax ai"
]
);

registerAdapter(
"luma",
luma,
[
"luma-ai",
"luma ai",
"dream-machine"
]
);

/**

* Mengambil adapter berdasarkan ID.
* 
* Return:
* adapter object
* atau
* null jika belum tersedia.
  */
  function getAdapter(providerId) {
  const id = normalizeProviderId(providerId);

if (!id) {
return null;
}

return PROVIDERS[id] || null;
}

/**

* Mendapatkan informasi adapter.
  */
  function getAdapterInfo(providerId) {
  const id = normalizeProviderId(providerId);
  const adapter = getAdapter(id);

if (!adapter) {
return {
id: id,
supported: false,
adapter: null
};
}

return {
id: id,
supported: true,
adapter: adapter
};
}

/**

* Memeriksa apakah adapter tersedia.
  */
  function adapterSupported(providerId) {
  const id = normalizeProviderId(providerId);

return !!(
id &&
PROVIDERS[id]
);
}

/**

* Mendapatkan seluruh adapter yang sudah terdaftar.
* 
* Hanya ID utama yang dikembalikan.
* Alias tidak ditampilkan sebagai provider terpisah.
  */
  function listAdapters() {
  return [
  "veo",
  "minimax",
  "luma"
  ];
  }

/**

* Resolve adapter.
* 
* Fungsi ini digunakan oleh engine video
* ketika mendapatkan nama adapter dari database.
  */
  function resolveAdapter(providerId) {
  const id = normalizeProviderId(providerId);
  const adapter = getAdapter(id);

if (!adapter) {
throw new Error(
'Adapter "' +
String(providerId || "") +
'" belum tersedia.'
);
}

return adapter;
}

/**

* Mendapatkan seluruh registry.
* 
* Digunakan untuk debugging atau pemeriksaan internal.
  */
  function getRegistry() {
  return Object.freeze({
  ...PROVIDERS
  });
  }

/**

* API publik registry.
  */
  export {
  PROVIDERS,
  registerAdapter,
  getAdapter,
  getAdapterInfo,
  listAdapters,
  resolveAdapter,
  adapterSupported,
  normalizeProviderId,
  getRegistry
  };

/**

* Compatibility bridge.
* 
* Beberapa bagian GEN-Z.AI mungkin mengakses
* registry melalui window.GENZ_PROVIDERS.
* 
* Tidak mengganggu module import.
  */
  if (typeof window !== "undefined") {
  window.GENZ_PROVIDERS = {
  getAdapter,
  getAdapterInfo,
  listAdapters,
  resolveAdapter,
  adapterSupported,
  normalizeProviderId,
  registerAdapter,
  getRegistry
  };
  }
