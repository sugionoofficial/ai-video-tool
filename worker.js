import {
  getAdapter,
  getAdapterInfo,
  resolveAdapter,
  adapterSupported,
  normalizeProviderId
} from "./providers/index.js";

import {
  HttpError,
  corsHeaders,
  json,
  safeJson,
  requireJsonContentType,
  readJson,
  apiError
} from "./lib/http.js";

/*
 * ============================================================
 * GEN-Z.AI WORKER
 * ============================================================
 *
 * Provider logic:
 *   /providers/veo.js
 *   /providers/minimax.js
 *   /providers/luma.js
 *   /providers/index.js
 *
 * Worker menangani:
 * - Auth
 * - Role
 * - Credit
 * - Job
 * - Database
 * - Provider routing
 * - Admin
 * - Topup
 * - Video proxy
 * ============================================================
 */

/*
 * ============================================================
 * PROVIDER NORMALIZATION
 * ============================================================
 */

function canonicalProvider(value) {
  const raw =
    String(value || "")
      .trim()
      .toLowerCase();

  const aliases = {
    gemini: "veo",
    veo: "veo",
    minimax: "minimax",
    luma: "luma"
  };

  return aliases[raw] || raw;
}

function providerId(value) {
  const id =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(
      id
    )
  ) {
    throw new HttpError(
      "ID provider tidak valid.",
      400
    );
  }

  if (id === "gemini") {
    throw new HttpError(
      "ID provider reserved. Gunakan ID selain gemini.",
      400
    );
  }

  return id;
}

function adapterInfo(adapter) {
  return getAdapterInfo(adapter);
}

function inferAdapter(value) {
  if (!value) {
    return null;
  }

  const adapter =
    getAdapter(value);

  if (adapter) {
    return adapter;
  }

  return null;
}

/*
 * ============================================================
 * SUPABASE
 * ============================================================
 */

function sbHeaders(env) {
  return {
    apikey:
      env.SUPABASE_SERVICE_ROLE_KEY,

    Authorization:
      `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,

    "Content-Type":
      "application/json"
  };
}

async function sb(
  path,
  options = {},
  env
) {
  return fetch(
    `${env.SUPABASE_URL}${path}`,
    {
      ...options,

      headers: {
        ...sbHeaders(
          env
        ),

        ...(options.headers || {})
      }
    }
  );
}

/*
 * ============================================================
 * AUTH
 * ============================================================
 */

async function currentUser(
  request,
  env
) {
  const auth =
    request.headers.get(
      "Authorization"
    ) || "";

  if (
    !auth.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const token =
    auth
      .slice(7)
      .trim();

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

async function requireUser(
  request,
  env
) {
  const user =
    await currentUser(
      request,
      env
    );

  if (
    !user?.id
  ) {
    throw new HttpError(
      "Unauthorized",
      401
    );
  }

  return user;
}

/*
 * ============================================================
 * ROLE SYSTEM
 * ============================================================
 *
 * Role berasal dari:
 *
 * public.user_roles.user_id
 *        ↓
 * auth.users.id
 *
 * Role yang valid:
 * - user
 * - admin
 * - owner
 *
 * Owner juga memiliki hak admin.
 * Tidak ada email owner yang di-hardcode.
 * ============================================================
 */

const VALID_ROLES = [
  "user",
  "admin",
  "owner"
];

function isValidRole(
  role
) {
  return VALID_ROLES.includes(
    String(
      role || ""
    ).toLowerCase()
  );
}

function isAdminRole(
  role
) {
  return (
    role === "admin" ||
    role === "owner"
  );
}

async function getUserRole(
  userId,
  env
) {
  if (!userId) {
    return null;
  }

  const roleRows =
    await rows(
      `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(
        userId
      )}&select=user_id,role&limit=1`,
      env
    );

  const role =
    roleRows?.[0]?.role ||
    null;

  return isValidRole(
    role
  )
    ? role
    : null;
}

async function ensureUserRole(
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

  /*
   * User baru otomatis dibuat
   * sebagai role user.
   *
   * Tidak pernah otomatis menjadi
   * admin atau owner.
   */
  const createRole =
    await sb(
      "/rest/v1/user_roles",
      {
        method:
          "POST",

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

  if (
    !createRole.ok
  ) {
    /*
     * Bisa terjadi race condition:
     * request lain sudah membuat
     * role user lebih dulu.
     *
     * Jadi kita baca ulang.
     */
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

async function requireAdmin(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  /*
   * Admin DAN Owner boleh mengakses
   * seluruh endpoint /api/admin/*
   */
  const res =
    await sb(
      `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(
        user.id
      )}&role=in.(admin,owner)&select=user_id,role&limit=1`,
      {},
      env
    );

  if (
    !res.ok
  ) {
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

/*
 * ============================================================
 * GENERATION RATE LIMIT
 * ============================================================
 */

const GENERATE_LIMIT_WINDOW_MS =
  60_000;

const GENERATE_LIMIT_MAX =
  5;

const generateRate =
  new Map();

function checkGenerateRate(
  userId
) {
  const now =
    Date.now();

  const key =
    String(
      userId
    );

  const hit =
    generateRate.get(
      key
    );

  if (
    !hit ||
    now -
      hit.startedAt >=
      GENERATE_LIMIT_WINDOW_MS
  ) {
    generateRate.set(
      key,
      {
        startedAt:
          now,

        count:
          1
      }
    );

    return;
  }

  if (
    hit.count >=
    GENERATE_LIMIT_MAX
  ) {
    throw new HttpError(
      "Terlalu banyak request generate. Coba lagi dalam satu menit.",
      429
    );
  }

  hit.count++;
}

/*
 * ============================================================
 * PROVIDER DATABASE
 * ============================================================
 */

async function getProvider(
  provider,
  env,
  requireEnabled = true
) {
  const id =
    canonicalProvider(
      provider
    );

  if (!id) {
    throw new HttpError(
      "Provider wajib diberikan.",
      400
    );
  }

  const res =
    await sb(
      `/rest/v1/providers?id=eq.${encodeURIComponent(
        id
      )}&select=id,name,adapter,api_key,enabled,config`,
      {},
      env
    );

  if (
    !res.ok
  ) {
    throw new HttpError(
      "Gagal mengambil konfigurasi provider.",
      500
    );
  }

  const row =
    (
      await res.json()
    )?.[0];

  if (!row) {
    throw new HttpError(
      "Provider tidak ditemukan.",
      404
    );
  }

  if (
    requireEnabled &&
    !row.enabled
  ) {
    throw new HttpError(
      "Provider sedang nonaktif.",
      409
    );
  }

  const adapter =
    resolveAdapter(
      row
    );

  if (!adapter) {
    throw new HttpError(
      `Adapter provider ${id} belum didukung Worker.`,
      400
    );
  }

  if (
    !row.api_key
  ) {
    throw new HttpError(
      `API key ${id} belum dikonfigurasi admin.`,
      400
    );
  }

  return row;
}

async function providerConfigured(
  provider,
  env
) {
  try {
    const p =
      await getProvider(
        provider,
        env,
        false
      );

    return Boolean(
      p.api_key &&
      p.enabled &&
      adapterSupported(
        p
      )
    );
  } catch {
    return false;
  }
}

function publicProvider(
  p
) {
  const info =
    adapterInfo(
      p.adapter
    );

  return {
    id:
      p.id,

    name:
      p.name ||
      info?.name ||
      p.id,

    adapter:
      p.adapter,

    enabled:
      Boolean(
        p.enabled
      ),

    configured:
      Boolean(
        p.api_key
      ),

    capabilities:
      info?.capabilities ||
      {}
  };
}

/*
 * ============================================================
 * DATA URL
 * ============================================================
 */

function parseDataUrl(
  value,
  maxBytes =
    12 * 1024 * 1024
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const m =
    value.match(
      /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/s
    );

  if (!m) {
    return null;
  }

  const base64 =
    m[2].replace(
      /\s/g,
      ""
    );

  if (
    base64.length *
      0.75 >
    maxBytes
  ) {
    return null;
  }

  return {
    mimeType:
      m[1],

    base64
  };
}

function normalizeDuration(
  value,
  allowed,
  fallback
) {
  const n =
    Number(
      value ||
        fallback
    );

  return allowed.includes(
    n
  )
    ? n
    : null;
}

/*
 * ============================================================
 * JOB MANAGEMENT
 * ============================================================
 */

async function reserveJob(
  userId,
  provider,
  cost,
  idempotencyKey,
  fingerprint,
  env
) {
  const res =
    await sb(
      "/rest/v1/rpc/start_video_job",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            p_user_id:
              userId,

            p_provider:
              provider,

            p_credit_cost:
              cost,

            p_idempotency_key:
              idempotencyKey,

            p_request_fingerprint:
              fingerprint
          })
      },
      env
    );

  const data =
    await safeJson(
      res
    );

  if (
    !res.ok
  ) {
    throw new HttpError(
      apiError(
        data,
        "Credit tidak mencukupi."
      ),
      402
    );
  }

  return data;
}

async function updateJob(
  jobId,
  patch,
  env
) {
  const r =
    await sb(
      `/rest/v1/video_jobs?id=eq.${encodeURIComponent(
        jobId
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
            ...patch,

            updated_at:
              new Date()
                .toISOString()
          })
      },
      env
    );

  if (
    !r.ok
  ) {
    throw new HttpError(
      "Gagal memperbarui status job.",
      500
    );
  }
}

async function recordJobEvent(
  jobId,
  userId,
  eventType,
  extra,
  env
) {
  try {
    await sb(
      "/rest/v1/rpc/record_video_job_event",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            p_job_id:
              jobId,

            p_user_id:
              userId,

            p_event_type:
              eventType,

            p_provider_status:
              extra?.providerStatus ||
              null,

            p_error_code:
              extra?.errorCode ||
              null,

            p_message:
              extra?.message ||
              "",

            p_metadata:
              extra?.metadata ||
              {}
          })
      },
      env
    );
  } catch (err) {
    console.error(
      "job event logging failed",
      err
    );
  }
}

async function refundJob(
  jobId,
  env
) {
  const res =
    await sb(
      "/rest/v1/rpc/refund_video_job",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            p_job_id:
              jobId
          })
      },
      env
    );

  return res.ok;
}

async function getJob(
  userId,
  provider,
  externalId,
  env
) {
  const q =
    `/rest/v1/video_jobs?user_id=eq.${encodeURIComponent(
      userId
    )}&provider=eq.${encodeURIComponent(
      provider
    )}&external_id=eq.${encodeURIComponent(
      externalId
    )}&select=*`;

  const res =
    await sb(
      q,
      {},
      env
    );

  if (
    !res.ok
  ) {
    throw new HttpError(
      "Gagal membaca job video.",
      500
    );
  }

  const rows =
    await res.json();

  return (
    rows?.[0] ||
    null
  );
}

/*
 * ============================================================
 * GENERATE ROUTER
 * ============================================================
 */

async function handleGenerate(
  request,
  env
) {
  const ct =
    String(
      request.headers.get(
        "content-type"
      ) || ""
    ).toLowerCase();

  if (
    !ct.includes(
      "application/json"
    )
  ) {
    throw new HttpError(
      "Content-Type harus application/json.",
      415
    );
  }

  const user =
    await requireUser(
      request,
      env
    );

  checkGenerateRate(
    user.id
  );

  let body;

  try {
    body =
      await readJson(
        request
      );
  } catch {
    throw new HttpError(
      "JSON tidak valid.",
      400
    );
  }

  const id =
    canonicalProvider(
      body?.provider
    );

  if (!id) {
    throw new HttpError(
      "Provider wajib diberikan.",
      400
    );
  }

  const provider =
    await getProvider(
      id,
      env,
      true
    );

  const adapter =
    resolveAdapter(
      provider
    );

  if (!adapter) {
    throw new HttpError(
      `Adapter provider ${id} belum didukung Worker.`,
      400
    );
  }

  const prompt =
    String(
      body?.prompt ||
        ""
    ).trim();

  if (
    prompt.length < 3 ||
    prompt.length > 2000
  ) {
    throw new HttpError(
      "Prompt harus 3-2000 karakter.",
      400
    );
  }

  /*
   * Parameter asli generation.
   * Dipertahankan agar Riwayat Video
   * selalu memiliki detail generation.
   */
  const requestedModel =
    body?.model != null
      ? String(
          body.model
        ).trim()
      : null;

  const requestedDuration =
    body?.duration != null
      ? Number(
          body.duration
        )
      : null;

  const requestedAspectRatio =
    body?.aspectRatio != null
      ? String(
          body.aspectRatio
        ).trim()
      : null;

  const requestedResolution =
    body?.resolution != null
      ? String(
          body.resolution
        ).trim()
      : null;

  const cost =
    Math.max(
      1,
      Number(
        env.GENERATION_CREDIT_COST ||
          1
      )
    );

  const idem =
    String(
      request.headers.get(
        "Idempotency-Key"
      ) || ""
    ).trim();

  if (
    !idem ||
    idem.length > 128
  ) {
    throw new HttpError(
      "Idempotency-Key wajib diisi (1-128 karakter).",
      400
    );
  }

  const fingerprintSource =
    JSON.stringify({
      provider:
        id,

      model:
        requestedModel,

      duration:
        requestedDuration,

      aspectRatio:
        requestedAspectRatio,

      resolution:
        requestedResolution,

      prompt,

      imageData:
        Boolean(
          body.imageData
        )
    });

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        fingerprintSource
      )
    );

  const fingerprint =
    Array.from(
      new Uint8Array(
        digest
      )
    )
      .map(
        b =>
          b
            .toString(16)
            .padStart(
              2,
              "0"
            )
      )
      .join("");

  const reservation =
    await reserveJob(
      user.id,
      id,
      cost,
      idem,
      fingerprint,
      env
    );

  const jobId =
    reservation?.job_id ||
    reservation?.id;

  if (!jobId) {
    throw new HttpError(
      "Gagal membuat job credit.",
      500
    );
  }

  if (
    reservation?.existing
  ) {
    if (
      reservation.provider !==
      id
    ) {
      throw new HttpError(
        "Idempotency key terkait provider berbeda.",
        409
      );
    }

    if (
      reservation.external_id
    ) {
      return json(
        {
          success:
            true,

          idempotent:
            true,

          jobId,

          externalId:
            reservation.external_id,

          provider:
            id,

          status:
            reservation.status ||
            "processing"
        },
        200,
        env
      );
    }

    throw new HttpError(
      "Request sebelumnya masih dalam proses inisialisasi. Gunakan status job setelah beberapa saat.",
      409
    );
  }

  try {
    const initialMetadata =
      {
        provider:
          id,

        adapter:
          provider.adapter,

        prompt,

        model:
          requestedModel,

        duration:
          requestedDuration,

        aspectRatio:
          requestedAspectRatio,

        resolution:
          requestedResolution
      };

    await updateJob(
      jobId,
      {
        model:
          requestedModel,

        metadata:
          initialMetadata
      },
      env
    );

    await recordJobEvent(
      jobId,
      user.id,
      "created",
      {
        message:
          "Generation job created",

        metadata:
          initialMetadata
      },
      env
    );

    const result =
      await adapter.generate(
        body,
        provider,
        env
      );

    if (
      !result ||
      !result.externalId
    ) {
      throw new HttpError(
        "Provider tidak mengembalikan ID proses.",
        502
      );
    }

    result.provider =
      id;

    const metadata =
      {
        ...initialMetadata,

        ...result,

        provider:
          id,

        adapter:
          provider.adapter,

        prompt,

        model:
          requestedModel ||
          result.model ||
          null,

        duration:
          requestedDuration,

        aspectRatio:
          requestedAspectRatio,

        resolution:
          requestedResolution
      };

    await updateJob(
      jobId,
      {
        external_id:
          result.externalId,

        status:
          result.status ||
          "processing",

        attempt_count:
          1,

        provider_status:
          result.status ||
          "processing",

        last_error:
          null,

        last_error_code:
          null,

        model:
          requestedModel ||
          result.model ||
          null,

        metadata
      },
      env
    );

    await recordJobEvent(
      jobId,
      user.id,
      "provider_submitted",
      {
        providerStatus:
          result.status ||
          "processing",

        message:
          "Provider accepted generation request",

        metadata
      },
      env
    );

    return json(
      {
        success:
          true,

        jobId,

        ...result,

        provider:
          id,

        creditsRemaining:
          reservation.credits_remaining
      },
      200,
      env
    );
  } catch (err) {
    await updateJob(
      jobId,
      {
        last_error:
          String(
            err?.message ||
              "Generation error"
          ),

        last_error_code:
          String(
            err?.status ||
              "provider_error"
          ),

        provider_status:
          "failed"
      },
      env
    ).catch(
      () => {}
    );

    await recordJobEvent(
      jobId,
      user.id,
      "error",
      {
        providerStatus:
          "failed",

        errorCode:
          String(
            err?.status ||
              "provider_error"
          ),

        message:
          String(
            err?.message ||
              "Generation error"
          )
      },
      env
    );

    await refundJob(
      jobId,
      env
    );

    await recordJobEvent(
      jobId,
      user.id,
      "refunded",
      {
        message:
          "Credit refunded after generation error"
      },
      env
    );

    throw err;
  }
}

/*
 * ============================================================
 * STATUS ROUTER
 * ============================================================
 */

async function handleStatus(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  requireJsonContentType(
    request
  );

  let body;

  try {
    body =
      await readJson(
        request
      );
  } catch {
    throw new HttpError(
      "JSON status tidak valid.",
      400
    );
  }

  const id =
    canonicalProvider(
      body?.provider
    );

  if (!id) {
    throw new HttpError(
      "Provider wajib diberikan.",
      400
    );
  }

  const externalId =
    String(
      body?.operationName ||
        body?.taskId ||
        body?.id ||
        ""
    ).trim();

  if (!externalId) {
    throw new HttpError(
      "ID proses video wajib diberikan.",
      400
    );
  }

  const job =
    await getJob(
      user.id,
      id,
      externalId,
      env
    );

  if (!job) {
    throw new HttpError(
      "Job tidak ditemukan.",
      404
    );
  }

  const provider =
    await getProvider(
      id,
      env,
      false
    );

  const adapter =
    resolveAdapter(
      provider
    );

  if (!adapter) {
    throw new HttpError(
      `Adapter provider ${id} belum didukung Worker.`,
      400
    );
  }

  const result =
    await adapter.status(
      externalId,
      provider,
      env
    );

  if (!result) {
    throw new HttpError(
      "Provider tidak mengembalikan status.",
      502
    );
  }

  result.provider =
    id;

  if (
    result.status ===
    "completed"
  ) {
    const proxyUrl =
      `/api/video?provider=${encodeURIComponent(
        id
      )}&jobId=${encodeURIComponent(
        job.id
      )}`;

    const previousMetadata =
      {
        ...(job.metadata ||
          {})
      };

    const nextMetadata =
      {
        ...previousMetadata,

        ...result,

        provider:
          id,

        adapter:
          provider.adapter,

        prompt:
          previousMetadata.prompt ||
          result.prompt ||
          null,

        model:
          previousMetadata.model ||
          result.model ||
          job.model ||
          null,

        duration:
          previousMetadata.duration ??
          result.duration ??
          null,

        aspectRatio:
          previousMetadata.aspectRatio ||
          result.aspectRatio ||
          null,

        resolution:
          previousMetadata.resolution ||
          result.resolution ||
          null
      };

    if (
      result.fileId
    ) {
      nextMetadata.provider_file_id =
        result.fileId;
    }

    await updateJob(
      job.id,
      {
        status:
          "completed",

        provider_status:
          "completed",

        last_error:
          null,

        last_error_code:
          null,

        video_url:
          result.videoUrl ||
          proxyUrl,

        model:
          nextMetadata.model,

        metadata:
          nextMetadata
      },
      env
    );

    await recordJobEvent(
      job.id,
      user.id,
      "completed",
      {
        providerStatus:
          "completed",

        message:
          "Provider generation completed",

        metadata:
          nextMetadata
      },
      env
    );

    result.videoUrl =
      proxyUrl;

    delete result.fileId;
  } else if (
    result.status ===
    "failed"
  ) {
    await updateJob(
      job.id,
      {
        status:
          "failed",

        provider_status:
          "failed",

        last_error:
          result.error ||
          "Provider reported failure",

        last_error_code:
          "provider_failed"
      },
      env
    );

    await recordJobEvent(
      job.id,
      user.id,
      "failed",
      {
        providerStatus:
          "failed",

        errorCode:
          "provider_failed",

        message:
          result.error ||
          "Provider reported failure"
      },
      env
    );

    await refundJob(
      job.id,
      env
    );

    await recordJobEvent(
      job.id,
      user.id,
      "refunded",
      {
        message:
          "Credit refunded after provider failure"
      },
      env
    );
  } else {
    await updateJob(
      job.id,
      {
        attempt_count:
          Number(
            job.attempt_count ||
              0
          ) + 1,

        provider_status:
          "processing"
      },
      env
    );

    await recordJobEvent(
      job.id,
      user.id,
      "poll_processing",
      {
        providerStatus:
          "processing",

        message:
          "Provider still processing",

        metadata:
          {
            adapter:
              provider.adapter
          }
      },
      env
    );
  }

  return json(
    {
      jobId:
        job.id,

      ...result
    },
    200,
    env
  );
}

/*
 * ============================================================
 * VIDEO PROXY
 * ============================================================
 */

async function handleVideo(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  const url =
    new URL(
      request.url
    );

  const id =
    canonicalProvider(
      url.searchParams.get(
        "provider"
      )
    );

  const jobId =
    String(
      url.searchParams.get(
        "jobId"
      ) || ""
    ).trim();

  if (!jobId) {
    throw new HttpError(
      "jobId wajib.",
      400
    );
  }

  if (!id) {
    throw new HttpError(
      "Provider wajib.",
      400
    );
  }

  const jobRows =
    await sb(
      `/rest/v1/video_jobs?id=eq.${encodeURIComponent(
        jobId
      )}&user_id=eq.${encodeURIComponent(
        user.id
      )}&select=id,user_id,provider,status,video_url,metadata&limit=1`,
      {},
      env
    );

  if (
    !jobRows.ok
  ) {
    throw new HttpError(
      "Gagal memeriksa job video.",
      500
    );
  }

  const job =
    (
      await jobRows.json()
    )?.[0];

  if (!job) {
    throw new HttpError(
      "Job video tidak ditemukan.",
      404
    );
  }

  if (
    job.provider !==
    id
  ) {
    throw new HttpError(
      "Provider job tidak cocok.",
      403
    );
  }

  if (
    job.status !==
    "completed"
  ) {
    throw new HttpError(
      "Video belum siap.",
      409
    );
  }

  const provider =
    await getProvider(
      id,
      env,
      false
    );

  const adapter =
    resolveAdapter(
      provider
    );

  if (!adapter) {
    throw new HttpError(
      `Adapter provider ${id} belum didukung Worker.`,
      400
    );
  }

  let target;

  if (
    String(
      provider.adapter ||
        ""
    ).toLowerCase() ===
    "minimax"
  ) {
    target =
      String(
        job?.metadata
          ?.provider_file_id ||
          ""
      ).trim();

    if (!target) {
      throw new HttpError(
        "File video MiniMax tidak tersedia.",
        404
      );
    }
  } else {
    target =
      String(
        job.video_url ||
          ""
      ).trim();

    if (
      !target ||
      target.startsWith(
        "/api/video"
      )
    ) {
      throw new HttpError(
        "URL video provider tidak tersedia.",
        404
      );
    }
  }

  const response =
    await adapter.fetchVideo(
      target,
      provider,
      env
    );

  if (!response) {
    throw new HttpError(
      "Provider tidak mengembalikan response video.",
      502
    );
  }

  if (
    !response.ok
  ) {
    throw new HttpError(
      `Gagal mengambil video (${response.status}).`,
      response.status
    );
  }

  return new Response(
    response.body,
    {
      status:
        200,

      headers: {
        ...corsHeaders(
          env
        ),

        "Content-Type":
          response.headers.get(
            "Content-Type"
          ) ||
          "video/mp4",

        "Cache-Control":
          "private, no-store"
      }
    }
  );
}

/*
 * ============================================================
 * TRANSACTIONS
 * ============================================================
 */

async function transactionApi(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  const url =
    new URL(
      request.url
    );

  const limit =
    Math.min(
      100,
      Math.max(
        1,
        Number(
          url.searchParams.get(
            "limit"
          ) || 30
        )
      )
    );

  const txRows =
    await sb(
      `/rest/v1/credit_transactions?user_id=eq.${encodeURIComponent(
        user.id
      )}&select=id,amount,balance_after,type,reference_id,note,created_at&order=created_at.desc&limit=${limit}`,
      {},
      env
    );

  if (
    !txRows.ok
  ) {
    const data =
      await safeJson(
        txRows
      );

    console.error(
      "credit transaction query failed",
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
        await txRows.json()
    },
    200,
    env
  );
}

/*
 * ============================================================
 * TOPUP
 * ============================================================
 */

async function topupApi(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  const url =
    new URL(
      request.url
    );

  if (
    request.method ===
    "GET"
  ) {
    const limit =
      Math.min(
        50,
        Math.max(
          1,
          Number(
            url.searchParams.get(
              "limit"
            ) || 20
          )
        )
      );

    const r =
      await sb(
        `/rest/v1/credit_topup_requests?user_id=eq.${encodeURIComponent(
          user.id
        )}&select=id,amount,note,status,admin_note,created_at,reviewed_at&order=created_at.desc&limit=${limit}`,
        {},
        env
      );

    if (
      !r.ok
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
          await r.json()
      },
      200,
      env
    );
  }

  if (
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

    const amount =
      Number(
        body.amount
      );

    const note =
      String(
        body.note ||
          ""
      )
        .trim()
        .slice(
          0,
          500
        );

    if (
      !Number.isInteger(
        amount
      ) ||
      amount <= 0 ||
      amount > 1000000
    ) {
      throw new HttpError(
        "Jumlah top-up harus integer antara 1 dan 1.000.000.",
        400
      );
    }

    const pending =
      await rows(
        `/rest/v1/credit_topup_requests?user_id=eq.${encodeURIComponent(
          user.id
        )}&status=eq.pending&select=id&limit=1`,
        env
      );

    if (
      pending.length
    ) {
      throw new HttpError(
        "Anda masih memiliki request top-up yang menunggu diproses.",
        409
      );
    }

    const r =
      await sb(
        "/rest/v1/credit_topup_requests",
        {
          method:
            "POST",

          headers: {
            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify({
              user_id:
                user.id,

              amount,

              note
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
          "Gagal membuat request top-up."
        ),
        r.status
      );
    }

    return json(
      {
        success:
          true,

        request:
          (
            await r.json()
          )?.[0] ||
          null
      },
      201,
      env
    );
  }

  throw new HttpError(
    "Method tidak didukung.",
    405
  );
}

/*
 * ============================================================
 * ACCOUNT
 * ============================================================
 *
 * PERBAIKAN UTAMA:
 * - Role diambil berdasarkan UID.
 * - Role user/admin/owner.
 * - Owner dianggap admin.
 * - roleValidated dikirim ke frontend.
 * ============================================================
 */

async function accountApi(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  const creditRows =
    await rowsForAccount(
      user.id,
      env
    );

  const role =
    await ensureUserRole(
      user.id,
      env
    );

  const roleValidated =
    isValidRole(
      role
    );

  const isAdmin =
    isAdminRole(
      role
    );

  const contactRes =
    await sb(
      "/rest/v1/app_settings?setting_key=eq.admin_contact_url&select=setting_value",
      {},
      env
    );

  const contactRows =
    contactRes.ok
      ? await contactRes.json()
      : [];

  return json(
    {
      success:
        true,

      user: {
        id:
          user.id,

        email:
          user.email ||
          null
      },

      credits:
        Number(
          creditRows?.[0]
            ?.credits ||
            0
        ),

      role,

      roleValidated,

      isAdmin,

      adminContactUrl:
        contactRows?.[0]
          ?.setting_value ||
        ""
    },
    200,
    env
  );
}

async function rowsForAccount(
  userId,
  env
) {
  const res =
    await sb(
      `/rest/v1/user_credits?user_id=eq.${encodeURIComponent(
        userId
      )}&select=credits`,
      {},
      env
    );

  if (
    !res.ok
  ) {
    throw new HttpError(
      "Gagal mengambil credit.",
      500
    );
  }

  return await res.json();
}

/*
 * ============================================================
 * ADMIN API
 * ============================================================
 */

async function adminApi(
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
   *
   * PERBAIKAN:
   * Owner ikut dianggap admin.
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
   *
   * Email hanya digunakan untuk
   * mencari UID.
   *
   * Yang disimpan tetap UID.
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

    /*
     * Jangan mengubah Owner menjadi Admin.
     * Jika sudah Owner, biarkan Owner.
     */
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
   *
   * Owner tidak dapat dihapus melalui
   * endpoint admin biasa.
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

    /*
     * Tetap menggunakan RPC existing
     * supaya transaksi/logic database
     * lama tidak berubah.
     */
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

/*
 * ============================================================
 * GENERIC DATABASE HELPERS
 * ============================================================
 */

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

/*
 * ============================================================
 * WORKER ENTRY
 * ============================================================
 */

export default {
  async scheduled(
    event,
    env,
    ctx
  ) {
    ctx.waitUntil(
      sb(
        "/rest/v1/rpc/recover_stale_video_jobs",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              p_max_age_minutes:
                1440
            })
        },
        env
      ).catch(
        err =>
          console.error(
            "stale job recovery failed",
            err
          )
      )
    );
  },

  async fetch(
    request,
    env
  ) {
    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status:
            204,

          headers:
            corsHeaders(
              env
            )
        }
      );
    }

    const url =
      new URL(
        request.url
      );

    try {
      /*
       * ------------------------------------------------------
       * CONFIG
       * ------------------------------------------------------
       */

      if (
        url.pathname ===
          "/api/config" &&
        request.method ===
          "GET"
      ) {
        return json(
          {
            success:
              true,

            supabaseUrl:
              env.SUPABASE_URL ||
              "",

            supabasePublishableKey:
              env.SUPABASE_PUBLISHABLE_KEY ||
              ""
          },
          200,
          env
        );
      }

      /*
       * ------------------------------------------------------
       * DIAGNOSTIC
       * ------------------------------------------------------
       */

      if (
        url.pathname ===
          "/api/diagnostic" &&
        request.method ===
          "GET"
      ) {
        const ps =
          await rows(
            "/rest/v1/providers?select=id,name,adapter,enabled,api_key",
            env
          );

        return json(
          {
            success:
              true,

            worker:
              "GEN-Z.AI",

            supabaseConfigured:
              Boolean(
                env.SUPABASE_URL &&
                env.SUPABASE_SERVICE_ROLE_KEY
              ),

            providers:
              ps.map(
                p => ({
                  id:
                    p.id,

                  name:
                    p.name,

                  adapter:
                    p.adapter,

                  enabled:
                    Boolean(
                      p.enabled
                    ),

                  configured:
                    Boolean(
                      p.api_key
                    ),

                  adapterSupported:
                    Boolean(
                      adapterInfo(
                        p.adapter
                      )
                    )
                })
              ),

            timestamp:
              new Date()
                .toISOString()
          },
          200,
          env
        );
      }

      /*
       * ------------------------------------------------------
       * PUBLIC PROVIDERS
       * ------------------------------------------------------
       */

      if (
        url.pathname ===
          "/api/providers" &&
        request.method ===
          "GET"
      ) {
        const ps =
          await rows(
            "/rest/v1/providers?enabled=eq.true&select=id,name,adapter,enabled,api_key&order=name.asc",
            env
          );

        return json(
          {
            success:
              true,

            providers:
              ps
                .filter(
                  p =>
                    p.api_key &&
                    adapterInfo(
                      p.adapter
                    )
                )
                .map(
                  publicProvider
                )
          },
          200,
          env
        );
      }

      /*
       * ------------------------------------------------------
       * ADMIN
       * ------------------------------------------------------
       */

      if (
        url.pathname.startsWith(
          "/api/admin/"
        )
      ) {
        return await adminApi(
          request,
          env
        );
      }

      /*
 * ------------------------------------------------------
 * DASHBOARD REFERENCES
 * ------------------------------------------------------
 */

if (
  url.pathname ===
    "/api/dashboard/references" &&
  request.method ===
    "GET"
) {
  return await dashboardReferencesApi(
    request,
    env
  );
}
      

      /*
       * ------------------------------------------------------
       * ACCOUNT
       * ------------------------------------------------------
       */

      if (
        url.pathname ===
          "/api/account/credits" &&
        request.method ===
          "GET"
      ) {
        return await accountApi(
          request,
          env
        );
      }

      /*
       * ------------------------------------------------------
       * TRANSACTIONS
       * ------------------------------------------------------
       */

      if (
        url.pathname ===
          "/api/account/transactions" &&
        request.method ===
          "GET"
      ) {
        return await transactionApi(
          request,
          env
        );
      }

      /*
       * ------------------------------------------------------
       * USER TOPUP
       * ------------------------------------------------------
       */

      if (
        url.pathname ===
        "/api/account/topup-requests"
      ) {
        return await topupApi(
          request,
          env
        );
      }

      /*
       * ------------------------------------------------------
       * GENERATE
       * ------------------------------------------------------
       */

      if (
        url.pathname ===
          "/api/generate" &&
        request.method ===
          "POST"
      ) {
        const len =
          Number(
            request.headers.get(
              "content-length"
            ) || 0
          );

        if (
          len >
          65536
        ) {
          throw new HttpError(
            "Request generation terlalu besar.",
            413
          );
        }

        return await handleGenerate(
          request,
          env
        );
      }

      /*
       * ------------------------------------------------------
       * GENERATE STATUS
       * ------------------------------------------------------
       */

      if (
        url.pathname ===
          "/api/generate/status" &&
        request.method ===
          "POST"
      ) {
        return await handleStatus(
          request,
          env
        );
      }

      /*
       * ------------------------------------------------------
       * VIDEO
       * ------------------------------------------------------
       */

      if (
        url.pathname ===
          "/api/video" &&
        request.method ===
          "GET"
      ) {
        return await handleVideo(
          request,
          env
        );
      }

      /*
       * ------------------------------------------------------
       * STATIC ASSETS
       * ------------------------------------------------------
       */

      return env.ASSETS.fetch(
        request
      );
    } catch (
      err
    ) {
      console.error(
        "request failed",
        Number(
          err?.status ||
            500
        ),
        String(
          err?.message ||
            "unknown"
        ).slice(
          0,
          300
        )
      );

      const status =
        Number(
          err?.status ||
            500
        );

      const message =
        status >= 500
          ? "Internal Worker error."
          : (
              err?.message ||
              "Request error."
            );

      return json(
        {
          success:
            false,

          error:
            message
        },
        status,
        env
      );
    }
  }
};

/*
 * ============================================================
 * DASHBOARD REFERENCES API
 * ============================================================
 */

const DASHBOARD_REFERENCE_CATEGORIES = [
  "all",
  "vlog",
  "motion",
  "affiliate",
  "fashion",
  "product"
];

function validateReferenceUrl(
  value,
  fieldName,
  required = false
) {
  const raw =
    String(value || "").trim();

  if (!raw) {
    if (required) {
      throw new HttpError(
        `${fieldName} wajib diisi.`,
        400
      );
    }

    return "";
  }

  let parsed;

  try {
    parsed = new URL(raw);
  } catch {
    throw new HttpError(
      `${fieldName} tidak valid.`,
      400
    );
  }

  if (
    !["http:", "https:"].includes(
      parsed.protocol
    )
  ) {
    throw new HttpError(
      `${fieldName} harus menggunakan URL http atau https.`,
      400
    );
  }

  return parsed.toString();
}

function normalizeDashboardReference(
  body,
  partial = false
) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new HttpError(
      "Data referensi tidak valid.",
      400
    );
  }

  const result = {};

  if (
    !partial ||
    body.title !== undefined
  ) {
    const title =
      String(
        body.title || ""
      )
        .trim()
        .slice(0, 150);

    if (!title) {
      throw new HttpError(
        "Judul video wajib diisi.",
        400
      );
    }

    result.title = title;
  }

  if (
    !partial ||
    body.category !== undefined
  ) {
    const category =
      String(
        body.category || "all"
      )
        .trim()
        .toLowerCase();

    if (
      !DASHBOARD_REFERENCE_CATEGORIES.includes(
        category
      )
    ) {
      throw new HttpError(
        "Kategori referensi tidak valid.",
        400
      );
    }

    result.category =
      category;
  }

  if (
    !partial ||
    body.category_label !== undefined
  ) {
    result.category_label =
      String(
        body.category_label ||
          body.category ||
          "Semua"
      )
        .trim()
        .slice(0, 100);
  }

  if (
    !partial ||
    body.description !== undefined
  ) {
    result.description =
      String(
        body.description || ""
      )
        .trim()
        .slice(0, 1000);
  }

  if (
    !partial ||
    body.video_url !== undefined
  ) {
    result.video_url =
      validateReferenceUrl(
        body.video_url,
        "URL video",
        true
      );
  }

  if (
    !partial ||
    body.poster_url !== undefined
  ) {
    result.poster_url =
      validateReferenceUrl(
        body.poster_url,
        "URL poster",
        false
      );
  }

  if (
    !partial ||
    body.provider !== undefined
  ) {
    result.provider =
      String(
        body.provider || ""
      )
        .trim()
        .slice(0, 100);
  }

  if (
    !partial ||
    body.model !== undefined
  ) {
    result.model =
      String(
        body.model || ""
      )
        .trim()
        .slice(0, 150);
  }

  if (
    !partial ||
    body.duration !== undefined
  ) {
    result.duration =
      String(
        body.duration ||
          "10 detik"
      )
        .trim()
        .slice(0, 50);
  }

  if (
    !partial ||
    body.aspect_ratio !== undefined
  ) {
    result.aspect_ratio =
      String(
        body.aspect_ratio ||
          "9:16"
      )
        .trim()
        .slice(0, 30);
  }

  if (
    !partial ||
    body.resolution !== undefined
  ) {
    result.resolution =
      String(
        body.resolution ||
          "4K"
      )
        .trim()
        .slice(0, 30);
  }

  if (
    !partial ||
    body.prompt !== undefined
  ) {
    result.prompt =
      String(
        body.prompt || ""
      )
        .trim()
        .slice(0, 5000);
  }

  if (
    !partial ||
    body.sort_order !== undefined
  ) {
    const sortOrder =
      Number(
        body.sort_order ?? 0
      );

    if (
      !Number.isInteger(
        sortOrder
      )
    ) {
      throw new HttpError(
        "Urutan referensi harus berupa angka integer.",
        400
      );
    }

    result.sort_order =
      sortOrder;
  }

  if (
    !partial ||
    body.enabled !== undefined
  ) {
    result.enabled =
      body.enabled !== false;
  }

  return result;
}

async function dashboardReferencesApi(
  request,
  env
) {
  await requireUser(
    request,
    env
  );

  if (
    request.method !== "GET"
  ) {
    throw new HttpError(
      "Method tidak didukung.",
      405
    );
  }

  const url =
    new URL(
      request.url
    );

  const category =
    String(
      url.searchParams.get(
        "category"
      ) || "all"
    )
      .trim()
      .toLowerCase();

  if (
    category !== "all" &&
    !DASHBOARD_REFERENCE_CATEGORIES.includes(
      category
    )
  ) {
    throw new HttpError(
      "Kategori tidak valid.",
      400
    );
  }

  const categoryQuery =
    category === "all"
      ? ""
      : `&category=eq.${encodeURIComponent(
          category
        )}`;

  const response =
    await sb(
      `/rest/v1/dashboard_references?enabled=eq.true${categoryQuery}&select=id,title,category,category_label,description,video_url,poster_url,provider,model,duration,aspect_ratio,resolution,prompt,sort_order,enabled,created_at,updated_at&order=sort_order.asc,created_at.desc`,
      {},
      env
    );

  if (
    !response.ok
  ) {
    console.error(
      "dashboard references query failed",
      await safeJson(
        response
      )
    );

    throw new HttpError(
      "Gagal mengambil video referensi.",
      500
    );
  }

  const references =
    await response.json();

  return json(
    {
      success: true,
      references:
        references || []
    },
    200,
    env
  );
}
