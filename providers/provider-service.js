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
 * Capability provider berasal dari adapter masing-masing,
 * bukan hard-coded di frontend.
 *
 * Untuk ChinaAPI:
 *
 * provider.config.modelCredits
 *
 * boleh digunakan untuk override credit per model.
 *
 * Contoh:
 *
 * {
 *   "modelCredits": {
 *     "agnes-video-2.5-flash": 1,
 *     "doubao-seedance-2-0-mini-260615": 2
 *   }
 * }
 *
 * Hanya bagian modelCredits yang aman dikirim ke frontend.
 * ============================================================
 */


/*
 * ============================================================
 * CONSTANT
 * ============================================================
 */

const MAX_MODEL_CREDIT =
  1000;


/*
 * ============================================================
 * NORMALIZE MODEL CREDIT
 * ============================================================
 */

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


/*
 * ============================================================
 * NORMALIZE MODEL CREDIT MAP
 * ============================================================
 *
 * Hanya menerima:
 *
 * {
 *   modelId: number
 * }
 *
 * Semua nilai invalid dibuang.
 * ============================================================
 */

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
        credit === null
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


/*
 * ============================================================
 * GET DEFAULT MODEL CREDITS
 * ============================================================
 *
 * Credit default berasal dari model adapter.
 *
 * Ini memastikan sistem tetap bekerja walaupun admin belum
 * menyimpan override pada database.
 * ============================================================
 */

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
         * Model tanpa konfigurasi credit
         * tidak dimasukkan.
         */
      }
    }
  );

  return result;
}


/*
 * ============================================================
 * GET PROVIDER
 * ============================================================
 */

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


/*
 * ============================================================
 * PUBLIC PROVIDER
 * ============================================================
 *
 * Data yang aman dikirim ke frontend.
 *
 * JANGAN expose:
 * - api_key
 * - config mentah
 * - credential
 * - secret
 * - token
 *
 * Capability diambil dari adapter registry.
 * Dengan demikian frontend tidak perlu mengetahui
 * aturan khusus masing-masing provider.
 *
 * Khusus ChinaAPI:
 * - modelCredits hanya berisi angka credit
 * - config lain tidak dikirim
 * - jika admin belum mengatur override, nilai default model
 *   dikirim sebagai fallback
 * ============================================================
 */

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

  /*
   * Ambil metadata adapter.
   *
   * Jika adapter belum tersedia, registry akan
   * mengembalikan supported:false dan capabilities:{}.
   */
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

  /*
   * Pastikan struktur capability selalu aman
   * untuk dipakai frontend.
   */
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

  /*
   * ==========================================================
   * MODEL CREDIT
   * ==========================================================
   *
   * Default:
   *
   * adapter model config
   *
   * Override:
   *
   * provider.config.modelCredits
   *
   * Contoh:
   *
   * modelCredits:
   * {
   *   "agnes-video-2.5-flash": 3,
   *   "doubao-seedance-2-0-mini-260615": 5
   * }
   *
   * Override hanya diterima jika nilainya valid.
   * ==========================================================
   */

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

    /*
     * Metadata adapter.
     */
    adapterName:
      adapterInfo?.name ||
      adapterId,

    adapterSupported:
      Boolean(
        adapterInfo?.supported
      ),

    /*
     * Capability utama.
     *
     * Frontend membaca data ini secara dinamis.
     * Tidak ada daftar provider yang di-hard-code.
     */
    capabilities: {
      ...capabilities,

      models,

      durations,

      aspects,

      resolutions
    },

    /*
     * ========================================================
     * MODEL CREDIT
     * ========================================================
     *
     * Aman untuk frontend.
     *
     * Tidak ada config provider lain yang ikut dikirim.
     */
    modelCredits
  };
}
