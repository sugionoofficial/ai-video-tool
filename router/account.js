import {
  HttpError,
  json
} from "../lib/http.js";

import {
  requireUser
} from "../auth/auth.js";

import {
  ensureUserRole,
  isValidRole,
  isAdminRole
} from "../auth/role.js";

import {
  sb
} from "../lib/supabase.js";

import {
  accountApi
} from "./router/account.js";

/*
 * ============================================================
 * ACCOUNT
 * ============================================================
 *
 * PERBAIKAN UTAMA:
 * - Role diambil berdasarkan UID.
 * - Role user/admin/owner.
 * - Owner dianggap admin.
 * - roleValidated dikirim ke frontend.
 * ============================================================
 */

export async function accountApi(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  const creditRows =
    await rowsForAccount(
      user.id,
      env
    );

  const role =
    await ensureUserRole(
      user.id,
      env
    );

  const roleValidated =
    isValidRole(
      role
    );

  const isAdmin =
    isAdminRole(
      role
    );

  const contactRes =
    await sb(
      "/rest/v1/app_settings?setting_key=eq.admin_contact_url&select=setting_value",
      {},
      env
    );

  const contactRows =
    contactRes.ok
      ? await contactRes.json()
      : [];

  return json(
    {
      success:
        true,

      user: {
        id:
          user.id,

        email:
          user.email ||
          null
      },

      credits:
        Number(
          creditRows?.[0]
            ?.credits ||
            0
        ),

      role,

      roleValidated,

      isAdmin,

      adminContactUrl:
        contactRows?.[0]
          ?.setting_value ||
        ""
    },
    200,
    env
  );
}

async function rowsForAccount(
  userId,
  env
) {
  const res =
    await sb(
      `/rest/v1/user_credits?user_id=eq.${encodeURIComponent(
        userId
      )}&select=credits`,
      {},
      env
    );

  if (
    !res.ok
  ) {
    throw new HttpError(
      "Gagal mengambil credit.",
      500
    );
  }

  return await res.json();
}
