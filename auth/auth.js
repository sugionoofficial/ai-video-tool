import {
  HttpError
} from "../lib/http.js";

const AUTH_TIMEOUT_MS =
  10000;

const MAX_TOKEN_LENGTH =
  8192;

const MAX_USER_ID_LENGTH =
  256;

function getSupabaseConfig(env) {
  const rawBaseUrl =
    String(
      env?.SUPABASE_URL || ""
    ).trim();

  const serviceRoleKey =
    String(
      env?.SUPABASE_SERVICE_ROLE_KEY || ""
    ).trim();

  if (!rawBaseUrl) {
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

  let parsedUrl;

  try {
    parsedUrl =
      new URL(rawBaseUrl);
  } catch {
    throw new HttpError(
      "Konfigurasi SUPABASE_URL tidak valid.",
      500
    );
  }

  if (
    parsedUrl.protocol !==
    "https:"
  ) {
    throw new HttpError(
      "Konfigurasi SUPABASE_URL harus menggunakan HTTPS.",
      500
    );
  }

  const baseUrl =
    parsedUrl.origin.replace(
      /\/+$/,
      ""
    );

  if (!baseUrl) {
    throw new HttpError(
      "Konfigurasi SUPABASE_URL tidak valid.",
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
      request?.headers?.get(
        "Authorization"
      ) || ""
    ).trim();

  if (
    !/^Bearer\s+/i.test(
      authorization
    )
  ) {
    return null;
  }

  const token =
    authorization
      .replace(
        /^Bearer\s+/i,
        ""
      )
      .trim();

  if (!token) {
    return null;
  }

  if (
    token.length >
    MAX_TOKEN_LENGTH
  ) {
    return null;
  }

  return token;
}

function isValidUserId(value) {
  const id =
    String(
      value ?? ""
    ).trim();

  if (
    !id ||
    id.length >
      MAX_USER_ID_LENGTH
  ) {
    return false;
  }

  return true;
}

async function readUserResponse(
  response
) {
  let text = "";

  try {
    text =
      await response.text();
  } catch {
    return null;
  }

  if (!text) {
    return null;
  }

  try {
    const data =
      JSON.parse(text);

    if (
      !data ||
      typeof data !==
        "object" ||
      Array.isArray(data)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function currentUser(
  request,
  env
) {
  const token =
    getBearerToken(
      request
    );

  if (!token) {
    return null;
  }

  const {
    baseUrl,
    serviceRoleKey
  } =
    getSupabaseConfig(
      env
    );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      AUTH_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        `${baseUrl}/auth/v1/user`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
            apikey:
              serviceRoleKey,
            Authorization:
              `Bearer ${token}`
          },
          signal:
            controller.signal
        }
      );

    if (!response.ok) {
      return null;
    }

    const user =
      await readUserResponse(
        response
      );

    if (
      !user ||
      !isValidUserId(
        user.id
      )
    ) {
      return null;
    }

    return user;
  } catch (error) {
    console.error(
      "Supabase authentication request failed:",
      String(
        error?.message ||
        error ||
        "unknown"
      ).slice(
        0,
        300
      )
    );

    return null;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

export async function requireUser(
  request,
  env
) {
  const user =
    await currentUser(
      request,
      env
    );

  if (
    !user ||
    !isValidUserId(
      user.id
    )
  ) {
    throw new HttpError(
      "Unauthorized",
      401
    );
  }

  return user;
}
