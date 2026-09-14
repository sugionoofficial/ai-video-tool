/* =========================================================
   GEN-Z.AI REFERENCE MEDIA MANAGER
   public/js/upload.js

   Fungsi:
   - Reference Image
   - Multiple reference image
   - Reference Video
   - Multiple reference video bila model mengizinkan
   - Limit reference mengikuti MODEL_RULES provider
   - Preview image
   - Preview video
   - Validasi jumlah reference
   - Validasi tipe file
   - Validasi durasi video bila model memiliki batas
   - Sinkronisasi otomatis saat model/provider berubah

   CATATAN:
   File video disimpan sebagai File/Object URL di browser.
   Konversi ke PUBLIC URL untuk ChinaAPI akan ditangani
   pada tahap backend upload/storage.
========================================================= */

(function () {

  'use strict';


  /* =======================================================
     GLOBAL
  ======================================================= */

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  GENZ.state =
    GENZ.state ||
    {};


  GENZ.upload =
    GENZ.upload ||
    {};


  /* =======================================================
     CONFIG
  ======================================================= */

  const MAX_IMAGE_BYTES =
    12 * 1024 * 1024;


  /*
   * Tidak membuat batas ukuran video palsu.
   *
   * ChinaAPI tidak memberikan satu batas ukuran file video
   * universal pada dokumentasi publik.
   *
   * Batas durasi provider tetap diperiksa berdasarkan
   * MODEL_RULES.
   */


  const IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif'
  ];


  const VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ];


  /* =======================================================
     STATE
  ======================================================= */

  GENZ.upload.imageData =
    GENZ.upload.imageData ||
    null;


  GENZ.upload.images =
    Array.isArray(
      GENZ.upload.images
    )
      ? GENZ.upload.images
      : [];


  GENZ.upload.imageFiles =
    Array.isArray(
      GENZ.upload.imageFiles
    )
      ? GENZ.upload.imageFiles
      : [];


  GENZ.upload.videoData =
    GENZ.upload.videoData ||
    null;


  GENZ.upload.videoFiles =
    Array.isArray(
      GENZ.upload.videoFiles
    )
      ? GENZ.upload.videoFiles
      : [];


  GENZ.upload.videoObjectUrls =
    Array.isArray(
      GENZ.upload.videoObjectUrls
    )
      ? GENZ.upload.videoObjectUrls
      : [];


  /* =======================================================
     HELPERS
  ======================================================= */

  function $(id) {

    return document.getElementById(
      id
    );

  }


  function text(value) {

    return String(
      value ?? ''
    ).trim();

  }


  function getCurrentProvider() {

    return (
      GENZ.providers &&
      GENZ.providers.currentProvider
    ) || null;

  }


  function getCurrentModel() {

    return text(
      $('model')?.value
    );

  }


  function getCurrentRules() {

    const provider =
      getCurrentProvider();


    const model =
      getCurrentModel();


    if (
      !provider ||
      !model
    ) {

      return null;

    }


    const capabilities =
      provider.capabilities;


    const constraints =
      capabilities?.constraints;


    if (
      !constraints ||
      typeof constraints !==
        'object'
    ) {

      return null;

    }


    return (
      constraints[model] ||
      null
    );

  }


  function getImageLimit() {

    const rules =
      getCurrentRules();


    if (!rules) {

      return 1;

    }


    if (
      rules.maxReferenceImages ===
      null ||
      rules.maxReferenceImages ===
      undefined
    ) {

      return Infinity;

    }


    return Math.max(
      0,
      Number(
        rules.maxReferenceImages
      )
    );

  }


  function getVideoLimit() {

    const rules =
      getCurrentRules();


    if (!rules) {

      return 0;

    }


    if (
      rules.maxReferenceVideos ===
      null ||
      rules.maxReferenceVideos ===
      undefined
    ) {

      return Infinity;

    }


    return Math.max(
      0,
      Number(
        rules.maxReferenceVideos
      )
    );

  }


  function getTotalReferenceLimit() {

    const rules =
      getCurrentRules();


    if (!rules) {

      return Infinity;

    }


    if (
      rules.maxTotalReferences ===
      null ||
      rules.maxTotalReferences ===
      undefined
    ) {

      return Infinity;

    }


    return Math.max(
      0,
      Number(
        rules.maxTotalReferences
      )
    );

  }


  function getVideoMinDuration() {

    const rules =
      getCurrentRules();


    if (!rules) {

      return null;

    }


    if (
      rules.videoMinDuration ===
      undefined ||
      rules.videoMinDuration ===
      null
    ) {

      return null;

    }


    return Number(
      rules.videoMinDuration
    );

  }


  function getVideoMaxDuration() {

    const rules =
      getCurrentRules();


    if (!rules) {

      return null;

    }


    if (
      rules.videoMaxDuration ===
      undefined ||
      rules.videoMaxDuration ===
      null
    ) {

      return null;

    }


    return Number(
      rules.videoMaxDuration
    );

  }


  function updateStatus(
    id,
    hasFile,
    message
  ) {

    const status =
      $(id);


    if (!status) {

      return;

    }


    status.textContent =
      message ||
      (
        hasFile
          ? 'File berhasil dipilih'
          : 'Tidak ada file dipilih'
      );


    status.classList.toggle(
      'has-file',
      Boolean(
        hasFile
      )
    );

  }


  function showMessage(
    message
  ) {

    const status =
      $('status');


    if (
      status &&
      message
    ) {

      status.textContent =
        message;

      status.dataset.type =
        'error';

    }

  }


  function dispatch(
    name,
    detail = {}
  ) {

    document.dispatchEvent(
      new CustomEvent(
        name,
        {
          detail
        }
      )
    );

  }


  /* =======================================================
     IMAGE PREVIEW
  ======================================================= */

  function renderImagePreview() {

    const preview =
      $('imagePreview');


    if (!preview) {

      return;

    }


    preview.innerHTML =
      '';


    if (
      !GENZ.upload.images.length
    ) {

      preview.classList.add(
        'hidden'
      );

      preview.style.display =
        'none';

      return;

    }


    preview.style.display =
      '';


    preview.classList.remove(
      'hidden'
    );


    GENZ.upload.images.forEach(
      (
        imageData,
        index
      ) => {

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
          imageData;


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


        /*
         * Untuk reference lebih dari satu,
         * thumbnail tetap bisa dihapus.
         */

        if (
          GENZ.upload.images.length >
          1
        ) {

          const remove =
            document.createElement(
              'button'
            );


          remove.type =
            'button';


          remove.className =
            'image-remove-btn';


          remove.textContent =
            '×';


          remove.setAttribute(
            'aria-label',
            `Hapus reference image ${index + 1}`
          );


          remove.style.position =
            'absolute';


          remove.style.top =
            '6px';


          remove.style.right =
            '6px';


          remove.addEventListener(
            'click',
            event => {

              event.preventDefault();
              event.stopPropagation();


              removeImage(
                index
              );

            }
          );


          wrapper.appendChild(
            remove
          );

        }


        preview.appendChild(
          wrapper
        );

      }
    );

  }


  /* =======================================================
     REMOVE IMAGE
  ======================================================= */

  function removeImage(
    index
  ) {

    if (
      index < 0 ||
      index >=
        GENZ.upload.images.length
    ) {

      return;

    }


    GENZ.upload.images.splice(
      index,
      1
    );


    GENZ.upload.imageFiles.splice(
      index,
      1
    );


    GENZ.upload.imageData =
      GENZ.upload.images[0] ||
      null;


    GENZ.state.imageData =
      GENZ.upload.imageData;


    GENZ.state.images =
      [
        ...GENZ.upload.images
      ];


    renderImagePreview();


    updateImageStatus();


    dispatch(
      'genz-image-removed',
      {
        index
      }
    );


    dispatch(
      'genz-image-change',
      {
        images:
          GENZ.upload.images
      }
    );

  }


  /* =======================================================
     CLEAR IMAGE
  ======================================================= */

  function clearImage() {

    GENZ.upload.images =
      [];


    GENZ.upload.imageFiles =
      [];


    GENZ.upload.imageData =
      null;


    GENZ.state.imageData =
      null;


    GENZ.state.images =
      [];


    const input =
      $('image');


    if (input) {

      input.value =
        '';

    }


    renderImagePreview();


    updateImageStatus();


    dispatch(
      'genz-image-removed'
    );

  }


  /* =======================================================
     IMAGE STATUS
  ======================================================= */

  function updateImageStatus() {

    const count =
      GENZ.upload.images.length;


    const limit =
      getImageLimit();


    if (!count) {

      updateStatus(
        'imageFileStatus',
        false,
        'Tidak ada file dipilih'
      );

      return;

    }


    const limitText =
      Number.isFinite(
        limit
      )
        ? ` (${count}/${limit})`
        : ` (${count})`;


    updateStatus(
      'imageFileStatus',
      true,
      `${count} reference image dipilih${limitText}`
    );

  }


  /* =======================================================
     IMAGE HINT
  ======================================================= */

  function updateImageHint() {

    const hint =
      $('imageReferenceHint');


    if (!hint) {

      return;

    }


    const rules =
      getCurrentRules();


    const limit =
      getImageLimit();


    if (!rules) {

      hint.textContent =
        'Pilih model terlebih dahulu.';

      return;

    }


    if (
      limit === 0
    ) {

      hint.textContent =
        'Model ini tidak mendukung reference image.';

      return;

    }


    const imageText =
      Number.isFinite(
        limit
      )
        ? `Maksimal ${limit} gambar`
        : 'Jumlah gambar mengikuti batas provider';


    const videoLimit =
      getVideoLimit();


    const totalLimit =
      getTotalReferenceLimit();


    let extra =
      '';


    if (
      Number.isFinite(
        totalLimit
      )
    ) {

      extra =
        ` • Total reference maksimal ${totalLimit}`;

    }


    hint.textContent =
      `${imageText}${extra}.`;

  }


  /* =======================================================
     VIDEO PREVIEW
  ======================================================= */

  function clearVideoObjectUrls() {

    GENZ.upload.videoObjectUrls
      .forEach(
        url => {

          try {

            URL.revokeObjectURL(
              url
            );

          } catch (_) {}

        }
      );


    GENZ.upload.videoObjectUrls =
      [];

  }


  function renderVideoPreview() {

    const preview =
      $('videoPreview');


    const video =
      $('referenceVideoPreview');


    if (!preview) {

      return;

    }


    if (
      !GENZ.upload.videoFiles.length
    ) {

      preview.classList.add(
        'hidden'
      );

      preview.style.display =
        'none';

      if (video) {

        video.removeAttribute(
          'src'
        );

        video.load();

      }

      return;

    }


    /*
     * Preview utama menggunakan video
     * pertama.
     *
     * Jika provider menerima beberapa
     * video reference, semua File tetap
     * disimpan di state.
     */

    clearVideoObjectUrls();


    const firstFile =
      GENZ.upload.videoFiles[0];


    if (!firstFile) {

      return;

    }


    const objectUrl =
      URL.createObjectURL(
        firstFile
      );


    GENZ.upload.videoObjectUrls
      .push(
        objectUrl
      );


    if (video) {

      video.src =
        objectUrl;

      video.controls =
        true;

      video.muted =
        true;

      video.playsInline =
        true;

      video.preload =
        'metadata';

      video.style.width =
        '100%';

      video.style.height =
        '100%';

      video.style.objectFit =
        'cover';

      video.style.display =
        'block';

    }


    preview.style.display =
      '';


    preview.classList.remove(
      'hidden'
    );

  }


  /* =======================================================
     VIDEO STATUS
  ======================================================= */

  function updateVideoStatus() {

    const count =
      GENZ.upload.videoFiles.length;


    const limit =
      getVideoLimit();


    if (!count) {

      updateStatus(
        'videoFileStatus',
        false,
        'Tidak ada video dipilih'
      );

      return;

    }


    const limitText =
      Number.isFinite(
        limit
      )
        ? ` (${count}/${limit})`
        : ` (${count})`;


    updateStatus(
      'videoFileStatus',
      true,
      `${count} reference video dipilih${limitText}`
    );

  }


  /* =======================================================
     VIDEO HINT
  ======================================================= */

  function updateVideoHint() {

    const hint =
      $('videoReferenceHint');


    if (!hint) {

      return;

    }


    const rules =
      getCurrentRules();


    const limit =
      getVideoLimit();


    if (!rules) {

      hint.textContent =
        'Pilih model terlebih dahulu.';

      return;

    }


    if (
      limit === 0
    ) {

      hint.textContent =
        'Model ini tidak mendukung video reference.';

      return;

    }


    const countText =
      Number.isFinite(
        limit
      )
        ? `Maksimal ${limit} video`
        : 'Jumlah video mengikuti batas provider';


    const min =
      getVideoMinDuration();


    const max =
      getVideoMaxDuration();


    let durationText =
      '';


    if (
      Number.isFinite(
        min
      ) &&
      Number.isFinite(
        max
      )
    ) {

      durationText =
        ` • Durasi video ${min}-${max} detik`;

    } else if (
      Number.isFinite(
        min
      )
    ) {

      durationText =
        ` • Minimal ${min} detik`;

    } else if (
      Number.isFinite(
        max
      )
    ) {

      durationText =
        ` • Maksimal ${max} detik`;

    }


    hint.textContent =
      `${countText}${durationText}.`;

  }


  /* =======================================================
     VIDEO AVAILABILITY
  ======================================================= */

  function updateVideoAvailability() {

    const input =
      $('referenceVideo');


    const group =
      $('videoReferenceGroup');


    if (!input) {

      return;

    }


    const limit =
      getVideoLimit();


    const supported =
      limit > 0 ||
      limit === Infinity;


    updateVideoHint();


    if (!supported) {

      input.disabled =
        true;


      input.multiple =
        false;


      if (group) {

        group.classList.add(
          'hidden'
        );

        group.style.setProperty(
          'display',
          'none',
          'important'
        );

        group.setAttribute(
          'aria-hidden',
          'true'
        );

      }


      clearVideo();


      return;

    }


    input.disabled =
      false;


    input.multiple =
      limit === Infinity ||
      limit > 1;


    input.removeAttribute(
      'aria-disabled'
    );


    if (group) {

      group.classList.remove(
        'hidden'
      );

      group.style.setProperty(
        'display',
        '',
        'important'
      );

      group.removeAttribute(
        'aria-hidden'
      );

    }

  }


  /* =======================================================
     IMAGE AVAILABILITY
  ======================================================= */

  function updateImageAvailability() {

  const input =
    $('image');

  const group =
    $('imageReferenceGroup');

  if (!input) {
    return;
  }

  const rules =
    getCurrentRules();

  /*
   * Jika model/rule belum tersedia,
   * jangan menganggap image tidak didukung.
   *
   * Ini penting saat provider/model sedang
   * melakukan sinkronisasi setelah upload.
   */
  if (!rules) {

    input.disabled =
      false;

    input.multiple =
      false;

    input.removeAttribute(
      'aria-disabled'
    );

    if (group) {

      group.classList.remove(
        'hidden'
      );

      group.style.setProperty(
        'display',
        '',
        'important'
      );

      group.removeAttribute(
        'aria-hidden'
      );

    }

    updateImageHint();

    return;
  }

  const limit =
    getImageLimit();

  /*
   * Hanya anggap benar-benar tidak mendukung
   * jika rule model secara eksplisit memberikan
   * limit 0.
   */
  const supported =
    Number.isFinite(limit)
      ? limit > 0
      : limit === Infinity;

  updateImageHint();

  if (!supported) {

    input.disabled =
      true;

    input.multiple =
      false;

    input.setAttribute(
      'aria-disabled',
      'true'
    );

    if (group) {

      group.classList.add(
        'hidden'
      );

      group.style.setProperty(
        'display',
        'none',
        'important'
      );

      group.setAttribute(
        'aria-hidden',
        'true'
      );

    }

    /*
     * JANGAN clearImage() di sini.
     *
     * Reference image harus tetap disimpan.
     * Jika model tidak mendukung image,
     * cukup sembunyikan input-nya.
     *
     * Sebelumnya:
     *
     * clearImage();
     *
     * menyebabkan gambar langsung hilang
     * setelah upload.
     */

    return;
  }

  input.disabled =
    false;

  input.multiple =
    limit === Infinity ||
    limit > 1;

  input.removeAttribute(
    'aria-disabled'
  );

  if (group) {

    group.classList.remove(
      'hidden'
    );

    group.style.setProperty(
      'display',
      '',
      'important'
    );

    group.removeAttribute(
      'aria-hidden'
    );

  }
}


  /* =======================================================
     REFERENCE AVAILABILITY
  ======================================================= */

  function refreshReferenceUI() {

    updateImageAvailability();

    updateVideoAvailability();

    updateImageStatus();

    updateVideoStatus();

  }


  /* =======================================================
     IMAGE FILE VALIDATION
  ======================================================= */

  function validateImageFile(
    file
  ) {

    if (!file) {

      return 'File gambar tidak ditemukan.';

    }


    if (
      !IMAGE_TYPES.includes(
        file.type
      )
    ) {

      return (
        'Format gambar tidak didukung. ' +
        'Gunakan PNG, JPEG, WEBP, HEIC atau HEIF.'
      );

    }


    if (
      file.size >
      MAX_IMAGE_BYTES
    ) {

      return 'Gambar maksimal 12 MB.';

    }


    return '';

  }


  /* =======================================================
     VIDEO FILE VALIDATION
  ======================================================= */

  function validateVideoFile(
    file
  ) {

    if (!file) {

      return 'File video tidak ditemukan.';

    }


    if (
      !VIDEO_TYPES.includes(
        file.type
      )
    ) {

      return (
        'Format video tidak didukung. ' +
        'Gunakan MP4, MOV atau WEBM.'
      );

    }


    return '';

  }


  /* =======================================================
     VIDEO DURATION VALIDATION
  ======================================================= */

  function validateVideoDuration(
    file
  ) {

    const min =
      getVideoMinDuration();


    const max =
      getVideoMaxDuration();


    if (
      !Number.isFinite(min) &&
      !Number.isFinite(max)
    ) {

      return Promise.resolve(
        ''
      );

    }


    return new Promise(
      resolve => {

        const video =
          document.createElement(
            'video'
          );


        const objectUrl =
          URL.createObjectURL(
            file
          );


        video.preload =
          'metadata';


        video.onloadedmetadata =
          () => {

            const duration =
              Number(
                video.duration
              );


            try {

              URL.revokeObjectURL(
                objectUrl
              );

            } catch (_) {}


            if (
              !Number.isFinite(
                duration
              )
            ) {

              resolve(
                ''
              );

              return;

            }


            if (
              Number.isFinite(min) &&
              duration < min
            ) {

              resolve(
                `Video minimal ${min} detik. Video Anda ${duration.toFixed(1)} detik.`
              );

              return;

            }


            if (
              Number.isFinite(max) &&
              duration > max
            ) {

              resolve(
                `Video maksimal ${max} detik. Video Anda ${duration.toFixed(1)} detik.`
              );

              return;

            }


            resolve(
              ''
            );

          };


        video.onerror =
          () => {

            try {

              URL.revokeObjectURL(
                objectUrl
              );

            } catch (_) {}


            /*
             * Jangan menolak file hanya
             * karena browser gagal membaca
             * metadata durasi.
             */

            resolve(
              ''
            );

          };


        video.src =
          objectUrl;

      }
    );

  }


  /* =======================================================
     IMAGE CHANGE
  ======================================================= */

  async function handleImageChange(
    event
  ) {

    const input =
      event.target;


    const files =
      Array.from(
        input.files || []
      );


    if (!files.length) {

      clearImage();

      return;

    }


    const limit =
      getImageLimit();


    if (
      limit === 0
    ) {

      clearImage();

      showMessage(
        'Model ini tidak mendukung reference image.'
      );

      return;

    }


    const selected =
      Number.isFinite(limit)
        ? files.slice(
            0,
            limit
          )
        : files;


    const rejected =
      files.length >
      selected.length;


    const data =
      [];


    const validFiles =
      [];


    for (
      const file
      of selected
    ) {

      const error =
        validateImageFile(
          file
        );


      if (error) {

        showMessage(
          error
        );

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


    GENZ.upload.images =
      data;


    GENZ.upload.imageFiles =
      validFiles;


    GENZ.upload.imageData =
      data[0] ||
      null;


    GENZ.state.images =
      [...data];


    GENZ.state.imageData =
      data[0] ||
      null;


    renderImagePreview();

    updateImageStatus();


    if (rejected) {

      showMessage(
        Number.isFinite(limit)
          ? `Model ini hanya menerima ${limit} reference image.`
          : 'Sebagian reference image tidak dapat digunakan.'
      );

    }


    dispatch(
      'genz-image-change',
      {
        images:
          [...data],

        files:
          [...validFiles]
      }
    );


    dispatch(
      'genz-upload-complete',
      {
        images:
          [...data]
      }
    );

  }


  /* =======================================================
     VIDEO CHANGE
  ======================================================= */

  async function handleVideoChange(
    event
  ) {

    const input =
      event.target;


    const files =
      Array.from(
        input.files || []
      );


    if (!files.length) {

      clearVideo();

      return;

    }


    const limit =
      getVideoLimit();


    if (
      limit === 0
    ) {

      clearVideo();

      showMessage(
        'Model ini tidak mendukung video reference.'
      );

      return;

    }


    const selected =
      Number.isFinite(limit)
        ? files.slice(
            0,
            limit
          )
        : files;


    const validFiles =
      [];


    for (
      const file
      of selected
    ) {

      const typeError =
        validateVideoFile(
          file
        );


      if (typeError) {

        showMessage(
          typeError
        );

        continue;

      }


      const durationError =
        await validateVideoDuration(
          file
        );


      if (durationError) {

        showMessage(
          durationError
        );

        continue;

      }


      validFiles.push(
        file
      );

    }


    GENZ.upload.videoFiles =
      validFiles;


    /*
     * Video pertama dipakai sebagai
     * kompatibilitas single-video API.
     */

    GENZ.upload.videoData =
      validFiles[0] ||
      null;


    GENZ.state.videoFiles =
      [...validFiles];


    GENZ.state.videoData =
      validFiles[0] ||
      null;


    renderVideoPreview();

    updateVideoStatus();


    if (
      files.length >
      selected.length
    ) {

      showMessage(
        Number.isFinite(limit)
          ? `Model ini hanya menerima ${limit} video reference.`
          : 'Sebagian video reference tidak dapat digunakan.'
      );

    }


    dispatch(
      'genz-video-reference-change',
      {
        files:
          [...validFiles]
      }
    );


    dispatch(
      'genz-upload-complete',
      {
        videoFiles:
          [...validFiles]
      }
    );

  }


  /* =======================================================
     READ FILE
  ======================================================= */

  function readFile(
    file
  ) {

    return new Promise(
      resolve => {

        const reader =
          new FileReader();


        reader.onload =
          () => {

            resolve(
              reader.result ||
              ''
            );

          };


        reader.onerror =
          () => {

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


  /* =======================================================
     CLEAR VIDEO
  ======================================================= */

  function clearVideo() {

    clearVideoObjectUrls();


    GENZ.upload.videoFiles =
      [];


    GENZ.upload.videoData =
      null;


    GENZ.state.videoFiles =
      [];


    GENZ.state.videoData =
      null;


    const input =
      $('referenceVideo');


    if (input) {

      input.value =
        '';

    }


    const preview =
      $('videoPreview');


    const video =
      $('referenceVideoPreview');


    if (video) {

      video.pause();

      video.removeAttribute(
        'src'
      );

      video.load();

    }


    if (preview) {

      preview.classList.add(
        'hidden'
      );

      preview.style.display =
        'none';

    }


    updateVideoStatus();


    dispatch(
      'genz-image-removed'
    );


    dispatch(
      'genz-video-reference-removed'
    );

  }


  /* =======================================================
     CLEAR ALL
  ======================================================= */

  function clearAll() {

    clearImage();

    clearVideo();

  }


  /* =======================================================
     MODEL CHANGE
  ======================================================= */

  function handleModelChange() {

    refreshReferenceUI();

  }


  /* =======================================================
     BIND IMAGE
  ======================================================= */

  function bindImage() {

    const input =
      $('image');


    if (!input) {

      return;

    }


    if (
      input.dataset
        .referenceManagerAttached ===
      'true'
    ) {

      return;

    }


    input.dataset
      .referenceManagerAttached =
      'true';


    input.multiple =
      true;


    input.accept =
      IMAGE_TYPES.join(
        ','
      );


    /*
     * Capture phase agar listener ini
     * mengambil alih upload.js lama.
     */

    input.addEventListener(
      'change',
      handleImageChange,
      true
    );

  }


  /* =======================================================
     BIND VIDEO
  ======================================================= */

  function bindVideo() {

    const input =
      $('referenceVideo');


    if (!input) {

      return;

    }


    if (
      input.dataset
        .referenceManagerAttached ===
      'true'
    ) {

      return;

    }


    input.dataset
      .referenceManagerAttached =
      'true';


    input.accept =
      VIDEO_TYPES.join(
        ','
      );


    input.multiple =
      true;


    input.addEventListener(
      'change',
      handleVideoChange,
      true
    );

  }


  /* =======================================================
     BIND REMOVE BUTTON
  ======================================================= */

  function bindRemoveButtons() {

    const imageRemove =
      document.querySelector(
        '#imageRemove'
      );


    if (
      imageRemove &&
      imageRemove.dataset.bound !==
        'true'
    ) {

      imageRemove.dataset.bound =
        'true';


      imageRemove.addEventListener(
        'click',
        event => {

          event.preventDefault();

          clearImage();

        }
      );

    }

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.upload.refreshReferenceUI =
    refreshReferenceUI;


  GENZ.upload.clearImage =
    clearImage;


  GENZ.upload.clearVideo =
    clearVideo;


  GENZ.upload.clear =
    clearAll;


  GENZ.upload.getImageFiles =
    function () {

      return [
        ...GENZ.upload.imageFiles
      ];

    };


  GENZ.upload.getImages =
    function () {

      return [
        ...GENZ.upload.images
      ];

    };


  GENZ.upload.getVideoFiles =
    function () {

      return [
        ...GENZ.upload.videoFiles
      ];

    };


  GENZ.upload.getReferenceRules =
    function () {

      return (
        getCurrentRules() ||
        null
      );

    };


  /* =======================================================
     INIT
  ======================================================= */

  GENZ.upload.setup =
    function () {

      bindImage();

      bindVideo();

      bindRemoveButtons();

      refreshReferenceUI();

      return true;

    };


  GENZ.upload.init =
    function () {

      return GENZ.upload.setup();

    };


  /* =======================================================
     GLOBAL EVENTS
  ======================================================= */

  document.addEventListener(
    'change',
    event => {

      if (
        event.target?.id ===
        'model'
      ) {

        setTimeout(
          () => {

            refreshReferenceUI();

          },
          0
        );

      }


      if (
        event.target?.id ===
        'provider'
      ) {

        setTimeout(
          () => {

            refreshReferenceUI();

          },
          0
        );

      }

    },
    true
  );


  [
    'genz-provider-change',
    'genz-providers-loaded',
    'genz-upload-change',
    'genz-image-change',
    'genz-image-removed'
  ].forEach(
    eventName => {

      document.addEventListener(
        eventName,
        () => {

          setTimeout(
            () => {

              refreshReferenceUI();

            },
            0
          );

        }
      );

    }
  );


  /* =======================================================
     AUTO INIT
  ======================================================= */

  function init() {

    bindImage();

    bindVideo();

    refreshReferenceUI();

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
