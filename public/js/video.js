/* =========================================================
   GEN-Z.AI VIDEO
========================================================= */

(function () {

  'use strict';

  const GENZ = window.GENZ || (window.GENZ = {});


  GENZ.video = {

    poll: null,

    objectUrl: null

  };


  /* =======================================================
     STOP POLLING
  ======================================================= */

  GENZ.video.stopPolling =
    function () {

      if (
        GENZ.video.poll
      ) {

        clearTimeout(
          GENZ.video.poll
        );

        GENZ.video.poll =
          null;

      }

    };


  /* =======================================================
     CLEAR VIDEO
  ======================================================= */

  GENZ.video.clear =
    function () {

      GENZ.video.stopPolling();


      const video =
        document.getElementById(
          'video'
        );


      const download =
        document.getElementById(
          'download'
        );


      if (video) {

        video.pause();

        video.removeAttribute(
          'src'
        );

        video.load();

        video.classList.add(
          'hidden'
        );

      }


      if (download) {

        download.removeAttribute(
          'href'
        );

        download.classList.add(
          'hidden'
        );

      }


      if (
        GENZ.video.objectUrl
      ) {

        try {

          URL.revokeObjectURL(
            GENZ.video.objectUrl
          );

        } catch {}

        GENZ.video.objectUrl =
          null;

      }


      GENZ.state.currentVideoObjectUrl =
        null;

    };


  /* =======================================================
     SHOW VIDEO
  ======================================================= */

  GENZ.video.show =
    function (url) {

      const video =
        document.getElementById(
          'video'
        );


      const download =
        document.getElementById(
          'download'
        );


      if (video) {

        video.src =
          url;

        video.classList.remove(
          'hidden'
        );

        video.load();

      }


      if (download) {

        download.href =
          url;

        download.classList.remove(
          'hidden'
        );

      }

    };


  /* =======================================================
     GET VIDEO WITH TOKEN
  ======================================================= */

  GENZ.video.fetchProtected =
    async function (url) {

      if (
        !GENZ.auth ||
        typeof GENZ.auth.token !==
          'function'
      ) {

        throw new Error(
          'Auth client belum siap.'
        );

      }


      const token =
        await GENZ.auth.token();


      const response =
        await fetch(
          url,
          {
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );


      if (!response.ok) {

        throw new Error(
          'Gagal mengambil file video.'
        );

      }


      const blob =
        await response.blob();


      const objectUrl =
        URL.createObjectURL(
          blob
        );


      GENZ.video.objectUrl =
        objectUrl;


      GENZ.state.currentVideoObjectUrl =
        objectUrl;


      return objectUrl;

    };


})();
