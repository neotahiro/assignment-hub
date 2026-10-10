// Sends deadline reminder emails (7 days before, 2 days before, and on the day).
// Reads data.js, so the deadlines only ever live in one place.
// Covers assignments and readings that have a due date. The GENERAL list is never included.
const fs = require("fs"), path = require("path"), vm = require("vm");

// ===== Settings that may be changed =====
const TZ = "Asia/Kathmandu";       // time zone used to decide what "today" is
const REMIND_DAYS = [7, 2, 0];     // days before the deadline to send a reminder
const SITE_URL = "https://neotahiro.github.io/assignment-hub/";
// ===========================================

const DRY = process.env.DRY_RUN === "true";
const src = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const { SUBJECTS } = vm.runInNewContext(src + "\n;({ SUBJECTS })");

const todayStr = process.env.TODAY_OVERRIDE || new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const dayNum = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const fmtDate = s => new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = t => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const short = t => (t.length > 160 ? t.slice(0, 157) + "…" : t);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const items = [];
for (const s of SUBJECTS) {
  for (const a of s.assignments || []) items.push({ ...a, type: "Assignment", course: s.name });
  for (const r of s.readings || []) items.push({ ...r, type: "Reading", course: s.name });
}
const due = items
  .filter(i => i.due && i.done !== true)
  .map(i => ({ ...i, left: dayNum(i.due) - dayNum(todayStr) }))
  .filter(i => REMIND_DAYS.includes(i.left))
  .sort((a, b) => a.left - b.left || (a.time || "23:59").localeCompare(b.time || "23:59"));

console.log(`Today (${TZ}): ${todayStr}. Items to remind about: ${due.length}`);
if (!due.length) process.exit(0);

const heading = n => (n === 0 ? "DUE TODAY" : `DUE IN ${n} DAYS`);
const groups = [...new Set(due.map(i => i.left))].map(n => ({ n, list: due.filter(i => i.left === n) }));
const when = i => fmtDate(i.due) + (i.time ? ", " + fmtTime(i.time) : "");

const text = "Hi,\n\nHere are the upcoming deadlines:\n\n" +
  groups.map(g => heading(g.n) + "\n" + g.list.map(i =>
    `- [${i.type}] ${short(i.title)}\n  ${i.course} · ${when(i)}${i.link ? "\n  " + i.link : ""}`).join("\n")).join("\n\n") +
  `\n\nSee everything on the hub: ${SITE_URL}\n\nYou're getting this because you agreed to deadline reminders. Reply to this email to stop them.\n`;

const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#292524">
<p>Hi,</p><p>Here are the upcoming deadlines:</p>` +
  groups.map(g => `<p style="margin:1.2em 0 .3em;font-weight:700;letter-spacing:.04em;color:${g.n === 0 ? "#b42318" : "#4a6b6a"}">${heading(g.n)}</p>` +
    g.list.map(i => `<div style="margin:.4em 0;padding:.5em .8em;border-left:3px solid ${g.n === 0 ? "#b42318" : "#dbe2e8"};background:#f5f5f4">
<b>[${i.type}]</b> ${i.link ? `<a href="${esc(i.link)}">${esc(short(i.title))}</a>` : esc(short(i.title))}<br>
<span style="color:#78716c">${esc(i.course)} · ${esc(when(i))}</span></div>`).join("")).join("") +
  `<p><a href="${SITE_URL}">Open the Assignment Hub</a></p>
<p style="color:#78716c;font-size:.85em">You're getting this because you agreed to deadline reminders. Reply to this email to stop them.</p></div>`;

const recipients = (process.env.RECIPIENTS || "").split(/[,\s;]+/).filter(Boolean);
const subject = `Assignment Hub: ${due.length} upcoming deadline${due.length === 1 ? "" : "s"}`;

if (DRY) {
  console.log(`DRY RUN: would email ${recipients.length} people.\nSubject: ${subject}\n\n${text}`);
  process.exit(0);
}
const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
if (!user || !pass || !recipients.length) { console.error("Missing GMAIL_USER, GMAIL_APP_PASSWORD or RECIPIENTS secret."); process.exit(1); }

(async () => {
  const transporter = require("nodemailer").createTransport({ service: "gmail", auth: { user, pass } });
  let failed = 0;
  for (const to of recipients) {            // one email per person, so addresses stay private
    try {
      await transporter.sendMail({ from: `"Assignment Hub" <${user}>`, to, replyTo: process.env.REPLY_TO || undefined, subject, text, html });
      console.log("Sent to recipient");
    } catch (e) { failed++; console.error("Failed for one recipient:", e.message); }
  }
  console.log(`Done. ${recipients.length - failed} sent, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
})();
