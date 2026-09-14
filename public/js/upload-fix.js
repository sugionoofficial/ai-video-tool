/* =========================================================
   GEN-Z.AI
   REFERENCE MEDIA UI FIX

   File:
   public/js/upload-fix.js

   Fungsi:
   - Menjaga preview reference image tetap terlihat
   - Menambahkan tombol X untuk menghapus image
   - Menjaga preview reference video tetap terlihat
   - Menambahkan tombol X untuk menghapus video
   - Menjadikan "Pilih AI Engine" hanya sebagai placeholder
   - Placeholder provider tidak dapat dipilih
   - Tidak mengambil alih proses upload
   - Tidak menangani event change input
   - Tidak mengubah FileReader
   - Tidak mengubah proses upload
========================================================= */

(function () {

  'use strict';

  window.GENZ =
    window.GENZ ||
    {};

  const GENZ =
    window.GENZ;

  GENZ.upload =
    GENZ.upload ||
    {};

  GENZ.state =
    GENZ.state ||
    {};


  /* =======================================================
     HELPER
  ======================================================= */

  function get(id) {

    return document.getElementById(
      id
    );

  }


  function hasImages() {

    return (
      Array.isArray(
        GENZ.upload.images
      ) &&
      GENZ.upload.images.length > 0
    );

  }


  function hasVideos() {

    return (
      Array.isArray(
        GENZ.upload.videoFiles
      ) &&
      GENZ.upload.videoFiles.length > 0
    );

  }


  /* =======================================================
     PROVIDER PLACEHOLDER
  ======================================================= */

  function lockProviderPlaceholder() {

    const provider =
      get('provider');

    if (!provider) {
      return;
    }

    const options =
      Array.from(
        provider.options || []
      );

    if (!options.length) {
      return;
    }

    options.forEach(function (option) {

      const value =
        String(
          option.value || ''
        ).trim();

      const label =
        String(
          option.textContent || ''
        ).trim()
        .toLowerCase();

      const isPlaceholder =
        value === '' ||
        label === 'pilih ai engine' ||
        label === 'pilih provider' ||
        label === '-- pilih ai engine --' ||
        label === '-- pilih provider --';

      if (isPlaceholder) {

        option.disabled = true;

        option.setAttribute(
          'aria-disabled',
          'true'
        );

      }

    });

    /*
     * Jika placeholder sedang terpilih sementara masih ada
     * provider yang tersedia, pindahkan pilihan ke provider
     * pertama yang benar-benar aktif.
     */
    const selected =
      provider.options[
        provider.selectedIndex
      ];

    if (
      selected &&
      selected.disabled
    ) {

      const validOption =
        options.find(function (option) {

          return (
            !option.disabled &&
            String(
              option.value || ''
            ).trim() !== ''
          );

        });

      if (validOption) {

        provider.value =
          validOption.value;

      }

    }

  }


  /* =======================================================
     REMOVE IMAGE
  ======================================================= */

  function removeImage() {

    if (
      typeof GENZ.upload.clearImage ===
      'function'
    ) {

      GENZ.upload.clearImage();

      return;

    }


    GENZ.upload.images = [];

    GENZ.upload.imageFiles = [];

    GENZ.upload.imageData = null;

    GENZ.state.images = [];

    GENZ.state.imageData = null;


    const input =
      get('image');

    if (input) {

      input.value = '';

    }


    const preview =
      get('imagePreview');

    if (preview) {

      preview.innerHTML = '';

      preview.classList.add(
        'hidden'
      );

      preview.style.display =
        'none';

    }

  }


  /* =======================================================
     REMOVE VIDEO
  ======================================================= */

  function removeVideo() {

    if (
      typeof GENZ.upload.clearVideo ===
      'function'
    ) {

      GENZ.upload.clearVideo();

      return;

    }


    GENZ.upload.videoFiles = [];

    GENZ.upload.videoData = null;

    GENZ.upload.videoObjectUrls =
      [];


    GENZ.state.videoFiles = [];

    GENZ.state.videoData = null;


    const input =
      get('referenceVideo');

    if (input) {

      input.value = '';

    }


    const video =
      get(
        'referenceVideoPreview'
      );

    if (video) {

      try {

        video.pause();

      } catch (_) {}

      video.removeAttribute(
        'src'
      );

      try {

        video.load();

      } catch (_) {}

    }


    const preview =
      get('videoPreview');

    if (preview) {

      preview.classList.add(
        'hidden'
      );

      preview.style.display =
        'none';

    }

  }


  /* =======================================================
     CREATE REMOVE BUTTON
  ======================================================= */

  function createRemoveButton(
    className,
    label,
    handler
  ) {

    const button =
      document.createElement(
        'button'
      );

    button.type =
      'button';

    button.className =
      className;

    button.textContent =
      '×';

    button.setAttribute(
      'aria-label',
      label
    );

    button.setAttribute(
      'title',
      label
    );


    button.style.position =
      'absolute';

    button.style.top =
      '6px';

    button.style.right =
      '6px';

    button.style.zIndex =
      '1000';

    button.style.width =
      '32px';

    button.style.height =
      '32px';

    button.style.minWidth =
      '32px';

    button.style.minHeight =
      '32px';

    button.style.padding =
      '0';

    button.style.margin =
      '0';

    button.style.border =
      '0';

    button.style.borderRadius =
      '50%';

    button.style.background =
      'rgba(0,0,0,0.8)';

    button.style.color =
      '#fff';

    button.style.fontSize =
      '22px';

    button.style.fontWeight =
      '700';

    button.style.lineHeight =
      '32px';

    button.style.textAlign =
      'center';

    button.style.cursor =
      'pointer';

    button.style.display =
      'flex';

    button.style.alignItems =
      'center';

    button.style.justifyContent =
      'center';


    button.addEventListener(
      'click',
      function (event) {

        event.preventDefault();

        event.stopPropagation();

        handler();

      }
    );


    return button;

  }


  /* =======================================================
     IMAGE GROUP
  ======================================================= */

  function keepImageGroupVisible() {

    const group =
      get(
        'imageReferenceGroup'
      );

    if (
      !group ||
      !hasImages()
    ) {

      return;

    }


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


  /* =======================================================
     IMAGE PREVIEW
  ======================================================= */

  function ensureImageButton() {

    const preview =
      get(
        'imagePreview'
      );

    if (
      !preview ||
      !hasImages()
    ) {

      return;

    }


    preview.classList.remove(
      'hidden'
    );

    preview.style.removeProperty(
      'display'
    );


    if (
      getComputedStyle(
        preview
      ).position === 'static'
    ) {

      preview.style.position =
        'relative';

    }


    let button =
      preview.querySelector(
        '.reference-image-remove-all'
      );


    if (button) {

      return;

    }


    button =
      createRemoveButton(
        'reference-image-remove-all',
        'Hapus reference image',
        removeImage
      );


    preview.appendChild(
      button
    );

  }


  /* =======================================================
     VIDEO GROUP
  ======================================================= */

  function keepVideoGroupVisible() {

    const group =
      get(
        'videoReferenceGroup'
      );

    if (
      !group ||
      !hasVideos()
    ) {

      return;

    }


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


  /* =======================================================
     VIDEO PREVIEW
  ======================================================= */

  function ensureVideoButton() {

    const preview =
      get(
        'videoPreview'
      );

    if (
      !preview ||
      !hasVideos()
    ) {

      return;

    }


    preview.classList.remove(
      'hidden'
    );

    preview.style.removeProperty(
      'display'
    );


    if (
      getComputedStyle(
        preview
      ).position === 'static'
    ) {

      preview.style.position =
        'relative';

    }


    let button =
      preview.querySelector(
        '.reference-video-remove-all'
      );


    if (button) {

      return;

    }


    button =
      createRemoveButton(
        'reference-video-remove-all',
        'Hapus reference video',
        removeVideo
      );


    preview.appendChild(
      button
    );

  }


  /* =======================================================
     REFRESH UI
  ======================================================= */

  function refresh() {

    /*
     * Provider placeholder harus selalu dikunci
     * setelah providers.js selesai membuat option.
     */
    lockProviderPlaceholder();


    if (hasImages()) {

      keepImageGroupVisible();

      ensureImageButton();

    }


    if (hasVideos()) {

      keepVideoGroupVisible();

      ensureVideoButton();

    }

  }


  /* =======================================================
     OBSERVE IMAGE PREVIEW
  ======================================================= */

  function observeImagePreview() {

    const preview =
      get(
        'imagePreview'
      );

    if (!preview) {

      return;

    }


    const observer =
      new MutationObserver(
        function () {

          if (hasImages()) {

            ensureImageButton();

          }

        }
      );


    observer.observe(
      preview,
      {
        childList: true,
        subtree: true
      }
    );

  }


  /* =======================================================
     OBSERVE VIDEO PREVIEW
  ======================================================= */

  function observeVideoPreview() {

    const preview =
      get(
        'videoPreview'
      );

    if (!preview) {

      return;

    }


    const observer =
      new MutationObserver(
        function () {

          if (hasVideos()) {

            ensureVideoButton();

          }

        }
      );


    observer.observe(
      preview,
      {
        childList: true,
        subtree: true
      }
    );

  }


  /* =======================================================
     OBSERVE PROVIDER
  ======================================================= */

  function observeProvider() {

    const provider =
      get('provider');

    if (!provider) {

      return;

    }


    const observer =
      new MutationObserver(
        function () {

          lockProviderPlaceholder();

        }
      );


    observer.observe(
      provider,
      {
        childList: true,
        subtree: true
      }
    );


    provider.addEventListener(
      'change',
      function () {

        setTimeout(
          lockProviderPlaceholder,
          0
        );

      }
    );

  }


  /* =======================================================
     EVENTS
  ======================================================= */

  function bindEvents() {

    const events = [

      'genz-image-change',

      'genz-image-removed',

      'genz-upload-complete',

      'genz-video-reference-change',

      'genz-video-reference-removed',

      'genz-provider-change',

      'genz-providers-loaded'

    ];


    events.forEach(
      function (eventName) {

        document.addEventListener(
          eventName,
          function () {

            setTimeout(
              refresh,
              0
            );

          }
        );

      }
    );

  }


  /* =======================================================
     INIT
  ======================================================= */

  function init() {

    bindEvents();

    observeImagePreview();

    observeVideoPreview();

    observeProvider();

    refresh();


    /*
     * Providers.js dapat membangun ulang option
     * secara dinamis. Interval ini hanya memastikan
     * placeholder tetap terkunci dan tidak menyentuh
     * proses upload.
     */
    setInterval(
      refresh,
      500
    );

  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }

})();
