/* =========================================================
GEN-Z.AI
REFERENCE MEDIA FIX

File:
public/js/upload-fix.js

Fungsi:

* Menjaga reference image tetap tampil.
* Menjaga reference video tetap tampil.
* Tombol hapus image selalu tersedia.
* Tombol hapus video selalu tersedia.
* Sinkronisasi state image/video.
* Tidak menghapus reference saat provider/model refresh.
  ========================================================= */

(function () {

'use strict';

window.GENZ = window.GENZ || {};

const GENZ = window.GENZ;

GENZ.state =
GENZ.state || {};

GENZ.upload =
GENZ.upload || {};

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

```
return document.getElementById(
  id
);
```

}

function getImageLimit() {

```
const provider =
  GENZ.providers &&
  GENZ.providers.currentProvider;

const model =
  get('model');

const modelId =
  model
    ? String(
        model.value || ''
      ).trim()
    : '';

if (
  !provider ||
  !modelId
) {

  return 1;

}

const capabilities =
  provider.capabilities || {};

const constraints =
  capabilities.constraints || {};

const rules =
  constraints[modelId];

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

const limit =
  Number(
    rules.maxReferenceImages
  );

return Number.isFinite(limit)
  ? Math.max(0, limit)
  : 1;
```

}

function setImageStatus() {

```
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
  getImageLimit();

const suffix =
  Number.isFinite(limit)
    ? ` (${images.length}/${limit})`
    : ` (${images.length})`;

status.textContent =
  `${images.length} reference image dipilih${suffix}`;

status.classList.add(
  'has-file'
);
```

}

function createRemoveButton(
label,
onClick
) {

```
const button =
  document.createElement(
    'button'
  );

button.type =
  'button';

button.className =
  'reference-remove-btn';

button.textContent =
  '×';

button.setAttribute(
  'aria-label',
  label
);

button.title =
  label;

button.style.position =
  'absolute';

button.style.top =
  '6px';

button.style.right =
  '6px';

button.style.zIndex =
  '20';

button.style.width =
  '30px';

button.style.height =
  '30px';

button.style.padding =
  '0';

button.style.border =
  '0';

button.style.borderRadius =
  '50%';

button.style.background =
  'rgba(0,0,0,0.75)';

button.style.color =
  '#fff';

button.style.fontSize =
  '22px';

button.style.lineHeight =
  '30px';

button.style.textAlign =
  'center';

button.style.cursor =
  'pointer';

button.addEventListener(
  'click',
  function (event) {

    event.preventDefault();

    event.stopPropagation();

    onClick();

  }
);

return button;
```

}

function removeImage(
index
) {

```
const images =
  Array.isArray(
    GENZ.upload.images
  )
    ? GENZ.upload.images
    : [];

const files =
  Array.isArray(
    GENZ.upload.imageFiles
  )
    ? GENZ.upload.imageFiles
    : [];

if (
  index < 0 ||
  index >= images.length
) {

  return;

}

images.splice(
  index,
  1
);

files.splice(
  index,
  1
);

GENZ.upload.images =
  images;

GENZ.upload.imageFiles =
  files;

GENZ.upload.imageData =
  images[0] || null;

GENZ.state.images =
  [...images];

GENZ.state.imageData =
  images[0] || null;

const input =
  get('image');

if (input) {

  input.value =
    '';

}

renderImagePreview();

setImageStatus();

document.dispatchEvent(
  new CustomEvent(
    'genz-image-removed',
    {
      detail: {
        index,
        images:
          [...images]
      }
    }
  )
);

document.dispatchEvent(
  new CustomEvent(
    'genz-image-change',
    {
      detail: {
        images:
          [...images],
        files:
          [...files]
      }
    }
  )
);
```

}

function renderImagePreview() {

```
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
  function (
    src,
    index
  ) {

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

    const remove =
      createRemoveButton(
        `Hapus reference image ${index + 1}`,
        function () {

          removeImage(
            index
          );

        }
      );

    wrapper.appendChild(
      remove
    );

    preview.appendChild(
      wrapper
    );

  }
);
```

}

function keepImageVisible() {

```
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

if (
  !input ||
  !hasImage
) {

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

renderImagePreview();

setImageStatus();
```

}

function readFile(
file
) {

```
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
```

}

async function handleImageChange(
event
) {

```
const input =
  event.target;

if (
  !input ||
  input.id !== 'image'
) {

  return;

}

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
  getImageLimit();

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

renderImagePreview();

setImageStatus();

keepImageVisible();

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

setTimeout(
  keepImageVisible,
  0
);

setTimeout(
  keepImageVisible,
  100
);

setTimeout(
  keepImageVisible,
  300
);

setTimeout(
  keepImageVisible,
  750
);
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

GENZ.state.videoFiles =
  [];

GENZ.state.videoData =
  null;

const input =
  get('referenceVideo');

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
  get('videoPreview');

if (preview) {

  preview.classList.add(
    'hidden'
  );

  preview.style.display =
    'none';

}

document.dispatchEvent(
  new CustomEvent(
    'genz-video-reference-removed'
  )
);
```

}

function ensureVideoRemoveButton() {

```
const preview =
  get('videoPreview');

const video =
  get(
    'referenceVideoPreview'
  );

if (
  !preview ||
  !video
) {

  return;

}

const files =
  Array.isArray(
    GENZ.upload.videoFiles
  )
    ? GENZ.upload.videoFiles
    : [];

if (!files.length) {

  return;

}

preview.classList.remove(
  'hidden'
);

preview.style.display =
  '';

const existing =
  preview.querySelector(
    '.reference-video-remove-btn'
  );

if (existing) {

  return;

}

if (
  getComputedStyle(
    preview
  ).position ===
  'static'
) {

  preview.style.position =
    'relative';

}

const remove =
  createRemoveButton(
    'Hapus reference video',
    removeVideo
  );

remove.classList.add(
  'reference-video-remove-btn'
);

preview.appendChild(
  remove
);
```

}

function keepVideoVisible() {

```
const files =
  Array.isArray(
    GENZ.upload.videoFiles
  )
    ? GENZ.upload.videoFiles
    : [];

if (!files.length) {

  return;

}

const group =
  get(
    'videoReferenceGroup'
  );

const input =
  get(
    'referenceVideo'
  );

if (input) {

  input.disabled =
    false;

  input.removeAttribute(
    'aria-disabled'
  );

}

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

ensureVideoRemoveButton();
```

}

function bindImageChange() {

```
document.addEventListener(
  'change',
  function (event) {

    if (
      event.target &&
      event.target.id === 'image'
    ) {

      handleImageChange(
        event
      );

    }

  },
  true
);
```

}

function bindRemoveButtons() {

```
const imageRemove =
  get(
    'imageRemove'
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
    function (event) {

      event.preventDefault();

      event.stopPropagation();

      if (
        GENZ.upload &&
        typeof GENZ.upload.clearImage ===
          'function'
      ) {

        GENZ.upload.clearImage();

      } else {

        removeImage(0);

      }

    }
  );

}
```

}

function refresh() {

```
keepImageVisible();

keepVideoVisible();

bindRemoveButtons();

setImageStatus();
```

}

function bind() {

```
bindImageChange();

bindRemoveButtons();

refresh();

setInterval(
  function () {

    refresh();

  },
  1000
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
  bind,
  {
    once: true
  }
);
```

} else {

```
bind();
```

}

})();
