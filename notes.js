/* Notes screen. Builds its own DOM and shows itself when the Notes tab (index 3) is active (needs the 'tabchange' event from main.js).
   Data is in memory only (demo notes on every load) until the database exists: call save() after changes there. */
(() => {
  const TAB = 3;
  const snd = () => { if (window.UISound) UISound.play('tap'); };
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ago = ms => Date.now() - ms;
  const DAY = 864e5;
  const dayOf = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const when = t => {
    const diff = (dayOf(Date.now()) - dayOf(t)) / DAY;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  };
  const stamp = t => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const IC = {
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3h7l-.8 6.2 2.8 2.6V14h-11v-2.2l2.8-2.6L8.5 3z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 14v6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2.8"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>',
    unlock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2.8"/><path d="M8.5 11V8a3.5 3.5 0 0 1 6.8-1.2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l.8 12h8.4L17 7M10 11v5M14 11v5"/></svg>'
  };

  /* confirm dialog: same look as the "Discard this event?" box in Tasks (centred card, blurred page behind) */
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
      d.onclick = e => { const x = e.target.closest('.ask-btn'); if (x) { snd(); done(x.dataset.v); } };
      d.querySelector('.ask-btn').focus();
    });
  }

  /* ---------- data ---------- */
  let uid = 100;
  const S = {
    notes: [
      { id: 1, title: 'Groceries', body: 'Milk, eggs, rice, tomatoes, green tea.', t: ago(2 * 36e5) },
      { id: 2, title: 'Ideas for the shop', body: 'Look at a simple loyalty card. Ask suppliers about bulk rates before the festive season.', t: ago(DAY + 5 * 36e5) }
    ]
  };
  const save = () => {};                     // hook for the database later

  /* ---------- DOM ---------- */
  const tasksScreen = document.querySelector('main.screen');
  const el = document.createElement('main');
  el.className = 'screen f-screen n-screen pg-n';
  el.hidden = true;
  el.setAttribute('aria-label', 'Notes');
  tasksScreen.after(el);
  el.innerHTML = `
    <section class="f-hero" aria-hidden="true"></section>
    <section class="f-pane" aria-label="Notes">
      <div class="l-tools n-tools"><label class="l-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input id="nSearch" type="search" placeholder="Search notes" autocomplete="off" aria-label="Search notes"></label><button class="n-add" id="nAdd" type="button" aria-label="New note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>
      <div id="nList"></div>
    </section>`;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="pg-ed" id="nEd" role="dialog" aria-modal="true" aria-label="Note">
      <div class="pg-ed-in">
        <div class="pg-bar"><button class="pg-del" id="nDel" type="button">Delete</button><button class="pg-done" id="nDone" type="button">Done</button></div>
        <input class="pg-ti" id="nTitle" maxlength="80" placeholder="Title" autocomplete="off" aria-label="Title">
        <p class="pg-meta" id="nMeta"></p>
        <textarea class="pg-body" id="nBody" placeholder="Write something…" aria-label="Note"></textarea>
      </div>
    </div>`);
  const $ = s => document.getElementById(s);
  const ed = $('nEd'), titleIn = $('nTitle'), bodyIn = $('nBody'), meta = $('nMeta'), delB = $('nDel');

  /* ---------- list ---------- */
  let q = '';
  function render() {
    const list = $('nList');
    if (!S.notes.length) { list.innerHTML = '<p class="pg-empty">No notes yet.<br>Tap + to write one.</p>'; return; }
    const sorted = S.notes.filter(n => !q || (n.title + ' ' + n.body).toLowerCase().includes(q)).sort((a, b) => (!!b.pinned - !!a.pinned) || b.t - a.t);   // pinned notes stay on top
    if (!sorted.length) { list.innerHTML = '<p class="pg-empty">No notes found.</p>'; return; }
    list.innerHTML = `<div class="pg-list">${sorted.map(n => {
      const blank = !n.title.trim();
      const head = blank ? (n.body.trim().split('\n')[0] || 'Untitled') : n.title;
      const prev = blank ? n.body.trim().split('\n').slice(1).join(' ') : n.body.trim().replace(/\s*\n\s*/g, ' ');
      const icons = (n.pinned ? `<span class="pg-ic pin">${IC.pin}</span>` : '') + (n.locked ? `<span class="pg-ic">${IC.lock}</span>` : '');
      return `<div class="n-sw${n.locked ? ' is-locked' : ''}"><div class="n-sw-bg" aria-hidden="true"><span class="n-act n-act-l">${n.locked ? IC.unlock : IC.lock}<span>${n.locked ? 'Unlock' : 'Lock'}</span></span><span class="n-act n-act-r"><span>${n.locked ? 'Locked' : 'Delete'}</span>${n.locked ? IC.lock : IC.trash}</span></div><button class="pg-row" type="button" data-id="${n.id}"><span class="pg-l"><span class="pg-t${blank && !n.body.trim() ? ' is-blank' : ''}">${esc(head)}</span>${prev ? `<span class="pg-s">${esc(prev)}</span>` : ''}</span><span class="pg-date">${icons}${when(n.t)}</span></button></div>`;
    }).join('')}</div>`;
  }

  /* ---------- editor ---------- */
  let cur = null, sureT = 0;
  const note = () => S.notes.find(n => n.id === cur);
  const setMeta = n => { meta.textContent = `${when(n.t)}, ${stamp(n.t)}${n.locked ? ' \u00b7 Locked' : ''}`; };
  function open(id, isNew) {
    cur = id;
    const n = note();
    const lk = !!n.locked;
    titleIn.value = n.title; bodyIn.value = n.body; setMeta(n);
    titleIn.readOnly = bodyIn.readOnly = lk;               // locked notes can be read, not edited
    delB.style.visibility = lk ? 'hidden' : '';             // ...and not deleted
    ed.classList.add('open');
    if (!lk) setTimeout(() => (isNew ? titleIn : bodyIn).focus({ preventScroll: true }), 380);
  }
  function close() {
    if (!ed.classList.contains('open')) return;
    const n = note();
    if (n && !n.title.trim() && !n.body.trim()) { S.notes = S.notes.filter(x => x !== n); save(); }   // empty notes aren't kept
    ed.classList.remove('open');
    document.activeElement && document.activeElement.blur();
    cur = null; render();
  }
  function edit() {
    const n = note();
    if (!n || n.locked) return;
    n.title = titleIn.value; n.body = bodyIn.value; n.t = Date.now();
    setMeta(n); save();
  }

  titleIn.addEventListener('input', edit);
  bodyIn.addEventListener('input', edit);
  titleIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); bodyIn.focus(); } });
  $('nDone').addEventListener('click', () => { snd(); close(); });
  delB.addEventListener('click', async () => {
    const n = note();
    if (!n || n.locked) return;
    const r = await ask('Delete this note?', 'This can\u2019t be undone.', [['Keep note', 'keep'], ['Delete', 'delete', 'danger']]);
    if (r !== 'delete') return;
    S.notes = S.notes.filter(x => x !== n); save(); close();
  });
  $('nAdd').addEventListener('click', () => {
    snd();
    const n = { id: uid++, title: '', body: '', t: Date.now() };
    S.notes.push(n); open(n.id, true);
  });
  let noClick = false;
  const listEl = $('nList');
  listEl.addEventListener('click', e => {
    const r = e.target.closest('.pg-row');
    if (!r) return;
    if (noClick) { noClick = false; return; }              // that "click" was the end of a swipe or a long-press
    snd(); open(+r.dataset.id);
  });
  listEl.addEventListener('contextmenu', e => { if (e.target.closest('.pg-row')) e.preventDefault(); });   // no system menu on long-press

  function removeRow(n, sw) {
    S.notes = S.notes.filter(x => x !== n); save();
    if (!sw || !sw.isConnected) { render(); return; }
    sw.style.height = sw.offsetHeight + 'px'; sw.style.overflow = 'hidden'; void sw.offsetHeight;
    sw.style.transition = 'height .3s var(--ease), opacity .25s'; sw.style.height = '0'; sw.style.opacity = '0';
    setTimeout(render, 320);
  }

  /* hold = pin / unpin.  swipe right = lock / unlock.  swipe left = delete (asks first; locked notes refuse) */
  const SWIPE_AT = 92, HOLD_MS = 480;
  let g = null;
  listEl.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    const card = e.target.closest('.pg-row');
    if (!card) return;
    noClick = false;
    g = { card, sw: card.parentElement, id: +card.dataset.id, x0: e.clientX, y0: e.clientY, x: 0, active: false, armed: false, pid: e.pointerId, timer: 0 };
    g.timer = setTimeout(() => {
      if (!g || g.active) return;
      const n = S.notes.find(x => x.id === g.id);
      g = null; noClick = true;
      if (!n) return;
      n.pinned = !n.pinned; save();
      if (navigator.vibrate) navigator.vibrate(14);
      snd(); render();
    }, HOLD_MS);
  });

  window.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.pid) return;
    let dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (!g.active) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearTimeout(g.timer);          // moved: it's not a hold any more
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }   // it's a scroll
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      g.active = true; noClick = true;
      g.x0 = e.clientX; dx = 0;
      try { g.card.setPointerCapture(e.pointerId); } catch (_) {}
      g.card.classList.add('dragging');
    }
    const a = Math.abs(dx);
    const pulled = a <= SWIPE_AT ? a : SWIPE_AT + (a - SWIPE_AT) * 0.35;
    g.x = Math.sign(dx) * pulled;
    g.card.style.transform = `translateX(${g.x}px)`;
    g.sw.dataset.dir = g.x > 0 ? 'right' : 'left';
    g.sw.style.setProperty('--o', Math.min(1, (a / SWIPE_AT) * 1.5).toFixed(3));
    const armed = a >= SWIPE_AT;
    if (armed !== g.armed) {
      g.armed = armed;
      g.sw.classList.toggle('armed', armed);
      if (armed && navigator.vibrate) navigator.vibrate(8);
    }
  });

  function swipeEnd(e) {
    if (!g || e.pointerId !== g.pid) return;
    const s = g; g = null;
    clearTimeout(s.timer);
    if (!s.active) return;
    s.card.classList.remove('dragging');
    s.card.style.transform = '';                            // spring back
    s.sw.classList.remove('armed');
    s.sw.style.setProperty('--o', 0);
    const n = S.notes.find(x => x.id === s.id);
    const fire = e.type === 'pointerup' && s.armed && n;
    if (fire && s.x > 0) {                                  // lock / unlock
      n.locked = !n.locked; save(); snd();
      setTimeout(render, 340);
    } else if (fire && s.x < 0) {                           // delete
      if (n.locked) {
        if (window.UISound) UISound.play('caution');
        s.card.classList.add('n-nope');
        s.card.addEventListener('animationend', () => s.card.classList.remove('n-nope'), { once: true });
      } else {
        ask('Delete this note?', 'This can\u2019t be undone.', [['Keep note', 'keep'], ['Delete', 'delete', 'danger']])
          .then(r => { if (r === 'delete') removeRow(n, s.sw); });
      }
    }
    setTimeout(() => { if (s.sw.isConnected && (!g || g.sw !== s.sw)) delete s.sw.dataset.dir; }, 350);
  }
  window.addEventListener('pointerup', swipeEnd);
  window.addEventListener('pointercancel', swipeEnd);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  $('nSearch').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); render(); });
  let enterT = 0;
  document.addEventListener('tabchange', e => {
    const on = e.detail.index === TAB;
    tasksScreen.hidden = e.detail.index !== 0;
    el.hidden = !on;
    if (on) {
      el.scrollTop = 0; render();
      el.classList.remove('f-enter'); void el.offsetWidth; el.classList.add('f-enter');
      clearTimeout(enterT); enterT = setTimeout(() => el.classList.remove('f-enter'), 2400);
    } else close();
  });
  render();
})();