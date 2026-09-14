/* =========================================================
GEN-Z.AI
REFERENCE MEDIA UI FIX

File:
public/js/upload-fix.js

CATATAN:
File ini TIDAK mengambil alih proses upload.
upload.js tetap menjadi pemilik state dan event upload.

Fungsi file ini hanya:

* menjaga preview image tetap terlihat
* menambahkan tombol hapus image
* menjaga preview video tetap terlihat
* menambahkan tombol hapus video
* tidak mengubah FileReader / File / upload state
  ========================================================= */

(function () {

'use strict';

window.GENZ =
window.GENZ || {};

const GENZ =
window.GENZ;

GENZ.upload =
GENZ.upload || {};

function get(id) {

```
return document.getElementById(
  id
);
```

}

function hasImages() {

```
return (
  Array.isArray(
    GENZ.upload.images
  ) &&
  GENZ.upload.images.length > 0
);
```

}

function hasVideos() {

```
return (
  Array.isArray(
    GENZ.upload.videoFiles
  ) &&
  GENZ.upload.videoFiles.length > 0
);
```

}

function removeImage() {

```
if (
  GENZ.upload &&
  typeof GENZ.upload.clearImage ===
    'function'
) {

  GENZ.upload.clearImage();

  return;

}

GENZ.upload.images =
  [];

GENZ.upload.imageFiles =
  [];

GENZ.upload.imageData =
  null;

GENZ.state =
  GENZ.state || {};

GENZ.state.images =
  [];

GENZ.state.imageData =
  null;

const input =
  get('image');

if (input) {

  input.value =
    '';

}

const preview =
  get('imagePreview');

if (preview) {

  preview.innerHTML =
    '';

  preview.classList.add(
    'hidden'
  );

  preview.style.display =
    'none';

}
```

}

function removeVideo() {

```
if (
  GENZ.upload &&
  typeof GENZ.upload.clearVideo ===
    'function'
) {

  GENZ.upload.clearVideo();

  return;

}

GENZ.upload.videoFiles =
  [];

GENZ.upload.videoData =
  null;

GENZ.state =
  GENZ.state || {};

GENZ.state.videoFiles =
  [];

GENZ.state.videoData =
  null;

const input =
  get(
    'referenceVideo'
  );

if (input) {

  input.value =
    '';

}

const video =
  get(
    'referenceVideoPreview'
  );

if (video) {

  video.pause();

  video.removeAttribute(
    'src'
  );

  video.load();

}

const preview =
  get(
    'videoPreview'
  );

if (preview) {

  preview.classList.add(
    'hidden'
  );

  preview.style.display =
    'none';

}
```

}

function createButton(
className,
label,
handler
) {

```
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
  '8px';

button.style.right =
  '8px';

button.style.zIndex =
  '999';

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
  'none';

button.style.borderRadius =
  '50%';

button.style.background =
  'rgba(0, 0, 0, 0.78)';

button.style.color =
  '#ffffff';

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

button.addEventListener(
  'click',
  function (event) {

    event.preventDefault();

    event.stopPropagation();

    handler();

  }
);

return button;
```

}

function ensureImageButton() {

```
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

preview.style.display =
  '';

if (
  getComputedStyle(
    preview
  ).position ===
  'static'
) {

  preview.style.position =
    'relative';

}

/*
 * Jangan membuat tombol per thumbnail.
 * Satu tombol × menghapus seluruh
 * reference image.
 */

let button =
  preview.querySelector(
    '.reference-image-remove-all'
  );

if (button) {

  return;

}

button =
  createButton(
    'reference-image-remove-all',
    'Hapus reference image',
    removeImage
  );

preview.appendChild(
  button
);
```

}

function ensureVideoButton() {

```
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

preview.style.display =
  '';

if (
  getComputedStyle(
    preview
  ).position ===
  'static'
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
  createButton(
    'reference-video-remove-all',
    'Hapus reference video',
    removeVideo
  );

preview.appendChild(
  button
);
```

}

function ensureImageGroup() {

```
if (!hasImages()) {

  return;

}

const group =
  get(
    'imageReferenceGroup'
  );

if (!group) {

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
```

}

function ensureVideoGroup() {

```
if (!hasVideos()) {

  return;

}

const group =
  get(
    'videoReferenceGroup'
  );

if (!group) {

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
```

}

function refresh() {

```
if (hasImages()) {

  ensureImageGroup();

  ensureImageButton();

}

if (hasVideos()) {

  ensureVideoGroup();

  ensureVideoButton();

}
```

}

function observePreview() {

```
const imagePreview =
  get(
    'imagePreview'
  );

const videoPreview =
  get(
    'videoPreview'
  );

if (imagePreview) {

  const imageObserver =
    new MutationObserver(
      function () {

        if (hasImages()) {

          ensureImageButton();

        }

      }
    );

  imageObserver.observe(
    imagePreview,
    {
      childList: true,
      subtree: true
    }
  );

}

if (videoPreview) {

  const videoObserver =
    new MutationObserver(
      function () {

        if (hasVideos()) {

          ensureVideoButton();

        }

      }
    );

  videoObserver.observe(
    videoPreview,
    {
      childList: true,
      subtree: true
    }
  );

}
```

}

function bindEvents() {

```
document.addEventListener(
  'genz-image-change',
  function () {

    setTimeout(
      refresh,
      0
    );

  }
);

document.addEventListener(
  'genz-upload-complete',
  function () {

    setTimeout(
      refresh,
      0
    );

  }
);

document.addEventListener(
  'genz-video-reference-change',
  function () {

    setTimeout(
      refresh,
      0
    );

  }
);

document.addEventListener(
  'genz-provider-change',
  function () {

    setTimeout(
      refresh,
      0
    );

  }
);

document.addEventListener(
  'genz-providers-loaded',
  function () {

    setTimeout(
      refresh,
      0
    );

  }
);
```

}

function init() {

```
bindEvents();

observePreview();

refresh();

/*
 * upload.js dapat merender ulang preview
 * setelah provider/model berubah.
 *
 * Interval hanya melakukan pemeriksaan
 * UI dan TIDAK mengubah state upload.
 */

setInterval(
  refresh,
  500
);
```

}

if (
document.readyState ===
'loading'
) {

```
document.addEventListener(
  'DOMContentLoaded',
  init,
  {
    once: true
  }
);
```

} else {

```
init();
```

}

})();
