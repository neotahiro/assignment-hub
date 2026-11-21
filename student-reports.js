// Reports: week-by-week or month-by-month. Numbers come from ReportCore, the same code the email job uses.
StudentPages.reports = async (body, stale) => {
  const [log, prog] = await Promise.all([Store.log.all(), Store.progress.all()]); if (stale()) return;
  const RC = ReportCore;
  const data = () => ({ SUBJECTS, SEMESTERS: typeof SEMESTERS !== "undefined" ? SEMESTERS : [], GENERAL: typeof GENERAL !== "undefined" ? GENERAL : [] });
  let p = RC.period("week", RC.todayYMD());
  const dueText = it => "Due " + RC.fmtDay(it.due, { weekday: "short", month: "short", day: "numeric" }) + (it.time ? ", " + fmtTime(it.time) : "") + (it.origDue ? " · extended from " + RC.fmtDay(it.origDue, { month: "short", day: "numeric" }) : "");
  const row = (it, tag, note) => `<div class="item st-item"><span class="st-main">${it.kind === "reading" ? '<span class="tag">Reading</span>' : ""}<span class="t">${esc(it.title)}</span>${tag || ""}<br><span class="m">${esc(it.subj)} · ${note}</span></span></div>`;
  const list = (title, items, mk, cap = 8) => items.length ? `<h2>${title} <span class="m">(${items.length})</span></h2>${items.slice(0, cap).map(mk).join("")}${items.length > cap ? `<p class="m">and ${items.length - cap} more</p>` : ""}` : "";

  const draw = () => {
    const today = RC.todayYMD(), cur = RC.period(p.type, today), isCur = cur.start === p.start;
    const items = RC.applyExtensions(RC.buildItems(data(), p.end < today ? p.end : today), id => (prog.get(id) || {}).personal_due);   // deadlines include extensions
    const r = RC.compute(items, log, p);
    const n = r.done.length, diff = n - r.prevDone, unit = p.type, prevWord = "previous " + unit;
    const delta = diff > 0 ? `▲ ${diff} more than the ${prevWord}` : diff < 0 ? `▼ ${-diff} fewer than the ${prevWord}` : `same as the ${prevWord}`;
    const when = isCur ? "this " + unit : "that " + unit;
    const summary = n ? `You finished ${n} item${n === 1 ? "" : "s"} ${when}${r.onTime === n ? ", all on time" : ""}. ${delta[0].toUpperCase() + delta.slice(1)}.` : `No items finished ${when}.`;
    const max = Math.max(1, ...r.days.map(d => d.count));
    const bars = r.days.map(d => `<div title="${esc(RC.fmtDay(d.date, { weekday: "short", month: "short", day: "numeric" }))}: ${d.count} finished"><em>${d.count || ""}</em><i style="height:${Math.round(d.count / max * 100)}%"></i><span>${p.type === "week" ? RC.fmtDay(d.date, { weekday: "short" }) : Number(d.date.slice(8))}</span></div>`).join("");
    const older = r.overdue.filter(x => !r.due.missed.some(m => m.id === x.id));
    body.innerHTML = `<div class="st-bar-row"><div class="st-filters">${["week", "month"].map(t => `<button type="button" class="st-pill${t === p.type ? " on" : ""}" data-type="${t}" aria-pressed="${t === p.type}">${t === "week" ? "Weekly" : "Monthly"}</button>`).join("")}</div>`
      + `<div class="st-nav"><button type="button" class="st-pill" data-nav="-1" aria-label="Previous ${unit}">‹</button><b>${esc(r.label)}</b>${r.inProgress ? ' <span class="tag">in progress</span>' : ""}`
      + `<button type="button" class="st-pill" data-nav="1" aria-label="Next ${unit}"${isCur ? " disabled" : ""}>›</button>${isCur ? "" : `<button type="button" class="st-pill" data-nav="0">This ${unit}</button>`}</div></div>`
      + `<p class="st-sum">${esc(summary)}</p>`
      + `<div class="st-stats"><div class="st-stat"><b>${n}</b><span>Finished</span></div><div class="st-stat"><b>${n ? r.onTime + " of " + n : "–"}</b><span>On time</span></div>`
      + `<div class="st-stat"><b>${r.due.done} of ${r.due.total}</b><span>Due ${when}, finished</span></div><div class="st-stat${r.overdue.length ? " bad" : ""}"><b>${r.overdue.length}</b><span>Overdue${r.inProgress ? " now" : " at the end"}</span></div></div>`
      + `<h2>Finished per day</h2><div class="st-days${p.type === "month" ? " month" : ""}" role="img" aria-label="Items finished per day">${bars}</div>`
      + list("Finished", r.done, x => row(x, x.onTime ? "" : ' <span class="tag bad">late</span>', "Done " + esc(RC.fmtStamp(x.at, { weekday: "short", month: "short", day: "numeric" }))))
      + list("Due " + when + " and not finished", r.due.missed, x => row(x, "", dueText(x)))
      + list("Still ahead " + when, r.due.ahead, x => row(x, "", dueText(x)))
      + list("Overdue from earlier", older, x => row(x, "", dueText(x)))
      + list("Coming up next " + (p.type === "week" ? "7" : "30") + " days", r.upcoming, x => row(x, "", dueText(x)))
      + (n || r.due.total || r.overdue.length ? "" : '<p class="empty">Nothing to report for this period.</p>');
  };
  body.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-type],[data-nav]"); if (!t || t.disabled) return;
    if (t.dataset.type) p = RC.period(t.dataset.type, RC.todayYMD());
    else p = t.dataset.nav === "0" ? RC.period(p.type, RC.todayYMD()) : RC.shift(p, Number(t.dataset.nav));
    draw();
    const nb = body.querySelector(t.dataset.type ? `[data-type="${t.dataset.type}"]` : `[data-nav="${t.dataset.nav}"]`); if (nb && !nb.disabled) nb.focus();
  });
  draw();
};
