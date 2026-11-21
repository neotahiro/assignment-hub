// Data layer for the student area. Every function talks to Supabase as the signed-in student;
// Row Level Security guarantees they only ever get/modify their own rows (admins can read all).
// Item ids are the ids from data.js (e.g. "fsd-a1"). Functions throw an Error on failure.
const Store = (() => {
  const db = () => {
    const c = Auth.client();
    if (!c || !Auth.user()) throw new Error("Not signed in");
    return c;
  };
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  const clean = (obj, keys) => Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));
  const text = (v, max, what) => {
    const t = String(v == null ? "" : v).trim();
    if (!t) throw new Error(what + " can't be empty");
    if (t.length > max) throw new Error(what + " is too long (max " + max + " characters)");
    return t;
  };

  const progress = {
    // -> Map of assignment_id -> row
    async all() { return new Map(ok(await db().from("assignment_progress").select("*")).map(r => [r.assignment_id, r])); },
    // patch may contain: status ('todo'|'doing'|'done'), priority (0-3), personal_due ('YYYY-MM-DD' = deadline extension, or null to remove), extension_note
    async set(id, patch) {
      const p = clean(patch, ["status", "priority", "personal_due", "extension_note"]);
      if (p.personal_due != null && !/^\d{4}-\d{2}-\d{2}$/.test(p.personal_due)) throw new Error("Date must be YYYY-MM-DD");
      if (p.extension_note != null) {
        const t = String(p.extension_note).trim();
        if (t.length > 300) throw new Error("Note is too long (max 300 characters)");
        p.extension_note = t || null;
      }
      if (p.personal_due === null) p.extension_note = null;   // removing an extension removes its note too
      const row = { assignment_id: id, ...p };
      return ok(await db().from("assignment_progress").upsert(row, { onConflict: "user_id,assignment_id" }).select().single());
    },
    async reset(id) { ok(await db().from("assignment_progress").delete().eq("assignment_id", id)); }
  };

  const notes = {
    async list() { return ok(await db().from("notes").select("*").order("updated_at", { ascending: false })); },
    async add({ body, assignment_id = null }) {
      return ok(await db().from("notes").insert({ body: text(body, 10000, "Note"), assignment_id }).select().single());
    },
    async update(id, { body, assignment_id }) {
      const patch = {};
      if (body !== undefined) patch.body = text(body, 10000, "Note");
      if (assignment_id !== undefined) patch.assignment_id = assignment_id;
      return ok(await db().from("notes").update(patch).eq("id", id).select().single());
    },
    async remove(id) { ok(await db().from("notes").delete().eq("id", id)); }
  };

  const events = {
    async list() { return ok(await db().from("calendar_events").select("*").order("event_date")); },
    async add({ title, event_date, note = null, assignment_id = null }) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date || "")) throw new Error("Date must be YYYY-MM-DD");
      return ok(await db().from("calendar_events").insert({ title: text(title, 200, "Title"), event_date, note, assignment_id }).select().single());
    },
    async update(id, patch) {
      const p = clean(patch, ["title", "event_date", "note", "assignment_id"]);
      if (p.title !== undefined) p.title = text(p.title, 200, "Title");
      return ok(await db().from("calendar_events").update(p).eq("id", id).select().single());
    },
    async remove(id) { ok(await db().from("calendar_events").delete().eq("id", id)); }
  };

  const log = {
    async list(limit = 200) { return ok(await db().from("progress_log").select("*").order("changed_at", { ascending: false }).limit(limit)); },
    // Every history row, newest first. The server returns at most 1000 rows per request, so fetch in pages.
    async all() {
      const out = [];
      for (let from = 0; from < 10000; from += 1000) {
        const rows = ok(await db().from("progress_log").select("*").order("changed_at", { ascending: false }).order("id", { ascending: false }).range(from, from + 999));
        out.push(...rows); if (rows.length < 1000) break;
      }
      return out;
    }
  };
  const reports = { async list() { return ok(await db().from("period_reports").select("*").order("period_start", { ascending: false })); } };

  const profile = {
    async update({ name, email_reports }) {
      const patch = {};
      if (name !== undefined) patch.name = text(name, 100, "Name");
      if (email_reports !== undefined) patch.email_reports = !!email_reports;
      return ok(await db().from("profiles").update(patch).eq("id", Auth.user().id).select().single());
    }
  };

  // Admin-only reads (RLS returns rows for everyone only when profiles.role = 'admin').
  const admin = {
    async profiles() { return ok(await db().from("profiles").select("*").order("name")); },
    async progress() { return ok(await db().from("assignment_progress").select("*")); },
    async log(limit = 500) { return ok(await db().from("progress_log").select("*").order("changed_at", { ascending: false }).limit(limit)); }
  };

  return { progress, notes, events, log, reports, profile, admin };
})();
