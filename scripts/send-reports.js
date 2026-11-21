// Assignment Hub progress reports by email.
//   REPORT=week  (Sunday morning)   : this week so far, Monday to Sunday.
//   REPORT=month (1st of the month) : the month that just ended.
// Numbers come from report-core.js, the same code the website's Reports page uses, so email and screen always agree.
// Each student's own history (progress_log) and deadline extensions come from Supabase using the SERVICE key (GitHub secret only).
//
// Privacy: this repo is public, so Actions logs are public. The script therefore logs COUNTS only, never names or addresses,
// and in a dry run it prints only the owner's (MY_EMAIL) own report.
//
// Rules: only students with report emails switched on, and only those who have used the tracker at least once.
// Each report is sent once per period (remembered in the period_reports table). Test modes (DRY_RUN / ONLY_ME) record nothing.
const fs = require("fs"), path = require("path"), vm = require("vm");
const RC = require("../report-core.js");

const SITE_URL = "https://neotahiro.github.io/assignment-hub/";
const COLORS = { acc: "#4a6b6a", bad: "#b42318", warn: "#b54708", mute: "#78716c", ink: "#292524", bg: "#f5f5f4", line: "#e7e5e4" };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtTime = t => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const short = (t, n = 90) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const dayFmt = d => RC.fmtDay(d, { weekday: "short", month: "short", day: "numeric" });
const dueText = it => "Due " + dayFmt(it.due) + (it.time ? ", " + fmtTime(it.time) : "") + (it.origDue ? " (extended from " + RC.fmtDay(it.origDue, { month: "short", day: "numeric" }) + ")" : "");

function loadData(root) {
  const src = fs.readFileSync(path.join(root, "data.js"), "utf8");
  return vm.runInNewContext(src + "\n;({ SUBJECTS, GENERAL: typeof GENERAL !== 'undefined' ? GENERAL : [], SEMESTERS: typeof SEMESTERS !== 'undefined' ? SEMESTERS : [] })");
}

// ---------- the email ----------
function buildEmail({ name, r, kind, siteUrl = SITE_URL }) {
  const p = r.period, first = (name || "").trim().split(/\s+/)[0] || "there";
  const monthName = RC.fmtDay(p.start, { month: "long", year: "numeric" });
  const when = kind === "month" ? "in " + monthName : "this week";
  const subject = kind === "month" ? `Your ${monthName} report` : `Your weekly report: ${r.label}`;
  const intro = kind === "month" ? `Here is how ${monthName} went.` : `Here is your week so far (${r.label}).`;
  const head = RC.summary(r, when);
  const n = r.done.length, overdueCap = kind === "month" ? "overdue at month end" : "overdue now";
  const best = r.days.reduce((a, d) => (d.count > a.count ? d : a), { count: 0 });
  const busiest = best.count >= 2 ? `Busiest day: ${dayFmt(best.date)} (${best.count} items finished).` : "";
  const older = r.overdue.filter(x => !r.due.missed.some(m => m.id === x.id));
  const horizon = kind === "month" ? "30" : "7";
  const sections = [
    ["Finished", r.done, x => `${short(x.title)} · ${x.subj} · ${RC.fmtStamp(x.at, { weekday: "short", month: "short", day: "numeric" })}${x.onTime ? "" : " · late"}`, C => C.acc],
    ["Due " + when + " and not finished", r.due.missed, x => `${short(x.title)} · ${x.subj} · ${dueText(x)}`, C => C.bad],
    ["Still ahead this week", r.due.ahead, x => `${short(x.title)} · ${x.subj} · ${dueText(x)}`, C => C.warn],
    ["Overdue from earlier", older, x => `${short(x.title)} · ${x.subj} · ${dueText(x)}`, C => C.bad],
    [`Coming up in the next ${horizon} days`, r.upcoming, x => `${short(x.title)} · ${x.subj} · ${dueText(x)}`, C => C.mute]
  ].filter(s => s[1].length);
  const CAP = 10;
  const link = siteUrl + "#/app/reports";

  const text = `Hi ${first},\n\n${intro}\n\n${head}${busiest ? "\n" + busiest : ""}\n\n` +
    `Finished: ${n} (on time: ${r.onTime})\nDue items finished: ${r.due.done} of ${r.due.total}\n${kind === "month" ? "Overdue at month end" : "Overdue now"}: ${r.overdue.length}\n\n` +
    sections.map(([t, list, line]) => t.toUpperCase() + ` (${list.length})\n` + list.slice(0, CAP).map(x => "- " + line(x)).join("\n") + (list.length > CAP ? `\n  and ${list.length - CAP} more` : "")).join("\n\n") +
    `\n\nSee your full report: ${link}\n\nYou can switch these emails off on the Reports page of My Hub, or reply to this email.\n`;

  const cell = (v, l, color) => `<td style="padding:.6em .5em;border:1px solid ${COLORS.line};border-radius:8px;background:#fff;text-align:center;width:25%"><div style="font-size:1.5em;font-weight:700;color:${color || COLORS.ink}">${esc(v)}</div><div style="font-size:.75em;color:${COLORS.mute}">${esc(l)}</div></td>`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:${COLORS.ink}"><p>Hi ${esc(first)},</p><p>${esc(intro)}</p>` +
    `<p style="font-size:1.1em;margin:.6em 0"><b>${esc(head)}</b>${busiest ? `<br><span style="color:${COLORS.mute};font-size:.85em">${esc(busiest)}</span>` : ""}</p>` +
    `<table role="presentation" width="100%" cellspacing="6" cellpadding="0" style="margin:.5em -6px"><tr>${cell(n, "finished")}${cell(n ? r.onTime + "/" + n : "–", "on time")}${cell(r.due.done + "/" + r.due.total, "due items finished")}${cell(r.overdue.length, overdueCap, r.overdue.length ? COLORS.bad : COLORS.ink)}</tr></table>` +
    sections.map(([t, list, line, color]) => `<p style="margin:1.3em 0 .3em;font-weight:700;letter-spacing:.03em;color:${color(COLORS)}">${esc(t.toUpperCase())} (${list.length})</p>` +
      list.slice(0, CAP).map(x => `<div style="margin:.35em 0;padding:.45em .8em;border-left:3px solid ${color(COLORS)};background:${COLORS.bg}">${esc(line(x))}</div>`).join("") +
      (list.length > CAP ? `<div style="color:${COLORS.mute};font-size:.85em">and ${list.length - CAP} more</div>` : "")).join("") +
    `<p style="margin:1.6em 0"><a href="${esc(link)}" style="display:inline-block;padding:.5em 1.2em;background:${COLORS.acc};color:#fff;border-radius:8px;text-decoration:none">See your full report</a></p>` +
    `<p style="color:${COLORS.mute};font-size:.85em">You can switch these emails off on the Reports page of My Hub, or reply to this email.</p></div>`;
  return { subject, text, html };
}

// ---------- Supabase (REST, service key) ----------
function supabase(env, fetchFn) {
  const base = (env.SUPABASE_URL || "").replace(/\/+$/, ""), key = env.SUPABASE_SERVICE_KEY || "";
  const headers = { apikey: key, "Content-Type": "application/json" };
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key;       // legacy JWT keys also go in Authorization; new sb_secret_ keys use apikey only
  const call = async (url, opts) => {
    const res = await fetchFn(url, { ...opts, headers: { ...headers, ...(opts && opts.headers) } });
    if (!res.ok) throw new Error(`Supabase answered ${res.status} (${(await res.text()).slice(0, 120)})`);
    return res;
  };
  return {
    async getAll(table, query) {                                             // the server returns at most 1000 rows per request
      const out = [];
      for (let off = 0; off < 200000; off += 1000) {
        const rows = await (await call(`${base}/rest/v1/${table}?${query}&limit=1000&offset=${off}`)).json();
        out.push(...rows); if (rows.length < 1000) break;
      }
      return out;
    },
    async upsert(table, rows, conflict) {
      await call(`${base}/rest/v1/${table}?on_conflict=${conflict}`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
    }
  };
}

// ---------- main ----------
async function run(opts = {}) {
  const env = opts.env || process.env, log = opts.log || console, root = opts.root || path.join(__dirname, "..");
  const fetchFn = opts.fetchFn || fetch;
  const kind = env.REPORT === "month" ? "month" : "week";
  const DRY = env.DRY_RUN === "true", ONLY_ME = env.ONLY_ME === "true", TEST = DRY || ONLY_ME;
  const owner = (env.MY_EMAIL || "").trim().toLowerCase();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) { log.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY."); return { code: 1 }; }
  if (ONLY_ME && !owner) { log.error("ONLY_ME needs MY_EMAIL."); return { code: 1 }; }

  const data = loadData(root), db = supabase(env, fetchFn);
  const today = env.TODAY_OVERRIDE || RC.todayYMD();
  const nowMs = env.TODAY_OVERRIDE ? Date.parse(today + "T07:00:00+05:45") : Date.now();
  const p = kind === "month" ? RC.shift(RC.period("month", today), -1) : RC.period("week", today);
  const baseItems = RC.buildItems(data, p.end < today ? p.end : today);
  log.log(`Report: ${kind}. Period: ${RC.label(p)}. Today (Nepal): ${today}.${TEST ? " TEST MODE: nothing is recorded." : ""}`);

  let profiles = await db.getAll("profiles", "select=id,email,name,email_reports&email_reports=eq.true");
  if (ONLY_ME) profiles = profiles.filter(x => (x.email || "").toLowerCase() === owner);
  const history = await db.getAll("progress_log", "select=user_id,assignment_id,new_status,changed_at");
  const extRows = await db.getAll("assignment_progress", "select=user_id,assignment_id,personal_due&personal_due=not.is.null");
  const already = TEST || env.FORCE === "true" ? new Set()
    : new Set((await db.getAll("period_reports", `select=user_id&period=eq.${kind}&period_start=eq.${p.start}&emailed_at=not.is.null`)).map(x => x.user_id));

  const by = (rows) => { const m = new Map(); rows.forEach(r => { if (!m.has(r.user_id)) m.set(r.user_id, []); m.get(r.user_id).push(r); }); return m; };
  const logBy = by(history), extBy = by(extRows);

  const jobs = []; let skippedOff = 0, skippedNew = 0, skippedSent = 0, skippedEmpty = 0;
  for (const u of profiles) {
    const rows = logBy.get(u.id) || [];
    if (!rows.length) { skippedNew++; continue; }                            // never used the tracker
    if (already.has(u.id)) { skippedSent++; continue; }
    const ext = new Map((extBy.get(u.id) || []).map(x => [x.assignment_id, x.personal_due]));
    const r = RC.compute(RC.applyExtensions(baseItems, id => ext.get(id)), rows, p, nowMs);
    if (!r.done.length && !r.due.total && !r.overdue.length && !r.upcoming.length) { skippedEmpty++; continue; }
    jobs.push({ u, r, mail: buildEmail({ name: u.name, r, kind }) });
  }
  log.log(`Students with report emails on: ${profiles.length}. To send: ${jobs.length}. Skipped: ${skippedNew} not started, ${skippedSent} already sent, ${skippedEmpty} nothing to report.`);

  if (DRY) {
    const mine = jobs.find(j => (j.u.email || "").toLowerCase() === owner);
    if (mine) log.log("\nYour own report would read:\n\nSubject: " + mine.mail.subject + "\n\n" + mine.mail.text);
    else log.log("\n(No preview: the owner account has nothing to send this period.)");
    if (opts.previewDir) { fs.mkdirSync(opts.previewDir, { recursive: true }); jobs.forEach((j, i) => fs.writeFileSync(path.join(opts.previewDir, `report-${i + 1}.html`), j.mail.html)); }
    return { code: 0, wouldSend: jobs.length, jobs };
  }
  if (!jobs.length) { log.log("Nothing to send."); return { code: 0, sent: 0, failed: 0 }; }

  const user = env.GMAIL_USER, pass = env.GMAIL_APP_PASSWORD;
  if (!user || !pass) { log.error("Missing GMAIL_USER or GMAIL_APP_PASSWORD."); return { code: 1 }; }
  const transporter = opts.transporter || require("nodemailer").createTransport({ service: "gmail", auth: { user, pass } });
  let ok = 0, failed = 0;
  for (const j of jobs) {                                                    // one email per person, so addresses stay private
    try {
      await transporter.sendMail({ from: `"Assignment Hub" <${user}>`, to: j.u.email, replyTo: env.REPLY_TO || undefined, subject: j.mail.subject, text: j.mail.text, html: j.mail.html });
      ok++; log.log("Sent to recipient");
    } catch (e) { failed++; log.error("Failed for one recipient:", e.message); continue; }
    if (!TEST) {
      try {
        const r = j.r;
        await db.upsert("period_reports", [{ user_id: j.u.id, period: kind, period_start: p.start, period_end: p.end, emailed_at: new Date().toISOString(),
          stats: { finished: r.done.length, onTime: r.onTime, dueTotal: r.due.total, dueDone: r.due.done, overdue: r.overdue.length, upcoming: r.upcoming.length, prevFinished: r.prevDone } }], "user_id,period,period_start");
      } catch (e) { failed++; log.error("WARNING: email went out but could not be recorded (it may repeat on a re-run):", e.message); }
    }
  }
  log.log(`Done. ${ok} sent, ${failed} failed.`);
  return { code: failed ? 1 : 0, sent: ok, failed };
}

module.exports = { run, buildEmail, dueText };
if (require.main === module) run({ previewDir: process.env.PREVIEW_DIR || undefined }).then(r => process.exit(r.code)).catch(e => { console.error("Report run failed:", e.message); process.exit(1); });
