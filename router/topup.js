import {
  HttpError,
  json,
  requireJsonContentType,
  readJson,
  safeJson,
  apiError
} from "../lib/http.js";

import {
  requireUser
} from "../auth/auth.js";

import {
  sb
} from "../lib/supabase.js";

/*
 * ============================================================
 * TOPUP
 * ============================================================
 */

export async function topupApi(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  const url =
    new URL(
      request.url
    );

  if (
    request.method ===
    "GET"
  ) {
    const limit =
      Math.min(
        50,
        Math.max(
          1,
          Number(
            url.searchParams.get(
              "limit"
            ) || 20
          )
        )
      );

    const r =
      await sb(
        `/rest/v1/credit_topup_requests?user_id=eq.${encodeURIComponent(
          user.id
        )}&select=id,amount,note,status,admin_note,created_at,reviewed_at&order=created_at.desc&limit=${limit}`,
        {},
        env
      );

    if (
      !r.ok
    ) {
      throw new HttpError(
        "Gagal mengambil request top-up.",
        500
      );
    }

    return json(
      {
        success:
          true,

        requests:
          await r.json()
      },
      200,
      env
    );
  }

  if (
    request.method ===
    "POST"
  ) {
    requireJsonContentType(
      request
    );

    const body =
      await readJson(
        request
      );

    const amount =
      Number(
        body.amount
      );

    const note =
      String(
        body.note ||
          ""
      )
        .trim()
        .slice(
          0,
          500
        );

    if (
      !Number.isInteger(
        amount
      ) ||
      amount <= 0 ||
      amount > 1000000
    ) {
      throw new HttpError(
        "Jumlah top-up harus integer antara 1 dan 1.000.000.",
        400
      );
    }

    const pending =
      await rows(
        `/rest/v1/credit_topup_requests?user_id=eq.${encodeURIComponent(
          user.id
        )}&status=eq.pending&select=id&limit=1`,
        env
      );

    if (
      pending.length
    ) {
      throw new HttpError(
        "Anda masih memiliki request top-up yang menunggu diproses.",
        409
      );
    }

    const r =
      await sb(
        "/rest/v1/credit_topup_requests",
        {
          method:
            "POST",

          headers: {
            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify({
              user_id:
                user.id,

              amount,

              note
            })
        },
        env
      );

    if (
      !r.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            r
          ),
          "Gagal membuat request top-up."
        ),
        r.status
      );
    }

    return json(
      {
        success:
          true,

        request:
          (
            await r.json()
          )?.[0] ||
          null
      },
      201,
      env
    );
  }

  throw new HttpError(
    "Method tidak didukung.",
    405
  );
}
