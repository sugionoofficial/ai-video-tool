/* =========================================================
   GEN-Z.AI
   ADMIN PROVIDER MANAGEMENT

   File:
   public/js/admin-providers.js

   Fungsi:
   - Validasi session admin/owner
   - Menampilkan provider dari backend
   - Tambah provider
   - Edit provider
   - Aktif/nonaktif provider
   - Hapus provider
   - API key tidak pernah ditampilkan kembali
   - Tidak menyimpan API key di browser
   ========================================================= */

(function () {

  "use strict";

  const state = {
    providers: [],
    editingId: null,
    loading: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  /* =========================================================
     STATUS MESSAGE
     ========================================================= */

  function setStatus(message, type = "info") {

    const el = $("providerStatus");

    if (!el) {
      return;
    }

    el.textContent = message || "";

    el.className =
      "admin-status-message " +
      type;
  }

  /* =========================================================
     ESCAPE HTML
     ========================================================= */

  function escapeHtml(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* =========================================================
     API REQUEST
     ========================================================= */

  async function api(
    path,
    options = {}
  ) {

    const token =
      await window.GENZ?.auth?.token?.();

    if (!token) {
      throw new Error(
        "Session login tidak ditemukan."
      );
    }

    const response =
      await fetch(
        path,
        {
          ...options,

          headers: {

            Accept:
              "application/json",

            ...(options.body
              ? {
                  "Content-Type":
                    "application/json"
                }
              }
              : {}),

            ...(options.headers || {}),

            Authorization:
              `Bearer ${token}`
          },

          cache:
            "no-store"
        }
      );

    let data = null;

    try {

      data =
        await response.json();

    } catch (_) {

      data = null;
    }

    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        `Request gagal (${response.status}).`
      );
    }

    return data || {};
  }

  /* =========================================================
     VERIFY ADMIN
     ========================================================= */

  async function verifyAdmin() {

    const response =
      await api(
        "/api/account/credits"
      );

    const role =
      String(
        response?.role || ""
      ).toLowerCase();

    const validRole =
      role === "admin" ||
      role === "owner";

    if (
      response?.roleValidated !== true ||
      !validRole ||
      response?.isAdmin !== true
    ) {

      throw new Error(
        "Akses admin ditolak."
      );
    }

    const email =
      response?.user?.email ||
      "Administrator";

    const emailEl =
      $("providerAdminEmail");

    if (emailEl) {
      emailEl.textContent =
        email;
    }

    return response;
  }

  /* =========================================================
     SHOW / HIDE PAGE
     ========================================================= */

  function showApp() {

    const loading =
      $("providerLoading");

    const denied =
      $("providerDenied");

    const app =
      $("providerApp");

    if (loading) {
      loading.hidden = true;
    }

    if (denied) {
      denied.hidden = true;
    }

    if (app) {
      app.hidden = false;
    }
  }

  function showDenied(message) {

    const loading =
      $("providerLoading");

    const denied =
      $("providerDenied");

    const app =
      $("providerApp");

    if (loading) {
      loading.hidden = true;
    }

    if (app) {
      app.hidden = true;
    }

    if (denied) {

      denied.hidden = false;

      const paragraphs =
        denied.querySelectorAll("p");

      if (
        paragraphs.length > 0 &&
        message
      ) {

        paragraphs[0].textContent =
          message;
      }
    }
  }

  /* =========================================================
     NORMALIZE PROVIDER
     ========================================================= */

  function normalizeProvider(
    provider
  ) {

    return {

      id:
        provider?.id ??
        provider?.provider_id ??
        "",

      name:
        provider?.name ??
        provider?.provider_name ??
        provider?.id ??
        "",

      adapter:
        provider?.adapter ??
        "",

      enabled:
        provider?.enabled !== false,

      apiKeySet:
        Boolean(
          provider?.apiKeySet ??
          provider?.api_key_set ??
          provider?.hasApiKey ??
          provider?.has_api_key
        ),

      config:
        provider?.config &&
        typeof provider.config === "object"
          ? provider.config
          : {}
    };
  }

  /* =========================================================
     RENDER PROVIDER LIST
     ========================================================= */

  function renderProviders() {

    const list =
      $("providerList");

    const count =
      $("providerCount");

    if (!list) {
      return;
    }

    const providers =
      state.providers.map(
        normalizeProvider
      );

    if (count) {

      count.textContent =
        `${providers.length} provider` +
        `${providers.length === 1 ? "" : "s"}`;
    }

    if (!providers.length) {

      list.innerHTML = `
        <div class="admin-empty">
          <strong>Belum ada provider</strong>
          <span>
            Tambahkan provider AI pertama untuk GEN-Z.AI.
          </span>
        </div>
      `;

      return;
    }

    list.innerHTML =
      providers
        .map(
          (provider) => {

            return `
              <div
                class="admin-list-item"
                data-provider-id="${escapeHtml(provider.id)}"
              >

                <div class="admin-list-main">

                  <strong>
                    ${escapeHtml(provider.name)}
                  </strong>

                  <span>
                    ID:
                    ${escapeHtml(provider.id)}
                    · Adapter:
                    ${escapeHtml(
                      provider.adapter || "-"
                    )}
                  </span>

                  <span>
                    API Key:
                    ${
                      provider.apiKeySet
                        ? "Tersimpan"
                        : "Belum diatur"
                    }

                    · Status:
                    ${
                      provider.enabled
                        ? "Aktif"
                        : "Nonaktif"
                    }
                  </span>

                </div>

                <div class="admin-actions">

                  <button
                    type="button"
                    data-action="toggle"
                    data-id="${escapeHtml(provider.id)}"
                  >
                    ${
                      provider.enabled
                        ? "Nonaktifkan"
                        : "Aktifkan"
                    }
                  </button>

                  <button
                    type="button"
                    data-action="edit"
                    data-id="${escapeHtml(provider.id)}"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    data-action="delete"
                    data-id="${escapeHtml(provider.id)}"
                  >
                    Hapus
                  </button>

                </div>

              </div>
            `;
          }
        )
        .join("");
  }

  /* =========================================================
     LOAD PROVIDERS
     ========================================================= */

  async function loadProviders() {

    if (state.loading) {
      return;
    }

    state.loading = true;

    setStatus(
      "Memuat provider...",
      "info"
    );

    try {

      const response =
        await api(
          "/api/admin/providers"
        );

      state.providers =
        Array.isArray(
          response?.providers
        )
          ? response.providers
          : [];

      renderProviders();

      setStatus(
        "Daftar provider berhasil dimuat.",
        "success"
      );

    } catch (error) {

      console.error(
        "[GEN-Z ADMIN PROVIDERS]",
        error
      );

      setStatus(
        error?.message ||
        "Gagal memuat provider.",
        "error"
      );

    } finally {

      state.loading = false;
    }
  }

  /* =========================================================
     RENDER PROVIDER EDITOR
     ========================================================= */

  function renderEditor(
    provider = null
  ) {

    const editor =
      $("providerEditor");

    if (!editor) {
      return;
    }

    state.editingId =
      provider?.id || null;

    const configText =
      JSON.stringify(
        provider?.config || {},
        null,
        2
      );

    editor.innerHTML = `

      <div
        class="admin-card"
        style="margin-top:20px"
      >

        <div class="admin-card-header">

          <div>

            <h3>
              ${
                provider
                  ? "Edit Provider"
                  : "Tambah Provider"
              }
            </h3>

            <p>
              API key hanya dikirim ke server
              dan tidak ditampilkan kembali.
            </p>

          </div>

        </div>


        <form id="providerForm">

          <div class="admin-form-grid">

            <label>

              <span>
                ID Provider
              </span>

              <input
                id="providerIdInput"
                value="${escapeHtml(
                  provider?.id || ""
                )}"
                ${
                  provider
                    ? "readonly"
                    : ""
                }
                required
              >

            </label>


            <label>

              <span>
                Nama Provider
              </span>

              <input
                id="providerNameInput"
                value="${escapeHtml(
                  provider?.name || ""
                )}"
                required
              >

            </label>


            <label>

              <span>
                Adapter
              </span>

              <select
                id="providerAdapterInput"
                required
              >

                <option
                  value="veo"
                  ${
                    provider?.adapter === "veo"
                      ? "selected"
                      : ""
                  }
                >
                  Veo
                </option>

                <option
                  value="minimax"
                  ${
                    provider?.adapter === "minimax"
                      ? "selected"
                      : ""
                  }
                >
                  MiniMax
                </option>

                <option
                  value="luma"
                  ${
                    provider?.adapter === "luma"
                      ? "selected"
                      : ""
                  }
                >
                  Luma
                </option>

              </select>

            </label>


            <label>

              <span>
                API Key
                ${
                  provider
                    ? "(kosongkan jika tidak berubah)"
                    : ""
                }
              </span>

              <input
                id="providerApiKeyInput"
                type="password"
                autocomplete="new-password"
                placeholder="Masukkan API key"
              >

            </label>

          </div>


          <label
            style="display:block;margin-top:16px"
          >

            <span>
              Config JSON
            </span>

            <textarea
              id="providerConfigInput"
              rows="12"
              spellcheck="false"
            >${escapeHtml(configText)}</textarea>

          </label>


          <label
            style="
              display:flex;
              align-items:center;
              gap:10px;
              margin-top:14px;
            "
          >

            <input
              id="providerEnabledInput"
              type="checkbox"
              ${
                provider?.enabled !== false
                  ? "checked"
                  : ""
              }
            >

            <span>
              Provider aktif
            </span>

          </label>


          <div
            class="admin-actions"
            style="margin-top:18px"
          >

            <button
              type="button"
              id="cancelProviderBtn"
            >
              Batal
            </button>

            <button
              type="submit"
              class="admin-primary-btn"
            >
              Simpan Provider
            </button>

          </div>

        </form>

      </div>
    `;

    const cancelButton =
      $("cancelProviderBtn");

    if (cancelButton) {

      cancelButton.addEventListener(
        "click",
        closeEditor
      );
    }

    const form =
      $("providerForm");

    if (form) {

      form.addEventListener(
        "submit",
        saveProvider
      );
    }
  }

  /* =========================================================
     CLOSE EDITOR
     ========================================================= */

  function closeEditor() {

    state.editingId =
      null;

    const editor =
      $("providerEditor");

    if (editor) {
      editor.innerHTML = "";
    }
  }

  /* =========================================================
     PARSE CONFIG
     ========================================================= */

  function parseConfig(
    value
  ) {

    let config;

    try {

      config =
        JSON.parse(
          value || "{}"
        );

    } catch (_) {

      throw new Error(
        "Config JSON tidak valid."
      );
    }

    if (
      !config ||
      typeof config !== "object" ||
      Array.isArray(config)
    ) {

      throw new Error(
        "Config harus berupa object JSON."
      );
    }

    return config;
  }

  /* =========================================================
     SAVE PROVIDER
     ========================================================= */

  async function saveProvider(
    event
  ) {

    event.preventDefault();

    const id =
      $("providerIdInput")
        ?.value
        .trim();

    const name =
      $("providerNameInput")
        ?.value
        .trim();

    const adapter =
      $("providerAdapterInput")
        ?.value
        .trim();

    const apiKey =
      $("providerApiKeyInput")
        ?.value || "";

    const enabled =
      Boolean(
        $("providerEnabledInput")
          ?.checked
      );

    if (
      !id ||
      !name ||
      !adapter
    ) {

      setStatus(
        "ID, nama, dan adapter wajib diisi.",
        "error"
      );

      return;
    }

    let config;

    try {

      config =
        parseConfig(
          $("providerConfigInput")
            ?.value || "{}"
        );

    } catch (error) {

      setStatus(
        error.message,
        "error"
      );

      return;
    }

    const payload = {

      id,
      name,
      adapter,
      config,
      enabled
    };

    /*
     * API key hanya dikirim jika:
     * - provider baru
     * - atau admin memasukkan API key baru saat edit
     */

    if (
      apiKey.trim()
    ) {

      payload.apiKey =
        apiKey.trim();
    }

    const editing =
      Boolean(
        state.editingId
      );

    const endpoint =
      editing
        ? `/api/admin/providers/${encodeURIComponent(
            state.editingId
          )}`
        : "/api/admin/providers";

    try {

      setStatus(
        "Menyimpan provider...",
        "info"
      );

      await api(
        endpoint,
        {
          method:
            editing
              ? "PUT"
              : "POST",

          body:
            JSON.stringify(
              payload
            )
        }
      );

      closeEditor();

      await loadProviders();

      setStatus(
        editing
          ? "Provider berhasil diperbarui."
          : "Provider berhasil ditambahkan.",
        "success"
      );

    } catch (error) {

      console.error(
        "[GEN-Z ADMIN PROVIDERS]",
        error
      );

      setStatus(
        error?.message ||
        "Gagal menyimpan provider.",
        "error"
      );
    }
  }

  /* =========================================================
     EDIT PROVIDER
     ========================================================= */

  function editProvider(
    id
  ) {

    const provider =
      state.providers
        .map(normalizeProvider)
        .find(
          (item) =>
            String(item.id) ===
            String(id)
        );

    if (!provider) {

      setStatus(
        "Provider tidak ditemukan.",
        "error"
      );

      return;
    }

    renderEditor(
      provider
    );

    const editor =
      $("providerEditor");

    if (editor) {

      editor.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  /* =========================================================
     TOGGLE PROVIDER
     ========================================================= */

  async function toggleProvider(
    id
  ) {

    try {

      setStatus(
        "Mengubah status provider...",
        "info"
      );

      await api(
        `/api/admin/providers/${encodeURIComponent(
          id
        )}/toggle`,
        {
          method: "POST"
        }
      );

      await loadProviders();

      setStatus(
        "Status provider berhasil diubah.",
        "success"
      );

    } catch (error) {

      console.error(
        "[GEN-Z ADMIN PROVIDERS]",
        error
      );

      setStatus(
        error?.message ||
        "Gagal mengubah status provider.",
        "error"
      );
    }
  }

  /* =========================================================
     DELETE PROVIDER
     ========================================================= */

  async function deleteProvider(
    id
  ) {

    const provider =
      state.providers
        .map(normalizeProvider)
        .find(
          (item) =>
            String(item.id) ===
            String(id)
        );

    const label =
      provider?.name || id;

    const confirmed =
      window.confirm(
        `Hapus provider "${label}"?\n\n` +
        "Tindakan ini tidak dapat dibatalkan."
      );

    if (!confirmed) {
      return;
    }

    try {

      setStatus(
        "Menghapus provider...",
        "info"
      );

      await api(
        `/api/admin/providers/${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE"
        }
      );

      closeEditor();

      await loadProviders();

      setStatus(
        "Provider berhasil dihapus.",
        "success"
      );

    } catch (error) {

      console.error(
        "[GEN-Z ADMIN PROVIDERS]",
        error
      );

      setStatus(
        error?.message ||
        "Gagal menghapus provider.",
        "error"
      );
    }
  }

  /* =========================================================
     BIND EVENTS
     ========================================================= */

  function bindEvents() {

    const backButton =
      $("providerBackBtn");

    if (backButton) {

      backButton.addEventListener(
        "click",
        () => {
          window.location.href =
            "/admin.html";
        }
      );
    }


    const refreshButton =
      $("refreshProvidersBtn");

    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        loadProviders
      );
    }


    const addButton =
      $("addProviderBtn");

    if (addButton) {

      addButton.addEventListener(
        "click",
        () => {

          renderEditor();

          const editor =
            $("providerEditor");

          if (editor) {

            editor.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
        }
      );
    }


    const list =
      $("providerList");

    if (list) {

      list.addEventListener(
        "click",
        (event) => {

          const button =
            event.target.closest(
              "[data-action]"
            );

          if (!button) {
            return;
          }

          const action =
            button.dataset.action;

          const id =
            button.dataset.id;

          if (
            action === "edit"
          ) {

            editProvider(id);

          } else if (
            action === "toggle"
          ) {

            toggleProvider(id);

          } else if (
            action === "delete"
          ) {

            deleteProvider(id);
          }
        }
      );
    }
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  async function init() {

    bindEvents();

    try {

      /*
       * Tunggu auth selesai membaca
       * session Supabase.
       */

      if (
        window.GENZ_AUTH_INITIALIZED
      ) {

        await window.GENZ_AUTH_INITIALIZED;
      }

      /*
       * Pastikan user memiliki
       * role admin atau owner.
       */

      await verifyAdmin();

      showApp();

      await loadProviders();

    } catch (error) {

      console.error(
        "[GEN-Z ADMIN PROVIDERS] Init error:",
        error
      );

      showDenied(
        error?.message ||
        "Akses admin tidak tersedia."
      );
    }
  }

  /* =========================================================
     START
     ========================================================= */

  init();

})();
