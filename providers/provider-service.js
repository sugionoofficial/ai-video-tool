import { sb } from "../lib/supabase.js";
import { HttpError } from "../lib/http.js";

export async function getProvider(
  id,
  env,
  includeDisabled = false
) {
  const providerId = String(id || "")
    .trim()
    .toLowerCase();

  if (!providerId) {
    throw new HttpError(
      "Provider tidak valid.",
      400
    );
  }

  const query = includeDisabled
    ? "?id=eq." +
      encodeURIComponent(providerId) +
      "&select=*"
    : "?id=eq." +
      encodeURIComponent(providerId) +
      "&enabled=eq.true&select=*";

  const response = await sb(
    env,
    "/rest/v1/providers" + query,
    {
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new HttpError(
      "Gagal mengambil konfigurasi provider.",
      502
    );
  }

  const rows = await response.json();

  const provider = Array.isArray(rows)
    ? rows[0]
    : null;

  if (!provider) {
    throw new HttpError(
      "Provider tidak ditemukan atau tidak aktif.",
      404
    );
  }

  return provider;
}

export function publicProvider(provider) {
  if (!provider) {
    return null;
  }

  return {
    id: provider.id,
    name: provider.name,
    adapter: provider.adapter,
    enabled: Boolean(provider.enabled),
    config: provider.config || {},
    apiKeySet: Boolean(
      String(provider.api_key || "").trim()
    ),
    api_key_masked: provider.api_key
      ? "••••••••"
      : ""
  };
}
