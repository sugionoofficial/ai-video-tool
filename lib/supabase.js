function getSupabaseConfig(
  env
) {
  const baseUrl =
    String(
      env?.SUPABASE_URL ||
      ""
    ).trim();

  const serviceRoleKey =
    String(
      env?.SUPABASE_SERVICE_ROLE_KEY ||
      ""
    ).trim();


  /* ==========================================================
  CONFIG VALIDATION
  ========================================================== */

  if (
    !baseUrl
  ) {
    throw new Error(
      "SUPABASE_URL belum dikonfigurasi."
    );
  }

  if (
    !serviceRoleKey
  ) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi."
    );
  }


  /* ==========================================================
  URL VALIDATION
  ========================================================== */

  let parsedUrl;

  try {
    parsedUrl =
      new URL(
        baseUrl
      );
  } catch {
    throw new Error(
      "SUPABASE_URL tidak valid."
    );
  }


  /*
   * Supabase production wajib HTTPS.
   * HTTP sengaja ditolak agar service-role key
   * tidak pernah dikirim melalui koneksi plaintext.
   */
  if (
    parsedUrl.protocol !==
    "https:"
  ) {
    throw new Error(
      "SUPABASE_URL harus menggunakan HTTPS."
    );
  }


  /*
   * URL Supabase harus berupa origin dasar.
   * Path tambahan tidak diperlukan karena endpoint
   * REST ditambahkan oleh fungsi sb().
   */
  const normalizedBaseUrl =
    parsedUrl.origin.replace(
      /\/+$/,
      ""
    );


  if (
    !normalizedBaseUrl
  ) {
    throw new Error(
      "SUPABASE_URL tidak valid."
    );
  }


  return {
    baseUrl:
      normalizedBaseUrl,

    serviceRoleKey
  };
}


/* ============================================================
SUPABASE HEADERS
============================================================ */

export function sbHeaders(
  env
) {
  const {
    serviceRoleKey
  } =
    getSupabaseConfig(
      env
    );

  return {
    apikey:
      serviceRoleKey,

    Authorization:
      `Bearer ${serviceRoleKey}`,

    "Content-Type":
      "application/json",

    Accept:
      "application/json"
  };
}


/* ============================================================
SUPABASE REQUEST
============================================================ */

export async function sb(
  path,
  options = {},
  env
) {
  const {
    baseUrl,
    serviceRoleKey
  } =
    getSupabaseConfig(
      env
    );


  /* ==========================================================
  PATH VALIDATION
  ========================================================== */

  const requestPath =
    String(
      path || ""
    ).trim();

  if (
    !requestPath.startsWith(
      "/"
    )
  ) {
    throw new Error(
      "Supabase request path tidak valid."
    );
  }


  /*
   * Tolak absolute URL.
   *
   * Contoh yang tidak boleh:
   * https://attacker.example/...
   *
   * sb() hanya boleh berbicara dengan host
   * Supabase yang sudah dikonfigurasi.
   */
  if (
    requestPath.includes(
      "://"
    ) ||
    requestPath.startsWith(
      "//"
    )
  ) {
    throw new Error(
      "Supabase request path tidak valid."
    );
  }


  /* ==========================================================
  OPTIONS VALIDATION
  ========================================================== */

  const safeOptions =
    options &&
    typeof options ===
      "object" &&
    !Array.isArray(
      options
    )
      ? options
      : {};


  /* ==========================================================
  CALLER HEADERS
  ========================================================== */

  const callerHeaders =
    safeOptions.headers &&
    typeof safeOptions.headers ===
      "object" &&
    !Array.isArray(
      safeOptions.headers
    )
      ? safeOptions.headers
      : {};


  /*
   * Credential dipasang paling akhir.
   *
   * Caller tidak dapat menimpa:
   * - apikey
   * - Authorization
   */
  const headers = {
    ...callerHeaders,

    apikey:
      serviceRoleKey,

    Authorization:
      `Bearer ${serviceRoleKey}`
  };


  /* ==========================================================
  FETCH
  ========================================================== */

  return fetch(
    `${baseUrl}${requestPath}`,
    {
      ...safeOptions,

      headers
    }
  );
}
