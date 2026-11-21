// My Calendar: assignment due dates (from data.js) plus your own events. Weeks start on Monday.
StudentPages.calendar = async (body, stale) => {
  const [events0, prog] = await Promise.all([Store.events.list(), Store.progress.all()]); if (stale()) return;
  const RC = ReportCore, today = RC.todayYMD();
  let events = events0, sel = today, y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)) - 1, editing = null;
  const pad = n => String(n).padStart(2, "0"), ymd = (yy, mm, d) => yy + "-" + pad(mm + 1) + "-" + pad(d);
  const dueBy = new Map();
  studentItems().filter(it => it.due).forEach(it => { if (!dueBy.has(it.due)) dueBy.set(it.due, []); dueBy.get(it.due).push(it); });
  const evOn = d => events.filter(e => e.event_date === d);
  const short = (t, n) => esc(t.length > n ? t.slice(0, n - 1) + "…" : t);

  body.innerHTML = `<div class="st-bar-row"><div class="st-nav"><button type="button" class="st-pill" data-cal="-1" aria-label="Previous month">‹</button><b id="st-cal-title"></b><button type="button" class="st-pill" data-cal="1" aria-label="Next month">›</button><button type="button" class="st-pill" data-cal="0">Today</button></div></div>`
    + `<div class="st-cal" id="st-cal"></div><p class="m st-legend"><span class="st-chip a">Due</span> <span class="st-chip over">Overdue</span> <span class="st-chip done">Done</span> <span class="st-chip e">My event</span></p>`
    + `<div class="st-msg" role="status" aria-live="polite"></div><h2 id="st-day-title"></h2><div id="st-day"></div>`
    + `<div class="st-card"><input class="st-in" id="st-ev-t" maxlength="200" placeholder="Event title (e.g. Study group)" aria-label="Event title">`
    + `<textarea class="st-ta" id="st-ev-n" rows="2" maxlength="2000" placeholder="Note (optional)" aria-label="Event note"></textarea>`
    + `<div class="st-row"><button type="button" class="st-btn" data-ev="save" id="st-ev-go"></button><button type="button" class="st-btn st-quiet" data-ev="cancel" id="st-ev-x" hidden>Cancel</button></div></div>`;
  const $q = s => body.querySelector(s);

  const grid = () => {
    $q("#st-cal-title").textContent = RC.fmtDay(ymd(y, m, 1), { month: "long", year: "numeric" });
    const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    let h = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<div class="st-wd">${d}</div>`).join("") + '<div class="st-blank"></div>'.repeat(lead);
    for (let d = 1; d <= days; d++) {
      const date = ymd(y, m, d);
      const chips = (dueBy.get(date) || []).map(it => {
        const st = stStatus(prog, it.id), cls = st === "done" ? "done" : stOverdue(it, prog) ? "over" : "a";
        return `<span class="st-chip ${cls}">${short(it.title, 22)}</span>`;
      }).concat(evOn(date).map(e => `<span class="st-chip e">${short(e.title, 22)}</span>`));
      h += `<button type="button" class="st-cell${date === today ? " today" : ""}${date === sel ? " sel" : ""}" data-date="${date}" aria-pressed="${date === sel}" aria-label="${esc(RC.fmtDay(date, { weekday: "long", month: "long", day: "numeric" }))}, ${chips.length} item${chips.length === 1 ? "" : "s"}">`
        + `<span class="st-dn">${d}</span>${chips.slice(0, 3).join("")}${chips.length > 3 ? `<span class="st-more">+${chips.length - 3}</span>` : ""}</button>`;
    }
    $q("#st-cal").innerHTML = h;
  };
  const day = () => {
    $q("#st-day-title").textContent = RC.fmtDay(sel, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const its = dueBy.get(sel) || [], evs = evOn(sel);
    $q("#st-day").innerHTML = its.map(it => stRow(it, prog, false)).join("")
      + evs.map(e => `<div class="st-card" data-eid="${esc(e.id)}"><div class="t"><span class="tag">My event</span>${esc(e.title)}</div>${e.note ? `<div class="st-nb">${esc(e.note)}</div>` : ""}<div class="st-row"><button type="button" class="st-link" data-ev="edit">Edit</button><button type="button" class="st-link" data-ev="del">Delete</button></div></div>`).join("")
      || (its.length ? "" : '<p class="empty">Nothing on this day.</p>');
    $q("#st-ev-go").textContent = editing ? "Save changes" : "Add event on " + RC.fmtDay(sel, { month: "short", day: "numeric" });
    $q("#st-ev-x").hidden = !editing;
  };
  const redraw = () => { grid(); day(); };

  body.addEventListener("click", async e => {
    const c = e.target.closest && e.target.closest("[data-cal]");
    if (c) { const k = Number(c.dataset.cal); if (k === 0) { y = Number(today.slice(0, 4)); m = Number(today.slice(5, 7)) - 1; sel = today; } else { m += k; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } } redraw(); return; }
    const cell = e.target.closest && e.target.closest("[data-date]");
    if (cell) { sel = cell.dataset.date; editing = null; $q("#st-ev-t").value = ""; $q("#st-ev-n").value = ""; redraw(); const nc = body.querySelector(`[data-date="${sel}"]`); if (nc) nc.focus(); return; }
    const b = e.target.closest && e.target.closest("[data-ev]"); if (!b) return;
    const act = b.dataset.ev, card = b.closest("[data-eid]"), id = card && card.dataset.eid;
    if (act === "edit") { const ev = events.find(x => x.id === id); editing = id; $q("#st-ev-t").value = ev.title; $q("#st-ev-n").value = ev.note || ""; day(); $q("#st-ev-t").focus(); return; }
    if (act === "cancel") { editing = null; $q("#st-ev-t").value = ""; $q("#st-ev-n").value = ""; day(); return; }
    b.disabled = true;
    try {
      if (act === "save") {
        const title = $q("#st-ev-t").value, note = $q("#st-ev-n").value.trim() || null;
        if (editing) { const row = await Store.events.update(editing, { title, note }); events = events.map(x => x.id === editing ? row : x); }
        else events = events.concat([await Store.events.add({ title, event_date: sel, note })]);
        editing = null; $q("#st-ev-t").value = ""; $q("#st-ev-n").value = ""; flash(body, "Saved");
      } else if (act === "del") {
        if (!confirm("Delete this event?")) return;
        await Store.events.remove(id); events = events.filter(x => x.id !== id); flash(body, "Deleted");
      }
      redraw();
    } catch (err) { flash(body, err.message, true); }
    finally { b.disabled = false; }
  });
  redraw();
};
