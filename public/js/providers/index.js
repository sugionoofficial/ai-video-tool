/* ============================================================
GEN-Z.AI
PROVIDER ADAPTER REGISTRY
============================================================

Registry adapter GEN-Z.AI.

Tanggung jawab:
1. Mendaftarkan adapter
2. Mencari adapter berdasarkan Adapter ID
3. Membaca metadata adapter
4. Membaca capabilities
5. Memastikan adapter memiliki kontrak minimum
6. Menyediakan daftar adapter utama
7. Menyediakan alias adapter

PENTING:

Provider ID database != Provider Name.

Contoh:

provider.id
    chinaapi

provider.name
    ChinaAPI

Yang digunakan untuk resolve adapter adalah:

    chinaapi

Bukan:

    ChinaAPI

API key tidak disimpan di registry.
API key berasal dari database dan diproses server-side.

============================================================ */


/* ============================================================
REGISTRY
============================================================ */

const PROVIDERS =
  Object.create(null);


/*
 * Hanya adapter utama yang disimpan di sini.
 *
 * Alias tidak masuk ke PRIMARY_ADAPTERS.
 *
 * Contoh:
 *
 * chinaapi
 * china-api
 * china api
 *
 * Ketiganya menunjuk adapter yang sama,
 * tetapi listAdapters() hanya menghasilkan:
 *
 * chinaapi
 */
const PRIMARY_ADAPTERS =
  Object.create(null);


/* ============================================================
NORMALIZE ADAPTER ID
============================================================ */

function normalizeProviderId(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(
    value
  )
    .trim()
    .toLowerCase()
    .replace(
      /[_\s]+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    );

}


/* ============================================================
VALIDATE ADAPTER
============================================================ */

/*
 * Semua adapter video GEN-Z.AI harus memiliki kontrak
 * minimum berikut:
 *
 * generate()
 * status()
 * fetchVideo()
 *
 * Fungsi tambahan bersifat opsional:
 *
 * createVideo()
 * getVideoStatus()
 * waitForVideo()
 * getModels()
 * info()
 */

function validateAdapterContract(
  id,
  adapter
) {

  if (
    !adapter ||
    typeof adapter !==
      "object"
  ) {

    throw new Error(
      `Implementasi adapter "${id}" tidak valid.`
    );

  }


  const requiredMethods = [

    "generate",

    "status",

    "fetchVideo"

  ];


  const missingMethods =
    requiredMethods.filter(
      method =>
        typeof adapter[
          method
        ] !== "function"
    );


  if (
    missingMethods.length
  ) {

    throw new Error(
      `Adapter "${id}" tidak lengkap. Fungsi yang hilang: ${missingMethods.join(", ")}.`
    );

  }


  return true;

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
    normalizeProviderId(
      id
    );


  if (
    !normalizedId
  ) {

    throw new Error(
      "Adapter ID tidak boleh kosong."
    );

  }


  validateAdapterContract(
    normalizedId,
    adapter
  );


  /*
   * Jangan izinkan adapter berbeda
   * mengambil ID utama yang sama.
   */

  const existingPrimary =
    PRIMARY_ADAPTERS[
      normalizedId
    ];


  if (
    existingPrimary &&
    existingPrimary !==
      adapter
  ) {

    throw new Error(
      `Adapter "${normalizedId}" sudah terdaftar.`
    );

  }


  /*
   * Register adapter utama.
   */

  PROVIDERS[
    normalizedId
  ] =
    adapter;


  PRIMARY_ADAPTERS[
    normalizedId
  ] =
    adapter;


  /*
   * Register alias.
   */

  if (
    Array.isArray(
      aliases
    )
  ) {

    aliases.forEach(
      alias => {

        const normalizedAlias =
          normalizeProviderId(
            alias
          );


        if (
          !normalizedAlias ||
          normalizedAlias ===
            normalizedId
        ) {

          return;

        }


        const existing =
          PROVIDERS[
            normalizedAlias
          ];


        /*
         * Jangan diam-diam mengganti
         * adapter milik alias yang sudah
         * digunakan adapter lain.
         */

        if (
          existing &&
          existing !==
            adapter
        ) {

          throw new Error(
            `Alias adapter "${normalizedAlias}" sudah digunakan oleh adapter lain.`
          );

        }


        PROVIDERS[
          normalizedAlias
        ] =
          adapter;

      }
    );

  }


  return adapter;

}


/* ============================================================
BUILT-IN ADAPTERS
============================================================ */

import * as veo
  from "./veo.js";

import * as minimax
  from "./minimax.js";

import * as luma
  from "./luma.js";

import * as chinaapi
  from "./chinaapi.js";


/* ============================================================
GOOGLE GEMINI / VEO
============================================================ */

registerAdapter(
  "veo",
  veo,
  [

    "gemini",

    "gemini2",

    "google-veo",

    "google veo",

    "gemini-veo",

    "gemini/veo"

  ]
);


/* ============================================================
MINIMAX
============================================================ */

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


/* ============================================================
LUMA
============================================================ */

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
CHINAAPI
============================================================ */

registerAdapter(
  "chinaapi",
  chinaapi,
  [

    "china-api",

    "china api"

  ]
);


/* ============================================================
GET ADAPTER
============================================================ */

function getAdapter(
  providerId
) {

  const id =
    normalizeProviderId(
      providerId
    );


  if (
    !id
  ) {

    return null;

  }


  return (
    PROVIDERS[
      id
    ] ||
    null
  );

}


/* ============================================================
READ ADAPTER METADATA
============================================================ */

function readAdapterMetadata(
  id,
  adapter
) {

  let metadata =
    {};


  /*
   * Prioritaskan info().
   */

  try {

    if (
      typeof adapter?.info ===
        "function"
    ) {

      metadata =
        adapter.info() ||
        {};

    }

  } catch {

    metadata =
      {};

  }


  /*
   * Pastikan metadata selalu object.
   */

  if (
    !metadata ||
    typeof metadata !==
      "object"
  ) {

    metadata =
      {};

  }


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

function getAdapterInfo(
  providerId
) {

  const id =
    normalizeProviderId(
      providerId
    );


  const adapter =
    getAdapter(
      id
    );


  /*
   * Adapter belum tersedia.
   *
   * Provider database tetap boleh ada,
   * tetapi backend akan mengetahui bahwa
   * adapter belum didukung.
   */

  if (
    !adapter
  ) {

    return {

      id,

      name:
        id,

      supported:
        false,

      adapter:
        null,

      capabilities:
        {},

      models:
        [],

      durations:
        [],

      aspects:
        [],

      resolutions:
        []

    };

  }


  const metadata =
    readAdapterMetadata(
      id,
      adapter
    );


  return {

    id:
      metadata.id ||
      id,

    name:
      metadata.name ||
      id,

    supported:
      true,

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
    normalizeProviderId(
      providerId
    );


  return Boolean(
    id &&
    PROVIDERS[
      id
    ]
  );

}


/* ============================================================
CHECK ADAPTER CONTRACT
============================================================ */

function adapterContract(
  providerId
) {

  const id =
    normalizeProviderId(
      providerId
    );


  const adapter =
    getAdapter(
      id
    );


  if (
    !adapter
  ) {

    return {

      supported:
        false,

      valid:
        false,

      id,

      missing:
        [
          "adapter"
        ]

    };

  }


  const requiredMethods = [

    "generate",

    "status",

    "fetchVideo"

  ];


  const missing =
    requiredMethods.filter(
      method =>
        typeof adapter[
          method
        ] !== "function"
    );


  return {

    supported:
      true,

    valid:
      missing.length ===
        0,

    id,

    missing

  };

}


/* ============================================================
LIST PRIMARY ADAPTERS
============================================================ */

function listAdapters() {

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
    normalizeProviderId(
      providerId
    );


  const adapter =
    getAdapter(
      id
    );


  if (
    !adapter
  ) {

    throw new Error(
      `Adapter "${String(
        providerId ||
        ""
      )}" belum tersedia.`
    );

  }


  /*
   * Pemeriksaan kontrak kedua.
   *
   * Ini memastikan adapter yang lolos
   * registry tetap memiliki fungsi utama.
   */

  validateAdapterContract(
    id,
    adapter
  );


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

  adapterContract,

  normalizeProviderId,

  getRegistry

};


/* ============================================================
BROWSER COMPATIBILITY BRIDGE
============================================================ */

if (
  typeof window !==
  "undefined"
) {

  window.GENZ_PROVIDERS = {

    getAdapter,

    getAdapterInfo,

    listAdapters,

    resolveAdapter,

    adapterSupported,

    adapterContract,

    normalizeProviderId,

    registerAdapter,

    getRegistry

  };

}
