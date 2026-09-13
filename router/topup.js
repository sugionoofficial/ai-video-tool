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
 *
 * User dapat:
 * - Melihat request top-up miliknya sendiri.
 * - Membuat satu request top-up pending.
 *
 * Keamanan:
 * - User wajib login.
 * - user_id selalu berasal dari token authenticated user.
 * - Tidak menerima user_id dari request client.
 * - Maksimal satu request pending per user.
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


  // ==========================================================
  // GET
  // ==========================================================

  if (
    request.method ===
    "GET"
  ) {

    const rawLimit =
      url.searchParams.get(
        "limit"
      );


    let limit =
      Number.parseInt(
        rawLimit || "20",
        10
      );


    /*
     * Nilai limit tidak valid menggunakan default 20.
     */

    if (
      !Number.isFinite(
        limit
      )
    ) {
      limit = 20;
    }


    limit =
      Math.min(
        50,
        Math.max(
          1,
          limit
        )
      );


    const r =
      await sb(
        `/rest/v1/credit_topup_requests?user_id=eq.${encodeURIComponent(
          user.id
        )}&select=id,amount,note,status,admin_note,created_at,reviewed_at&order=created_at.desc&limit=${limit}`,
        {
          headers: {
            Accept:
              "application/json"
          }
        },
        env
      );


    if (
      !r.ok
    ) {

      const data =
        await safeJson(
          r
        );


      console.error(
        "topup request query failed",
        data
      );


      throw new HttpError(
        "Gagal mengambil request top-up.",
        500
      );
    }


    const requests =
      await r.json();


    return json(
      {
        success:
          true,

        requests:
          Array.isArray(
            requests
          )
            ? requests
            : []
      },
      200,
      env
    );
  }


  // ==========================================================
  // POST
  // ==========================================================

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
        body?.amount
      );


    const note =
      String(
        body?.note || ""
      )
        .trim()
        .slice(
          0,
          500
        );


    // --------------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------------

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


    // ========================================================
    // CHECK PENDING REQUEST
    // ========================================================

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


    // ========================================================
    // CREATE REQUEST
    // ========================================================

    const r =
      await sb(
        "/rest/v1/credit_topup_requests",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

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

      const data =
        await safeJson(
          r
        );


      /*
       * Pengecekan pending di atas tidak cukup untuk
       * race condition.
       *
       * Contoh:
       * Request A -> check pending -> kosong
       * Request B -> check pending -> kosong
       * Request A -> insert
       * Request B -> insert
       *
       * Database harus memiliki unique partial index
       * untuk pending request per user.
       *
       * Jika database menolak duplicate request dengan
       * status conflict, kembalikan 409.
       */

      if (
        r.status ===
        409
      ) {

        throw new HttpError(
          "Anda masih memiliki request top-up yang menunggu diproses.",
          409
        );
      }


      throw new HttpError(
        apiError(
          data,
          "Gagal membuat request top-up."
        ),
        r.status >= 400 &&
        r.status <= 599
          ? r.status
          : 500
      );
    }


    const created =
      await r.json();


    return json(
      {
        success:
          true,

        request:
          Array.isArray(
            created
          )
            ? (
                created[0] ||
                null
              )
            : null
      },
      201,
      env
    );
  }


  // ==========================================================
  // METHOD NOT ALLOWED
  // ==========================================================

  throw new HttpError(
    "Method tidak didukung.",
    405
  );
}


// ============================================================
// DATABASE ROW HELPER
// ============================================================

async function rows(
  path,
  env
) {

  const res =
    await sb(
      path,
      {
        headers: {
          Accept:
            "application/json"
        }
      },
      env
    );


  if (
    !res.ok
  ) {

    const data =
      await safeJson(
        res
      );


    console.error(
      "topup database query failed",
      data
    );


    throw new HttpError(
      "Gagal mengambil data.",
      500
    );
  }


  const data =
    await res.json();


  return Array.isArray(
    data
  )
    ? data
    : [];
}
