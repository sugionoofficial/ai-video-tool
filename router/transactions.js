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

  const limit =
    Math.min(
      100,
      Math.max(
        1,
        Number(
          url.searchParams.get(
            "limit"
          ) || 30
        )
      )
    );

  const txRows =
    await sb(
      `/rest/v1/credit_transactions?user_id=eq.${encodeURIComponent(
        user.id
      )}&select=id,amount,balance_after,type,reference_id,note,created_at&order=created_at.desc&limit=${limit}`,
      {},
      env
    );

  if (
    !txRows.ok
  ) {
    const data =
      await safeJson(
        txRows
      );

    console.error(
      "credit transaction query failed",
      data
    );

    throw new HttpError(
      "Gagal mengambil riwayat credit.",
      500
    );
  }

  return json(
    {
      success:
        true,

      transactions:
        await txRows.json()
    },
    200,
    env
  );
}
