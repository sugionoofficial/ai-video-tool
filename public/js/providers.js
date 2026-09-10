/* =========================================================
   GEN-Z.AI PROVIDERS
========================================================= */

(function () {

  'use strict';

  const GENZ = window.GENZ || (window.GENZ = {});

  GENZ.providers = {
    current: null,
    list: []
  };


  /* =======================================================
     PROVIDER DEFAULT CONFIG
  ======================================================= */

  GENZ.providers.config = {

    veo: {
      name: 'Gemini / Veo',

      models: [
        'veo-3.1-fast-generate-preview',
        'veo-3.1-generate-preview',
        'veo-3.1-lite-generate-preview'
      ],

      durations: [
        4,
        6,
        8
      ],

      aspects: [
        '16:9',
        '9:16'
      ],

      res: [
        '720p',
        '1080p',
        '4k'
      ]
    },


    minimax: {
      name: 'MiniMax',

      models: [
        'MiniMax-Hailuo-2.3',
        'MiniMax-Hailuo-2.3-Fast',
        'MiniMax-Hailuo-02'
      ],

      durations: [
        6,
        10
      ],

      aspects: [
        '16:9',
        '9:16'
      ],

      res: [
        '512P',
        '768P',
        '1080P'
      ]
    },


    luma: {
      name: 'Luma',

      models: [
        'ray-2',
        'ray-flash-2'
      ],

      durations: [
        '5s',
        '9s'
      ],

      aspects: [
        '1:1',
        '16:9',
        '9:16',
        '4:3',
        '3:4',
        '21:9',
        '9:21'
      ],

      res: [
        '720p',
        '1080p',
        '4k'
      ]
    }

  };


  /* =======================================================
     SELECT PROVIDER
  ======================================================= */

  GENZ.providers.select = function (providerId) {

    GENZ.providers.current =
      providerId;


    document
      .querySelectorAll('.provider')
      .forEach(button => {

        button.classList.toggle(
          'active',
          button.dataset.provider === providerId
        );

      });


    const c =
      GENZ.providers.config[providerId] ||
      GENZ.providers.list.find(
        x => x.id === providerId
      )?.capabilities;


    if (!c) {
      return;
    }


    fillOptions(
      document.getElementById('model'),
      c.models || []
    );


    fillOptions(
      document.getElementById('duration'),
      c.durations || []
    );


    fillOptions(
      document.getElementById('aspect'),
      c.aspects || []
    );


    fillOptions(
      document.getElementById('resolution'),
      c.resolutions || c.res || []
    );

  };


  /* =======================================================
     OPTION HELPER
  ======================================================= */

  function fillOptions(element, values) {

    if (!element) {
      return;
    }


    element.innerHTML =
      (values || [])
        .map(value => {

          const safe =
            GENZ.escapeHtml
              ? GENZ.escapeHtml(value)
              : String(value);

          return `
            <option value="${safe}">
              ${safe}
            </option>
          `;

        })
        .join('');

  }


  /* =======================================================
     RENDER PROVIDERS
  ======================================================= */

  GENZ.providers.render = function () {

    const box =
      document.getElementById(
        'providers'
      );


    if (!box) {
      return;
    }


    box.innerHTML = '';


    GENZ.providers.list
      .forEach(provider => {

        const button =
          document.createElement(
            'button'
          );


        button.className =
          'provider';


        button.dataset.provider =
          provider.id;


        button.type =
          'button';


        button.innerHTML = `
          ${GENZ.escapeHtml
            ? GENZ.escapeHtml(provider.name)
            : provider.name}

          <small>
            ${GENZ.escapeHtml
              ? GENZ.escapeHtml(provider.adapter || '')
              : provider.adapter || ''}
          </small>
        `;


        button.addEventListener(
          'click',
          () => {

            GENZ.providers.select(
              provider.id
            );

          }
        );


        box.append(
          button
        );

      });


    if (
      GENZ.providers.list.length
    ) {

      GENZ.providers.select(
        GENZ.providers.list[0].id
      );


      const generate =
        document.getElementById(
          'generate'
        );


      if (generate) {
        generate.disabled =
          false;
      }

    } else {

      const status =
        document.getElementById(
          'status'
        );


      if (status) {

        status.textContent =
          'Belum ada provider aktif.';

      }


      const generate =
        document.getElementById(
          'generate'
        );


      if (generate) {
        generate.disabled =
          true;
      }

    }

  };


  /* =======================================================
     LOAD PROVIDERS
  ======================================================= */

  GENZ.providers.load =
    async function () {

      const response =
        await fetch(
          '/api/providers',
          {
            cache: 'no-store'
          }
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        data.success === false
      ) {

        throw new Error(
          data.error ||
          'Gagal memuat provider'
        );

      }


      GENZ.providers.list =
        Array.isArray(
          data.providers
        )
          ? data.providers
          : [];


      GENZ.state.providers =
        GENZ.providers.list;


      GENZ.providers.render();

    };


  /*
   * Compatibility dengan kode lama.
   */

  GENZ.providers.selectProvider =
    GENZ.providers.select;

  GENZ.providers.loadProviders =
    GENZ.providers.load;

})();
