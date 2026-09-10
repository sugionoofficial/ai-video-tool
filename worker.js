export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =====================================================
    // CORS PREFLIGHT
    // =====================================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    try {

      // ===================================================
      // DIAGNOSTIC
      // ===================================================

      if (
        url.pathname === "/api/diagnostic" &&
        request.method === "GET"
      ) {
        return json({
          success: true,
          worker: "ai-video-tool",

          supabaseConfigured:
            Boolean(
              env.SUPABASE_URL &&
              env.SUPABASE_SERVICE_ROLE_KEY
            ),

          veoConfigured:
            await providerKeyExists("veo", env),

          minimaxConfigured:
            await providerKeyExists("minimax", env),

          lumaConfigured:
            await providerKeyExists("luma", env),

          timestamp:
            new Date().toISOString()
        });
      }


      // ===================================================
      // ADMIN API
      // ===================================================

      if (
        url.pathname.startsWith("/api/admin/")
      ) {
        return await handleAdminApi(
          request,
          env
        );
      }


      // ===================================================
      // GENERATE
      // ===================================================

      if (
        url.pathname === "/api/generate" &&
        request.method === "POST"
      ) {
        return await handleGenerate(
          request,
          env
        );
      }


      // ===================================================
      // STATUS POST
      // ===================================================

      if (
        url.pathname === "/api/generate/status" &&
        request.method === "POST"
      ) {
        return await handleStatusPost(
          request,
          env
        );
      }


      // ===================================================
      // STATUS LEGACY GET
      // ===================================================

      if (
        url.pathname === "/api/generate" &&
        request.method === "GET"
      ) {
        return await handleStatus(
          request,
          env
        );
      }


      // ===================================================
      // VIDEO PROXY
      // ===================================================

      if (
        url.pathname === "/api/video" &&
        request.method === "GET"
      ) {
        return await handleVideoProxy(
          request,
          env
        );
      }


      // ===================================================
      // STATIC ASSETS
      // ===================================================

      return env.ASSETS.fetch(request);

    } catch (error) {

      console.error(
        "Worker error:",
        error?.message || error
      );

      return json({
        success: false,
        error:
          error?.message ||
          "Internal Worker error."
      }, 500);
    }
  }
};

// =========================================================
// ADMIN GET CONTACT
// =========================================================

async function adminGetContact(env) {
  const response = await supabaseRequest(
    "/rest/v1/app_settings" +
    "?setting_key=eq.admin_contact_url" +
    "&select=setting_key,setting_value",
    {
      method: "GET"
    },
    env
  );

  if (!response.ok) {
    const data = await safeJson(response);

    return json({
      success: false,
      error: extractApiError(
        data,
        "Gagal mengambil kontak admin."
      )
    }, response.status);
  }

  const rows = await response.json();

  return json({
    success: true,

    url:
      rows?.[0]?.setting_value || ""
  });
}

// =========================================================
// ADMIN SAVE CONTACT
// =========================================================

async function adminSaveContact(
  request,
  env
) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      success: false,
      error: "Request tidak valid."
    }, 400);
  }

  const url = String(
    body?.url || ""
  ).trim();

  if (url.length > 1000) {
    return json({
      success: false,
      error: "Kontak admin terlalu panjang."
    }, 400);
  }

  const response = await supabaseRequest(
    "/rest/v1/app_settings",
    {
      method: "POST",

      headers: {
        "Prefer":
          "resolution=merge-duplicates,return=minimal"
      },

      body: JSON.stringify({
        setting_key:
          "admin_contact_url",

        setting_value:
          url,

        updated_at:
          new Date().toISOString()
      })
    },
    env
  );

  if (!response.ok) {
    const data = await safeJson(response);

    return json({
      success: false,
      error: extractApiError(
        data,
        "Gagal menyimpan kontak admin."
      )
    }, response.status);
  }

  return json({
    success: true,
    message:
      "Kontak admin berhasil disimpan."
  });
}

// =========================================================
// ADMIN SAVE PROVIDER
// =========================================================

async function adminSaveProvider(
  request,
  env
) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      success: false,
      error: "Request tidak valid."
    }, 400);
  }

  const provider = String(
    body?.provider || ""
  )
    .trim()
    .toLowerCase();

  const apiKey = String(
    body?.api_key || ""
  ).trim();

  const allowed = [
    "veo",
    "minimax",
    "luma"
  ];

  if (!allowed.includes(provider)) {
    return json({
      success: false,
      error: "Provider tidak didukung."
    }, 400);
  }

  if (!apiKey) {
    return json({
      success: false,
      error: "API key wajib diisi."
    }, 400);
  }

  if (apiKey.length > 1000) {
    return json({
      success: false,
      error: "API key tidak valid."
    }, 400);
  }

  const response = await supabaseRequest(
    "/rest/v1/admin_provider_keys",
    {
      method: "POST",

      headers: {
        "Prefer":
          "resolution=merge-duplicates,return=minimal"
      },

      body: JSON.stringify({
        provider,
        api_key: apiKey,
        updated_at: new Date().toISOString()
      })
    },
    env
  );

  if (!response.ok) {
    const data = await safeJson(response);

    return json({
      success: false,
      error: extractApiError(
        data,
        "Gagal menyimpan API key provider."
      )
    }, response.status);
  }

  return json({
    success: true,
    message:
      `API key ${provider} berhasil disimpan.`
  });
}

// =========================================================
// ADMIN LIST TOPUPS
// =========================================================

async function adminListTopups(env) {
  const response = await supabaseRequest(
    "/rest/v1/topup_requests" +
    "?select=id,user_id,amount,credits,status,note,created_at,processed_at" +
    "&order=created_at.desc",
    {
      method: "GET"
    },
    env
  );

  if (!response.ok) {
    const data = await safeJson(response);

    return json({
      success: false,
      error: extractApiError(
        data,
        "Gagal mengambil daftar top up."
      )
    }, response.status);
  }

  const requests = await response.json();

  const users = await listAuthUsers(env);

  const userMap = new Map(
    users.map(user => [
      user.id,
      user
    ])
  );

  return json({
    success: true,

    topups: requests.map(item => {
      const user =
        userMap.get(item.user_id);

      return {
        id: item.id,

        user_id:
          item.user_id,

        email:
          user?.email || "",

        amount:
          Number(item.amount || 0),

        credits:
          Number(item.credits || 0),

        status:
          item.status,

        note:
          item.note || "",

        created_at:
          item.created_at,

        processed_at:
          item.processed_at
      };
    })
  });
}
// =========================================================
// SUPABASE HELPERS
// =========================================================

function supabaseHeaders(env) {
  return {
    "apikey":
      env.SUPABASE_SERVICE_ROLE_KEY,

    "Authorization":
      `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,

    "Content-Type":
      "application/json"
  };
}


async function supabaseRequest(
  path,
  options = {},
  env
) {
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Konfigurasi Supabase Worker belum lengkap."
    );
  }

  const headers = {
    ...supabaseHeaders(env),
    ...(options.headers || {})
  };

  return await fetch(
    `${env.SUPABASE_URL}${path}`,
    {
      ...options,
      headers
    }
  );
}


// =========================================================
// CURRENT USER
// =========================================================

async function getSupabaseUser(
  request,
  env
) {
  const authorization =
    request.headers.get(
      "Authorization"
    ) || "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const token =
    authorization
      .slice(7)
      .trim();

  if (!token) {
    return null;
  }

  const response =
    await fetch(
      `${env.SUPABASE_URL}/auth/v1/user`,
      {
        method: "GET",

        headers: {
          "apikey":
            env.SUPABASE_SERVICE_ROLE_KEY,

          "Authorization":
            `Bearer ${token}`
        }
      }
    );

  if (!response.ok) {
    return null;
  }

  return await response.json();
}


// =========================================================
// ADMIN CHECK
// =========================================================

async function assertAdmin(
  request,
  env
) {
  const user =
    await getSupabaseUser(
      request,
      env
    );

  if (!user?.id) {
    throw new AdminError(
      "Unauthorized",
      401
    );
  }

  const response =
    await supabaseRequest(
      `/rest/v1/user_roles` +
      `?user_id=eq.${encodeURIComponent(user.id)}` +
      `&role=eq.admin` +
      `&select=user_id`,
      {
        method: "GET"
      },
      env
    );

  if (!response.ok) {
    throw new AdminError(
      "Gagal memeriksa status admin.",
      500
    );
  }

  const rows =
    await response.json();

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    throw new AdminError(
      "Akses admin ditolak.",
      403
    );
  }

  return user;
}


class AdminError extends Error {
  constructor(
    message,
    status = 403
  ) {
    super(message);
    this.name = "AdminError";
    this.status = status;
  }
}


// =========================================================
// ADMIN API ROUTER
// =========================================================

async function handleAdminApi(
  request,
  env
) {
  try {

    // Semua endpoint admin
    // wajib melewati pemeriksaan admin.
    const admin =
      await assertAdmin(
        request,
        env
      );

    const url =
      new URL(request.url);


    // ===================================================
    // FIND USER
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/users/find" &&
      request.method === "POST"
    ) {
      return await adminFindUser(
        request,
        env
      );
    }


    // ===================================================
    // LIST USERS
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/users" &&
      request.method === "GET"
    ) {
      return await adminListUsers(
        env
      );
    }


    // ===================================================
    // LIST ADMINS
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/admins" &&
      request.method === "GET"
    ) {
      return await adminListAdmins(
        env
      );
    }


    // ===================================================
    // ADD ADMIN
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/admins/add" &&
      request.method === "POST"
    ) {
      return await adminAddAdmin(
        request,
        env
      );
    }


    // ===================================================
    // REMOVE ADMIN
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/admins/remove" &&
      request.method === "POST"
    ) {
      return await adminRemoveAdmin(
        request,
        env,
        admin.id
      );
    }


    // ===================================================
    // CREDIT ADJUSTMENT
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/credits/adjust" &&
      request.method === "POST"
    ) {
      return await adminAdjustCredit(
        request,
        env,
        admin.id
      );
    }


    // ===================================================
    // TOPUP PROCESS
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/topups/process" &&
      request.method === "POST"
    ) {
      return await adminProcessTopup(
        request,
        env,
        admin.id
      );
    }


    // ===================================================
    // PROVIDER CONFIG
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/providers" &&
      request.method === "GET"
    ) {
      return await adminListProviders(
        env
      );
    }

    if (
      url.pathname ===
        "/api/admin/providers" &&
      request.method === "POST"
    ) {
      return await adminSaveProvider(
        request,
        env
      );
    }


    // ===================================================
    // TOPUP LIST
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/topups" &&
      request.method === "GET"
    ) {
      return await adminListTopups(
        env
      );
    }


    // ===================================================
    // ADMIN CONTACT
    // ===================================================

    if (
      url.pathname ===
        "/api/admin/contact" &&
      request.method === "GET"
    ) {
      return await adminGetContact(
        env
      );
    }

    if (
      url.pathname ===
        "/api/admin/contact" &&
      request.method === "POST"
    ) {
      return await adminSaveContact(
        request,
        env
      );
    }


    // ===================================================
    // ADMIN ENDPOINT NOT FOUND
    // HARUS PALING AKHIR
    // ===================================================

    return json({
      success: false,
      error:
        "Admin endpoint tidak ditemukan."
    }, 404);

  } catch (error) {

    if (
      error instanceof AdminError
    ) {
      return json({
        success: false,
        error: error.message
      }, error.status);
    }

    console.error(
      "Admin API error:",
      error?.message || error
    );

    return json({
      success: false,
      error:
        "Admin API mengalami kesalahan."
    }, 500);
  }
}


// =========================================================
// SUPABASE AUTH ADMIN USERS
// =========================================================

async function listAuthUsers(
  env
) {
  const allUsers = [];

  let page = 1;
  const perPage = 1000;

  while (true) {

    const response =
      await supabaseRequest(
        `/auth/v1/admin/users` +
        `?page=${page}` +
        `&per_page=${perPage}`,
        {
          method: "GET"
        },
        env
      );

    if (!response.ok) {
      const data =
        await safeJson(response);

      throw new Error(
        extractApiError(
          data,
          "Gagal mengambil daftar user."
        )
      );
    }

    const data =
      await response.json();

    const users =
      Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data)
          ? data
          : [];

    allUsers.push(...users);

    if (
      users.length < perPage
    ) {
      break;
    }

    page++;

    if (page > 20) {
      break;
    }
  }

  return allUsers;
}


// =========================================================
// FIND USER
// =========================================================

async function adminFindUser(
  request,
  env
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "Request tidak valid."
    }, 400);
  }

  const email =
    String(
      body?.email || ""
    )
      .trim()
      .toLowerCase();

  if (!email) {
    return json({
      success: false,
      error:
        "Email user wajib diberikan."
    }, 400);
  }

  const users =
    await listAuthUsers(env);

  const user =
    users.find(
      item =>
        String(
          item.email || ""
        )
          .trim()
          .toLowerCase() === email
    );

  if (!user) {
    return json({
      success: false,
      error:
        "User dengan email tersebut tidak ditemukan."
    }, 404);
  }

  return json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      created_at:
        user.created_at,
      confirmed_at:
        user.confirmed_at
    }
  });
}


// =========================================================
// LIST USERS
// =========================================================

async function adminListUsers(
  env
) {
  const users =
    await listAuthUsers(env);

  const rolesResponse =
    await supabaseRequest(
      "/rest/v1/user_roles" +
      "?select=user_id,role",
      {
        method: "GET"
      },
      env
    );

  const creditsResponse =
    await supabaseRequest(
      "/rest/v1/user_credits" +
      "?select=user_id,credits",
      {
        method: "GET"
      },
      env
    );

  const roles =
    rolesResponse.ok
      ? await rolesResponse.json()
      : [];

  const credits =
    creditsResponse.ok
      ? await creditsResponse.json()
      : [];

  const roleMap =
    new Map(
      roles.map(
        item => [
          item.user_id,
          item.role
        ]
      )
    );

  const creditMap =
    new Map(
      credits.map(
        item => [
          item.user_id,
          item.credits
        ]
      )
    );

  return json({
    success: true,

    users:
      users.map(
        user => ({
          id: user.id,

          email:
            user.email || "",

          role:
            roleMap.get(
              user.id
            ) || "user",

          credits:
            Number(
              creditMap.get(
                user.id
              ) || 0
            ),

          created_at:
            user.created_at,

          confirmed_at:
            user.confirmed_at
        })
      )
  });
}


// =========================================================
// LIST ADMINS
// =========================================================

async function adminListAdmins(
  env
) {
  const response =
    await supabaseRequest(
      "/rest/v1/user_roles" +
      "?role=eq.admin" +
      "&select=user_id,role",
      {
        method: "GET"
      },
      env
    );

  if (!response.ok) {
    const data =
      await safeJson(response);

    return json({
      success: false,
      error:
        extractApiError(
          data,
          "Gagal mengambil daftar admin."
        )
    }, response.status);
  }

  const roles =
    await response.json();

  const users =
    await listAuthUsers(env);

  const userMap =
    new Map(
      users.map(
        user => [
          user.id,
          user
        ]
      )
    );

  return json({
    success: true,

    admins:
      roles.map(
        role => {
          const user =
            userMap.get(
              role.user_id
            );

          return {
            user_id:
              role.user_id,

            email:
              user?.email ||
              "(email tidak ditemukan)",

            role:
              role.role
          };
        }
      )
  });
}


// =========================================================
// ADD ADMIN
// =========================================================

async function adminAddAdmin(
  request,
  env
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "Request tidak valid."
    }, 400);
  }

  const email =
    String(
      body?.email || ""
    )
      .trim()
      .toLowerCase();

  if (!email) {
    return json({
      success: false,
      error:
        "Email admin wajib diberikan."
    }, 400);
  }

  const users =
    await listAuthUsers(env);

  const user =
    users.find(
      item =>
        String(
          item.email || ""
        )
          .trim()
          .toLowerCase() === email
    );

  if (!user) {
    return json({
      success: false,
      error:
        "User belum terdaftar."
    }, 404);
  }

  const response =
    await supabaseRequest(
      "/rest/v1/user_roles",
      {
        method: "POST",

        headers: {
          "Prefer":
            "resolution=merge-duplicates"
        },

        body:
          JSON.stringify({
            user_id: user.id,
            role: "admin"
          })
      },
      env
    );

  if (!response.ok) {
    const data =
      await safeJson(response);

    return json({
      success: false,
      error:
        extractApiError(
          data,
          "Gagal menambahkan admin."
        )
    }, response.status);
  }

  return json({
    success: true,

    message:
      "User berhasil menjadi admin.",

    user: {
      id: user.id,
      email: user.email,
      role: "admin"
    }
  });
}


// =========================================================
// REMOVE ADMIN
// =========================================================

async function adminRemoveAdmin(
  request,
  env,
  currentAdminId
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "Request tidak valid."
    }, 400);
  }

  const userId =
    String(
      body?.user_id || ""
    ).trim();

  if (!userId) {
    return json({
      success: false,
      error:
        "user_id wajib diberikan."
    }, 400);
  }

  if (
    userId === currentAdminId
  ) {
    return json({
      success: false,
      error:
        "Admin tidak dapat menghapus dirinya sendiri."
    }, 400);
  }

  const response =
    await supabaseRequest(
      "/rest/v1/user_roles" +
      `?user_id=eq.${encodeURIComponent(userId)}` +
      "&role=eq.admin",
      {
        method: "DELETE"
      },
      env
    );

  if (!response.ok) {
    const data =
      await safeJson(response);

    return json({
      success: false,
      error:
        extractApiError(
          data,
          "Gagal menghapus admin."
        )
    }, response.status);
  }

  return json({
    success: true,

    message:
      "Hak admin berhasil dihapus."
  });
}


// =========================================================
// CREDIT ADJUSTMENT
// =========================================================

async function adminAdjustCredit(
  request,
  env,
  adminId
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "Request tidak valid."
    }, 400);
  }

  const userId =
    String(
      body?.user_id || ""
    ).trim();

  const credits =
    Number(
      body?.credits
    );

  const description =
    String(
      body?.description ||
      "Penyesuaian credit oleh admin"
    ).trim();

  if (!userId) {
    return json({
      success: false,
      error:
        "user_id wajib diberikan."
    }, 400);
  }

  if (
    !Number.isInteger(credits) ||
    credits < 0
  ) {
    return json({
      success: false,
      error:
        "Credit harus berupa bilangan bulat 0 atau lebih."
    }, 400);
  }

  const response =
    await supabaseRequest(
      "/rest/v1/rpc/admin_adjust_credit",
      {
        method: "POST",

        body:
          JSON.stringify({
            p_admin_user_id:
              adminId,

            p_user_id:
              userId,

            p_credits:
              credits,

            p_description:
              description
          })
      },
      env
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          "Gagal mengubah credit."
        )
    }, response.status);
  }

  return json({
    success: true,
    result: data
  });
}


// =========================================================
// PROCESS TOPUP
// =========================================================

async function adminProcessTopup(
  request,
  env,
  adminId
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "Request tidak valid."
    }, 400);
  }

  const requestId =
    Number(
      body?.request_id
    );

  const status =
    String(
      body?.status || ""
    )
      .trim()
      .toLowerCase();

  if (
    !Number.isInteger(
      requestId
    ) ||
    requestId <= 0
  ) {
    return json({
      success: false,
      error:
        "request_id tidak valid."
    }, 400);
  }

  if (
    ![
      "approved",
      "rejected"
    ].includes(status)
  ) {
    return json({
      success: false,
      error:
        "Status harus approved atau rejected."
    }, 400);
  }

  const response =
    await supabaseRequest(
      "/rest/v1/rpc/admin_process_topup",
      {
        method: "POST",

        body:
          JSON.stringify({
            p_admin_user_id:
              adminId,

            p_request_id:
              requestId,

            p_status:
              status
          })
      },
      env
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          "Gagal memproses top up."
        )
    }, response.status);
  }

  return json({
    success: true,
    result: data
  });
}


// =========================================================
// PROVIDER KEY
// =========================================================

async function getAdminProviderKey(
  provider,
  env
) {
  const map = {
    veo: "veo",
    gemini: "veo",
    minimax: "minimax",
    luma: "luma"
  };

  const providerName =
    map[
      String(provider)
        .trim()
        .toLowerCase()
    ];

  if (!providerName) {
    throw new Error(
      "Provider tidak didukung."
    );
  }

  const response =
    await supabaseRequest(
      "/rest/v1/admin_provider_keys" +
      `?provider=eq.${encodeURIComponent(providerName)}` +
      "&select=api_key",
      {
        method: "GET"
      },
      env
    );

  if (!response.ok) {
    throw new Error(
      "Gagal mengambil konfigurasi provider."
    );
  }

  const rows =
    await response.json();

  const provider =
  String(body.provider || "")
    .trim()
    .toLowerCase();

const providerId =
  provider === "gemini"
    ? "veo"
    : provider;

const apiKey =
  await requireProviderKey(
    providerId,
    env
  );

  if (!apiKey) {
    throw new Error(
      `API key ${providerName} belum dikonfigurasi admin.`
    );
  }

  return String(apiKey).trim();
}

async function requireProviderKey(provider, env) {
  const key = await getAdminProviderKey(provider, env);

  if (!key) {
    throw new Error(
      `API key provider ${provider} belum dikonfigurasi oleh administrator.`
    );
  }

  return key;
}

async function providerKeyExists(
  provider,
  env
) {
  try {
    const key =
      await getAdminProviderKey(
        provider,
        env
      );

    return Boolean(key);

  } catch {
    return false;
  }
}

// =========================================================
// ADMIN PROVIDER LIST
// =========================================================

async function adminListProviders(env) {
  const response = await supabaseRequest(
    "/rest/v1/admin_provider_keys" +
    "?select=provider,updated_at" +
    "&order=provider.asc",
    {
      method: "GET"
    },
    env
  );

  if (!response.ok) {
    const data = await safeJson(response);

    return json({
      success: false,
      error: extractApiError(
        data,
        "Gagal mengambil konfigurasi provider."
      )
    }, response.status);
  }

  const rows = await response.json();

  return json({
    success: true,
    providers: rows.map(row => ({
      provider: row.provider,
      configured: true,
      updated_at: row.updated_at
    }))
  });
}

// =========================================================
// GENERATE ROUTER
// =========================================================

async function handleGenerate(
  request,
  env
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "Request JSON tidak valid."
    }, 400);
  }

  if (
    !body ||
    typeof body !== "object"
  ) {
    return json({
      success: false,
      error:
        "Request tidak valid."
    }, 400);
  }

  const provider =
    String(
      body.provider || ""
    )
      .trim()
      .toLowerCase();

  const prompt =
    String(
      body.prompt || ""
    ).trim();

  if (!provider) {
    return json({
      success: false,
      error:
        "Provider wajib dipilih."
    }, 400);
  }

  if (!prompt) {
    return json({
      success: false,
      error:
        "Prompt wajib diisi."
    }, 400);
  }

  if (prompt.length > 2000) {
    return json({
      success: false,
      error:
        "Prompt maksimal 2000 karakter."
    }, 400);
  }

  switch (provider) {

    case "veo":
      return await generateVeo(
        body,
        env
      );

    case "minimax":
      return await generateMiniMax(
        body,
        env
      );

    case "luma":
      return await generateLuma(
        body,
        env
      );

    case "pollinations":
    case "fal":
    case "runway":
      return json({
        success: false,
        error:
          `${provider} belum diaktifkan pada backend GEN-Z.AI.`
      }, 501);

    default:
      return json({
        success: false,
        error:
          `Provider "${provider}" tidak dikenali.`
      }, 400);
  }
}


// =========================================================
// GOOGLE VEO
// =========================================================

async function generateVeo(
  body,
  env
) {
  let apiKey;

  try {
    apiKey =
      await getAdminProviderKey(
        "veo",
        env
      );
  } catch (error) {
    return json({
      success: false,
      error:
        error.message
    }, 400);
  }

  const allowedModels = [
    "veo-3.1-generate-preview",
    "veo-3.1-fast-generate-preview",
    "veo-3.1-lite-generate-preview"
  ];

  const model =
    String(
      body.model ||
      "veo-3.1-fast-generate-preview"
    );

  if (
    !allowedModels.includes(model)
  ) {
    return json({
      success: false,
      error:
        "Model Veo tidak valid."
    }, 400);
  }

  let duration =
    Number(
      body.duration || 8
    );

  const resolution =
    String(
      body.resolution ||
      "720p"
    ).toLowerCase();

  const aspectRatio =
    String(
      body.aspectRatio ||
      "16:9"
    );

  const imageData =
    body.imageData ||
    null;

  if (
    ![
      4,
      6,
      8
    ].includes(duration)
  ) {
    return json({
      success: false,
      error:
        "Durasi Veo harus 4, 6, atau 8 detik."
    }, 400);
  }

  if (
    ![
      "16:9",
      "9:16"
    ].includes(
      aspectRatio
    )
  ) {
    return json({
      success: false,
      error:
        "Aspect ratio Veo hanya mendukung 16:9 atau 9:16."
    }, 400);
  }

  if (
    ![
      "720p",
      "1080p",
      "4k"
    ].includes(
      resolution
    )
  ) {
    return json({
      success: false,
      error:
        "Resolusi Veo tidak valid."
    }, 400);
  }

  if (
    model ===
      "veo-3.1-lite-generate-preview" &&
    resolution === "4k"
  ) {
    return json({
      success: false,
      error:
        "Veo 3.1 Lite tidak mendukung 4K."
    }, 400);
  }

  if (
    (
      resolution === "1080p" ||
      resolution === "4k"
    ) &&
    duration !== 8
  ) {
    duration = 8;
  }

  if (
    imageData &&
    duration !== 8
  ) {
    duration = 8;
  }

  const instance = {
    prompt:
      String(
        body.prompt || ""
      ).trim()
  };

  if (imageData) {

    const parsed =
      parseDataUrl(
        imageData
      );

    if (!parsed) {
      return json({
        success: false,
        error:
          "Character reference harus berupa Data URL gambar yang valid."
      }, 400);
    }

    instance.image = {
      inlineData: {
        mimeType:
          parsed.mimeType,

        data:
          parsed.base64
      }
    };
  }

  const parameters = {
    aspectRatio,

    durationSeconds:
      String(duration),

    resolution,

    personGeneration:
      imageData
        ? "allow_adult"
        : "allow_all"
  };

  if (
    body.seed !== undefined &&
    body.seed !== null &&
    String(
      body.seed
    ).trim() !== ""
  ) {
    const seed =
      Number(body.seed);

    if (
      !Number.isInteger(seed) ||
      seed < 0
    ) {
      return json({
        success: false,
        error:
          "Seed harus berupa bilangan bulat positif."
      }, 400);
    }

    parameters.seed =
      seed;
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            apiKey
        },

        body:
          JSON.stringify({
            instances: [
              instance
            ],

            parameters
          })
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `Google Veo error (${response.status}).`
        )
    }, response.status);
  }

  const operationName =
    data?.name ||
    data?.operationName ||
    null;

  if (!operationName) {
    return json({
      success: false,
      error:
        "Veo tidak mengembalikan operation name."
    }, 502);
  }

  return json({
    success: true,
    provider: "veo",
    status: "processing",

    operationName,

    id:
      operationName,

    duration,
    resolution,
    aspectRatio,
    model
  });
}


// =========================================================
// MINIMAX
// =========================================================

async function generateMiniMax(
  body,
  env
) {
  let apiKey;

  try {
    apiKey =
      await getAdminProviderKey(
        "minimax",
        env
      );
  } catch (error) {
    return json({
      success: false,
      error:
        error.message
    }, 400);
  }

  const allowedModels = [
    "MiniMax-Hailuo-2.3",
    "MiniMax-Hailuo-2.3-Fast",
    "MiniMax-Hailuo-02"
  ];

  const model =
    String(
      body.model ||
      "MiniMax-Hailuo-2.3"
    );

  if (
    !allowedModels.includes(model)
  ) {
    return json({
      success: false,
      error:
        "Model MiniMax tidak valid."
    }, 400);
  }

  let duration =
    Number(
      body.duration || 6
    );

  const resolution =
    String(
      body.resolution ||
      "768P"
    ).toUpperCase();

  const imageData =
    body.imageData ||
    null;

  if (
    ![
      6,
      10
    ].includes(duration)
  ) {
    return json({
      success: false,
      error:
        "Durasi MiniMax harus 6 atau 10 detik."
    }, 400);
  }

  if (
    ![
      "512P",
      "768P",
      "1080P"
    ].includes(resolution)
  ) {
    return json({
      success: false,
      error:
        "Resolusi MiniMax tidak valid."
    }, 400);
  }

  if (
    resolution === "1080P" &&
    duration !== 6
  ) {
    duration = 6;
  }

  let firstFrameImage =
    null;

  if (imageData) {

    const parsed =
      parseDataUrl(
        imageData
      );

    if (!parsed) {
      return json({
        success: false,
        error:
          "Character reference MiniMax tidak valid."
      }, 400);
    }

    firstFrameImage =
      `data:${parsed.mimeType};base64,${parsed.base64}`;
  }

  const payload = {
    model,

    prompt:
      String(
        body.prompt || ""
      ).trim(),

    duration,

    resolution
  };

  if (firstFrameImage) {
    payload.first_frame_image =
      firstFrameImage;
  }

  const response =
    await fetch(
      "https://api.minimax.io/v1/video_generation",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${apiKey}`
        },

        body:
          JSON.stringify(
            payload
          )
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `MiniMax error (${response.status}).`
        )
    }, response.status);
  }

  const taskId =
    data?.task_id ||
    data?.taskId ||
    data?.id ||
    null;

  if (!taskId) {
    return json({
      success: false,
      error:
        "MiniMax tidak mengembalikan task ID."
    }, 502);
  }

  return json({
    success: true,
    provider: "minimax",
    status: "processing",

    taskId,
    id: taskId,

    model,
    duration,
    resolution
  });
}


// =========================================================
// LUMA
// =========================================================

async function generateLuma(
  body,
  env
) {
  let apiKey;

  try {
    apiKey =
      await getAdminProviderKey(
        "luma",
        env
      );
  } catch (error) {
    return json({
      success: false,
      error:
        error.message
    }, 400);
  }

  const model =
    String(
      body.model ||
      "ray-flash-2"
    );

  const allowedModels = [
    "ray-2",
    "ray-flash-2"
  ];

  if (
    !allowedModels.includes(model)
  ) {
    return json({
      success: false,
      error:
        "Model Luma tidak valid."
    }, 400);
  }

  if (body.imageData) {
    return json({
      success: false,
      error:
        "Luma image-to-video membutuhkan public image URL. Character reference lokal belum dapat dikirim langsung ke Luma."
    }, 400);
  }

  const allowedAspectRatios = [
    "1:1",
    "16:9",
    "9:16",
    "4:3",
    "3:4",
    "21:9",
    "9:21"
  ];

  const aspectRatio =
    String(
      body.aspectRatio ||
      "16:9"
    );

  if (
    !allowedAspectRatios.includes(
      aspectRatio
    )
  ) {
    return json({
      success: false,
      error:
        "Aspect ratio Luma tidak valid."
    }, 400);
  }

  const payload = {
    generation_type:
      "video",

    prompt:
      String(
        body.prompt || ""
      ).trim(),

    model,

    aspect_ratio:
      aspectRatio
  };

  if (
    body.loop !== undefined
  ) {
    payload.loop =
      Boolean(
        body.loop
      );
  }

  if (
    body.duration !== undefined &&
    body.duration !== null &&
    String(
      body.duration
    ).trim() !== ""
  ) {
    const duration =
      Number(
        body.duration
      );

    if (
      Number.isFinite(
        duration
      )
    ) {
      payload.duration =
        duration;
    }
  }

  if (
    body.resolution !== undefined &&
    body.resolution !== null &&
    String(
      body.resolution
    ).trim() !== ""
  ) {
    payload.resolution =
      String(
        body.resolution
      );
  }

  const response =
    await fetch(
      "https://api.lumalabs.ai/dream-machine/v1/generations/video",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${apiKey}`
        },

        body:
          JSON.stringify(
            payload
          )
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `Luma error (${response.status}).`
        )
    }, response.status);
  }

  const id =
    data?.id ||
    data?.generation_id ||
    null;

  if (!id) {
    return json({
      success: false,
      error:
        "Luma tidak mengembalikan generation ID."
    }, 502);
  }

  return json({
    success: true,
    provider: "luma",
    status: "processing",

    id,
    generationId: id,

    model,
    aspectRatio
  });
}


// =========================================================
// STATUS POST
// =========================================================

async function handleStatusPost(
  request,
  env
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return json({
      success: false,
      error:
        "Request status tidak valid."
    }, 400);
  }

  if (
    !body ||
    typeof body !== "object"
  ) {
    return json({
      success: false,
      error:
        "Request status tidak valid."
    }, 400);
  }

  const provider =
    String(
      body.provider || ""
    )
      .trim()
      .toLowerCase();

  if (!provider) {
    return json({
      success: false,
      error:
        "Provider wajib diberikan."
    }, 400);
  }

  let apiKey;

  try {
    apiKey =
      await getAdminProviderKey(
        provider,
        env
      );
  } catch (error) {
    return json({
      success: false,
      error:
        error.message
    }, 400);
  }

  switch (provider) {

    case "veo":
      return await statusVeo(
        body.operationName ||
        body.id,
        apiKey
      );

    case "minimax":
      return await statusMiniMax(
        body.taskId ||
        body.id,
        apiKey
      );

    case "luma":
      return await statusLuma(
        body.id,
        apiKey
      );

    default:
      return json({
        success: false,
        error:
          `Provider "${provider}" belum didukung untuk polling.`
      }, 400);
  }
}


// =========================================================
// STATUS LEGACY GET
// =========================================================

async function handleStatus(
  request,
  env
) {
  const url =
    new URL(request.url);

  const provider =
    String(
      url.searchParams.get(
        "provider"
      ) || ""
    )
      .trim()
      .toLowerCase();

  const operationName =
    url.searchParams.get(
      "operationName"
    );

  const taskId =
    url.searchParams.get(
      "taskId"
    );

  const id =
    url.searchParams.get(
      "id"
    );

  if (!provider) {
    return json({
      success: false,
      error:
        "Provider wajib diberikan."
    }, 400);
  }

  let apiKey;

  try {
    apiKey =
      await getAdminProviderKey(
        provider,
        env
      );
  } catch (error) {
    return json({
      success: false,
      error:
        error.message
    }, 400);
  }

  switch (provider) {

    case "veo":
      return await statusVeo(
        operationName || id,
        apiKey
      );

    case "minimax":
      return await statusMiniMax(
        taskId || id,
        apiKey
      );

    case "luma":
      return await statusLuma(
        id,
        apiKey
      );

    default:
      return json({
        success: false,
        error:
          `Provider "${provider}" tidak didukung untuk polling.`
      }, 400);
  }
}


// =========================================================
// VEO STATUS
// =========================================================

async function statusVeo(
  operationName,
  apiKey
) {
  if (!apiKey) {
    return json({
      success: false,
      error:
        "API key Google Veo belum tersedia."
    }, 400);
  }

  if (!operationName) {
    return json({
      success: false,
      error:
        "operationName Veo tidak ditemukan."
    }, 400);
  }

  const cleanName =
    String(
      operationName
    )
      .replace(
        /^\/+/,
        ""
      );

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/${cleanName}`;

  const response =
    await fetch(
      endpoint,
      {
        method: "GET",

        headers: {
          "x-goog-api-key":
            apiKey
        }
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `Veo status error (${response.status}).`
        )
    }, response.status);
  }

  if (!data?.done) {
    return json({
      success: true,
      status: "processing",
      provider: "veo",
      operationName
    });
  }

  if (data?.error) {
    return json({
      success: false,
      status: "failed",
      provider: "veo",
      error:
        extractApiError(
          data.error,
          "Veo generation gagal."
        )
    }, 500);
  }

  const videoUri =
    data?.response
      ?.generateVideoResponse
      ?.generatedSamples?.[0]
      ?.video?.uri;

  if (!videoUri) {
    return json({
      success: false,
      status: "failed",
      provider: "veo",
      error:
        "Veo selesai tetapi URL video tidak ditemukan."
    }, 502);
  }

  return json({
    success: true,
    status: "completed",
    provider: "veo",
    videoUrl:
      videoUri
  });
}


// =========================================================
// MINIMAX STATUS
// =========================================================

async function statusMiniMax(
  taskId,
  apiKey
) {
  if (!apiKey) {
    return json({
      success: false,
      error:
        "API key MiniMax belum tersedia."
    }, 400);
  }

  if (!taskId) {
    return json({
      success: false,
      error:
        "Task ID MiniMax tidak ditemukan."
    }, 400);
  }

  const endpoint =
    `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`;

  const response =
    await fetch(
      endpoint,
      {
        method: "GET",

        headers: {
          "Authorization":
            `Bearer ${apiKey}`
        }
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `MiniMax status error (${response.status}).`
        )
    }, response.status);
  }

  const status =
    String(
      data?.status ||
      data?.task_status ||
      ""
    ).toLowerCase();

  if (
    [
      "pending",
      "processing",
      "queueing",
      "queued",
      "running",
      "in_progress"
    ].includes(status)
  ) {
    return json({
      success: true,
      status: "processing",
      provider: "minimax",
      taskId
    });
  }

  if (
    [
      "failed",
      "failure",
      "error"
    ].includes(status)
  ) {
    return json({
      success: false,
      status: "failed",
      provider: "minimax",
      error:
        extractApiError(
          data,
          "MiniMax generation gagal."
        )
    }, 500);
  }

  const downloadUrl =
    data?.file?.download_url ||
    data?.download_url ||
    data?.video_url ||
    data?.video?.url ||
    null;

  if (downloadUrl) {
    return json({
      success: true,
      status: "completed",
      provider: "minimax",
      videoUrl:
        downloadUrl
    });
  }

  const fileId =
    data?.file?.file_id ||
    data?.file_id ||
    null;

  if (
    fileId &&
    [
      "success",
      "succeeded",
      "completed",
      "finished"
    ].includes(status)
  ) {
    return json({
      success: true,
      status: "completed",
      provider: "minimax",

      videoUrl:
        `/api/video?provider=minimax&fileId=${encodeURIComponent(fileId)}`
    });
  }

  return json({
    success: true,
    status: "processing",
    provider: "minimax",
    taskId
  });
}


// =========================================================
// LUMA STATUS
// =========================================================

async function statusLuma(
  id,
  apiKey
) {
  if (!apiKey) {
    return json({
      success: false,
      error:
        "API key Luma belum tersedia."
    }, 400);
  }

  if (!id) {
    return json({
      success: false,
      error:
        "Generation ID Luma tidak ditemukan."
    }, 400);
  }

  const endpoint =
    `https://api.lumalabs.ai/dream-machine/v1/generations/${encodeURIComponent(id)}`;

  const response =
    await fetch(
      endpoint,
      {
        method: "GET",

        headers: {
          "Authorization":
            `Bearer ${apiKey}`
        }
      }
    );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `Luma status error (${response.status}).`
        )
    }, response.status);
  }

  const state =
    String(
      data?.state ||
      data?.status ||
      ""
    ).toLowerCase();

  if (
    [
      "failed",
      "failure",
      "error"
    ].includes(state)
  ) {
    return json({
      success: false,
      status: "failed",
      provider: "luma",
      error:
        extractApiError(
          data,
          "Luma generation gagal."
        )
    }, 500);
  }

  const videoUrl =
    data?.assets?.video ||
    data?.video?.url ||
    data?.video_url ||
    null;

  if (videoUrl) {
    return json({
      success: true,
      status: "completed",
      provider: "luma",
      videoUrl
    });
  }

  if (
    state === "completed"
  ) {
    return json({
      success: false,
      status: "failed",
      provider: "luma",
      error:
        "Luma selesai tetapi URL video tidak ditemukan."
    }, 502);
  }

  return json({
    success: true,
    status: "processing",
    provider: "luma",
    id,
    state
  });
}


// =========================================================
// VIDEO PROXY
// =========================================================

async function handleVideoProxy(
  request,
  env
) {
  const url =
    new URL(request.url);

  const provider =
    String(
      url.searchParams.get(
        "provider"
      ) || ""
    ).toLowerCase();


  // =====================================================
  // VEO
  // =====================================================

  if (
    provider === "veo"
  ) {
    const target =
      url.searchParams.get(
        "url"
      );

    if (!target) {
      return json({
        success: false,
        error:
          "URL video Veo tidak diberikan."
      }, 400);
    }

    let targetUrl;

    try {
      targetUrl =
        new URL(target);
    } catch {
      return json({
        success: false,
        error:
          "URL video Veo tidak valid."
      }, 400);
    }

    const allowedHosts = [
      "generativelanguage.googleapis.com",
      "storage.googleapis.com"
    ];

    if (
      !allowedHosts.includes(
        targetUrl.hostname
      )
    ) {
      return json({
        success: false,
        error:
          "Host video Veo tidak diizinkan."
      }, 403);
    }

    let apiKey;

    try {
      apiKey =
        await getAdminProviderKey(
          "veo",
          env
        );
    } catch (error) {
      return json({
        success: false,
        error:
          error.message
      }, 400);
    }

    targetUrl.searchParams.delete(
      "key"
    );

    const response =
      await fetch(
        targetUrl.toString(),
        {
          method: "GET",

          headers: {
            "x-goog-api-key":
              apiKey
          }
        }
      );

    if (!response.ok) {
      return new Response(
        await response.arrayBuffer(),
        {
          status:
            response.status,

          headers: {
            ...corsHeaders(),

            "Content-Type":
              response.headers.get(
                "Content-Type"
              ) ||
              "application/octet-stream"
          }
        }
      );
    }

    return new Response(
      response.body,
      {
        status: 200,

        headers: {
          ...corsHeaders(),

          "Content-Type":
            response.headers.get(
              "Content-Type"
            ) ||
            "video/mp4",

          "Cache-Control":
            "public, max-age=3600"
        }
      }
    );
  }


  // =====================================================
  // MINIMAX
  // =====================================================

  if (
    provider === "minimax"
  ) {
    const fileId =
      url.searchParams.get(
        "fileId"
      );

    if (!fileId) {
      return json({
        success: false,
        error:
          "fileId MiniMax tidak diberikan."
      }, 400);
    }

    let apiKey;

    try {
      apiKey =
        await getAdminProviderKey(
          "minimax",
          env
        );
    } catch (error) {
      return json({
        success: false,
        error:
          error.message
      }, 400);
    }

    const metadataUrl =
      `https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`;

    const metadataResponse =
      await fetch(
        metadataUrl,
        {
          method: "GET",

          headers: {
            "Authorization":
              `Bearer ${apiKey}`
          }
        }
      );

    const metadata =
      await safeJson(
        metadataResponse
      );

    if (
      !metadataResponse.ok
    ) {
      return json({
        success: false,
        error:
          extractApiError(
            metadata,
            `MiniMax file error (${metadataResponse.status}).`
          )
      }, metadataResponse.status);
    }

    const downloadUrl =
      metadata?.file?.download_url ||
      metadata?.download_url ||
      null;

    if (!downloadUrl) {
      return json({
        success: false,
        error:
          "MiniMax tidak mengembalikan download URL."
      }, 502);
    }

    let targetUrl;

    try {
      targetUrl =
        new URL(downloadUrl);
    } catch {
      return json({
        success: false,
        error:
          "Download URL MiniMax tidak valid."
      }, 502);
    }

    if (
      targetUrl.protocol !==
      "https:"
    ) {
      return json({
        success: false,
        error:
          "Download URL MiniMax tidak aman."
      }, 403);
    }

    return new Response(
      null,
      {
        status: 302,

        headers: {
          ...corsHeaders(),

          "Location":
            targetUrl.toString(),

          "Cache-Control":
            "no-store"
        }
      }
    );
  }


  return json({
    success: false,
    error:
      "Provider video proxy tidak didukung."
  }, 400);
}


// =========================================================
// DATA URL PARSER
// =========================================================

function parseDataUrl(
  dataUrl
) {
  if (
    typeof dataUrl !==
    "string"
  ) {
    return null;
  }

  const match =
    dataUrl.match(
      /^data:([^;,]+);base64,(.+)$/s
    );

  if (!match) {
    return null;
  }

  const mimeType =
    match[1];

  const base64 =
    match[2]
      .replace(
        /\s/g,
        ""
      );

  if (!base64) {
    return null;
  }

  if (
    !mimeType.startsWith(
      "image/"
    )
  ) {
    return null;
  }

  return {
    mimeType,
    base64
  };
}


// =========================================================
// SAFE JSON
// =========================================================

async function safeJson(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);

  } catch {
    return {
      raw: text
    };
  }
}


// =========================================================
// API ERROR
// =========================================================

function extractApiError(
  data,
  fallback
) {
  if (!data) {
    return fallback;
  }

  if (
    typeof data ===
    "string"
  ) {
    return data;
  }

  if (data.error) {

    if (
      typeof data.error ===
      "string"
    ) {
      return data.error;
    }

    if (
      data.error.message
    ) {
      return String(
        data.error.message
      );
    }

    try {
      return JSON.stringify(
        data.error
      );

    } catch {
      return fallback;
    }
  }

  if (data.message) {
    return String(
      data.message
    );
  }

  if (data.raw) {
    return String(
      data.raw
    );
  }

  return fallback;
}


// =========================================================
// CORS
// =========================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":
      "*",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",

    "Access-Control-Max-Age":
      "86400"
  };
}


// =========================================================
// JSON RESPONSE
// =========================================================

function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,

      headers: {
        ...corsHeaders(),

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store"
      }
    }
  );
}
