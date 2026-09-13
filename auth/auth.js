import { HttpError } from "../lib/http.js";

const AUTH_TIMEOUT_MS = 10000;

function getSupabaseConfig(env) {
  const baseUrl =
    String(env?.SUPABASE_URL || "")
      .trim()
      .replace(/\/+$/, "");

  const serviceRoleKey =
    String(env?.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!baseUrl) {
    throw new HttpError(
      "Konfigurasi SUPABASE_URL belum tersedia.",
      500
    );
  }

  if (!serviceRoleKey) {
    throw new HttpError(
      "Konfigurasi Supabase server belum tersedia.",
      500
    );
  }

  return {
    baseUrl,
    serviceRoleKey
  };
}

function getBearerToken(request) {
  const authorization =
    String(
      request?.headers?.get("Authorization") || ""
    ).trim();

  if (!/^Bearer\s+/i.test(authorization)) {
    return null;
  }

  const token =
    authorization
      .replace(/^Bearer\s+/i, "")
      .trim();

  return token || null;
}

async function readUserResponse(response) {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    const data =
      JSON.parse(text);

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function currentUser(request, env) {
  const token =
    getBearerToken(request);

  if (!token) {
    return null;
  }

  const {
    baseUrl,
    serviceRoleKey
  } = getSupabaseConfig(env);

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      AUTH_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        `${baseUrl}/auth/v1/user`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            apikey: serviceRoleKey,
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        }
      );

    if (!response.ok) {
      return null;
    }

    const user =
      await readUserResponse(response);

    if (!user?.id) {
      return null;
    }

    return user;
  } catch (error) {
    console.error(
      "Supabase authentication request failed:",
      error?.message || error
    );

    return null;
  } finally {
    clearTimeout(timeout);
  }
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
