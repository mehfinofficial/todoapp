/* Ledger screen. Builds its own DOM and shows itself when the Ledger tab (index 2) is active (needs the 'tabchange' event from main.js).
   Same hero + overlapping pane as Finance (f- classes), so hero.js handles the header for free.
   Data is in memory only (demo entries on every load) until the database exists: call save() after changes there.
   One person = many entries. amt > 0: I gave (they owe me more). amt < 0: I got (they owe me less / I owe them). */
(() => {
  const TAB = 2;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const snd = () => { if (window.UISound) UISound.play('tap'); };
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r2 = n => Math.round(n * 100) / 100;
  const inr = n => '₹' + Math.abs(r2(n)).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
  const when = s => {
    if (s === ago(0)) return 'Today';
    if (s === ago(1)) return 'Yesterday';
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: y === new Date().getFullYear() ? undefined : 'numeric' });
  };

  /* ---------- data ---------- */
  let uid = 100;
  const S = {
    people: [
      { id: 1, name: 'Rahul', items: [{ id: 1, amt: 5000, note: 'Rent help', date: ago(12) }, { id: 2, amt: -1000, note: 'Part payment', date: ago(3) }] },
      { id: 2, name: 'Aman', items: [{ id: 3, amt: -2500, note: 'Trip share', date: ago(6) }] },
      { id: 3, name: 'Priya', items: [{ id: 4, amt: 1200, note: 'Dinner', date: ago(2) }] },
      { id: 4, name: 'Karan', items: [{ id: 5, amt: 800, note: 'Cab', date: ago(20) }, { id: 6, amt: -800, note: 'Settled', date: ago(9) }] }
    ]
  };
  const save = () => {};                     // hook for the database later
  const bal = p => r2(p.items.reduce((s, i) => s + i.amt, 0));
  const last = p => p.items.reduce((m, i) => i.date > m ? i.date : m, '');
  const status = b => b > 0 ? 'Owes you' : b < 0 ? 'You owe' : 'Settled';

  /* ---------- DOM ---------- */
  const tasksScreen = document.querySelector('main.screen');
  const el = document.createElement('main');
  el.className = 'screen f-screen l-screen';
  el.hidden = true;
  el.setAttribute('aria-label', 'Ledger');
  tasksScreen.after(el);
  el.innerHTML = `
    <section class="f-hero">
      <div class="f-main">
        <p class="f-lbl" id="lLbl"></p>
        <h2 class="f-big" id="lBig"></h2>
      </div>
      <div class="f-btns"><button class="f-btn dark" type="button" data-new="gave"><svg class="f-bi" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2.20004C13.3538 2.06886 12.6849 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 11.3151 21.9311 10.6462 21.8 10"/><path d="M12 9C10.8954 9 10 9.67157 10 10.5C10 11.3284 10.8954 12 12 12C13.1046 12 14 12.6716 14 13.5C14 14.3284 13.1046 15 12 15M12 9C12.8708 9 13.6116 9.4174 13.8862 10M12 9V8M12 15C11.1292 15 10.3884 14.5826 10.1138 14M12 15V16"/><path d="M16.998 7.00195L21.1739 2.82375M21.998 6.48019L21.8798 3.3887C21.8798 2.66006 21.4448 2.20607 20.6523 2.14881L17.5282 2.00195"/></svg><span>Send</span></button><button class="f-btn" type="button" data-new="got"><svg class="f-bi" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2.22179C13.3538 2.09076 12.6849 2.02197 12 2.02197C6.47715 2.02197 2 6.49421 2 12.011C2 17.5277 6.47715 22 12 22C17.5228 22 22 17.5277 22 12.011C22 11.3269 21.9311 10.6587 21.8 10.0132"/><path d="M12 9.01428C10.8954 9.01428 10 9.68512 10 10.5126C10 11.3401 10.8954 12.011 12 12.011C13.1046 12.011 14 12.6819 14 13.5093C14 14.3368 13.1046 15.0077 12 15.0077M12 9.01428C12.8708 9.01428 13.6116 9.43123 13.8862 10.0132M12 9.01428V8.01538M12 15.0077C11.1292 15.0077 10.3884 14.5908 10.1138 14.0088M12 15.0077V16.0066"/><path d="M21.9951 2L17.8193 6.17362M16.9951 2.52119L17.1133 5.60928C17.1133 6.33713 17.5484 6.79062 18.3409 6.84782L21.465 6.99451"/></svg><span>Receive</span></button></div>
      <div class="f-io">
        <div class="f-tile"><div class="f-tl">To receive</div><b id="lRec"></b></div>
        <div class="f-tile"><div class="f-tl">To give</div><b id="lGiv"></b></div>
        <div class="f-tile"><div class="f-tl">Pending</div><b id="lPen"></b></div>
      </div>
    </section>
    <section class="f-pane" aria-label="People">
      <div class="l-top">
        <div class="l-tabs" id="lChips" role="group" aria-label="Filter">
          <button class="l-tab" type="button" data-f="all" aria-pressed="true">All</button>
          <button class="l-tab" type="button" data-f="rec" aria-pressed="false">To receive</button>
          <button class="l-tab" type="button" data-f="giv" aria-pressed="false">To give</button>
          <button class="l-tab" type="button" data-f="set" aria-pressed="false">Settled</button>
        </div>
        <button class="l-sbtn" id="lFind" type="button" aria-label="Search people" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button>
      </div>
      <div class="l-find" id="lFindBox"><div><input id="lSearch" type="search" placeholder="Search people" autocomplete="off" aria-label="Search people" tabindex="-1"></div></div>
      <div id="lList"></div>
    </section>`;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="pg-back" id="lBack"></div>
    <div class="pg-sheet" id="lSheet" role="dialog" aria-modal="true" aria-label="Ledger entry">
      <div class="pg-grab"></div>
      <div class="pg-sh"><h3 id="lName"></h3><button class="pg-x" id="lX" type="button" aria-label="Close">×</button></div>
      <p class="pg-bal" id="lBal"></p>
      <input class="pg-in" id="lNameIn" maxlength="30" placeholder="Name" autocomplete="off" aria-label="Name" hidden style="margin-top:14px">
      <div class="pg-hist" id="lHist"></div>
      <div class="pg-form">
        <label class="pg-money"><span aria-hidden="true">₹</span><input class="pg-in" id="lAmt" inputmode="decimal" placeholder="0" autocomplete="off" aria-label="Amount"></label>
        <input class="pg-in" id="lNote" maxlength="60" placeholder="Note (optional)" autocomplete="off" aria-label="Note">
        <div class="pg-two" id="lTwo"><button class="pg-go dark" id="lGave" type="button" disabled>Send</button><button class="pg-go light" id="lGot" type="button" disabled>Receive</button></div>
        <div class="pg-links" id="lLinks"><button class="pg-link" id="lRemind" type="button" hidden>Remind</button><button class="pg-link" id="lSettle" type="button" hidden>Settle up</button></div>
      </div>
    </div>`);
  const $ = s => document.getElementById(s);
  const sheet = $('lSheet'), back = $('lBack'), nameH = $('lName'), nameIn = $('lNameIn'), balEl = $('lBal'), hist = $('lHist'),
        amtIn = $('lAmt'), noteIn = $('lNote'), gaveB = $('lGave'), gotB = $('lGot'), two = $('lTwo'), settleB = $('lSettle'), remindB = $('lRemind'), links = $('lLinks'),
        big = $('lBig');
  const TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

  /* ---------- hero + list ---------- */
  let flt = 'all', q = '';
  function render() {
    const bs = S.people.map(bal);
    const rec = bs.filter(b => b > 0).reduce((s, b) => s + b, 0), giv = -bs.filter(b => b < 0).reduce((s, b) => s + b, 0), net = r2(rec - giv);
    $('lLbl').textContent = net > 0 ? "In total, you'll receive" : net < 0 ? 'In total, you owe' : 'Nothing pending';
    big.textContent = inr(net);
    big.classList.toggle('neg', net < 0);
    $('lRec').textContent = inr(rec);
    $('lGiv').textContent = inr(giv);
    $('lPen').textContent = bs.filter(b => b !== 0).length;

    const list = $('lList');
    if (!S.people.length) { list.innerHTML = '<p class="pg-empty">No one yet.<br>Tap Send or Receive to start.</p>'; return; }
    const ok = p => { const b = bal(p); return (flt === 'all' || (flt === 'rec' && b > 0) || (flt === 'giv' && b < 0) || (flt === 'set' && b === 0)) && p.name.toLowerCase().includes(q); };
    const rows = S.people.filter(ok).sort((a, b) => (bal(a) === 0) - (bal(b) === 0) || Math.abs(bal(b)) - Math.abs(bal(a)));
    if (!rows.length) { list.innerHTML = `<p class="pg-empty">${q ? 'No one found.' : 'Nothing here.'}</p>`; return; }
    const n = rows.length, pend = rows.filter(p => bal(p) !== 0).length;
    const head = { all: 'People', rec: 'To receive', giv: 'To give', set: 'Settled' }[flt];
    const sub = flt === 'all' ? (pend ? `${pend} pending` : 'All settled') : `${n} ${n === 1 ? 'person' : 'people'}`;
    list.innerHTML = `<section class="group"><header class="group-head"><h3>${head}</h3><span>${sub}</span></header><ul class="tasks">${rows.map(p => {
      const b = bal(p), cls = b > 0 ? 'pos' : b < 0 ? 'neg' : 'zero';
      return `<li><div class="l-card${b ? '' : ' is-set'}" role="button" tabindex="0" data-id="${p.id}"><div class="t-body"><p class="t-title"><span>${esc(p.name)}</span></p><p class="t-meta"><span class="t-x">${when(last(p))}</span></p></div><span class="pg-amt ${cls}">${b ? inr(b) : '₹0'}</span></div></li>`;
    }).join('')}</ul></section>`;
  }

  $('lChips').addEventListener('click', e => {
    const c = e.target.closest('.l-tab');
    if (!c) return;
    snd(); flt = c.dataset.f;
    el.querySelectorAll('.l-tab').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    render();
  });
  const findBox = $('lFindBox'), findIn = $('lSearch'), findBtn = $('lFind');
  function find(on) {
    findBox.classList.toggle('open', on);
    findBtn.setAttribute('aria-expanded', String(on));
    findIn.tabIndex = on ? 0 : -1;
    if (on) setTimeout(() => findIn.focus({ preventScroll: true }), 120);
    else if (q) { findIn.value = ''; q = ''; render(); }
  }
  findBtn.addEventListener('click', () => { snd(); find(!findBox.classList.contains('open')); });
  findIn.addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); render(); });
  findIn.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); find(false); } });

  /* ---------- sheet ---------- */
  let cur = null, mode = null;               // cur: person id, or 'new'. mode (new only): 'gave' | 'got'
  const person = () => S.people.find(p => p.id === cur);
  const num = () => parseFloat(amtIn.value.replace(/[^\d.]/g, ''));
  const valid = () => { const n = num(); return n > 0 && n < 1e9 && (cur !== 'new' || nameIn.value.trim().length > 0); };
  const sync = () => { gaveB.disabled = gotB.disabled = !valid(); };

  function fillSheet() {
    const p = person(), isNew = cur === 'new';
    nameIn.hidden = !isNew;
    gaveB.hidden = isNew && mode === 'got';
    gotB.hidden = isNew && mode === 'gave';
    two.classList.toggle('one', isNew);
    if (isNew) {
      nameH.textContent = mode === 'gave' ? 'Send' : 'Receive';
      balEl.hidden = false; balEl.textContent = mode === 'gave' ? 'Money you sent, now owed to you' : 'Money you received';
      hist.hidden = true; links.hidden = true;
      return;
    }
    const b = bal(p);
    nameH.textContent = p.name;
    balEl.hidden = false;
    balEl.innerHTML = b ? `${status(b)} <b class="${b > 0 ? 'pos' : 'neg'}">${inr(b)}</b>` : 'All settled';
    settleB.hidden = !b; remindB.hidden = b <= 0; links.hidden = !b;
    hist.hidden = false;
    hist.innerHTML = [...p.items].sort((a, c) => c.date.localeCompare(a.date) || c.id - a.id).map(i =>
      `<div class="pg-it"><span class="pg-l"><span class="pg-t">${esc(i.note || (i.amt > 0 ? 'Sent' : 'Received'))}</span><span class="pg-s">${when(i.date)}</span></span><span class="pg-amt ${i.amt > 0 ? 'pos' : 'neg'}">${i.amt > 0 ? '+' : '−'}${inr(i.amt)}</span><button class="pg-rm" type="button" data-rm="${i.id}" aria-label="Remove entry">${TRASH}</button></div>`).join('');
  }
  function open(id, m) {
    cur = id; mode = m || null; amtIn.value = ''; noteIn.value = ''; nameIn.value = '';
    fillSheet(); sync();
    sheet.classList.add('open'); back.classList.add('open');
    setTimeout(() => (id === 'new' ? nameIn : amtIn).focus({ preventScroll: true }), 380);
  }
  function close() {
    if (!sheet.classList.contains('open')) return;
    sheet.classList.remove('open'); back.classList.remove('open');
    document.activeElement && document.activeElement.blur();
    cur = null; mode = null; render();
  }
  function add(sign, amt, note) {
    let p = person();
    const wasNew = cur === 'new';
    if (wasNew) {
      const nm = nameIn.value.trim();
      p = S.people.find(x => x.name.toLowerCase() === nm.toLowerCase());
      if (!p) { p = { id: uid++, name: nm, items: [] }; S.people.push(p); }
      cur = p.id;
    }
    p.items.push({ id: uid++, amt: sign * amt, note, date: ymd(new Date()) });
    save(); snd();
    if (wasNew) { close(); return; }
    amtIn.value = ''; noteIn.value = '';
    fillSheet(); sync(); render();
  }

  gaveB.addEventListener('click', () => valid() && add(1, r2(num()), noteIn.value.trim()));
  gotB.addEventListener('click', () => valid() && add(-1, r2(num()), noteIn.value.trim()));
  settleB.addEventListener('click', () => {
    const p = person(), b = p && bal(p);
    if (!b) return;
    p.items.push({ id: uid++, amt: -b, note: 'Settled', date: ymd(new Date()) });
    save(); snd(); fillSheet(); render();
  });
  remindB.addEventListener('click', () => {
    const p = person(), b = p && bal(p);
    if (!p || b <= 0) return;
    snd();
    const text = `Hi ${p.name}, a quick reminder about the ${inr(b)} pending with you. Thanks!`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });
  hist.addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'), p = person();
    if (!b || !p) return;
    p.items = p.items.filter(i => i.id !== +b.dataset.rm);
    if (!p.items.length) { S.people = S.people.filter(x => x !== p); save(); snd(); close(); return; }
    save(); snd(); fillSheet(); render();
  });
  amtIn.addEventListener('input', () => { amtIn.value = amtIn.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'); sync(); });
  nameIn.addEventListener('input', sync);
  [nameIn, amtIn, noteIn].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (i === nameIn) amtIn.focus(); else if (i === amtIn) noteIn.focus(); } }));
  $('lX').addEventListener('click', () => { snd(); close(); });
  back.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  el.querySelectorAll('[data-new]').forEach(b => b.addEventListener('click', () => { snd(); open('new', b.dataset.new); }));
  $('lList').addEventListener('click', e => { const r = e.target.closest('.l-card'); if (r) { snd(); open(+r.dataset.id); } });
  $('lList').addEventListener('keydown', e => { const r = e.target.closest('.l-card'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); snd(); open(+r.dataset.id); } });

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