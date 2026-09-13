import {
  HttpError,
  json,
  safeJson
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

const MAX_CREDITS = 1_000_000_000;

function normalizeUserId(userId) {
  return String(
    userId || ""
  ).trim();
}

function normalizeCredits(value) {
  const credits =
    Number(value);

  if (
    !Number.isFinite(credits) ||
    credits < 0
  ) {
    return 0;
  }

  return Math.min(
    MAX_CREDITS,
    Math.floor(credits)
  );
}

async function readRows(response) {
  const data =
    await safeJson(
      response
    );

  return Array.isArray(data)
    ? data
    : [];
}

function normalizeContactUrl(value) {
  const url =
    String(
      value || ""
    ).trim();

  if (!url) {
    return "";
  }

  if (
    !/^https?:\/\//i.test(url)
  ) {
    return "";
  }

  if (url.length > 2048) {
    return "";
  }

  return url;
}

export async function accountApi(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  const userId =
    normalizeUserId(
      user?.id
    );

  if (!userId) {
    throw new HttpError(
      "User tidak valid.",
      401
    );
  }

  const creditRows =
    await rowsForAccount(
      userId,
      env
    );

  const role =
    await ensureUserRole(
      userId,
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

  let adminContactUrl = "";

  const contactRes =
    await sb(
      "/rest/v1/app_settings?setting_key=eq.admin_contact_url&select=setting_value&limit=1",
      {
        headers: {
          Accept:
            "application/json"
        }
      },
      env
    );

  if (contactRes.ok) {
    const contactRows =
      await readRows(
        contactRes
      );

    adminContactUrl =
      normalizeContactUrl(
        contactRows?.[0]
          ?.setting_value
      );
  } else {
    console.error(
      "admin contact lookup failed",
      await safeJson(
        contactRes
      )
    );
  }

  return json(
    {
      success:
        true,

      user: {
        id:
          userId,

        email:
          user.email ||
          null
      },

      credits:
        normalizeCredits(
          creditRows?.[0]
            ?.credits
        ),

      role,

      roleValidated,

      isAdmin,

      adminContactUrl
    },
    200,
    env
  );
}

async function rowsForAccount(
  userId,
  env
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    throw new HttpError(
      "User ID tidak valid.",
      400
    );
  }

  const res =
    await sb(
      `/rest/v1/user_credits?user_id=eq.${encodeURIComponent(
        normalizedUserId
      )}&select=credits&limit=1`,
      {
        headers: {
          Accept:
            "application/json"
        }
      },
      env
    );

  if (!res.ok) {
    console.error(
      "account credit lookup failed",
      await safeJson(
        res
      )
    );

    throw new HttpError(
      "Gagal mengambil credit.",
      500
    );
  }

  return await readRows(
    res
  );
}
