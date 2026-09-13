import {
  HttpError,
  safeJson
} from "../lib/http.js";

import {
  sb
} from "../lib/supabase.js";

import {
  requireUser
} from "./auth.js";

const VALID_ROLES = [
  "user",
  "admin",
  "owner"
];

function normalizeRole(role) {
  return String(
    role || ""
  )
    .trim()
    .toLowerCase();
}

function normalizeUserId(userId) {
  return String(
    userId || ""
  ).trim();
}

async function readRoleRows(response) {
  const data =
    await safeJson(
      response
    );

  if (!Array.isArray(data)) {
    return [];
  }

  return data;
}

export function isValidRole(role) {
  return VALID_ROLES.includes(
    normalizeRole(role)
  );
}

export function isAdminRole(role) {
  const normalized =
    normalizeRole(role);

  return (
    normalized === "admin" ||
    normalized === "owner"
  );
}

export async function getUserRole(
  userId,
  env
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    return null;
  }

  const res =
    await sb(
      `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(
        normalizedUserId
      )}&select=user_id,role&limit=1`,
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
      "getUserRole failed",
      await safeJson(
        res
      )
    );

    return null;
  }

  const roleRows =
    await readRoleRows(
      res
    );

  const role =
    normalizeRole(
      roleRows?.[0]?.role
    );

  return isValidRole(
    role
  )
    ? role
    : null;
}

export async function ensureUserRole(
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

  let role =
    await getUserRole(
      normalizedUserId,
      env
    );

  if (role) {
    return role;
  }

  const createRole =
    await sb(
      "/rest/v1/user_roles",
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          Prefer:
            "resolution=ignore-duplicates,return=representation"
        },

        body: JSON.stringify({
          user_id:
            normalizedUserId,

          role:
            "user"
        })
      },
      env
    );

  if (!createRole.ok) {
    role =
      await getUserRole(
        normalizedUserId,
        env
      );

    if (role) {
      return role;
    }

    console.error(
      "ensureUserRole failed",
      await safeJson(
        createRole
      )
    );

    throw new HttpError(
      "Gagal membuat role user.",
      500
    );
  }

  role =
    await getUserRole(
      normalizedUserId,
      env
    );

  return (
    role ||
    "user"
  );
}

export async function requireAdmin(
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

  const res =
    await sb(
      `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(
        userId
      )}&role=in.(admin,owner)&select=user_id,role&limit=1`,
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
      "role admin check failed",
      await safeJson(
        res
      )
    );

    throw new HttpError(
      "Gagal memeriksa role admin.",
      500
    );
  }

  const roleRows =
    await readRoleRows(
      res
    );

  const role =
    normalizeRole(
      roleRows?.[0]?.role
    );

  if (
    !isAdminRole(
      role
    )
  ) {
    throw new HttpError(
      "Akses admin ditolak.",
      403
    );
  }

  return {
    ...user,
    role
  };
}
