// My Progress History: every status change, newest first (comes from the append-only progress_log table).
StudentPages.history = async (body, stale) => {
  const log = await Store.log.all(); if (stale()) return;
  const RC = ReportCore, byId = new Map(studentItems().map(i => [i.id, i]));
  const LBL = { todo: "To do", doing: "In progress", done: "Done" };
  let shown = 50;
  body.innerHTML = `<p class="sub">Every time you change a status in <a href="#/app/assignments">My Assignments</a>, it is recorded here.</p><div id="st-hist"></div>`;
  const box = body.querySelector("#st-hist");
  const draw = () => {
    let day = "", html = "";
    log.slice(0, shown).forEach(r => {
      const d = RC.localYMD(r.changed_at), it = byId.get(r.assignment_id);
      if (d !== day) { day = d; html += `<h2>${esc(RC.fmtDay(d, { weekday: "long", month: "short", day: "numeric", year: "numeric" }))}</h2>`; }
      html += `<div class="item st-item"><span class="st-main"><span class="t">${it ? esc(it.title) : "Removed item (" + esc(r.assignment_id) + ")"}</span><br>`
        + `<span class="m">${it ? esc(it.subj) + " · " : ""}${esc(RC.fmtStamp(r.changed_at, { hour: "numeric", minute: "2-digit" }))}</span></span>`
        + `<span class="st-chg">${LBL[r.old_status || "todo"]} → <b class="st-to ${esc(r.new_status)}">${LBL[r.new_status] || esc(r.new_status)}</b></span></div>`;
    });
    if (!html) html = '<p class="empty">No activity yet. Change a status in My Assignments and it will appear here.</p>';
    if (log.length > shown) html += `<p><button type="button" class="st-btn st-quiet" data-more>Show more (${log.length - shown} older)</button></p>`;
    box.innerHTML = html;
  };
  body.addEventListener("click", e => { if (e.target.closest && e.target.closest("[data-more]")) { shown += 50; draw(); } });
  draw();
};
