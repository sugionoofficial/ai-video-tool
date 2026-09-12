import {
  getAdapter,
  getAdapterInfo
} from "./index.js";

import {
  HttpError
} from "../lib/http.js";

export function canonicalProvider(value) {
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

export function providerId(value) {
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

export function adapterInfo(adapter) {
  return getAdapterInfo(adapter);
}

export function inferAdapter(value) {
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
