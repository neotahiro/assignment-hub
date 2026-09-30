const $app = document.getElementById("app"), $nav = document.getElementById("nav");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt = s => parse(s).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtTime = t => { const [h, m] = t.split(":").map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); };
const daysLeft = s => s ? Math.round((parse(s) - today()) / 864e5) : 9999;
const dueAt = a => { if (!a.due) return new Date(8e15); const d = parse(a.due); if (a.time) { const [h, m] = a.time.split(":").map(Number); d.setHours(h, m); } else d.setHours(23, 59); return d; };
const timeText = a => a.time ? ", " + fmtTime(a.time) : "";

// submitted = done:true in data.js | closed = no due date | missed = past due | upcoming = still ahead
const status = a => a.done === true ? "submitted" : !a.due ? "closed" : dueAt(a) < new Date() ? "missed" : "upcoming";

function dueLabel(a) {
  const st = status(a), d = a.due ? fmt(a.due) + timeText(a) : "";
  if (st === "submitted") return "Submitted" + (d ? " · " + d : "");
  if (st === "closed") return "Closed · no due date";
  if (st === "missed") return `<span class="bad">Missed</span> · ${d}`;
  const n = daysLeft(a.due);
  if (n === 0) return `<span class="warn">Due today${timeText(a)}</span>`;
  if (n === 1) return `<span class="warn">Due tomorrow${timeText(a)}</span>`;
  return `Due ${d} (${n} days)`;
}
// Redder the closer the deadline: neutral 14+ days away, strongest at the deadline.
function heatStyle(a) {
  const t = Math.min(1, Math.max(0, 1 - (dueAt(a) - new Date()) / 36e5 / 336));
  return `style="background:color-mix(in srgb, var(--bad) ${Math.round(4 + 18 * t)}%, var(--card));border-left-color:color-mix(in srgb, var(--bad) ${Math.round(15 + 85 * t)}%, var(--line))"`;
}
function assignmentRow(a, subjName, heat = false) {
  const st = status(a), dim = st === "submitted" || st === "closed" ? " dim" : "";
  return `<div class="item ${st}${dim}" ${heat ? heatStyle(a) : ""}>
    <span><span class="t">${esc(a.title)}</span><br><span class="m">${subjName ? esc(subjName) + " · " : ""}${dueLabel(a)}</span></span></div>`;
}
function linkRow(x) {
  const title = x.link ? `<a class="t" href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : `<span class="t">${esc(x.title)}</span>`;
  return `<div class="item">${title}</div>`;
}

function dashboard() {
  const all = SUBJECTS.flatMap(s => s.assignments.map(a => ({ ...a, subj: s.name })));
  const upcoming = all.filter(a => status(a) === "upcoming").sort((x, y) => dueAt(x) - dueAt(y));
  const week = upcoming.filter(a => daysLeft(a.due) <= 7).length;
  $app.innerHTML = `<h1>${upcoming.length} upcoming</h1>
    <p class="sub">${week} due within 7 days</p>
    <h2>Upcoming assignments</h2>
    ${upcoming.map(a => assignmentRow(a, a.subj, true)).join("") || '<p class="empty">Nothing upcoming.</p>'}
    <h2>Subjects</h2>
    <div class="grid">${SUBJECTS.map(s => {
      const p = s.assignments.filter(a => status(a) === "upcoming").length;
      return `<a class="subj" href="#/subject/${s.id}"><b>${esc(s.name)}</b><span class="m">${p} upcoming assignment${p === 1 ? "" : "s"}</span></a>`;
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
    const up = A.filter(a => status(a) === "upcoming").length;
    const sec = (label, items, fn) => `<h3>${label}</h3>${items.length ? items.map(fn).join("") : '<p class="empty">None yet</p>'}`;
    html += `<details data-mod="${m}" ${m === openMod ? "open" : ""}><summary>Module ${m}<span class="m">${up ? up + " upcoming" : ""}</span></summary>
      <div class="body">${sec("Assignments", A, a => assignmentRow(a, ""))}${sec("Reading list", R, linkRow)}${sec("Lecture notes", N, x => `<a class="link" href="${esc(x.link)}" target="_blank" rel="noopener">📄 ${esc(x.title)}</a>`)}</div></details>`;
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
addEventListener("hashchange", route);
route();
