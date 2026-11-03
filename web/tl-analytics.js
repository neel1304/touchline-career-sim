/* Touchline analytics: Google Analytics 4, but only after the visitor clicks Allow.
   Nothing from Google is loaded, and no cookies are set, until then. "No thanks" is remembered and never asks again.
   Counts visits, where they come from, and a few game moments (career started, league created or joined, daily challenge, match played).
   No names, no emails, no ads, no cross-site tracking. */
(function () {
  'use strict';
  const cfg = window.TL_FIREBASE, id = cfg && cfg.measurementId, KEY = 'tl-analytics';
  if (!id) return;
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const put = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  let on = false;

  function start() {
    if (on) return; on = true;
    window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id); document.head.appendChild(s);
  }
  function stop() {
    on = false; document.cookie.split(';').forEach(c => { const n = c.split('=')[0].trim(); if (/^_ga/.test(n)) document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; });
    window['ga-disable-' + id] = true;
  }
  window.tlTrack = (name, params) => { if (on && window.gtag) try { gtag('event', name, params || {}); } catch (e) {} };

  // game moments, read from the buttons people press
  const EVENTS = { start: 'career_start', daily: 'daily_challenge_start', flnew: 'league_create', fljoin: 'league_join', flstart: 'league_season_start', flplay: 'league_match', ghplay: 'friend_match', lbpost: 'score_post' };
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-a]'); if (!el) return; const n = EVENTS[el.dataset.a]; if (n) window.tlTrack(n); }, true);

  function banner() {
    if (document.getElementById('tl-consent')) return;
    const d = document.createElement('div'); d.id = 'tl-consent'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Analytics');
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:200;max-width:560px;margin-inline:auto;background:#161c27;color:#f4f6f9;border:1px solid #2b3546;border-top:3px solid #1d5fc8;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;box-shadow:0 14px 40px rgba(0,0,0,.6);font:15px/1.4 Barlow,system-ui,sans-serif';
    const p = document.createElement('p'); p.style.cssText = 'margin:0'; p.textContent = 'Can we use analytics cookies to see how many people play and which parts they use? It helps us improve the game. No names, no ads, nothing shared with anyone else.';
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    const mk = (t, pri, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.style.cssText = 'cursor:pointer;border-radius:6px;padding:9px 18px;font:700 1rem "Barlow Condensed",system-ui,sans-serif;text-transform:uppercase;letter-spacing:.05em;border:1px solid ' + (pri ? '#1d5fc8' : '#2b3546') + ';background:' + (pri ? '#1d5fc8' : '#1e2634') + ';color:#fff'; b.onclick = () => { fn(); d.remove(); }; return b; };
    row.appendChild(mk('Allow', true, () => { put('yes'); start(); })); row.appendChild(mk('No thanks', false, () => { put('no'); stop(); }));
    d.appendChild(p); d.appendChild(row); document.body.appendChild(d);
  }
  window.tlAnalyticsChoice = () => { const b = document.getElementById('tl-consent'); if (b) b.remove(); banner(); };

  function init() { const c = get(); if (c === 'yes') start(); else if (c !== 'no') banner();
    const f = document.getElementById('tl-privacy'); if (f) f.addEventListener('click', e => { e.preventDefault(); window.tlAnalyticsChoice(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
