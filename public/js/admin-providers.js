/*

* GEN-Z.AI
* Admin Provider Management
* 
* Adapter dibuat fleksibel:
* - Tidak lagi dibatasi oleh pilihan hard-coded.
* - Admin dapat memasukkan nama adapter secara manual.
* - Implementasi adapter tetap berada di file masing-masing.
* 
* Contoh:
* veo
* minimax
* luma
* kling
* runway
* adapter-provider-baru
  */

(function () {
"use strict";

const API_TIMEOUT = 15000;

const state = {
providers: [],
editingId: null,
loading: false,
initialized: false
};

function $(id) {
return document.getElementById(id);
}

function escapeHtml(value) {
return String(value ?? "")
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
}

function setStatus(message, type) {
const el = $("providerStatus");
if (!el) return;

el.textContent = message || "";
el.className = "status";

if (type) {
  el.classList.add(type);
}

}

async function waitForAuth() {
if (window.GENZ_AUTH_INITIALIZED) {
return true;
}

const started = Date.now();

while (Date.now() - started < 10000) {
  if (window.GENZ_AUTH_INITIALIZED) {
    return true;
  }

  await new Promise(function (resolve) {
    setTimeout(resolve, 100);
  });
}

return !!window.GENZ_AUTH_INITIALIZED;

}

async function getAuthToken() {
if (!window.GENZ || !window.GENZ.auth) {
throw new Error("Sistem autentikasi belum tersedia.");
}

if (typeof window.GENZ.auth.token === "function") {
  const token = await window.GENZ.auth.token();

  if (token) {
    return token;
  }
}

if (typeof window.GENZ.auth.getSession === "function") {
  const sessionResult = await window.GENZ.auth.getSession();

  const session =
    sessionResult &&
    sessionResult.data &&
    sessionResult.data.session
      ? sessionResult.data.session
      : sessionResult && sessionResult.session
        ? sessionResult.session
        : null;

  if (session && session.access_token) {
    return session.access_token;
  }
}

throw new Error("Sesi login tidak ditemukan.");

}

async function api(path, options) {
const opts = options || {};
const token = await getAuthToken();

const headers = Object.assign(
  {
    Accept: "application/json",
    Authorization: "Bearer " + token
  },
  opts.headers || {}
);

if (opts.body !== undefined && !headers["Content-Type"]) {
  headers["Content-Type"] = "application/json";
}

const controller = new AbortController();
const timeout = setTimeout(function () {
  controller.abort();
}, API_TIMEOUT);

try {
  const response = await fetch(path, {
    method: opts.method || "GET",
    headers: headers,
    body: opts.body,
    signal: controller.signal
  });

  let data = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = text ? { message: text } : null;
    } catch (error) {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error(
      (data && (data.error || data.message)) ||
      "Permintaan API gagal (" + response.status + ")."
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
} catch (error) {
  if (error && error.name === "AbortError") {
    const timeoutError = new Error(
      "Permintaan terlalu lama. Server tidak merespons."
    );

    timeoutError.status = 408;
    throw timeoutError;
  }

  throw error;
} finally {
  clearTimeout(timeout);
}

}

async function verifyAdmin() {
const data = await api("/api/account/credits");

const role =
  data &&
  (
    data.role ||
    (data.account && data.account.role) ||
    (data.user && data.user.role)
  );

const roleValidated =
  data &&
  (
    data.roleValidated === true ||
    data.role_validated === true
  );

const isAdmin =
  data &&
  (
    data.isAdmin === true ||
    data.is_admin === true ||
    role === "admin" ||
    role === "owner"
  );

if (!isAdmin || roleValidated !== true) {
  const error = new Error("Akses admin diperlukan.");
  error.status = 403;
  throw error;
}

return true;

}

function showApp() {
const denied = $("providerDenied");
const loading = $("providerLoading");
const app = $("providerApp");

if (denied) denied.hidden = true;
if (loading) loading.hidden = true;
if (app) app.hidden = false;

}

function showDenied(message) {
const denied = $("providerDenied");
const loading = $("providerLoading");
const app = $("providerApp");

if (loading) loading.hidden = true;
if (app) app.hidden = true;

if (denied) {
  denied.hidden = false;

  const messageEl = denied.querySelector(
    "[data-provider-denied-message]"
  );

  if (messageEl) {
    messageEl.textContent =
      message || "Anda tidak memiliki akses ke halaman ini.";
  }
}

setStatus(message || "Akses ditolak.", "error");

}

function normalizeProvider(provider) {
const item = provider || {};

return {
  id: item.id ?? item.provider_id ?? "",
  name: item.name ?? item.provider_name ?? "",
  adapter: item.adapter ?? "",
  config: item.config ?? {},
  enabled:
    item.enabled !== undefined
      ? !!item.enabled
      : item.active !== undefined
        ? !!item.active
        : true,
  apiKey:
    item.api_key ??
    item.apiKey ??
    "",
  createdAt:
    item.created_at ??
    item.createdAt ??
    null,
  updatedAt:
    item.updated_at ??
    item.updatedAt ??
    null
};

}

function renderProviders() {
const list = $("providerList");
const count = $("providerCount");

if (!list) return;

const providers = state.providers.map(normalizeProvider);

if (count) {
  count.textContent = String(providers.length);
}

if (!providers.length) {
  list.innerHTML =
    '<div class="empty-state">' +
    "<strong>Belum ada provider.</strong>" +
    "<span>Tambahkan provider pertama untuk mulai menggunakan sistem.</span>" +
    "</div>";

  return;
}

list.innerHTML = providers
  .map(function (provider) {
    const statusClass = provider.enabled ? "enabled" : "disabled";
    const statusText = provider.enabled ? "Aktif" : "Nonaktif";

    return (
      '<div class="provider-card" data-provider-id="' +
      escapeHtml(provider.id) +
      '">' +
        '<div class="provider-info">' +
          '<div class="provider-name">' +
            escapeHtml(provider.name || provider.id) +
          "</div>" +

          '<div class="provider-meta">' +
            "<span>ID: " +
            escapeHtml(provider.id) +
            "</span>" +

            "<span>Adapter: " +
            escapeHtml(provider.adapter || "-") +
            "</span>" +

            '<span class="provider-status ' +
            statusClass +
            '">' +
            statusText +
            "</span>" +
          "</div>" +
        "</div>" +

        '<div class="provider-actions">' +
          '<button type="button" class="btn btn-secondary" data-action="edit" data-id="' +
          escapeHtml(provider.id) +
          '">Edit</button>' +

          '<button type="button" class="btn btn-secondary" data-action="toggle" data-id="' +
          escapeHtml(provider.id) +
          '">' +
          (provider.enabled ? "Deactivate" : "Activate") +
          "</button>" +

          '<button type="button" class="btn btn-danger" data-action="delete" data-id="' +
          escapeHtml(provider.id) +
          '">Delete</button>' +
        "</div>" +
      "</div>"
    );
  })
  .join("");

}

async function loadProviders() {
if (state.loading) return;

state.loading = true;

const list = $("providerList");

if (list && !state.providers.length) {
  list.innerHTML =
    '<div class="loading-state">Memuat provider...</div>';
}

try {
  const data = await api("/api/admin/providers");

  const providers =
    Array.isArray(data)
      ? data
      : data && Array.isArray(data.providers)
        ? data.providers
        : data && Array.isArray(data.data)
          ? data.data
          : [];

  state.providers = providers.map(normalizeProvider);

  renderProviders();

  setStatus(
    state.providers.length +
      " provider berhasil dimuat.",
    "success"
  );
} catch (error) {
  console.error("GEN-Z.AI provider load error:", error);

  if (error.status === 401) {
    showDenied("Sesi login tidak valid. Silakan login kembali.");
  } else if (error.status === 403) {
    showDenied("Akses admin ditolak.");
  } else {
    setStatus(
      error.message || "Gagal memuat provider.",
      "error"
    );

    if (list) {
      list.innerHTML =
        '<div class="empty-state error-state">' +
        "<strong>Gagal memuat provider.</strong>" +
        "<span>" +
        escapeHtml(
          error.message || "Terjadi kesalahan pada server."
        ) +
        "</span>" +
        "</div>";
    }
  }
} finally {
  state.loading = false;
}

}

function renderEditor(provider) {
const editor = $("providerEditor");
const title = $("providerEditorTitle");

if (!editor) return;

const isEdit = !!provider;

state.editingId = isEdit ? provider.id : null;

if (title) {
  title.textContent = isEdit
    ? "Edit Provider"
    : "Tambah Provider";
}

const normalized = normalizeProvider(provider || {});

editor.hidden = false;

const idInput = $("providerIdInput");
const nameInput = $("providerNameInput");
const adapterInput = $("providerAdapterInput");
const apiKeyInput = $("providerApiKeyInput");
const configInput = $("providerConfigInput");
const enabledInput = $("providerEnabledInput");

if (idInput) {
  idInput.value = normalized.id || "";
  idInput.disabled = isEdit;
}

if (nameInput) {
  nameInput.value = normalized.name || "";
}

/*
 * Adapter sengaja menggunakan input text.
 * Tidak ada daftar provider hard-coded di halaman Admin.
 */
if (adapterInput) {
  adapterInput.value = normalized.adapter || "";
}

if (apiKeyInput) {
  apiKeyInput.value = "";
  apiKeyInput.placeholder = isEdit
    ? "Kosongkan jika tidak ingin mengubah API key"
    : "Masukkan API key";
}

if (configInput) {
  try {
    configInput.value = JSON.stringify(
      normalized.config || {},
      null,
      2
    );
  } catch (error) {
    configInput.value = "{}";
  }
}

if (enabledInput) {
  enabledInput.checked = normalized.enabled !== false;
}

setStatus(
  isEdit
    ? "Mode edit provider."
    : "Mode tambah provider.",
  ""
);

}

function closeEditor() {
const editor = $("providerEditor");

state.editingId = null;

if (editor) {
  editor.hidden = true;
}

const form = $("providerForm");

if (form) {
  form.reset();
}

const idInput = $("providerIdInput");

if (idInput) {
  idInput.disabled = false;
}

}

function parseConfig(value) {
const text = String(value || "").trim();

if (!text) {
  return {};
}

const parsed = JSON.parse(text);

if (
  parsed === null ||
  typeof parsed !== "object" ||
  Array.isArray(parsed)
) {
  throw new Error(
    "Config harus berupa JSON object."
  );
}

return parsed;

}

async function saveProvider(event) {
if (event) {
event.preventDefault();
}

const idInput = $("providerIdInput");
const nameInput = $("providerNameInput");
const adapterInput = $("providerAdapterInput");
const apiKeyInput = $("providerApiKeyInput");
const configInput = $("providerConfigInput");
const enabledInput = $("providerEnabledInput");
const saveButton =
  $("saveProviderBtn") ||
  document.querySelector(
    '#providerForm button[type="submit"]'
  );

const id = idInput ? idInput.value.trim() : "";
const name = nameInput ? nameInput.value.trim() : "";
const adapter = adapterInput
  ? adapterInput.value.trim()
  : "";

const apiKey = apiKeyInput
  ? apiKeyInput.value.trim()
  : "";

const enabled = enabledInput
  ? !!enabledInput.checked
  : true;

if (!id) {
  setStatus("Provider ID wajib diisi.", "error");
  if (idInput) idInput.focus();
  return;
}

if (!name) {
  setStatus("Nama provider wajib diisi.", "error");
  if (nameInput) nameInput.focus();
  return;
}

if (!adapter) {
  setStatus("Adapter wajib diisi.", "error");
  if (adapterInput) adapterInput.focus();
  return;
}

let config;

try {
  config = parseConfig(
    configInput ? configInput.value : "{}"
  );
} catch (error) {
  setStatus(
    "Config JSON tidak valid: " +
    error.message,
    "error"
  );

  if (configInput) {
    configInput.focus();
  }

  return;
}

const payload = {
  id: id,
  name: name,
  adapter: adapter,
  config: config,
  enabled: enabled
};

if (apiKey) {
  payload.api_key = apiKey;
}

const isEdit = !!state.editingId;

try {
  if (saveButton) {
    saveButton.disabled = true;
  }

  setStatus(
    isEdit
      ? "Menyimpan perubahan..."
      : "Menambahkan provider...",
    ""
  );

  const endpoint = isEdit
    ? "/api/admin/providers/" +
      encodeURIComponent(state.editingId)
    : "/api/admin/providers";

  await api(endpoint, {
    method: isEdit ? "PUT" : "POST",
    body: JSON.stringify(payload)
  });

  closeEditor();

  await loadProviders();

  setStatus(
    isEdit
      ? "Provider berhasil diperbarui."
      : "Provider berhasil ditambahkan.",
    "success"
  );
} catch (error) {
  console.error("GEN-Z.AI provider save error:", error);

  if (error.status === 401) {
    showDenied("Sesi login tidak valid.");
  } else if (error.status === 403) {
    showDenied("Akses admin ditolak.");
  } else {
    setStatus(
      error.message || "Gagal menyimpan provider.",
      "error"
    );
  }
} finally {
  if (saveButton) {
    saveButton.disabled = false;
  }
}

}

async function editProvider(id) {
const provider = state.providers
.map(normalizeProvider)
.find(function (item) {
return String(item.id) === String(id);
});

if (!provider) {
  setStatus(
    "Provider tidak ditemukan.",
    "error"
  );
  return;
}

renderEditor(provider);

const editor = $("providerEditor");

if (editor) {
  editor.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

}

async function toggleProvider(id) {
const provider = state.providers
.map(normalizeProvider)
.find(function (item) {
return String(item.id) === String(id);
});

if (!provider) {
  setStatus(
    "Provider tidak ditemukan.",
    "error"
  );
  return;
}

const nextState = !provider.enabled;

try {
  setStatus(
    nextState
      ? "Mengaktifkan provider..."
      : "Menonaktifkan provider...",
    ""
  );

  await api(
    "/api/admin/providers/" +
    encodeURIComponent(id) +
    "/toggle",
    {
      method: "POST",
      body: JSON.stringify({
        enabled: nextState
      })
    }
  );

  await loadProviders();

  setStatus(
    nextState
      ? "Provider berhasil diaktifkan."
      : "Provider berhasil dinonaktifkan.",
    "success"
  );
} catch (error) {
  console.error(
    "GEN-Z.AI provider toggle error:",
    error
  );

  if (error.status === 401) {
    showDenied("Sesi login tidak valid.");
  } else if (error.status === 403) {
    showDenied("Akses admin ditolak.");
  } else {
    setStatus(
      error.message ||
      "Gagal mengubah status provider.",
      "error"
    );
  }
}

}

async function deleteProvider(id) {
const provider = state.providers
.map(normalizeProvider)
.find(function (item) {
return String(item.id) === String(id);
});

if (!provider) {
  setStatus(
    "Provider tidak ditemukan.",
    "error"
  );
  return;
}

const confirmed = window.confirm(
  'Hapus provider "' +
  (provider.name || provider.id) +
  '"?\n\nTindakan ini tidak dapat dibatalkan.'
);

if (!confirmed) {
  return;
}

try {
  setStatus(
    "Menghapus provider...",
    ""
  );

  await api(
    "/api/admin/providers/" +
    encodeURIComponent(id),
    {
      method: "DELETE"
    }
  );

  if (String(state.editingId) === String(id)) {
    closeEditor();
  }

  await loadProviders();

  setStatus(
    "Provider berhasil dihapus.",
    "success"
  );
} catch (error) {
  console.error(
    "GEN-Z.AI provider delete error:",
    error
  );

  if (error.status === 401) {
    showDenied("Sesi login tidak valid.");
  } else if (error.status === 403) {
    showDenied("Akses admin ditolak.");
  } else {
    setStatus(
      error.message ||
      "Gagal menghapus provider.",
      "error"
    );
  }
}

}

function bindEvents() {
const backButton = $("providerBackBtn");

if (backButton) {
  backButton.addEventListener(
    "click",
    function () {
      window.location.href = "/admin.html";
    }
  );
}

const refreshButton = $("refreshProvidersBtn");

if (refreshButton) {
  refreshButton.addEventListener(
    "click",
    function () {
      loadProviders();
    }
  );
}

const addButton = $("addProviderBtn");

if (addButton) {
  addButton.addEventListener(
    "click",
    function () {
      renderEditor(null);

      const editor = $("providerEditor");

      if (editor) {
        editor.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  );
}

const form = $("providerForm");

if (form) {
  form.addEventListener(
    "submit",
    saveProvider
  );
}

const cancelButton = $("cancelProviderBtn");

if (cancelButton) {
  cancelButton.addEventListener(
    "click",
    function () {
      closeEditor();
    }
  );
}

const list = $("providerList");

if (list) {
  list.addEventListener(
    "click",
    function (event) {
      const button =
        event.target.closest("[data-action]");

      if (!button) {
        return;
      }

      const action =
        button.getAttribute("data-action");

      const id =
        button.getAttribute("data-id");

      if (!id) {
        return;
      }

      if (action === "edit") {
        editProvider(id);
      } else if (action === "toggle") {
        toggleProvider(id);
      } else if (action === "delete") {
        deleteProvider(id);
      }
    }
  );
}

}

async function init() {
if (state.initialized) {
return;
}

state.initialized = true;

try {
  bindEvents();

  const loading = $("providerLoading");

  if (loading) {
    loading.hidden = false;
  }

  await waitForAuth();

  if (!window.GENZ || !window.GENZ.auth) {
    throw new Error(
      "Sistem autentikasi GEN-Z.AI belum termuat."
    );
  }

  await verifyAdmin();

  showApp();

  await loadProviders();
} catch (error) {
  console.error(
    "GEN-Z.AI provider admin init error:",
    error
  );

  if (error.status === 401) {
    showDenied(
      "Sesi login tidak valid. Silakan login kembali."
    );
  } else if (error.status === 403) {
    showDenied(
      "Akses admin ditolak."
    );
  } else {
    showDenied(
      error.message ||
      "Gagal memuat halaman Provider Management."
    );
  }
}

}

if (document.readyState === "loading") {
document.addEventListener(
"DOMContentLoaded",
init,
{ once: true }
);
} else {
init();
}

window.GENZ_ADMIN_PROVIDERS = {
reload: loadProviders,
add: function () {
renderEditor(null);
},
edit: editProvider
};
})();
