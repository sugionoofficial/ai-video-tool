import veo from "./veo.js";
import minimax from "./minimax.js";
import luma from "./luma.js";

const PROVIDERS = {
  veo,
  minimax,
  luma
};

const NAME_ALIASES = {
  gemini: "veo",
  "gemini / veo": "veo",
  "gemini/veo": "veo",
  veo: "veo",

  minimax: "minimax",
  "mini max": "minimax",

  luma: "luma",
  "luma ai": "luma"
};

export function normalizeProviderId(value) {
  const raw = String(
    value || ""
  )
    .trim()
    .toLowerCase();

  return NAME_ALIASES[raw] || raw;
}

export function getAdapter(adapter) {
  const id = normalizeProviderId(
    adapter
  );

  return PROVIDERS[id] || null;
}

export function getAdapterInfo(adapter) {
  const provider = getAdapter(
    adapter
  );

  if (!provider) {
    return null;
  }

  return typeof provider.info === "function"
    ? provider.info()
    : {
        id: provider.id,
        name: provider.name,
        capabilities:
          provider.capabilities || {}
      };
}

export function listAdapters() {
  return Object.values(PROVIDERS).map(
    provider =>
      typeof provider.info === "function"
        ? provider.info()
        : {
            id: provider.id,
            name: provider.name,
            capabilities:
              provider.capabilities || {}
          }
  );
}

export function resolveAdapter(
  provider
) {
  if (!provider) {
    return null;
  }

  const adapter =
    provider.adapter ||
    provider.id ||
    provider.name;

  return getAdapter(adapter);
}

export function adapterSupported(
  provider
) {
  return Boolean(
    resolveAdapter(provider)
  );
}

export default {
  getAdapter,
  getAdapterInfo,
  listAdapters,
  resolveAdapter,
  adapterSupported,
  normalizeProviderId
};
