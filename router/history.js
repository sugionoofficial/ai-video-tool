// ============================================================
// GEN-Z.AI
// HISTORY API
// ============================================================

import {
  HttpError,
  json,
  safeJson
} from "../lib/http.js";

import {
  requireUser
} from "../auth/auth.js";

import {
  sb
} from "../lib/supabase.js";


const MAX_HISTORY_LIMIT =
  1000;


function normalizeUserId(
  value
) {
  const id =
    String(
      value || ""
    ).trim();

  if (!id) {
    throw new HttpError(
      "User tidak valid.",
      401
    );
  }

  if (id.length > 256) {
    throw new HttpError(
      "User tidak valid.",
      401
    );
  }

  return id;
}


function normalizeLimit(
  value
) {
  const parsed =
    Number(
      value
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed <= 0
  ) {
    return 100;
  }

  return Math.min(
    Math.floor(
      parsed
    ),
    MAX_HISTORY_LIMIT
  );
}


function normalizeOffset(
  value
) {
  const parsed =
    Number(
      value
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed < 0
  ) {
    return 0;
  }

  return Math.floor(
    parsed
  );
}


export async function historyApi(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  const userId =
    normalizeUserId(
      user?.id
    );

  const url =
    new URL(
      request.url
    );

  const limit =
    normalizeLimit(
      url.searchParams.get(
        "limit"
      )
    );

  const offset =
    normalizeOffset(
      url.searchParams.get(
        "offset"
      )
    );

  const from =
    offset;

  const to =
    offset +
    limit -
    1;


  const query =
    `/rest/v1/video_jobs` +
    `?user_id=eq.${encodeURIComponent(
      userId
    )}` +
    `&select=` +
    [
      "id",
      "user_id",
      "provider",
      "external_id",
      "status",
      "credit_cost",
      "refunded",
      "model",
      "video_url",
      "metadata",
      "attempt_count",
      "last_error",
      "last_error_code",
      "provider_status",
      "created_at",
      "updated_at"
    ].join(",") +
    `&order=created_at.desc` +
    `&offset=${from}` +
    `&limit=${limit}`;


  const response =
    await sb(
      query,
      {
        headers: {
          Accept:
            "application/json",

          Prefer:
            "count=exact"
        }
      },
      env
    );


  if (
    !response.ok
  ) {
    const errorBody =
      await safeJson(
        response
      );

    console.error(
      "history lookup failed",
      {
        status:
          response.status,

        error:
          errorBody
      }
    );

    throw new HttpError(
      "Gagal mengambil riwayat video.",
      500
    );
  }


  const rows =
    await safeJson(
      response
    );


  const jobs =
    Array.isArray(
      rows
    )
      ? rows
      : [];

    /*
   * Ambil nama provider berdasarkan Provider ID.
   *
   * provider tetap digunakan sebagai ID internal.
   * provider_name hanya untuk tampilan UI.
   */
  const providerIds = [
    ...new Set(
      jobs
        .map(
          job =>
            String(
              job?.provider || ""
            )
              .trim()
              .toLowerCase()
        )
        .filter(Boolean)
    )
  ];

  const providerNames = {};

  if (providerIds.length) {
    const providerFilter =
      providerIds
        .map(
          id =>
            `"${id.replace(/"/g, '\\"')}"`
        )
        .join(",");

    const providerResponse =
      await sb(
        `/rest/v1/providers` +
          `?id=in.(${encodeURIComponent(
            providerFilter
          )})` +
          `&select=id,name`,
        {
          headers: {
            Accept:
              "application/json"
          }
        },
        env
      );

    if (providerResponse.ok) {
      const providerRows =
        await safeJson(
          providerResponse
        );

      if (
        Array.isArray(
          providerRows
        )
      ) {
        providerRows.forEach(
          provider => {
            const id =
              String(
                provider?.id || ""
              )
                .trim()
                .toLowerCase();

            const name =
              String(
                provider?.name || ""
              ).trim();

            if (
              id &&
              name
            ) {
              providerNames[id] =
                name;
            }
          }
        );
      }
    }
  }

  /*
   * Tambahkan nama provider hanya
   * untuk kebutuhan tampilan History.
   *
   * provider tetap tidak berubah.
   */
  jobs.forEach(
    job => {
      const providerId =
        String(
          job?.provider || ""
        )
          .trim()
          .toLowerCase();

      job.provider_name =
        providerNames[
          providerId
        ] ||
        "";
    }
  );


  const contentRange =
    response.headers.get(
      "content-range"
    ) || "";


  let total =
    jobs.length;


  const rangeMatch =
    contentRange.match(
      /\/(\d+)$/
    );


  if (
    rangeMatch
  ) {
    total =
      Number(
        rangeMatch[1]
      );
  }


  return json(
    {
      success:
        true,

      user: {
        id:
          userId,

        email:
          user?.email ||
          null
      },

      jobs,

      count:
        jobs.length,

      total,

      offset,

      limit
    },
    200,
    env
  );
}
