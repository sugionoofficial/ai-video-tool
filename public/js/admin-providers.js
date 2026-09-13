/*
 * ============================================================
 * GEN-Z.AI
 * ADMIN PROVIDER MANAGEMENT
 * ============================================================
 *
 * Adapter dibuat fleksibel.
 *
 * Admin dapat memasukkan adapter secara manual:
 *
 * veo
 * minimax
 * luma
 * kling
 * runway
 * seedance
 * adapter-provider-baru
 *
 * Implementasi adapter tetap berada di file masing-masing.
 * ============================================================
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


  /* ============================================================
   * DOM HELPER
   * ============================================================ */

  function $(id) {
    return document.getElementById(id);
  }


  /* ============================================================
   * HTML ESCAPE
   * ============================================================ */

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  /* ============================================================
   * STATUS
   * ============================================================ */

  function setStatus(message, type) {
    const el = $("providerStatus");

    if (!el) {
      return;
    }

    el.textContent = message || "";
    el.className = "status";

    if (type) {
      el.classList.add(type);
    }
  }


  /* ============================================================
   * AUTH
   * ============================================================ */

  async function waitForAuth() {
    if (window.GENZ_AUTH_INITIALIZED) {
      return true;
    }

    const started = Date.now();

    while (
      Date.now() - started <
      10000
    ) {
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
    if (
      !window.GENZ ||
      !window.GENZ.auth
    ) {
      throw new Error(
        "Sistem autentikasi belum tersedia."
      );
    }

    if (
      typeof window.GENZ.auth.token ===
      "function"
    ) {
      const token =
        await window.GENZ.auth.token();

      if (token) {
        return token;
      }
    }

    if (
      typeof window.GENZ.auth.getSession ===
      "function"
    ) {
      const sessionResult =
        await window.GENZ.auth.getSession();

      const session =
        sessionResult &&
        sessionResult.data &&
        sessionResult.data.session
          ? sessionResult.data.session
          : sessionResult &&
              sessionResult.session
            ? sessionResult.session
            : null;

      if (
        session &&
        session.access_token
      ) {
        return session.access_token;
      }
    }

    throw new Error(
      "Sesi login tidak ditemukan."
    );
  }


  /* ============================================================
   * API
   * ============================================================ */

  async function api(
    path,
    options
  ) {
    const opts =
      options || {};

    const token =
      await getAuthToken();

    const headers =
      Object.assign(
        {
          Accept:
            "application/json",

          Authorization:
            "Bearer " + token
        },
        opts.headers || {}
      );

    if (
      opts.body !== undefined &&
      !headers["Content-Type"]
    ) {
      headers["Content-Type"] =
        "application/json";
    }

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        function () {
          controller.abort();
        },
        API_TIMEOUT
      );

    try {
      const response =
        await fetch(
          path,
          {
            method:
              opts.method ||
              "GET",

            headers,

            body:
              opts.body,

            signal:
              controller.signal
          }
        );

      let data = null;

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        try {
          data =
            await response.json();
        } catch {
          data = null;
        }
      } else {
        try {
          const text =
            await response.text();

          data =
            text
              ? {
                  message:
                    text
                }
              : null;
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const error =
          new Error(
            (
              data &&
              (
                data.error ||
                data.message
              )
            ) ||
            (
              "Permintaan API gagal (" +
              response.status +
              ")."
            )
          );

        error.status =
          response.status;

        error.data =
          data;

        throw error;
      }

      return data;

    } catch (error) {

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        const timeoutError =
          new Error(
            "Permintaan terlalu lama. Server tidak merespons."
          );

        timeoutError.status =
          408;

        throw timeoutError;
      }

      throw error;

    } finally {
      clearTimeout(timeout);
    }
  }


  /* ============================================================
   * VERIFY ADMIN
   * ============================================================ */

  async function verifyAdmin() {
    const data =
      await api(
        "/api/account/credits"
      );

    const role =
      data &&
      (
        data.role ||
        (
          data.account &&
          data.account.role
        ) ||
        (
          data.user &&
          data.user.role
        )
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

    if (
      !isAdmin ||
      roleValidated !== true
    ) {
      const error =
        new Error(
          "Akses admin diperlukan."
        );

      error.status =
        403;

      throw error;
    }

    return true;
  }


  /* ============================================================
   * UI STATE
   * ============================================================ */

  function showApp() {
    const denied =
      $("providerDenied");

    const loading =
      $("providerLoading");

    const app =
      $("providerApp");

    if (denied) {
      denied.hidden = true;
    }

    if (loading) {
      loading.hidden = true;
    }

    if (app) {
      app.hidden = false;
    }
  }


  function showDenied(message) {
    const denied =
      $("providerDenied");

    const loading =
      $("providerLoading");

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

      const messageEl =
        denied.querySelector(
          "[data-provider-denied-message]"
        );

      if (messageEl) {
        messageEl.textContent =
          message ||
          "Anda tidak memiliki akses ke halaman ini.";
      }
    }

    setStatus(
      message ||
        "Akses ditolak.",
      "error"
    );
  }


  /* ============================================================
   * NORMALIZE PROVIDER
   * ============================================================ */

  function normalizeProvider(
    provider
  ) {
    const item =
      provider || {};

    return {
      id:
        item.id ??
        item.provider_id ??
        "",

      name:
        item.name ??
        item.provider_name ??
        "",

      adapter:
        item.adapter ??
        "",

      config:
        item.config ??
        {},

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


  /* ============================================================
   * RENDER PROVIDERS
   * ============================================================ */

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
        String(
          providers.length
        );
    }

    if (!providers.length) {
      list.innerHTML =
        '<div class="empty-state">' +
          "<strong>Belum ada provider.</strong>" +
          "<span>Tambahkan provider pertama untuk mulai menggunakan sistem.</span>" +
        "</div>";

      return;
    }

    list.innerHTML =
      providers
        .map(
          function (provider) {
            const statusClass =
              provider.enabled
                ? "enabled"
                : "disabled";

            const statusText =
              provider.enabled
                ? "Aktif"
                : "Nonaktif";

            return (
              '<div class="provider-card" data-provider-id="' +
              escapeHtml(
                provider.id
              ) +
              '">' +

                '<div class="provider-info">' +

                  '<div class="provider-name">' +
                    escapeHtml(
                      provider.name ||
                      provider.id
                    ) +
                  "</div>" +

                  '<div class="provider-meta">' +

                    "<span>ID: " +
                    escapeHtml(
                      provider.id
                    ) +
                    "</span>" +

                    "<span>Adapter: " +
                    escapeHtml(
                      provider.adapter ||
                      "-"
                    ) +
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
                  escapeHtml(
                    provider.id
                  ) +
                  '">Edit</button>' +

                  '<button type="button" class="btn btn-secondary" data-action="toggle" data-id="' +
                  escapeHtml(
                    provider.id
                  ) +
                  '">' +
                  (
                    provider.enabled
                      ? "Deactivate"
                      : "Activate"
                  ) +
                  "</button>" +

                  '<button type="button" class="btn btn-danger" data-action="delete" data-id="' +
                  escapeHtml(
                    provider.id
                  ) +
                  '">Delete</button>' +

                "</div>" +

              "</div>"
            );
          }
        )
        .join("");
  }


  /* ============================================================
   * LOAD PROVIDERS
   * ============================================================ */

  async function loadProviders() {
    if (state.loading) {
      return;
    }

    state.loading =
      true;

    const list =
      $("providerList");

    if (
      list &&
      !state.providers.length
    ) {
      list.innerHTML =
        '<div class="loading-state">Memuat provider...</div>';
    }

    try {
      const data =
        await api(
          "/api/admin/providers"
        );

      const providers =
        Array.isArray(data)
          ? data
          : data &&
              Array.isArray(
                data.providers
              )
            ? data.providers
            : data &&
                Array.isArray(
                  data.data
                )
              ? data.data
              : [];

      state.providers =
        providers.map(
          normalizeProvider
        );

      renderProviders();

      setStatus(
        state.providers.length +
          " provider berhasil dimuat.",
        "success"
      );

    } catch (error) {

      console.error(
        "GEN-Z.AI provider load error:",
        error
      );

      if (
        error.status ===
        401
      ) {
        showDenied(
          "Sesi login tidak valid. Silakan login kembali."
        );

      } else if (
        error.status ===
        403
      ) {
        showDenied(
          "Akses admin ditolak."
        );

      } else {

        setStatus(
          error.message ||
            "Gagal memuat provider.",
          "error"
        );

        if (list) {
          list.innerHTML =
            '<div class="empty-state error-state">' +
              "<strong>Gagal memuat provider.</strong>" +
              "<span>" +
              escapeHtml(
                error.message ||
                "Terjadi kesalahan pada server."
              ) +
              "</span>" +
            "</div>";
        }
      }

    } finally {
      state.loading =
        false;
    }
  }


  /* ============================================================
   * EDITOR
   * ============================================================ */

  function renderEditor(
    provider
  ) {
    const editor =
      $("providerEditor");

    const title =
      $("providerEditorTitle");

    if (!editor) {
      return;
    }

    const isEdit =
      !!provider;

    state.editingId =
      isEdit
        ? provider.id
        : null;

    if (title) {
      title.textContent =
        isEdit
          ? "Edit Provider"
          : "Tambah Provider";
    }

    const normalized =
      normalizeProvider(
        provider || {}
      );

    editor.hidden =
      false;

    const idInput =
      $("providerIdInput");

    const nameInput =
      $("providerNameInput");

    const adapterInput =
      $("providerAdapterInput");

    const apiKeyInput =
      $("providerApiKeyInput");

    const configInput =
      $("providerConfigInput");

    const enabledInput =
      $("providerEnabledInput");


    if (idInput) {
      idInput.value =
        normalized.id || "";

      idInput.disabled =
        isEdit;
    }


    if (nameInput) {
      nameInput.value =
        normalized.name || "";
    }


    /*
     * Adapter menggunakan input text.
     *
     * Tidak ada daftar adapter hard-coded
     * pada halaman Admin.
     */

    if (adapterInput) {
      adapterInput.value =
        normalized.adapter || "";

      adapterInput.placeholder =
        "contoh: veo, minimax, luma, kling, runway";
    }


    if (apiKeyInput) {
      apiKeyInput.value =
        "";

      apiKeyInput.placeholder =
        isEdit
          ? "Kosongkan jika tidak ingin mengubah API key"
          : "Masukkan API key";
    }


    if (configInput) {
      try {
        configInput.value =
          JSON.stringify(
            normalized.config || {},
            null,
            2
          );
      } catch {
        configInput.value =
          "{}";
      }
    }


    if (enabledInput) {
      enabledInput.checked =
        normalized.enabled !== false;
    }


    setStatus(
      isEdit
        ? "Mode edit provider."
        : "Mode tambah provider.",
      ""
    );
  }


  function closeEditor() {
    const editor =
      $("providerEditor");

    state.editingId =
      null;

    if (editor) {
      editor.hidden =
        true;
    }

    const form =
      $("providerForm");

    if (form) {
      form.reset();
    }

    const idInput =
      $("providerIdInput");

    if (idInput) {
      idInput.disabled =
        false;
    }
  }


  /* ============================================================
   * CONFIG
   * ============================================================ */

  function parseConfig(
    value
  ) {
    const text =
      String(
        value || ""
      ).trim();

    if (!text) {
      return {};
    }

    const parsed =
      JSON.parse(text);

    if (
      parsed === null ||
      typeof parsed !==
        "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "Config harus berupa JSON object."
      );
    }

    return parsed;
  }


  /* ============================================================
   * SAVE PROVIDER
   * ============================================================ */

  async function saveProvider(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    const idInput =
      $("providerIdInput");

    const nameInput =
      $("providerNameInput");

    const adapterInput =
      $("providerAdapterInput");

    const apiKeyInput =
      $("providerApiKeyInput");

    const configInput =
      $("providerConfigInput");

    const enabledInput =
      $("providerEnabledInput");

    const saveButton =
      $("saveProviderBtn") ||
      document.querySelector(
        '#providerForm button[type="submit"]'
      );


    const id =
      idInput
        ? idInput.value.trim()
        : "";

    const name =
      nameInput
        ? nameInput.value.trim()
        : "";

    const adapter =
      adapterInput
        ? adapterInput.value.trim()
        : "";

    const apiKey =
      apiKeyInput
        ? apiKeyInput.value.trim()
        : "";

    const enabled =
      enabledInput
        ? !!enabledInput.checked
        : true;


    if (!id) {
      setStatus(
        "Provider ID wajib diisi.",
        "error"
      );

      if (idInput) {
        idInput.focus();
      }

      return;
    }


    if (!name) {
      setStatus(
        "Nama provider wajib diisi.",
        "error"
      );

      if (nameInput) {
        nameInput.focus();
      }

      return;
    }


    if (!adapter) {
      setStatus(
        "Adapter wajib diisi.",
        "error"
      );

      if (adapterInput) {
        adapterInput.focus();
      }

      return;
    }


    let config;

    try {
      config =
        parseConfig(
          configInput
            ? configInput.value
            : "{}"
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
      id:
        id,

      name:
        name,

      adapter:
        adapter,

      config:
        config,

      enabled:
        enabled
    };


    if (apiKey) {
      payload.api_key =
        apiKey;
    }


    const isEdit =
      !!state.editingId;


    try {

      if (saveButton) {
        saveButton.disabled =
          true;
      }

      setStatus(
        isEdit
          ? "Menyimpan perubahan provider..."
          : "Menambahkan provider...",
        ""
      );


      let data;


      if (isEdit) {

        data =
          await api(
            "/api/admin/providers/" +
              encodeURIComponent(
                state.editingId
              ),
            {
              method:
                "PUT",

              body:
                JSON.stringify(
                  payload
                )
            }
          );

      } else {

        data =
          await api(
            "/api/admin/providers",
            {
              method:
                "POST",

              body:
                JSON.stringify(
                  payload
                )
            }
          );
      }


      const provider =
        data &&
        (
          data.provider ||
          data.data ||
          data
        );


      if (provider) {

        if (isEdit) {

          const index =
            state.providers.findIndex(
              function (item) {
                return (
                  String(
                    item.id
                  ) ===
                  String(
                    state.editingId
                  )
                );
              }
            );

          if (index !== -1) {
            state.providers[index] =
              normalizeProvider(
                provider
              );
          }

        } else {

          state.providers.unshift(
            normalizeProvider(
              provider
            )
          );
        }
      }


      closeEditor();

      renderProviders();

      setStatus(
        isEdit
          ? "Provider berhasil diperbarui."
          : "Provider berhasil ditambahkan.",
        "success"
      );


      /*
       * Sinkronisasi ulang dengan database.
       * Ini memastikan response backend tidak
       * menjadi satu-satunya sumber state frontend.
       */

      await loadProviders();

    } catch (error) {

      console.error(
        "GEN-Z.AI provider save error:",
        error
      );

      if (
        error.status ===
        401
      ) {

        showDenied(
          "Sesi login tidak valid. Silakan login kembali."
        );

      } else if (
        error.status ===
        403
      ) {

        showDenied(
          "Akses admin ditolak."
        );

      } else {

        setStatus(
          error.message ||
            "Gagal menyimpan provider.",
          "error"
        );
      }

    } finally {

      if (saveButton) {
        saveButton.disabled =
          false;
      }
    }
  }


  /* ============================================================
   * FIND PROVIDER
   * ============================================================ */

  function findProvider(
    id
  ) {
    return state.providers.find(
      function (provider) {
        return (
          String(
            provider.id
          ) ===
          String(id)
        );
      }
    ) || null;
  }


  /* ============================================================
   * TOGGLE PROVIDER
   * ============================================================ */

  async function toggleProvider(
    id
  ) {
    const provider =
      findProvider(id);

    if (!provider) {
      setStatus(
        "Provider tidak ditemukan.",
        "error"
      );

      return;
    }


    const nextEnabled =
      !provider.enabled;


    try {

      setStatus(
        nextEnabled
          ? "Mengaktifkan provider..."
          : "Menonaktifkan provider...",
        ""
      );


      const data =
        await api(
          "/api/admin/providers/" +
            encodeURIComponent(
              id
            ) +
            "/toggle",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                enabled:
                  nextEnabled
              })
          }
        );


      const updated =
        data &&
        (
          data.provider ||
          data.data
        );


      if (updated) {

        const index =
          state.providers.findIndex(
            function (item) {
              return (
                String(
                  item.id
                ) ===
                String(id)
              );
            }
          );

        if (index !== -1) {
          state.providers[index] =
            normalizeProvider(
              updated
            );
        }

      } else {

        provider.enabled =
          nextEnabled;
      }


      renderProviders();

      setStatus(
        nextEnabled
          ? "Provider berhasil diaktifkan."
          : "Provider berhasil dinonaktifkan.",
        "success"
      );

    } catch (error) {

      console.error(
        "GEN-Z.AI provider toggle error:",
        error
      );

      setStatus(
        error.message ||
          "Gagal mengubah status provider.",
        "error"
      );
    }
  }


  /* ============================================================
   * DELETE PROVIDER
   * ============================================================ */

  async function deleteProvider(
    id
  ) {
    const provider =
      findProvider(id);

    if (!provider) {
      setStatus(
        "Provider tidak ditemukan.",
        "error"
      );

      return;
    }


    const confirmed =
      window.confirm(
        "Hapus provider \"" +
          (
            provider.name ||
            provider.id
          ) +
          "\"?\n\nTindakan ini tidak dapat dibatalkan."
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
          encodeURIComponent(
            id
          ),
        {
          method:
            "DELETE"
        }
      );


      state.providers =
        state.providers.filter(
          function (item) {
            return (
              String(
                item.id
              ) !==
              String(id)
            );
          }
        );


      if (
        state.editingId ===
        id
      ) {
        closeEditor();
      }


      renderProviders();

      setStatus(
        "Provider berhasil dihapus.",
        "success"
      );

    } catch (error) {

      console.error(
        "GEN-Z.AI provider delete error:",
        error
      );

      setStatus(
        error.message ||
          "Gagal menghapus provider.",
        "error"
      );
    }
  }


  /* ============================================================
   * EVENT HANDLERS
   * ============================================================ */

  function bindEvents() {

    const form =
      $("providerForm");

    if (form) {
      form.addEventListener(
        "submit",
        saveProvider
      );
    }


    const addButton =
      $("addProviderBtn");

    if (addButton) {
      addButton.addEventListener(
        "click",
        function () {
          renderEditor(
            null
          );
        }
      );
    }


    const cancelButton =
      $("cancelProviderBtn");

    if (cancelButton) {
      cancelButton.addEventListener(
        "click",
        function () {
          closeEditor();
        }
      );
    }


    const refreshButton =
      $("refreshProvidersBtn");

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        function () {
          loadProviders();
        }
      );
    }


    const backButton =
      $("backButton") ||
      $("providerBackBtn");

    if (backButton) {
      backButton.addEventListener(
        "click",
        function () {
          if (
            window.history.length >
            1
          ) {
            window.history.back();
          } else {
            window.location.href =
              "/";
          }
        }
      );
    }


    const list =
      $("providerList");

    if (list) {

      list.addEventListener(
        "click",
        function (event) {

          const button =
            event.target.closest(
              "button[data-action]"
            );

          if (!button) {
            return;
          }


          const action =
            button.dataset.action;

          const id =
            button.dataset.id;


          if (!id) {
            return;
          }


          if (
            action ===
            "edit"
          ) {

            const provider =
              findProvider(id);

            if (provider) {
              renderEditor(
                provider
              );
            }

          } else if (
            action ===
            "toggle"
          ) {

            toggleProvider(
              id
            );

          } else if (
            action ===
            "delete"
          ) {

            deleteProvider(
              id
            );
          }
        }
      );
    }
  }


  /* ============================================================
   * INIT
   * ============================================================ */

  async function init() {

    if (
      state.initialized
    ) {
      return;
    }

    state.initialized =
      true;


    const loading =
      $("providerLoading");

    if (loading) {
      loading.hidden =
        false;
    }


    try {

      const authReady =
        await waitForAuth();

      if (!authReady) {
        throw new Error(
          "Sistem autentikasi belum siap."
        );
      }


      await verifyAdmin();

      bindEvents();

      showApp();

      await loadProviders();

    } catch (error) {

      console.error(
        "GEN-Z.AI provider admin init error:",
        error
      );

      if (
        error.status ===
        401
      ) {

        showDenied(
          "Sesi login tidak valid. Silakan login kembali."
        );

      } else if (
        error.status ===
        403
      ) {

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


  /* ============================================================
   * PUBLIC BRIDGE
   * ============================================================ */

  window.GENZ_ADMIN_PROVIDERS = {
    state:
      state,

    load:
      loadProviders,

    add:
      function () {
        renderEditor(
          null
        );
      },

    edit:
      function (id) {
        const provider =
          findProvider(id);

        if (provider) {
          renderEditor(
            provider
          );
        }
      },

    refresh:
      loadProviders
  };


  /* ============================================================
   * START
   * ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once:
          true
      }
    );

  } else {

    init();
  }

})();
