// ============================================================
// GEN-Z.AI
// MAIN ROUTER
// ============================================================

import {
  HttpError,
  corsHeaders,
  json
} from "../lib/http.js";

import {
  accountApi
} from "./account.js";

import {
  adminApi
} from "./admin.js";

import {
  dashboardReferencesApi
} from "./dashboard-references.js";

import {
  handleGenerate
} from "./generate.js";

import {
  handleStatus
} from "./status.js";

import {
  handleVideo
} from "./video.js";

import {
  transactionApi
} from "./transactions.js";

import {
  topupApi
} from "./topup.js";

import {
  sb
} from "../lib/supabase.js";

import {
  requireAdmin
} from "../auth/role.js";

import {
  resolveAdapter
} from "../providers/index.js";

import {
  publicProvider
} from "../providers/provider-service.js";


// ============================================================
// CONSTANTS
// ============================================================

const MAX_GENERATE_REQUEST_BYTES =
  65536;


// ============================================================
// HELPERS
// ============================================================

function normalizedAdapter(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function hasApiKey(
  provider
) {
  return Boolean(
    String(
      provider?.api_key || ""
    ).trim()
  );
}


function isSupportedAdapter(
  adapter
) {
  const id =
    normalizedAdapter(
      adapter
    );

  if (!id) {
    return false;
  }

  try {
    return Boolean(
      resolveAdapter(
        id
      )
    );
  } catch {
    return false;
  }
}


// ============================================================
// ROUTER
// ============================================================

export async function router(
  request,
  env,
  ctx
) {

  // ----------------------------------------------------------
  // CORS PREFLIGHT
  // ----------------------------------------------------------

  if (
    request.method ===
    "OPTIONS"
  ) {
    return new Response(
      null,
      {
        status: 204,

        headers:
          corsHeaders(
            env
          )
      }
    );
  }


  const url =
    new URL(
      request.url
    );


  try {

    // ========================================================
    // CONFIG
    // ========================================================

    if (
      url.pathname ===
        "/api/config" &&
      request.method ===
        "GET"
    ) {

      return json(
        {
          success:
            true,

          supabaseUrl:
            env.SUPABASE_URL ||
            "",

          supabasePublishableKey:
            env.SUPABASE_PUBLISHABLE_KEY ||
            ""
        },
        200,
        env
      );
    }


    // ========================================================
    // DIAGNOSTIC
    // ========================================================

    if (
      url.pathname ===
        "/api/diagnostic" &&
      request.method ===
        "GET"
    ) {

      await requireAdmin(
        request,
        env
      );


      const res =
        await sb(
          "/rest/v1/providers?select=id,name,adapter,enabled,api_key",
          {
            headers: {
              Accept:
                "application/json"
            }
          },
          env
        );


      if (!res.ok) {
        throw new HttpError(
          "Gagal membaca konfigurasi provider.",
          502
        );
      }


      const providers =
        await res.json();


      return json(
        {
          success:
            true,

          worker:
            "GEN-Z.AI",

          supabaseConfigured:
            Boolean(
              env.SUPABASE_URL &&
              env.SUPABASE_SERVICE_ROLE_KEY
            ),

          providers:
            Array.isArray(
              providers
            )
              ? providers.map(
                  provider => {

                    const adapter =
                      normalizedAdapter(
                        provider.adapter
                      );

                    const supported =
                      isSupportedAdapter(
                        adapter
                      );

                    return {
                      id:
                        provider.id,

                      name:
                        provider.name,

                      adapter:
                        adapter,

                      enabled:
                        Boolean(
                          provider.enabled
                        ),

                      configured:
                        hasApiKey(
                          provider
                        ),

                      adapterSupported:
                        supported
                    };
                  }
                )
              : [],

          timestamp:
            new Date()
              .toISOString()
        },
        200,
        env
      );
    }


    // ========================================================
    // PUBLIC PROVIDERS
    // ========================================================

    if (
      url.pathname ===
        "/api/providers" &&
      request.method ===
        "GET"
    ) {

      const res =
        await sb(
          "/rest/v1/providers?enabled=eq.true&select=id,name,adapter,enabled,api_key&order=name.asc",
          {
            headers: {
              Accept:
                "application/json"
            }
          },
          env
        );


      if (!res.ok) {
        throw new HttpError(
          "Gagal mengambil daftar provider.",
          502
        );
      }


      const providers =
        await res.json();


      const availableProviders =
        Array.isArray(
          providers
        )
          ? providers
              .filter(
                provider => {

                  if (
                    !provider ||
                    provider.enabled === false
                  ) {
                    return false;
                  }


                  if (
                    !hasApiKey(
                      provider
                    )
                  ) {
                    return false;
                  }


                  return isSupportedAdapter(
                    provider.adapter
                  );
                }
              )
              .map(
                publicProvider
              )
              .filter(
                Boolean
              )
          : [];


      return json(
        {
          success:
            true,

          providers:
            availableProviders
        },
        200,
        env
      );
    }


    // ========================================================
    // ADMIN
    // ========================================================

    if (
      url.pathname.startsWith(
        "/api/admin/"
      )
    ) {

      return await adminApi(
        request,
        env
      );
    }


    // ========================================================
    // DASHBOARD REFERENCES
    // ========================================================

    if (
      url.pathname ===
        "/api/dashboard/references" &&
      request.method ===
        "GET"
    ) {

      return await dashboardReferencesApi(
        request,
        env
      );
    }


    // ========================================================
    // ACCOUNT
    // ========================================================

    if (
      url.pathname ===
        "/api/account/credits" &&
      request.method ===
        "GET"
    ) {

      return await accountApi(
        request,
        env
      );
    }


    // ========================================================
    // TRANSACTIONS
    // ========================================================

    if (
      url.pathname ===
        "/api/account/transactions" &&
      request.method ===
        "GET"
    ) {

      return await transactionApi(
        request,
        env
      );
    }


    // ========================================================
    // TOPUP
    // ========================================================

    if (
      url.pathname ===
      "/api/account/topup-requests"
    ) {

      return await topupApi(
        request,
        env
      );
    }


    // ========================================================
    // GENERATE
    // ========================================================

    if (
      url.pathname ===
        "/api/generate" &&
      request.method ===
        "POST"
    ) {

      const contentLengthHeader =
        request.headers.get(
          "content-length"
        );

      const contentLength =
        Number(
          contentLengthHeader || 0
        );


      if (
        Number.isFinite(
          contentLength
        ) &&
        contentLength >
          MAX_GENERATE_REQUEST_BYTES
      ) {
        throw new HttpError(
          "Request generation terlalu besar.",
          413
        );
      }


      return await handleGenerate(
        request,
        env
      );
    }


    // ========================================================
    // GENERATE STATUS
    // ========================================================

    if (
      url.pathname ===
        "/api/generate/status" &&
      request.method ===
        "POST"
    ) {

      return await handleStatus(
        request,
        env
      );
    }


    // ========================================================
    // VIDEO
    // ========================================================

    if (
      url.pathname ===
        "/api/video" &&
      request.method ===
        "GET"
    ) {

      return await handleVideo(
        request,
        env
      );
    }


    // ========================================================
    // STATIC ASSETS
    // ========================================================

    if (
      env.ASSETS
    ) {

      return await env.ASSETS.fetch(
        request
      );
    }


    // ========================================================
    // 404
    // ========================================================

    throw new HttpError(
      "Route tidak ditemukan.",
      404
    );

  } catch (
    err
  ) {

    // --------------------------------------------------------
    // SERVER LOG
    // --------------------------------------------------------

    const status =
      Number(
        err?.status ||
        500
      );

    const safeStatus =
      status >= 400 &&
      status <= 599
        ? status
        : 500;

    const rawMessage =
      String(
        err?.message ||
        "unknown"
      ).slice(
        0,
        500
      );

    console.error(
      "request failed",
      safeStatus,
      rawMessage
    );

    // --------------------------------------------------------
    // ERROR RESPONSE
    //
    // Untuk sementara pesan asli dikirim agar akar error
    // backend dapat diketahui. Tidak mengirim:
    // - API key
    // - Authorization header
    // - request body
    // --------------------------------------------------------

    return json(
      {
        success:
          false,

        error:
          rawMessage,

        status:
          safeStatus
      },
      safeStatus,
      env
    );
  }
}
