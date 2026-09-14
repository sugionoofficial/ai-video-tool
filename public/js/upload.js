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
   - Tombol Generate berbentuk oval, hijau, dan tidak full width
   - Tidak menggunakan polling setInterval agar lebih ringan
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

    return document.getElementById(id);

  }


  function hasImages() {

    return (
      Array.isArray(GENZ.upload.images) &&
      GENZ.upload.images.length > 0
    );

  }


  function hasVideos() {

    return (
      Array.isArray(GENZ.upload.videoFiles) &&
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
    GENZ.upload.videoObjectUrls = [];

    GENZ.state.videoFiles = [];
    GENZ.state.videoData = null;

    const input =
      get('referenceVideo');

    if (input) {

      input.value = '';

    }

    const video =
      get('referenceVideoPreview');

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
      get('imageReferenceGroup');

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
      get('imagePreview');

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

    if (
      preview.querySelector(
        '.reference-image-remove-all'
      )
    ) {

      return;

    }

    const button =
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
      get('videoReferenceGroup');

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
      get('videoPreview');

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

    if (
      preview.querySelector(
        '.reference-video-remove-all'
      )
    ) {

      return;

    }

    const button =
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

          return option.value === '';

        }
      );

    if (!placeholder) {

      return;

    }

    placeholder.disabled =
      true;

    placeholder.setAttribute(
      'aria-hidden',
      'true'
    );

  }


  /* =======================================================
     GENERATE BUTTON
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
         * Ukuran tombol sengaja dibuat compact.
         * Tidak lagi full width.
         */

        button.style.setProperty(
          'width',
          '220px',
          'important'
        );

        button.style.setProperty(
          'min-width',
          '220px',
          'important'
        );

        button.style.setProperty(
          'max-width',
          '220px',
          'important'
        );

        button.style.setProperty(
          'height',
          '48px',
          'important'
        );

        button.style.setProperty(
          'min-height',
          '48px',
          'important'
        );

        button.style.setProperty(
          'max-height',
          '48px',
          'important'
        );

        button.style.setProperty(
          'padding',
          '0 24px',
          'important'
        );

        button.style.setProperty(
          'margin',
          '18px auto 0',
          'important'
        );

        button.style.setProperty(
          'display',
          'block',
          'important'
        );

        button.style.setProperty(
          'flex',
          '0 0 auto',
          'important'
        );

        button.style.setProperty(
          'align-self',
          'center',
          'important'
        );

        button.style.setProperty(
          'box-sizing',
          'border-box',
          'important'
        );

        button.style.setProperty(
          'background',
          '#198754',
          'important'
        );

        button.style.setProperty(
          'background-color',
          '#198754',
          'important'
        );

        button.style.setProperty(
          'color',
          '#fff',
          'important'
        );

        button.style.setProperty(
          'border',
          '0',
          'important'
        );

        button.style.setProperty(
          'border-radius',
          '999px',
          'important'
        );

        button.style.setProperty(
          'box-shadow',
          '0 8px 20px rgba(25,135,84,.22)',
          'important'
        );

        button.style.setProperty(
          'font-size',
          '15px',
          'important'
        );

        button.style.setProperty(
          'font-weight',
          '700',
          'important'
        );

        button.style.setProperty(
          'line-height',
          '48px',
          'important'
        );

        button.style.setProperty(
          'text-align',
          'center',
          'important'
        );

        button.style.setProperty(
          'cursor',
          button.disabled
            ? 'not-allowed'
            : 'pointer',
          'important'
        );

        /*
         * Tetap hijau ketika disabled,
         * hanya dibuat sedikit transparan.
         */

        button.style.setProperty(
          'opacity',
          button.disabled
            ? '0.55'
            : '1',
          'important'
        );

        /*
         * Responsive untuk layar kecil.
         */

        if (
          window.innerWidth <= 480
        ) {

          button.style.setProperty(
            'width',
            'min(220px, calc(100% - 32px))',
            'important'
          );

          button.style.setProperty(
            'min-width',
            'min(220px, calc(100% - 32px))',
            'important'
          );

          button.style.setProperty(
            'max-width',
            'calc(100% - 32px)',
            'important'
          );

        }

      }
    );

  }


  /* =======================================================
     REFRESH
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

    fixProviderPlaceholder();
    fixGenerateButton();

  }


  /* =======================================================
     SCHEDULE REFRESH
  ======================================================= */

  let refreshScheduled =
    false;

  function scheduleRefresh() {

    if (refreshScheduled) {

      return;

    }

    refreshScheduled =
      true;

    window.requestAnimationFrame(
      function () {

        refreshScheduled =
          false;

        refresh();

      }
    );

  }


  /* =======================================================
     OBSERVE IMAGE PREVIEW
  ======================================================= */

  function observeImagePreview() {

    const preview =
      get('imagePreview');

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
      get('videoPreview');

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

  function observeProviderSelect() {

    const provider =
      get('provider');

    if (!provider) {

      return;

    }

    const observer =
      new MutationObserver(
        function () {

          scheduleRefresh();

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

    if (!document.body) {

      return;

    }

    const observer =
      new MutationObserver(
        function () {

          scheduleRefresh();

        }
      );

    observer.observe(
      document.body,
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

            scheduleRefresh();

          }
        );

      }
    );

  }


  /* =======================================================
     WINDOW RESIZE
  ======================================================= */

  function bindResize() {

    let resizeTimer =
      null;

    window.addEventListener(
      'resize',
      function () {

        clearTimeout(
          resizeTimer
        );

        resizeTimer =
          setTimeout(
            function () {

              fixGenerateButton();

            },
            100
          );

      },
      {
        passive: true
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

    bindResize();

    refresh();

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
