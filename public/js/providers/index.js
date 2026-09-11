/* =========================================================
   GEN-Z.AI
   PROVIDER REGISTRY

   Fungsi:
   - Menyimpan daftar adapter provider
   - Mendeteksi adapter berdasarkan ID / nama
   - Mendukung custom provider ID
   - Alias Gemini -> Veo
   - Tidak menyimpan API key

   Adapter sebenarnya:
   /public/js/providers/veo.js
   /public/js/providers/minimax.js
   /public/js/providers/luma.js
========================================================= */

import veo from "./veo.js";
import minimax from "./minimax.js";
import luma from "./luma.js";


/* =========================================================
   ADAPTER REGISTRY
========================================================= */

const PROVIDERS = {
  veo,
  minimax,
  luma
};


/* =========================================================
   EXACT ALIASES
========================================================= */

const NAME_ALIASES = {

  gemini: "veo",

  "gemini / veo": "veo",

  "gemini/veo": "veo",

  veo: "veo",

  minimax: "minimax",

  "mini max": "minimax",

  luma: "luma",

  "luma ai": "luma"

};


/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalizeText(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

}


/* =========================================================
   NORMALIZE PROVIDER ID
========================================================= */

export function normalizeProviderId(value) {

  const raw =
    normalizeText(value);

  if (!raw) {
    return "";
  }

  if (
    NAME_ALIASES[raw]
  ) {
    return NAME_ALIASES[raw];
  }

  return raw;

}


/* =========================================================
   DETECT ADAPTER FROM TEXT
========================================================= */

function detectAdapterFromText(
  value
) {

  const text =
    normalizeText(value);

  if (!text) {
    return null;
  }


  /* -------------------------------------------------------
     GEMINI / VEO
  ------------------------------------------------------- */

  if (
    text === "gemini" ||
    text === "veo" ||
    text.includes("gemini") ||
    text.includes("veo")
  ) {

    return "veo";

  }


  /* -------------------------------------------------------
     MINIMAX
  ------------------------------------------------------- */

  if (
    text === "minimax" ||
    text === "mini max" ||
    text.includes("minimax") ||
    text.includes("mini max")
  ) {

    return "minimax";

  }


  /* -------------------------------------------------------
     LUMA
  ------------------------------------------------------- */

  if (
    text === "luma" ||
    text === "luma ai" ||
    text.includes("luma")
  ) {

    return "luma";

  }


  return null;

}


/* =========================================================
   GET ADAPTER
========================================================= */

export function getAdapter(
  adapter
) {

  const raw =
    normalizeText(adapter);

  if (!raw) {
    return null;
  }


  /* -------------------------------------------------------
     Exact adapter / alias
  ------------------------------------------------------- */

  const normalized =
    normalizeProviderId(raw);


  if (
    PROVIDERS[normalized]
  ) {

    return PROVIDERS[
      normalized
    ];

  }


  /* -------------------------------------------------------
     Flexible name detection
  ------------------------------------------------------- */

  const detected =
    detectAdapterFromText(raw);


  if (
    detected &&
    PROVIDERS[detected]
  ) {

    return PROVIDERS[
      detected
    ];

  }


  return null;

}


/* =========================================================
   GET ADAPTER INFO
========================================================= */

export function getAdapterInfo(
  adapter
) {

  const provider =
    getAdapter(adapter);


  if (!provider) {
    return null;
  }


  if (
    typeof provider.info ===
    "function"
  ) {

    return provider.info();

  }


  return {

    id:
      provider.id,

    name:
      provider.name,

    capabilities:
      provider.capabilities ||
      {}

  };

}


/* =========================================================
   LIST ALL ADAPTERS
========================================================= */

export function listAdapters() {

  return Object.values(
    PROVIDERS
  ).map(

    provider => {

      if (
        typeof provider.info ===
        "function"
      ) {

        return provider.info();

      }


      return {

        id:
          provider.id,

        name:
          provider.name,

        capabilities:
          provider.capabilities ||
          {}

      };

    }

  );

}


/* =========================================================
   RESOLVE PROVIDER ADAPTER
=========================================================

   Provider database dapat berupa:

   {
     id: "gemini-production",
     name: "Gemini Production",
     adapter: "veo"
   }

   atau:

   {
     id: "gemini-production",
     name: "Gemini Production"
   }

   atau:

   {
     id: "gemini-production",
     name: "Gemini Production",
     adapter: "Gemini"
   }

   Semua harus tetap menghasilkan adapter Veo.
========================================================= */

export function resolveAdapter(
  provider
) {

  if (!provider) {
    return null;
  }


  /* -------------------------------------------------------
     1. Adapter eksplisit
  ------------------------------------------------------- */

  if (
    provider.adapter
  ) {

    const explicit =
      getAdapter(
        provider.adapter
      );


    if (explicit) {
      return explicit;
    }

  }


  /* -------------------------------------------------------
     2. Provider ID
  ------------------------------------------------------- */

  if (
    provider.id
  ) {

    const byId =
      getAdapter(
        provider.id
      );


    if (byId) {
      return byId;
    }

  }


  /* -------------------------------------------------------
     3. Provider name
  ------------------------------------------------------- */

  if (
    provider.name
  ) {

    const byName =
      getAdapter(
        provider.name
      );


    if (byName) {
      return byName;
    }

  }


  return null;

}


/* =========================================================
   CHECK SUPPORT
========================================================= */

export function adapterSupported(
  provider
) {

  return Boolean(
    resolveAdapter(provider)
  );

}


/* =========================================================
   FIND ADAPTER ID
========================================================= */

export function resolveAdapterId(
  provider
) {

  const adapter =
    resolveAdapter(provider);


  if (!adapter) {
    return null;
  }


  if (
    typeof adapter.info ===
    "function"
  ) {

    return (
      adapter.info()?.id ||
      null
    );

  }


  return (
    adapter.id ||
    null
  );

}


/* =========================================================
   EXPORT
========================================================= */

export default {

  getAdapter,

  getAdapterInfo,

  listAdapters,

  resolveAdapter,

  resolveAdapterId,

  adapterSupported,

  normalizeProviderId

};
