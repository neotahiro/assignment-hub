// Sends deadline reminder emails (7 days before, 2 days before, and on the day).
// Reads data.js, so your deadlines only ever live in one place.
//
// Who gets what:
//   - Items inside a course            -> everyone by default.  Add  notify: "me"  to send only to you.
//   - Items in the GENERAL list        -> only you by default.  Add  notify: "all" to send to everyone.
//   - Any value other than "all"       -> treated as "me" (a typo can never email the class by mistake).
// Your own address comes from the MY_EMAIL secret. Items marked done are never sent.
const fs = require("fs"), path = require("path"), vm = require("vm");

// ===== Settings you may want to change =====
const TZ = "Asia/Kathmandu";       // time zone used to decide what "today" is
const REMIND_DAYS = [7, 2, 0];     // days before the deadline to send a reminder
const SITE_URL = "https://neotahiro.github.io/assignment-hub/";
// ===========================================

const DRY = process.env.DRY_RUN === "true";
const src = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const { SUBJECTS, GENERAL } = vm.runInNewContext(src + "\n;({ SUBJECTS, GENERAL: typeof GENERAL !== 'undefined' ? GENERAL : [] })");

const todayStr = process.env.TODAY_OVERRIDE || new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const dayNum = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const fmtDate = s => new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = t => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const short = t => (t.length > 160 ? t.slice(0, 157) + "…" : t);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const audienceOf = (i, dflt) => i.notify === undefined ? dflt : (String(i.notify).trim().toLowerCase() === "all" ? "all" : "me");

const items = [];
for (const s of SUBJECTS) {
  for (const a of s.assignments || []) items.push({ ...a, type: "Assignment", course: s.name, audience: audienceOf(a, "all") });
  for (const r of s.readings || []) items.push({ ...r, type: "Reading", course: s.name, audience: audienceOf(r, "all") });
}
for (const g of GENERAL || []) items.push({ ...g, type: "Assignment", course: "General", audience: audienceOf(g, "me") });

const due = items
  .filter(i => i.due && i.done !== true)
  .map(i => ({ ...i, left: dayNum(i.due) - dayNum(todayStr) }))
  .filter(i => REMIND_DAYS.includes(i.left))
  .sort((a, b) => a.left - b.left || (a.time || "23:59").localeCompare(b.time || "23:59"));

const forClass = due.filter(i => i.audience === "all");
console.log(`Today (${TZ}): ${todayStr}. Due soon: ${due.length} (${forClass.length} for everyone, ${due.length - forClass.length} only for you)`);
if (!due.length) process.exit(0);

const heading = n => (n === 0 ? "DUE TODAY" : `DUE IN ${n} DAYS`);
const when = i => fmtDate(i.due) + (i.time ? ", " + fmtTime(i.time) : "");

function buildMessage(list, forOwner) {
  const groups = [...new Set(list.map(i => i.left))].map(n => ({ n, list: list.filter(i => i.left === n) }));
  const tag = i => (forOwner && i.audience === "me" ? " · only you" : "");
  const text = "Hi,\n\nHere are the upcoming deadlines:\n\n" +
    groups.map(g => heading(g.n) + "\n" + g.list.map(i =>
      `- [${i.type}] ${short(i.title)}\n  ${i.course} · ${when(i)}${tag(i)}${i.link ? "\n  " + i.link : ""}`).join("\n")).join("\n\n") +
    `\n\nSee everything on the hub: ${SITE_URL}\n\nYou're getting this because you agreed to deadline reminders. Reply to this email to stop them.\n`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#292524">
<p>Hi,</p><p>Here are the upcoming deadlines:</p>` +
    groups.map(g => `<p style="margin:1.2em 0 .3em;font-weight:700;letter-spacing:.04em;color:${g.n === 0 ? "#b42318" : "#4a6b6a"}">${heading(g.n)}</p>` +
      g.list.map(i => `<div style="margin:.4em 0;padding:.5em .8em;border-left:3px solid ${g.n === 0 ? "#b42318" : "#dbe2e8"};background:#f5f5f4">
<b>[${i.type}]</b> ${i.link ? `<a href="${esc(i.link)}">${esc(short(i.title))}</a>` : esc(short(i.title))}<br>
<span style="color:#78716c">${esc(i.course)} · ${esc(when(i))}${tag(i)}</span></div>`).join("")).join("") +
    `<p><a href="${SITE_URL}">Open the Assignment Hub</a></p>
<p style="color:#78716c;font-size:.85em">You're getting this because you agreed to deadline reminders. Reply to this email to stop them.</p></div>`;
  const subject = `Assignment Hub: ${list.length} upcoming deadline${list.length === 1 ? "" : "s"}`;
  return { subject, text, html };
}

const owner = (process.env.MY_EMAIL || "").trim();
const all = (process.env.RECIPIENTS || "").split(/[,\s;]+/).filter(Boolean);
const classmates = all.filter(e => e.toLowerCase() !== owner.toLowerCase());   // you get one combined email, never two

if (!owner && due.length > forClass.length) console.warn(`MY_EMAIL is not set, so ${due.length - forClass.length} personal reminder(s) were skipped (they are never sent to the class).`);

if (DRY) {
  console.log(`\nDRY RUN\nClassmates (${classmates.length} people) would get ${forClass.length} item(s):`);
  forClass.forEach(i => console.log(`  - ${short(i.title)} (${i.course}, ${heading(i.left).toLowerCase()})`));
  if (owner) { console.log(`\nYou (${due.length} item${due.length === 1 ? "" : "s"}, including personal ones):\n`); console.log(buildMessage(due, true).text); }
  process.exit(0);
}

const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
if (!user || !pass || !(classmates.length || owner)) { console.error("Missing GMAIL_USER, GMAIL_APP_PASSWORD, or recipients (RECIPIENTS / MY_EMAIL)."); process.exit(1); }

(async () => {
  const transporter = require("nodemailer").createTransport({ service: "gmail", auth: { user, pass } });
  const jobs = [];
  if (forClass.length) { const m = buildMessage(forClass, false); classmates.forEach(to => jobs.push({ to, m })); }
  if (owner) jobs.push({ to: owner, m: buildMessage(due, true) });
  let failed = 0;
  for (const { to, m } of jobs) {           // one email per person, so addresses stay private
    try {
      await transporter.sendMail({ from: `"Assignment Hub" <${user}>`, to, replyTo: process.env.REPLY_TO || undefined, subject: m.subject, text: m.text, html: m.html });
      console.log("Sent to recipient");
    } catch (e) { failed++; console.error("Failed for one recipient:", e.message); }
  }
  console.log(`Done. ${jobs.length - failed} sent, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
})();
