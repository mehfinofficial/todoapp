/* UI sounds. Files live in ./sounds/ (SND01_sine pack).
   Usage anywhere:  UISound.play('toggle_on')   |   UISound.play('tap')  (rotates through the tap variants)
   Works on http(s) via Web Audio (instant, no lag). If the page is opened straight from disk (file://)
   the fetch is blocked, so it falls back to plain <audio> elements automatically. */
(() => {
  const BASE = 'sounds/';
  const MASTER = 0.6;                          // global volume, 0..1 (lower = quieter app)
  const KEY = 'ui-sound-muted';

  // per-sound loudness: the files all peak at the same level but are not equally loud, so balance them here
  const VOL = {
     tap_03: .25, tap_04: .25, tap_05: .25,
    toggle_on: .5, toggle_off: .45,
    select: .5, swipe_01: .5,
    notification: .25, celebration: .45,
    transition_up: .15, transition_down: .15,
    caution: .15, disabled: .3
  };
  const TAPS = [ 'tap_03', 'tap_04', 'tap_05'];   // "tap" rotates through these so repeats don't feel robotic
  let tapI = 0;

  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (_) {}

  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  const buffers = {};                          // decoded Web Audio buffers
  const tags = {};                             // <audio> fallbacks

  function useTag(name) {
    if (tags[name]) return;
    const a = new Audio(BASE + name + '.wav');
    a.preload = 'auto';
    tags[name] = a;
  }

  function load(name) {
    if (!ctx) { useTag(name); return; }
    fetch(BASE + name + '.wav')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)))
      .then(buf => { buffers[name] = buf; })
      .catch(() => useTag(name));              // file:// or decode problem -> plain audio element
  }

  try { if (AC) ctx = new AC(); } catch (_) { ctx = null; }
  Object.keys(VOL).forEach(load);

  // browsers keep audio locked until the first tap / key press
  const unlock = () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); };
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(t =>
    window.addEventListener(t, unlock, { capture: true, passive: true }));

  function play(name) {
    if (muted) return;
    if (name === 'tap') name = TAPS[tapI++ % TAPS.length];
    const vol = Math.min(1, (VOL[name] ?? .3) * MASTER);
    if (ctx && buffers[name]) {
      unlock();
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buffers[name];
      g.gain.value = vol;
      src.connect(g); g.connect(ctx.destination);
      src.start(0);
    } else if (tags[name]) {
      const a = tags[name].cloneNode();        // clone so quick repeats can overlap
      a.volume = vol;
      a.play().catch(() => {});
    }
  }

  window.UISound = {
    play,
    isMuted: () => muted,
    setMuted(v) {
      muted = !!v;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (_) {}
    }
  };
})();