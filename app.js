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
  const rd = a.kind === "reading";
  if (st === "submitted") return (rd ? "Read" : "Submitted") + (d ? " · " + d : "");
  if (st === "closed") return "Closed · no due date";
  if (st === "missed") return rd ? `Past due · ${d}` : `<span class="bad">Missed</span> · ${d}`;
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
  const rd = a.kind === "reading", st = status(a);
  const cls = rd && st === "missed" ? "past" : st, dim = cls === "submitted" || cls === "closed" || cls === "past" ? " dim" : "";
  const title = a.link ? `<a class="t" data-kind="${rd ? "reading" : "assignment"}" href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.title)}</a>` : `<span class="t">${esc(a.title)}</span>`;
  return `<div class="item ${cls}${dim}" ${heat ? heatStyle(a) : ""}>
    <span>${rd ? '<span class="tag">Reading</span>' : ""}${title}<br><span class="m">${subjName ? esc(subjName) + " · " : ""}${dueLabel(a)}</span></span></div>`;
}
function linkRow(x) {
  const title = x.link ? `<a class="t" href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : `<span class="t">${esc(x.title)}</span>`;
  return `<div class="item">${title}</div>`;
}

// ---- Semesters ----
const semOf = s => s.semester || 1;
const SEMS = (typeof SEMESTERS !== "undefined" && SEMESTERS.length) ? SEMESTERS : [{ id: 1, name: "Semester 1", start: "0000-01-01" }];
const semName = n => (SEMS.find(x => x.id === n) || {}).name || "Semester " + n;
const subjectsOf = n => SUBJECTS.filter(s => semOf(s) === n);
const hasSubjects = n => subjectsOf(n).length > 0;
const isoToday = () => { const t = new Date(); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };
// Current = latest semester whose start date has passed AND that has at least one subject (safety rule).
const currentSem = () => {
  const ok = SEMS.filter(x => x.start <= isoToday() && hasSubjects(x.id)).sort((a, b) => a.start.localeCompare(b.start));
  return ok.length ? ok[ok.length - 1].id : (SEMS.find(x => hasSubjects(x.id)) || SEMS[0]).id;
};
const pastSems = cur => SEMS.filter(x => x.id !== cur && x.start <= isoToday() && hasSubjects(x.id));
const modCount = s => s.modules || (typeof MODULE_COUNT !== "undefined" ? MODULE_COUNT : 5);
let viewSem = 1;

function dashboard() {
  // Assignments always show while upcoming; readings only if they have a due date within 7 days.
  const all = SUBJECTS.flatMap(s => [
    ...s.assignments.map(a => ({ ...a, kind: "assignment", subj: s.name, sid: s.id })),
    ...s.readings.filter(r => r.due).map(r => ({ ...r, kind: "reading", subj: s.name, sid: s.id }))
  ]).concat((typeof GENERAL !== "undefined" ? GENERAL : []).map(a => ({ ...a, kind: "assignment", subj: "General", sid: "general" })));
  const upcoming = all.filter(a => status(a) === "upcoming" && (a.kind === "assignment" || daysLeft(a.due) <= 7)).sort((x, y) => dueAt(x) - dueAt(y));
  const week = upcoming.filter(a => daysLeft(a.due) <= 7).length;
  const cur = currentSem(), past = pastSems(cur);
  const sw = past.length ? `<div class="sem">${past.map(x => `<a href="#/semester/${x.id}">${esc(x.name)} ▸</a>`).join("")}</div>` : "";
  $app.innerHTML = `<div class="head"><div><h1>${upcoming.length} upcoming</h1>
    <p class="sub">${esc(semName(cur))} · ${week} due within 7 days</p></div>${sw}</div>
    <h2>Upcoming</h2>
    ${upcoming.map(a => assignmentRow(a, a.subj, true)).join("") || '<p class="empty">Nothing upcoming.</p>'}
    <h2>Subjects</h2>
    <div class="grid">${subjectsOf(cur).map(s => {
      const p = upcoming.filter(a => a.sid === s.id).length;
      return `<a class="subj" href="#/subject/${s.id}"><b>${esc(s.name)}</b><span class="m">${p} upcoming</span></a>`;
    }).join("")}</div>`;
}

function semesterPage(n) {
  const cur = currentSem();
  $app.innerHTML = `<div class="head"><div><h1>${esc(semName(n))}</h1>
    <p class="sub">Archived · <a href="#/">← Back to ${esc(semName(cur))}</a></p></div></div>
    <div class="grid">${subjectsOf(n).map(s => {
      const p = s.assignments.filter(a => status(a) === "upcoming").length;
      return `<a class="subj" href="#/subject/${s.id}"><b>${esc(s.name)}</b><span class="m">${p} upcoming</span></a>`;
    }).join("")}</div>`;
}

function subjectPage(id) {
  const s = SUBJECTS.find(x => x.id === id);
  if (!s) { $app.innerHTML = '<h1>Not found</h1><p><a href="#/">Back to dashboard</a></p>'; return; }
  const sn = semOf(s), isCur = sn === currentSem();
  let html = `<h1>${esc(s.name)}</h1><p class="sub"><a href="${isCur ? "#/" : "#/semester/" + sn}">← ${isCur ? "Dashboard" : esc(semName(sn))}</a> · ${esc(semName(sn))}</p>`;
  const openMod = Number(sessionStorageGet("open-" + id)) || 0;
  for (let m = 1; m <= modCount(s); m++) {
    const A = s.assignments.filter(x => x.module === m).sort((x, y) => dueAt(x) - dueAt(y));
    const R = s.readings.filter(x => x.module === m), N = s.notes.filter(x => x.module === m);
    const up = A.filter(a => status(a) === "upcoming").length;
    const sec = (label, items, fn) => `<h3>${label}</h3>${items.length ? items.map(fn).join("") : '<p class="empty">None yet</p>'}`;
    html += `<details data-mod="${m}" ${m === openMod ? "open" : ""}><summary>Module ${m}<span class="m">${up ? up + " upcoming" : ""}</span></summary>
      <div class="body">${sec("Assignments", A, a => assignmentRow(a, ""))}${sec("Reading list", R, r => r.due ? assignmentRow({ ...r, kind: "reading" }, "") : linkRow(r))}${sec("Lecture notes", N, x => `<a class="link" href="${esc(x.link)}" target="_blank" rel="noopener">📄 ${esc(x.title)}</a>`)}</div></details>`;
  }
  $app.innerHTML = html;
  $app.querySelectorAll("details").forEach(d => d.addEventListener("toggle", () => { if (d.open) sessionStorageSet("open-" + id, d.dataset.mod); }));
}
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

// GoatCounter (cookie-free analytics). Safe if the script is blocked or still loading.
function track(path, title, event, tries = 0) {
  try {
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: !!event });
    else if (tries < 10) setTimeout(() => track(path, title, event, tries + 1), 500);
  } catch (e) {}
}
$app.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a[href^='http']");
  if (!a) return;
  track("click-" + (a.dataset.kind || (a.classList.contains("link") ? "note" : "reading")) + "-s" + viewSem, a.textContent.trim().slice(0, 100), true);
});

function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const ms = h.match(/^subject\/(.+)$/), mm = h.match(/^semester\/(\d+)$/);
  const cur = currentSem();
  let sem = cur;
  if (ms) { const sj = SUBJECTS.find(x => x.id === ms[1]); if (sj) sem = semOf(sj); }
  else if (mm && Number(mm[1]) !== cur && hasSubjects(Number(mm[1]))) sem = Number(mm[1]);
  viewSem = sem;
  $nav.innerHTML = subjectsOf(sem).map(s => `<a href="#/subject/${s.id}" class="${ms && ms[1] === s.id ? "on" : ""}">${esc(s.name)}</a>`).join("");
  ms ? subjectPage(ms[1]) : sem !== cur ? semesterPage(sem) : dashboard();
  const subj = ms && SUBJECTS.find(x => x.id === ms[1]);
  if (subj) track(location.pathname + "#/sem" + sem + "/subject/" + subj.id, "Sem " + sem + " · " + subj.name);
  else if (sem !== cur) track(location.pathname + "#/sem" + sem, semName(sem) + " (archive)");
  else track(location.pathname, "Dashboard · " + semName(cur));
}
addEventListener("hashchange", route);
route();
