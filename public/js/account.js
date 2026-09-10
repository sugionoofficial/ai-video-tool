"use strict";

/*
============================================================
GEN-Z.AI ACCOUNT SYSTEM
============================================================

Fungsi:
- Register
- Login
- Logout
- Forgot Password
- Update Password
- Session management
- User/Admin role
- Proteksi admin.html

API KEY PROVIDER TIDAK DISIMPAN DI BROWSER.
============================================================
*/

(function () {

  const config = window.AIVideoConfig || {};

  if (!window.supabase) {
    console.error("Supabase JS belum dimuat.");
    return;
  }

  if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) {
    console.error("Konfigurasi Supabase belum lengkap.");
    return;
  }

  const supabaseClient = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  let currentUser = null;
  let currentRole = "user";

  /*
  ==========================================================
  UTILITY
  ==========================================================
  */

  function showMessage(message, type = "info") {

    let box = document.getElementById("accountMessage");

    if (!box) {

      box = document.createElement("div");

      box.id = "accountMessage";

      Object.assign(box.style, {
        position: "fixed",
        left: "50%",
        bottom: "24px",
        transform: "translateX(-50%)",
        zIndex: "999999",
        padding: "12px 18px",
        borderRadius: "10px",
        background: "#111827",
        color: "#ffffff",
        fontSize: "14px",
        maxWidth: "90%",
        textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,.25)"
      });

      document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "error") {
      box.style.background = "#991b1b";
    } else if (type === "success") {
      box.style.background = "#166534";
    } else {
      box.style.background = "#111827";
    }

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
      if (box) box.remove();
    }, 4500);
  }


  function getRedirectUrl(path) {

    if (!path) {
      return window.location.origin + "/";
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return window.location.origin + path;
  }


  /*
  ==========================================================
  LOAD ROLE
  ==========================================================
  */

  async function loadUserRole(user) {

    currentRole = "user";

    if (!user) {
      return "user";
    }

    try {

      const { data, error } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {

        console.warn(
          "Role user tidak dapat dibaca:",
          error.message
        );

        return "user";
      }

      if (data && data.role === "admin") {
        currentRole = "admin";
      }

      return currentRole;

    } catch (error) {

      console.warn(
        "Pemeriksaan role gagal:",
        error
      );

      return "user";
    }
  }


  /*
  ==========================================================
  REFRESH SESSION
  ==========================================================
  */

  async function refreshSession() {

    try {

      const {
        data: { session },
        error
      } = await supabaseClient.auth.getSession();

      if (error) {
        throw error;
      }

      currentUser = session
        ? session.user
        : null;

      if (currentUser) {
        await loadUserRole(currentUser);
      } else {
        currentRole = "user";
      }

      updateAccountUI();

      return currentUser;

    } catch (error) {

      console.error(
        "Gagal membaca session:",
        error
      );

      currentUser = null;
      currentRole = "user";

      updateAccountUI();

      return null;
    }
  }


  /*
  ==========================================================
  REGISTER
  ==========================================================
  */

  async function register(email, password) {

    email = String(email || "")
      .trim()
      .toLowerCase();

    password = String(password || "");

    if (!email) {
      throw new Error("Email wajib diisi.");
    }

    if (!password) {
      throw new Error("Password wajib diisi.");
    }

    if (password.length < 6) {
      throw new Error(
        "Password minimal 6 karakter."
      );
    }

    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            getRedirectUrl("/")
        }
      });

    if (error) {
      throw error;
    }

    currentUser = data.user || null;

    if (currentUser) {
      await loadUserRole(currentUser);
    }

    updateAccountUI();

    return data;
  }


  /*
  ==========================================================
  LOGIN
  ==========================================================
  */

  async function login(email, password) {

    email = String(email || "")
      .trim()
      .toLowerCase();

    password = String(password || "");

    if (!email) {
      throw new Error("Email wajib diisi.");
    }

    if (!password) {
      throw new Error("Password wajib diisi.");
    }

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    currentUser = data.user;

    await loadUserRole(currentUser);

    updateAccountUI();

    return {
      user: currentUser,
      role: currentRole
    };
  }


  /*
  ==========================================================
  LOGOUT
  ==========================================================
  */

  async function logout() {

    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    currentUser = null;
    currentRole = "user";

    updateAccountUI();

    window.location.href = "/";
  }


  /*
  ==========================================================
  FORGOT PASSWORD
  ==========================================================
  */

  async function forgotPassword(email) {

    email = String(email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      throw new Error("Email wajib diisi.");
    }

    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            getRedirectUrl(
              "/reset-password.html"
            )
        }
      );

    if (error) {
      throw error;
    }

    return true;
  }


  /*
  ==========================================================
  UPDATE PASSWORD
  ==========================================================
  */

  async function updatePassword(newPassword) {

    newPassword =
      String(newPassword || "");

    if (newPassword.length < 6) {
      throw new Error(
        "Password minimal 6 karakter."
      );
    }

    const { data, error } =
      await supabaseClient.auth.updateUser({
        password: newPassword
      });

    if (error) {
      throw error;
    }

    return data;
  }


  /*
  ==========================================================
  ADMIN CHECK
  ==========================================================
  */

  async function checkAdmin() {

    if (!currentUser) {
      await refreshSession();
    }

    if (!currentUser) {
      return false;
    }

    await loadUserRole(currentUser);

    return currentRole === "admin";
  }


  /*
  ==========================================================
  PROTECT ADMIN PAGE
  ==========================================================
  */

  async function protectAdminPage() {

    const admin = await checkAdmin();

    if (admin) {
      return true;
    }

    document.body.innerHTML = `
      <div style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#0f172a;
        color:#fff;
        font-family:Arial,sans-serif;
        padding:24px;
        text-align:center;
      ">

        <div>

          <h1 style="
            margin:0 0 12px;
            font-size:30px;
          ">
            Akses Ditolak
          </h1>

          <p style="
            color:#cbd5e1;
            line-height:1.6;
            margin:0 0 24px;
          ">
            Halaman ini hanya dapat diakses
            oleh administrator GEN-Z.AI.
          </p>

          <button
            onclick="window.location.href='/'"
            style="
              border:0;
              border-radius:8px;
              padding:12px 20px;
              cursor:pointer;
              font-weight:600;
            "
          >
            Kembali ke Generator
          </button>

        </div>

      </div>
    `;

    return false;
  }


  /*
  ==========================================================
  ACCOUNT UI
  ==========================================================
  */

  function updateAccountUI() {

    const email =
      document.getElementById(
        "accountEmail"
      );

    if (email) {
      email.textContent =
        currentUser
          ? currentUser.email
          : "";
    }


    const role =
      document.getElementById(
        "accountRole"
      );

    if (role) {

      role.textContent =
        currentRole === "admin"
          ? "ADMIN"
          : "USER";
    }


    const adminLink =
      document.getElementById(
        "adminPanelLink"
      );

    if (adminLink) {

      adminLink.style.display =
        currentRole === "admin"
          ? ""
          : "none";
    }


    const logout =
      document.getElementById(
        "accountLogout"
      );

    if (logout) {

      logout.style.display =
        currentUser
          ? ""
          : "none";
    }


    document.body.dataset.authenticated =
      currentUser
        ? "true"
        : "false";

    document.body.dataset.role =
      currentRole;
  }


  /*
  ==========================================================
  SUPABASE AUTH LISTENER
  ==========================================================
  */

  supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

      currentUser =
        session
          ? session.user
          : null;

      if (currentUser) {
        await loadUserRole(currentUser);
      } else {
        currentRole = "user";
      }

      updateAccountUI();

      console.log(
        "GEN-Z.AI Auth:",
        event,
        currentUser
          ? currentUser.email
          : "not logged in",
        currentRole
      );
    }
  );


  /*
  ==========================================================
  PUBLIC API
  ==========================================================
  */

  window.GENZAccount = {

    getUser() {
      return currentUser;
    },

    getRole() {
      return currentRole;
    },

    isAuthenticated() {
      return !!currentUser;
    },

    isAdmin() {
      return currentRole === "admin";
    },

    getSupabase() {
      return supabaseClient;
    },

    register,

    login,

    logout,

    forgotPassword,

    updatePassword,

    checkAdmin,

    protectAdminPage,

    refreshSession,

    showMessage

  };


  /*
  ==========================================================
  INITIALIZATION
  ==========================================================
  */

  async function init() {

    await refreshSession();

    const isAdminPage =
      window.location.pathname
        .toLowerCase()
        .endsWith("/admin.html");

    if (isAdminPage) {
      await protectAdminPage();
    }

    console.log(
      "GEN-Z.AI Account System initialized."
    );
  }


  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();
  }

})();
