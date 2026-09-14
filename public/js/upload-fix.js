/* =========================================================
   GEN-Z.AI
   REFERENCE MEDIA + GENERATOR UI FIX

   File:
   public/js/upload-fix.js

   Fungsi:
   - Menjaga preview reference image tetap terlihat
   - Menambahkan tombol X untuk menghapus image
   - Menjaga preview reference video tetap terlihat
   - Menambahkan tombol X untuk menghapus video
   - Tidak mengambil alih proses upload
   - Tidak menangani event change input
   - Tidak mengubah FileReader
   - Tidak mengubah proses upload
   - Provider placeholder bukan provider yang dapat dipilih
   - Tombol Generate selalu full width
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
     PROVIDER PLACEHOLDER FIX
  ======================================================= */

  function fixProviderPlaceholder() {

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


    const placeholder =
      options.find(
        function (option) {

          return (
            option.value === ''
          );

        }
      );


    if (!placeholder) {

      return;

    }


    /*
     * Provider dengan value kosong
     * adalah placeholder saja.
     *
     * Jangan biarkan placeholder
     * dianggap sebagai provider.
     */

    placeholder.disabled =
      true;

    placeholder.setAttribute(
      'aria-hidden',
      'true'
    );


    /*
     * Jika belum ada provider
     * yang dipilih, tetap tampilkan
     * placeholder.
     */

    if (
      !provider.value
    ) {

      provider.value =
        '';

    }

  }


  /* =======================================================
     GENERATE BUTTON SIZE FIX
  ======================================================= */

  function fixGenerateButton() {

    const buttons =
      document.querySelectorAll(
        '#generateBtn, .generate-btn, [data-generate-button]'
      );


    if (!buttons.length) {

      return;

    }


    buttons.forEach(
      function (button) {

        if (!button) {

          return;

        }


        /*
         * Jangan biarkan flex/grid parent
         * mengecilkan tombol.
         */

        button.style.width =
          '100%';

        button.style.minWidth =
          '100%';

        button.style.maxWidth =
          '100%';

        button.style.boxSizing =
          'border-box';

        button.style.display =
          'block';

        button.style.flex =
          '0 0 100%';

        button.style.alignSelf =
          'stretch';


        /*
         * Jika tombol utama Generate
         * menggunakan class generate-btn,
         * pastikan tinggi tetap konsisten.
         */

        if (
          button.id ===
            'generateBtn' ||
          button.classList.contains(
            'generate-btn'
          )
        ) {

          button.style.height =
            '82px';

        }

      }
    );

  }


  /* =======================================================
     UI FIX
  ======================================================= */

  function refreshGeneratorUI() {

    fixProviderPlaceholder();

    fixGenerateButton();

  }


  /* =======================================================
     REFRESH UI
  ======================================================= */

  function refresh() {

    if (hasImages()) {

      keepImageGroupVisible();

      ensureImageButton();

    }


    if (hasVideos()) {

      keepVideoGroupVisible();

      ensureVideoButton();

    }


    refreshGeneratorUI();

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
     OBSERVE PROVIDER SELECT
  ======================================================= */

  function observeProviderSelect() {

    const provider =
      get('provider');

    if (!provider) {

      return;

    }


    const observer =
      new MutationObserver(
        function () {

          fixProviderPlaceholder();

          fixGenerateButton();

        }
      );


    observer.observe(
      provider,
      {
        childList: true,
        subtree: true
      }
    );

  }


  /* =======================================================
     OBSERVE GENERATOR AREA
  ======================================================= */

  function observeGeneratorArea() {

    const root =
      document.body;

    if (!root) {

      return;

    }


    const observer =
      new MutationObserver(
        function () {

          fixProviderPlaceholder();

          fixGenerateButton();

        }
      );


    observer.observe(
      root,
      {
        childList: true,
        subtree: true
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

    observeProviderSelect();

    observeGeneratorArea();

    refresh();


    /*
     * Provider dan Generator dapat
     * dirender ulang oleh aplikasi.
     *
     * Interval tetap hanya untuk menjaga
     * kompatibilitas dengan rendering lama.
     * Tidak menyentuh proses upload.
     */

    setInterval(
      refresh,
      1000
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
