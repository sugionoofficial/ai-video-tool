/* =========================================================
   GEN-Z.AI CORE
   Fungsi dasar aplikasi
========================================================= */

(function () {

  'use strict';

  window.GENZ = window.GENZ || {};

  /* -------------------------------------------------------
     DOM HELPER
  ------------------------------------------------------- */

  GENZ.$ = function (selector, root) {

    return (
      (root || document)
        .querySelector(selector)
    );

  };


  GENZ.$$ = function (selector, root) {

    return Array.from(
      (root || document)
        .querySelectorAll(selector)
    );

  };


  /* -------------------------------------------------------
     CREATE ELEMENT
  ------------------------------------------------------- */

  GENZ.create = function (
    tag,
    options
  ) {

    const el =
      document.createElement(tag);

    options =
      options || {};

    if (options.id) {
      el.id = options.id;
    }

    if (options.className) {
      el.className =
        options.className;
    }

    if (options.text) {
      el.textContent =
        options.text;
    }

    if (options.html) {
      el.innerHTML =
        options.html;
    }

    return el;

  };


  /* -------------------------------------------------------
     SHOW / HIDE
  ------------------------------------------------------- */

  GENZ.show = function (el) {

    if (!el) return;

    el.classList.remove('hidden');

    el.removeAttribute('hidden');

  };


  GENZ.hide = function (el) {

    if (!el) return;

    el.classList.add('hidden');

  };


  /* -------------------------------------------------------
     SAFE TEXT
  ------------------------------------------------------- */

  GENZ.escapeHtml =
    function (value) {

      const div =
        document.createElement(
          'div'
        );

      div.textContent =
        value == null
          ? ''
          : String(value);

      return div.innerHTML;

    };


  /* -------------------------------------------------------
     FETCH JSON
  ------------------------------------------------------- */

  GENZ.fetchJSON =
    async function (
      url,
      options
    ) {

      const response =
        await fetch(
          url,
          options || {}
        );

      let data = null;

      try {

        data =
          await response.json();

      } catch {

        data = null;

      }

      if (!response.ok) {

        const message =
          data?.error ||
          data?.message ||
          `HTTP ${response.status}`;

        throw new Error(message);

      }

      return data;

    };


  /* -------------------------------------------------------
     COMPONENT LOADER
  ------------------------------------------------------- */

  GENZ.loadComponent =
    async function (
      target,
      url
    ) {

      const container =
        typeof target === 'string'
          ? document.querySelector(target)
          : target;

      if (!container) {

        throw new Error(
          `Container tidak ditemukan: ${target}`
        );

      }

      const response =
        await fetch(url, {
          cache: 'no-store'
        });

      if (!response.ok) {

        throw new Error(
          `Gagal memuat component: ${url}`
        );

      }

      const html =
        await response.text();

      container.innerHTML =
        html;

      return container;

    };


  /* -------------------------------------------------------
     EVENT BUS
  ------------------------------------------------------- */

  const events = {};

  GENZ.on =
    function (
      name,
      callback
    ) {

      if (!events[name]) {
        events[name] = [];
      }

      events[name].push(
        callback
      );

    };


  GENZ.emit =
    function (
      name,
      detail
    ) {

      (
        events[name] || []
      ).forEach(
        callback => {

          try {

            callback(detail);

          } catch (error) {

            console.error(
              `[GEN-Z.AI] Event ${name}`,
              error
            );

          }

        }
      );

    };


  /* -------------------------------------------------------
     APP STATE
  ------------------------------------------------------- */

  GENZ.state = {

    initialized: false,

    loggedIn: false,

    user: null,

    account: null,

    providers: [],

    currentPage: 'studio',

    imageData: null,

    provider: null,

    poll: null,

    currentVideoObjectUrl: null

  };


  console.log(
    '[GEN-Z.AI] CORE READY'
  );

})();
