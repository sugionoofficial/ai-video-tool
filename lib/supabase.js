function getSupabaseConfig(env) {
  const baseUrl =
    String(
      env?.SUPABASE_URL || ""
    ).trim();

  const serviceRoleKey =
    String(
      env?.SUPABASE_SERVICE_ROLE_KEY || ""
    ).trim();

  if (!baseUrl) {
    throw new Error(
      "SUPABASE_URL belum dikonfigurasi."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi."
    );
  }

  let parsedUrl;

  try {
    parsedUrl =
      new URL(baseUrl);
  } catch {
    throw new Error(
      "SUPABASE_URL tidak valid."
    );
  }

  if (
    ![
      "https:",
      "http:"
    ].includes(
      parsedUrl.protocol
    )
  ) {
    throw new Error(
      "SUPABASE_URL harus menggunakan HTTP atau HTTPS."
    );
  }

  return {
    baseUrl:
      baseUrl.replace(
        /\/+$/,
        ""
      ),

    serviceRoleKey
  };
}

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
      "application/json"
  };
}

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

  const safeOptions =
    options &&
    typeof options === "object" &&
    !Array.isArray(options)
      ? options
      : {};

  /*
   * Header dari caller boleh menambahkan atau
   * mengubah Content-Type/Accept/Prefer, tetapi
   * credential Supabase selalu dipasang terakhir.
   *
   * Dengan demikian Authorization/apikey tidak
   * dapat tertimpa secara tidak sengaja oleh caller.
   */
  const callerHeaders =
    safeOptions.headers &&
    typeof safeOptions.headers ===
      "object"
      ? safeOptions.headers
      : {};

  return fetch(
    `${baseUrl}${requestPath}`,
    {
      ...safeOptions,

      headers: {
        ...callerHeaders,

        apikey:
          getSupabaseConfig(
            env
          ).serviceRoleKey,

        Authorization:
          `Bearer ${
            getSupabaseConfig(
              env
            ).serviceRoleKey
          }`
      }
    }
  );
}
