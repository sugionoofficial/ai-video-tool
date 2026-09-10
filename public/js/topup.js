/* =========================================================
   GEN-Z.AI - TOP UP
   public/js/topup.js
   ========================================================= */

(function () {
  "use strict";

  const GENZ = window.GENZ;

  if (!GENZ) return;

  GENZ.topup = {

    async load() {

      const container =
        GENZ.$("pageContent") ||
        GENZ.$("topupContent") ||
        GENZ.$("content");

      if (!container) return;

      container.innerHTML = `

        <section class="page-card">

          <div class="page-header">

            <button
              type="button"
              class="back-btn"
              data-back-studio>
              ←
            </button>

            <div>
              <h2>Top-up Kredit</h2>
              <p>
                Tambahkan kredit ke akun GEN-Z.AI
              </p>
            </div>

          </div>

          <form id="topupForm">

            <label>
              Jumlah Kredit
            </label>

            <input
              id="topupCredits"
              type="number"
              min="1"
              step="1"
              placeholder="Contoh: 100"
              required
            >

            <label>
              Catatan
            </label>

            <textarea
              id="topupNote"
              rows="4"
              placeholder="Catatan pembayaran (opsional)"
            ></textarea>

            <button
              type="submit"
              id="topupSubmit"
              class="primary-btn">
              Ajukan Top-up
            </button>

          </form>

          <div
            id="topupStatus"
            class="topup-status">
          </div>

          <div class="topup-history">

            <h3>
              Riwayat Top-up
            </h3>

            <div id="topupHistory">
              Memuat...
            </div>

          </div>

        </section>
      `;

      this.bind();
      await this.loadHistory();
    },

    bind() {

      const back =
        document.querySelector(
          "[data-back-studio]"
        );

      if (back) {
        back.addEventListener(
          "click",
          () => GENZ.emit("show-studio")
        );
      }

      const form =
        GENZ.$("topupForm");

      if (form) {
        form.addEventListener(
          "submit",
          event => {
            event.preventDefault();
            this.submit();
          }
        );
      }
    },

    async submit() {

      const creditsEl =
        GENZ.$("topupCredits");

      const noteEl =
        GENZ.$("topupNote");

      const submit =
        GENZ.$("topupSubmit");

      const status =
        GENZ.$("topupStatus");

      const credits =
        Number(
          creditsEl?.value || 0
        );

      if (!credits || credits <= 0) {
        if (status) {
          status.textContent =
            "Masukkan jumlah kredit yang valid.";
        }
        return;
      }

      try {

        if (submit) {
          submit.disabled = true;
          submit.textContent =
            "Mengirim...";
        }

        const token =
          GENZ.auth &&
          typeof GENZ.auth.token === "function"
            ? await GENZ.auth.token()
            : null;

        const response =
          await GENZ.fetchJSON(
            "/api/account/topup-requests",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`
              },

              body: JSON.stringify({
                credits,
                amount: credits,
                note:
                  noteEl?.value?.trim() || ""
              })
            }
          );

        if (status) {
          status.textContent =
            response?.message ||
            "Permintaan top-up berhasil dikirim.";
        }

        if (creditsEl) {
          creditsEl.value = "";
        }

        if (noteEl) {
          noteEl.value = "";
        }

        await this.loadHistory();

      } catch (error) {

        console.error(
          "[GEN-Z.AI] Top-up error:",
          error
        );

        if (status) {
          status.textContent =
            error.message ||
            "Gagal mengirim permintaan top-up.";
        }

      } finally {

        if (submit) {
          submit.disabled = false;
          submit.textContent =
            "Ajukan Top-up";
        }
      }
    },

    async loadHistory() {

      const container =
        GENZ.$("topupHistory");

      if (!container) return;

      try {

        const token =
          GENZ.auth &&
          typeof GENZ.auth.token === "function"
            ? await GENZ.auth.token()
            : null;

        const response =
          await GENZ.fetchJSON(
            "/api/account/topup-requests",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );

        const items =
          Array.isArray(response)
            ? response
            : (
              response?.requests ||
              response?.data ||
              []
            );

        if (!items.length) {
          container.innerHTML = `
            <div class="empty-state">
              Belum ada permintaan top-up.
            </div>
          `;
          return;
        }

        container.innerHTML =
          items.map(item => {

            const status =
              item.status ||
              "pending";

            const credits =
              item.credits ??
              item.amount ??
              0;

            return `
              <div class="topup-row">

                <div>
                  <strong>
                    ${credits} Kredit
                  </strong>

                  <small>
                    ${GENZ.escapeHtml(
                      item.created_at ||
                      item.createdAt ||
                      ""
                    )}
                  </small>
                </div>

                <span class="topup-badge status-${GENZ.escapeHtml(
                  status
                )}">
                  ${GENZ.escapeHtml(status)}
                </span>

              </div>
            `;

          }).join("");

      } catch (error) {

        console.error(
          "[GEN-Z.AI] Top-up history error:",
          error
        );

        container.innerHTML = `
          <div class="empty-state">
            Riwayat top-up belum dapat dimuat.
          </div>
        `;
      }
    }
  };

})();
