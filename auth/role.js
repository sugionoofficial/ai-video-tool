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

export function isValidRole(role) {
  return VALID_ROLES.includes(
    String(
      role || ""
    ).toLowerCase()
  );
}

export function isAdminRole(role) {
  return (
    role === "admin" ||
    role === "owner"
  );
}

export async function getUserRole(
  userId,
  env
) {
  if (!userId) {
    return null;
  }

  const res =
    await sb(
      `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(
        userId
      )}&select=user_id,role&limit=1`,
      {},
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
    await res.json();

  const role =
    roleRows?.[0]?.role ||
    null;

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
  if (!userId) {
    throw new HttpError(
      "User ID tidak valid.",
      400
    );
  }

  let role =
    await getUserRole(
      userId,
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
          Prefer:
            "resolution=ignore-duplicates,return=representation"
        },

        body: JSON.stringify({
          user_id:
            userId,

          role:
            "user"
        })
      },
      env
    );

  if (!createRole.ok) {
    role =
      await getUserRole(
        userId,
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
      userId,
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

  const res =
    await sb(
      `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(
        user.id
      )}&role=in.(admin,owner)&select=user_id,role&limit=1`,
      {},
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
    await res.json();

  const role =
    roleRows?.[0]?.role ||
    null;

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
