import {
  HttpError,
  json,
  safeJson,
  requireJsonContentType,
  readJson,
  apiError
} from "../lib/http.js";

import {
  requireAdmin,
  getUserRole
} from "../auth/role.js";

import {
  sb
} from "../lib/supabase.js";

import {
  providerId,
  adapterInfo,
  inferAdapter
} from "../providers/provider-utils.js";

import {
  getProvider,
  publicProvider
} from "../providers/provider-service.js";

export async function adminApi(
  request,
  env
) {
  const admin =
    await requireAdmin(
      request,
      env
    );

  const url =
    new URL(
      request.url
    );

  /*
   * ----------------------------------------------------------
   * ADMIN JOBS
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/jobs" &&
    request.method ===
      "GET"
  ) {
    const limit =
      Math.min(
        200,
        Math.max(
          1,
          Number(
            url.searchParams.get(
              "limit"
            ) || 50
          )
        )
      );

    const status =
      url.searchParams.get(
        "status"
      );

    if (
      status &&
      ![
        "reserved",
        "processing",
        "completed",
        "failed"
      ].includes(
        status
      )
    ) {
      throw new HttpError(
        "Status job tidak valid.",
        400
      );
    }

    const qs =
      status
        ? `&status=eq.${encodeURIComponent(
            status
          )}`
        : "";

    const r =
      await sb(
        `/rest/v1/video_jobs?select=id,user_id,provider,external_id,status,credit_cost,refunded,model,video_url,attempt_count,last_error,last_error_code,provider_status,created_at,updated_at&order=created_at.desc&limit=${limit}${qs}`,
        {},
        env
      );

    if (
      !r.ok
    ) {
      throw new HttpError(
        "Gagal mengambil job log.",
        500
      );
    }

    return json(
      {
        success:
          true,

        jobs:
          await r.json()
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * JOB EVENTS
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/job-events" &&
    request.method ===
      "GET"
  ) {
    const limit =
      Math.min(
        300,
        Math.max(
          1,
          Number(
            url.searchParams.get(
              "limit"
            ) || 100
          )
        )
      );

    const jobId =
      url.searchParams.get(
        "job_id"
      );

    const qs =
      jobId
        ? `&job_id=eq.${encodeURIComponent(
            jobId
          )}`
        : "";

    const r =
      await sb(
        `/rest/v1/video_job_events?select=id,job_id,user_id,event_type,provider_status,error_code,message,metadata,created_at&order=created_at.desc&limit=${limit}${qs}`,
        {},
        env
      );

    if (
      !r.ok
    ) {
      throw new HttpError(
        "Gagal mengambil event log.",
        500
      );
    }

    return json(
      {
        success:
          true,

        events:
          await r.json()
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * PROVIDERS
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/providers" &&
    request.method ===
      "GET"
  ) {
    const res =
      await sb(
        "/rest/v1/providers?select=id,name,adapter,enabled,config,api_key,created_at,updated_at&order=created_at.asc",
        {},
        env
      );

    if (
      !res.ok
    ) {
      throw new HttpError(
        "Gagal mengambil provider.",
        500
      );
    }

    const providerRows =
      await res.json();

    return json(
      {
        success:
          true,

        providers:
          providerRows.map(
            p => ({
              ...publicProvider(
                p
              ),

              created_at:
                p.created_at,

              updated_at:
                p.updated_at,

              apiKeySet:
                Boolean(
                  p.api_key
                ),

              api_key_masked:
                p.api_key
                  ? "••••••••"
                  : ""
            })
          )
      },
      200,
      env
    );
  }

  if (
    url.pathname ===
      "/api/admin/providers" &&
    request.method ===
      "POST"
  ) {
    requireJsonContentType(
      request
    );

    const body =
      await readJson(
        request
      );

    const id =
      providerId(
        body.id
      );

    const name =
      String(
        body.name ||
          id
      )
        .trim()
        .slice(
          0,
          100
        );

    if (!name) {
      throw new HttpError(
        "Nama provider wajib diisi.",
        400
      );
    }

    let adapterValue =
      String(
        body.adapter ||
          ""
      )
        .trim()
        .toLowerCase();

    if (!adapterValue) {
      const inferred =
        inferAdapter(
          name
        ) ||
        inferAdapter(
          id
        );

      if (inferred) {
        adapterValue =
          inferred.id;
      }
    }

    if (
      !adapterInfo(
        adapterValue
      )
    ) {
      throw new HttpError(
        "Adapter provider tidak dapat dikenali dari nama provider. Gunakan nama Gemini, Veo, MiniMax, atau Luma.",
        400
      );
    }

    const key =
      String(
        body.api_key ||
          ""
      ).trim();

    if (!key) {
      throw new HttpError(
        "API key wajib diisi.",
        400
      );
    }

    const enabled =
      body.enabled !==
      false;

    const config =
      body.config &&
      typeof body.config ===
        "object" &&
      !Array.isArray(
        body.config
      )
        ? body.config
        : {};

    if (
      JSON.stringify(
        config
      ).length >
      20000
    ) {
      throw new HttpError(
        "Config provider terlalu besar.",
        400
      );
    }

    const res =
      await sb(
        "/rest/v1/providers",
        {
          method:
            "POST",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify({
              id,

              name,

              adapter:
                adapterValue,

              api_key:
                key,

              enabled,

              config,

              updated_at:
                new Date()
                  .toISOString()
            })
        },
        env
      );

    if (
      !res.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            res
          ),
          "Gagal menambahkan provider."
        ),
        res.status
      );
    }

    return json(
      {
        success:
          true,

        message:
          "Provider berhasil ditambahkan.",

        provider: {
          id,

          name,

          adapter:
            adapterValue
        }
      },
      201,
      env
    );
  }

  const m =
    url.pathname.match(
      /^\/api\/admin\/providers\/([^/]+)$/
    );

  if (
    m &&
    request.method ===
      "PUT"
  ) {
    requireJsonContentType(
      request
    );

    const id =
      providerId(
        decodeURIComponent(
          m[1]
        )
      );

    const body =
      await readJson(
        request
      );

    const patch = {};

    if (
      body.name !==
      undefined
    ) {
      patch.name =
        String(
          body.name
        )
          .trim()
          .slice(
            0,
            100
          ) ||
        id;
    }

    if (
      body.adapter !==
      undefined
    ) {
      const requested =
        String(
          body.adapter
        )
          .trim()
          .toLowerCase();

      if (
        !adapterInfo(
          requested
        )
      ) {
        throw new HttpError(
          "Adapter tidak didukung.",
          400
        );
      }

      patch.adapter =
        requested;
    }

    if (
      body.api_key !==
        undefined &&
      String(
        body.api_key
      ).trim()
    ) {
      patch.api_key =
        String(
          body.api_key
        ).trim();
    }

    if (
      body.enabled !==
      undefined
    ) {
      patch.enabled =
        Boolean(
          body.enabled
        );
    }

    if (
      body.config !==
      undefined
    ) {
      if (
        !body.config ||
        typeof body.config !==
          "object" ||
        Array.isArray(
          body.config
        )
      ) {
        throw new HttpError(
          "Config provider harus berupa object JSON.",
          400
        );
      }

      if (
        JSON.stringify(
          body.config
        ).length >
        20000
      ) {
        throw new HttpError(
          "Config provider terlalu besar.",
          400
        );
      }

      patch.config =
        body.config;
    }

    patch.updated_at =
      new Date()
        .toISOString();

    const res =
      await sb(
        `/rest/v1/providers?id=eq.${encodeURIComponent(
          id
        )}`,
        {
          method:
            "PATCH",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify(
              patch
            )
        },
        env
      );

    if (
      !res.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            res
          ),
          "Gagal memperbarui provider."
        ),
        res.status
      );
    }

    return json(
      {
        success:
          true
      },
      200,
      env
    );
  }

  if (
    m &&
    request.method ===
      "DELETE"
  ) {
    const id =
      providerId(
        decodeURIComponent(
          m[1]
        )
      );

    const active =
      await rows(
        `/rest/v1/video_jobs?provider=eq.${encodeURIComponent(
          id
        )}&status=in.(reserved,processing)&select=id&limit=1`,
        env
      );

    if (
      active.length
    ) {
      throw new HttpError(
        "Provider masih memiliki job aktif. Nonaktifkan provider dan tunggu job selesai sebelum menghapus.",
        409
      );
    }

    const res =
      await sb(
        `/rest/v1/providers?id=eq.${encodeURIComponent(
          id
        )}`,
        {
          method:
            "DELETE"
        },
        env
      );

    if (
      !res.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            res
          ),
          "Gagal menghapus provider."
        ),
        res.status
      );
    }

    return json(
      {
        success:
          true
      },
      200,
      env
    );
  }

  const mt =
    url.pathname.match(
      /^\/api\/admin\/providers\/([^/]+)\/toggle$/
    );

  if (
    mt &&
    request.method ===
      "POST"
  ) {
    const id =
      providerId(
        decodeURIComponent(
          mt[1]
        )
      );

    const current =
      await getProvider(
        id,
        env,
        false
      );

    const enableHeader =
      request.headers.get(
        "x-enable"
      );

    const enabled =
      enableHeader ===
      "true"
        ? true
        : enableHeader ===
          "false"
          ? false
          : !current.enabled;

    const res =
      await sb(
        `/rest/v1/providers?id=eq.${encodeURIComponent(
          id
        )}`,
        {
          method:
            "PATCH",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify({
              enabled,

              updated_at:
                new Date()
                  .toISOString()
            })
        },
        env
      );

    if (
      !res.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            res
          ),
          "Gagal mengubah status provider."
        ),
        res.status
      );
    }

    return json(
      {
        success:
          true,

        enabled
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * TOPUP REQUESTS
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/topup-requests" &&
    request.method ===
      "GET"
  ) {
    const status =
      String(
        url.searchParams.get(
          "status"
        ) ||
          "pending"
      ).trim();

    const limit =
      Math.min(
        200,
        Math.max(
          1,
          Number(
            url.searchParams.get(
              "limit"
            ) ||
              100
          )
        )
      );

    if (
      ![
        "pending",
        "approved",
        "rejected",
        "all"
      ].includes(
        status
      )
    ) {
      throw new HttpError(
        "Status tidak valid.",
        400
      );
    }

    const q =
      status ===
      "all"
        ? ""
        : `&status=eq.${encodeURIComponent(
            status
          )}`;

    const tx =
      await sb(
        `/rest/v1/credit_topup_requests?select=id,user_id,amount,note,status,admin_note,admin_user_id,created_at,reviewed_at&order=created_at.desc&limit=${limit}${q}`,
        {},
        env
      );

    if (
      !tx.ok
    ) {
      throw new HttpError(
        "Gagal mengambil request top-up.",
        500
      );
    }

    return json(
      {
        success:
          true,

        requests:
          await tx.json()
      },
      200,
      env
    );
  }

  const tr =
    url.pathname.match(
      /^\/api\/admin\/topup-requests\/([^/]+)\/(approve|reject)$/
    );

  if (
    tr &&
    request.method ===
      "POST"
  ) {
    requireJsonContentType(
      request
    );

    const requestId =
      decodeURIComponent(
        tr[1]
      );

    const action =
      tr[2];

    const body =
      await readJson(
        request
      );

    const rpc =
      action ===
      "approve"
        ? "approve_topup_request"
        : "reject_topup_request";

    const r =
      await sb(
        `/rest/v1/rpc/${rpc}`,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              p_admin_user_id:
                admin.id,

              p_request_id:
                requestId,

              p_admin_note:
                String(
                  body.note ||
                    ""
                )
                  .trim()
                  .slice(
                    0,
                    500
                  )
            })
        },
        env
      );

    if (
      !r.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            r
          ),
          `Gagal ${
            action ===
            "approve"
              ? "menyetujui"
              : "menolak"
          } top-up.`
        ),
        r.status
      );
    }

    return json(
      {
        success:
          true,

        result:
          await safeJson(
            r
          )
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * ADMIN CONTACT
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/contact" &&
    request.method ===
      "GET"
  ) {
    const res =
      await sb(
        "/rest/v1/app_settings?setting_key=eq.admin_contact_url&select=setting_value",
        {},
        env
      );

    const contactRows =
      res.ok
        ? await res.json()
        : [];

    return json(
      {
        success:
          true,

        url:
          contactRows?.[0]
            ?.setting_value ||
          ""
      },
      200,
      env
    );
  }

  if (
    url.pathname ===
      "/api/admin/contact" &&
    request.method ===
      "POST"
  ) {
    requireJsonContentType(
      request
    );

    const body =
      await readJson(
        request
      );

    const contact =
      String(
        body.url ||
          ""
      ).trim();

    if (contact) {
      try {
        const u =
          new URL(
            contact
          );

        if (
          ![
            "http:",
            "https:"
          ].includes(
            u.protocol
          )
        ) {
          throw new Error();
        }
      } catch {
        throw new HttpError(
          "URL kontak admin tidak valid.",
          400
        );
      }
    }

    const res =
      await sb(
        "/rest/v1/app_settings",
        {
          method:
            "POST",

          headers: {
            Prefer:
              "resolution=merge-duplicates,return=minimal"
          },

          body:
            JSON.stringify({
              setting_key:
                "admin_contact_url",

              setting_value:
                contact,

              updated_at:
                new Date()
                  .toISOString()
            })
        },
        env
      );

    if (
      !res.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            res
          ),
          "Gagal menyimpan kontak admin."
        ),
        res.status
      );
    }

    return json(
      {
        success:
          true
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * USERS
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/users" &&
    request.method ===
      "GET"
  ) {
    const users =
      await listUsers(
        env
      );

    const roleRows =
      await rows(
        "/rest/v1/user_roles?select=user_id,role",
        env
      );

    const creditRows =
      await rows(
        "/rest/v1/user_credits?select=user_id,credits",
        env
      );

    const roleMap =
      new Map(
        roleRows.map(
          x => [
            x.user_id,
            x.role
          ]
        )
      );

    const creditMap =
      new Map(
        creditRows.map(
          x => [
            x.user_id,
            Number(
              x.credits ||
                0
            )
          ]
        )
      );

    return json(
      {
        success:
          true,

        users:
          users.map(
            u => ({
              id:
                u.id,

              email:
                u.email,

              role:
                roleMap.get(
                  u.id
                ) ||
                "user",

              credits:
                creditMap.get(
                  u.id
                ) ||
                0,

              created_at:
                u.created_at
            })
          )
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * TRANSACTIONS
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/transactions" &&
    request.method ===
      "GET"
  ) {
    const userId =
      String(
        url.searchParams.get(
          "user_id"
        ) ||
          ""
      ).trim();

    if (
      userId &&
      !/^[0-9a-f-]{36}$/i.test(
        userId
      )
    ) {
      throw new HttpError(
        "user_id tidak valid.",
        400
      );
    }

    const limit =
      Math.min(
        200,
        Math.max(
          1,
          Number(
            url.searchParams.get(
              "limit"
            ) ||
              100
          )
        )
      );

    if (!userId) {
      throw new HttpError(
        "user_id wajib.",
        400
      );
    }

    const tx =
      await sb(
        `/rest/v1/credit_transactions?user_id=eq.${encodeURIComponent(
          userId
        )}&select=id,amount,balance_after,type,reference_id,note,created_at&order=created_at.desc&limit=${limit}`,
        {},
        env
      );

    if (
      !tx.ok
    ) {
      const data =
        await safeJson(
          tx
        );

      console.error(
        "admin credit transaction query failed",
        data
      );

      throw new HttpError(
        "Gagal mengambil riwayat credit.",
        500
      );
    }

    return json(
      {
        success:
          true,

        transactions:
          await tx.json()
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * CREDIT ADJUSTMENT
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/credits/adjust" &&
    request.method ===
      "POST"
  ) {
    requireJsonContentType(
      request
    );

    const body =
      await readJson(
        request
      );

    const userId =
      String(
        body.user_id ||
          ""
      ).trim();

    if (
      !/^[0-9a-f-]{36}$/i.test(
        userId
      )
    ) {
      throw new HttpError(
        "user_id tidak valid.",
        400
      );
    }

    const amount =
      Number(
        body.amount
      );

    if (
      !Number.isInteger(
        amount
      ) ||
      amount ===
        0
    ) {
      throw new HttpError(
        "user_id dan amount integer non-zero wajib.",
        400
      );
    }

    const res =
      await sb(
        "/rest/v1/rpc/admin_adjust_credit",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              p_admin_user_id:
                admin.id,

              p_user_id:
                userId,

              p_amount:
                amount,

              p_note:
                String(
                  body.note ||
                    "Admin adjustment"
                )
            })
        },
        env
      );

    if (
      !res.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            res
          ),
          "Gagal mengubah credit."
        ),
        res.status
      );
    }

    return json(
      {
        success:
          true
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * ADMIN LIST
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/admins" &&
    request.method ===
      "GET"
  ) {
    const roleRows =
      await rows(
        "/rest/v1/user_roles?role=in.(admin,owner)&select=user_id,role",
        env
      );

    const users =
      await listUsers(
        env
      );

    const userMap =
      new Map(
        users.map(
          u => [
            u.id,
            u.email
          ]
        )
      );

    return json(
      {
        success:
          true,

        admins:
          roleRows.map(
            r => ({
              user_id:
                r.user_id,

              email:
                userMap.get(
                  r.user_id
                ) ||
                "",

              role:
                r.role
            })
          )
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * ADD ADMIN
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/admins/add" &&
    request.method ===
      "POST"
  ) {
    requireJsonContentType(
      request
    );

    const body =
      await readJson(
        request
      );

    const email =
      String(
        body.email ||
          ""
      )
        .trim()
        .toLowerCase();

    if (!email) {
      throw new HttpError(
        "Email wajib diisi.",
        400
      );
    }

    const users =
      await listUsers(
        env
      );

    const target =
      users.find(
        x =>
          String(
            x.email ||
              ""
          ).toLowerCase() ===
          email
      );

    if (!target) {
      throw new HttpError(
        "User belum terdaftar.",
        404
      );
    }

    const currentRole =
      await getUserRole(
        target.id,
        env
      );

    if (
      currentRole ===
      "owner"
    ) {
      return json(
        {
          success:
            true,

          message:
            "User tersebut sudah memiliki role owner."
        },
        200,
        env
      );
    }

    const res =
      await sb(
        "/rest/v1/user_roles",
        {
          method:
            "POST",

          headers: {
            Prefer:
              "resolution=merge-duplicates,return=minimal"
          },

          body:
            JSON.stringify({
              user_id:
                target.id,

              role:
                "admin"
            })
        },
        env
      );

    if (
      !res.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            res
          ),
          "Gagal menambahkan admin."
        ),
        res.status
      );
    }

    return json(
      {
        success:
          true,

        message:
          "Admin berhasil ditambahkan."
      },
      200,
      env
    );
  }

  /*
   * ----------------------------------------------------------
   * REMOVE ADMIN
   * ----------------------------------------------------------
   */

  if (
    url.pathname ===
      "/api/admin/admins/remove" &&
    request.method ===
      "POST"
  ) {
    requireJsonContentType(
      request
    );

    const body =
      await readJson(
        request
      );

    const targetId =
      String(
        body.user_id ||
          ""
      ).trim();

    if (
      !/^[0-9a-f-]{36}$/i.test(
        targetId
      )
    ) {
      throw new HttpError(
        "user_id tidak valid.",
        400
      );
    }

    if (
      targetId ===
      admin.id
    ) {
      throw new HttpError(
        "Tidak dapat menghapus role diri sendiri.",
        400
      );
    }

    const targetRole =
      await getUserRole(
        targetId,
        env
      );

    if (
      targetRole ===
      "owner"
    ) {
      throw new HttpError(
        "Role owner tidak dapat dihapus melalui Admin Panel.",
        403
      );
    }

    if (
      targetRole !==
      "admin"
    ) {
      throw new HttpError(
        "User tersebut bukan admin.",
        404
      );
    }

    const res =
      await sb(
        "/rest/v1/rpc/remove_admin",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              p_admin_user_id:
                admin.id,

              p_user_id:
                targetId
            })
        },
        env
      );

    if (
      !res.ok
    ) {
      throw new HttpError(
        apiError(
          await safeJson(
            res
          ),
          "Gagal menghapus admin."
        ),
        res.status
      );
    }

    return json(
      {
        success:
          true,

        result:
          await safeJson(
            res
          )
      },
      200,
      env
    );
  }

  throw new HttpError(
    "Admin endpoint tidak ditemukan.",
    404
  );
}

async function rows(
  path,
  env
) {
  const r =
    await sb(
      path,
      {},
      env
    );

  return r.ok
    ? await r.json()
    : [];
}

async function listUsers(
  env
) {
  const out =
    [];

  let page =
    1;

  while (
    page <= 20
  ) {
    const r =
      await fetch(
        `${env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`,
        {
          headers: {
            apikey:
              env.SUPABASE_SERVICE_ROLE_KEY,

            Authorization:
              `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      );

    if (
      !r.ok
    ) {
      break;
    }

    const d =
      await r.json();

    const batch =
      d?.users ||
      [];

    out.push(
      ...batch
    );

    if (
      batch.length <
      100
    ) {
      break;
    }

    page++;
  }

  return out;
}
