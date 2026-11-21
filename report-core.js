// Report maths, shared by the website (Reports page) and the email job (Node). No DOM, no Supabase.
// Everything is in Nepal time (UTC+05:45, no daylight saving) so "Sunday" and "end of month" mean the same to everyone.
// Weeks run Monday-Sunday; months are calendar months.
(function (root) {
  const TZ_MIN = 345, DAY = 864e5, TZ = "Asia/Kathmandu";
  const pad = n => String(n).padStart(2, "0");
  const fmtYMD = ms => { const d = new Date(ms); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); };
  const ymdMs = s => Date.parse(s + "T00:00:00Z");                                   // calendar-date arithmetic, done in UTC
  const addDays = (ymd, n) => fmtYMD(ymdMs(ymd) + n * DAY);
  const localYMD = ts => fmtYMD(new Date(ts).getTime() + TZ_MIN * 60000);            // the date it was in Nepal at that instant
  const todayYMD = () => localYMD(Date.now());
  const wallMs = (ymd, hm) => Date.parse(ymd + "T" + (hm || "00:00") + ":00+05:45"); // Nepal wall-clock time -> instant
  const mk = (type, start, end) => ({ type, start, end });

  function period(type, ymd) {                                                       // the week/month that contains ymd
    const ms = ymdMs(ymd);
    if (type === "week") { const s = ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY; return mk("week", fmtYMD(s), fmtYMD(s + 6 * DAY)); }
    const d = new Date(ms);
    return mk("month", fmtYMD(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), fmtYMD(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
  }
  function shift(p, k) {                                                             // k periods later (negative = earlier)
    if (p.type === "week") return period("week", addDays(p.start, 7 * k));
    const d = new Date(ymdMs(p.start));
    return period("month", fmtYMD(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1)));
  }
  const fmtDay = (ymd, o) => new Date(ymdMs(ymd)).toLocaleDateString("en-US", { timeZone: "UTC", ...o });
  const label = p => p.type === "month" ? fmtDay(p.start, { month: "long", year: "numeric" })
    : fmtDay(p.start, { month: "short", day: "numeric" }) + " – " + fmtDay(p.end, { month: "short", day: "numeric", year: "numeric" });
  const fmtStamp = (ts, o) => new Date(ts).toLocaleString("en-US", { timeZone: TZ, ...o });

  // A student's effective deadline = the LATER of the class deadline and their own extension (never earlier).
  // Dates are "YYYY-MM-DD" strings, so plain string comparison is correct.
  const effDue = (due, personal) => (due && personal && personal > due) ? personal : due;
  // ext: a function id -> date, a Map, or a plain object. Extended items get due = new date and origDue = class deadline.
  function applyExtensions(items, ext) {
    const get = typeof ext === "function" ? ext : ext instanceof Map ? (id => ext.get(id)) : (id => (ext || {})[id]);
    return items.map(it => { const d = effDue(it.due, get(it.id)); return d === it.due ? it : { ...it, due: d, origDue: it.due }; });
  }

  // Trackable items (assignments + readings with a due date + GENERAL) in the semester that contains ymd.
  function buildItems(data, ymd) {
    const sems = data.SEMESTERS && data.SEMESTERS.length ? data.SEMESTERS : [{ id: 1, start: "0000-01-01" }];
    const semOf = s => s.semester || 1, has = n => data.SUBJECTS.some(s => semOf(s) === n);
    const ok = sems.filter(x => x.start <= ymd && has(x.id)).sort((a, b) => a.start.localeCompare(b.start));
    const sem = ok.length ? ok[ok.length - 1].id : (sems.find(x => has(x.id)) || sems[0]).id;
    const out = [], add = (a, kind, subj) => out.push({ id: a.id, title: a.title, subj, kind, due: a.due || null, time: a.time || null });
    data.SUBJECTS.filter(s => semOf(s) === sem).forEach(s => {
      (s.assignments || []).forEach(a => add(a, "assignment", s.name));
      (s.readings || []).filter(r => r.due).forEach(r => add(r, "reading", s.name));
    });
    (data.GENERAL || []).forEach(a => add(a, "assignment", "General"));
    return out;
  }

  // items: from buildItems | log: rows {assignment_id, new_status, changed_at} | p: a period | now: ms (default: now)
  function compute(items, log, p, now) {
    now = now == null ? Date.now() : now;
    const startMs = wallMs(p.start), endMs = wallMs(addDays(p.end, 1)) - 1, asOf = Math.min(endMs, now);
    const ev = new Map();
    log.forEach(r => { if (!ev.has(r.assignment_id)) ev.set(r.assignment_id, []); ev.get(r.assignment_id).push({ t: Date.parse(r.changed_at), s: r.new_status }); });
    ev.forEach(a => a.sort((x, y) => x.t - y.t));
    const statusAt = (id, T) => { let s = "todo"; for (const e of ev.get(id) || []) { if (e.t <= T) s = e.s; else break; } return s; };
    const dueMs = it => wallMs(it.due, it.time || "23:59");
    const doneIn = (a, b) => items.flatMap(it => {                                  // finished during [a, b]; last "done" event wins
      const d = (ev.get(it.id) || []).filter(e => e.s === "done" && e.t >= a && e.t <= b);
      return d.length ? [{ ...it, at: d[d.length - 1].t, onTime: !it.due || d[d.length - 1].t <= dueMs(it) }] : [];
    });
    const byDue = (x, y) => (x.due || "").localeCompare(y.due || "") || (x.time || "").localeCompare(y.time || "");
    const done = doneIn(startMs, endMs).sort((x, y) => x.at - y.at);
    const dueIn = items.filter(it => it.due && it.due >= p.start && it.due <= p.end);
    const notDone = it => statusAt(it.id, asOf) !== "done";
    const prev = shift(p, -1), prevDone = doneIn(wallMs(prev.start), wallMs(addDays(prev.end, 1)) - 1).length;
    const days = []; for (let d = p.start; d <= p.end; d = addDays(d, 1)) days.push({ date: d, count: 0 });
    done.forEach(x => { const d = days.find(y => y.date === localYMD(x.at)); if (d) d.count++; });
    const horizon = addDays(p.end, p.type === "week" ? 7 : 30);
    return {
      period: p, label: label(p), inProgress: now < endMs, asOf,
      done, onTime: done.filter(x => x.onTime).length,
      due: { total: dueIn.length, done: dueIn.filter(it => !notDone(it)).length,
             missed: dueIn.filter(it => notDone(it) && dueMs(it) <= asOf).sort(byDue),
             ahead: dueIn.filter(it => notDone(it) && dueMs(it) > asOf).sort(byDue) },
      overdue: items.filter(it => it.due && dueMs(it) <= asOf && notDone(it)).sort(byDue),
      upcoming: items.filter(it => it.due && it.due > p.end && it.due <= horizon && notDone(it)).sort(byDue),
      prevDone, prevLabel: label(prev), days
    };
  }

  // One-sentence headline, used by the Reports page and the emails so they always read the same. `when`: "this week", "in November"...
  function summary(r, when) {
    const n = r.done.length, diff = n - r.prevDone, prev = "previous " + r.period.type;
    const delta = diff > 0 ? `▲ ${diff} more than the ${prev}` : diff < 0 ? `▼ ${-diff} fewer than the ${prev}` : `same as the ${prev}`;
    return n ? `You finished ${n} item${n === 1 ? "" : "s"} ${when}${r.onTime === n ? ", all on time" : ""}. ${delta[0].toUpperCase() + delta.slice(1)}.` : `No items finished ${when}.`;
  }

  const api = { period, shift, label, buildItems, compute, summary, effDue, applyExtensions, todayYMD, localYMD, addDays, fmtDay, fmtStamp, TZ };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ReportCore = api;
})(typeof window !== "undefined" ? window : globalThis);
