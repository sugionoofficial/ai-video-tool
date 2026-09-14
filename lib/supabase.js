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
NORMALIZE PATH
============================================================ */

function normalizePath(
  path
) {
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


  return requestPath;
}


/* ============================================================
NORMALIZE OPTIONS
============================================================ */

function normalizeOptions(
  options
) {
  return (
    options &&
    typeof options ===
      "object" &&
    !Array.isArray(
      options
    )
  )
    ? options
    : {};
}


/* ============================================================
CALLER HEADERS
============================================================ */

function normalizeCallerHeaders(
  options
) {
  const callerHeaders =
    options.headers &&
    typeof options.headers ===
      "object" &&
    !Array.isArray(
      options.headers
    )
      ? options.headers
      : {};

  return {
    ...callerHeaders
  };
}


/* ============================================================
SUPABASE REQUEST HEADERS
============================================================ */

function buildHeaders(
  env,
  options,
  forceJson
) {
  const {
    serviceRoleKey
  } =
    getSupabaseConfig(
      env
    );

  const safeOptions =
    normalizeOptions(
      options
    );

  const headers =
    normalizeCallerHeaders(
      safeOptions
    );


  if (
    forceJson &&
    safeOptions.body !==
      undefined &&
    safeOptions.body !==
      null
  ) {
    headers[
      "Content-Type"
    ] =
      "application/json";

    headers[
      "Accept"
    ] =
      headers[
        "Accept"
      ] ||
      "application/json";
  }


  /*
   * Credential dipasang paling akhir.
   *
   * Caller tidak dapat menimpa:
   * - apikey
   * - Authorization
   */
  headers.apikey =
    serviceRoleKey;

  headers.Authorization =
    `Bearer ${serviceRoleKey}`;


  return headers;
}


/* ============================================================
SUPABASE JSON REQUEST
============================================================ */

export async function sb(
  path,
  options = {},
  env
) {
  const {
    baseUrl
  } =
    getSupabaseConfig(
      env
    );

  const requestPath =
    normalizePath(
      path
    );

  const safeOptions =
    normalizeOptions(
      options
    );

  const headers =
    buildHeaders(
      env,
      safeOptions,
      true
    );


  return fetch(
    `${baseUrl}${requestPath}`,
    {
      ...safeOptions,

      headers
    }
  );
}


/* ============================================================
SUPABASE RAW / BINARY REQUEST
============================================================

Digunakan untuk:

- Supabase Storage upload
- image reference
- video reference
- binary response
- multipart/binary request

Berbeda dengan sb(), fungsi ini TIDAK memaksa
Content-Type menjadi application/json.

Credential Supabase tetap dipasang oleh backend.
============================================================ */

export async function sbRaw(
  path,
  options = {},
  env
) {
  const {
    baseUrl
  } =
    getSupabaseConfig(
      env
    );

  const requestPath =
    normalizePath(
      path
    );

  const safeOptions =
    normalizeOptions(
      options
    );

  const headers =
    buildHeaders(
      env,
      safeOptions,
      false
    );


  return fetch(
    `${baseUrl}${requestPath}`,
    {
      ...safeOptions,

      headers
    }
  );
}


/* ============================================================
SUPABASE STORAGE UPLOAD
============================================================

Helper khusus upload object ke Supabase Storage.

Contoh:

await sbStorageUpload(
  "reference-media",
  "user-id/image.jpg",
  arrayBuffer,
  "image/jpeg",
  env
);

Return:

{
  response,
  path,
  publicUrl
}

Bucket harus dibuat public oleh caller jika URL
akan diberikan kepada provider AI eksternal seperti
Agnes.
============================================================ */

export async function sbStorageUpload(
  bucket,
  objectPath,
  data,
  contentType,
  env
) {
  const normalizedBucket =
    String(
      bucket || ""
    ).trim();

  const normalizedObjectPath =
    String(
      objectPath || ""
    )
      .trim()
      .replace(
        /^\/+/,
        ""
      );


  if (
    !normalizedBucket
  ) {
    throw new Error(
      "Supabase Storage bucket tidak boleh kosong."
    );
  }

  if (
    !normalizedObjectPath
  ) {
    throw new Error(
      "Supabase Storage object path tidak boleh kosong."
    );
  }


  const encodedPath =
    normalizedObjectPath
      .split("/")
      .map(
        part =>
          encodeURIComponent(
            part
          )
      )
      .join("/");


  const response =
    await sbRaw(
      `/storage/v1/object/${encodeURIComponent(
        normalizedBucket
      )}/${encodedPath}`,
      {
        method:
          "POST",

        body:
          data,

        headers: {

          "Content-Type":
            String(
              contentType ||
              "application/octet-stream"
            ),

          "x-upsert":
            "true",

          Accept:
            "application/json"

        }

      },
      env
    );


  if (
    !response.ok
  ) {
    const errorText =
      await response
        .text()
        .catch(
          () => ""
        );

    throw new Error(
      `Supabase Storage upload gagal (${response.status}): ${errorText.slice(
        0,
        500
      )}`
    );
  }


  const {
    baseUrl
  } =
    getSupabaseConfig(
      env
    );


  const publicUrl =
    `${baseUrl}/storage/v1/object/public/${encodeURIComponent(
      normalizedBucket
    )}/${encodedPath}`;


  return {

    response,

    path:
      normalizedObjectPath,

    publicUrl

  };
}


/* ============================================================
SUPABASE STORAGE BUCKET
============================================================

Membuat bucket apabila belum tersedia.

Tidak mengganti bucket yang sudah ada.

Caller dapat menggunakan:

await sbStorageEnsurePublicBucket(
  "reference-media",
  env
);

============================================================ */

export async function sbStorageEnsurePublicBucket(
  bucket,
  env
) {
  const normalizedBucket =
    String(
      bucket || ""
    ).trim();


  if (
    !normalizedBucket
  ) {
    throw new Error(
      "Supabase Storage bucket tidak boleh kosong."
    );
  }


  const response =
    await sbRaw(
      "/storage/v1/bucket",
      {
        method:
          "POST",

        body:
          JSON.stringify({

            id:
              normalizedBucket,

            name:
              normalizedBucket,

            public:
              true

          }),

        headers: {

          "Content-Type":
            "application/json",

          Accept:
            "application/json"

        }

      },
      env
    );


  /*
   * 200/201 = bucket berhasil dibuat.
   *
   * 400/409 bisa berarti bucket sudah ada.
   * Kita tidak menganggap ini fatal karena bucket
   * mungkin memang sudah dibuat sebelumnya.
   */
  if (
    response.ok
  ) {
    return true;
  }


  if (
    response.status ===
      400 ||
    response.status ===
      409
  ) {
    return true;
  }


  const errorText =
    await response
      .text()
      .catch(
        () => ""
      );


  throw new Error(
    `Supabase Storage bucket gagal dibuat (${response.status}): ${errorText.slice(
      0,
      500
    )}`
  );
}
