/* =========================================================
   GEN-Z.AI - PROFILE
   public/js/profile.js
   ========================================================= */

(function () {
  "use strict";

  const GENZ = window.GENZ;

  if (!GENZ) return;

  GENZ.profile = {

    async load() {
      const container =
        GENZ.$("pageContent") ||
        GENZ.$("profileContent") ||
        GENZ.$("content");

      if (!container) return;

      const user = GENZ.state.user || {};
      const account = GENZ.state.account || {};

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
              <h2>Profil</h2>
              <p>Informasi akun GEN-Z.AI</p>
            </div>
          </div>

          <div class="profile-info">

            <div class="profile-row">
              <span>Email</span>
              <strong>
                ${GENZ.escapeHtml(
                  user.email ||
                  account.email ||
                  "-"
                )}
              </strong>
            </div>

            <div class="profile-row">
              <span>Status</span>
              <strong class="status-active">
                Aktif
              </strong>
            </div>

            <div class="profile-row">
              <span>Role</span>
              <strong>
                ${
                  account.isAdmin
                    ? "Administrator"
                    : "User"
                }
              </strong>
            </div>

            <div class="profile-row">
              <span>Kredit</span>
              <strong>
                ${
                  account.credits ??
                  GENZ.state.account?.credits ??
                  0
                }
              }
              kredit
              </strong>
            </div>

          </div>
        </section>
      `;

      this.bind();
    },

    bind() {
      const back =
        document.querySelector("[data-back-studio]");

      if (back) {
        back.addEventListener("click", () => {
          GENZ.emit("show-studio");
        });
      }
    }
  };

})();
