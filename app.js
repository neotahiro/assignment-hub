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
  const mail = a.email ? ` <a class="mail" data-kind="email" data-title="${esc(a.title.slice(0, 80))}" href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=${encodeURIComponent(a.email)}" target="_blank" rel="noopener" title="Email ${esc(a.email)}" aria-label="Email this assignment">✉ Email</a>` : "";
  return `<div class="item ${cls}${dim}" ${heat ? heatStyle(a) : ""}>
    <span>${rd ? '<span class="tag">Reading</span>' : ""}${title}${mail}<br><span class="m">${subjName ? esc(subjName) + " · " : ""}${dueLabel(a)}</span></span></div>`;
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

// ---- Notices ----
const NOTICE_LIST = (typeof NOTICES !== "undefined" ? NOTICES : []).filter(n => n && n.id && n.title);
const posted = n => !n.date || n.date <= isoToday();
const isActive = n => posted(n) && (!(n.until || n.on) || (n.until || n.on) >= isoToday());   // no until/on = stays until you set one
const byNewest = (a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (b.date || "").localeCompare(a.date || "");
function noticeCard(n, full) {
  const long = !full && (n.text || "").length > 220, l = /^https?:\/\//i.test(n.link || "") ? n.link : "";
  return `<div class="notice${n.urgent ? " urgent" : ""}${full && !isActive(n) ? " old" : ""}">
    <div class="nt">${n.pin ? "📌 " : ""}${esc(n.title)}${n.urgent ? ' <span class="tag bad">Urgent</span>' : ""}</div>
    ${n.text ? `<p class="ntx${long ? " clamp" : ""}">${esc(n.text)}</p>` : ""}
    <div class="m">${n.date ? "Posted " + fmt(n.date) : ""}${n.on ? " · For " + fmt(n.on) : ""}${l ? ` · <a data-kind="notice" data-title="${esc(n.title)}" href="${esc(l)}" target="_blank" rel="noopener">Open details →</a>` : ""}${long ? ' · <a href="#/notices">Read all</a>' : ""}</div></div>`;
}
function noticeBanner() {
  const act = NOTICE_LIST.filter(isActive).sort(byNewest);
  if (!act.length) return "";
  return `<section class="notices">${act.slice(0, 3).map(n => noticeCard(n)).join("")}${act.length > 3 ? `<a class="more" href="#/notices">and ${act.length - 3} more notice${act.length === 4 ? "" : "s"} →</a>` : ""}</section>`;
}
function noticesPage() {
  const all = NOTICE_LIST.filter(posted).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const semOfDate = d => { const z = SEMS.filter(x => x.start <= (d || "")).sort((a, b) => a.start.localeCompare(b.start)); return z.length ? z[z.length - 1].id : SEMS[0].id; };
  const groups = [...new Set(all.map(n => semOfDate(n.date)))].sort((a, b) => b - a);
  $app.innerHTML = `<h1>Notices</h1><p class="sub"><a href="#/">← Dashboard</a></p>` +
    (groups.map(g => `<h2>${esc(semName(g))}</h2>` + all.filter(n => semOfDate(n.date) === g).map(n => noticeCard(n, true)).join("")).join("") || '<p class="empty">No notices yet.</p>');
}
// Urgent notices pop up once per device: 5 seconds, with a shrinking bar. Pauses while touched or hovered.
function urgentPopup() {
  let seen = []; try { seen = JSON.parse(localStorage.getItem("ah-seen") || "[]"); } catch (e) {}
  const q = NOTICE_LIST.filter(n => n.urgent && isActive(n) && !seen.includes(n.id));
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const next = () => {
    const n = q.shift(); if (!n) return;
    seen.push(n.id); try { localStorage.setItem("ah-seen", JSON.stringify(seen)); } catch (e) {}
    const o = document.createElement("div"); o.className = "ov"; o.setAttribute("role", "alertdialog"); o.setAttribute("aria-label", "Urgent notice");
    o.innerHTML = `<div class="pop">${noticeCard(n)}${reduce ? "" : '<div class="bar"><i></i></div>'}<button class="btn" type="button">Close</button></div>`;
    document.body.appendChild(o);
    const bar = o.querySelector(".bar i"), pop = o.querySelector(".pop"); let left = 5000, t0, timer;
    const close = () => { clearTimeout(timer); o.remove(); next(); };
    const run = () => { t0 = Date.now(); if (bar) { bar.style.transition = `width ${left}ms linear`; bar.style.width = "0%"; } timer = setTimeout(close, left); };
    const pause = () => { clearTimeout(timer); left -= Date.now() - t0; if (bar) { bar.style.transition = "none"; bar.style.width = Math.max(0, left / 50) + "%"; } };
    o.querySelector("button").onclick = close;
    if (!reduce) { ["mouseenter", "touchstart"].forEach(ev => pop.addEventListener(ev, pause)); ["mouseleave", "touchend"].forEach(ev => pop.addEventListener(ev, () => { if (left > 0) run(); })); setTimeout(run, 30); }
    o.querySelector("button").focus();
  };
  next();
}

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
  $app.innerHTML = noticeBanner() + `<div class="head"><div><h1>${upcoming.length} upcoming</h1>
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
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a[href^='http']");
  if (!a) return;
  track("click-" + (a.dataset.kind || (a.classList.contains("link") ? "note" : "reading")) + "-s" + viewSem, (a.dataset.title || a.textContent).trim().slice(0, 100), true);
});

function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const ms = h.match(/^subject\/(.+)$/), mm = h.match(/^semester\/(\d+)$/);
  const cur = currentSem();
  let sem = cur;
  if (ms) { const sj = SUBJECTS.find(x => x.id === ms[1]); if (sj) sem = semOf(sj); }
  else if (mm && Number(mm[1]) !== cur && hasSubjects(Number(mm[1]))) sem = Number(mm[1]);
  viewSem = sem;
  $nav.innerHTML = subjectsOf(sem).map(s => `<a href="#/subject/${s.id}" class="${ms && ms[1] === s.id ? "on" : ""}">${esc(s.name)}</a>`).join("") + `<a href="#/notices" class="${h === "notices" ? "on" : ""}">Notices</a>`;
  const isN = h === "notices";
  ms ? subjectPage(ms[1]) : isN ? noticesPage() : sem !== cur ? semesterPage(sem) : dashboard();
  const subj = ms && SUBJECTS.find(x => x.id === ms[1]);
  if (subj) track(location.pathname + "#/sem" + sem + "/subject/" + subj.id, "Sem " + sem + " · " + subj.name);
  else if (isN) track(location.pathname + "#/notices", "Notices");
  else if (sem !== cur) track(location.pathname + "#/sem" + sem, semName(sem) + " (archive)");
  else track(location.pathname, "Dashboard · " + semName(cur));
}
addEventListener("hashchange", route);
route();
urgentPopup();
