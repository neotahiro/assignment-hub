// Student pages. Assignment data comes from data.js; the student's own state comes from Supabase (db.js).

// ---------- My Assignments ----------
StudentPages.assignments = async (body, stale) => {
  const prog = await Store.progress.all(); if (stale()) return;
  const all = studentItems(), cur = currentSem();
  const sems = SEMS.filter(x => hasSubjects(x.id) && x.start <= isoToday());
  let sem = cur, filter = "active";
  const FILTERS = [["active", "Active"], ["done", "Done"], ["all", "All"]];
  body.innerHTML = `<div class="st-bar-row"><div class="st-filters">${FILTERS.map(([k, l]) => `<button type="button" class="st-pill${k === filter ? " on" : ""}" data-filter="${k}">${l}</button>`).join("")}</div>`
    + (sems.length > 1 ? `<select class="st-sel" id="st-sem" aria-label="Semester">${sems.map(x => `<option value="${x.id}"${x.id === cur ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : "")
    + `</div><div class="st-msg" role="status" aria-live="polite"></div><div id="st-list"></div>`;
  const list = body.querySelector("#st-list");
  const draw = () => {
    let items = all.filter(it => it.sem === sem);
    if (filter === "active") items = items.filter(it => stStatus(prog, it.id) !== "done");
    if (filter === "done") items = items.filter(it => stStatus(prog, it.id) === "done");
    items.sort((a, b) => dueAt(a) - dueAt(b));
    list.innerHTML = items.map(it => stRow(it, prog)).join("")
      || `<p class="empty">${filter === "done" ? "Nothing marked done yet." : filter === "active" ? "All caught up. Nothing left to do." : "No assignments here."}</p>`;
  };
  body.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-filter]"); if (!b) return;
    filter = b.dataset.filter;
    body.querySelectorAll(".st-pill").forEach(x => x.classList.toggle("on", x === b));
    draw();
  });
  const semSel = body.querySelector("#st-sem");
  if (semSel) semSel.addEventListener("change", () => { sem = Number(semSel.value); draw(); });
  stWire(body, prog, draw);
  draw();
};

// ---------- My Priorities ----------
StudentPages.priorities = async (body, stale) => {
  const prog = await Store.progress.all(); if (stale()) return;
  const cur = currentSem(), all = studentItems().filter(it => it.sem === cur);
  body.innerHTML = `<p class="sub">Items you gave a priority in <a href="#/app/assignments">My Assignments</a>, most important first. Finished items drop off.</p><div class="st-msg" role="status" aria-live="polite"></div><div id="st-list"></div>`;
  const list = body.querySelector("#st-list");
  const draw = () => {
    const open = all.filter(it => stPrio(prog, it.id) > 0 && stStatus(prog, it.id) !== "done");
    list.innerHTML = [[3, "High"], [2, "Medium"], [1, "Low"]].map(([p, label]) => {
      const rows = open.filter(it => stPrio(prog, it.id) === p).sort((a, b) => dueAt(a) - dueAt(b));
      return rows.length ? `<h2>${label}</h2>` + rows.map(it => stRow(it, prog)).join("") : "";
    }).join("") || `<p class="empty">No priorities set. Pick a priority on any assignment in My Assignments.</p>`;
  };
  stWire(body, prog, draw);
  draw();
};

// ---------- My Dashboard ----------
StudentPages.dashboard = async (body, stale) => {
  const [prog, notes] = await Promise.all([Store.progress.all(), Store.notes.list()]); if (stale()) return;
  const cur = currentSem(), p = Auth.profile() || {};
  const items = studentItems().filter(it => it.sem === cur);
  const asg = items.filter(it => it.kind === "assignment");
  const count = s => asg.filter(it => stStatus(prog, it.id) === s).length;
  const done = count("done"), doing = count("doing"), todo = count("todo");
  const overdue = asg.filter(it => stOverdue(it, prog)).length;
  const pct = asg.length ? Math.round(done / asg.length * 100) : 0;
  const attention = items.filter(it => stStatus(prog, it.id) !== "done" && it.due && daysLeft(it.due) <= 7).sort((a, b) => dueAt(a) - dueAt(b));
  const high = items.filter(it => stPrio(prog, it.id) === 3 && stStatus(prog, it.id) !== "done").sort((a, b) => dueAt(a) - dueAt(b));
  const stat = (n, l, cls = "") => `<div class="st-stat ${cls}"><b>${n}</b><span>${l}</span></div>`;
  const more = (arr, n) => arr.length > n ? `<p class="m"><a href="#/app/assignments">+ ${arr.length - n} more in My Assignments →</a></p>` : "";
  const snip = t => esc(t.length > 140 ? t.slice(0, 140).trimEnd() + "…" : t);
  body.innerHTML = `<p class="sub">Welcome back, ${esc(p.name || "student")}. ${esc(semName(cur))}.</p>
    <div class="st-stats">${stat(todo, "To do")}${stat(doing, "In progress")}${stat(done, "Done")}${stat(overdue, "Overdue", overdue ? "bad" : "")}</div>
    <div class="st-prog" role="img" aria-label="${pct}% of assignments done"><i style="width:${pct}%"></i></div>
    <p class="m">${pct}% of ${asg.length} assignments done</p>
    <h2>Needs attention</h2>${attention.slice(0, 6).map(it => stRow(it, prog, false)).join("") || '<p class="empty">Nothing overdue or due this week.</p>'}${more(attention, 6)}
    <h2>High priority</h2>${high.slice(0, 5).map(it => stRow(it, prog, false)).join("") || '<p class="empty">No high-priority items. Set some in My Assignments.</p>'}${more(high, 5)}
    <h2>Recent notes</h2>${notes.slice(0, 3).map(n => `<div class="st-card"><div class="m">${stShort(n.updated_at)}</div><div class="st-nb">${snip(n.body)}</div></div>`).join("") || '<p class="empty">No notes yet.</p>'}
    <p class="m"><a href="#/app/notes">Open My Notes →</a></p>`;
};

// ---------- My Notes ----------
StudentPages.notes = async (body, stale) => {
  let notes = await Store.notes.list(); if (stale()) return;
  const byId = new Map(studentItems().map(i => [i.id, i]));
  const groups = SUBJECTS.map(s => [s.name, s.assignments || []]).concat(typeof GENERAL !== "undefined" ? [["General", GENERAL]] : []);
  const opts = groups.filter(([, a]) => a.length).map(([name, a]) => `<optgroup label="${esc(name)}">${a.map(x => `<option value="${esc(x.id)}">${esc(x.title.slice(0, 70))}</option>`).join("")}</optgroup>`).join("");
  let editing = null;
  body.innerHTML = `<div class="st-card"><textarea class="st-ta" id="st-new" rows="4" maxlength="10000" placeholder="Write a note…" aria-label="New note"></textarea>
    <div class="st-row"><select class="st-sel" id="st-aid" aria-label="Link to an assignment"><option value="">Not linked to an assignment</option>${opts}</select><button type="button" class="st-btn" data-act="add">Add note</button></div></div>
    <div class="st-msg" role="status" aria-live="polite"></div><div id="st-notes"></div>`;
  const list = body.querySelector("#st-notes");
  const label = n => { if (!n.assignment_id) return ""; const it = byId.get(n.assignment_id); return `<span class="tag">${it ? esc(it.title.slice(0, 60)) : "Removed assignment"}</span>`; };
  const draw = () => {
    list.innerHTML = notes.map(n => n.id === editing
      ? `<div class="st-card" data-nid="${esc(n.id)}"><textarea class="st-ta" rows="5" maxlength="10000" aria-label="Edit note">${esc(n.body)}</textarea><div class="st-row"><button type="button" class="st-btn" data-act="save">Save</button><button type="button" class="st-btn st-quiet" data-act="cancel">Cancel</button></div></div>`
      : `<div class="st-card" data-nid="${esc(n.id)}"><div class="m">${label(n)} ${stShort(n.updated_at)}</div><div class="st-nb">${esc(n.body)}</div><div class="st-row"><button type="button" class="st-link" data-act="edit">Edit</button><button type="button" class="st-link" data-act="del">Delete</button></div></div>`
    ).join("") || '<p class="empty">No notes yet. Write your first one above.</p>';
  };
  body.addEventListener("click", async e => {
    const b = e.target.closest && e.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act, card = b.closest("[data-nid]"), id = card && card.dataset.nid;
    try {
      if (act === "edit") { editing = id; draw(); const t = list.querySelector("textarea"); if (t) t.focus(); return; }
      if (act === "cancel") { editing = null; draw(); return; }
      b.disabled = true;
      if (act === "add") {
        const ta = body.querySelector("#st-new"), aid = body.querySelector("#st-aid").value || null;
        const row = await Store.notes.add({ body: ta.value, assignment_id: aid });
        notes.unshift(row); ta.value = ""; flash(body, "Note added");
      } else if (act === "save") {
        const row = await Store.notes.update(id, { body: card.querySelector("textarea").value });
        notes = [row].concat(notes.filter(n => n.id !== id)); editing = null; flash(body, "Saved");
      } else if (act === "del") {
        if (!confirm("Delete this note? This can't be undone.")) return;
        await Store.notes.remove(id); notes = notes.filter(n => n.id !== id); flash(body, "Deleted");
      }
      draw();
    } catch (err) { flash(body, err.message, true); }
    finally { b.disabled = false; }
  });
  draw();
};
