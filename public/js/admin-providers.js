/* ============================================================
 * GEN-Z.AI
 * ADMIN PROVIDER MANAGEMENT
 * ============================================================ */

(function () {

  "use strict";

  const API_TIMEOUT = 15000;
  const AUTH_TIMEOUT = 10000;
  const CONFIG_TIMEOUT = 10000;

  const state = {
    providers: [],
    editingId: null,
    loading: false,
    initialized: false
  };


  /* ============================================================
   * DOM
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
    el.className = "admin-status-message";

    if (type) {
      el.classList.add(type);
    }

  }


  function setLoadingMessage(message) {

    const loading = $("providerLoading");

    if (!loading) {
      return;
    }

    const paragraph =
      loading.querySelector("p");

    if (paragraph) {
      paragraph.textContent =
        message ||
        "Memeriksa akses administrator...";
    }

  }


  /* ============================================================
   * TIMEOUT
   * ============================================================ */

  function withTimeout(promise, ms, message) {

    let timer;

    const timeout =
      new Promise(function (_, reject) {

        timer = setTimeout(function () {

          const error =
            new Error(message);

          error.status = 408;

          reject(error);

        }, ms);

      });

    return Promise.race([
      promise,
      timeout
    ]).finally(function () {
      clearTimeout(timer);
    });

  }


  /* ============================================================
   * SUPABASE
   * ============================================================ */

  async function createSupabaseClient() {

    if (
      !window.supabase ||
      typeof window.supabase.createClient !==
        "function"
    ) {

      const error =
        new Error(
          "Supabase client tidak tersedia."
        );

      error.status = 503;

      throw error;
    }


    setLoadingMessage(
      "Memuat konfigurasi autentikasi..."
    );


    const response =
      await withTimeout(
        fetch("/api/config", {
          method: "GET",

          headers: {
            "Accept":
              "application/json"
          },

          cache:
            "no-store"
        }),

        CONFIG_TIMEOUT,

        "Konfigurasi autentikasi tidak merespons."
      );


    if (!response.ok) {

      const error =
        new Error(
          "Gagal mengambil konfigurasi autentikasi (" +
          response.status +
          ")."
        );

      error.status =
        response.status;

      throw error;
    }


    const config =
      await response.json();


    const supabaseUrl =
      String(
        config?.supabaseUrl || ""
      ).trim();


    const publishableKey =
      String(
        config?.supabasePublishableKey || ""
      ).trim();


    if (
      !supabaseUrl ||
      !publishableKey
    ) {

      const error =
        new Error(
          "Konfigurasi Supabase belum tersedia."
        );

      error.status = 503;

      throw error;
    }


    const client =
      window.supabase.createClient(
        supabaseUrl,
        publishableKey,
        {
          auth: {
            persistSession:
              true,

            autoRefreshToken:
              true,

            detectSessionInUrl:
              true,

            storage:
              window.localStorage
          }
        }
      );


    if (
      !client ||
      !client.auth
    ) {

      const error =
        new Error(
          "Supabase authentication client tidak tersedia."
        );

      error.status = 503;

      throw error;
    }


    window.GENZ_AUTH_CLIENT =
      client;

    return client;
  }


  async function getSupabaseClient() {

    if (
      window.GENZ_AUTH_CLIENT &&
      window.GENZ_AUTH_CLIENT.auth
    ) {
      return window.GENZ_AUTH_CLIENT;
    }


    if (
      window.GENZ &&
      window.GENZ.auth &&
      typeof window.GENZ.auth.getClient ===
        "function"
    ) {

      try {

        const client =
          await withTimeout(
            window.GENZ.auth.getClient(),
            AUTH_TIMEOUT,
            "Supabase client tidak merespons."
          );


        if (
          client &&
          client.auth
        ) {

          window.GENZ_AUTH_CLIENT =
            client;

          return client;
        }

      } catch (error) {

        console.warn(
          "[GEN-Z.AI Provider] Auth client gagal:",
          error
        );
      }
    }


    return createSupabaseClient();
  }


  /* ============================================================
   * SESSION
   * ============================================================ */

  async function getAccessToken() {

    const client =
      await getSupabaseClient();


    const result =
      await withTimeout(
        client.auth.getSession(),
        AUTH_TIMEOUT,
        "Session Supabase tidak merespons."
      );


    if (
      result &&
      result.error
    ) {
      throw result.error;
    }


    const session =
      result?.data?.session;


    const token =
      session?.access_token;


    if (!token) {

      const error =
        new Error(
          "Sesi login tidak ditemukan."
        );

      error.status = 401;

      throw error;
    }


    return token;
  }


  /* ============================================================
   * API REQUEST
   *
   * FIX:
   * Selalu kirim Content-Type JSON untuk
   * request yang memiliki body.
   * ============================================================ */

  async function api(path, options) {

    const opts =
      options || {};


    const token =
      await getAccessToken();


    const headers =
      new Headers();


    headers.set(
      "Accept",
      "application/json"
    );


    headers.set(
      "Authorization",
      "Bearer " + token
    );


    /*
     * Body provider selalu JSON.
     */
    if (
      opts.body !== undefined &&
      opts.body !== null
    ) {

      headers.set(
        "Content-Type",
        "application/json; charset=utf-8"
      );
    }


    /*
     * Header tambahan.
     *
     * Jangan izinkan header Content-Type
     * lama menimpa application/json.
     */
    if (opts.headers) {

      Object.keys(
        opts.headers
      ).forEach(function (key) {

        if (
          key.toLowerCase() ===
          "content-type"
        ) {
          return;
        }

        headers.set(
          key,
          opts.headers[key]
        );

      });
    }


    const controller =
      new AbortController();


    const timer =
      setTimeout(function () {

        controller.abort();

      }, API_TIMEOUT);


    try {

      const response =
        await fetch(
          path,
          {
            method:
              opts.method ||
              "GET",

            headers:
              headers,

            body:
              opts.body,

            signal:
              controller.signal,

            cache:
              "no-store"
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

        } catch (_) {

          data = null;
        }

      } else {

        try {

          const text =
            await response.text();

          if (text) {

            data = {
              message:
                text
            };
          }

        } catch (_) {

          data = null;
        }
      }


      if (!response.ok) {

        const message =
          data &&
          (
            data.error ||
            data.message
          );


        const error =
          new Error(
            message ||
            "Permintaan API gagal (" +
            response.status +
            ")."
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
            "Server terlalu lama merespons."
          );

        timeoutError.status =
          408;

        throw timeoutError;
      }


      throw error;

    } finally {

      clearTimeout(timer);
    }
  }


  /* ============================================================
   * NORMALIZER
   * ============================================================ */

  function normalizeProvider(provider) {

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
        item.config &&
        typeof item.config ===
          "object" &&
        !Array.isArray(
          item.config
        )
          ? item.config
          : {},

      enabled:
        item.enabled !== undefined
          ? Boolean(
              item.enabled
            )
          : item.active !== undefined
            ? Boolean(
                item.active
              )
            : true,

      apiKey:
        item.api_key ??
        item.apiKey ??
        "",

      apiKeySet:
        Boolean(
          item.apiKeySet ||
          item.api_key
        ),

      createdAt:
        item.created_at ??
        null,

      updatedAt:
        item.updated_at ??
        null
    };
  }


  /* ============================================================
   * VIEW
   * ============================================================ */

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
        denied.querySelectorAll(
          "p"
        );


      if (paragraphs.length) {

        paragraphs[
          paragraphs.length - 1
        ].textContent =
          message ||
          "Akses ditolak.";
      }
    }


    setStatus(
      message ||
      "Akses ditolak.",
      "error"
    );
  }


  /* ============================================================
   * RENDER LIST
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
        providers.length +
        (
          providers.length === 1
            ? " provider"
            : " providers"
        );
    }


    if (!providers.length) {

      list.innerHTML =
        '<div class="admin-empty">' +
          "<strong>Belum ada provider.</strong>" +
          "<br>" +
          "<span>" +
            "Tambahkan provider pertama untuk mulai menggunakan sistem." +
          "</span>" +
        "</div>";

      return;
    }


    list.innerHTML =
      providers
        .map(function (provider) {

          const active =
            provider.enabled;


          return (

            '<div class="admin-list-item" ' +
              'data-provider-id="' +
              escapeHtml(
                provider.id
              ) +
            '">' +

              '<div class="admin-list-main">' +

                "<h3>" +
                  escapeHtml(
                    provider.name ||
                    provider.id
                  ) +
                "</h3>" +

                "<p>" +
                  "ID: " +
                  escapeHtml(
                    provider.id
                  ) +
                "</p>" +

                "<p>" +
                  "Adapter: " +
                  escapeHtml(
                    provider.adapter ||
                    "-"
                  ) +
                "</p>" +

                "<p>" +
                  "API Key: " +
                  (
                    provider.apiKeySet
                      ? "Tersedia"
                      : "Belum diatur"
                  ) +
                "</p>" +

                '<span class="status-badge ' +
                  (
                    active
                      ? "active"
                      : "inactive"
                  ) +
                '">' +
                  (
                    active
                      ? "Aktif"
                      : "Nonaktif"
                  ) +
                "</span>" +

              "</div>" +

              '<div class="admin-actions">' +

                '<button type="button" ' +
                  'data-action="edit" ' +
                  'data-id="' +
                    escapeHtml(
                      provider.id
                    ) +
                  '">' +
                  "Edit" +
                "</button>" +

                '<button type="button" ' +
                  'data-action="toggle" ' +
                  'data-id="' +
                    escapeHtml(
                      provider.id
                    ) +
                  '">' +
                  (
                    active
                      ? "Deactivate"
                      : "Activate"
                  ) +
                "</button>" +

                '<button type="button" ' +
                  'data-action="delete" ' +
                  'data-id="' +
                    escapeHtml(
                      provider.id
                    ) +
                  '">' +
                  "Delete" +
                "</button>" +

              "</div>" +

            "</div>"
          );

        })
        .join("");
  }


  /* ============================================================
   * LOAD PROVIDERS
   * ============================================================ */

  async function loadProviders() {

    if (state.loading) {
      return;
    }


    state.loading = true;


    const list =
      $("providerList");


    if (list) {

      list.innerHTML =
        '<div class="admin-loading">' +
          "Memuat provider..." +
        "</div>";
    }


    try {

      const data =
        await api(
          "/api/admin/providers",
          {
            method:
              "GET"
          }
        );


      const providers =
        Array.isArray(
          data?.providers
        )
          ? data.providers
          : Array.isArray(
              data
            )
              ? data
              : Array.isArray(
                  data?.data
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
        "[GEN-Z.AI Provider] Load error:",
        error
      );


      if (
        error.status ===
        401
      ) {

        showDenied(
          "Sesi login tidak ditemukan."
        );

        return;
      }


      if (
        error.status ===
        403
      ) {

        showDenied(
          "Akun ini tidak memiliki akses administrator."
        );

        return;
      }


      state.providers =
        [];

      renderProviders();


      setStatus(
        error.message ||
        "Gagal memuat provider.",
        "error"
      );

    } finally {

      state.loading =
        false;
    }
  }


  /* ============================================================
   * EDITOR
   * ============================================================ */

  function renderEditor(provider) {

    const editor =
      $("providerEditor");


    if (!editor) {
      return;
    }


    const item =
      provider
        ? normalizeProvider(
            provider
          )
        : null;


    state.editingId =
      item
        ? item.id
        : null;


    const isEdit =
      Boolean(item);


    const configText =
      item
        ? JSON.stringify(
            item.config || {},
            null,
            2
          )
        : "{}";


    editor.hidden =
      false;


    editor.innerHTML =

      '<form id="providerForm" ' +
        'autocomplete="off">' +

        '<div class="admin-form">' +

          "<h3>" +
            (
              isEdit
                ? "Edit Provider"
                : "Tambah Provider"
            ) +
          "</h3>" +

          "<p>" +
            (
              isEdit
                ? "Ubah konfigurasi provider."
                : "Tambahkan provider baru."
            ) +
          "</p>" +

          '<label for="providerId">' +
            "Provider ID" +
          "</label>" +

          '<input ' +
            'type="text" ' +
            'id="providerId" ' +
            'name="providerId" ' +
            'required ' +
            'maxlength="64" ' +
            (
              isEdit
                ? 'value="' +
                    escapeHtml(
                      item.id
                    ) +
                  '" readonly'
                : ""
            ) +
          ">" +

          '<label for="providerName">' +
            "Provider Name" +
          "</label>" +

          '<input ' +
            'type="text" ' +
            'id="providerName" ' +
            'name="providerName" ' +
            'required ' +
            'maxlength="100" ' +
            'value="' +
              escapeHtml(
                item?.name || ""
              ) +
            '"' +
          ">" +

          '<label for="providerAdapter">' +
            "Adapter" +
          "</label>" +

          '<input ' +
            'type="text" ' +
            'id="providerAdapter" ' +
            'name="providerAdapter" ' +
            'required ' +
            'maxlength="64" ' +
            'placeholder="contoh: veo, minimax, luma, openrouter"' +
            'value="' +
              escapeHtml(
                item?.adapter || ""
              ) +
            '"' +
          ">" +

          '<small>' +
            "Isi ID adapter secara bebas." +
          "</small>" +

          '<label for="providerApiKey">' +
            "API Key" +
          "</label>" +

          '<input ' +
            'type="password" ' +
            'id="providerApiKey" ' +
            'name="providerApiKey" ' +
            'autocomplete="new-password" ' +
            (
              isEdit
                ? 'placeholder="Kosongkan jika tidak ingin mengubah API key"'
                : 'required'
            ) +
          ">" +

          '<label for="providerConfig">' +
            "Config" +
          "</label>" +

          '<textarea ' +
            'id="providerConfig" ' +
            'name="providerConfig" ' +
            'rows="8" ' +
            'spellcheck="false"' +
          ">" +
            escapeHtml(
              configText
            ) +
          "</textarea>" +

          '<label class="provider-checkbox">' +

            '<input ' +
              'type="checkbox" ' +
              'id="providerEnabled" ' +
              'name="providerEnabled" ' +
              (
                !item ||
                item.enabled
                  ? " checked"
                  : ""
              ) +
            ">" +

            "<span>" +
              "Provider aktif" +
            "</span>" +

          "</label>" +

          '<div class="admin-actions">' +

            '<button ' +
              'type="button" ' +
              'id="providerCancelBtn">' +
              "Batal" +
            "</button>" +

            '<button ' +
              'type="submit" ' +
              'id="providerSaveBtn">' +
              (
                isEdit
                  ? "Simpan Perubahan"
                  : "Simpan Provider"
              ) +
            "</button>" +

          "</div>" +

        "</div>" +

      "</form>";


    const form =
      $("providerForm");


    if (form) {

      form.addEventListener(
        "submit",
        function (event) {

          event.preventDefault();

          saveProvider();

        }
      );
    }


    const cancelButton =
      $("providerCancelBtn");


    if (cancelButton) {

      cancelButton.addEventListener(
        "click",
        function () {

          closeEditor();

        }
      );
    }


    /*
     * Fallback click handler.
     * Tetap bekerja walaupun browser
     * tidak memproses submit form.
     */
    const saveButton =
      $("providerSaveBtn");


    if (saveButton) {

      saveButton.addEventListener(
        "click",
        function (event) {

          event.preventDefault();

          saveProvider();

        }
      );
    }
  }


  function openAddEditor() {

    renderEditor(
      null
    );
  }


  function openEditEditor(id) {

    const provider =
      state.providers.find(
        function (item) {

          return String(
            normalizeProvider(
              item
            ).id
          ) ===
          String(id);

        }
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
  }


  function closeEditor() {

    const editor =
      $("providerEditor");


    if (editor) {

      editor.hidden =
        true;

      editor.innerHTML =
        "";
    }


    state.editingId =
      null;
  }


  /* ============================================================
   * SAVE PROVIDER
   * ============================================================ */

  async function saveProvider() {

    const saveButton =
      $("providerSaveBtn");


    if (
      saveButton &&
      saveButton.disabled
    ) {
      return;
    }


    const idInput =
      $("providerId");

    const nameInput =
      $("providerName");

    const adapterInput =
      $("providerAdapter");

    const apiKeyInput =
      $("providerApiKey");

    const configInput =
      $("providerConfig");

    const enabledInput =
      $("providerEnabled");


    const id =
      String(
        idInput?.value ||
        ""
      ).trim();


    const name =
      String(
        nameInput?.value ||
        ""
      ).trim();


    const adapter =
      String(
        adapterInput?.value ||
        ""
      ).trim()
      .toLowerCase();


    const apiKey =
      String(
        apiKeyInput?.value ||
        ""
      ).trim();


    const enabled =
      enabledInput
        ? Boolean(
            enabledInput.checked
          )
        : true;


    if (!id) {

      setStatus(
        "Provider ID wajib diisi.",
        "error"
      );

      idInput?.focus();

      return;
    }


    if (!/^[a-z0-9][a-z0-9_-]{1,63}$/i.test(id)) {

      setStatus(
        "Provider ID tidak valid.",
        "error"
      );

      idInput?.focus();

      return;
    }


    if (!name) {

      setStatus(
        "Provider Name wajib diisi.",
        "error"
      );

      nameInput?.focus();

      return;
    }


    if (!adapter) {

      setStatus(
        "Adapter wajib diisi.",
        "error"
      );

      adapterInput?.focus();

      return;
    }


    if (
      !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(
        adapter
      )
    ) {

      setStatus(
        "ID adapter tidak valid. Gunakan huruf kecil, angka, underscore, atau tanda minus.",
        "error"
      );

      adapterInput?.focus();

      return;
    }


    let config = {};


    const configText =
      String(
        configInput?.value ||
        ""
      ).trim();


    if (configText) {

      try {

        config =
          JSON.parse(
            configText
          );

      } catch (error) {

        setStatus(
          "Config JSON tidak valid.",
          "error"
        );

        configInput?.focus();

        return;
      }
    }


    if (
      !config ||
      typeof config !==
        "object" ||
      Array.isArray(config)
    ) {

      setStatus(
        "Config harus berupa JSON object.",
        "error"
      );

      configInput?.focus();

      return;
    }


    const isEdit =
      Boolean(
        state.editingId
      );


    /*
     * Saat membuat provider baru,
     * API key wajib ada.
     */
    if (
      !isEdit &&
      !apiKey
    ) {

      setStatus(
        "API Key wajib diisi.",
        "error"
      );

      apiKeyInput?.focus();

      return;
    }


    const payload = {

      id,

      name,

      adapter,

      enabled,

      config
    };


    /*
     * Saat edit:
     * hanya kirim API key jika user
     * benar-benar memasukkan key baru.
     */
    if (
      apiKey
    ) {

      payload.api_key =
        apiKey;
    }


    const endpoint =
      isEdit
        ? "/api/admin/providers/" +
          encodeURIComponent(
            state.editingId
          )
        : "/api/admin/providers";


    const method =
      isEdit
        ? "PUT"
        : "POST";


    if (saveButton) {

      saveButton.disabled =
        true;

      saveButton.textContent =
        "Menyimpan...";
    }


    setStatus(
      "Mengirim data provider...",
      "loading"
    );


    try {

      /*
       * PENTING:
       * JSON.stringify dilakukan di sini.
       * api() kemudian memaksa:
       *
       * Content-Type:
       * application/json; charset=utf-8
       */
      const body =
        JSON.stringify(
          payload
        );


      const result =
        await api(
          endpoint,
          {
            method,

            body
          }
        );


      console.log(
        "[GEN-Z.AI Provider] Save success:",
        result
      );


      closeEditor();


      setStatus(
        result?.message ||
        (
          isEdit
            ? "Provider berhasil diperbarui."
            : "Provider berhasil ditambahkan."
        ),
        "success"
      );


      await loadProviders();


    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Save error:",
        error
      );


      let message =
        error?.message ||
        "Gagal menyimpan provider.";


      if (
        error?.status ===
        400
      ) {

        message =
          "Data provider ditolak: " +
          message;
      }


      if (
        error?.status ===
        401
      ) {

        message =
          "Sesi login sudah tidak valid.";
      }


      if (
        error?.status ===
        403
      ) {

        message =
          "Anda tidak memiliki akses administrator.";
      }


      setStatus(
        message,
        "error"
      );


      /*
       * Editor tetap terbuka agar
       * user dapat memperbaiki data.
       */


    } finally {

      const currentButton =
        $("providerSaveBtn");


      if (currentButton) {

        currentButton.disabled =
          false;

        currentButton.textContent =
          isEdit
            ? "Simpan Perubahan"
            : "Simpan Provider";
      }
    }
  }


  /* ============================================================
   * TOGGLE
   * ============================================================ */

  async function toggleProvider(id) {

    const provider =
      state.providers.find(
        function (item) {

          return String(
            normalizeProvider(
              item
            ).id
          ) ===
          String(id);

        }
      );


    if (!provider) {

      setStatus(
        "Provider tidak ditemukan.",
        "error"
      );

      return;
    }


    const normalized =
      normalizeProvider(
        provider
      );


    const enable =
      !normalized.enabled;


    setStatus(
      enable
        ? "Mengaktifkan provider..."
        : "Menonaktifkan provider...",
      "loading"
    );


    try {

      await api(
        "/api/admin/providers/" +
        encodeURIComponent(
          normalized.id
        ) +
        "/toggle",
        {
          method:
            "POST",

          headers: {
            "x-enable":
              String(
                enable
              )
          }
        }
      );


      setStatus(
        enable
          ? "Provider berhasil diaktifkan."
          : "Provider berhasil dinonaktifkan.",
        "success"
      );


      await loadProviders();


    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Toggle error:",
        error
      );


      setStatus(
        error?.message ||
        "Gagal mengubah status provider.",
        "error"
      );
    }
  }


  /* ============================================================
   * DELETE
   * ============================================================ */

  async function deleteProvider(id) {

    const provider =
      state.providers.find(
        function (item) {

          return String(
            normalizeProvider(
              item
            ).id
          ) ===
          String(id);

        }
      );


    if (!provider) {

      setStatus(
        "Provider tidak ditemukan.",
        "error"
      );

      return;
    }


    const normalized =
      normalizeProvider(
        provider
      );


    const confirmed =
      window.confirm(
        "Hapus provider \"" +
        (
          normalized.name ||
          normalized.id
        ) +
        "\"?"
      );


    if (!confirmed) {
      return;
    }


    setStatus(
      "Menghapus provider...",
      "loading"
    );


    try {

      await api(
        "/api/admin/providers/" +
        encodeURIComponent(
          normalized.id
        ),
        {
          method:
            "DELETE"
        }
      );


      setStatus(
        "Provider berhasil dihapus.",
        "success"
      );


      await loadProviders();


    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Delete error:",
        error
      );


      setStatus(
        error?.message ||
        "Gagal menghapus provider.",
        "error"
      );
    }
  }


  /* ============================================================
   * EVENTS
   * ============================================================ */

  function bindEvents() {

    const addButton =
      $("addProviderBtn");


    if (addButton) {

      addButton.addEventListener(
        "click",
        function () {

          openAddEditor();

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
      $("providerBackBtn");


    if (backButton) {

      backButton.addEventListener(
        "click",
        function () {

          if (
            history.length >
            1
          ) {

            history.back();

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
            action ===
            "edit"
          ) {

            openEditEditor(
              id
            );

            return;
          }


          if (
            action ===
            "toggle"
          ) {

            toggleProvider(
              id
            );

            return;
          }


          if (
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


    try {

      setLoadingMessage(
        "Memeriksa sesi login..."
      );


      await getAccessToken();


      showApp();


      bindEvents();


      await loadProviders();


    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Init error:",
        error
      );


      if (
        error?.status ===
        401
      ) {

        showDenied(
          "Sesi login tidak ditemukan."
        );

        return;
      }


      if (
        error?.status ===
        403
      ) {

        showDenied(
          "Akun ini tidak memiliki akses administrator."
        );

        return;
      }


      showDenied(
        error?.message ||
        "Gagal memuat Provider Management."
      );
    }
  }


  /* ============================================================
   * PUBLIC API
   * ============================================================ */

  window.GENZ_ADMIN_PROVIDERS = {

    init,

    load:
      loadProviders,

    refresh:
      loadProviders,

    getState:
      function () {

        return {
          providers:
            state.providers.slice(),

          editingId:
            state.editingId,

          loading:
            state.loading,

          initialized:
            state.initialized
        };

      }

  };


  /* ============================================================
   * AUTO INIT
   * ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }

})();
