/* ============================================================
GEN-Z.AI
PROVIDER ADAPTER REGISTRY
============================================================

Setiap provider memiliki file adapter sendiri.

Contoh:
public/js/providers/veo.js
public/js/providers/minimax.js
public/js/providers/luma.js
public/js/providers/kling.js
public/js/providers/runway.js
public/js/providers/seedance.js

Registry ini bertugas:
1. Mendaftarkan adapter
2. Mencari adapter
3. Membaca metadata adapter
4. Membaca capabilities adapter
5. Menyediakan daftar adapter utama

Provider baru TIDAK perlu mengubah UI Admin.

API key TIDAK disimpan di sini.
API key berasal dari database dan diproses server-side.
============================================================ */


/* ============================================================
REGISTRY
============================================================ */

const PROVIDERS = Object.create(null);

/*
Menyimpan hanya adapter utama.

Alias tidak masuk ke sini sehingga
listAdapters() tidak menampilkan provider
yang sama berkali-kali.
*/
const PRIMARY_ADAPTERS = Object.create(null);


/* ============================================================
NORMALIZE ADAPTER ID
============================================================ */

function normalizeProviderId(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");
}


/* ============================================================
REGISTER ADAPTER
============================================================ */

function registerAdapter(
  id,
  adapter,
  aliases = []
) {
  const normalizedId =
    normalizeProviderId(id);

  if (!normalizedId) {
    throw new Error(
      "Adapter ID tidak boleh kosong."
    );
  }

  if (
    !adapter ||
    typeof adapter !== "object"
  ) {
    throw new Error(
      `Implementasi adapter "${normalizedId}" tidak valid.`
    );
  }

  /*
  Register sebagai adapter utama.
  */
  PROVIDERS[normalizedId] = adapter;
  PRIMARY_ADAPTERS[normalizedId] = adapter;

  /*
  Register alias.
  */
  if (Array.isArray(aliases)) {
    aliases.forEach(
      (alias) => {
        const normalizedAlias =
          normalizeProviderId(alias);

        if (
          normalizedAlias &&
          normalizedAlias !== normalizedId
        ) {
          PROVIDERS[normalizedAlias] =
            adapter;
        }
      }
    );
  }

  return adapter;
}


/* ============================================================
BUILT-IN ADAPTERS
============================================================ */

import * as veo from "./veo.js";
import * as minimax from "./minimax.js";
import * as luma from "./luma.js";


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


/* ============================================================
GET ADAPTER
============================================================ */

function getAdapter(providerId) {
  const id =
    normalizeProviderId(providerId);

  if (!id) {
    return null;
  }

  return PROVIDERS[id] || null;
}


/* ============================================================
READ ADAPTER METADATA
============================================================ */

function readAdapterMetadata(
  id,
  adapter
) {
  let metadata = {};

  /*
  Prioritaskan info() jika adapter menyediakan.
  */
  try {
    if (
      typeof adapter?.info ===
      "function"
    ) {
      metadata =
        adapter.info() || {};
    }
  } catch {
    metadata = {};
  }

  /*
  Fallback ke property adapter.
  */
  const capabilities =
    metadata.capabilities ||
    adapter?.capabilities ||
    {};

  return {
    id:
      metadata.id ||
      adapter?.id ||
      id,

    name:
      metadata.name ||
      adapter?.name ||
      id,

    capabilities,

    models:
      Array.isArray(
        capabilities.models
      )
        ? capabilities.models
        : [],

    durations:
      Array.isArray(
        capabilities.durations
      )
        ? capabilities.durations
        : [],

    aspects:
      Array.isArray(
        capabilities.aspects
      )
        ? capabilities.aspects
        : [],

    resolutions:
      Array.isArray(
        capabilities.resolutions
      )
        ? capabilities.resolutions
        : []
  };
}


/* ============================================================
GET ADAPTER INFO
============================================================ */

function getAdapterInfo(providerId) {
  const id =
    normalizeProviderId(providerId);

  const adapter =
    getAdapter(id);

  /*
  Adapter belum memiliki implementasi.

  Tetap dikembalikan sebagai unsupported.
  Ini memungkinkan provider baru disimpan
  di database tanpa membuat sistem crash.
  */
  if (!adapter) {
    return {
      id,
      name: id,
      supported: false,
      adapter: null,
      capabilities: {},
      models: [],
      durations: [],
      aspects: [],
      resolutions: []
    };
  }

  const metadata =
    readAdapterMetadata(
      id,
      adapter
    );

  return {
    id:
      metadata.id || id,

    name:
      metadata.name || id,

    supported: true,

    adapter,

    capabilities:
      metadata.capabilities,

    models:
      metadata.models,

    durations:
      metadata.durations,

    aspects:
      metadata.aspects,

    resolutions:
      metadata.resolutions
  };
}


/* ============================================================
CHECK ADAPTER SUPPORT
============================================================ */

function adapterSupported(
  providerId
) {
  const id =
    normalizeProviderId(providerId);

  return !!(
    id &&
    PROVIDERS[id]
  );
}


/* ============================================================
LIST PRIMARY ADAPTERS
============================================================ */

function listAdapters() {
  /*
  Tidak hard-coded.

  Adapter yang sudah diregistrasikan
  akan otomatis muncul di daftar.
  */
  return Object.keys(
    PRIMARY_ADAPTERS
  );
}


/* ============================================================
RESOLVE ADAPTER
============================================================ */

function resolveAdapter(
  providerId
) {
  const id =
    normalizeProviderId(providerId);

  const adapter =
    getAdapter(id);

  if (!adapter) {
    throw new Error(
      `Adapter "${String(providerId || "")}" belum tersedia.`
    );
  }

  return adapter;
}


/* ============================================================
GET REGISTRY
============================================================ */

function getRegistry() {
  return Object.freeze({
    ...PROVIDERS
  });
}


/* ============================================================
PUBLIC EXPORTS
============================================================ */

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


/* ============================================================
BROWSER COMPATIBILITY BRIDGE
============================================================ */

if (
  typeof window !== "undefined"
) {
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
