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
  adapterInfo
} from "../providers/provider-utils.js";

import {
  publicProvider
} from "../providers/provider-service.js";

export async function router(
  request,
  env,
  ctx
) {
  if (
    request.method ===
    "OPTIONS"
  ) {
    return new Response(
      null,
      {
        status:
          204,

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
    /*
     * --------------------------------------------------------
     * CONFIG
     * --------------------------------------------------------
     */

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

    /*
     * --------------------------------------------------------
     * DIAGNOSTIC
     * --------------------------------------------------------
     */

    if (
      url.pathname ===
        "/api/diagnostic" &&
      request.method ===
        "GET"
    ) {
      const res =
        await sb(
          "/rest/v1/providers?select=id,name,adapter,enabled,api_key",
          {},
          env
        );

      const providers =
        res.ok
          ? await res.json()
          : [];

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
            providers.map(
              provider => ({
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

                configured:
                  Boolean(
                    provider.api_key
                  ),

                adapterSupported:
                  Boolean(
                    adapterInfo(
                      provider.adapter
                    )
                  )
              })
            ),

          timestamp:
            new Date()
              .toISOString()
        },
        200,
        env
      );
    }

    /*
     * --------------------------------------------------------
     * PUBLIC PROVIDERS
     * --------------------------------------------------------
     */

    if (
      url.pathname ===
        "/api/providers" &&
      request.method ===
        "GET"
    ) {
      const res =
        await sb(
          "/rest/v1/providers?enabled=eq.true&select=id,name,adapter,enabled,api_key&order=name.asc",
          {},
          env
        );

      if (
        !res.ok
      ) {
        throw new HttpError(
          "Gagal mengambil daftar provider.",
          500
        );
      }

      const providers =
        await res.json();

      return json(
        {
          success:
            true,

          providers:
            providers
              .filter(
                provider =>
                  provider.api_key &&
                  adapterInfo(
                    provider.adapter
                  )
              )
              .map(
                publicProvider
              )
        },
        200,
        env
      );
    }

    /*
     * --------------------------------------------------------
     * ADMIN
     * --------------------------------------------------------
     */

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

    /*
     * --------------------------------------------------------
     * DASHBOARD REFERENCES
     * --------------------------------------------------------
     */

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

    /*
     * --------------------------------------------------------
     * ACCOUNT
     * --------------------------------------------------------
     */

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

    /*
     * --------------------------------------------------------
     * TRANSACTIONS
     * --------------------------------------------------------
     */

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

    /*
     * --------------------------------------------------------
     * TOPUP
     * --------------------------------------------------------
     */

    if (
      url.pathname ===
      "/api/account/topup-requests"
    ) {
      return await topupApi(
        request,
        env
      );
    }

    /*
     * --------------------------------------------------------
     * GENERATE
     * --------------------------------------------------------
     */

    if (
      url.pathname ===
        "/api/generate" &&
      request.method ===
        "POST"
    ) {
      const contentLength =
        Number(
          request.headers.get(
            "content-length"
          ) || 0
        );

      if (
        contentLength >
        65536
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

    /*
     * --------------------------------------------------------
     * GENERATE STATUS
     * --------------------------------------------------------
     */

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

    /*
     * --------------------------------------------------------
     * VIDEO
     * --------------------------------------------------------
     */

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

    /*
     * --------------------------------------------------------
     * STATIC ASSETS
     * --------------------------------------------------------
     */

    if (
      env.ASSETS
    ) {
      return await env.ASSETS.fetch(
        request
      );
    }

    throw new HttpError(
      "Route tidak ditemukan.",
      404
    );
  } catch (
    err
  ) {
    console.error(
      "request failed",
      Number(
        err?.status ||
          500
      ),
      String(
        err?.message ||
          "unknown"
      ).slice(
        0,
        300
      )
    );

    const status =
      Number(
        err?.status ||
          500
      );

    const message =
      status >= 500
        ? "Internal Worker error."
        : (
            err?.message ||
            "Request error."
          );

    return json(
      {
        success:
          false,

        error:
          message
      },
      status,
      env
    );
  }
}
