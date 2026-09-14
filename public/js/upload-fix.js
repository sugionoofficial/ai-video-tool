/* =========================================================
   GEN-Z.AI
   REFERENCE IMAGE PERSISTENCE FIX

   File:
   public/js/upload-fix.js

   Tujuan:
   - Mencegah reference image hilang setelah dipilih.
   - Mengambil alih event change pada #image sebelum listener lama.
   - Menjaga preview, imageData dan imageFiles tetap sinkron.
   - Tidak menghapus gambar ketika provider/model sedang refresh.
========================================================= */

(function () {
  'use strict';

  window.GENZ = window.GENZ || {};

  const GENZ = window.GENZ;

  GENZ.state = GENZ.state || {};
  GENZ.upload = GENZ.upload || {};

  const MAX_IMAGE_BYTES =
    12 * 1024 * 1024;

  const IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif'
  ];

  function get(id) {
    return document.getElementById(id);
  }

  function getLimit() {
    const provider =
      GENZ.providers &&
      GENZ.providers.currentProvider;

    const model =
      get('model');

    const modelId =
      model
        ? String(model.value || '').trim()
        : '';

    /*
     * Capability belum tersedia.
     * Jangan menghalangi upload.
     */
    if (!provider || !modelId) {
      return 1;
    }

    const capabilities =
      provider.capabilities || {};

    const constraints =
      capabilities.constraints || {};

    const rules =
      constraints[modelId];

    /*
     * Rule belum tersedia.
     * Tetap izinkan satu gambar.
     */
    if (!rules) {
      return 1;
    }

    if (
      rules.maxReferenceImages === null ||
      rules.maxReferenceImages === undefined
    ) {
      return Infinity;
    }

    const limit =
      Number(
        rules.maxReferenceImages
      );

    return Number.isFinite(limit)
      ? Math.max(0, limit)
      : 1;
  }

  function setStatus() {
    const status =
      get('imageFileStatus');

    if (!status) {
      return;
    }

    const images =
      Array.isArray(
        GENZ.upload.images
      )
        ? GENZ.upload.images
        : [];

    if (!images.length) {
      status.textContent =
        'Tidak ada file dipilih';

      status.classList.remove(
        'has-file'
      );

      return;
    }

    const limit =
      getLimit();

    const suffix =
      Number.isFinite(limit)
        ? ` (${images.length}/${limit})`
        : ` (${images.length})`;

    status.textContent =
      `${images.length} reference image dipilih${suffix}`;

    status.classList.add(
      'has-file'
    );
  }

  function renderPreview() {
    const preview =
      get('imagePreview');

    if (!preview) {
      return;
    }

    preview.innerHTML =
      '';

    const images =
      Array.isArray(
        GENZ.upload.images
      )
        ? GENZ.upload.images
        : [];

    if (!images.length) {
      preview.classList.add(
        'hidden'
      );

      preview.style.display =
        'none';

      return;
    }

    preview.classList.remove(
      'hidden'
    );

    preview.style.display =
      '';

    images.forEach(
      function (src, index) {

        const wrapper =
          document.createElement(
            'div'
          );

        wrapper.className =
          'reference-image-item';

        wrapper.style.position =
          'relative';

        wrapper.style.width =
          '100%';

        wrapper.style.height =
          '100%';

        const image =
          document.createElement(
            'img'
          );

        image.src =
          src;

        image.alt =
          `Reference image ${index + 1}`;

        image.style.width =
          '100%';

        image.style.height =
          '100%';

        image.style.objectFit =
          'cover';

        image.style.display =
          'block';

        image.style.borderRadius =
          'inherit';

        wrapper.appendChild(
          image
        );

        preview.appendChild(
          wrapper
        );
      }
    );
  }

  function keepGroupVisible() {
    const input =
      get('image');

    const group =
      get('imageReferenceGroup');

    const hasImage =
      Boolean(
        GENZ.state.imageData ||
        GENZ.upload.imageData ||
        (
          Array.isArray(
            GENZ.upload.images
          ) &&
          GENZ.upload.images.length
        )
      );

    if (!input || !hasImage) {
      return;
    }

    input.disabled =
      false;

    input.removeAttribute(
      'aria-disabled'
    );

    if (group) {

      group.classList.remove(
        'hidden'
      );

      group.style.removeProperty(
        'display'
      );

      group.removeAttribute(
        'aria-hidden'
      );
    }

    renderPreview();

    setStatus();
  }

  function readFile(file) {

    return new Promise(
      function (resolve) {

        const reader =
          new FileReader();

        reader.onload =
          function () {

            resolve(
              reader.result || ''
            );

          };

        reader.onerror =
          function () {

            resolve(
              ''
            );

          };

        reader.readAsDataURL(
          file
        );
      }
    );
  }

  async function handleImageChange(
    event
  ) {

    const input =
      event.target;

    if (
      !input ||
      input.id !== 'image'
    ) {
      return;
    }

    /*
     * Hentikan listener upload.js lama.
     *
     * Listener lama dapat memproses event yang sama
     * dan mengosongkan reference image ketika
     * provider/model belum selesai sinkronisasi.
     */
    event.preventDefault();

    event.stopImmediatePropagation();

    const files =
      Array.from(
        input.files || []
      );

    if (!files.length) {
      return;
    }

    let limit =
      getLimit();

    /*
     * Jangan menolak upload hanya karena capability
     * belum selesai dimuat.
     */
    if (
      !Number.isFinite(limit) ||
      limit <= 0
    ) {
      limit = 1;
    }

    const selected =
      files.slice(
        0,
        limit
      );

    const data =
      [];

    const validFiles =
      [];

    for (
      const file
      of selected
    ) {

      if (
        !IMAGE_TYPES.includes(
          file.type
        )
      ) {
        continue;
      }

      if (
        file.size >
        MAX_IMAGE_BYTES
      ) {
        continue;
      }

      const result =
        await readFile(
          file
        );

      if (!result) {
        continue;
      }

      data.push(
        result
      );

      validFiles.push(
        file
      );
    }

    if (!data.length) {
      return;
    }

    /*
     * SIMPAN STATE
     */
    GENZ.upload.images =
      data;

    GENZ.upload.imageFiles =
      validFiles;

    GENZ.upload.imageData =
      data[0];

    GENZ.state.images =
      [...data];

    GENZ.state.imageData =
      data[0];

    /*
     * RENDER LANGSUNG
     */
    renderPreview();

    setStatus();

    keepGroupVisible();

    /*
     * Beritahu module lain bahwa image berubah.
     */
    document.dispatchEvent(
      new CustomEvent(
        'genz-image-change',
        {
          detail: {
            images:
              [...data],

            files:
              [...validFiles]
          }
        }
      )
    );

    document.dispatchEvent(
      new CustomEvent(
        'genz-upload-complete',
        {
          detail: {
            images:
              [...data]
          }
        }
      )
    );

    /*
     * Provider/model refresh dapat berjalan
     * setelah event upload.
     *
     * Pastikan preview tetap ada.
     */
    setTimeout(
      keepGroupVisible,
      0
    );

    setTimeout(
      keepGroupVisible,
      50
    );

    setTimeout(
      keepGroupVisible,
      250
    );

    setTimeout(
      keepGroupVisible,
      750
    );
  }

  function interceptImageChange(
    event
  ) {

    if (
      !event.target ||
      event.target.id !== 'image'
    ) {
      return;
    }

    handleImageChange(
      event
    );
  }

  function bind() {

    /*
     * Capture di document berjalan lebih dulu
     * daripada listener change pada input #image.
     */
    document.addEventListener(
      'change',
      interceptImageChange,
      true
    );

    /*
     * Provider/model dapat mengubah tampilan
     * reference image tanpa event change pada input.
     *
     * Pemeriksaan dilakukan ringan setiap 1 detik
     * dan hanya jika memang ada image.
     */
    setInterval(
      function () {

        if (
          GENZ.state.imageData ||
          GENZ.upload.imageData ||
          (
            Array.isArray(
              GENZ.upload.images
            ) &&
            GENZ.upload.images.length
          )
        ) {

          keepGroupVisible();
        }

      },
      1000
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      bind,
      {
        once: true
      }
    );

  } else {

    bind();
  }

})();
