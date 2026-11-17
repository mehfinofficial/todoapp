(() => {
  const plus = document.getElementById('plus');
  const toggle = document.getElementById('toggle');
  const opts = plus.querySelectorAll('.btn.opt');
  const tabsEl = document.getElementById('tabs');
  const tabs = [...tabsEl.querySelectorAll('.tab')];
  const indicator = tabsEl.querySelector('.indicator');
  const N = tabs.length;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const snd = n => { if (window.UISound) UISound.play(n); };          // sounds.js is optional: no file, no sound, no errors

  /* ====== Header: page title follows the active tab ====== */
  const titleEl = document.getElementById('title');

  /* ====== Header: sound on / off ====== */
  const muteBtn = document.getElementById('mute');
  if (muteBtn) {
    if (!window.UISound) muteBtn.hidden = true;
    else {
      const syncMute = () => {
        const off = UISound.isMuted();
        muteBtn.setAttribute('aria-pressed', String(off));
        muteBtn.setAttribute('aria-label', off ? 'Turn sound on' : 'Turn sound off');
      };
      syncMute();
      muteBtn.addEventListener('click', () => {
        UISound.setMuted(!UISound.isMuted());
        syncMute();
        snd('toggle_on');                                             // only audible when turning sound ON
      });
    }
  }

  /* ====== Tasks screen ====== */
  const fmtTime = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // dummy data, swap for real tasks later. day = offset from today (0 = today)
  const TASKS = [
    
  { id: 1, day: -1, title: 'Finalize Weekly Progress Report', cat: 'Study', time: '8:00 PM', done: true },
  { id: 2, day: 0, title: 'Review Emails and Prioritize Tasks', cat: 'Study', time: '9:15 AM', done: true },
  { id: 3, day: 0, title: 'Complete Morning Fitness Routine', cat: 'Health', time: '7:00 AM', done: true },
    { id: 4, day: 0, title: 'Finalize Monthly Performance Report', cat: 'Study', time: '7:00 PM', done: false },
  { id: 5, day: 0, title: 'Prepare Project Proposal', cat: 'Study', time: '10:00 PM', done: false },
  { id: 6, day: 0, title: 'Purchase Office Supplies', cat: 'Personal', time: '11:30 PM', done: false },
  { id: 7, day: 1, title: 'Submit Client Project Deliverables', cat: 'Study', time: '9:00 AM', done: false },
  { id: 8, day: 1, title: 'Attend Team Planning Meeting', cat: 'Class', time: '2:00 PM', done: false },
  { id: 9, day: 2, title: 'Present Quarterly Project Update', cat: 'Class', time: '10:30 AM', done: false },
  { id: 10, day: 4, title: 'Organize Documents and Files', cat: 'Personal', time: '4:00 PM', done: false }

  ];

  // day picker: yesterday, today, tomorrow (calendar button for other days comes later)
  const OFFSETS = [-1, 0, 1];
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  const dayDate = off => { const d = new Date(TODAY); d.setDate(d.getDate() + off); return d; };
  let selDay = 0;
  let settle = 0, swapT = 0;

  const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12.5l3.2 3.2L17 8.8"/></svg>';
  const sw = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON_OK = sw('M5 12.5l4.5 4.5L19 7.5');
  const ICON_UNDO = sw('M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3');
  const ICON_TRASH = sw('M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3');
  const checkBtn = t => `<button class="check" data-id="${t.id}" aria-label="${t.done ? 'Mark as not done' : 'Mark as done'}: ${esc(t.title)}" aria-pressed="${t.done}">${ICON_CHECK}</button>`;

  const USER_NAME = 'Mehfin';                                  // shown in the hero greeting; swap for the real profile name later
  // Status message for the current progress. Not shown in the hero any more; kept here so it can feed
  // a toast / notification when the user completes a task, e.g. toast(progressMessage(pct)).
  const progressMessage = pct =>
    pct === 0 ? 'Let\u2019s get started' :
    pct < 50 ? 'You\u2019ve got this' :
    pct < 80 ? 'You\u2019re on a roll' :
    pct < 100 ? 'Finish strong' : 'All done for today';
  function renderProgress() {
    const today = TASKS.filter(t => t.day === 0);
    const done = today.filter(t => t.done).length;
    const pct = today.length ? Math.round(done / today.length * 100) : 0;
    const d = new Date();
    const hr = d.getHours();
    document.getElementById('pHello').textContent = (hr < 12 ? 'Morning' : hr < 17 ? 'Afternoon' : 'Evening') + ', ' + USER_NAME;
    document.getElementById('pFull').textContent = d.toLocaleDateString('en-GB', { weekday: 'long' }) + ', ' + d.getDate() + ' ' + d.toLocaleDateString('en-GB', { month: 'long' }) + ', ' + d.getFullYear();
    document.getElementById('pSub').textContent = `${done} of ${today.length} tasks finished`;
    document.getElementById('pPct').textContent = pct + '%';
    document.getElementById('pRing').setAttribute('aria-label', pct + '% of tasks complete');
    const arc = document.getElementById('pArc');
    arc.style.opacity = pct ? 1 : 0;
    arc.style.strokeDasharray = pct + ' 100';
  }

  // ----- relative time ("Upcoming in 49 min") -----
  const startOf = t => {
    const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t.time);
    const d = dayDate(t.day);
    d.setHours((+m[1] % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0), +m[2], 0, 0);
    return d;
  };
  const tMin = t => {                                                  // minutes since midnight; all-day = -1 (top), 12:00 AM = 0 (first of the timed)
    if (t.allDay) return -1;
    const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t.time);
    return ((+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0)) * 60 + +m[2];
  };
  const span = mins => {
    if (mins < 60) return mins + ' min';
    const h = Math.round(mins / 60);
    return h + (h === 1 ? ' hour' : ' hours');
  };
  const ICON_CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';

  // returns { text, state }; state drives the colour: soon | overdue | later | done
  function relInfo(t) {
    if (t.allDay) return t.done ? { text: 'Completed', state: 'done' } :
      { text: t.day > 0 ? dayName(t.day) + ', All day' : 'All day', state: t.day < 0 ? 'overdue' : 'later' };   // never overdue until the day has passed
    if (t.done) return { text: 'Finished at ' + t.time, state: 'done' };
    const mins = Math.round((startOf(t) - Date.now()) / 60000);
    if (t.day > 0) return { text: dayName(t.day) + ', ' + t.time, state: 'later' };
    if (mins < -1) return { text: 'Overdue by ' + span(-mins), state: 'overdue' };
    if (mins <= 1) return { text: 'Starting now', state: 'soon' };
    return { text: 'Upcoming in ' + span(mins), state: mins <= 60 ? 'soon' : 'later' };
  }

  function row(t, i) {
    const r = relInfo(t);
    const meta = `<span class="when when-${r.state}" data-when="${t.id}">${ICON_CLOCK}<span>${esc(r.text)}</span></span>` +
      ((x => x ? `<span class="t-x">${esc(x)}</span>` : '')([t.cat, t.pri === 'high' ? 'High priority' : '', t.series ? 'Repeats' : ''].filter(Boolean).join(' \u00b7 ')));
    return `<li class="swipe${t.done ? ' is-done' : ''}" style="--i:${i || 0}">
      <div class="swipe-bg" aria-hidden="true">
        <span class="act act-l">${t.done ? ICON_UNDO : ICON_OK}<span>${t.done ? 'Undo' : 'Done'}</span></span>
        <span class="act act-r"><span>Delete</span>${ICON_TRASH}</span>
      </div>
      <div class="task${t.done ? ' done' : ''}" data-row="${t.id}">${checkBtn(t)}
        <div class="t-body"><p class="t-title"><span>${esc(t.title)}</span></p><p class="t-meta">${meta}</p></div></div></li>`;
  }

  const daysEl = document.getElementById('days');

  const ICON_CAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3.5"/><path d="M8 3v4M16 3v4M4 11h16"/></svg>';
  const fmtShort = off => dayDate(off).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  function renderDays() {
    if (daysEl.firstElementChild) { syncDays(); return; }              // already built: just update in place so the morph animates
    daysEl.innerHTML = `<div class="seg" role="tablist" aria-label="Choose a day"><span class="pill"></span>${OFFSETS.map(o => {
      const label = dayDate(o).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      return `<button class="day" role="tab" aria-selected="false" data-d="${o}" aria-label="${dayName(o)}, ${label}">${dayName(o)}</button>`;
    }).join('')}</div><button class="cal" aria-label="Pick a date" aria-haspopup="dialog">${ICON_CAL}<span class="cal-t"></span></button>`;
    syncDays();
  }

  const CAL_PAD = 14, CAL_ICON = 24, CAL_GAP = 2;                      // must match .cal (padding of the date pill, icon size, gap)
  let calClear = 0;

  // update the pill / calendar button in place (keeps the slide animation alive)
  function syncDays() {
    const idx = OFFSETS.indexOf(selDay);
    const seg = daysEl.querySelector('.seg'), cal = daysEl.querySelector('.cal');
    seg.classList.toggle('none', idx < 0);
    if (idx >= 0) seg.style.setProperty('--i', idx);
    seg.querySelectorAll('.day').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.d === selDay)));
    cal.classList.toggle('on', idx < 0);

    // calendar button <-> date pill: measure the date text and hand explicit sizes to CSS so width can transition
    const t = cal.querySelector('.cal-t');
    clearTimeout(calClear);
    if (idx < 0) {
      t.textContent = fmtShort(selDay);
      const tw = Math.ceil(t.scrollWidth) + 1;                          // full text width (the box itself is clipped to --tw)
      cal.style.setProperty('--tw', tw + 'px');
      cal.style.setProperty('--cw', (CAL_PAD * 2 + CAL_ICON + CAL_GAP + tw) + 'px');
    } else {
      cal.style.removeProperty('--tw');
      cal.style.removeProperty('--cw');
      calClear = setTimeout(() => { t.textContent = ''; }, 450);        // keep the text while it folds away
    }
  }

  function dayName(off) {
    if (off === 0) return 'Today';
    if (off === 1) return 'Tomorrow';
    if (off === -1) return 'Yesterday';
    return dayDate(off).toLocaleDateString('en-US', Math.abs(off) <= 6 ? { weekday: 'long' } : { month: 'short', day: 'numeric' });
  }

  /* ----- empty state (no events on the selected day) ----- */
  const ICON_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  function emptyState() {
    const soft = Math.abs(selDay) <= 1;                       // "today" / "tomorrow" read better lowercase mid-sentence
    const nm = soft ? dayName(selDay).toLowerCase() : dayName(selDay);
    let title, sub;
    if (selDay === 0) {
      title = 'Your day is wide open';
      sub = 'Nothing on the schedule yet. Add an event and make it count.';
    } else if (selDay > 0) {
      title = `Nothing planned for ${nm}`;
      sub = 'Add an event to give it some shape.';
    } else {
      title = selDay === -1 ? 'Nothing was planned yesterday' : `Nothing was planned for ${nm}`;
      sub = 'Missed something? You can still log an event for this day.';
    }
    return `<div class="empty"><h3>${esc(title)}</h3><p>${esc(sub)}</p>
      <button class="empty-btn" type="button" data-create>${ICON_PLUS}<span>Create event</span></button></div>`;
  }

  // opens the event sheet (pre-filled with the day); any future "add" button can just call createEvent(selDay)
  function createEvent(day) {
    document.dispatchEvent(new CustomEvent('event:create', { detail: { day } }));
  }
  document.getElementById('list').addEventListener('click', e => {
    if (e.target.closest('[data-create]')) createEvent(selDay);
  });

  function renderList(flipFrom, heroId) {
    const list = TASKS.filter(t => t.day === selDay);
    const agenda = list.slice().sort((a, b) => (a.done - b.done) || (tMin(a) - tMin(b)));
    let html = '';

    if (agenda.length) {
      const left = agenda.filter(t => !t.done).length;
      html += `<section class="group"><header class="group-head"><h3>${dayName(selDay)}\u2019s schedule</h3><span>${left ? left + ' remaining' : 'All done'}</span></header>
        <ul class="tasks">${agenda.map(row).join('')}</ul></section>`;
    }
    document.getElementById('list').innerHTML = html || emptyState();
    if (flipFrom) playFlip(flipFrom, heroId);
  }

  /* ----- list motion helpers ----- */
  // top position of every row, keyed by task id (the "First" of FLIP)
  const snapshot = () => new Map([...document.querySelectorAll('#list [data-row]')]
    .map(c => [c.dataset.row, c.parentElement.getBoundingClientRect().top]));

  // after a re-render, glide each row from where it was to where it is now
  function playFlip(before, heroId) {
    if (reduce) return;
    document.querySelectorAll('#list .swipe').forEach(li => {
      const id = li.querySelector('[data-row]').dataset.row;
      const was = before.get(id);
      if (was == null) return;
      const dy = was - li.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      const hero = id === String(heroId);
      if (hero) li.style.zIndex = 3;                                   // travelling card floats above the rest
      const a = li.animate(
        [{ transform: `translateY(${dy}px) scale(${hero ? 1.03 : 1})` }, { transform: 'none' }],
        { duration: 460 + Math.min(260, Math.abs(dy) * 0.35), easing: 'cubic-bezier(.34, 1.28, .5, 1)' });
      a.onfinish = a.oncancel = () => { li.style.zIndex = ''; };
    });
  }

  // little confetti burst out of the check circle
  const SPARK_COLORS = ['#1d1d24'];   // single ink black (add more colors here to mix them back in)
  function sparks(card, chk) {
    const cx = chk.offsetLeft + chk.offsetWidth / 2, cy = chk.offsetTop + chk.offsetHeight / 2;
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('i');
      const ang = (i / 9) * Math.PI * 2 + Math.random() * 0.5, dist = 24 + Math.random() * 14;
      s.className = 'spark';
      s.style.cssText = `left:${cx}px;top:${cy}px;background:${SPARK_COLORS[i % SPARK_COLORS.length]};` +
        `--dx:${(Math.cos(ang) * dist).toFixed(1)}px;--dy:${(Math.sin(ang) * dist).toFixed(1)}px;`;
      card.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
  }

  function celebrate(card, done) {
    if (reduce) return;
    const chk = card.querySelector('.check');
    card.classList.remove('pulse-done', 'pulse-undo');
    void card.offsetWidth;                                             // restart the animation
    card.classList.add(done ? 'pulse-done' : 'pulse-undo');
    setTimeout(() => card.classList.remove('pulse-done', 'pulse-undo'), 650);
    if (chk) {
      chk.classList.remove('pop'); void chk.offsetWidth; chk.classList.add('pop');
      setTimeout(() => chk.classList.remove('pop'), 700);
      if (done) sparks(card, chk);
    }
  }

  function toggleTask(t, el) {
    t.done = !t.done;
    if (!t.allDay && t.done) { t.prev = t.time; t.time = fmtTime(new Date()); }
    else if (!t.allDay && t.prev) { t.time = t.prev; }
    el.classList.toggle('done', t.done);       // animate the check + strike-through right away
    el.parentElement.classList.toggle('is-done', t.done);
    const btn = el.querySelector('.check');
    if (btn) btn.setAttribute('aria-pressed', String(t.done));
    const pill = el.querySelector('[data-when]');                       // "Upcoming in…" -> "Finished at…"
    if (pill) { const r = relInfo(t); pill.className = 'when when-' + r.state; pill.lastElementChild.textContent = r.text; }
    snd(t.done && t.day === 0 && TASKS.filter(x => x.day === 0).every(x => x.done) ? 'celebration'   // last task of today
        : t.done ? 'toggle_on' : 'toggle_off');
    celebrate(el, t.done);
    renderProgress();
    clearTimeout(settle);
    settle = setTimeout(() => renderList(snapshot(), t.id), 650);       // let the effect play, then glide to the new spot
  }

  function deleteTask(t, li, scope) {
    const card = li.querySelector('.task');
    if (t.series && !scope) {                                             // repeating: ask which ones
      card.style.transform = ''; li.style.setProperty('--o', 0); li.classList.remove('armed'); delete li.dataset.dir;
      ask('Delete repeating event', 'Delete only this one, or every event in the series?',
        [['Only this one', 'one'], ['All events', 'all', 'danger'], ['Cancel', 'no']])
        .then(v => { if (v === 'one' || v === 'all') deleteTask(t, li, v); });
      return;
    }
    li.dataset.dir = 'left'; li.style.setProperty('--o', 1);
    snd('swipe_01');
    card.style.transform = `translateX(${-(card.offsetWidth + 24)}px)`;   // slide away
    setTimeout(() => {                                                    // collapse the gap
      li.style.height = li.offsetHeight + 'px';
      li.style.overflow = 'hidden';
      void li.offsetHeight;
      li.style.transition = 'height .3s ease, margin-bottom .3s ease, opacity .3s ease';
      li.style.height = '0px'; li.style.marginBottom = '-10px'; li.style.opacity = '0';
    }, 200);
    setTimeout(() => {
      const gone = scope === 'all' ? TASKS.filter(x => x.series === t.series) : [t];
      const items = gone.map(x => ({ task: x, index: TASKS.indexOf(x) })).filter(x => x.index > -1).sort((a, b) => b.index - a.index);
      items.forEach(x => TASKS.splice(x.index, 1));
      if (items.length) showUndo(items.reverse());
      renderProgress();
      renderList();
    }, 520);
  }

  /* ====== Undo delete: morphing pill with a 10 s countdown ====== */
  const UNDO_MS = 10000, MORPH_DELAY = 400;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.setProperty('--undo', UNDO_MS + 'ms');
  toast.innerHTML = `
    <button class="undo-button" type="button">
      <span class="undo-icon-wrapper" aria-hidden="true">
        <svg class="undo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 14L4 9l5-5"></path>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
        </svg>
      </span>
      <span class="label-wrapper">
        <span class="label-delete">Task deleted</span>
        <span class="label-cancel">Undo</span>
      </span>
      <span class="timer-wrapper" aria-hidden="true">
        <span class="timer-digits">${Array.from({ length: 10 }, (_, i) => `<span>${10 - i}</span>`).join('')}</span>
      </span>
    </button>`;
  document.body.appendChild(toast);
  const undoBtn = toast.querySelector('.undo-button');
  let undoEntry = null, undoT = 0, armT = 0, goneT = 0;

  function hideToast() {
    clearTimeout(undoT); clearTimeout(armT); clearTimeout(goneT);
    undoEntry = null;
    toast.classList.remove('show');
    goneT = setTimeout(() => toast.classList.remove('is-active'), 450);   // reset once it has slid away
  }

  function showUndo(items) {                 // a newer delete replaces the older undo
    clearTimeout(undoT); clearTimeout(armT); clearTimeout(goneT);
    undoEntry = { items };
    snd('notification');
    toast.querySelector('.label-delete').textContent = items.length > 1 ? 'Events deleted' : 'Task deleted';
    undoBtn.setAttribute('aria-label', 'Undo delete: ' + (items.length > 1 ? items.length + ' events' : items[0].task.title));
    toast.classList.remove('is-active');           // start as the solid "Task deleted" pill
    toast.classList.add('show');
    armT = setTimeout(() => {
      toast.classList.add('is-active');            // morph into the glass pill + start the counter
      undoT = setTimeout(hideToast, UNDO_MS);
    }, MORPH_DELAY);
  }

  undoBtn.addEventListener('click', () => {
    if (!undoEntry) return;
    const { items } = undoEntry, task = items[0].task;
    snd('tap');
    hideToast();
    items.forEach(i => TASKS.splice(Math.min(i.index, TASKS.length), 0, i.task));     // back in its old spot
    if (task.day !== selDay) {                                // user moved to another day meanwhile
      selDay = task.day;
      renderDays();
    }
    renderProgress();
    renderList();
    const card = document.querySelector(`[data-row="${task.id}"]`);
    if (card && !reduce) {
      const li = card.parentElement, h = li.offsetHeight;
      li.style.overflow = 'hidden';
      li.animate([{ height: '0px', marginBottom: '-10px', opacity: 0 }, { height: h + 'px', marginBottom: '0px', opacity: 1 }],
        { duration: 380, easing: 'ease' }).onfinish = () => { li.style.overflow = ''; };   // rows below slide down
      card.animate([{ transform: 'translateX(-46px) scale(.96)' }, { transform: 'none' }],
        { duration: 540, easing: 'cubic-bezier(.34, 1.4, .5, 1)' });
    }
  });

  const listEl = document.getElementById('list');

  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.check');
    if (!btn) return;
    const t = TASKS.find(x => x.id === +btn.dataset.id);
    if (t) toggleTask(t, btn.closest('[data-row]'));
  });

  // keyboard: Delete / Backspace on a focused checkbox removes the task
  listEl.addEventListener('keydown', e => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    const btn = e.target.closest('.check');
    const t = btn && TASKS.find(x => x.id === +btn.dataset.id);
    if (t) { e.preventDefault(); deleteTask(t, btn.closest('.swipe')); }
  });

  /* ====== Swipe gestures: right = done / undo, left = delete ====== */
  const SWIPE_AT = 92;                         // px to pull before it triggers
  let g = null;

  listEl.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    const card = e.target.closest('.task');
    if (!card || e.target.closest('.check')) return;
    g = { card, li: card.parentElement, id: +card.dataset.row, x0: e.clientX, y0: e.clientY,
          x: 0, active: false, armed: false, pid: e.pointerId };
  });

  window.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.pid) return;
    let dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (!g.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }   // it's a scroll
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      g.active = true;
      g.x0 = e.clientX; dx = 0;                // start from zero, no jump
      try { g.card.setPointerCapture(e.pointerId); } catch (_) {}
      g.card.classList.add('dragging');
    }
    const a = Math.abs(dx);
    const pulled = a <= SWIPE_AT ? a : SWIPE_AT + (a - SWIPE_AT) * 0.35;   // resist past the trigger point
    g.x = Math.sign(dx) * pulled;
    g.card.style.transform = `translateX(${g.x}px)`;
    g.li.dataset.dir = g.x > 0 ? 'right' : 'left';
    g.li.style.setProperty('--o', Math.min(1, (a / SWIPE_AT) * 1.5).toFixed(3));
    const armed = a >= SWIPE_AT;
    if (armed !== g.armed) {
      g.armed = armed;
      g.li.classList.toggle('armed', armed);
      if (armed && navigator.vibrate) navigator.vibrate(8);
    }
  });

  function swipeEnd(e) {
    if (!g || e.pointerId !== g.pid) return;
    const s = g; g = null;
    if (!s.active) return;
    s.card.classList.remove('dragging');
    const t = TASKS.find(x => x.id === s.id);
    const fire = e.type === 'pointerup' && s.armed && t;
    s.li.classList.remove('armed');
    if (fire && s.x < 0) { deleteTask(t, s.li); return; }
    s.card.style.transform = '';               // spring back
    s.li.style.setProperty('--o', 0);
    if (fire && s.x > 0) toggleTask(t, s.card);
    setTimeout(() => { if (!g || g.li !== s.li) delete s.li.dataset.dir; }, 350);
  }
  window.addEventListener('pointerup', swipeEnd);
  window.addEventListener('pointercancel', swipeEnd);

  function selectDay(off) {
    if (off === selDay) return;
    const dir = Math.sign(off - selDay);                               // +1 = going forward in time
    selDay = off;
    syncDays();
    const list = document.getElementById('list');
    list.style.setProperty('--dx', (dir * 38) + 'px');                 // new day slides in from its side
    clearTimeout(settle);
    renderList();
    list.classList.remove('swap'); void list.offsetWidth; list.classList.add('swap');
    clearTimeout(swapT);
    swapT = setTimeout(() => list.classList.remove('swap'), 950);
  }

  daysEl.addEventListener('click', e => {
    if (e.target.closest('.cal')) { snd('tap'); openPicker(); return; }
    const btn = e.target.closest('.day');
    if (btn) { if (+btn.dataset.d !== selDay) snd('tap'); selectDay(+btn.dataset.d); }
  });

  /* ====== Date picker: glass month sheet ====== */
  const WEEK_START = 1;                         // 0 = Sunday, 1 = Monday
  const CH_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  const CH_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const dayOff = d => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
                                  Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate())) / 864e5);

  const dpBack = document.createElement('div');
  dpBack.className = 'dp-back';
  const dp = document.createElement('div');
  dp.className = 'dp';
  dp.setAttribute('role', 'dialog');
  dp.setAttribute('aria-modal', 'true');
  dp.setAttribute('aria-label', 'Choose a date');
  dp.innerHTML = `<div class="dp-head"><button class="dp-nav" data-m="-1" aria-label="Previous month">${CH_L}</button><h3 class="dp-title" aria-live="polite"></h3><button class="dp-nav" data-m="1" aria-label="Next month">${CH_R}</button></div>
    <div class="dp-wk" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6].map(i => `<span>${new Date(2024, 0, 7 + (WEEK_START + i) % 7).toLocaleDateString('en-US', { weekday: 'short' })}</span>`).join('')}</div>
    <div class="dp-grid"></div>
    <div class="dp-foot"><button class="dp-btn" data-act="today">Today</button><button class="dp-btn" data-act="close">Close</button></div>`;
  document.body.append(dpBack, dp);
  const dpTitle = dp.querySelector('.dp-title'), dpGrid = dp.querySelector('.dp-grid');
  let vy = 0, vm = 0, dpIsOpen = false, dpTarget = 'view', dpFocus = null, dpExt = null;   // dpExt: an outside screen (Finance) borrowing the picker
  const dpCur = () => dpTarget === 'view' ? selDay : dpTarget === 'ext' ? dpExt.off : dpTarget === 'start' ? ev.day : ev.end;

  function renderMonth(dir) {
    const first = new Date(vy, vm, 1);
    dpTitle.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const start = new Date(vy, vm, 1 - (first.getDay() - WEEK_START + 7) % 7);
    let html = '';
    const cur = dpCur();
    const maxOff = dpTarget === 'ext' && dpExt.max != null ? dpExt.max : Infinity;   // days after this are greyed out
    for (let i = 0; i < 42; i++) {                // always 6 rows so the sheet never changes height
      const d = new Date(start); d.setDate(start.getDate() + i);
      const off = dayOff(d), mine = dpTarget === 'view' ? TASKS.filter(t => t.day === off) : [];   // no dots while choosing an event date
      const dot = mine.length ? (mine.every(t => t.done) ? 'f' : 'h') : '';
      const full = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      html += `<button class="dp-d${d.getMonth() !== vm ? ' out' : ''}${off === 0 ? ' today' : ''}${off === cur ? ' sel' : ''}" data-o="${off}" aria-label="${full}" aria-pressed="${off === cur}"${off > maxOff ? ' disabled' : ''}>${d.getDate()}${dot ? `<i class="dp-dot ${dot}"></i>` : ''}</button>`;
    }
    dpGrid.innerHTML = html;
    if (dir && !reduce) {
      dpGrid.style.setProperty('--mx', dir * 30 + 'px');
      dpGrid.classList.remove('anim'); void dpGrid.offsetWidth; dpGrid.classList.add('anim');
    }
  }

  function openPicker(target = 'view', from = null) {
    dpTarget = target; dpFocus = from;
    setOpen(false);                               // close the plus menu if it is open
    const s = dayDate(dpCur() ?? ev.day);
    vy = s.getFullYear(); vm = s.getMonth();
    renderMonth();
    dpIsOpen = true;
    dpBack.classList.add('open');
    dp.classList.add('open');
    const sel = dpGrid.querySelector('.sel');
    if (sel) sel.focus({ preventScroll: true });
  }
  function closePicker() {
    if (!dpIsOpen) return;
    dpIsOpen = false;
    dpBack.classList.remove('open');
    dp.classList.remove('open');
    const cal = dpTarget === 'view' ? daysEl.querySelector('.cal') : dpFocus;
    if (cal) cal.focus({ preventScroll: true });
  }
  function pickDate(off) {
    snd('tap');
    if (dpTarget === 'view') selectDay(off);
    else if (dpTarget === 'ext') { dpExt.off = off; dpExt.cb(dayDate(off)); }
    else evPick(off);
    dpGrid.querySelectorAll('.dp-d').forEach(b => {
      const on = +b.dataset.o === dpCur();
      b.classList.toggle('sel', on); b.setAttribute('aria-pressed', String(on));
    });
    setTimeout(closePicker, 180);                 // let the selection show for a beat
  }

  dp.addEventListener('click', e => {
    const nav = e.target.closest('.dp-nav');
    if (nav) {
      const m = +nav.dataset.m;
      vm += m;
      if (vm < 0) { vm = 11; vy--; } else if (vm > 11) { vm = 0; vy++; }
      snd('tap');
      renderMonth(m);
      return;
    }
    const day = e.target.closest('.dp-d');
    if (day) { pickDate(+day.dataset.o); return; }
    const act = e.target.closest('.dp-btn');
    if (!act) return;
    if (act.dataset.act === 'today') pickDate(0); else { snd('tap'); closePicker(); }
  });
  dpBack.addEventListener('click', closePicker);
  // other screens use the same sheet: DatePicker.open(startDate, date => ..., { max: latestDate, from: buttonToRefocus })
  window.DatePicker = { open(date, cb, o = {}) { dpExt = { off: dayOff(date), max: o.max ? dayOff(o.max) : null, cb }; openPicker('ext', o.from || null); } };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && dpIsOpen) { e.preventDefault(); closePicker(); } });

  /* ====== Event maker (in-memory only: a reload resets to the dummy data until the database exists) ====== */
  const CATS = ['Study', 'Health', 'Personal', 'Class'], CAT_MAX = 8, CAT_LEN = 14;
  const MAX_OCC = { daily: 60, weekly: 26, monthly: 12 };                             // repeats with no end date
  const pad = n => String(n).padStart(2, '0');
  const DF_EV = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });                  // built once, not on every open
  const DF_EVY = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const tmText = m => `${(m / 60 | 0) % 12 || 12}:${pad(m % 60)} ${m >= 720 ? 'PM' : 'AM'}`;
  const dayMs = (off, m) => { const d = dayDate(off); d.setHours(0, m, 0, 0); return d.getTime(); };
  const defTm = day => day === 0 ? Math.min(1435, Math.ceil((new Date().getHours() * 60 + new Date().getMinutes() + 1) / 30) * 30) : 540;
  const chips = (k, list) => list.map(([v, l]) => `<button type="button" class="ev-chip" data-${k}="${v}" aria-pressed="false">${l}</button>`).join('');
  const swRow = (k, label) => `<div class="ev-row"><span>${label}</span><button type="button" class="ev-sw" role="switch" data-sw="${k}" aria-label="${label}" aria-checked="false"><i></i></button></div>`;
  let nextId = Math.max(0, ...TASKS.map(t => t.id)) + 1, nextSeries = 1;

  const evBack = document.createElement('div'); evBack.className = 'ev-back';
  const evEl = document.createElement('div'); evEl.className = 'ev';
  evEl.setAttribute('role', 'dialog'); evEl.setAttribute('aria-modal', 'true'); evEl.setAttribute('aria-label', 'New event');
  const IC = {
    all: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="3.6"/></svg>',
    rep: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2.5l3.5 3.5L17 9.5"/><path d="M3.5 11V9.5A3.5 3.5 0 017 6h13.5"/><path d="M7 21.5L3.5 18 7 14.5"/><path d="M20.5 13v1.5A3.5 3.5 0 0117 18H3.5"/></svg>',
    end: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h12l-2.2 4L17 12H5"/></svg>',
    rem: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/></svg>',
    cat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.2V4.5a1 1 0 011-1h7.7a1 1 0 01.7.3l7.3 7.3a1 1 0 010 1.4l-7.7 7.7a1 1 0 01-1.4 0l-7.3-7.3a1 1 0 01-.3-.7z"/><circle cx="8" cy="8" r="1.4"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };
  const ic = (cls, svg) => `<i class="ev-ic ${cls}">${svg}</i>`;
  const seg = (k, list, dots) => `<div class="ev-seg" data-seg="${k}" style="--n:${list.length}">` + list.map(([v, l]) => `<button type="button" class="ev-sg" data-${k}="${v}" aria-pressed="false">${dots ? `<i class="pd pd-${v}"></i>` : ''}${l}</button>`).join('') + '</div>';
  const swCard = (k, label, icon, cls, body) => `<div class="ev-card"><div class="ev-r">${ic(cls, icon)}<b>${label}</b><button type="button" class="ev-sw" role="switch" data-sw="${k}" aria-label="${label}" aria-checked="false"><i></i></button></div>${body}</div>`;
  evEl.innerHTML = `
    <div class="ev-grab" aria-hidden="true"></div>
    <div class="ev-head"><h3>New event</h3><button type="button" class="ev-x" data-x aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="ev-body">
      <input class="ev-title" maxlength="80" placeholder="Name your event" aria-label="Event title" autocomplete="off">
      <p class="ev-lbl">When</p>
      <div class="ev-card ev-when">
        <button type="button" class="ev-field ev-r" data-date aria-haspopup="dialog">${ic('ic-date', ICON_CAL)}<b>Date</b><span class="ev-val"></span></button>
        <button type="button" class="ev-field ev-r" data-time aria-haspopup="dialog">${ic('ic-time', ICON_CLOCK)}<b>Time</b><span class="ev-val"></span></button>
        <div class="ev-r">${ic('ic-all', IC.all)}<b>All day</b><button type="button" class="ev-sw" role="switch" data-sw="all" aria-label="All day" aria-checked="false"><i></i></button></div>
      </div>
      <p class="ev-hint" data-h="time" hidden></p>
      <p class="ev-lbl">Priority</p>
      <div class="ev-card pad">${seg('pri', [['low', 'Low'], ['med', 'Medium'], ['high', 'High']], true)}</div>
      <button type="button" class="ev-more" data-more aria-expanded="false">${ic('ic-more', IC.more)}<span class="ev-more-t">More options</span><span class="ev-more-s"></span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="ev-fold" id="evMore"><div>
        <div class="ev-card">
          <div class="ev-r">${ic('ic-rep', IC.rep)}<b>Repeat</b></div>
          <div class="ev-segrow">${seg('rep', [['none', 'Never'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']])}</div>
          <div class="ev-fold" id="evEnds"><div>
            <div class="ev-r">${ic('ic-end', IC.end)}<b>Ends</b></div>
            <div class="ev-segrow">${seg('end', [['never', 'Never'], ['date', 'On date']])}<p class="ev-hint err" data-h="end" hidden></p></div>
          </div></div>
        </div>
        ${swCard('rem', 'Reminder', IC.rem, 'ic-rem', `<div class="ev-fold" id="evRem"><div><div class="ev-sub"><div class="ev-chips" data-g="rem">${chips('rem', [[0, 'At time'], [5, '5 min'], [10, '10 min'], [30, '30 min'], [60, '1 hour']])}</div><p class="ev-hint" data-h="rem" hidden></p></div></div></div>`)}
        ${swCard('cat', 'Category', IC.cat, 'ic-cat', `<div class="ev-fold" id="evCat"><div><div class="ev-sub"><div class="ev-chips" data-g="cat"></div>
          <div class="ev-add" hidden><input maxlength="${CAT_LEN}" placeholder="New category" aria-label="New category" autocomplete="off"><button type="button" class="ev-chip on" data-addok>Add</button></div>
          <p class="ev-hint err" data-h="cat" hidden></p></div></div></div>`)}
      </div></div>
    </div>
    <div class="ev-foot"><button type="button" class="ev-save" data-save disabled>${IC.ok}<span>Save event</span></button></div>`;
  document.body.append(evBack, evEl);

  const $ = s => evEl.querySelector(s), $$ = s => [...evEl.querySelectorAll(s)];
  const ev = {};
  let evOpen = false, moreOpen = false, addOpen = false, lastFocus = null;

  const fold = (id, on) => $(id).classList.toggle('open', on);
  const hint = (k, msg) => { const p = $(`[data-h=${k}]`); p.textContent = msg || ''; p.hidden = !msg; };
  const mark = (a, v) => $$(`[data-${a}]`).forEach(b => { const on = v != null && String(b.dataset[a]) === String(v); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  const isPast = () => ev.allDay ? ev.day < 0 : dayMs(ev.day, ev.tm) < Date.now();
  const remAt = day => ev.allDay ? dayMs(day, 540) : dayMs(day, ev.tm) - ev.remMin * 6e4;   // all-day reminders fire at 9:00 AM
  const endBad = () => ev.rep !== 'none' && ev.end != null && ev.end <= ev.day;
  const canSave = () => !!ev.title.trim() && !endBad();

  function moreSummary() {
    const p = [];
    if (ev.rep !== 'none') p.push('Repeats ' + ev.rep);
    p.push(!ev.rem ? 'Auto reminder' : ev.allDay ? '9 AM reminder' : ev.remMin ? (ev.remMin === 60 ? '1 hr' : ev.remMin + ' min') + ' reminder' : 'Reminder at time');
    if (ev.cat) p.push(ev.cat);
    return p.join(' \u00b7 ');
  }

  function renderCats() {
    $('[data-g=cat]').innerHTML = chips('cat', CATS.map(c => [esc(c), esc(c)])) +
      '<button type="button" class="ev-chip" data-addcat aria-label="New category">+</button>';
  }

  function sync() {
    const d = dayDate(ev.day);
    $('[data-date] span').textContent = (Math.abs(ev.day) <= 1 ? dayName(ev.day) + ' \u00b7 ' : '') +
      (d.getFullYear() !== TODAY.getFullYear() ? DF_EVY : DF_EV).format(d);
    $('[data-time]').hidden = ev.allDay;                            // all day hides the time picker (the picked time is kept)
    $('[data-time] span').textContent = tmText(ev.tm);
    if (endBad()) moreOpen = true;                                    // never hide an error
    fold('#evMore', moreOpen); $('[data-more]').setAttribute('aria-expanded', String(moreOpen));
    $('.ev-more-s').textContent = moreSummary();
    $$('[data-sw]').forEach(b => b.setAttribute('aria-checked', String({ all: ev.allDay, rem: ev.rem, cat: ev.catOn }[b.dataset.sw])));
    mark('pri', ev.pri); mark('rep', ev.rep); mark('rem', ev.remMin); mark('end', ev.end != null ? 'date' : 'never'); mark('cat', ev.cat);
    $('[data-end=date]').textContent = ev.end != null ? fmtShort(ev.end) : 'On date';
    fold('#evEnds', ev.rep !== 'none');
    [['pri', ['low', 'med', 'high'].indexOf(ev.pri)], ['rep', ['none', 'daily', 'weekly', 'monthly'].indexOf(ev.rep)], ['end', ev.end != null ? 1 : 0]]
      .forEach(([k, i]) => $(`[data-seg=${k}]`).style.setProperty('--i', i));
    fold('#evRem', ev.rem); $('[data-g=rem]').hidden = ev.allDay;
    fold('#evCat', ev.catOn); $('.ev-add').hidden = !addOpen;
    $('[data-addcat]').hidden = CATS.length >= CAT_MAX;
    if (!addOpen) hint('cat', '');
    hint('time', isPast() ? (ev.allDay ? 'That day has passed, so this will show as overdue.' : 'That time has passed, so this will show as overdue.') : '');
    hint('end', endBad() ? 'The end date must be after the start date.' : '');
    hint('rem', !ev.rem || isPast() ? '' : remAt(ev.day) < Date.now() ? 'That reminder time has already passed, so it will be marked as due right away.' : ev.allDay ? 'You\u2019ll be reminded at 9:00 AM that day.' : '');
    $('.ev-save').disabled = !canSave();
  }

  /* ----- time picker: bottom sheet in the same family as the date picker ----- */
  const WI = { h: Array.from({ length: 12 }, (_, i) => String(i + 1)), m: Array.from({ length: 60 }, (_, i) => pad(i)), p: ['AM', 'PM'] };
  const wh = { h: 0, m: 0, p: 0 }; let wlock = 0, tpOpen = false, tpFrom = null;
  const tpBack = document.createElement('div'); tpBack.className = 'dp-back';
  const tp = document.createElement('div'); tp.className = 'dp tp';
  tp.setAttribute('role', 'dialog'); tp.setAttribute('aria-modal', 'true'); tp.setAttribute('aria-label', 'Select time');
  tp.innerHTML = `<div class="dp-head"><h3 class="dp-title">Select time</h3></div>
    <div class="tp-read" aria-live="polite"></div>
    <div class="wh"><div class="wh-col" data-w="h" role="listbox" aria-label="Hour" tabindex="0"></div><div class="wh-col" data-w="m" role="listbox" aria-label="Minute" tabindex="0"></div><div class="wh-col" data-w="p" role="listbox" aria-label="AM or PM" tabindex="0"></div></div>
    <div class="dp-foot"><button type="button" class="dp-btn" data-act="now">Now</button><button type="button" class="dp-btn tp-done" data-act="done">Done</button></div>`;
  document.body.append(tpBack, tp);
  const tq = s => tp.querySelector(s);
  const whTm = () => (((wh.h + 1) % 12) + wh.p * 12) * 60 + wh.m;
  const whFromTm = () => { wh.h = ((ev.tm / 60 | 0) % 12 || 12) - 1; wh.m = ev.tm % 60; wh.p = ev.tm >= 720 ? 1 : 0; };
  const wmark = k => [...tq(`[data-w=${k}]`).children].forEach((c, j) => c.classList.toggle('on', j === wh[k]));
  const tpRead = () => { tq('.tp-read').innerHTML = `${(ev.tm / 60 | 0) % 12 || 12}:${pad(ev.tm % 60)}<small>${ev.tm >= 720 ? 'PM' : 'AM'}</small>`; };
  function placeWh(smooth) {
    wlock = Date.now() + (smooth ? 500 : 150);                       // ignore the scroll events we cause ourselves
    Object.keys(WI).forEach(k => { tq(`[data-w=${k}]`).scrollTo({ top: wh[k] * 40, behavior: smooth && !reduce ? 'smooth' : 'auto' }); wmark(k); });
  }
  Object.keys(WI).forEach(k => {
    const col = tq(`[data-w=${k}]`); let wt = 0;
    col.innerHTML = WI[k].map((t, i) => `<div role="option" data-i="${i}">${t}</div>`).join('');
    const set = i => { const was = wh[k]; wh[k] = Math.max(0, Math.min(WI[k].length - 1, i)); if (wh[k] !== was) snd('tap'); ev.tm = whTm(); ev.tmTouched = true; tpRead(); sync(); };
    col.addEventListener('click', e => { const o = e.target.closest('[data-i]'); if (o) { set(+o.dataset.i); placeWh(true); } });
    col.addEventListener('keydown', e => { const s = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0; if (s) { e.preventDefault(); set(wh[k] + s); placeWh(true); } });
    col.addEventListener('scroll', () => {
      if (Date.now() < wlock) return;
      clearTimeout(wt);
      wt = setTimeout(() => { const i = Math.round(col.scrollTop / 40); if (i !== wh[k]) set(i); wmark(k); }, 90);
    });
  });
  function openTp(from) {
    tpFrom = from; whFromTm(); tpRead();
    tpBack.classList.add('open'); tp.classList.add('open'); tpOpen = true;
    placeWh(); tq('.tp-done').focus({ preventScroll: true });
  }
  function closeTp() {
    if (!tpOpen) return;
    tpOpen = false; tpBack.classList.remove('open'); tp.classList.remove('open');
    if (tpFrom) tpFrom.focus({ preventScroll: true });
  }
  tpBack.addEventListener('click', closeTp);
  tp.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    snd('tap');
    if (b.dataset.act === 'done') closeTp();
    else { const n = new Date(); ev.tm = n.getHours() * 60 + n.getMinutes(); ev.tmTouched = true; whFromTm(); tpRead(); placeWh(true); sync(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && tpOpen) { e.preventDefault(); closeTp(); } });

  /* ----- categories ----- */
  function addCat() {
    const inp = $('.ev-add input');
    const v = inp.value.trim().replace(/\s+/g, ' ').slice(0, CAT_LEN).trim();
    const err = !v ? 'Enter a category name.' :
      CATS.some(c => c.toLowerCase() === v.toLowerCase()) ? 'That category already exists.' :
      CATS.length >= CAT_MAX ? 'You can have up to 8 categories.' : '';
    if (err) { hint('cat', err); snd('caution'); return; }
    CATS.push(v); ev.cat = v; inp.value = ''; addOpen = false;       // the new one is selected straight away
    renderCats(); sync();
  }
  $('.ev-add input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addCat(); }
    else if (e.key === 'Escape') { e.preventDefault(); addOpen = false; sync(); }
  });
  $('.ev-add input').addEventListener('input', () => hint('cat', ''));
  $('.ev-title').addEventListener('input', e => { ev.title = e.target.value; sync(); });

  evEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset; let focusAdd = false;
    if ('x' in d) { tryClose(); return; }
    if ('save' in d) { saveEvent(); return; }
    if ('date' in d) { snd('tap'); openPicker('start', b); return; }
    else if ('time' in d) { snd('tap'); openTp(b); return; }
    else if ('more' in d) moreOpen = !moreOpen;
    else if ('sw' in d) {
      if (d.sw === 'all') ev.allDay = !ev.allDay;
      else if (d.sw === 'rem') ev.rem = !ev.rem;
      else { ev.catOn = !ev.catOn; if (!ev.catOn) { ev.cat = null; addOpen = false; } }   // off = no category
    }
    else if ('pri' in d) ev.pri = d.pri;
    else if ('rep' in d) ev.rep = d.rep;
    else if ('rem' in d) ev.remMin = +d.rem;
    else if ('end' in d) { if (d.end === 'never') ev.end = null; else { snd('tap'); openPicker('end', b); return; } }
    else if ('cat' in d) ev.cat = ev.cat === d.cat ? null : d.cat;
    else if ('addcat' in d) { addOpen = !addOpen; focusAdd = addOpen; }
    else if ('addok' in d) { addCat(); return; }
    sync();
    snd('sw' in d ? ({ all: ev.allDay, rem: ev.rem, cat: ev.catOn }[d.sw] ? 'toggle_on' : 'toggle_off') : 'tap');   // switches click on/off, chips just tap
    if (focusAdd) requestAnimationFrame(() => $('.ev-add input').focus());
  });

  // called by the date picker when it is used for this sheet
  function evPick(off) {
    if (dpTarget === 'start') {
      ev.day = off;
      if (!ev.tmTouched) ev.tm = defTm(off);
    } else ev.end = off;
    sync();
    if (endBad()) snd('caution');
  }

  /* ----- confirm dialog (discard / delete a repeating event) ----- */
  function ask(title, text, btns) {
    return new Promise(res => {
      const b = document.createElement('div'); b.className = 'ev-back open ask-back';
      const d = document.createElement('div'); d.className = 'ask';
      d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', title);
      d.innerHTML = `<h3>${esc(title)}</h3><p>${esc(text)}</p><div>${btns.map(([l, v, k]) => `<button type="button" class="ask-btn ${k || ''}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
      document.body.append(b, d);
      const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done(null); } };
      const done = v => { document.removeEventListener('keydown', key, true); b.remove(); d.remove(); res(v); };
      document.addEventListener('keydown', key, true);
      b.onclick = () => done(null);
      d.onclick = e => { const x = e.target.closest('.ask-btn'); if (x) { snd('tap'); done(x.dataset.v); } };
      d.querySelector('.ask-btn').focus();
    });
  }

  /* ----- open / close ----- */
  function openEvent(day) {
    if (plus.classList.contains('open')) setOpen(false);   // don't wake the spring loop when the menu is already closed
    Object.assign(ev, { day, end: null, title: '', allDay: false, tm: defTm(day), tmTouched: false, pri: 'med', rep: 'none',
      rem: false, remMin: 10, catOn: false, cat: null });   // reminder is off by default; 10 min is preselected for when it's turned on
    snd('tap');                                              // new-task sheet opens (same as date picker)
    moreOpen = addOpen = false;
    $('.ev-title').value = ''; $('.ev-add input').value = '';
    evEl.classList.add('snap');                              // no transitions while the sheet is refilled
    renderCats(); sync();
    lastFocus = document.activeElement;
    evBack.classList.add('open'); evEl.classList.add('open'); evOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => evEl.classList.remove('snap')));
    // don't auto-focus the name field (it would pop the keyboard before the user has seen the options);
    // park focus on the sheet itself so screen readers and Esc still work
    evEl.tabIndex = -1;
    requestAnimationFrame(() => { if (evOpen) evEl.focus({ preventScroll: true }); });   // focus after the first frame, not before it
    setTimeout(() => { if (evOpen && !evEl.contains(document.activeElement)) evEl.focus({ preventScroll: true }); }, 80);
  }
  function closeEv() {
    if (!evOpen) return;
    evOpen = false;
    evBack.classList.remove('open'); evEl.classList.remove('open');
    setTimeout(() => { if (!evOpen) $('.ev-body').scrollTop = 0; }, 700);   // reset scroll once hidden (reading scrollTop on open forced a layout)
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  async function tryClose() {
    if (ev.title.trim()) {                                           // only an empty sheet closes straight away
      const r = await ask('Discard this event?', 'What you\u2019ve entered will be lost.', [['Keep editing', 'keep'], ['Discard', 'discard', 'danger']]);
      if (r !== 'discard') return;
    }
    snd('tap');                                              // new-task sheet closes (same as date picker)
    closeEv();
  }
  evBack.addEventListener('click', tryClose);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && evOpen && !e.defaultPrevented) tryClose(); });
  document.addEventListener('event:create', e => openEvent(e.detail.day));

  /* ----- save ----- */
  function occurrences() {
    const out = [ev.day];
    if (ev.rep === 'none') return out;
    const max = ev.end != null ? 366 : MAX_OCC[ev.rep], d0 = dayDate(ev.day);
    for (let i = 1; out.length < max; i++) {
      const d = new Date(d0);
      if (ev.rep === 'daily') d.setDate(d0.getDate() + i);
      else if (ev.rep === 'weekly') d.setDate(d0.getDate() + 7 * i);
      else { d.setDate(1); d.setMonth(d0.getMonth() + i); d.setDate(Math.min(d0.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
      const o = dayOff(d);
      if (ev.end != null && o > ev.end) break;
      out.push(o);
    }
    return out;
  }

  function saveEvent() {
    if (!canSave()) return;
    const series = ev.rep !== 'none' ? nextSeries++ : 0, made = [], now = Date.now();
    occurrences().forEach(o => {
      const t = { id: nextId++, day: o, title: ev.title.trim(), cat: ev.catOn ? ev.cat : null, done: false,
        pri: ev.pri, rep: ev.rep, series, allDay: ev.allDay };
      if (!ev.allDay) t.time = tmText(ev.tm);
      const past = ev.allDay ? o < 0 : dayMs(o, ev.tm) < now;
      const at = ev.allDay ? dayMs(o, 540) : dayMs(o, ev.tm) - ev.remMin * 6e4;
      t.remAt = at;
      t.remState = !ev.rem || past ? 'off' : at <= now ? 'due' : 'scheduled';   // already-passed reminders are marked due, never scheduled in the past
      TASKS.push(t); made.push(t);
    });
    snd('select');
    closeEv();
    if (ev.day !== selDay) selectDay(ev.day); else renderList(snapshot());
    renderProgress();
    const card = document.querySelector(`[data-row="${made[0].id}"]`);
    if (card && !reduce) {
      const li = card.parentElement, h = li.offsetHeight;
      li.style.overflow = 'hidden';
      li.animate([{ height: '0px', marginBottom: '-10px', opacity: 0 }, { height: h + 'px', marginBottom: '0px', opacity: 1 }], { duration: 380, easing: 'ease' }).onfinish = () => { li.style.overflow = ''; };
      card.animate([{ transform: 'translateX(-46px) scale(.96)' }, { transform: 'none' }], { duration: 540, easing: 'cubic-bezier(.34, 1.4, .5, 1)' });
    }
  }

  // reminders: scheduled -> due when their time arrives (hook real notifications onto 'event:reminder' later)
  setInterval(() => TASKS.forEach(t => {
    if (t.remState === 'scheduled' && t.remAt <= Date.now()) {
      t.remState = 'due';
      document.dispatchEvent(new CustomEvent('event:reminder', { detail: { task: t } }));
    }
  }), 15000);

  renderDays();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (daysEl.firstElementChild) syncDays(); });
  renderList();
  renderProgress();
  setInterval(() => {
    document.querySelectorAll('[data-when]').forEach(el => {
      const t = TASKS.find(x => x.id === +el.dataset.when);
      if (!t) return;
      const r = relInfo(t);
      el.className = 'when when-' + r.state;
      el.lastElementChild.textContent = r.text;
    });
  }, 30000);
  {
    const arc = document.getElementById('pArc'), v = arc.style.strokeDasharray;
    arc.style.strokeDasharray = '0 100';           // replay the ring fill on load
    requestAnimationFrame(() => requestAnimationFrame(() => { arc.style.strokeDasharray = v; }));
  }

  /* ====== Tab switch: nav + pill spread, pill travels, then both pinch back ====== */
  const NAV = document.querySelector('.nav');
  const PILL = { x: 1.24, y: 1.4 };      // pill size at full spread (see your screenshot)
  const BAR  = { x: 1.025, y: 1.07 };    // nav bar size at full spread
  const POS_SPRING   = { k: 300, c: 31 };  // travel to the tapped tab (higher c = less bounce)
  const SCALE_SPRING = { k: 320, c: 30 };  // spread up / pinch back (higher c = less bounce)
  const ARRIVE = 0.18;                     // start shrinking when this close (tab units)

  const st = {
    x: 0, vx: 0, tx: 0,      // pill position in tab units
    s: 0, vs: 0, ts: 0,      // spread amount: 0 = rest, 1 = fully spread
    traveling: false,
    raf: 0, last: 0
  };

  function render() {
    // slight stretch while moving fast
    const stretch = reduce ? 0 : Math.min(Math.abs(st.vx), 14) * 0.012;
    const k = st.s;
    const px = (1 + k * (PILL.x - 1)) * (1 + stretch);
    const py = (1 + k * (PILL.y - 1)) * (1 - stretch * 0.5);
    indicator.style.transform = `translateX(${st.x * 100}%) scale(${px / (1 + k * (BAR.x - 1))}, ${py / (1 + k * (BAR.y - 1))})`;
    NAV.style.transform = `scale(${1 + k * (BAR.x - 1)}, ${1 + k * (BAR.y - 1)})`;
  }

  function step(t) {
    const dt = Math.min((t - st.last) / 1000 || 0.016, 0.032);
    st.last = t;
    const n = 4, h = dt / n;
    for (let i = 0; i < n; i++) {
      const ax = -POS_SPRING.k * (st.x - st.tx) - POS_SPRING.c * st.vx;
      st.vx += ax * h; st.x += st.vx * h;
      const as = -SCALE_SPRING.k * (st.s - st.ts) - SCALE_SPRING.c * st.vs;
      st.vs += as * h; st.s += st.vs * h;
    }
    // reached the tapped tab -> shrink back
    if (st.traveling && Math.abs(st.x - st.tx) < ARRIVE) {
      st.traveling = false;
      st.ts = (holding && !reduce) ? 1 : 0;
    }
    render();
    const resting =
      !st.traveling &&
      Math.abs(st.x - st.tx) < 0.0005 && Math.abs(st.vx) < 0.005 &&
      Math.abs(st.s - st.ts) < 0.0005 && Math.abs(st.vs) < 0.005;
    if (resting) {
      st.x = st.tx; st.s = st.ts; st.vx = st.vs = 0;
      render(); st.raf = 0; return;
    }
    st.raf = requestAnimationFrame(step);
  }
  function wake() {
    if (!st.raf) { st.last = performance.now(); st.raf = requestAnimationFrame(step); }
  }

  let selected = 0;
  let holding = false;
  let pressedTab = -1;
  function goTo(i) {
    if (i === selected) return;
    selected = i;
    snd('tap');
    titleEl.textContent = tabs[i].getAttribute('aria-label');
    document.dispatchEvent(new CustomEvent('tabchange', { detail: { index: i } }));   // screens (finance.js) listen to this
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    tabsEl.style.setProperty('--i', i);
    st.tx = i;
    st.traveling = true;
    st.ts = reduce ? 0 : 1;      // spread (stays spread until it arrives, or the hold ends)
    if (reduce) { st.x = i; st.traveling = false; }
    wake();
  }

  // Hold: pressing a tab spreads the pill + nav bar. Release: shrink back,
  // and if released on the pressed tab, switch to it. No swipe-to-switch.
  function endHold(e) {
    if (!holding) return;
    holding = false;
    const tab = tabs[pressedTab];
    pressedTab = -1;
    let onTab = false;
    if (e && e.type === 'pointerup' && tab) {
      const r = tab.getBoundingClientRect();
      onTab = e.clientX >= r.left && e.clientX <= r.right &&
              e.clientY >= r.top && e.clientY <= r.bottom;
    }
    if (onTab && tabs.indexOf(tab) !== selected) {
      goTo(tabs.indexOf(tab));          // already spread -> travels, then shrinks
    } else {
      st.traveling = false;
      st.ts = 0;                        // plain release: pinch back as it is
      wake();
    }
  }

  tabs.forEach((tab, i) => tab.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    holding = true;
    pressedTab = i;
    if (!reduce) { st.ts = 1; wake(); }  // spread while held
  }));
  window.addEventListener('pointerup', endHold);
  window.addEventListener('pointercancel', endHold);
  tabsEl.addEventListener('contextmenu', e => e.preventDefault());

  // keyboard only (Enter/Space fire a click with detail 0)
  tabs.forEach((tab, i) => tab.addEventListener('click', e => {
    if (e.detail === 0) goTo(i);
  }));
  tabs.forEach((tab, i) => tab.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const j = Math.max(0, Math.min(N - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    tabs[j].focus(); goTo(j);
  }));

  render();

  /* ====== Plus button: hold / click -> bigger + white, then settles back ====== */
  const PLUS_BIG = 1.28;                    // size while held / changing (see your screenshot)
  const PLUS_SPRING = { k: 320, c: 28 };    // higher c = less bounce
  const MIN_PULSE = 170;                    // ms a quick click stays big + white

  const ps = { s: 1, vs: 0, ts: 1, w: 0, vw: 0, tw: 0, raf: 0, last: 0 };
  let plusHeld = false, pressAt = 0, releaseTimer = 0;

  function plusRender() {
    plus.style.setProperty('--ps', ps.s.toFixed(4));
    plus.style.setProperty('--pw', Math.max(0, Math.min(1, ps.w)).toFixed(4));
  }
  function plusStep(t) {
    const dt = Math.min((t - ps.last) / 1000 || 0.016, 0.032);
    ps.last = t;
    const n = 4, h = dt / n;
    for (let i = 0; i < n; i++) {
      ps.vs += (-PLUS_SPRING.k * (ps.s - ps.ts) - PLUS_SPRING.c * ps.vs) * h; ps.s += ps.vs * h;
      ps.vw += (-PLUS_SPRING.k * (ps.w - ps.tw) - PLUS_SPRING.c * ps.vw) * h; ps.w += ps.vw * h;
    }
    plusRender();
    const rest = Math.abs(ps.s - ps.ts) < 0.0005 && Math.abs(ps.vs) < 0.005 &&
                 Math.abs(ps.w - ps.tw) < 0.0005 && Math.abs(ps.vw) < 0.005;
    if (rest) { ps.s = ps.ts; ps.w = ps.tw; ps.vs = ps.vw = 0; plusRender(); ps.raf = 0; return; }
    ps.raf = requestAnimationFrame(plusStep);
  }
  function syncPlus() {
    const big = plusHeld && !reduce;
    ps.ts = big ? PLUS_BIG : (plus.classList.contains('open') ? 0.94 : 1);
    ps.tw = big ? 1 : 0;
    if (!ps.raf) { ps.last = performance.now(); ps.raf = requestAnimationFrame(plusStep); }
  }
  function plusRelease() {
    plusHeld = false;
    syncPlus();
  }

  toggle.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    clearTimeout(releaseTimer);
    plusHeld = true; pressAt = performance.now();
    syncPlus();
  });
  function plusPointerEnd() {
    if (!plusHeld) return;
    // keep the pulse visible for a quick tap
    const wait = Math.max(0, MIN_PULSE - (performance.now() - pressAt));
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(plusRelease, wait);
  }
  window.addEventListener('pointerup', plusPointerEnd);
  window.addEventListener('pointercancel', plusPointerEnd);
  toggle.addEventListener('contextmenu', e => e.preventDefault());
  // keyboard activation (Enter/Space): quick pulse
  toggle.addEventListener('click', e => {
    if (e.detail !== 0) return;
    clearTimeout(releaseTimer);
    plusHeld = true; pressAt = performance.now(); syncPlus();
    releaseTimer = setTimeout(plusRelease, MIN_PULSE);
  });

  plusRender();

  /* ================= Liquid plus menu ================= */
  function setOpen(open) {
    if (open !== plus.classList.contains('open')) snd(open ? 'transition_up' : 'transition_down');   // only when it really changes
    plus.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    opts.forEach(b => b.tabIndex = open ? 0 : -1);
    syncPlus();
  }
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(!plus.classList.contains('open'));
  });
  document.addEventListener('click', e => {
    if (!plus.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  opts.forEach(b => b.addEventListener('click', () => {
    console.log('picked:', b.getAttribute('aria-label'));
    setOpen(false);
  }));
})();