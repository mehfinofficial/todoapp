/* Hero header. On Tasks and Finance the header sits transparent (white ink) over the full-bleed hero card.
   Once the white pane scrolls up under it, the normal frosted header comes back so nothing turns white-on-white.
   Sets body.hero-on (a hero screen is showing) and body.hero-solid (pane has reached the header); style.css does the rest.
   Loaded after finance.js, so its tabchange handler runs after the one that shows / hides the screens. */
(() => {
  const hdr = document.querySelector('.header');
  const screens = [...document.querySelectorAll('main.screen')];
  const body = document.body;
  let cur = null;

  function sync() {
    const pane = cur && cur.querySelector('.t-pane, .f-pane');
    body.classList.toggle('hero-solid', !!pane && cur.scrollTop > pane.offsetTop - hdr.offsetHeight - 6);
  }
  function show() {
    cur = screens.find(s => !s.hidden) || null;
    body.classList.toggle('hero-on', !!cur);
    sync();
  }
  screens.forEach(s => s.addEventListener('scroll', () => { if (s === cur) sync(); }, { passive: true }));
  window.addEventListener('resize', sync);
  let enterT = 0;
  function enter() {
    const t = screens.find(s => s.classList.contains('t-screen'));
    if (!t || t.hidden) return;
    t.classList.remove('t-enter'); void t.offsetWidth; t.classList.add('t-enter');   // restart the animation
    clearTimeout(enterT);
    enterT = setTimeout(() => t.classList.remove('t-enter'), 2000);
  }
  document.addEventListener('tabchange', () => { show(); enter(); });
  show();
})();