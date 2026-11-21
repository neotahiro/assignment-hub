// Admin tab: class-wide, read-only view (overview per item, per student, and extensions).
// Students' private notes and calendar events are deliberately NOT shown here.
StudentPages.admin = async (body, stale, sub) => {
  const [profiles, rows, reports] = await Promise.all([Store.admin.profiles(), Store.admin.progress(), Store.admin.reports()]);
  if (stale()) return;
  const RC = ReportCore, cur = currentSem();
  const sems = SEMS.filter(x => hasSubjects(x.id) && x.start <= isoToday());
  const LBL = { todo: "To do", doing: "In progress", done: "Done" }, PRIO = ["", "Low", "Medium", "High"];
  const cut = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
  const nm = u => u.name || u.email || "Student";
  const progBy = new Map(); rows.forEach(r => { if (!progBy.has(r.user_id)) progBy.set(r.user_id, new Map()); progBy.get(r.user_id).set(r.assignment_id, r); });
  const progOf = u => progBy.get(u.id) || new Map();
  const lastSent = new Map(); reports.forEach(r => { const x = lastSent.get(r.user_id); if (!x || r.emailed_at > x.emailed_at) lastSent.set(r.user_id, r); });
  const allItems = studentItems(), byId = new Map(allItems.map(i => [i.id, i]));
  const VIEWS = ["overview", "students", "extensions"];
  let sem = cur, view = VIEWS.includes(sub) ? sub : "overview", openItem = null, openStudent = null, sort = "name";
  const hist = new Map();

  const stateOf = (it, u) => { const p = progOf(u), e = stEffective(it, p); return { u, p, e, s: stStatus(p, it.id), over: stOverdue(it, p), ext: e.origDue ? e : null, row: p.get(it.id) }; };
  const itemsNow = () => allItems.filter(it => it.sem === sem);

  // every extension that is actually in effect (later than the class deadline), newest first
  const extensions = () => {
    const out = [];
    profiles.forEach(u => progOf(u).forEach((row, id) => {
      if (!row.personal_due) return;
      const it = byId.get(id);
      if (it && (!it.due || row.personal_due <= it.due)) return;
      out.push({ u, row, it });
    }));
    return out.sort((a, b) => (b.row.extension_at || "").localeCompare(a.row.extension_at || ""));
  };

  const tag = (t, c) => `<span class="tag${c ? " " + c : ""}">${t}</span>`;
  const who = x => esc(nm(x.u)) + (x.over ? " " + tag("overdue", "bad") : "") + (x.ext ? " " + tag("→ " + esc(fmt(x.ext.due)), "ext") : "");

  const overview = () => {
    const items = itemsNow().slice().sort((a, b) => (a.due ? 0 : 1) - (b.due ? 0 : 1) || dueAt(a) - dueAt(b));
    let doneAll = 0, overAll = 0, extAll = 0, body_ = "";
    items.forEach(it => {
      const per = profiles.map(u => stateOf(it, u)), n = s => per.filter(x => x.s === s);
      const d = n("done").length, g = n("doing").length, t = n("todo").length, o = per.filter(x => x.over).length, x = per.filter(y => y.ext).length;
      doneAll += d; overAll += o; extAll += x;
      body_ += `<tr><td><button type="button" class="st-rowbtn" data-item="${esc(it.id)}" aria-expanded="${openItem === it.id}">${esc(cut(it.title, 80))}</button><br><span class="m">${esc(it.subj)}</span></td>`
        + `<td>${it.due ? esc(fmt(it.due)) : "–"}</td><td>${d}</td><td>${g}</td><td>${t}</td><td class="${o ? "bad" : ""}">${o}</td><td>${x}</td></tr>`;
      if (openItem === it.id) body_ += `<tr class="st-detail"><td colspan="7"><p><b>Done (${d}):</b> ${d ? n("done").map(who).join(", ") : "–"}</p><p><b>In progress (${g}):</b> ${g ? n("doing").map(who).join(", ") : "–"}</p><p><b>To do (${t}):</b> ${t ? n("todo").map(who).join(", ") : "–"}</p>`
        + per.filter(y => y.ext && y.row && y.row.extension_note).map(y => `<p class="m">${esc(nm(y.u))}: <span class="st-extnote">“${esc(y.row.extension_note)}”</span></p>`).join("") + `</td></tr>`;
    });
    const cells = items.length * profiles.length, pct = cells ? Math.round(doneAll / cells * 100) : 0;
    return `<div class="st-stats"><div class="st-stat"><b>${profiles.length}</b><span>Students signed up</span></div><div class="st-stat"><b>${pct}%</b><span>Class completion</span></div>`
      + `<div class="st-stat${overAll ? " bad" : ""}"><b>${overAll}</b><span>Overdue (all students)</span></div><div class="st-stat"><b>${extAll}</b><span>Active extensions</span></div></div>`
      + (items.length ? `<div class="st-scroll"><table class="st-table"><thead><tr><th>Item</th><th>Class deadline</th><th>Done</th><th>Active</th><th>To do</th><th>Overdue</th><th>Extended</th></tr></thead><tbody>${body_}</tbody></table></div>` : '<p class="empty">No items in this semester.</p>');
  };

  const studentLine = (it, p) => {
    const e = stEffective(it, p), s = stStatus(p, it.id), pr = stPrio(p, it.id), row = p.get(it.id);
    const when = s === "done" ? "Done" + (row && row.completed_at ? " · " + stShort(row.completed_at) : "") : dueLabel({ ...e, done: false }) + (e.origDue ? ` · was ${fmt(e.origDue)}` : "");
    return `<div class="item st-item${s === "done" ? " st-done" : stOverdue(it, p) ? " st-over" : ""}"><span class="st-main">${e.origDue ? tag("Extended", "ext") : ""}<span class="t">${esc(cut(it.title, 90))}</span><br><span class="m">${esc(it.subj)} · ${when}${e.extNote ? ` · <span class="st-extnote">“${esc(e.extNote)}”</span>` : ""}</span></span>`
      + `<span class="st-chg"><b class="st-to ${s}">${LBL[s]}</b>${pr ? " · " + PRIO[pr] : ""}</span></div>`;
  };
  const histHtml = rowsH => rowsH.length ? rowsH.map(r => { const it = byId.get(r.assignment_id);
      return `<div class="item st-item"><span class="st-main"><span class="t">${it ? esc(cut(it.title, 80)) : "Removed item"}</span><br><span class="m">${esc(RC.fmtStamp(r.changed_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</span></span><span class="st-chg">${LBL[r.old_status || "todo"]} → <b class="st-to ${esc(r.new_status)}">${LBL[r.new_status] || esc(r.new_status)}</b></span></div>`; }).join("")
    : '<p class="empty">No activity yet.</p>';

  const students = () => {
    const items = itemsNow();
    const data = profiles.map(u => {
      let d = 0, g = 0, t = 0, o = 0, x = 0;
      items.forEach(it => { const y = stateOf(it, u); y.s === "done" ? d++ : y.s === "doing" ? g++ : t++; if (y.over) o++; if (y.ext) x++; });
      const last = [...progOf(u).values()].reduce((m, r) => (r.updated_at > m ? r.updated_at : m), "");
      return { u, d, g, t, o, x, last, pct: items.length ? Math.round(d / items.length * 100) : 0 };
    });
    const by = { name: (a, b) => nm(a.u).localeCompare(nm(b.u)), overdue: (a, b) => b.o - a.o || nm(a.u).localeCompare(nm(b.u)), progress: (a, b) => a.pct - b.pct || nm(a.u).localeCompare(nm(b.u)), active: (a, b) => b.last.localeCompare(a.last) };
    data.sort(by[sort]);
    const tr = data.map(r => {
      let h = `<tr><td><button type="button" class="st-rowbtn" data-student="${esc(r.u.id)}" aria-expanded="${openStudent === r.u.id}">${esc(nm(r.u))}</button>${r.u.role === "admin" ? " " + tag("admin") : ""}</td><td>${r.pct}%</td><td>${r.d}</td><td>${r.g}</td><td>${r.t}</td><td class="${r.o ? "bad" : ""}">${r.o}</td><td>${r.x}</td>`
        + `<td>${r.last ? esc(RC.fmtStamp(r.last, { month: "short", day: "numeric" })) : "never"}</td><td>${r.u.email_reports === false ? "Off" : "On"}</td></tr>`;
      if (openStudent === r.u.id) {
        const p = progOf(r.u), sent = lastSent.get(r.u.id), list = items.slice().sort((a, b) => dueAt(stEffective(a, p)) - dueAt(stEffective(b, p)));
        h += `<tr class="st-detail"><td colspan="9"><p class="m">${esc(r.u.email || "")}${sent ? ` · last ${sent.period === "month" ? "monthly" : "weekly"} report email: ${esc(RC.fmtStamp(sent.emailed_at, { month: "short", day: "numeric" }))}` : " · no report email sent yet"}</p>`
          + list.map(it => studentLine(it, p)).join("") + `<h2>Recent activity</h2><div data-hist="${esc(r.u.id)}">${hist.has(r.u.id) ? histHtml(hist.get(r.u.id)) : '<p class="sub">Loading…</p>'}</div></td></tr>`;
      }
      return h;
    }).join("");
    return `<div class="st-bar-row"><span class="m">${profiles.length} student${profiles.length === 1 ? "" : "s"} · ${itemsNow().length} items this semester</span><select class="st-sel" id="st-sort" aria-label="Sort students"><option value="name">Sort: name</option><option value="overdue">Sort: most overdue</option><option value="progress">Sort: least progress</option><option value="active">Sort: last active</option></select></div>`
      + `<div class="st-scroll"><table class="st-table"><thead><tr><th>Student</th><th>Progress</th><th>Done</th><th>Active</th><th>To do</th><th>Overdue</th><th>Ext.</th><th>Last active</th><th>Emails</th></tr></thead><tbody>${tr}</tbody></table></div>`;
  };

  const extView = () => {
    const ex = extensions();
    if (!ex.length) return '<p class="empty">No extensions yet. When a student extends a deadline, it appears here with their note.</p>';
    return `<p class="sub">Extensions are set by students themselves and are not verified. Compare them with what was actually approved.</p><div class="st-scroll"><table class="st-table"><thead><tr><th>Student</th><th>Item</th><th>Class deadline</th><th>New deadline</th><th>Extra days</th><th>Note</th><th>Set on</th></tr></thead><tbody>`
      + ex.map(({ u, row, it }) => `<tr><td>${esc(nm(u))}</td><td>${it ? esc(cut(it.title, 70)) + `<br><span class="m">${esc(it.subj)}</span>` : "Removed item"}</td><td>${it ? esc(fmt(it.due)) : "–"}</td><td>${esc(fmt(row.personal_due))}</td>`
        + `<td>${it ? "+" + Math.round((Date.parse(row.personal_due + "T00:00:00Z") - Date.parse(it.due + "T00:00:00Z")) / 864e5) : "–"}</td><td>${row.extension_note ? `<span class="st-extnote">“${esc(row.extension_note)}”</span>` : "–"}</td><td>${row.extension_at ? esc(RC.fmtStamp(row.extension_at, { month: "short", day: "numeric" })) : "–"}</td></tr>`).join("") + "</tbody></table></div>";
  };

  const draw = () => {
    const nExt = extensions().length;
    body.innerHTML = `<div class="st-bar-row"><div class="st-filters">${[["overview", "Overview"], ["students", "Students (" + profiles.length + ")"], ["extensions", "Extensions (" + nExt + ")"]].map(([k, l]) => `<button type="button" class="st-pill${k === view ? " on" : ""}" data-tab="${k}" aria-pressed="${k === view}">${l}</button>`).join("")}</div>`
      + (sems.length > 1 && view !== "extensions" ? `<select class="st-sel" id="st-sem" aria-label="Semester">${sems.map(x => `<option value="${x.id}"${x.id === sem ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : "") + `</div>`
      + (view === "overview" ? overview() : view === "students" ? students() : extView());
    const so = body.querySelector("#st-sort"); if (so) so.value = sort;
  };
  const loadHist = async id => {
    if (hist.has(id)) return;
    try { hist.set(id, await Store.admin.logFor(id, 15)); } catch (e) { hist.set(id, []); }
    const box = body.querySelector(`[data-hist="${CSS.escape(id)}"]`); if (box && !stale()) box.innerHTML = histHtml(hist.get(id));
  };

  body.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-tab],[data-item],[data-student]"); if (!t) return;
    if (t.dataset.tab) {
      view = t.dataset.tab; try { history.replaceState(null, "", "#/app/admin/" + view); } catch (err) {}
      draw(); const nb = body.querySelector(`[data-tab="${view}"]`); if (nb) nb.focus(); return;
    }
    if (t.dataset.item) { openItem = openItem === t.dataset.item ? null : t.dataset.item; draw(); const nb = body.querySelector(`[data-item="${CSS.escape(t.dataset.item)}"]`); if (nb) nb.focus(); return; }
    const id = t.dataset.student; openStudent = openStudent === id ? null : id; draw();
    const nb = body.querySelector(`[data-student="${CSS.escape(id)}"]`); if (nb) nb.focus();
    if (openStudent) loadHist(id);
  });
  body.addEventListener("change", e => {
    if (e.target.id === "st-sort") { sort = e.target.value; draw(); const n = body.querySelector("#st-sort"); if (n) n.focus(); }
    if (e.target.id === "st-sem") { sem = Number(e.target.value); openItem = null; draw(); const n = body.querySelector("#st-sem"); if (n) n.focus(); }
  });
  draw();
};
