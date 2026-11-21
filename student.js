// Student area (#/app/...): shell, shared helpers. Individual pages live in student-pages.js.
const STUDENT_PAGES = [
  ["dashboard", "My Dashboard"], ["assignments", "My Assignments"], ["calendar", "My Calendar"],
  ["notes", "My Notes"], ["priorities", "My Priorities"], ["history", "My Progress History"], ["reports", "Weekly Reports"]
];
const StudentPages = {};   // key -> async (bodyEl, isStale) => renders into bodyEl
let stToken = 0;           // bumped on every navigation so slow requests can't draw over a newer page

function authNav(h) {
  if (!Auth.available || !Auth.isReady()) return "";
  const on = /^app(\/|$)/.test(h) ? "on" : "";
  return Auth.user() ? `<a href="#/app/dashboard" class="${on}">My Hub</a>` : `<a href="#/app" class="${on}">Sign in</a>`;
}

function signInPage() {
  $app.innerHTML = `<h1>My Hub</h1><p class="sub">Sign in to track your own progress, notes and weekly reports. The public board needs no account.</p>
    <div class="st-card"><button class="st-btn" data-auth="in">Sign in with Google</button></div>`;
}

// ---- shared helpers ----
// Everything trackable from data.js: assignments, readings that have a due date, and GENERAL items.
function studentItems() {
  const out = [], cur = currentSem();
  const add = (a, kind, subj, sid, sem) => out.push({ ...a, kind, subj, sid, sem });
  SUBJECTS.forEach(s => {
    (s.assignments || []).forEach(a => add(a, "assignment", s.name, s.id, semOf(s)));
    (s.readings || []).filter(r => r.due).forEach(r => add(r, "reading", s.name, s.id, semOf(s)));
  });
  if (typeof GENERAL !== "undefined") GENERAL.forEach(a => add(a, "assignment", "General", "general", cur));
  return out;
}
const stStatus = (prog, id) => (prog.get(id) || {}).status || "todo";
const stPrio = (prog, id) => (prog.get(id) || {}).priority || 0;
const stOverdue = (it, prog) => stStatus(prog, it.id) !== "done" && !!it.due && dueAt(it) < new Date();
const stShort = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function stSelect(field, cur, options) {
  return `<select class="st-sel" data-f="${field}" aria-label="${field === "status" ? "Status" : "Priority"}">`
    + options.map(([v, l]) => `<option value="${v}"${String(v) === String(cur) ? " selected" : ""}>${l}</option>`).join("") + "</select>";
}
function stRow(it, prog, controls = true) {
  const s = stStatus(prog, it.id), p = stPrio(prog, it.id), row = prog.get(it.id), rd = it.kind === "reading";
  const when = s === "done" ? "Done" + (row && row.completed_at ? " · " + stShort(row.completed_at) : "") : dueLabel({ ...it, done: false });
  const title = /^https?:\/\//i.test(it.link || "")
    ? `<a class="t" href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.title)}</a>` : `<span class="t">${esc(it.title)}</span>`;
  const ctl = controls ? `<span class="st-ctl">${stSelect("status", s, [["todo", "To do"], ["doing", "In progress"], ["done", "Done"]])}`
    + `${stSelect("priority", p, [[0, "No priority"], [1, "Low priority"], [2, "Medium priority"], [3, "High priority"]])}</span>` : "";
  return `<div class="item st-item p${p}${s === "done" ? " st-done" : stOverdue(it, prog) ? " st-over" : ""}" data-id="${esc(it.id)}">`
    + `<span class="st-main">${rd ? '<span class="tag">Reading</span>' : ""}${title}<br><span class="m">${esc(it.subj)} · ${when}</span></span>${ctl}</div>`;
}

let stFlashTimer;
function flash(body, msg, bad) {
  const el = body.querySelector(".st-msg"); if (!el) return;
  el.textContent = msg; el.className = "st-msg" + (bad ? " bad" : "");
  clearTimeout(stFlashTimer);
  if (!bad && msg) stFlashTimer = setTimeout(() => { el.textContent = ""; }, 1800);
}

// Status/priority dropdowns: save immediately, update the screen first, undo if the save fails.
function stWire(body, prog, redraw) {
  body.addEventListener("change", async e => {
    const el = e.target.closest && e.target.closest(".st-sel[data-f]"); if (!el) return;
    const rowEl = el.closest("[data-id]"); if (!rowEl) return;
    const id = rowEl.dataset.id, f = el.dataset.f, val = f === "priority" ? Number(el.value) : el.value;
    const before = prog.get(id);
    const next = { ...(before || { assignment_id: id, status: "todo", priority: 0 }), [f]: val };
    if (f === "status") next.completed_at = val === "done" ? new Date().toISOString() : null;
    prog.set(id, next); redraw(); flash(body, "Saving…");
    const refocus = () => { const n = body.querySelector(`[data-id="${CSS.escape(id)}"] [data-f="${f}"]`); if (n) n.focus(); };
    refocus();
    try { prog.set(id, await Store.progress.set(id, { [f]: val })); flash(body, "Saved"); }
    catch (err) { before ? prog.set(id, before) : prog.delete(id); redraw(); refocus(); flash(body, "Couldn't save: " + err.message, true); }
  });
}

async function studentRoute(h) {
  if (!Auth.available) { $app.innerHTML = `<h1>My Hub</h1><p class="sub">Student accounts are unavailable right now. The public board still works.</p>`; return; }
  if (!Auth.isReady()) { $app.innerHTML = `<p class="sub">Loading…</p>`; return; }
  if (!Auth.user()) { signInPage(); return; }

  const pages = Auth.isAdmin() ? STUDENT_PAGES.concat([["admin", "Admin"]]) : STUDENT_PAGES;
  const key = h.split("/")[1] || "dashboard";
  const page = pages.find(x => x[0] === key) || pages[0];
  const tabs = pages.map(([k, label]) => `<a href="#/app/${k}" class="${k === page[0] ? "on" : ""}">${esc(label)}</a>`).join("");
  $app.innerHTML = `<h1>${esc(page[1])}</h1><div class="st-tabs">${tabs}</div><div id="st-body"><p class="sub">Loading…</p></div>`
    + `<p class="st-foot"><button class="st-btn st-quiet" data-auth="out">Sign out</button></p>`;
  const body = $app.querySelector("#st-body"), token = ++stToken, stale = () => token !== stToken;
  const render = StudentPages[page[0]];
  if (!render) { body.innerHTML = `<p class="sub">${esc(page[1])} is coming soon.</p>`; return; }
  try { await render(body, stale, h.split("/")[2]); }
  catch (err) { if (!stale()) body.innerHTML = `<p class="st-err">Couldn't load this page: ${esc(err.message)}. Try refreshing.</p>`; }
}

document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-auth]");
  if (!b) return;
  b.dataset.auth === "in" ? Auth.signIn() : Auth.signOut();
});
