const $app = document.getElementById("app"), $nav = document.getElementById("nav");
const KEY = "assignment-hub-done";
let done = {};
try { done = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt = s => parse(s).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const daysLeft = s => Math.round((parse(s) - today()) / 864e5);

const dueAt = a => { const d = parse(a.due); if (a.time) { const [h, m] = a.time.split(":").map(Number); d.setHours(h, m); } else d.setHours(23, 59); return d; };
const fmtTime = t => { const [h, m] = t.split(":").map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); };
function dueLabel(a) {
  const n = daysLeft(a.due), t = a.time ? ", " + fmtTime(a.time) : "";
  if (dueAt(a) < new Date()) return `<span class="bad">Overdue</span> · ${fmt(a.due)}${t}`;
  if (n === 0) return `<span class="warn">Due today${t}</span>`;
  if (n === 1) return `<span class="warn">Due tomorrow${t}</span>`;
  return `Due ${fmt(a.due)}${t} (${n} days)`;
}
function assignmentRow(a, subjName, box = true) {
  const n = daysLeft(a.due), cls = done[a.id] ? "done" : dueAt(a) < new Date() ? "overdue" : n <= 2 ? "soon" : "";
  return `<div class="item ${cls}">${box ? `<input type="checkbox" data-id="${a.id}" ${done[a.id] ? "checked" : ""}>` : ""}
    <span><span class="t">${esc(a.title)}</span><br><span class="m">${subjName ? esc(subjName) + " · " : ""}${dueLabel(a)}</span></span></div>`;
}
function linkRow(x) {
  const title = x.link ? `<a class="t" href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : `<span class="t">${esc(x.title)}</span>`;
  return `<div class="item">${title}</div>`;
}

function dashboard() {
  const all = SUBJECTS.flatMap(s => s.assignments.map(a => ({ ...a, subj: s.name })));
  const pending = all.filter(a => !done[a.id]).sort((x, y) => dueAt(x) - dueAt(y));
  const week = pending.filter(a => daysLeft(a.due) <= 7).length;
  $app.innerHTML = `<h1>${pending.length} pending</h1>
    <p class="sub">${week} due within 7 days · ${all.length - pending.length} of ${all.length} assignments done</p>
    <h2>Pending assignments</h2>
    ${pending.map(a => assignmentRow(a, a.subj)).join("") || '<p class="empty">Nothing pending. Nice.</p>'}
    <h2>Subjects</h2>
    <div class="grid">${SUBJECTS.map(s => {
      const p = s.assignments.filter(a => !done[a.id]).length;
      return `<a class="subj" href="#/subject/${s.id}"><b>${esc(s.name)}</b><span class="m">${p} pending assignment${p === 1 ? "" : "s"}</span></a>`;
    }).join("")}</div>`;
}

function subjectPage(id) {
  const s = SUBJECTS.find(x => x.id === id);
  if (!s) { $app.innerHTML = '<h1>Not found</h1><p><a href="#/">Back to dashboard</a></p>'; return; }
  let html = `<h1>${esc(s.name)}</h1><p class="sub"><a href="#/">← Dashboard</a></p>`;
  const openMod = Number(sessionStorageGet("open-" + id)) || 0;
  for (let m = 1; m <= MODULE_COUNT; m++) {
    const A = s.assignments.filter(x => x.module === m).sort((x, y) => dueAt(x) - dueAt(y));
    const R = s.readings.filter(x => x.module === m), N = s.notes.filter(x => x.module === m);
    const pend = A.filter(a => !done[a.id]).length;
    const sec = (label, items, fn) => `<h3>${label}</h3>${items.length ? items.map(fn).join("") : '<p class="empty">None yet</p>'}`;
    html += `<details data-mod="${m}" ${m === openMod ? "open" : ""}><summary>Module ${m}<span class="m">${pend ? pend + " pending" : A.length ? "all done" : ""}</span></summary>
      <div class="body">${sec("Assignments", A, a => assignmentRow(a, "", false))}${sec("Reading list", R, linkRow)}${sec("Lecture notes", N, x => `<a class="link" href="${esc(x.link)}" target="_blank" rel="noopener">📄 ${esc(x.title)}</a>`)}</div></details>`;
  }
  $app.innerHTML = html;
  $app.querySelectorAll("details").forEach(d => d.addEventListener("toggle", () => { if (d.open) sessionStorageSet("open-" + id, d.dataset.mod); }));
}
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const m = h.match(/^subject\/(.+)$/);
  $nav.innerHTML = SUBJECTS.map(s => `<a href="#/subject/${s.id}" class="${m && m[1] === s.id ? "on" : ""}">${esc(s.name)}</a>`).join("");
  m ? subjectPage(m[1]) : dashboard();
}
$app.addEventListener("change", e => {
  if (!e.target.dataset.id) return;
  done[e.target.dataset.id] = e.target.checked || undefined;
  if (!e.target.checked) delete done[e.target.dataset.id];
  save();
  const open = [...document.querySelectorAll("details[open]")].map(d => d.dataset.mod);
  const y = scrollY; route();
  open.forEach(m => { const d = document.querySelector(`details[data-mod="${m}"]`); if (d) d.open = true; });
  scrollTo(0, y);
});
addEventListener("hashchange", route);
route();
