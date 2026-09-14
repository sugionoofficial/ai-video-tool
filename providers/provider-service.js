import {
  sb
} from "../lib/supabase.js";

import {
  HttpError
} from "../lib/http.js";

import {
  getAdapterInfo
} from "../public/js/providers/index.js";

import {
  getCredits as getChinaApiModelCredits
} from "../public/js/providers/chinaapi/index.js";


/*
 * ============================================================
 * PROVIDER SERVICE
 * ============================================================
 *
 * Service untuk membaca konfigurasi provider dari database.
 *
 * API key dan config internal TIDAK pernah dikirim ke frontend.
 *
 * Khusus ChinaAPI:
 *
 * provider.config.modelCredits
 * provider.config.modelDiscounts
 * provider.config.modelEnabled
 *
 * digunakan untuk mengatur:
 *
 * - credit dasar masing-masing model
 * - diskon masing-masing model
 * - status aktif/nonaktif masing-masing model
 * ============================================================
 */


/* ============================================================
 * CONSTANT
 * ============================================================ */

const MAX_MODEL_CREDIT =
  1000;

const MAX_MODEL_DISCOUNT =
  100;


/* ============================================================
 * NORMALIZE MODEL CREDIT
 * ============================================================ */

function normalizeModelCredit(
  value
) {
  const credit =
    Number(
      value
    );

  if (
    !Number.isFinite(
      credit
    ) ||
    !Number.isInteger(
      credit
    ) ||
    credit < 1 ||
    credit > MAX_MODEL_CREDIT
  ) {
    return null;
  }

  return credit;
}


/* ============================================================
 * NORMALIZE MODEL DISCOUNT
 * ============================================================ */

function normalizeModelDiscount(
  value
) {
  const discount =
    Number(
      value
    );

  if (
    !Number.isFinite(
      discount
    ) ||
    !Number.isInteger(
      discount
    ) ||
    discount < 0 ||
    discount > MAX_MODEL_DISCOUNT
  ) {
    return null;
  }

  return discount;
}


/* ============================================================
 * NORMALIZE MODEL ENABLED
 * ============================================================ */

function normalizeModelEnabled(
  value
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (
    value ===
    "true"
  ) {
    return true;
  }

  if (
    value ===
    "false"
  ) {
    return false;
  }

  if (
    value ===
    1
  ) {
    return true;
  }

  if (
    value ===
    0
  ) {
    return false;
  }

  return null;
}


/* ============================================================
 * NORMALIZE MODEL CREDIT MAP
 * ============================================================ */

function normalizeModelCredits(
  value
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return {};
  }

  const result = {};

  Object.entries(
    value
  ).forEach(
    function (
      entry
    ) {

      const model =
        String(
          entry[0] || ""
        ).trim();

      if (
        !model
      ) {
        return;
      }

      const credit =
        normalizeModelCredit(
          entry[1]
        );

      if (
        credit ===
        null
      ) {
        return;
      }

      result[
        model
      ] =
        credit;
    }
  );

  return result;
}


/* ============================================================
 * NORMALIZE MODEL DISCOUNT MAP
 * ============================================================ */

function normalizeModelDiscounts(
  value
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return {};
  }

  const result = {};

  Object.entries(
    value
  ).forEach(
    function (
      entry
    ) {

      const model =
        String(
          entry[0] || ""
        ).trim();

      if (
        !model
      ) {
        return;
      }

      const discount =
        normalizeModelDiscount(
          entry[1]
        );

      if (
        discount ===
        null
      ) {
        return;
      }

      result[
        model
      ] =
        discount;
    }
  );

  return result;
}


/* ============================================================
 * NORMALIZE MODEL ENABLED MAP
 * ============================================================ */

function normalizeModelEnabledMap(
  value
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return {};
  }

  const result = {};

  Object.entries(
    value
  ).forEach(
    function (
      entry
    ) {

      const model =
        String(
          entry[0] || ""
        ).trim();

      if (
        !model
      ) {
        return;
      }

      const enabled =
        normalizeModelEnabled(
          entry[1]
        );

      if (
        enabled ===
        null
      ) {
        return;
      }

      result[
        model
      ] =
        enabled;
    }
  );

  return result;
}


/* ============================================================
 * GET DEFAULT MODEL CREDITS
 * ============================================================ */

function getDefaultModelCredits(
  adapterId,
  models
) {

  const normalizedAdapter =
    String(
      adapterId || ""
    )
      .trim()
      .toLowerCase();

  if (
    normalizedAdapter !==
    "chinaapi"
  ) {
    return {};
  }

  const result = {};

  const modelList =
    Array.isArray(
      models
    )
      ? models
      : [];

  modelList.forEach(
    function (
      model
    ) {

      const modelId =
        String(
          model || ""
        ).trim();

      if (
        !modelId
      ) {
        return;
      }

      try {

        const credit =
          normalizeModelCredit(
            getChinaApiModelCredits(
              modelId
            )
          );

        if (
          credit !==
          null
        ) {

          result[
            modelId
          ] =
            credit;
        }

      } catch (_) {

        /*
         * Model tanpa konfigurasi
         * credit tidak dimasukkan.
         */

      }

    }
  );

  return result;
}


/* ============================================================
 * GET DEFAULT MODEL DISCOUNTS
 * ============================================================ */

function getDefaultModelDiscounts(
  models
) {

  const result = {};

  const modelList =
    Array.isArray(
      models
    )
      ? models
      : [];

  modelList.forEach(
    function (
      model
    ) {

      const modelId =
        String(
          model || ""
        ).trim();

      if (
        !modelId
      ) {
        return;
      }

      result[
        modelId
      ] = 0;

    }
  );

  return result;
}


/* ============================================================
 * GET DEFAULT MODEL ENABLED
 * ============================================================ */

function getDefaultModelEnabled(
  models
) {

  const result = {};

  const modelList =
    Array.isArray(
      models
    )
      ? models
      : [];

  modelList.forEach(
    function (
      model
    ) {

      const modelId =
        String(
          model || ""
        ).trim();

      if (
        !modelId
      ) {
        return;
      }

      result[
        modelId
      ] = true;

    }
  );

  return result;
}


/* ============================================================
 * GET PROVIDER
 * ============================================================ */

export async function getProvider(
  id,
  env,
  includeDisabled = false
) {

  const providerId =
    String(
      id || ""
    )
      .trim()
      .toLowerCase();

  if (
    !providerId
  ) {
    throw new HttpError(
      "Provider tidak valid.",
      400
    );
  }

  const query =
    includeDisabled
      ? "?id=eq." +
        encodeURIComponent(
          providerId
        ) +
        "&select=*"
      : "?id=eq." +
        encodeURIComponent(
          providerId
        ) +
        "&enabled=eq.true&select=*";

  const response =
    await sb(
      "/rest/v1/providers" +
        query,
      {
        headers: {
          Accept:
            "application/json"
        }
      },
      env
    );

  if (
    !response.ok
  ) {
    throw new HttpError(
      "Gagal mengambil konfigurasi provider.",
      502
    );
  }

  const rows =
    await response.json();

  const provider =
    Array.isArray(
      rows
    )
      ? rows[0]
      : null;

  if (
    !provider
  ) {
    throw new HttpError(
      "Provider tidak ditemukan atau tidak aktif.",
      404
    );
  }

  return provider;
}


/* ============================================================
 * PUBLIC PROVIDER
 * ============================================================ */

export function publicProvider(
  provider
) {

  if (
    !provider
  ) {
    return null;
  }

  const adapterId =
    String(
      provider.adapter || ""
    )
      .trim()
      .toLowerCase();


  /* ==========================================================
   * ADAPTER INFORMATION
   * ========================================================== */

  const adapterInfo =
    getAdapterInfo(
      adapterId
    );

  const capabilities =
    adapterInfo?.capabilities &&
    typeof adapterInfo.capabilities ===
      "object"
      ? adapterInfo.capabilities
      : {};


  /* ==========================================================
   * MODELS
   * ========================================================== */

  const models =
    Array.isArray(
      adapterInfo?.models
    )
      ? adapterInfo.models
      : Array.isArray(
          capabilities.models
        )
        ? capabilities.models
        : [];


  /* ==========================================================
   * DURATIONS
   * ========================================================== */

  const durations =
    Array.isArray(
      adapterInfo?.durations
    )
      ? adapterInfo.durations
      : Array.isArray(
          capabilities.durations
        )
        ? capabilities.durations
        : [];


  /* ==========================================================
   * ASPECTS
   * ========================================================== */

  const aspects =
    Array.isArray(
      adapterInfo?.aspects
    )
      ? adapterInfo.aspects
      : Array.isArray(
          capabilities.aspects
        )
        ? capabilities.aspects
        : [];


  /* ==========================================================
   * RESOLUTIONS
   * ========================================================== */

  const resolutions =
    Array.isArray(
      adapterInfo?.resolutions
    )
      ? adapterInfo.resolutions
      : Array.isArray(
          capabilities.resolutions
        )
        ? capabilities.resolutions
        : [];


  /* ==========================================================
   * MODEL CREDIT
   * ========================================================== */

  const defaultModelCredits =
    getDefaultModelCredits(
      adapterId,
      models
    );

  const configuredModelCredits =
    normalizeModelCredits(
      provider?.config?.modelCredits
    );

  const modelCredits = {
    ...defaultModelCredits,
    ...configuredModelCredits
  };


  /* ==========================================================
   * MODEL DISCOUNT
   * ========================================================== */

  const defaultModelDiscounts =
    getDefaultModelDiscounts(
      models
    );

  const configuredModelDiscounts =
    normalizeModelDiscounts(
      provider?.config?.modelDiscounts
    );

  const modelDiscounts = {
    ...defaultModelDiscounts,
    ...configuredModelDiscounts
  };


  /* ==========================================================
   * MODEL ENABLED
   * ========================================================== */

  const defaultModelEnabled =
    getDefaultModelEnabled(
      models
    );

  const configuredModelEnabled =
    normalizeModelEnabledMap(
      provider?.config?.modelEnabled
    );

  const modelEnabled = {
    ...defaultModelEnabled,
    ...configuredModelEnabled
  };


  /* ==========================================================
   * RETURN PUBLIC DATA
   * ========================================================== */

  return {

    id:
      provider.id,

    name:
      provider.name,

    adapter:
      provider.adapter,

    enabled:
      Boolean(
        provider.enabled
      ),

    apiKeySet:
      Boolean(
        String(
          provider.api_key ||
            ""
        ).trim()
      ),

    api_key_masked:
      provider.api_key
        ? "••••••••"
        : "",


    /* ========================================================
     * ADAPTER
     * ======================================================== */

    adapterName:
      adapterInfo?.name ||
      adapterId,

    adapterSupported:
      Boolean(
        adapterInfo?.supported
      ),


    /* ========================================================
     * CAPABILITIES
     * ======================================================== */

    capabilities: {
      ...capabilities,

      models,

      durations,

      aspects,

      resolutions
    },


    /* ========================================================
     * MODEL CREDIT
     * ======================================================== */

    modelCredits,


    /* ========================================================
     * MODEL DISCOUNT
     * ======================================================== */

    modelDiscounts,


    /* ========================================================
     * MODEL ENABLED
     * ======================================================== */

    modelEnabled

  };
}
