/* Initializes Supabase client and exposes connection status for the app. */
(function () {
  const cfg = window.JUST_SAY_SUPABASE_CONFIG || {};
  const status = {
    configured: Boolean(cfg.url && cfg.publishableKey &&
      !cfg.publishableKey.includes("PASTE_YOUR")),
    client: null,
    error: null
  };
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    status.error = "Supabase JS library did not load.";
  } else if (!status.configured) {
    status.error = "Paste your publishable key in supabase-config.js.";
  } else {
    try {
      status.client = window.supabase.createClient(cfg.url, cfg.publishableKey);
    } catch (e) {
      status.error = e.message || "Could not initialize Supabase.";
    }
  }
  window.JUST_SAY_DB = status;
  window.addEventListener("DOMContentLoaded", function () {
    const badge = document.getElementById("supabase-connection-status");
    if (!badge) return;
    if (status.client) {
      badge.textContent = "Supabase client configured (database access still requires RLS policies)";
      badge.className = "notice";
    } else {
      badge.textContent = "Supabase not configured: " + status.error;
      badge.className = "notice";
    }
  });
})();
