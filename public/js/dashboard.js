/* =========================================================
GEN-Z.AI
DASHBOARD MODULE

Halaman Dashboard khusus untuk video referensi.

Dashboard ini TIDAK menjalankan generator.
Video referensi terpisah dari riwayat video user.
========================================================= */

(function () {

'use strict';

const GENZ =
window.GENZ ||
(window.GENZ = {});

/* =======================================================
STATE
======================================================= */

const state = {

loaded: false,

bound: false,

category: 'all',

selectedVideo: null

};

/* =======================================================
DATA VIDEO REFERENSI

 Tambahkan video baru di array ini.
 ======================================================= */

const REFERENCES = [

{
  id: 'vlog-daily-01',

  title: 'Vlog Daily',

  category: 'vlog',

  categoryLabel: 'Vlog Daily',

  description:
    'Contoh video vlog daily dengan gaya natural dan realistis.',

  video: '',

  poster: '',

  provider: 'Veo',

  model: 'Veo',

  duration: '10 detik',

  aspectRatio: '9:16',

  resolution: '4K',

  prompt:
    'Video vlog daily realistis dengan gerakan natural, kamera stabil, suasana kehidupan sehari-hari.'
},


{
  id: 'motion-control-01',

  title: 'Motion Control',

  category: 'motion',

  categoryLabel: 'Motion Control',

  description:
    'Contoh video dengan gerakan karakter mengikuti referensi gerakan.',

  video: '',

  poster: '',

  provider: 'Veo',

  model: 'Veo',

  duration: '10 detik',

  aspectRatio: '9:16',

  resolution: '4K',

  prompt:
    'Pertahankan karakter dan tampilan referensi. Terapkan gerakan tubuh natural dan konsisten mengikuti motion reference.'
},


{
  id: 'affiliate-01',

  title: 'Video Affiliate',

  category: 'affiliate',

  categoryLabel: 'Video Affiliate',

  description:
    'Contoh video promosi produk untuk kebutuhan konten affiliate.',

  video: '',

  poster: '',

  provider: 'Veo',

  model: 'Veo',

  duration: '10 detik',

  aspectRatio: '9:16',

  resolution: '4K',

  prompt:
    'Video promosi produk fashion bergaya konten affiliate Indonesia, natural, realistis, menarik dan fokus pada produk.'
},


{
  id: 'fashion-01',

  title: 'Fashion Showcase',

  category: 'fashion',

  categoryLabel: 'Fashion',

  description:
    'Contoh video fashion dengan pose dan gerakan model natural.',

  video: '',

  poster: '',

  provider: 'Veo',

  model: 'Veo',

  duration: '10 detik',

  aspectRatio: '9:16',

  resolution: '4K',

  prompt:
    'Video fashion realistis dengan model menampilkan outfit secara natural, gerakan lembut dan kamera stabil.'
},


{
  id: 'product-01',

  title: 'Product Showcase',

  category: 'product',

  categoryLabel: 'Product Showcase',

  description:
    'Contoh video yang berfokus pada tampilan produk secara detail.',

  video: '',

  poster: '',

  provider: 'Veo',

  model: 'Veo',

  duration: '10 detik',

  aspectRatio: '9:16',

  resolution: '4K',

  prompt:
    'Video product showcase realistis dengan fokus utama pada detail produk, pencahayaan bersih dan gerakan kamera halus.'
}

];

/* =======================================================
HELPERS
======================================================= */

function $(id) {

return document.getElementById(id);

}

function escapeHTML(value) {

return String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

}

/* =======================================================
RENDER
======================================================= */

function getFilteredVideos() {

if (state.category === 'all') {

  return REFERENCES;

}

return REFERENCES.filter(
  function (item) {

    return (
      item.category ===
      state.category
    );

  }
);

}

function render() {

const grid =
  $('dashboardVideoGrid');


if (!grid) {

  return;

}


const videos =
  getFilteredVideos();


if (!videos.length) {

  grid.innerHTML = `
    <div class="genz-dashboard-empty">

      <strong>
        Belum ada video pada kategori ini
      </strong>

      <span>
        Contoh video akan ditambahkan ke Dashboard.
      </span>

    </div>
  `;

  return;

}


grid.innerHTML =
  videos
    .map(
      function (item) {

        const hasVideo =
          Boolean(
            item.video
          );


        const poster =
          item.poster
            ? `poster="${escapeHTML(item.poster)}"`
            : '';


        return `

          <article
            class="genz-reference-card"
            data-video-id="${escapeHTML(item.id)}"
          >

            <div
              class="genz-reference-preview"
            >

              ${
                hasVideo

                  ? `

                    <video
                      src="${escapeHTML(item.video)}"
                      ${poster}
                      muted
                      playsinline
                      preload="metadata"
                    ></video>

                  `

                  : `

                    <div
                      class="genz-reference-placeholder"
                    >

                      <div
                        class="genz-reference-placeholder-icon"
                      >
                        ▶
                      </div>

                      <div
                        class="genz-reference-placeholder-title"
                      >
                        Video Referensi
                      </div>

                      <div
                        class="genz-reference-placeholder-text"
                      >
                        File video akan ditambahkan
                        pada koleksi GEN-Z.AI.
                      </div>

                    </div>

                  `
              }


              <button
                type="button"
                class="genz-reference-play"
                data-preview-id="${escapeHTML(item.id)}"
                aria-label="Preview ${escapeHTML(item.title)}"
              >
                ▶
              </button>

            </div>


            <div
              class="genz-reference-content"
            >

              <span
                class="genz-reference-category"
              >
                ${escapeHTML(item.categoryLabel)}
              </span>


              <h3
                class="genz-reference-title"
              >
                ${escapeHTML(item.title)}
              </h3>


              <p
                class="genz-reference-description"
              >
                ${escapeHTML(item.description)}
              </p>


              <div
                class="genz-reference-meta"
              >

                <span>
                  ${escapeHTML(item.duration)}
                </span>

                <span>
                  ${escapeHTML(item.aspectRatio)}
                </span>

                <span>
                  ${escapeHTML(item.resolution)}
                </span>

              </div>

            </div>

          </article>

        `;

      }
    )
    .join('');


bindPreviewButtons();

}

/* =======================================================
CATEGORY
======================================================= */

function bindCategories() {

const container =
  $('dashboardCategories');


if (!container) {

  return;

}


container
  .querySelectorAll(
    '[data-category]'
  )
  .forEach(
    function (button) {

      button.addEventListener(
        'click',
        function () {

          state.category =
            button.dataset.category ||
            'all';


          container
            .querySelectorAll(
              '[data-category]'
            )
            .forEach(
              function (item) {

                item.classList.remove(
                  'active'
                );

              }
            );


          button.classList.add(
            'active'
          );


          render();

        }
      );

    }
  );

}

/* =======================================================
PREVIEW
======================================================= */

function bindPreviewButtons() {

document
  .querySelectorAll(
    '[data-preview-id]'
  )
  .forEach(
    function (button) {

      button.addEventListener(
        'click',
        function (event) {

          event.preventDefault();
          event.stopPropagation();

          const id =
            button.dataset.previewId;


          openPreview(id);

        }
      );

    }
  );


document
  .querySelectorAll(
    '.genz-reference-card'
  )
  .forEach(
    function (card) {

      card.addEventListener(
        'click',
        function () {

          const id =
            card.dataset.videoId;


          openPreview(id);

        }
      );

    }
  );

}

function openPreview(id) {

const item =
  REFERENCES.find(
    function (video) {

      return video.id === id;

    }
  );


if (!item) {

  return;

}


state.selectedVideo =
  item;


const modal =
  $('dashboardVideoModal');

const video =
  $('dashboardModalVideo');

const category =
  $('dashboardModalCategory');

const title =
  $('dashboardModalTitle');

const description =
  $('dashboardModalDescription');

const details =
  $('dashboardModalDetails');


if (
  !modal ||
  !video ||
  !category ||
  !title ||
  !description ||
  !details
) {

  return;

}


category.textContent =
  item.categoryLabel;


title.textContent =
  item.title;


description.textContent =
  item.description;


details.innerHTML = `

  <div
    class="genz-dashboard-modal-detail"
  >

    <small>
      Provider
    </small>

    <span>
      ${escapeHTML(item.provider)}
    </span>

  </div>


  <div
    class="genz-dashboard-modal-detail"
  >

    <small>
      Model
    </small>

    <span>
      ${escapeHTML(item.model)}
    </span>

  </div>


  <div
    class="genz-dashboard-modal-detail"
  >

    <small>
      Durasi
    </small>

    <span>
      ${escapeHTML(item.duration)}
    </span>

  </div>


  <div
    class="genz-dashboard-modal-detail"
  >

    <small>
      Rasio
    </small>

    <span>
      ${escapeHTML(item.aspectRatio)}
    </span>

  </div>


  <div
    class="genz-dashboard-modal-detail"
  >

    <small>
      Resolusi
    </small>

    <span>
      ${escapeHTML(item.resolution)}
    </span>

  </div>

`;


video.pause();

video.removeAttribute(
  'src'
);

video.load();


if (item.video) {

  video.src =
    item.video;

  video.load();

}


modal.classList.remove(
  'hidden'
);

modal.setAttribute(
  'aria-hidden',
  'false'
);

document.body.style.overflow =
  'hidden';

}

function closePreview() {

const modal =
  $('dashboardVideoModal');

const video =
  $('dashboardModalVideo');


if (video) {

  video.pause();

  video.removeAttribute(
    'src'
  );

  video.load();

}


if (modal) {

  modal.classList.add(
    'hidden'
  );

  modal.setAttribute(
    'aria-hidden',
    'true'
  );

}


document.body.style.overflow =
  '';

state.selectedVideo =
  null;

}

/* =======================================================
MODAL EVENTS
======================================================= */

function bindModal() {

const close =
  $('dashboardModalClose');

const modal =
  $('dashboardVideoModal');


if (close) {

  close.addEventListener(
    'click',
    closePreview
  );

}


if (modal) {

  modal.addEventListener(
    'click',
    function (event) {

      if (
        event.target ===
        modal
      ) {

        closePreview();

      }

    }
  );

}


document.addEventListener(
  'keydown',
  function (event) {

    if (
      event.key === 'Escape'
    ) {

      const modal =
        $('dashboardVideoModal');


      if (
        modal &&
        !modal.classList.contains(
          'hidden'
        )
      ) {

        closePreview();

      }

    }

  }
);

}

/* =======================================================
LOAD COMPONENT
======================================================= */

async function loadComponent() {

if (
  typeof GENZ.loadComponent !==
  'function'
) {

  throw new Error(
    'GENZ.loadComponent tidak tersedia.'
  );

}


await GENZ.loadComponent(
  '#pageContent',
  '/components/dashboard.html'
);

}

/* =======================================================
LOAD
======================================================= */

async function load() {

await loadComponent();


bindCategories();

bindModal();

render();


state.loaded =
  true;

state.bound =
  true;


GENZ.state =
  GENZ.state || {};

GENZ.state.dashboard =
  GENZ.state.dashboard || {};

GENZ.state.dashboard.loaded =
  true;

}

/* =======================================================
PUBLIC API
======================================================= */

GENZ.dashboard = {

load,

render,

closePreview,

references:
  REFERENCES,

state

};

})();
