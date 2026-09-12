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
