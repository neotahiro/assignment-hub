// Sends deadline reminder emails (7 days before, 2 days before, and on the day).
// Reads data.js, so your deadlines only ever live in one place.
//
// Who gets what:
//   - Items inside a course            -> everyone by default.  Add  notify: "me"  to send only to me.
//   - Items in the GENERAL list        -> only me by default.  Add  notify: "all" to send to everyone.
//   - Any value other than "all"       -> treated as "me" (a typo can never email the class by mistake).
// Items marked done in data.js are never sent. Each email also has an "Already submitted" button;
// once someone taps it, that person stops getting reminders for that one item (needs DONE_URL + DONE_SECRET).
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");

// ===== Settings  to change =====
const TZ = "Asia/Kathmandu";       // time zone used to decide what "today" is
const REMIND_DAYS = [7, 2, 0];     // days before the deadline to send a reminder
const SITE_URL = "https://neotahiro.github.io/assignment-hub/";
// ===========================================

const DRY = process.env.DRY_RUN === "true";
const DONE_URL = (process.env.DONE_URL || "").trim(), DONE_SECRET = process.env.DONE_SECRET || "";
const BUTTONS = !!(DONE_URL && DONE_SECRET);
const src = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const { SUBJECTS, GENERAL } = vm.runInNewContext(src + "\n;({ SUBJECTS, GENERAL: typeof GENERAL !== 'undefined' ? GENERAL : [] })");

const todayStr = process.env.TODAY_OVERRIDE || new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const dayNum = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const fmtDate = s => new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = t => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const short = (t, n = 160) => (t.length > n ? t.slice(0, n - 3) + "…" : t);
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

// A personal, signed link to the confirmation page (the signature stops anyone editing it to mark someone else).
function doneLink(email, i) {
  const p = email.toLowerCase();
  const s = crypto.createHmac("sha256", DONE_SECRET).update(`${p}|${i.id}`).digest("hex");
  return `${DONE_URL}?` + new URLSearchParams({ p, i: String(i.id), k: i.type === "Reading" ? "r" : "a", t: short(i.title, 80), s });
}

function buildMessage(list, forOwner, email) {
  const groups = [...new Set(list.map(i => i.left))].map(n => ({ n, list: list.filter(i => i.left === n) }));
  const tag = i => (forOwner && i.audience === "me" ? " · only you" : "");
  const btn = i => (BUTTONS && i.id !== undefined
    ? `<div style="margin-top:.5em"><a href="${esc(doneLink(email, i))}" style="display:inline-block;padding:.25em .8em;border:1px solid #4a6b6a;border-radius:999px;color:#4a6b6a;text-decoration:none;font-size:.85em;background:#fff">${i.type === "Reading" ? "Already read 😎" : "Already submitted 😎"}</a></div>` : "");
  const text = "Hi,\n\nHere are the upcoming deadlines:\n\n" +
    groups.map(g => heading(g.n) + "\n" + g.list.map(i =>
      `- [${i.type}] ${short(i.title)}\n  ${i.course} · ${when(i)}${tag(i)}${i.link ? "\n  " + i.link : ""}`).join("\n")).join("\n\n") +
    `\n\nSee everything on the hub: ${SITE_URL}\n\nYou're getting this because you agreed to deadline reminders. Reply to this email to stop them.\n`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#292524">
<p>Hi,</p><p>Here are the upcoming deadlines:</p>` +
    groups.map(g => `<p style="margin:1.2em 0 .3em;font-weight:700;letter-spacing:.04em;color:${g.n === 0 ? "#b42318" : "#4a6b6a"}">${heading(g.n)}</p>` +
      g.list.map(i => `<div style="margin:.4em 0;padding:.5em .8em;border-left:3px solid ${g.n === 0 ? "#b42318" : "#dbe2e8"};background:#f5f5f4">
<b>[${i.type}]</b> ${i.link ? `<a href="${esc(i.link)}">${esc(short(i.title))}</a>` : esc(short(i.title))}<br>
<span style="color:#78716c">${esc(i.course)} · ${esc(when(i))}${tag(i)}</span>${btn(i)}</div>`).join("")).join("") +
    `<p><a href="${SITE_URL}">Open the Assignment Hub</a></p>
<p style="color:#78716c;font-size:.85em">You're getting this because you agreed to deadline reminders.${BUTTONS ? " Already done with something? Tap its button and you won't be reminded about it again." : ""} Reply to this email to stop them.</p></div>`;
  return { subject: `Assignment Hub: ${list.length} upcoming deadline${list.length === 1 ? "" : "s"}`, text, html };
}

// Who has already tapped "Already submitted"? Returns a Set of "email|itemId". If the lookup fails we still send reminders.
async function fetchDone() {
  const set = new Set();
  if (!BUTTONS) return set;
  try {
    const res = await fetch(DONE_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ key: DONE_SECRET }) });
    const j = await res.json();
    if (!j.ok) throw new Error("the web app refused the key (check DONE_SECRET)");
    j.done.forEach(([e, id]) => set.add(e.toLowerCase() + "|" + id));
    console.log(`Done list loaded: ${set.size} marked item(s).`);
  } catch (e) { console.warn("WARNING: could not load the done list, so nobody was skipped this time:", e.message); }
  return set;
}

(async () => {
  const owner = (process.env.MY_EMAIL || "").trim();
  const all = (process.env.RECIPIENTS || "").split(/[,\s;]+/).filter(Boolean);
  const classmates = all.filter(e => e.toLowerCase() !== owner.toLowerCase());   // you get one combined email, never two
  if (!owner && due.length > forClass.length) console.warn(`MY_EMAIL is not set, so ${due.length - forClass.length} personal reminder(s) were skipped (they are never sent to the class).`);

  const doneSet = await fetchDone();
  const people = classmates.map(email => ({ email, owner: false, list: forClass }));
  if (owner) people.push({ email: owner, owner: true, list: due });
  for (const p of people) p.list = p.list.filter(i => !doneSet.has(p.email.toLowerCase() + "|" + i.id));
  const toSend = people.filter(p => p.list.length);

  if (DRY) {
    console.log(`\nDRY RUN (buttons ${BUTTONS ? "ON" : "OFF"}). Would send ${toSend.length} email(s):`);
    toSend.forEach((p, n) => console.log(`  - ${p.owner ? "you" : "classmate " + (n + 1)}: ${p.list.length} item(s)`));
    const mine = toSend.find(p => p.owner);
    if (mine) console.log("\nYour email would read:\n\n" + buildMessage(mine.list, true, mine.email).text);
    return;
  }
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || !people.length) { console.error("Missing GMAIL_USER, GMAIL_APP_PASSWORD, or recipients (RECIPIENTS / MY_EMAIL)."); process.exit(1); }

  const transporter = require("nodemailer").createTransport({ service: "gmail", auth: { user, pass } });
  let failed = 0;
  for (const p of toSend) {                 // one email per person, so addresses stay private
    const m = buildMessage(p.list, p.owner, p.email);
    try {
      await transporter.sendMail({ from: `"Assignment Hub" <${user}>`, to: p.email, replyTo: process.env.REPLY_TO || undefined, subject: m.subject, text: m.text, html: m.html });
      console.log("Sent to recipient");
    } catch (e) { failed++; console.error("Failed for one recipient:", e.message); }
  }
  console.log(`Done. ${toSend.length - failed} sent, ${failed} failed, ${people.length - toSend.length} skipped (nothing left to remind).`);
  process.exit(failed ? 1 : 0);
})();
