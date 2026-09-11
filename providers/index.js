// ============================================================
// GEN-Z.AI
// PROVIDER COMPATIBILITY BRIDGE
// ============================================================
//
// File ini menjadi penghubung antara worker.js dengan provider
// adapter yang sebenarnya berada di:
//
//   /public/js/providers/
//
// Jangan simpan API key di file ini.
// API key tetap berasal dari database dan diproses server-side.
// ============================================================

export {
  getAdapter,
  getAdapterInfo,
  listAdapters,
  resolveAdapter,
  adapterSupported,
  normalizeProviderId
} from "../public/js/providers/index.js";

export {
  default
} from "../public/js/providers/index.js";
