// Student accounts: Google sign-in through Supabase.
// The publishable key is meant to be public; Row Level Security in the database protects the data.
// If Supabase fails to load, Auth.available is false and the public board works exactly as before.
const SUPABASE_URL = "https://wthblpmzroyyfwrxslac.supabase.co";
const SUPABASE_KEY = "sb_publishable_O5UPb3XWoiD2epU2eM6oiw_jBglo6rv";

const Auth = (() => {
  const AFTER_LOGIN = "ah-after-login";
  let client = null, session = null, profile = null, isReady = false;
  const listeners = [];
  const notify = () => listeners.forEach(fn => { try { fn(); } catch (e) {} });
  const store = {
    get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  async function loadProfile() {
    profile = null;
    if (!client || !session) return;
    try {
      const { data, error } = await client.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (error) throw error;
      profile = data;
    } catch (e) { console.warn("profile load failed", e); }
    if (!profile) {
      const m = session.user.user_metadata || {};
      profile = { id: session.user.id, email: session.user.email, name: m.full_name || m.name || session.user.email, role: "student" };
    }
  }

  // PKCE returns ?code=... in the query string, so it never clashes with the #/hash router.
  function stripAuthParams() {
    const u = new URL(location.href);
    if (!u.searchParams.has("code") && !u.searchParams.has("error")) return;
    ["code", "error", "error_code", "error_description"].forEach(k => u.searchParams.delete(k));
    history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
  }

  const available = !!(window.supabase && window.supabase.createClient);
  if (available) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });
    // Supabase re-announces "signed in" on tab refocus and token refresh. Only re-render the app when
    // who is signed in (or their role/name) really changed, so a half-typed note is never wiped.
    let lastKey = null;
    const keyOf = () => (session ? session.user.id : "") + "|" + (profile ? profile.role + "|" + profile.name : "");
    client.auth.onAuthStateChange((event, s) => {
      if (event === "INITIAL_SESSION") return;
      session = s;
      // Defer: calling Supabase inside this callback can deadlock.
      setTimeout(async () => { await loadProfile(); const k = keyOf(); if (k !== lastKey) { lastKey = k; notify(); } }, 0);
    });
    (async () => {
      try {
        const { data } = await client.auth.getSession();
        session = data.session;
        await loadProfile();
        stripAuthParams();
        if (session && store.get(AFTER_LOGIN)) { const to = store.get(AFTER_LOGIN); store.del(AFTER_LOGIN); location.hash = to; }
      } catch (e) { console.warn("auth init failed", e); }
      isReady = true;
      lastKey = keyOf();
      notify();
    })();
  }

  return {
    available,
    isReady: () => isReady,
    user: () => (session ? session.user : null),
    profile: () => profile,
    isAdmin: () => !!(profile && profile.role === "admin"),
    client: () => client,
    onChange: fn => listeners.push(fn),
    signIn: async () => {
      if (!client) return;
      store.set(AFTER_LOGIN, "#/app/dashboard");
      const redirectTo = location.origin + location.pathname.replace(/index\.html$/, "");
      await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo, queryParams: { prompt: "select_account" } } });
    },
    signOut: async () => { if (client) await client.auth.signOut(); location.hash = "#/"; }
  };
})();
