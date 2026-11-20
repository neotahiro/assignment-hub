// Student area (#/app/...). Phase 1 = sign-in + page skeleton; each page is filled in by later phases.
const STUDENT_PAGES = [
  ["dashboard", "My Dashboard"], ["assignments", "My Assignments"], ["calendar", "My Calendar"],
  ["notes", "My Notes"], ["priorities", "My Priorities"], ["history", "My Progress History"], ["reports", "Weekly Reports"]
];

function authNav(h) {
  if (!Auth.available || !Auth.isReady()) return "";
  const on = /^app(\/|$)/.test(h) ? "on" : "";
  return Auth.user() ? `<a href="#/app/dashboard" class="${on}">My Hub</a>` : `<a href="#/app" class="${on}">Sign in</a>`;
}

function signInPage() {
  $app.innerHTML = `<h1>My Hub</h1><p class="sub">Sign in to track your own progress, notes and weekly reports. The public board needs no account.</p>
    <div class="st-card"><button class="st-btn" data-auth="in">Sign in with Google</button></div>`;
}

function studentPlaceholder(title) {
  return `<p class="sub">${esc(title)} is coming soon.</p>`;
}

function studentDashboard() {
  const p = Auth.profile() || {};
  return `<p class="sub">Welcome back, ${esc(p.name || "student")}.</p>
    <div class="st-card"><div class="t">Account</div><div class="m">${esc(p.email || "")} · ${esc(p.role || "student")}</div></div>`;
}

function studentRoute(h) {
  if (!Auth.available) { $app.innerHTML = `<h1>My Hub</h1><p class="sub">Student accounts are unavailable right now. The public board still works.</p>`; return; }
  if (!Auth.isReady()) { $app.innerHTML = `<p class="sub">Loading…</p>`; return; }
  if (!Auth.user()) { signInPage(); return; }

  const pages = Auth.isAdmin() ? STUDENT_PAGES.concat([["admin", "Admin"]]) : STUDENT_PAGES;
  const key = h.split("/")[1] || "dashboard";
  const page = pages.find(x => x[0] === key) || pages[0];
  const tabs = pages.map(([k, label]) => `<a href="#/app/${k}" class="${k === page[0] ? "on" : ""}">${esc(label)}</a>`).join("");
  $app.innerHTML = `<h1>${esc(page[1])}</h1><div class="st-tabs">${tabs}</div>`
    + (page[0] === "dashboard" ? studentDashboard() : studentPlaceholder(page[1]))
    + `<p><button class="st-btn st-quiet" data-auth="out">Sign out</button></p>`;
}

document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-auth]");
  if (!b) return;
  b.dataset.auth === "in" ? Auth.signIn() : Auth.signOut();
});
