import {
  HttpError,
  json,
  safeJson
} from "../lib/http.js";

import { requireUser } from "../auth/auth.js";
import { sb } from "../lib/supabase.js";

/*
 * ============================================================
 * DASHBOARD REFERENCES API
 * ============================================================
 *
 * Endpoint:
 * GET /api/dashboard/references
 *
 * Fungsi:
 * - Mengambil video referensi aktif.
 * - Mendukung filter kategori.
 * - Tidak mengekspos data yang tidak diperlukan.
 *
 * Catatan:
 * - CRUD admin tidak ditempatkan di sini.
 * - "all" hanya digunakan sebagai filter frontend,
 *   bukan sebagai kategori database.
 * ============================================================
 */

const DASHBOARD_REFERENCE_CATEGORIES = [
  "vlog",
  "motion",
  "affiliate",
  "fashion",
  "product"
];

const MAX_URL_LENGTH = 2048;

function validateReferenceUrl(
  value,
  fieldName,
  required = false
) {
  const raw =
    String(value || "")
      .trim();

  if (!raw) {
    if (required) {
      throw new HttpError(
        `${fieldName} wajib diisi.`,
        400
      );
    }

    return "";
  }

  if (
    raw.length >
    MAX_URL_LENGTH
  ) {
    throw new HttpError(
      `${fieldName} terlalu panjang.`,
      400
    );
  }

  let parsed;

  try {
    parsed =
      new URL(raw);
  } catch {
    throw new HttpError(
      `${fieldName} tidak valid.`,
      400
    );
  }

  if (
    ![
      "http:",
      "https:"
    ].includes(
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

    result.title =
      title;
  }

  if (
    !partial ||
    body.category !== undefined
  ) {
    const category =
      String(
        body.category || ""
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
    const categoryLabel =
      String(
        body.category_label ||
          body.category ||
          "Semua"
      )
        .trim()
        .slice(0, 100);

    result.category_label =
      categoryLabel ||
      "Semua";
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

    if (
      sortOrder <
        -100000 ||
      sortOrder >
        100000
    ) {
      throw new HttpError(
        "Urutan referensi berada di luar batas yang diizinkan.",
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

export async function dashboardReferencesApi(
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

  const requestedCategory =
    String(
      url.searchParams.get(
        "category"
      ) || "all"
    )
      .trim()
      .toLowerCase();

  /*
   * "all" hanya berarti tanpa filter.
   */
  if (
    requestedCategory !== "all" &&
    !DASHBOARD_REFERENCE_CATEGORIES.includes(
      requestedCategory
    )
  ) {
    throw new HttpError(
      "Kategori tidak valid.",
      400
    );
  }

  const categoryQuery =
    requestedCategory === "all"
      ? ""
      : `&category=eq.${encodeURIComponent(
          requestedCategory
        )}`;

  const response =
    await sb(
      `/rest/v1/dashboard_references?enabled=eq.true${categoryQuery}&select=id,title,category,category_label,description,video_url,poster_url,provider,model,duration,aspect_ratio,resolution,prompt,sort_order,enabled,created_at,updated_at&order=sort_order.asc,created_at.desc`,
      {
        headers: {
          Accept:
            "application/json"
        }
      },
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

  const data =
    await safeJson(
      response
    );

  const references =
    Array.isArray(
      data
    )
      ? data
      : [];

  return json(
    {
      success:
        true,

      category:
        requestedCategory,

      references
    },
    200,
    env
  );
}
