import {
  HttpError,
  json,
  safeJson
} from "../lib/http.js";

import {
  requireUser
} from "../auth/auth.js";

import {
  sb
} from "../lib/supabase.js";


/*
 * ============================================================
 * TRANSACTIONS
 * ============================================================
 *
 * Menampilkan riwayat transaksi credit milik user yang sedang
 * login.
 *
 * Keamanan:
 * - User wajib terautentikasi.
 * - Query selalu difilter berdasarkan user.id dari token.
 * - Tidak menerima user_id dari query parameter.
 * - Tidak pernah mengembalikan transaksi user lain.
 *
 * Pagination:
 * - Default: 30
 * - Minimum: 1
 * - Maximum: 100
 * - Nilai tidak valid kembali menggunakan default.
 * ============================================================
 */

export async function transactionApi(
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


  // ----------------------------------------------------------
  // NORMALIZE LIMIT
  // ----------------------------------------------------------

  const rawLimit =
    url.searchParams.get(
      "limit"
    );


  let limit =
    Number.parseInt(
      rawLimit || "30",
      10
    );


  /*
   * Jika limit bukan angka valid, gunakan default.
   *
   * Contoh:
   * ?limit=abc
   * ?limit=
   * ?limit=null
   * ?limit=hello
   *
   * semuanya menjadi 30.
   */

  if (
    !Number.isFinite(
      limit
    )
  ) {
    limit = 30;
  }


  limit =
    Math.min(
      100,
      Math.max(
        1,
        limit
      )
    );


  // ==========================================================
  // QUERY TRANSACTIONS
  // ==========================================================

  const txRows =
    await sb(
      `/rest/v1/credit_transactions?user_id=eq.${encodeURIComponent(
        user.id
      )}&select=id,amount,balance_after,type,reference_id,note,created_at&order=created_at.desc&limit=${limit}`,
      {
        headers: {
          Accept:
            "application/json"
        }
      },
      env
    );


  if (
    !txRows.ok
  ) {

    const data =
      await safeJson(
        txRows
      );


    /*
     * Jangan kirim response Supabase mentah ke client.
     * Detail internal database cukup masuk log server.
     */

    console.error(
      "credit transaction query failed",
      data
    );


    throw new HttpError(
      "Gagal mengambil riwayat credit.",
      500
    );
  }


  const transactions =
    await txRows.json();


  return json(
    {
      success:
        true,

      transactions:
        Array.isArray(
          transactions
        )
          ? transactions
          : []
    },
    200,
    env
  );
}
