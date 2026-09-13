import {
  sb
} from "../lib/supabase.js";

import {
  HttpError
} from "../lib/http.js";

import {
  getAdapterInfo
} from "../public/js/providers/index.js";


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
 * ============================================================
 */


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

  if (!providerId) {
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

  if (!response.ok) {
    throw new HttpError(
      "Gagal mengambil konfigurasi provider.",
      502
    );
  }

  const rows =
    await response.json();

  const provider =
    Array.isArray(rows)
      ? rows[0]
      : null;

  if (!provider) {
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
 * ============================================================
 */

export function publicProvider(
  provider
) {
  if (!provider) {
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
    typeof adapterInfo.capabilities === "object"
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
    }
  };
}
