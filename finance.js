/* Finance screen. Builds its own DOM and shows itself when the Finance tab (index 1) is active (needs the 'tabchange' event from main.js).
   Data is in memory only (demo entries on every load) until the database exists: call save() after changes there.
   Spendable = monthly budget + funds added this month - spent this month. */
(() => {
  const FIN_TAB = 1;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const play = n => { if (window.UISound) UISound.play(n); };
  const snd = () => play('tap');             // the same tap as the rest of the app
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r2 = n => Math.round(n * 100) / 100;
  const money = n => { n = r2(n); return (n < 0 ? '−' : '') + '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }); };
  const money2 = n => { n = Math.round(n); return (n < 0 ? '−' : '') + '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }); };   // big number: whole rupees
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const mkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const sum = (a, ty) => a.filter(t => t.type === ty).reduce((s, t) => s + t.amt, 0);

  // [icon path, label, tint, chart color]
  const OUT = {
    food: ['M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 21V3c-2 1-3.5 4-3.5 8 0 1.5 1 2 3.5 2', 'Food', '#fff1e0', '#f59e0b'],
    transport: ['M5 16V6a2 2 0 012-2h10a2 2 0 012 2v10M5 16h14M5 16v3h3v-3M16 16v3h3v-3M5 11h14', 'Transport', '#e6f0ff', '#3b82f6'],
    bills: ['M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z', 'Bills', '#fff7d6', '#eab308'],
    shopping: ['M6 8h12l1 12H5L6 8zM9 8V6a3 3 0 016 0v2', 'Shopping', '#fde8f1', '#ec4899'],
    health: ['M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z', 'Health', '#e4f7ec', '#22c55e'],
    fun: ['M5 5h14v14H5zM10 9l5 3-5 3z', 'Fun', '#efe8ff', '#8b5cf6'],
    other: ['M5 12h.01M12 12h.01M19 12h.01', 'Other', '#eef0f4', '#94a3b8']
  };
  const IN = {
    salary: ['M4 8h16v11H4zM9 8V6a1 1 0 011-1h4a1 1 0 011 1v2M4 13h16', 'Salary', '#e4f7ec'],
    freelance: ['M5 6h14v9H5zM3 19h18', 'Freelance', '#e6f0ff'],
    other: ['M5 12h.01M12 12h.01M19 12h.01', 'Other', '#eef0f4']
  };
  const ico = c => `<svg class="f-i" viewBox="0 0 24 24" aria-hidden="true"><path d="${c[0]}"/></svg>`;
  const TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

  /* ---------- data ---------- */
  const now = new Date();
  function seed() {
    const day = (o, d) => ymd(new Date(now.getFullYear(), now.getMonth() + o, d));
    const rows = [
      [0, 3, 'out', 12000, 'bills', 'Rent', '09:05'], [0, 4, 'out', 480, 'food', 'Lunch', '13:20'], [0, 6, 'out', 1650, 'shopping', 'Shoes', '18:40'],
      [0, 8, 'in', 9000, 'freelance', 'Logo project', '11:15'], [0, 9, 'out', 320, 'transport', 'Cab', '08:50'], [0, 12, 'out', 2100, 'bills', 'Electricity + internet', '10:30'],
      [0, 14, 'out', 760, 'food', 'Dinner out', '21:00'], [0, 17, 'out', 900, 'fun', 'Movies', '19:10'], [0, 20, 'out', 1400, 'health', 'Pharmacy', '16:25'],
      [0, 20, 'out', 90, 'food', 'Snacks', '12:40'], [0, 23, 'out', 540, 'food', 'Groceries', '17:45'], [0, 23, 'out', 210, 'transport', 'Auto', '10:05'],
      [0, 26, 'out', 380, 'transport', 'Fuel', '09:30'], [0, 26, 'out', 120, 'food', 'Coffee', '08:10'], [0, 27, 'in', 3000, 'other', 'Gift', '12:00'],
      [0, 27, 'out', 650, 'food', 'Dinner', '20:15'],
      [-1, 3, 'out', 12000, 'bills', 'Rent', '09:00'], [-1, 10, 'out', 5200, 'shopping', 'Clothes', '15:00'], [-1, 15, 'out', 3100, 'food', 'Food', '14:00'],
      [-1, 22, 'out', 2400, 'fun', 'Weekend trip', '11:00'], [-1, 5, 'in', 5000, 'freelance', 'Freelance', '10:00']
    ];
    return {
      budget: 30000,
      tx: rows.filter(r => r[0] < 0 || r[1] <= now.getDate()).map(([o, d, type, amt, cat, note, time], i) => ({ id: i + 1, type, amt, cat, note, date: day(o, d), time }))
    };
  }
  const S = seed();                          // in memory only, like Tasks
  /* categories people add themselves: S.custom = { in: [{k,label,tint,color}], out: [...] }, put back into OUT / IN here */
  const CAT_TAG = 'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01';
  const CAT_HUES = [['#ffe9d6', '#ea580c'], ['#e0f2fe', '#0284c7'], ['#ecfccb', '#65a30d'], ['#fae8ff', '#c026d3'], ['#ccfbf1', '#0d9488'], ['#fee2e2', '#dc2626']];
  S.custom = S.custom || { in: [], out: [] };
  S.custom.out.forEach(c => { OUT[c.k] = [CAT_TAG, c.label, c.tint, c.color]; });
  S.custom.in.forEach(c => { IN[c.k] = [CAT_TAG, c.label, c.tint]; });
  let uid = S.tx.length + 1;
  const save = () => {};                     // hook for the database later
  function calc(d = now) {
    const tx = S.tx.filter(t => t.date.startsWith(mkey(d))), out = tx.filter(t => t.type === 'out'), byCat = {};
    out.forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) + t.amt; });
    return { out, byCat, spent: sum(tx, 'out'), funds: sum(tx, 'in') };
  }

  /* ---------- DOM ---------- */
  const tasksScreen = document.querySelector('main.screen');
  const el = document.createElement('main');
  el.className = 'screen f-screen';
  el.hidden = true;
  el.setAttribute('aria-label', 'Finances');
  tasksScreen.after(el);
  el.innerHTML = `
    <section class="f-hero">
      <button class="f-ins" data-ins aria-label="Insights"><svg viewBox="0 0 24 24"><path d="M6 20v-8M12 20V5M18 20v-5"/></svg></button>
      <div class="f-main">
        <p class="f-lbl">Spendable</p>
        <h2 class="f-big" id="fBig"></h2>
      </div>
      <div class="f-btns"><button class="f-btn dark" data-add="in"><svg class="f-bi" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2.22179C13.3538 2.09076 12.6849 2.02197 12 2.02197C6.47715 2.02197 2 6.49421 2 12.011C2 17.5277 6.47715 22 12 22C17.5228 22 22 17.5277 22 12.011C22 11.3269 21.9311 10.6587 21.8 10.0132"/><path d="M12 9.01428C10.8954 9.01428 10 9.68512 10 10.5126C10 11.3401 10.8954 12.011 12 12.011C13.1046 12.011 14 12.6819 14 13.5093C14 14.3368 13.1046 15.0077 12 15.0077M12 9.01428C12.8708 9.01428 13.6116 9.43123 13.8862 10.0132M12 9.01428V8.01538M12 15.0077C11.1292 15.0077 10.3884 14.5908 10.1138 14.0088M12 15.0077V16.0066"/><path d="M21.9951 2L17.8193 6.17362M16.9951 2.52119L17.1133 5.60928C17.1133 6.33713 17.5484 6.79062 18.3409 6.84782L21.465 6.99451"/></svg><span>Add funds</span></button><button class="f-btn" data-add="out"><svg class="f-bi" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2.20004C13.3538 2.06886 12.6849 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 11.3151 21.9311 10.6462 21.8 10"/><path d="M12 9C10.8954 9 10 9.67157 10 10.5C10 11.3284 10.8954 12 12 12C13.1046 12 14 12.6716 14 13.5C14 14.3284 13.1046 15 12 15M12 9C12.8708 9 13.6116 9.4174 13.8862 10M12 9V8M12 15C11.1292 15 10.3884 14.5826 10.1138 14M12 15V16"/><path d="M16.998 7.00195L21.1739 2.82375M21.998 6.48019L21.8798 3.3887C21.8798 2.66006 21.4448 2.20607 20.6523 2.14881L17.5282 2.00195"/></svg><span>Spend</span></button></div>
      <div class="f-io">
        <div class="f-tile"><div class="f-tl">Money in</div><b id="fIn"></b></div>
        <div class="f-tile"><div class="f-tl">Money out</div><b id="fOut"></b></div>
        <button class="f-tile f-bud" id="fBudBtn" data-bud aria-label="Change monthly budget"><span class="f-tl">Budget<svg class="f-pen" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3zM13.5 6.5l3 3"/></svg></span><b id="fBud"></b></button>
      </div>
    </section>
    <section class="f-pane" aria-label="Transaction history">
    <div class="f-h"><h3>Transaction history</h3><button class="f-all" data-all aria-label="See all transactions">See all<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>
    <div id="fHist"></div>
    </section>`;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="f-back" id="fBack"></div>
    <div class="f-sheet" id="fForm" role="dialog" aria-modal="true" aria-label="Transaction">
      <div class="f-grab"></div>
      <div class="f-sh"><h3 id="fTitle"></h3><button class="f-x" data-x aria-label="Close">×</button></div>
      <div class="f-amtw is-blank" id="fAmtW" role="img" aria-label="Amount ₹0"><span class="a-sym" aria-hidden="true">₹</span><span class="a-num" id="fAmtN"></span></div>
      <div class="f-cats" id="fCats">
        <button class="f-plus" id="fPlus" type="button" aria-label="New category" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
        <div class="f-cw" id="fCw"><div class="f-chips" id="fChips"></div></div>
        <div class="f-new"><input id="fNewIn" maxlength="16" placeholder="Category name" autocomplete="off" aria-label="New category name"><button id="fNewOk" type="button" aria-label="Add category" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button></div>
      </div>
      <div class="f-two" id="fTwo">
        <input id="fNote" maxlength="60" placeholder="Transaction detail" autocomplete="off" aria-label="Transaction detail">
        <button class="f-date" id="fDate" type="button" aria-label="Choose date"><span id="fDateT"></span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg></button>
      </div>
      <div class="f-padw"><div class="f-pad" id="fPad"><button class="f-k" data-k="1">1</button><button class="f-k" data-k="2">2</button><button class="f-k" data-k="3">3</button><button class="f-k" data-k="4">4</button><button class="f-k" data-k="5">5</button><button class="f-k" data-k="6">6</button><button class="f-k" data-k="7">7</button><button class="f-k" data-k="8">8</button><button class="f-k" data-k="9">9</button><button class="f-k" data-k="." aria-label="Decimal point">.</button><button class="f-k" data-k="0">0</button><button class="f-k" data-k="del" aria-label="Delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10a2 2 0 012 2v10a2 2 0 01-2 2H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg></button></div></div>
      <button class="f-save" id="fSave" disabled></button>
    </div>
    <div class="f-sheet" id="fInsS" role="dialog" aria-modal="true" aria-label="Insights">
      <div class="f-grab"></div>
      <div class="f-sh"><h3>Insights</h3><button class="f-x" data-x aria-label="Close">×</button></div>
      <div class="f-sbody" id="fInsB"></div>
    </div>`);
  const $ = s => document.querySelector(s);
  const big = $('#fBig'), budBtn = $('#fBudBtn'), hist = $('#fHist');
  const back = $('#fBack'), form = $('#fForm'), insS = $('#fInsS');
  const noteIn = $('#fNote'), dateIn = $('#fDate'), dateT = $('#fDateT'), chips = $('#fChips'), saveBtn = $('#fSave'), amtW = $('#fAmtW'), amtN = $('#fAmtN'), two = $('#fTwo'), padEl = $('#fPad'),
        cats = $('#fCats'), plus = $('#fPlus'), cw = $('#fCw'), newIn = $('#fNewIn'), newOk = $('#fNewOk');

  /* ---------- the big number: every digit is a 0-9 strip that rolls (with a blur) to its new value ---------- */
  const D10 = Array.from({ length: 10 }, (_, i) => `<i>${i}</i>`).join('');
  const isD = c => c >= '0' && c <= '9';
  const ROLL_MS = 1100, ROLL_STAGGER = 55, ROLL_EASE = 'cubic-bezier(.16, 1, .3, 1)';   // expo-out: fast start, long soft landing
  let bigShape = '', bigDigits = [];

  function fit() {                           // very large amounts: shrink the font so it never overflows
    big.style.fontSize = '';
    const num = big.firstElementChild, avail = big.clientWidth - 8;
    if (num && avail > 0 && num.offsetWidth > avail) big.style.fontSize = (parseFloat(getComputedStyle(big).fontSize) * avail / num.offsetWidth) + 'px';
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (bigShape) fit(); });
  function setBig(v, fresh) {
    const s = money2(v), chars = [...s];
    const to = chars.filter(isD).map(Number), shape = chars.map(c => isD(c) ? '#' : c).join('');
    big.setAttribute('aria-label', 'Spendable ' + s);
    let from = bigDigits;
    if (shape !== bigShape || fresh) {       // new layout (digit count / sign changed): rebuild, keep the old digits aligned from the right
      from = fresh ? to.map(() => 0) : to.map((_, k) => bigDigits[bigDigits.length - (to.length - k)] ?? 0);
      let i = 0;
      big.innerHTML = '<span class="f-num">' + chars.map(c => isD(c)
        ? `<span class="f-d" aria-hidden="true"><span class="f-r" style="--n:${from[i++]}">${D10}</span></span>`
        : `<span class="f-s" aria-hidden="true">${c}</span>`).join('') + '</span>';
      bigShape = shape;
      fit();
      void big.offsetWidth;                  // flush, so the roll below starts from the old digits
    }
    const strips = big.querySelectorAll('.f-r');
    strips.forEach((r, k) => {
      const h = r.offsetHeight / 10;                                      // one digit's height in px
      // where is this strip right now? (matters when a new value arrives mid-roll)
      let y = -from[k] * h;
      if (r._anim) {
        const m = new DOMMatrixReadOnly(getComputedStyle(r).transform);
        y = m.m42;
        r._anim.cancel(); r._anim = null;
      }
      const yTo = -to[k] * h;
      r.style.setProperty('--n', to[k]);                                   // final resting position
      if (reduce || Math.abs(y - yTo) < .5) return;
      const dl = (strips.length - 1 - k) * ROLL_STAGGER;                  // right-most digit leads
      const dist = Math.min(1, Math.abs(y - yTo) / (h * 5));              // short hops get less blur
      const a = r.animate([
        { transform: `translate3d(0, ${y}px, 0)`, filter: 'blur(0px)' },
        { filter: `blur(${(1.2 + 2.2 * dist).toFixed(2)}px)`, offset: .3 },
        { transform: `translate3d(0, ${yTo}px, 0)`, filter: 'blur(0px)' }
      ], { duration: ROLL_MS, delay: dl, easing: ROLL_EASE, fill: 'backwards' });
      r._anim = a;
      a.onfinish = a.oncancel = () => { if (r._anim === a) r._anim = null; };
    });
    bigDigits = to;
  }

  /* ---------- render ---------- */
  const dayLabel = d => {
    if (d === ymd(now)) return 'Today';
    if (d === ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Yesterday';
    return new Date(d + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const clock = t => new Date('1970-01-01T' + t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const row = t => {
    const c = (t.type === 'out' ? OUT : IN)[t.cat] || OUT.other, name = esc(t.note || c[1]);
    return `<div class="f-sw"><div class="f-sw-bg" aria-hidden="true"><span>Delete</span>${TRASH}</div>
      <div class="f-row" data-row="${t.id}" tabindex="0" aria-label="${name}, ${t.type === 'in' ? 'added' : 'spent'} ${money(t.amt)}. Press Delete to remove."><div class="f-b"><p>${name}</p><small>${c[1]}${t.time ? ' · ' + clock(t.time) : ''}</small></div><b class="f-amt ${t.type}">${t.type === 'in' ? '+' : '−'}${money(t.amt)}</b></div></div>`;
  };
  function history() {
    const items = [...S.tx].sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '') || b.id - a.id).slice(0, 30);
    if (!items.length) return `<div class="f-empty"><h3>No transactions yet</h3>Tap Add funds or Spend to get started.</div>`;
    const g = [];
    items.forEach(t => { const l = g[g.length - 1]; if (l && l[0] === t.date) l[1].push(t); else g.push([t.date, [t]]); });
    return g.map(([d, l], i) => `<div class="f-g" style="--i:${Math.min(i, 8)}"><p class="f-day">${dayLabel(d)}</p><div class="f-hc">${l.map(row).join('')}</div></div>`).join('');
  }
  function render(fresh) {
    const c = calc(), avail = S.budget + c.funds, left = avail - c.spent, p = avail > 0 ? c.spent / avail : (c.spent ? 1 : 0);
    big.classList.toggle('neg', r2(left) < 0);
    setBig(left, fresh);
    $('#fBud').textContent = money(S.budget);
    $('#fIn').textContent = money(c.funds);
    $('#fOut').textContent = money(c.spent);
    budBtn.className = 'f-tile f-bud ' + (p >= 1 ? 'over' : p >= .8 ? 'warn' : '');
    hist.innerHTML = history();
  }

  // a newly added / restored row opens up and slides in (same motion as a new task)
  function popIn(id) {
    const face = hist.querySelector(`[data-row="${id}"]`);
    if (!face || reduce) return;
    const sw = face.parentElement, grp = sw.closest('.f-g'), tgt = grp.querySelectorAll('.f-sw').length === 1 ? grp : sw, h = tgt.offsetHeight;
    tgt.style.overflow = 'hidden';
    tgt.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 380, easing: 'ease' }).onfinish = () => { tgt.style.overflow = ''; };
    face.animate([{ transform: 'translateX(-46px) scale(.96)' }, { transform: 'none' }], { duration: 540, easing: 'cubic-bezier(.34, 1.4, .5, 1)' });
  }

  function insightsHTML() {
    const c = calc();
    if (!c.out.length) return `<div class="f-empty"><h3>Nothing to analyse yet</h3>Log some expenses and charts show up here.</div>`;
    const cats = Object.keys(c.byCat).sort((a, b) => c.byCat[b] - c.byCat[a]);
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), today = now.getDate();
    const avail = S.budget + c.funds;
    const prev = calc(new Date(now.getFullYear(), now.getMonth() - 1, 1)).spent;
    const d = prev ? Math.round((c.spent - prev) / prev * 100) : null;
    const mon = now.toLocaleDateString('en-US', { month: 'long' }), monS = now.toLocaleDateString('en-US', { month: 'short' });

    /* spending line: running total across the month */
    const day = Array(dim).fill(0);
    c.out.forEach(t => { day[+t.date.slice(8) - 1] += t.amt; });
    let run = 0;
    const cum = day.slice(0, today).map(v => (run += v));
    const W = 320, H = 92, T = 10, B = 8, yMax = c.spent || 1;
    const X = i => i / (dim - 1) * (W - 8), Y = v => H - B - v / yMax * (H - T - B);
    let line = `M${X(0).toFixed(1)} ${Y(cum[0]).toFixed(1)}`;
    for (let i = 1; i < cum.length; i++) { const mx = (X(i - 1) + X(i)) / 2; line += `C${mx.toFixed(1)} ${Y(cum[i - 1]).toFixed(1)} ${mx.toFixed(1)} ${Y(cum[i]).toFixed(1)} ${X(i).toFixed(1)} ${Y(cum[i]).toFixed(1)}`; }
    const lastX = X(cum.length - 1), lastY = Y(cum[cum.length - 1]);
    const area = `${line}L${lastX.toFixed(1)} ${H - B}L${X(0).toFixed(1)} ${H - B}Z`;

    /* categories: tonal ramp of the ink colour, so the only colour in the sheet is the data's weight */
    const RAMP = ['#1d1d24', '#464857', '#72758a', '#a0a3b4', '#ccced9'];
    const shade = i => RAMP[Math.min(i, RAMP.length - 1)];
    const segs = cats.map((k, i) => `<i style="flex:${c.byCat[k]};background:${shade(i)}"></i>`).join('');
    const rows = cats.slice(0, 5).map((k, i) => `<div class="f-cr"><i style="background:${shade(i)}"></i><span>${OUT[k][1]}</span><em>${Math.round(c.byCat[k] / c.spent * 100)}%</em><b>${money(c.byCat[k])}</b></div>`).join('');

    const bigX = [...c.out].sort((a, b) => b.amt - a.amt)[0];
    const proj = c.spent / today * dim, over = proj > avail;
    const dTxt = d === null ? '' : d === 0 ? 'Same as last month' : `${Math.abs(d)}% ${d < 0 ? 'less' : 'more'} than last month`;

    return `<div class="f-in">
      <section class="f-hd"><p>Spent in ${mon}</p><h4>${money2(c.spent)}</h4>${dTxt ? `<small class="${d <= 0 ? 'good' : 'bad'}">${dTxt}</small>` : ''}</section>
      <section class="f-sec">
        <div class="f-ch"><span>Spending</span></div>
        <svg class="f-line" viewBox="0 0 ${W} ${H}" role="img" aria-label="Running total of spending this month">
          <defs><linearGradient id="fInA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1d24" stop-opacity=".12"/><stop offset="1" stop-color="#1d1d24" stop-opacity="0"/></linearGradient></defs>
          <line class="f-base" x1="0" y1="${H - B}" x2="${W}" y2="${H - B}"/>
          <path class="f-area" d="${area}" fill="url(#fInA)"/>
          <path class="f-ln" d="${line}" pathLength="1"/>
          <circle class="f-dot" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4"/>
        </svg>
        <div class="f-ax"><span>1 ${monS}</span><span>${dim} ${monS}</span></div>
      </section>
      <section class="f-sec">
        <div class="f-ch"><span>Categories</span></div>
        <div class="f-seg" role="img" aria-label="Spending by category">${segs}</div>
        <div class="f-cl">${rows}</div>
      </section>
      <section class="f-st">
        <div><small>Daily average</small><b>${money(Math.round(c.spent / today))}</b></div>
        <div><small>Top expense</small><b>${money(bigX.amt)}</b><em>${esc(bigX.note || OUT[bigX.cat][1])}</em></div>
        <div><small>Projected</small><b>${money2(proj)}</b><em class="${over ? 'bad' : 'good'}">${over ? 'Over budget' : 'On track'}</em></div>
      </section>
    </div>`;
  }

  /* ---------- sheets ---------- */
  let mode = 'out', cat = 'food';
  /* amount: typed on our own number pad. Every digit is a 0-9 strip that rolls (with a blur) into place, same family as the big balance */
  let ex = '';
  const val = () => r2(parseFloat(ex) || 0);
  const valid = () => val() > 0;
  const AMT_STRIP = Array.from({ length: 20 }, (_, i) => `<i>${i % 10}</i>`).join('');   // 0-9 twice, so a new digit can always roll upward
  const AMT_MS = 680;
  let aSlots = [];                           // one slot per typed character
  const commaAfter = (i, n) => { const p = n - 1 - i; return p > 0 && (p === 3 || (p > 3 && (p - 3) % 2 === 0)); };   // Indian grouping: 1,23,456

  function rollSlot(s, v, from, anim) {
    const r = s.strip, h = r.offsetHeight / 20, idx = v + 10;
    let y = -from * h;
    if (r._anim) { y = new DOMMatrixReadOnly(getComputedStyle(r).transform).m42; r._anim.cancel(); r._anim = null; }
    const yTo = -idx * h;
    r.style.setProperty('--n', idx);         // final resting position
    s.idx = idx;
    if (!anim || reduce || !h || Math.abs(y - yTo) < .5) return;
    const dist = Math.min(1, Math.abs(y - yTo) / (h * 5));
    const a = r.animate([
      { transform: `translate3d(0, ${y}px, 0)`, filter: 'blur(0px)' },
      { filter: `blur(${(1.4 + 2.6 * dist).toFixed(2)}px)`, offset: .3 },
      { transform: `translate3d(0, ${yTo}px, 0)`, filter: 'blur(0px)' }
    ], { duration: AMT_MS, easing: ROLL_EASE, fill: 'backwards' });
    r._anim = a;
    a.onfinish = a.oncancel = () => { if (r._anim === a) r._anim = null; };
  }
  function fillSlot(s, ch, anim) {
    const d = s.el.firstElementChild;
    if (isD(ch)) {
      if (!s.strip) { d.className = 'a-d'; d.innerHTML = `<span class="a-r">${AMT_STRIP}</span>`; s.strip = d.firstChild; s.idx = null; }
      rollSlot(s, +ch, s.idx == null ? +ch + 6 : s.idx, anim);   // a brand new digit starts four steps below and rolls up into place
    } else { s.strip = null; s.idx = null; d.className = 'a-d a-dot'; d.textContent = ch; }
    s.ch = ch;
  }
  function renderAmt(init) {
    const chars = ex ? [...ex] : ['0'];      // empty shows a ghost 0 that rolls into the first digit
    const n = ex.includes('.') ? ex.indexOf('.') : chars.length;
    while (aSlots.length > chars.length) {
      const s = aSlots.pop();
      s.el.classList.remove('in'); s.el.classList.add('out');
      setTimeout(() => s.el.remove(), 280);
    }
    chars.forEach((ch, i) => {
      let s = aSlots[i];
      if (!s) {
        const el = document.createElement('span');
        el.className = 'a-s' + (init ? '' : ' in');
        el.innerHTML = '<span class="a-d"></span><span class="a-k">,</span>';
        amtN.appendChild(el);                // in the DOM first, so the strip can be measured
        s = aSlots[i] = { el, strip: null, idx: null, ch: null };
        fillSlot(s, ch, !init);
      } else if (s.ch !== ch) fillSlot(s, ch, !init);
      s.el.classList.toggle('c', !!ex && i < n && commaAfter(i, n));
    });
    amtW.classList.toggle('is-blank', !ex);
    amtW.dataset.n = ex.length > 8 ? 's' : ex.length > 6 ? 'm' : '';
    amtW.setAttribute('aria-label', 'Amount ₹' + (ex || '0'));
  }
  function show(init) { renderAmt(init); saveBtn.disabled = !valid(); }
  function press(k) {
    if (k === 'del') ex = ex.slice(0, -1);
    else if (k === '.') {
      if (ex.includes('.') || ex.length >= 11) return;
      ex += ex === '' ? '0.' : '.';
    } else {
      if (ex === '0') { if (k === '0') return; ex = k; }
      else if (ex.length >= 12 || (ex.includes('.') && ex.split('.')[1].length >= 2)) return;
      else ex += k;
    }
    show();
  }
  function openSheet(s) { s.classList.add('open'); back.classList.add('open'); snd(); }
  function closeSheets() {
    if (!form.classList.contains('open') && !insS.classList.contains('open')) return;
    form.classList.remove('open'); insS.classList.remove('open'); back.classList.remove('open');
    cats.classList.remove('adding');
    if (document.activeElement) document.activeElement.blur();
    snd();
  }
  /* categories: a sideways strip that fades into blur at either end, and a + pill to add your own */
  const catSet = () => mode === 'in' ? IN : OUT;
  const SHOWN = { out: ['food', 'transport', 'other'], in: ['salary', 'freelance', 'other'] };   // the 3 in the strip; other categories stay defined so old history rows keep their icon
  const catKeys = () => [...S.custom[mode === 'in' ? 'in' : 'out'].map(c => c.k).reverse(), ...SHOWN[mode === 'in' ? 'in' : 'out']];   // yours first
  const chipHtml = (k, delay) => `<button class="f-chip${k === cat ? ' on' : ''}" type="button" data-c="${k}" aria-pressed="${k === cat}" style="animation-delay:${delay}ms">${esc(catSet()[k][1])}</button>`;
  function edges() {                         // blur only on the side that has more to scroll
    cw.classList.toggle('l', chips.scrollLeft > 6);
    cw.classList.toggle('r', chips.scrollLeft + chips.clientWidth < chips.scrollWidth - 6);
  }
  function drawChips() {
    chips.innerHTML = catKeys().map((k, i) => chipHtml(k, 110 + Math.min(i, 8) * 38)).join('');
    chips.scrollLeft = 0;
    requestAnimationFrame(edges);
  }
  function pick(k, center) {
    cat = k;
    chips.querySelectorAll('.f-chip').forEach(b => { const on = b.dataset.c === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const b = chips.querySelector(`[data-c="${k}"]`);
    if (b && center) {
      const r = b.getBoundingClientRect(), c = chips.getBoundingClientRect();
      chips.scrollTo({ left: chips.scrollLeft + (r.left - c.left) - (c.width - r.width) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  function adding(on) {
    cats.classList.toggle('adding', on);
    plus.setAttribute('aria-expanded', on);
    plus.setAttribute('aria-label', on ? 'Cancel' : 'New category');
    newIn.value = ''; newOk.disabled = true;
    if (on) setTimeout(() => newIn.focus({ preventScroll: true }), 170); else newIn.blur();
  }
  function addCat() {
    const raw = newIn.value.replace(/\s+/g, ' ').trim();
    if (!raw) return;
    const label = raw[0].toUpperCase() + raw.slice(1), set = catSet(), m = mode === 'in' ? 'in' : 'out', list = S.custom[m];
    let k = Object.keys(set).find(x => set[x][1].toLowerCase() === label.toLowerCase());
    if (k && catKeys().includes(k)) pick(k, true);          // already in the strip: just select it
    else {
      if (k) SHOWN[m].unshift(k);                           // a known category that was tucked away: bring it back
      else {
        k = 'c' + Date.now().toString(36);
        const [tint, color] = CAT_HUES[list.length % CAT_HUES.length];
        list.push({ k, label, tint, color });
        set[k] = mode === 'in' ? [CAT_TAG, label, tint] : [CAT_TAG, label, tint, color];
        save();
      }
      cat = k;
      chips.querySelectorAll('.f-chip').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
      chips.insertAdjacentHTML('afterbegin', chipHtml(k, 80));
      chips.scrollTo({ left: 0, behavior: reduce ? 'auto' : 'smooth' });
      requestAnimationFrame(edges);
    }
    play('select');
    adding(false);
  }
  /* date: opens the same glass month sheet the Tasks screen uses (main.js, DatePicker); no future days */
  let fdate = ymd(now);
  const fromYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  function setDate(s) {
    fdate = s;
    const d = fromYmd(s), diff = Math.round((fromYmd(ymd(now)) - d) / 864e5);
    dateT.textContent = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday'
      : d.toLocaleDateString('en-GB', d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function openForm(m) {
    mode = m; cat = m === 'in' ? 'salary' : 'food';
    $('#fTitle').textContent = { in: 'Add funds', out: 'Spend', bud: 'Monthly budget' }[m];
    saveBtn.textContent = { in: 'Add funds', out: 'Add expense', bud: 'Save budget' }[m];
    ex = m === 'bud' ? String(S.budget) : ''; noteIn.value = ''; setDate(ymd(now));
    cats.hidden = two.hidden = m === 'bud';
    adding(false);
    drawChips();
    amtN.innerHTML = ''; aSlots = []; show(true);   // fresh digits, no roll on open
    openSheet(form);
  }
  function saveForm() {
    if (!valid()) return;
    const v = val();
    let id = 0;
    if (mode === 'bud') S.budget = Math.round(v);
    else S.tx.push({ id: id = uid++, type: mode, amt: Math.round(v * 100) / 100, cat, note: noteIn.value.trim(), date: fdate, time: new Date().toTimeString().slice(0, 5) });
    save(); closeSheets(); render();
    if (id) popIn(id);
  }

  /* ---------- delete: swipe left (or Delete key), with a 10 s undo pill (same one Tasks uses) ---------- */
  const UNDO_MS = 10000, MORPH_DELAY = 400;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.setProperty('--undo', UNDO_MS + 'ms');
  toast.innerHTML = `
    <button class="undo-button" type="button">
      <span class="undo-icon-wrapper" aria-hidden="true">
        <svg class="undo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path></svg>
      </span>
      <span class="label-wrapper"><span class="label-delete">Transaction deleted</span><span class="label-cancel">Undo</span></span>
      <span class="timer-wrapper" aria-hidden="true"><span class="timer-digits">${Array.from({ length: 10 }, (_, i) => `<span>${10 - i}</span>`).join('')}</span></span>
    </button>`;
  document.body.appendChild(toast);
  const undoBtn = toast.querySelector('.undo-button');
  let undoTx = null, undoT = 0, armT = 0, goneT = 0;

  function hideToast() {
    clearTimeout(undoT); clearTimeout(armT); clearTimeout(goneT);
    undoTx = null;
    toast.classList.remove('show');
    goneT = setTimeout(() => toast.classList.remove('is-active'), 450);
  }
  function showUndo(t) {                     // a newer delete replaces the older undo
    clearTimeout(undoT); clearTimeout(armT); clearTimeout(goneT);
    undoTx = t;
    play('notification');
    undoBtn.setAttribute('aria-label', 'Undo delete: ' + (t.note || 'transaction'));
    toast.classList.remove('is-active');
    toast.classList.add('show');
    armT = setTimeout(() => { toast.classList.add('is-active'); undoT = setTimeout(hideToast, UNDO_MS); }, MORPH_DELAY);
  }
  undoBtn.addEventListener('click', () => {
    if (!undoTx) return;
    const t = undoTx;
    snd(); hideToast();
    S.tx.push(t); save(); render(); popIn(t.id);
  });

  function removeTx(id, sw) {
    const t = S.tx.find(x => x.id === id);
    if (!t || sw.dataset.gone) return;
    sw.dataset.gone = '1';
    const face = sw.querySelector('.f-row'), grp = sw.closest('.f-g');
    const tgt = grp.querySelectorAll('.f-sw').length === 1 ? grp : sw;       // last row of the day: the whole day goes
    sw.style.setProperty('--o', 1);
    play('swipe_01');
    face.style.transform = `translateX(${-(face.offsetWidth + 24)}px)`;
    setTimeout(() => {
      tgt.style.height = tgt.offsetHeight + 'px';
      tgt.style.overflow = 'hidden';
      void tgt.offsetHeight;
      tgt.style.transition = 'height .3s ease, margin-bottom .3s ease, opacity .3s ease';
      tgt.style.height = '0px'; tgt.style.opacity = '0';
      if (tgt === grp) tgt.style.marginBottom = '0px';
    }, 200);
    setTimeout(() => {
      S.tx = S.tx.filter(x => x.id !== id);
      save(); showUndo(t); render();
    }, 520);
  }

  const SWIPE_AT = 92;                       // px to pull before it triggers
  let g = null;
  hist.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    const face = e.target.closest('.f-row');
    if (!face) return;
    g = { face, sw: face.parentElement, id: +face.dataset.row, x0: e.clientX, y0: e.clientY, x: 0, active: false, armed: false, pid: e.pointerId };
  });
  window.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.pid) return;
    let dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (!g.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }      // it's a scroll
      if (dx > -8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;                        // left swipes only
      g.active = true;
      g.x0 = e.clientX; dx = 0;
      try { g.face.setPointerCapture(e.pointerId); } catch (_) {}
      g.face.classList.add('dragging');
    }
    const a = Math.max(0, -dx);
    const pulled = a <= SWIPE_AT ? a : SWIPE_AT + (a - SWIPE_AT) * 0.35;               // resist past the trigger point
    g.x = -pulled;
    g.face.style.transform = `translateX(${g.x}px)`;
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
    if (!s.active) return;
    s.face.classList.remove('dragging');
    s.sw.classList.remove('armed');
    if (e.type === 'pointerup' && s.armed) { removeTx(s.id, s.sw); return; }
    s.face.style.transform = '';             // spring back
    s.sw.style.setProperty('--o', 0);
  }
  window.addEventListener('pointerup', swipeEnd);
  window.addEventListener('pointercancel', swipeEnd);
  hist.addEventListener('keydown', e => {    // keyboard: Delete / Backspace on a focused row
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    const face = e.target.closest('.f-row');
    if (face) { e.preventDefault(); removeTx(+face.dataset.row, face.parentElement); }
  });

  /* ---------- events ---------- */
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add) openForm(b.dataset.add);
    else if (b.dataset.bud !== undefined) openForm('bud');
    else if (b.dataset.all !== undefined) snd();      // dummy for now: open the full transactions screen here later
    else if (b.dataset.ins !== undefined) {
      $('#fInsB').innerHTML = insightsHTML();
      openSheet(insS);
    }
  });
  [form, insS].forEach(s => s.addEventListener('click', e => { if (e.target.closest('[data-x]')) closeSheets(); }));
  chips.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { pick(b.dataset.c, true); snd(); } });
  chips.addEventListener('scroll', edges, { passive: true });
  window.addEventListener('resize', edges);
  plus.addEventListener('click', () => { snd(); adding(!cats.classList.contains('adding')); });
  newOk.addEventListener('click', addCat);
  newIn.addEventListener('input', () => { newOk.disabled = !newIn.value.trim(); });
  newIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addCat(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); adding(false); }   // closes the new-category field, not the whole sheet
  });
  // the phone keyboard opens for the detail / category name: lift the sheet above it (the number pad stays)
  if (window.visualViewport) {
    const vv = visualViewport, fit = () => {
      form.style.setProperty('--kb', Math.max(0, innerHeight - vv.height - vv.offsetTop) + 'px');
      form.style.setProperty('--vvh', vv.height + 'px');
    };
    vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
  }
  saveBtn.addEventListener('click', saveForm);
  dateIn.addEventListener('click', () => {
    if (!window.DatePicker) return;
    snd();
    DatePicker.open(fromYmd(fdate), d => setDate(ymd(d)), { max: fromYmd(ymd(now)), from: dateIn });
  });
  padEl.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { press(b.dataset.k); snd(); } });
  document.addEventListener('keydown', e => {    // desktop keyboard works on the same pad
    if (!form.classList.contains('open') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.tagName === 'INPUT' || document.querySelector('.dp.open')) return;   // typing a detail / category name, or the date sheet is open
    const map = { ',': '.', Backspace: 'del' };
    const k = map[e.key] || e.key;
    if (e.key === 'Enter' && !e.target.closest('button') && e.target.tagName !== 'INPUT') { saveForm(); return; }
    if (k === 'del' || /^[\d.]$/.test(k)) { e.preventDefault(); press(k); }
  });
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === noteIn) saveForm(); });
  back.addEventListener('click', closeSheets);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.defaultPrevented) closeSheets(); });   // main.js already used Escape to close the date sheet

  let enterT = 0;
  document.addEventListener('tabchange', e => {
    const on = e.detail.index === FIN_TAB;
    tasksScreen.hidden = on;
    el.hidden = !on;
    if (on) {
      el.scrollTop = 0;
      el.classList.remove('f-enter'); void el.offsetWidth; el.classList.add('f-enter');
      render(true);                          // digits roll up from 0
      clearTimeout(enterT);
      enterT = setTimeout(() => el.classList.remove('f-enter'), 2400);
    } else { closeSheets(); hideToast(); }
  });
})();