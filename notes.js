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
    const sorted = S.notes.filter(n => !q || (n.title + ' ' + n.body).toLowerCase().includes(q)).sort((a, b) => b.t - a.t);
    if (!sorted.length) { list.innerHTML = '<p class="pg-empty">No notes found.</p>'; return; }
    list.innerHTML = `<div class="pg-list">${sorted.map(n => {
      const blank = !n.title.trim();
      const head = blank ? (n.body.trim().split('\n')[0] || 'Untitled') : n.title;
      const prev = blank ? n.body.trim().split('\n').slice(1).join(' ') : n.body.trim().replace(/\s*\n\s*/g, ' ');
      return `<button class="pg-row" type="button" data-id="${n.id}"><span class="pg-l"><span class="pg-t${blank && !n.body.trim() ? ' is-blank' : ''}">${esc(head)}</span>${prev ? `<span class="pg-s">${esc(prev)}</span>` : ''}</span><span class="pg-date">${when(n.t)}</span></button>`;
    }).join('')}</div>`;
  }

  /* ---------- editor ---------- */
  let cur = null, sureT = 0;
  const note = () => S.notes.find(n => n.id === cur);
  const setMeta = n => { meta.textContent = `${when(n.t)}, ${stamp(n.t)}`; };
  function armDelete(on) {
    clearTimeout(sureT);
    delB.classList.toggle('sure', on);
    delB.textContent = on ? 'Tap again to delete' : 'Delete';
    if (on) sureT = setTimeout(() => armDelete(false), 2500);
  }
  function open(id, isNew) {
    cur = id;
    const n = note();
    titleIn.value = n.title; bodyIn.value = n.body; setMeta(n); armDelete(false);
    ed.classList.add('open');
    setTimeout(() => (isNew ? titleIn : bodyIn).focus({ preventScroll: true }), 380);
  }
  function close() {
    if (!ed.classList.contains('open')) return;
    const n = note();
    if (n && !n.title.trim() && !n.body.trim()) { S.notes = S.notes.filter(x => x !== n); save(); }   // empty notes aren't kept
    ed.classList.remove('open');
    document.activeElement && document.activeElement.blur();
    cur = null; armDelete(false); render();
  }
  function edit() {
    const n = note();
    if (!n) return;
    n.title = titleIn.value; n.body = bodyIn.value; n.t = Date.now();
    setMeta(n); save();
  }

  titleIn.addEventListener('input', edit);
  bodyIn.addEventListener('input', edit);
  titleIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); bodyIn.focus(); } });
  $('nDone').addEventListener('click', () => { snd(); close(); });
  delB.addEventListener('click', () => {
    if (!delB.classList.contains('sure')) { armDelete(true); return; }
    S.notes = S.notes.filter(x => x.id !== cur); save(); snd(); close();
  });
  $('nAdd').addEventListener('click', () => {
    snd();
    const n = { id: uid++, title: '', body: '', t: Date.now() };
    S.notes.push(n); open(n.id, true);
  });
  $('nList').addEventListener('click', e => { const r = e.target.closest('.pg-row'); if (r) { snd(); open(+r.dataset.id); } });
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