// Assignment Hub emails.
//   Daily run (MODE unset): deadline reminders (7 / 2 / 0 days before) + notices.
//   Urgent run (MODE=urgent): sends urgent notices that have not been sent yet. Started by hand from the Actions tab.
//
// Deadlines:  course items -> everyone (notify: "me" = only you) | GENERAL list -> only you (notify: "all" = everyone).
// Notices:    non-urgent with an `on` date -> 2 days before and on the day (and 7 days before if `on` is more than 14 days after `date`).
//             non-urgent without `on` -> once, on the first morning run after `date`.
//             urgent -> only when you press the button (plus the date rules above if it has an `on` date).
//             Each notice email is sent once (remembered in your Google sheet, tab "Sent"). Test mode never records anything.
// "Already submitted" buttons: tapping one stops reminders for that person + item (needs DONE_URL + DONE_SECRET).
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");

// ===== Settings you may want to change =====
const TZ = "Asia/Kathmandu";       // time zone used to decide what "today" is
const REMIND_DAYS = [7, 2, 0];     // days before a deadline to send a reminder
const LONG_NOTICE_DAYS = 14;       // a dated notice posted more than this many days ahead also gets a 7-day reminder
const SITE_URL = "https://neotahiro.github.io/assignment-hub/";
// ===========================================

const MODE = process.env.MODE === "urgent" ? "urgent" : "daily";
const DRY = process.env.DRY_RUN === "true", ONLY_ME = process.env.ONLY_ME === "true";
const DONE_URL = (process.env.DONE_URL || "").trim(), DONE_SECRET = process.env.DONE_SECRET || "";
const BUTTONS = !!(DONE_URL && DONE_SECRET);
const src = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const { SUBJECTS, GENERAL, NOTICES } = vm.runInNewContext(src + "\n;({ SUBJECTS, GENERAL: typeof GENERAL !== 'undefined' ? GENERAL : [], NOTICES: typeof NOTICES !== 'undefined' ? NOTICES : [] })");

const todayStr = process.env.TODAY_OVERRIDE || new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const dayNum = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const fmtDate = s => new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = t => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const short = (t, n = 160) => (t.length > n ? t.slice(0, n - 3) + "…" : t);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const audienceOf = (i, dflt) => i.notify === undefined ? dflt : (String(i.notify).trim().toLowerCase() === "all" ? "all" : "me");
const safeUrl = u => (/^https?:\/\//i.test(u || "") ? u : "");

// ---- deadlines (daily run only) ----
const items = [];
for (const s of SUBJECTS) {
  for (const a of s.assignments || []) items.push({ ...a, type: "Assignment", course: s.name, audience: audienceOf(a, "all") });
  for (const r of s.readings || []) items.push({ ...r, type: "Reading", course: s.name, audience: audienceOf(r, "all") });
}
for (const g of GENERAL || []) items.push({ ...g, type: "Assignment", course: "General", audience: audienceOf(g, "me") });
const due = MODE === "urgent" ? [] : items
  .filter(i => i.due && i.done !== true)
  .map(i => ({ ...i, left: dayNum(i.due) - dayNum(todayStr) }))
  .filter(i => REMIND_DAYS.includes(i.left))
  .sort((a, b) => a.left - b.left || (a.time || "23:59").localeCompare(b.time || "23:59"));

// ---- notices: which email "tag" is due today? (each notice + tag is sent once) ----
function noticeTag(n) {
  if (n.date && n.date > todayStr) return null;                    // not posted yet
  if (MODE === "urgent") return n.urgent ? "urgent" : null;
  if (n.on) {
    const left = dayNum(n.on) - dayNum(todayStr), long = dayNum(n.on) - dayNum(n.date || todayStr) > LONG_NOTICE_DAYS;
    if (left === 0) return "d0";
    if (left > 0 && left <= 2) return "d2";
    if (long && left > 2 && left <= 7) return "d7";
    return null;
  }
  if (n.urgent) return null;                                        // urgent ones go out by button
  const end = n.until; return end && end < todayStr ? null : "once";
}
const candidates = (NOTICES || []).filter(n => n && n.id && n.title).map(n => ({ ...n, tag: noticeTag(n), audience: audienceOf(n, "all") })).filter(n => n.tag)
  .map(n => ({ ...n, key: `${n.id}|${n.tag}`, label: n.on ? (dayNum(n.on) === dayNum(todayStr) ? "today" : `${fmtDate(n.on)} · in ${dayNum(n.on) - dayNum(todayStr)} days`) : "" }));

const forClass = due.filter(i => i.audience === "all");
console.log(`Mode: ${MODE}. Today (${TZ}): ${todayStr}. Deadlines due soon: ${due.length}. Notices possibly due: ${candidates.length}.`);
if (!due.length && !candidates.length) process.exit(0);

const heading = n => (n === 0 ? "DUE TODAY" : `DUE IN ${n} DAYS`);
const when = i => fmtDate(i.due) + (i.time ? ", " + fmtTime(i.time) : "");
function doneLink(email, i) {
  const p = email.toLowerCase(), s = crypto.createHmac("sha256", DONE_SECRET).update(`${p}|${i.id}`).digest("hex");
  return `${DONE_URL}?` + new URLSearchParams({ p, i: String(i.id), k: i.type === "Reading" ? "r" : "a", t: short(i.title, 80), s });
}
function buildMessage(list, notices, forOwner, email, urgent) {
  const groups = [...new Set(list.map(i => i.left))].map(n => ({ n, list: list.filter(i => i.left === n) }));
  const tag = i => (forOwner && i.audience === "me" ? " · only you" : "");
  const btn = i => (BUTTONS && i.id !== undefined
    ? `<div style="margin-top:.5em"><a href="${esc(doneLink(email, i))}" style="display:inline-block;padding:.25em .8em;border:1px solid #4a6b6a;border-radius:999px;color:#4a6b6a;text-decoration:none;font-size:.85em;background:#fff">${i.type === "Reading" ? "Already read 😎" : "Already submitted 😎"}</a></div>` : "");
  const nTxt = n => `- ${n.title}${n.label ? " (" + n.label + ")" : ""}${tag(n)}\n${n.text ? "  " + short(n.text, 400).replace(/\n/g, "\n  ") + "\n" : ""}${safeUrl(n.link) ? "  " + n.link + "\n" : ""}`;
  const nHtml = n => `<div style="margin:.4em 0;padding:.5em .8em;border-left:3px solid ${n.urgent ? "#b42318" : "#4a6b6a"};background:${n.urgent ? "#fdf1f0" : "#f5f5f4"}"><b>${esc(n.title)}</b>${n.label ? ` <span style="color:#78716c">· ${esc(n.label)}</span>` : ""}${tag(n) ? '<span style="color:#78716c">' + tag(n) + "</span>" : ""}${n.text ? "<br>" + esc(short(n.text, 400)).replace(/\n/g, "<br>") : ""}${safeUrl(n.link) ? `<br><a href="${esc(n.link)}">Open details</a>` : ""}</div>`;
  const text = "Hi,\n\n" +
    (notices.length ? (urgent ? "URGENT NOTICE\n" : "NOTICES\n") + notices.map(nTxt).join("\n") + "\n" : "") +
    (list.length ? "Here are the upcoming deadlines:\n\n" + groups.map(g => heading(g.n) + "\n" + g.list.map(i =>
      `- [${i.type}] ${short(i.title)}\n  ${i.course} · ${when(i)}${tag(i)}${i.link ? "\n  " + i.link : ""}`).join("\n")).join("\n\n") + "\n\n" : "") +
    `See everything on the hub: ${SITE_URL}\n\nYou're getting this because you agreed to reminders from the class Assignment Hub. Reply to this email to stop them.\n`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#292524"><p>Hi,</p>` +
    (notices.length ? `<p style="margin:1.2em 0 .3em;font-weight:700;letter-spacing:.04em;color:${urgent ? "#b42318" : "#4a6b6a"}">${urgent ? "URGENT NOTICE" : "NOTICES"}</p>` + notices.map(nHtml).join("") : "") +
    (list.length ? "<p>Here are the upcoming deadlines:</p>" + groups.map(g => `<p style="margin:1.2em 0 .3em;font-weight:700;letter-spacing:.04em;color:${g.n === 0 ? "#b42318" : "#4a6b6a"}">${heading(g.n)}</p>` +
      g.list.map(i => `<div style="margin:.4em 0;padding:.5em .8em;border-left:3px solid ${g.n === 0 ? "#b42318" : "#dbe2e8"};background:#f5f5f4">
<b>[${i.type}]</b> ${i.link ? `<a href="${esc(i.link)}">${esc(short(i.title))}</a>` : esc(short(i.title))}<br>
<span style="color:#78716c">${esc(i.course)} · ${esc(when(i))}${tag(i)}</span>${btn(i)}</div>`).join("")).join("") : "") +
    `<p><a href="${SITE_URL}">Open the Assignment Hub</a></p>
<p style="color:#78716c;font-size:.85em">You're getting this because you agreed to reminders.${BUTTONS && list.length ? " Already done with something? Tap its button and you won't be reminded about it again." : ""} Reply to this email to stop them.</p></div>`;
  const parts = [notices.length && `${notices.length} notice${notices.length === 1 ? "" : "s"}`, list.length && `${list.length} upcoming deadline${list.length === 1 ? "" : "s"}`].filter(Boolean).join(" and ");
  const subject = urgent ? (notices.length === 1 ? `URGENT: ${notices[0].title}` : `URGENT: ${notices.length} notices`) : `Assignment Hub: ${parts}`;
  return { subject, text, html };
}

async function hub(body) {
  const res = await fetch(DONE_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ key: DONE_SECRET, ...body }) });
  const j = await res.json();
  if (!j.ok) throw new Error("the web app refused the key (check DONE_SECRET)");
  return j;
}
async function fetchDone() {          // "email|itemId" pairs people have marked. If this fails we still send reminders.
  const set = new Set(); if (!BUTTONS) return set;
  try { (await hub({})).done.forEach(([e, id]) => set.add(e.toLowerCase() + "|" + id)); console.log(`Done list loaded: ${set.size} marked item(s).`); }
  catch (e) { console.warn("WARNING: could not load the done list, so nobody was skipped this time:", e.message); }
  return set;
}
async function fetchSent() {          // notice emails already sent. If this fails we send NO notices (never risk duplicates).
  if (!BUTTONS) { console.warn("WARNING: DONE_URL / DONE_SECRET missing, so notices were skipped (they need the sent-list)."); return null; }
  try {
    const j = await hub({ action: "sentList" });
    if (!Array.isArray(j.sent)) throw new Error("update the Google script: Deploy > Manage deployments > Edit > New version");
    return new Set(j.sent);
  } catch (e) { console.warn("WARNING: could not load the sent-list, so notices were skipped:", e.message); return null; }
}

(async () => {
  const owner = (process.env.MY_EMAIL || "").trim();
  const all = (process.env.RECIPIENTS || "").split(/[,\s;]+/).filter(Boolean);
  const classmates = ONLY_ME ? [] : all.filter(e => e.toLowerCase() !== owner.toLowerCase());   // you get one combined email, never two
  if (ONLY_ME) console.log("TEST MODE: sending only to you, the class list is ignored, nothing is recorded as sent.");
  if (!owner && due.length > forClass.length) console.warn(`MY_EMAIL is not set, so ${due.length - forClass.length} personal reminder(s) were skipped (they are never sent to the class).`);

  const sent = candidates.length ? await fetchSent() : new Set();
  const nDue = sent ? candidates.filter(n => !sent.has(n.key)) : [];
  if (!due.length && !nDue.length) { console.log("Nothing to send."); return; }

  const doneSet = await fetchDone();
  const people = classmates.map(email => ({ email, owner: false, list: forClass, notices: nDue.filter(n => n.audience === "all") }));
  if (owner) people.push({ email: owner, owner: true, list: due, notices: nDue });
  for (const p of people) p.list = p.list.filter(i => !doneSet.has(p.email.toLowerCase() + "|" + i.id));
  const toSend = people.filter(p => p.list.length || p.notices.length);
  const urgent = MODE === "urgent";

  if (DRY) {
    console.log(`\nDRY RUN (buttons ${BUTTONS ? "ON" : "OFF"}). Would send ${toSend.length} email(s):`);
    toSend.forEach((p, n) => console.log(`  - ${p.owner ? "you" : "classmate " + (n + 1)}: ${p.notices.length} notice(s), ${p.list.length} deadline(s)`));
    nDue.forEach(n => console.log(`  notice "${short(n.title, 60)}" [${n.tag}]`));
    const mine = toSend.find(p => p.owner);
    if (mine) console.log("\nYour email would read:\n\n" + buildMessage(mine.list, mine.notices, true, mine.email, urgent).text);
    return;
  }
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || !people.length) { console.error("Missing GMAIL_USER, GMAIL_APP_PASSWORD, or recipients (RECIPIENTS / MY_EMAIL)."); process.exit(1); }

  const transporter = require("nodemailer").createTransport({ service: "gmail", auth: { user, pass } });
  let ok = 0, failed = 0;
  for (const p of toSend) {                 // one email per person, so addresses stay private
    const m = buildMessage(p.list, p.notices, p.owner, p.email, urgent);
    try {
      await transporter.sendMail({ from: `"Assignment Hub" <${user}>`, to: p.email, replyTo: process.env.REPLY_TO || undefined, subject: m.subject, text: m.text, html: m.html });
      ok++; console.log("Sent to recipient");
    } catch (e) { failed++; console.error("Failed for one recipient:", e.message); }
  }
  if (nDue.length && ok > 0 && !ONLY_ME) {
    try { await hub({ action: "markSent", keys: nDue.map(n => n.key) }); console.log(`Recorded ${nDue.length} notice email(s) as sent.`); }
    catch (e) { console.error("WARNING: emails went out but could not be recorded as sent (they may repeat tomorrow):", e.message); failed++; }
  }
  console.log(`Done. ${ok} sent, ${failed} failed, ${people.length - toSend.length} skipped (nothing to say).`);
  process.exit(failed ? 1 : 0);
})();
