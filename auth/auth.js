import { HttpError } from "../lib/http.js";

export async function currentUser(request, env) {
  const auth =
    request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    return null;
  }

  const token =
    auth.slice(7).trim();

  if (!token) {
    return null;
  }

  const res =
    await fetch(
      `${env.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey:
            env.SUPABASE_SERVICE_ROLE_KEY,

          Authorization:
            `Bearer ${token}`
        }
      }
    );

  return res.ok
    ? await res.json()
    : null;
}

export async function requireUser(request, env) {
  const user =
    await currentUser(
      request,
      env
    );

  if (!user?.id) {
    throw new HttpError(
      "Unauthorized",
      401
    );
  }

  return user;
}
