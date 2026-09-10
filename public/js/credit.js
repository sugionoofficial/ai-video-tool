/* =========================================================
   GEN-Z.AI - CREDIT
   public/js/credit.js
   ========================================================= */

(function () {
  "use strict";

  const GENZ = window.GENZ;

  if (!GENZ) return;

  GENZ.credit = {

    async load() {
      const container =
        GENZ.$("pageContent") ||
        GENZ.$("creditContent") ||
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
              <h2>Kredit</h2>
              <p>Saldo kredit akun Anda</p>
            </div>
          </div>

          <div class="credit-balance">
            <span>Total Kredit</span>
            <strong id="creditBalance">
              Memuat...
            </strong>
          </div>

          <div class="credit-history">
            <h3>Riwayat Kredit</h3>

            <div id="creditHistory">
              Memuat riwayat...
            </div>
          </div>

        </section>
      `;

      this.bind();
      await this.refresh();
    },

    bind() {
      const back =
        document.querySelector("[data-back-studio]");

      if (back) {
        back.addEventListener("click", () => {
          GENZ.emit("show-studio");
        });
      }
    },

    async refresh() {
      try {
        const token =
          GENZ.auth &&
          typeof GENZ.auth.token === "function"
            ? await GENZ.auth.token()
            : null;

        const response =
          await GENZ.fetchJSON(
            "/api/account/credits",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );

        const credits =
          response?.credits ??
          response?.balance ??
          0;

        GENZ.state.account = {
          ...(GENZ.state.account || {}),
          credits
        };

        const balance =
          GENZ.$("creditBalance");

        if (balance) {
          balance.textContent =
            Number(credits).toLocaleString("id-ID");
        }

        await this.loadHistory();

        if (
          GENZ.account &&
          GENZ.account.updateCredits
        ) {
          GENZ.account.updateCredits(credits);
        }

      } catch (error) {

        console.error(
          "[GEN-Z.AI] Credit error:",
          error
        );

        const balance =
          GENZ.$("creditBalance");

        if (balance) {
          balance.textContent = "0";
        }
      }
    },

    async loadHistory() {
      const container =
        GENZ.$("creditHistory");

      if (!container) return;

      try {

        const token =
          GENZ.auth &&
          typeof GENZ.auth.token === "function"
            ? await GENZ.auth.token()
            : null;

        const response =
          await GENZ.fetchJSON(
            "/api/account/transactions",
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
              response?.transactions ||
              response?.data ||
              []
            );

        if (!items.length) {
          container.innerHTML = `
            <div class="empty-state">
              Belum ada riwayat transaksi.
            </div>
          `;
          return;
        }

        container.innerHTML =
          items.map(item => {

            const amount =
              Number(
                item.amount ??
                item.credits ??
                0
              );

            const date =
              item.created_at ||
              item.createdAt ||
              item.date ||
              "";

            const type =
              item.type ||
              item.transaction_type ||
              "Transaksi";

            return `
              <div class="transaction-row">

                <div>
                  <strong>
                    ${GENZ.escapeHtml(type)}
                  </strong>

                  <small>
                    ${GENZ.escapeHtml(
                      date
                    )}
                  </small>
                </div>

                <strong class="${
                  amount >= 0
                    ? "credit-plus"
                    : "credit-minus"
                }">
                  ${
                    amount >= 0
                      ? "+"
                      : ""
                  }${amount}
                </strong>

              </div>
            `;

          }).join("");

      } catch (error) {

        console.error(
          "[GEN-Z.AI] Transaction error:",
          error
        );

        container.innerHTML = `
          <div class="empty-state">
            Riwayat kredit belum dapat dimuat.
          </div>
        `;
      }
    }
  };

})();
