let supabase = null;

const $ = id => document.getElementById(id);

const cfg = {
  veo: {
    name: 'Gemini / Veo',
    models: [
      'veo-3.1-fast-generate-preview',
      'veo-3.1-generate-preview',
      'veo-3.1-lite-generate-preview'
    ],
    durations: [4, 6, 8],
    aspects: ['16:9', '9:16'],
    res: ['720p', '1080p', '4k']
  },

  minimax: {
    name: 'MiniMax',
    models: [
      'MiniMax-Hailuo-2.3',
      'MiniMax-Hailuo-2.3-Fast',
      'MiniMax-Hailuo-02'
    ],
    durations: [6, 10],
    aspects: ['16:9', '9:16'],
    res: ['512P', '768P', '1080P']
  },

  luma: {
    name: 'Luma',
    models: [
      'ray-2',
      'ray-flash-2'
    ],
    durations: ['5s', '9s'],
    aspects: [
      '1:1',
      '16:9',
      '9:16',
      '4:3',
      '3:4',
      '21:9',
      '9:21'
    ],
    res: ['720p', '1080p', '4k']
  }
};

let provider = null;
let imageData = null;
let poll = null;
let providers = [];
let account = null;


/* =========================================================
   UTILITY
========================================================= */

function opts(el, arr) {
  if (!el) return;

  el.innerHTML = (arr || [])
    .map(
      x =>
        `<option value="${escapeAttr(x)}">${escapeHtml(x)}</option>`
    )
    .join('');
}


function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>'"]/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[c])
  );
}


function escapeAttr(s) {
  return String(s ?? '').replace(
    /[&<>'"]/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[c])
  );
}


/* =========================================================
   PROVIDER
========================================================= */

function selectProvider(p) {
  provider = p;

  document
    .querySelectorAll('.provider')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.provider === p
      );
    });

  const c =
    cfg[p] ||
    providers.find(x => x.id === p)?.capabilities;

  if (!c) return;

  opts($('model'), c.models || []);
  opts($('duration'), c.durations || []);
  opts($('aspect'), c.aspects || []);
  opts(
    $('resolution'),
    c.resolutions || c.res || []
  );
}


function renderProviders() {
  const box = $('providers');

  if (!box) return;

  box.innerHTML = '';

  providers.forEach(p => {
    const button =
      document.createElement('button');

    button.className = 'provider';
    button.dataset.provider = p.id;

    button.innerHTML = `
      ${escapeHtml(p.name)}
      <small>${escapeHtml(p.adapter)}</small>
    `;

    button.onclick = () => {
      selectProvider(p.id);
    };

    box.append(button);
  });

  if (providers[0]) {
    selectProvider(providers[0].id);
  } else {
    if ($('status')) {
      $('status').textContent =
        'Belum ada provider aktif.';
    }

    if ($('generate')) {
      $('generate').disabled = true;
    }
  }
}


async function loadProviders() {
  const r =
    await fetch('/api/providers', {
      cache: 'no-store'
    });

  const d = await r.json();

  if (!r.ok || d.success === false) {
    throw Error(
      d.error ||
      'Gagal memuat provider'
    );
  }

  providers =
    d.providers || [];

  renderProviders();
}


/* =========================================================
   AUTH SESSION
========================================================= */

async function token() {
  if (!supabase) {
    throw Error(
      'Supabase belum siap.'
    );
  }

  const {
    data,
    error
  } =
    await supabase.auth.getSession();

  if (
    error ||
    !data.session
  ) {
    throw Error(
      'Silakan login.'
    );
  }

  return data.session.access_token;
}


async function api(
  path,
  body,
  method = 'POST',
  extraHeaders = {}
) {
  const t =
    await token();

  const r =
    await fetch(path, {
      method,

      headers: {
        'Content-Type':
          'application/json',

        Authorization:
          `Bearer ${t}`,

        ...extraHeaders
      },

      body:
        body === undefined
          ? undefined
          : JSON.stringify(body)
    });

  let d;

  try {
    d =
      await r.json();
  } catch {
    throw Error(
      `Server mengembalikan respons tidak valid (${r.status}).`
    );
  }

  if (
    !r.ok ||
    d.success === false
  ) {
    throw Error(
      d.error ||
      'Request gagal'
    );
  }

  return d;
}


/* =========================================================
   REFRESH UI
========================================================= */

async function refresh() {
  if (!supabase) {
    return;
  }

  try {
    const {
      data,
      error
    } =
      await supabase.auth.getUser();

    if (error) {
      console.error(
        '[GEN-Z.AI] Gagal membaca user:',
        error
      );
    }

    const user =
      data?.user;

    /* =====================================================
       BELUM LOGIN
    ===================================================== */

    if (!user) {
      account = null;

      $('auth')?.classList.remove(
        'hidden'
      );

      $('studio')?.classList.add(
        'hidden'
      );

      $('accountPage')?.classList.add(
        'hidden'
      );

      $('accountBtn')?.classList.add(
        'hidden'
      );

      $('accountMenu')?.classList.add(
        'hidden'
      );

      $('backToStudio')?.classList.add(
        'hidden'
      );

      $('pageBack')?.classList.add(
        'hidden'
      );

      return;
    }


    /* =====================================================
       SUDAH LOGIN
    ===================================================== */

    $('auth')?.classList.add(
      'hidden'
    );

    $('studio')?.classList.remove(
      'hidden'
    );

    $('accountPage')?.classList.add(
      'hidden'
    );

    $('accountBtn')?.classList.remove(
      'hidden'
    );

    $('backToStudio')?.classList.add(
      'hidden'
    );

    $('pageBack')?.classList.add(
      'hidden'
    );


    if ($('userEmail')) {
      $('userEmail').textContent =
        user.email || '';
    }

    if ($('menuEmail')) {
      $('menuEmail').textContent =
        user.email || '';
    }


    /* =====================================================
       ACCOUNT / CREDIT
    ===================================================== */

    try {
      const d =
        await api(
          '/api/account/credits',
          undefined,
          'GET'
        );

      account = {
        ...d,
        user
      };

      if ($('credits')) {
        $('credits').textContent =
          `${d.credits ?? 0} credit`;
      }

      $('adminPanel')?.classList.toggle(
        'hidden',
        !d.isAdmin
      );

      $('contactAdmin')?.classList.toggle(
        'hidden',
        Boolean(d.isAdmin)
      );

    } catch (e) {
      console.error(
        '[GEN-Z.AI] Gagal memuat account:',
        e
      );

      account = {
        user,
        credits: 0,
        isAdmin: false
      };

      if ($('credits')) {
        $('credits').textContent =
          '— credit';
      }
    }

  } catch (e) {
    console.error(
      '[GEN-Z.AI] Refresh error:',
      e
    );
  }
}


/* =========================================================
   LOGOUT UI
========================================================= */

function closeMenu() {
  $('accountMenu')?.classList.add(
    'hidden'
  );
}


function showStudio() {
  $('accountPage')?.classList.add(
    'hidden'
  );

  $('studio')?.classList.remove(
    'hidden'
  );

  $('backToStudio')?.classList.add(
    'hidden'
  );

  $('pageBack')?.classList.add(
    'hidden'
  );

  closeMenu();
}


/* =========================================================
   CREDIT HISTORY
========================================================= */

async function loadCreditHistory() {
  try {
    const d =
      await api(
        '/api/account/transactions?limit=30',
        undefined,
        'GET'
      );

    const box =
      $('creditHistory');

    if (!box) return;

    if (
      !d.transactions?.length
    ) {
      box.innerHTML =
        '<p>Belum ada transaksi credit.</p>';

      return;
    }

    box.innerHTML =
      '<h3>Riwayat Credit</h3>' +

      d.transactions
        .map(t => {
          const sign =
            Number(t.amount) > 0
              ? '+'
              : '';

          const label = {
            generation:
              'Generation',

            refund:
              'Refund',

            admin_adjustment:
              'Penyesuaian Admin',

            topup:
              'Top-up'
          }[
            t.type
          ] || t.type;

          return `
            <div class="credit-history-row">

              <div>

                <strong>
                  ${escapeHtml(label)}
                </strong>

                <small>
                  ${escapeHtml(
                    t.note || ''
                  )}
                </small>

              </div>

              <span>
                ${sign}${Number(
                  t.amount
                )}
                · ${Number(
                  t.balance_after ?? 0
                )}
                saldo
              </span>

            </div>
          `;
        })
        .join('');

  } catch (e) {
    console.error(
      '[GEN-Z.AI] Credit history error:',
      e
    );

    const box =
      $('creditHistory');

    if (box) {
      box.innerHTML =
        '<p>Riwayat credit belum dapat dimuat.</p>';
    }
  }
}


/* =========================================================
   TOP UP
========================================================= */

async function loadTopups() {
  const box =
    $('topupState');

  if (!box) return;

  try {
    const d =
      await api(
        '/api/account/topup-requests?limit=20',
        undefined,
        'GET'
      );

    if (
      !d.requests?.length
    ) {
      box.innerHTML =
        '<p>Belum ada request top-up.</p>';

    } else {
      box.innerHTML =
        '<h3>Request Terakhir</h3>' +

        d.requests
          .map(r => `
            <div class="credit-history-row">

              <div>

                <strong>
                  ${Number(r.amount)}
                  credit ·
                  ${escapeHtml(
                    r.status
                  )}
                </strong>

                <small>
                  ${escapeHtml(
                    r.note || ''
                  )}

                  ${
                    r.admin_note
                      ? ' · ' +
                        escapeHtml(
                          r.admin_note
                        )
                      : ''
                  }
                </small>

              </div>

              <span>
                ${new Date(
                  r.created_at
                ).toLocaleString()}
              </span>

            </div>
          `)
          .join('');
    }

  } catch (e) {
    console.error(
      '[GEN-Z.AI] Topup history error:',
      e
    );

    box.innerHTML =
      '<p>Request belum dapat dimuat.</p>';
  }


  const btn =
    $('submitTopup');

  if (!btn) return;

  btn.onclick =
    async () => {

      const amount =
        Number(
          $('topupAmount')?.value
        );

      const note =
        $('topupNote')?.value.trim() ||
        '';

      if (
        !Number.isInteger(amount) ||
        amount <= 0 ||
        amount > 1000000
      ) {
        alert(
          'Jumlah harus integer 1–1.000.000.'
        );

        return;
      }

      try {
        btn.disabled = true;

        await api(
          '/api/account/topup-requests',
          {
            amount,
            note
          }
        );

        alert(
          'Request top-up berhasil dikirim.'
        );

        showPage('topup');

      } catch (e) {
        alert(
          e.message
        );

      } finally {
        btn.disabled = false;
      }
    };
}


/* =========================================================
   ACCOUNT PAGES
========================================================= */

function showPage(page) {

  /* =======================================================
     SYSTEM DIAGNOSTIC
  ======================================================= */

  if (page === 'diagnostic') {

    $('studio')?.classList.add(
      'hidden'
    );

    $('accountPage')?.classList.remove(
      'hidden'
    );

    $('backToStudio')?.classList.remove(
      'hidden'
    );

    $('pageBack')?.classList.remove(
      'hidden'
    );

    closeMenu();

    const title =
      $('pageTitle');

    const content =
      $('pageContent');

    if (
      !title ||
      !content
    ) {
      return;
    }

    title.textContent =
      'System Diagnostic';

    content.innerHTML = `
      <div class="card">

        <p>
          Pemeriksaan sistem GEN-Z.AI
          tanpa menggunakan Console.
        </p>

        <button
          id="genzDiagnosticRun"
          class="primary"
          type="button"
        >
          PERIKSA SISTEM
        </button>

        <div
          id="genzDiagnosticResults"
          style="margin-top:20px;"
        ></div>

        <pre
          id="genzDiagnosticDetails"
          style="
            display:none;
            margin-top:20px;
            padding:14px;
            background:#0b0b0f;
            border-radius:10px;
            color:#aaa;
            font-size:12px;
            white-space:pre-wrap;
            word-break:break-word;
            overflow:auto;
          "
        ></pre>

      </div>
    `;

    const runButton =
      $('genzDiagnosticRun');

    if (runButton) {

      runButton.addEventListener(
        'click',
        async () => {

          if (
            window.GENZ_DIAGNOSTIC &&
            typeof window.GENZ_DIAGNOSTIC.run ===
              'function'
          ) {

            await window.GENZ_DIAGNOSTIC.run();

          } else {

            const results =
              $('genzDiagnosticResults');

            if (results) {

              results.innerHTML = `
                <div style="
                  padding:14px;
                  border:1px solid #ff5c5c;
                  border-radius:10px;
                  color:#ff5c5c;
                ">
                  System Diagnostic belum siap.
                </div>
              `;
            }
          }
        }
      );
    }

    return;
  }


  /* =======================================================
     ACCOUNT PAGE
  ======================================================= */

  $('studio')?.classList.add(
    'hidden'
  );

  $('accountPage')?.classList.remove(
    'hidden'
  );

  $('backToStudio')?.classList.remove(
    'hidden'
  );

  $('pageBack')?.classList.remove(
    'hidden'
  );

  closeMenu();

  const title =
    $('pageTitle');

  const content =
    $('pageContent');

  if (
    !title ||
    !content
  ) {
    return;
  }

  const email =
    escapeHtml(
      account?.user?.email || ''
    );

  const credits =
    Number(
      account?.credits || 0
    );


  /* =======================================================
     PROFILE
  ======================================================= */

  if (page === 'profile') {

    title.textContent =
      'Profil';

    content.innerHTML = `
      <div class="profile-card">

        <div class="avatar">
          ${
            email.charAt(0)
              .toUpperCase() ||
            'U'
          }
        </div>

        <div>

          <h3>
            ${email}
          </h3>

          <p>
            Akun ${
              account?.isAdmin
                ? 'Administrator'
                : 'User'
            }
          </p>

        </div>

      </div>
    `;

    return;
  }


  /* =======================================================
     CREDIT
  ======================================================= */

  if (page === 'credit') {

    title.textContent =
      'Kredit';

    content.innerHTML = `
      <div class="credit-big">
        ${credits}
        <span>credit</span>
      </div>

      <p>
        Credit digunakan setiap kali
        membuat video. Setiap perubahan
        credit tercatat di riwayat.
      </p>

      <button
        class="primary"
        data-page="topup"
        type="button"
      >
        Top-up Kredit
      </button>

      <div
        id="creditHistory"
        class="credit-history"
      >
        <p>Memuat riwayat...</p>
      </div>
    `;

    const topupButton =
      content.querySelector(
        '[data-page="topup"]'
      );

    if (topupButton) {
      topupButton.onclick =
        () => showPage('topup');
    }

    loadCreditHistory();

    return;
  }


  /* =======================================================
     TOP UP
  ======================================================= */

  if (page === 'topup') {

    title.textContent =
      'Top-up Kredit';

    content.innerHTML = `
      <div class="topup-box">

        <h3>
          Ajukan Top-up
        </h3>

        <p>
          Masukkan jumlah kredit.
          Admin akan memeriksa dan
          menyetujui atau menolak
          permintaan Anda.
        </p>

        <label>
          Jumlah credit

          <input
            id="topupAmount"
            type="number"
            min="1"
            max="1000000"
            step="1"
            placeholder="Contoh: 100"
          >
        </label>

        <label>
          Catatan (opsional)

          <textarea
            id="topupNote"
            maxlength="500"
            placeholder="Keterangan pembayaran atau kebutuhan"
          ></textarea>
        </label>

        <button
          class="primary"
          id="submitTopup"
          type="button"
        >
          Kirim Request Top-up
        </button>

        <div
          id="topupState"
          class="credit-history"
        >
          <p>Memuat request...</p>
        </div>

      </div>
    `;

    loadTopups();

    return;
  }


  /* =======================================================
     CONTACT ADMIN
  ======================================================= */

  if (page === 'contact') {

    title.textContent =
      'Kontak Admin';

    const contact =
      account?.adminContactUrl;

    content.innerHTML =
      contact

        ? `
          <p>
            Gunakan kontak berikut untuk
            bantuan, top-up, atau
            kendala akun.
          </p>

          <a
            class="contact-btn"
            href="${escapeAttr(contact)}"
            target="_blank"
            rel="noopener"
          >
            Hubungi Admin
          </a>
        `

        : `
          <p>
            Kontak admin belum
            dikonfigurasi.
          </p>
        `;

    return;
  }
}


/* =========================================================
   IMAGE UPLOAD
========================================================= */

function setupImageUpload() {

  const input =
    $('image');

  if (!input) return;

  input.onchange =
    event => {

      const file =
        event.target.files?.[0];

      if (!file) {
        imageData = null;
        return;
      }

      if (
        file.size >
        12 * 1024 * 1024
      ) {

        imageData = null;

        if ($('status')) {
          $('status').textContent =
            'Gambar maksimal 12 MB.';
        }

        input.value = '';

        return;
      }

      const reader =
        new FileReader();

      reader.onload =
        () => {
          imageData =
            reader.result;
        };

      reader.onerror =
        () => {

          imageData = null;

          if ($('status')) {
            $('status').textContent =
              'Gagal membaca gambar.';
          }
        };

      reader.readAsDataURL(file);
    };
}


/* =========================================================
   VIDEO GENERATION
========================================================= */

async function generateVideo() {

  const generate =
    $('generate');

  if (!generate) return;

  try {

    generate.disabled = true;

    $('status').textContent =
      'Memulai generation...';

    const idem =
      crypto.randomUUID();

    const d =
      await api(
        '/api/generate',
        {
          provider,

          model:
            $('model')?.value,

          duration:
            $('duration')?.value,

          aspectRatio:
            $('aspect')?.value,

          resolution:
            $('resolution')?.value,

          prompt:
            $('prompt')?.value,

          imageData
        },
        'POST',
        {
          'Idempotency-Key':
            idem
        }
      );

    $('status').textContent =
      'Processing...';

    const id =
      d.externalId;

    if (poll) {
      clearTimeout(poll);
    }


    /* =====================================================
       POLLING
    ===================================================== */

    const run =
      async () => {

        try {

          const s =
            await api(
              '/api/generate/status',
              {
                provider,

                operationName:
                  id,

                taskId:
                  id,

                id
              }
            );


          /* ===============================================
             COMPLETED
          =============================================== */

          if (
            s.status === 'completed' &&
            s.videoUrl
          ) {

            let url =
              s.videoUrl;


            /*
              Video internal API membutuhkan
              Authorization header.
            */

            if (
              url.startsWith(
                '/api/video'
              )
            ) {

              const t =
                await token();

              const r =
                await fetch(
                  url,
                  {
                    headers: {
                      Authorization:
                        `Bearer ${t}`
                    }
                  }
                );

              if (!r.ok) {
                throw Error(
                  'Gagal mengambil file video.'
                );
              }

              const blob =
                await r.blob();

              url =
                URL.createObjectURL(
                  blob
                );
            }


            /* VIDEO PREVIEW */

            const video =
              $('video');

            if (video) {

              video.src =
                url;

              video.classList.remove(
                'hidden'
              );
            }


            /* DOWNLOAD */

            const download =
              $('download');

            if (download) {

              download.href =
                url;

              download.classList.remove(
                'hidden'
              );
            }


            $('status').textContent =
              'Video selesai.';

            generate.disabled =
              false;

            await refresh();

            return;
          }


          /* ===============================================
             FAILED
          =============================================== */

          if (
            s.status === 'failed' ||
            s.status === 'error' ||
            s.status === 'cancelled'
          ) {

            $('status').textContent =
              s.error ||
              s.message ||
              'Generation gagal.';

            generate.disabled =
              false;

            await refresh();

            return;
          }


          /* ===============================================
             STILL PROCESSING
          =============================================== */

          $('status').textContent =
            'Processing...';

          poll =
            setTimeout(
              run,
              7000
            );

        } catch (e) {

          console.error(
            '[GEN-Z.AI] Polling error:',
            e
          );

          $('status').textContent =
            e.message ||
            'Gagal mengecek status video.';

          generate.disabled =
            false;
        }
      };


    run();

  } catch (e) {

    console.error(
      '[GEN-Z.AI] Generation error:',
      e
    );

    $('status').textContent =
      e.message ||
      'Generation gagal.';

    generate.disabled =
      false;
  }
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEvents() {

  /*
    AUTENTIKASI

    Login, register, forgot password,
    dan logout dikelola oleh auth.js.

    Jangan memasang handler auth kedua
    di sini agar satu tombol tidak
    menjalankan dua proses sekaligus.
  */


  /* =======================================================
     ACCOUNT MENU
  ======================================================= */

  $('accountBtn')?.addEventListener(
    'click',
    () => {

      $('accountMenu')?.classList.toggle(
        'hidden'
      );
    }
  );


  /* =======================================================
     ACCOUNT PAGES
  ======================================================= */

  document
    .querySelectorAll(
      '[data-page]'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          const page =
            button.dataset.page;

          if (page) {
            showPage(page);
          }
        }
      );
    });


  /* =======================================================
     ADMIN
  ======================================================= */

  $('adminPanel')?.addEventListener(
    'click',
    () => {

      location.href =
        '/admin.html';
    }
  );


  /* =======================================================
     CONTACT ADMIN
  ======================================================= */

  $('contactAdmin')?.addEventListener(
    'click',
    () => {

      showPage('contact');
    }
  );


  /* =======================================================
     BACK TO STUDIO
  ======================================================= */

  $('backToStudio')?.addEventListener(
    'click',
    showStudio
  );


  $('pageBack')?.addEventListener(
    'click',
    showStudio
  );


  /* =======================================================
     IMAGE
  ======================================================= */

  setupImageUpload();


  /* =======================================================
     GENERATE
  ======================================================= */

  $('generate')?.addEventListener(
    'click',
    generateVideo
  );
}


/* =========================================================
   AUTH EVENTS FROM auth.js
========================================================= */

window.addEventListener(
  'genz-auth-login',
  async () => {

    console.log(
      '[GEN-Z.AI] Login event diterima.'
    );

    /*
      auth.js berhasil login.
      app.js sekarang membaca session
      dari Supabase dan memindahkan UI
      dari Login ke Studio.
    */

    try {

      await refresh();

    } catch (error) {

      console.error(
        '[GEN-Z.AI] Refresh setelah login gagal:',
        error
      );
    }
  }
);


window.addEventListener(
  'genz-auth-logout',
  async () => {

    console.log(
      '[GEN-Z.AI] Logout event diterima.'
    );

    try {

      showStudio();

      await refresh();

    } catch (error) {

      console.error(
        '[GEN-Z.AI] Refresh setelah logout gagal:',
        error
      );
    }
  }
);


/* =========================================================
   SUPABASE AUTH STATE
========================================================= */

function setupAuthStateListener() {

  if (!supabase) {
    return;
  }

  supabase.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      console.log(
        '[GEN-Z.AI] Auth state:',
        event
      );

      /*
        SIGNED_IN:
        tampilkan Studio.

        SIGNED_OUT:
        kembali ke Login.
      */

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {

        await refresh();

      } else if (
        event === 'SIGNED_OUT'
      ) {

        showStudio();

        await refresh();
      }
    }
  );
}


/* =========================================================
   SUPABASE BOOTSTRAP
========================================================= */

async function bootstrap() {

  try {

    /*
      Ambil konfigurasi dari Worker.
    */

    const r =
      await fetch(
        '/api/config',
        {
          cache: 'no-store'
        }
      );

    const c =
      await r.json();


    if (
      !r.ok ||
      !c.supabaseUrl ||
      !c.supabasePublishableKey
    ) {

      throw Error(
        'Konfigurasi Supabase belum lengkap.'
      );
    }


    /*
      Pastikan Supabase library tersedia.
    */

    const supabaseLibrary =
      window.supabaseJs ||
      window.supabase;

    if (
      !supabaseLibrary ||
      typeof supabaseLibrary.createClient !==
        'function'
    ) {

      throw Error(
        'Supabase library belum siap.'
      );
    }


    /*
      Buat satu client Supabase
      untuk seluruh app.js.
    */

    supabase =
      supabaseLibrary.createClient(
        c.supabaseUrl,
        c.supabasePublishableKey
      );


    /*
      Auth state listener.
    */

    setupAuthStateListener();


    /*
      Pasang event Studio.
    */

    setupEvents();


    /*
      Cek session yang sudah ada.
    */

    await refresh();


    /*
      Provider dimuat setelah aplikasi
      siap.
    */

    await loadProviders();


  } catch (e) {

    console.error(
      'GEN-Z.AI bootstrap error:',
      e
    );

    if ($('status')) {
      $('status').textContent =
        e.message;
    }

    if ($('authMsg')) {
      $('authMsg').textContent =
        e.message;
    }
  }
}


/* =========================================================
   START APPLICATION
========================================================= */

bootstrap();
