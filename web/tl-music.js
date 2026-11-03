/* Background music for the website: six instrumentals by Kevin MacLeod (incompetech.com, Creative Commons Attribution 4.0),
   played one after another in a shuffled order. Starts only from a click, because browsers block sound that starts by itself.
   Quieter during live matches, paused while the tab is hidden. Without this file the game falls back to its built-in music. */
(function () {
  'use strict';
  const TRACKS = [['music/track1.m4a', 'Chill Wave'], ['music/track2.m4a', 'Dream Culture'], ['music/track3.m4a', 'Wallpaper'], ['music/track4.m4a', 'Local Forecast - Elevator'], ['music/track5.m4a', 'Backbay Lounge'], ['music/track6.m4a', 'Easy Lemon']];
  const KEY = 'tl-music', VOL = 0.3, DUCK = 0.1;
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let el = null, on = false, order = [], pos = 0, ducked = false, fade = null, wasHidden = false;

  const shuffle = () => { order = TRACKS.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } pos = 0; };
  const target = () => ducked ? DUCK : VOL;
  const changed = () => { try { window.dispatchEvent(new CustomEvent('tl-music')); } catch (e) {} };
  const fail = m => { try { window.dispatchEvent(new CustomEvent('tl-music-error', { detail: m })); } catch (e) {} };
  function ramp(to, ms) { if (!el) return; clearInterval(fade); const from = el.volume, steps = Math.max(1, Math.round(ms / 40)); let i = 0; fade = setInterval(() => { i++; if (!el) { clearInterval(fade); return; } el.volume = Math.max(0, Math.min(1, from + (to - from) * i / steps)); if (i >= steps) clearInterval(fade); }, 40); }

  function playCurrent() { if (!el) return Promise.resolve(false); const t = TRACKS[order[pos]]; el.src = t[0]; el.volume = 0; el.title = t[1]; return el.play().then(() => { ramp(target(), 1500); return true; }, e => { if (e && e.name === 'NotAllowedError') { on = false; changed(); fail('Tap the music button again to start it.'); } else { fail('The music could not load just now.'); stop(false); } return false; }); }
  function next() { pos = (pos + 1) % order.length; if (pos === 0) shuffle(); playCurrent(); }

  function start() {
    if (on) return Promise.resolve(true); on = true; put(KEY, 'on'); if (!order.length) shuffle();
    if (!el) { el = new Audio(); el.preload = 'auto'; el.addEventListener('ended', next); el.addEventListener('error', () => { if (on) { fail('The music could not load just now.'); stop(false); } }); }
    changed(); return playCurrent();
  }
  function stop(remember) { if (!on && !el) return; on = false; clearInterval(fade); if (el) { try { el.pause(); } catch (e) {} el.removeAttribute('src'); try { el.load(); } catch (e) {} } if (remember !== false) put(KEY, 'off'); changed(); }

  window.tlMusic = {
    on: () => on, toggle: () => { if (on) { stop(true); return Promise.resolve(false); } return start(); },
    skip: () => { if (on) next(); }, duck: d => { ducked = !!d; if (on) ramp(target(), 600); },
    now: () => on && el ? el.title : '', state: () => el ? { on, track: el.title, paused: el.paused, vol: Math.round(el.volume * 100) / 100, t: Math.round(el.currentTime) } : null, tracks: TRACKS.map(t => t[1])
  };
  document.addEventListener('visibilitychange', () => { if (!el || !on) return; if (document.hidden) { wasHidden = true; el.pause(); } else if (wasHidden) { wasHidden = false; el.play().catch(() => {}); } });
  // if music was on last time, start it again at the first click or key press (the browser needs one)
  if (get(KEY) === 'on') { const go = () => { document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); if (get(KEY) === 'on' && !on) start(); }; document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true); }
})();
