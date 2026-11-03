/* Career sim engine. Pure logic, no DOM. Works in Node (tests) and the browser (window.FCE). */
(function (root) {
  'use strict';
  const POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
  const LINE = [0, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3];
  const AW = [0, .1, .4, .4, .5, .8, 1.2, 1.1, 1.1, 1.3, 1.3, 1.6];
  const DW = [2, 1.5, 1.1, 1.1, 1.0, .7, .3, .4, .4, .2, .2, .1];
  const SCW = [0, .28, .22, .22, .35, .8, 1.3, 1.15, 1.15, 1.55, 1.55, 2.0];
  const ASW = [.02, .15, .7, .7, .5, 1.1, 1.8, 1.5, 1.5, 1.5, 1.5, .9];
  const P = { GK: 0, CB: 1, LB: 2, RB: 3, CDM: 4, CM: 5, CAM: 6, LM: 7, RM: 8, LW: 9, RW: 10, ST: 11 };
  const FORMS = {
    '4-3-3': [0, 2, 1, 1, 3, 4, 5, 5, 9, 10, 11],
    '4-4-2': [0, 2, 1, 1, 3, 7, 5, 5, 8, 11, 11],
    '4-2-3-1': [0, 2, 1, 1, 3, 4, 4, 6, 7, 8, 11],
    '3-5-2': [0, 1, 1, 1, 7, 8, 4, 5, 6, 11, 11],
    '3-4-3': [0, 1, 1, 1, 7, 5, 5, 8, 9, 10, 11],
    '5-3-2': [0, 2, 1, 1, 1, 3, 5, 5, 5, 11, 11],
    '4-1-2-1-2': [0, 2, 1, 1, 3, 4, 5, 5, 6, 11, 11]
  };
  // out-of-position penalty matrix
  const PEN = [];
  (function () {
    const close = [['LW', 'LM', 1.5], ['RW', 'RM', 1.5], ['CM', 'CDM', 2], ['CM', 'CAM', 2], ['LM', 'RM', 2], ['LW', 'RW', 2], ['LB', 'RB', 3],
      ['CAM', 'ST', 3.5], ['LW', 'ST', 3], ['RW', 'ST', 3], ['LM', 'LB', 3.5], ['RM', 'RB', 3.5], ['CB', 'CDM', 3], ['CB', 'LB', 3.5], ['CB', 'RB', 3.5],
      ['CAM', 'LW', 2.5], ['CAM', 'RW', 2.5], ['CAM', 'LM', 2.5], ['CAM', 'RM', 2.5], ['CDM', 'CAM', 4], ['CM', 'LM', 3], ['CM', 'RM', 3]];
    for (let a = 0; a < 12; a++) { PEN.push([]); for (let b = 0; b < 12; b++) { let v; if (a === b) v = 0; else if (a === 0 || b === 0) v = 30; else { const d = Math.abs(LINE[a] - LINE[b]); v = d === 0 ? 5 : d === 1 ? 8 : 12; } PEN[a].push(v); } }
    for (const [x, y, v] of close) { PEN[P[x]][P[y]] = v; PEN[P[y]][P[x]] = v; }
  })();
  const PROFILES = [
    { n: 'Steady', gm: 1, end: 26, dec: 30, df: 1 }, { n: 'Early bloomer', gm: 1.5, end: 24, dec: 29, df: 1 },
    { n: 'Late bloomer', gm: .65, end: 29, dec: 32, df: 1 }, { n: 'Explosive', gm: 1.25, end: 25, dec: 30, df: 1.1 },
    { n: 'Slow burner', gm: .8, end: 28, dec: 31, df: 1 }, { n: 'Evergreen', gm: 1, end: 26, dec: 33, df: .5 }];
  const SHOOTS = ['Finesse Shot', 'Acrobatic', 'Low Driven Shot', 'Gamechanger', 'Chip Shot', 'Power Shot', 'Precision Header', 'Dead Ball'];
  const PASSES = ['Incisive Pass', 'Inventive', 'Long Ball Pass', 'Tiki Taka', 'Whipped Pass', 'Pinged Pass'];
  const GENSTY = [['Far Throw', 'Footwork', 'Cross Claimer', 'Rush Out', 'Far Reach', 'Deflector'], ['Aerial Fortress', 'Intercept', 'Slide Tackle', 'Jockey', 'Bruiser', 'Anticipate', 'Block', 'Long Ball Pass'], ['Technical', 'Incisive Pass', 'Press Proven', 'Relentless', 'Tiki Taka', 'Pinged Pass', 'Long Ball Pass', 'Intercept'], ['Rapid', 'Finesse Shot', 'Quick Step', 'Technical', 'First Touch', 'Power Shot', 'Low Driven Shot', 'Trickster', 'Precision Header']];
  const MENT = ['Park the bus', 'Defensive', 'Balanced', 'Attacking', 'All-out attack'], LINES = ['Low block', 'Mid block', 'High line'], PRESS = ['Stand off', 'Balanced', 'High press'], BUILD = ['Balanced', 'Possession', 'Direct', 'Counter-attack'], TRAIN = ['Light', 'Normal', 'Intense'], WX = ['Clear', 'Rain', 'Storm'];
  const DEPT = { att: 'Attacking coach', mid: 'Midfield coach', def: 'Defensive coach', gk: 'Goalkeeping coach', fit: 'Fitness coach', med: 'Head physio' };
  const WEEKS = 46, SLOTS = 96, LCW = [3, 5, 7, 11, 15, 20, 26], PO = { ENG: { 2: [2, 4], 3: [2, 4], 4: [3, 4] } };
  const EUW = [6, 8, 10, 12, 14, 16, 19, 21], EUKO = { po: [24, 25], r16: [27, 28], qf: [31, 32], sf: [35, 36], f: [41] };
  const CUPW = [2, 4, 9, 13, 18, 23, 30, 40];
  const EUR = ['ENG', 'ESP', 'GER', 'ITA', 'FRA', 'NED', 'POR', 'BEL', 'TUR', 'SCO', 'AUT', 'SUI', 'DEN', 'NOR', 'SWE', 'POL', 'ROU', 'IRL'];
  const CLS = { ENG: 4, ESP: 4, GER: 4, ITA: 4, FRA: 3, NED: 2, POR: 2, BEL: 2, TUR: 2, SCO: 1, AUT: 1, SUI: 1, DEN: 1, NOR: 1, SWE: 1 };
  const ELS = { ENG: 2, ESP: 2, GER: 2, ITA: 2, FRA: 2, NED: 1, POR: 1, BEL: 1, TUR: 1, SCO: 1, AUT: 1, SUI: 1, DEN: 1, NOR: 1, SWE: 1, POL: 1, ROU: 1, IRL: 1 };
  const REL = { ENG: [3, 3, 4], ESP: [3], GER: [2, 3], ITA: [3], FRA: [2] };
  const CUPN = { ENG: 'FA Cup', ESP: 'Copa del Rey', GER: 'DFB-Pokal', ITA: 'Coppa Italia', FRA: 'Coupe de France', NED: 'KNVB Beker', POR: 'Taça de Portugal', SCO: 'Scottish Cup', TUR: 'Turkish Cup', BEL: 'Belgian Cup', USA: 'US Open Cup', IND: 'Super Cup', KSA: "King's Cup", ARG: 'Copa Argentina' };
  const STAGEN = { lp: 'League phase', po: 'Knockout play-off', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', f: 'Final', w: 'Winner' };

  let S = null, D = null, X = null; // state, static data, runtime caches

  function SS0() { return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; }
  // ---------- rng ----------
  function rnd() { let t = S.rs = (S.rs + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function gauss() { return (rnd() + rnd() + rnd() - 1.5) * 1.155; }
  function pois(l) { if (l <= 0) return 0; const e = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > e); return k - 1; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(n) { let t = (n * 2654435761) >>> 0; t ^= t >>> 15; t = Math.imul(t, 2246822519) >>> 0; t ^= t >>> 13; return (t >>> 0) / 4294967296; }

  // ---------- player maths ----------
  function value(p) {
    const a = p.a; const af = a <= 19 ? 1.5 : a <= 21 ? 1.4 : a <= 24 ? 1.25 : a <= 27 ? 1.1 : a === 28 ? 1 : a === 29 ? .85 : a === 30 ? .7 : a === 31 ? .55 : a === 32 ? .4 : a === 33 ? .28 : .15;
    let v = 320000 * Math.exp((p.o - 60) * 0.2) * af;
    if (a <= 25 && p.pot > p.o) v *= Math.min(2.2, 1 + (p.pot - p.o) * 0.07);
    if (p.p === 0) v *= 0.7;
    return Math.max(10000, Math.round(v / 1000) * 1000);
  }
  function wage(p) { return Math.max(300, Math.round(1100 * Math.exp((p.o - 55) * 0.155) * (p.a >= 30 ? 1.1 : 1) / 100) * 100); }
  function dyn(p) { let d = p.fm * 0.9 + (p.mo - 50) * 0.04; if (p.fi < 85) d -= (85 - p.fi) * 0.12; if (p.sh < 70) d -= (70 - p.sh) * 0.05; if (d > 3) d = 3; else if (d < -9) d = -9; return p.o + d; }
  function dynParts(p) { return { base: p.o, form: p.fm * 0.9, morale: (p.mo - 50) * 0.04, fitness: p.fi < 85 ? -(85 - p.fi) * 0.12 : 0, sharp: p.sh < 70 ? -(70 - p.sh) * 0.05 : 0, total: dyn(p) }; }
  function xtv(p) { let v = value(p) * (1 + clamp(p.fm, -3, 3) * 0.035); if (p.c >= 0) v *= p.cy <= 1 ? 0.72 : p.cy === 2 ? 0.9 : p.cy >= 4 ? 1.06 : 1; if (p.ht) v *= 1 + Math.min(3, p.ht) * 0.05; return Math.max(10000, Math.round(v / 1000) * 1000); }
  function styleCalc(p) { let ks = 0, kp = 0; for (const x of p.sty || []) { const nm = D.styles[x % 100], w = x >= 100 ? 2 : 1; if (SHOOTS.indexOf(nm) >= 0) ks += w; else if (PASSES.indexOf(nm) >= 0) kp += w; } p.ks = ks; p.kp = kp; }
  function pen(p, slot) { if (p.p === slot) return 0; for (let i = 0; i < p.al.length; i++) if (p.al[i] === slot) return 0; const v = PEN[p.p][slot]; return p.al.length >= 2 ? v * 0.6 : v; }

  function mkPlayer(r) {
    const id = r[0], h = hash(id), h2 = hash(id * 7 + 3), h3 = hash(id * 13 + 5);
    const a = r[2], o = r[7];
    let gap = a <= 17 ? 9 + h * 10 : a <= 19 ? 6 + h * 10 : a <= 21 ? 3.5 + h * 8 : a <= 23 ? 1.5 + h * 5.5 : a <= 25 ? h * 3.5 : a <= 27 ? h * 1.5 : 0;
    const gp = h2 < .3 ? 0 : h2 < .45 ? 1 : h2 < .6 ? 2 : h2 < .72 ? 3 : h2 < .85 ? 4 : 5;
    gap *= o >= 80 ? 0.6 : o >= 74 ? 0.8 : 1;
    const p = { id, n: r[1], a, nat: r[3], c: r[4], p: r[5], al: r[6], o, pot: Math.min(93, Math.round(o + gap)), gp, st: [r[8], r[9], r[10], r[11], r[12], r[13]], sm: r[14], wf: r[15], ft: r[16],
      w: 0, cy: 1 + Math.floor(h3 * 4.99), mo: 60, fi: 100, sh: 78, fm: 0, inj: 0, tl: 0, idle: 0, ss: SS0(), car: [0, 0, 0], hs: [], j: 0, sty: r[18] || [] };
    p.p0 = p.pot; styleCalc(p);
    p.w = wage(p);
    return p;
  }

  // ---------- caches ----------
  function rebuild() {
    X = { PM: new Map(), byPos: [], xi: new Map(), names: null };
    for (let i = 0; i < 12; i++) X.byPos.push([]);
    for (const c of S.C) c.sq = [];
    for (const p of S.P) { X.PM.set(p.id, p); if (p.c >= -1) X.byPos[p.p].push(p); if (p.c >= 0) S.C[p.c].sq.push(p); }
    for (const c of S.C) c.sq.sort((a, b) => b.o - a.o);
  }
  function names() {
    if (X.names) return X.names; const m = {};
    for (const p of S.P) { const i = p.n.indexOf(' '); if (i < 0) continue; const e = m[p.nat] || (m[p.nat] = [[], []]); if (e[0].length < 150) { e[0].push(p.n.slice(0, i)); e[1].push(p.n.slice(i + 1)); } }
    return X.names = m;
  }
  function calcRep(c) { const s = c.sq; let t = 0, n = Math.min(14, s.length); for (let i = 0; i < n; i++) t += s[i].o; return n ? t / n : 50; }
  function att(ci) { const c = S.C[ci]; const lv = c.l >= 0 ? S.L[c.l].lvl : c.rep; return c.rep * 0.7 + lv * 0.3; }
  function wageBill(ci) { let t = 0; for (const p of S.C[ci].sq) t += p.loan ? p.loan.w : p.w; if (ci === S.user) { if (S.staff) t += staffWages(); for (const id of S.lout || []) { const p = X.PM.get(id); if (p && p.loan && p.loan.o === S.user) t += p.w - p.loan.w; } } return t; }
  // ---------- youth / generated players ----------
  function genPlayer(ci, age, ovr, potGap, potAbs, fpos) {
    const c = S.C[ci], nm = names();
    let nat; if (c.sq.length && rnd() < 0.8) nat = pick(c.sq).nat; else nat = pick(S.P).nat;
    const e = nm[nat] || nm[pick(Object.keys(nm))];
    const pos = fpos !== undefined ? fpos : pick([0, 1, 1, 1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 11]);
    const o = clamp(Math.round(ovr), 40, 80);
    const sp = (b) => clamp(Math.round(o + b + gauss() * 5), 25, 95);
    const st = pos === 0 ? [sp(0), sp(-2), sp(0), sp(1), sp(-12), sp(0)] : LINE[pos] === 1 ? [sp(0), sp(-22), sp(-8), sp(-6), sp(2), sp(4)] : LINE[pos] === 2 ? [sp(0), sp(-6), sp(2), sp(2), sp(-8), sp(-2)] : [sp(6), sp(2), sp(-5), sp(3), sp(-28), sp(-4)];
    const p = { id: S.nid++, n: pick(e[0]) + ' ' + pick(e[1]), a: age, nat, c: ci, p: pos, al: [], o, pot: potAbs ? Math.round(potAbs) : Math.min(91, Math.round(o + potGap)), gp: ri(0, 5), st, sm: ri(2, 4), wf: ri(2, 4), ft: rnd() < .75 ? 1 : 2,
      w: 0, cy: 3, mo: 60, fi: 100, sh: 72, fm: 0, inj: 0, tl: 0, idle: 0, ss: SS0(), car: [0, 0, 0], hs: [], j: S.season, y: 1, sty: [] };
    { const pool = GENSTY[LINE[pos]], k = o >= 62 ? 2 : 1; for (let i = 0; i < k; i++) { const x = D.styles.indexOf(pick(pool)); if (x >= 0 && p.sty.indexOf(x) < 0) p.sty.push(x); } }
    p.p0 = p.pot; styleCalc(p);
    p.w = wage(p); S.P.push(p); X.PM.set(p.id, p); X.byPos[pos].push(p); c.sq.push(p); c.sq.sort((a, b) => b.o - a.o);
    return p;
  }
  function youth(ci) {
    const c = S.C[ci], u = rnd(), q = u * 100, i = Math.floor(q), pd = S.pd;
    let pot = pd[i] + (pd[Math.min(100, i + 1)] - pd[i]) * (q - i); pot = 67.5 + (pot - 67.5) * 0.85 + (c.rep - (S.mrep || 69)) * 0.45 + S.tune + (ci === S.user && S.inc ? S.inc.fac.acd * 1.3 : 0);
    pot = clamp(pot, 48, 91); const gap = Math.min(26, 9 + Math.abs(gauss()) * 6);
    return genPlayer(ci, ri(16, 18), Math.max(40, pot - gap), 0, pot);
  }
  function ensureSquad(ci) {
    const c = S.C[ci]; let guard = 0;
    while (guard++ < 30) {
      let fit = 0, gk = 0; for (const p of c.sq) if (!p.inj) { fit++; if (p.p === 0) gk++; }
      if (fit >= 15 && gk >= 1) break;
      const p = genPlayer(ci, ri(17, 21), c.rep - ri(7, 12), ri(3, 14));
      if (gk < 1) { X.byPos[p.p].splice(X.byPos[p.p].indexOf(p), 1); p.p = 0; X.byPos[0].push(p); }
    }
  }

  // ---------- lineups ----------
  function pickXI(ci) {
    const c = S.C[ci], slots = FORMS[c.f] || FORMS['4-3-3'], sq = c.sq, n = sq.length;
    const pl = new Array(11).fill(null), r = new Array(11).fill(0), used = new Array(n).fill(false);
    let left = 11;
    if (c.xi && ci === S.user && !c.auto) {
      for (let k = 0; k < 11; k++) { const p = X.PM.get(c.xi[k]); if (p && p.c === ci && !p.inj && !p.sus) { const i = sq.indexOf(p); if (i >= 0 && !used[i]) { used[i] = true; pl[k] = p; r[k] = dyn(p) - pen(p, slots[k]); left--; } } }
    }
    const dv = new Array(n);
    for (let i = 0; i < n; i++) { const p = sq[i]; dv[i] = p.inj || p.sus ? -999 : dyn(p) - (p.fi < 72 ? (72 - p.fi) * 0.3 : 0); }
    while (left > 0) {
      let bs = -1, bi = -1, bv = -1e9;
      for (let k = 0; k < 11; k++) { if (pl[k]) continue; const sl = slots[k]; for (let i = 0; i < n; i++) { if (used[i]) continue; const v = dv[i] - pen(sq[i], sl); if (v > bv) { bv = v; bs = k; bi = i; } } }
      if (bi < 0 || bv < -500) break;
      used[bi] = true; pl[bs] = sq[bi]; r[bs] = dyn(sq[bi]) - pen(sq[bi], slots[bs]); left--;
    }
    const bench = [], av = []; for (let i = 0; i < n; i++) if (!used[i] && !sq[i].inj && !sq[i].sus) av.push(sq[i]); { const bn = ci === S.user && c.bn ? c.bn : null, cap = bn ? Math.min(9, bn.length) : 9, tk = f => { if (bench.length >= cap) return; const j = av.findIndex(f); if (j >= 0) bench.push(av.splice(j, 1)[0]); };
      if (bn) { for (const id of bn) tk(p => p.id === id); if (!bench.some(p => p.p === 0) && bn.some(id => { const q = X.PM.get(id); return q && q.p === 0; })) tk(p => p.p === 0); } else { tk(p => p.p === 0); for (const ln of [3, 2, 1, 3, 2, 1]) tk(p => LINE[p.p] === ln); }
      for (const p of av.slice()) { if (bench.length >= cap) break; if (p.p !== 0) bench.push(av.splice(av.indexOf(p), 1)[0]); } }
    let a = 0, aw = 0, d = 0, dw = 0, tot = 0, cnt = 0, dp = 0, dn = 0, ap = 0, an = 0, mp = 0, mn = 0, sp = 0, mw = 0;
    for (let k = 0; k < 11; k++) { const rr = pl[k] ? r[k] : 35; const sl = slots[k], p = pl[k]; a += rr * AW[sl]; aw += AW[sl]; d += rr * DW[sl]; dw += DW[sl]; tot += rr; cnt++; if (!p) { r[k] = 35; continue; }
      const ln = LINE[sl]; if (ln === 1) { dp += p.st[0]; dn++; } else if (ln === 2) { mp += p.st[2]; mw += (p.st[4] + p.st[5]) / 2; mn++; } else if (ln === 3) { ap += p.st[0]; sp += (p.st[5] + p.st[0]) / 2; an++; } }
    return { pl, r, slots, bench, att: a / aw, def: d / dw, avg: tot / cnt, dpace: dn ? dp / dn : 65, apace: an ? ap / an : 70, mpas: mn ? mp / mn : 65, mdef: mn ? mw / mn : 65, sphy: an ? sp / an : 68 };
  }
  function bestFormation(ci) { const c = S.C[ci]; let b = c.f, bv = -1; for (const f in FORMS) { c.f = f; const x = pickXI(ci); if (x.avg > bv) { bv = x.avg; b = f; } } c.f = b; return b; }

  // ---------- match ----------
  const PWT = [0.5, 1.1, 1.0, 1.0, 1.3, 1.35, 1.1, 0.9, 0.9, 0.75, 0.75, 0.55], TWT = [0.02, 1.2, 1.2, 1.2, 1.5, 1.0, 0.4, 0.6, 0.6, 0.3, 0.3, 0.15];
  function staffLv(ci, k) { if (ci === S.user) { const c = S.staff && S.staff[k]; return c ? c.lv : 0; } return k === 'fit' || k === 'med' ? 2 : clamp(Math.round((S.C[ci].rep - 60) / 7), 0, 4); }
  // tactics read against the matchup: [own chance multiplier, chances conceded multiplier, fatigue]. T and O are the two elevens
  // (defenders' pace, forwards' pace, midfield passing and work rate). Every choice buys something and costs something; the players decide which wins out.
  function tacMod(c, T, O, oc) {
    const t = c.tac || [0, 1, 1, 0], u = (oc && oc.tac) || [0, 1, 1, 0], ln = t[1], pr = t[2], bu = t[3], wd = t[4] === undefined ? 1 : t[4];
    const gap = (O.apace || 70) - (T.dpace || 65), mw = ((T.mdef || 65) - 65) / 10, beat = ((O.mpas || 65) - (T.mdef || 65)) / 10, myp = T.mpas || 65, run = (T.apace || 70) - (O.dpace || 65);
    let own = 1 + 0.09 * t[0], opp = 1 + 0.07 * t[0], fat = 1 + 0.04 * Math.max(0, t[0]), risk = 1; // risk: the part of opp that depends on the players, for the live engine
    if (t[0] > 0) { const k = 1 + t[0] * clamp(gap * 0.004, -0.02, 0.06); opp *= k; risk *= k; } // bodies forward leave room for quick forwards
    // defensive line: high squeezes the pitch but leaves the space behind to the race between their forwards and your defenders
    if (ln === 2) { own *= 1.06; opp *= clamp(0.96 + gap * 0.018, 0.88, 1.4); risk *= clamp(1 + gap * 0.018, 0.92, 1.45); }
    else if (ln === 0) { own *= 0.92; opp *= 0.9 * (1 + clamp(((O.sphy || 68) - 70) * 0.006, -0.04, 0.08)); }
    // pressing: wins the ball near their goal if the midfield has the legs and they cannot pass through it
    if (pr === 2) { const k = clamp(1 + beat * 0.05 - mw * 0.03, 0.9, 1.15); own *= 1.05 + clamp(mw * 0.04 - beat * 0.03, -0.05, 0.07); opp *= k; risk *= k; fat *= 1.22; }
    else if (pr === 0) { own *= 0.95; opp *= 0.97 + clamp(beat * 0.02, -0.02, 0.05); fat *= 0.88; }
    // high line and high press together: when the press is played through, the whole half is behind you. A relentless midfield stops it at source.
    if (ln === 2 && pr === 2) { const k = 1 + Math.max(0, gap) * 0.01 * clamp(1 - mw * 0.4, 0.3, 1.4); opp *= k; risk *= k; }
    // build-up
    if (bu === 1) { const e = clamp((myp - 70) * 0.008, -0.08, 0.09); own *= 1 + e; opp *= 1 - e * 0.5; if (u[2] === 2 && myp < 72) { opp *= 1 + (72 - myp) * 0.01; risk *= 1 + (72 - myp) * 0.01; } } // passing out under their press
    else if (bu === 2) { own *= 1 + clamp(((T.sphy || 68) - 70) * 0.008, -0.06, 0.09); if (u[1] === 2) own *= 1 + clamp(run * 0.012, -0.03, 0.12); }
    else if (bu === 3) { own *= 0.94 * (1 + clamp(run * 0.012, -0.06, 0.14)) * (1 + 0.04 * Math.max(0, u[0]) + (u[1] === 2 ? 0.04 : 0)); opp *= 0.95; }
    if (wd === 2) { own *= 1.04; opp *= 1.03; } else if (wd === 0) { own *= 0.97; opp *= 0.96; }
    return [own, opp, fat, risk];
  }
  // AI managers read the matchup before kick-off: no high line with a slower back line, no high press their passers will walk through. Friends' teams keep their own plan.
  function aiTac(c, T, O) { const t = (c.tac || [0, 1, 1, 0]).slice(); if (c.gh) return t; if (t[1] === 2 && (T.dpace || 65) < (O.apace || 70) - 6) t[1] = 1; if (t[2] === 2 && (T.mdef || 65) < (O.mpas || 65) - 6) t[2] = 1; return t; }
  function simMatch(hi, ai, o) {
    o = o || {};
    if (hi === S.user || ai === S.user) { if (LMRES && LMRES.h === hi && LMRES.a === ai) { const r = LMRES; LMRES = null; return r; } const lm = lmCreate(hi, ai, o, 1); lm.auto = 1; lmStep(lm, 200); lmStep(lm, 200); return lmFinish(lm); }
    const H = pickXI(hi), A = pickXI(ai), ch = S.C[hi], ca = S.C[ai];
    const K = 15;
    let lh = (o.neutral ? 1.25 : 1.40) * Math.exp((H.att - A.def) / K), la = (o.neutral ? 1.25 : 1.10) * Math.exp((A.att - H.def) / K);
    const th = { tac: aiTac(ch, H, A) }, ta = { tac: aiTac(ca, A, H) }, mh = tacMod(th, H, A, ta), ma = tacMod(ta, A, H, th);
    const sa = ci => 0.008 * staffLv(ci, 'att') + 0.004 * staffLv(ci, 'mid'), sd = ci => 0.008 * staffLv(ci, 'def') + 0.004 * staffLv(ci, 'mid') + 0.003 * staffLv(ci, 'gk');
    lh *= mh[0] * ma[1] * (1 + sa(hi)) * (1 - sd(ai)); la *= ma[0] * mh[1] * (1 + sa(ai)) * (1 - sd(hi));
    let wx = 0; { const wr = rnd(); if (wr > 0.93) wx = 2; else if (wr > 0.74) wx = 1; }
    if (wx) { const f = wx === 2 ? 0.9 : 0.96, sf = c => c.tac && c.tac[3] === 1 ? 0.97 : c.tac && c.tac[3] === 2 ? 1.02 : 1; lh *= f * sf(ch); la *= f * sf(ca); }
    if (lh > 6) lh = 6; if (la > 6) la = 6;
    let gh = pois(lh), ga = pois(la), note = '', win = gh > ga ? 0 : ga > gh ? 1 : -1;
    const base = o.agg ? [o.agg[1], o.agg[0]] : null; // second leg: aggregate from first (home/away swapped)
    let needTie = o.ko && (base ? (gh + base[0] === ga + base[1]) : gh === ga);
    if (needTie) {
      const eh = pois(lh / 3), ea = pois(la / 3); gh += eh; ga += ea; note = 'aet';
      if (base ? (gh + base[0] === ga + base[1]) : gh === ga) { note = 'pens'; win = rnd() < 0.5 + (H.avg - A.avg) * 0.006 ? 0 : 1; }
      else win = base ? (gh + base[0] > ga + base[1] ? 0 : 1) : (gh > ga ? 0 : 1);
    } else if (o.ko) win = base ? (gh + base[0] > ga + base[1] ? 0 : 1) : (gh > ga ? 0 : 1);
    const bp = c => { const t = c.tac || [0, 1, 1, 0]; return (t[3] === 1 ? 5 : t[3] === 2 ? -2.5 : t[3] === 3 ? -5 : 0) + t[0] * 1.2; }, poss = clamp(50 + (H.mpas - A.mpas) * 0.35 + (H.avg - A.avg) * 0.5 + bp(ch) - bp(ca), 27, 73);
    const sh = applyTeam(H, gh, ga, hi, lh, { fat: mh[2], wx, poss }), sa2 = applyTeam(A, ga, gh, ai, la, { fat: ma[2], wx, poss: 100 - poss });
    { const kh = H.slots.indexOf(0), ka = A.slots.indexOf(0); if (H.pl[kh]) H.pl[kh].ss[15] += Math.max(0, sa2 - ga); if (A.pl[ka]) A.pl[ka].ss[15] += Math.max(0, sh - gh); }
    let best = null; for (let k = 0; k < 11; k++) { const a = H.pl[k], b = A.pl[k]; if (a && (!best || a._r > best._r)) best = a; if (b && (!best || b._r > best._r)) best = b; }
    if (best) best.ss[8]++;
    return { h: hi, a: ai, gh, ga, note, win };
  }
  function applyTeam(T, gf, ga, ci, lam, x) {
    const pl = T.pl, slots = T.slots, r = T.r, c = S.C[ci];
    const g = new Array(11).fill(0), as = new Array(11).fill(0);
    const w = new Array(11), aw = new Array(11), wp = new Array(11), wt = new Array(11); let tw = 0, taw = 0, pw = 0, tw2 = 0;
    for (let k = 0; k < 11; k++) { const p = pl[k]; if (!p) { w[k] = 0; aw[k] = 0; continue; } const f = (r[k] / 70) * (r[k] / 70), sl = slots[k]; w[k] = SCW[sl] * (0.4 + p.st[1] / 100) * f * (1 + 0.05 * (p.ks || 0)) + 0.02; aw[k] = ASW[sl] * (0.4 + p.st[2] / 100) * f * (1 + 0.05 * (p.kp || 0)) + 0.02; wp[k] = PWT[sl] * (0.5 + p.st[2] / 140); wt[k] = TWT[sl] * (0.4 + p.st[4] / 120); tw += w[k]; taw += aw[k]; pw += wp[k]; tw2 += wt[k]; }
    for (let i = 0; i < gf; i++) {
      let y0 = rnd() * tw, k = 0; for (; k < 10; k++) { y0 -= w[k]; if (y0 <= 0) break; }
      g[k]++; let ak = -1;
      if (rnd() < 0.72) { let y = rnd() * (taw - aw[k]); for (ak = 0; ak < 11; ak++) { if (ak === k) continue; y -= aw[ak]; if (y <= 0) break; } if (ak > 10) ak = -1; else as[ak]++; }
    }
    if (X.hat) for (let k = 0; k < 11; k++) if (g[k] >= 3 && pl[k]) X.hat.push([pl[k].id, ci, g[k]]);
    const resAdj = gf > ga ? 0.3 : gf < ga ? -0.3 : 0, xiAvg = T.avg, tac = c.tac || [0, 1, 1, 0], ps = x.poss;
    const fatM = x.fat * (1 - 0.03 * staffLv(ci, 'fit')), injM = (x.wx === 2 ? 1.4 : 1) * (1 - 0.05 * staffLv(ci, 'med')), medM = 1 - 0.07 * staffLv(ci, 'med');
    const passT = 475 * (0.9 + (T.mpas - 60) / 220) * ps / 50 * (tac[3] === 1 ? 1.1 : tac[3] === 2 ? 0.9 : 1), acc0 = clamp(62 + (T.mpas - 55) * 0.8 + (tac[3] === 1 ? 3 : tac[3] === 2 ? -3 : 0) - (x.wx || 0) * 2, 55, 91), tklT = 13 + (100 - ps) * 0.13 + tac[2] * 2, intT = 7 + (100 - ps) * 0.09;
    const capIn = c.cap && pl.some(p => p && p.id === c.cap); let sot = 0;
    for (let k = 0; k < 11; k++) {
      const p = pl[k]; if (!p) continue; const sl = slots[k];
      let rt = 6.45 + gauss() * 0.55 + resAdj + g[k] * 0.95 + as[k] * 0.55 + (r[k] - xiAvg) * 0.03;
      if (LINE[sl] <= 1) rt += (ga === 0 ? 0.5 : -0.18 * Math.min(ga, 4)) + (sl === 0 ? gauss() * 0.3 : 0); else rt += 0.07 * gf;
      rt = clamp(rt, 3.5, 10); p._r = rt;
      const xg = lam * w[k] / tw, sh = g[k] + Math.floor(xg * 4.5 + rnd()), xa = lam * 0.72 * aw[k] / taw, u1 = rnd(), np = passT * wp[k] / pw * (0.85 + 0.3 * u1); sot += g[k] + (sh - g[k]) * 0.33;
      const ss = p.ss; ss[0]++; ss[1] += g[k]; ss[2] += as[k]; ss[3] += rt; if (ga === 0 && LINE[sl] <= 1) ss[4]++; ss[5] += xg; ss[6] += xa; ss[7] += sh;
      ss[10] += tklT * wt[k] / tw2 * (1.4 - 0.8 * u1); ss[11] += intT * wt[k] / tw2 * (0.6 + 0.8 * rnd()); ss[12] += np; ss[13] += np * clamp(acc0 + (p.st[2] - T.mpas) * 0.25 + (LINE[sl] <= 1 ? 4 : LINE[sl] === 3 ? -7 : 0), 45, 97) / 100; ss[14] += as[k] + xa * 2.2;
      const f0 = p.fi;
      p.fi -= (sl === 0 ? 4 : clamp(14 - (p.st[5] - 60) * 0.08, 9, 16)) * fatM; if (p.fi < 20) p.fi = 20;
      p.sh = Math.min(100, (p.sh || 78) + 7);
      p.fm = clamp(p.fm * 0.8 + (rt - 6.6) * 0.55, -3, 3); p.mo = clamp(p.mo + 0.6 + resAdj * 5 + (capIn ? 0.15 : 0), 0, 100);
      if (rnd() < 0.006 * injM * (f0 < 55 ? 2.4 : f0 < 70 ? 1.5 : 1) * (p.kn ? 1.8 : 1)) { p.inj = Math.max(1, Math.round((ri(1, 3) === 3 ? ri(4, 14) : ri(1, 4)) * medM)); if (p.o >= 85 && p.inj >= 4) news('INJURY', p.n + ' out for ' + p.inj + ' weeks', c.n + ' confirm that ' + p.n + ' picked up an injury and will miss around ' + p.inj + ' weeks. A big blow: he is their ' + Math.round(p.o) + '-rated ' + POS[p.p] + '.'); }
      p._pl = S.t;
    }
    for (const q of c.sq) if (q.sus > 0 && q._pl !== S.t) q.sus--; if (rnd() < 0.1) { const q = pl[ri(1, 10)]; if (q) q.sus = 1; }
    const b = T.bench; let subs = 0;
    for (let i = 0; i < b.length && subs < 3; i++) { const p = b[i]; if (p.p === 0) continue; subs++; p.ss[9]++; p.fi -= 4; p.sh = Math.min(100, (p.sh || 78) + 3); p.mo = clamp(p.mo + 0.2, 0, 100); p._pl = S.t; }
    const sq = c.sq; for (let i = 0; i < sq.length; i++) { const p = sq[i]; if (p._pl !== S.t && !p.inj) p.mo = clamp(p.mo - (p.role !== undefined ? (p.role === 0 ? 1.3 : p.role === 1 ? 0.8 : p.role === 2 ? 0.35 : 0.05) : p.o >= xiAvg - 3 ? 0.8 : 0.1), 0, 100); }
    return sot;
  }

  // ---------- minute-by-minute engine: every match the user's club plays ----------
  let LM = null, LMRES = null;
  function lmLine(T, p, k, min) {
    const sl = T.slots[k], L = { p, id: p.id, k, sl, on: min, off: 0, mins: 0, g: 0, a: 0, sh: 0, sot: 0, pas: 0, cmp: 0, kp: 0, tk: 0, it: 0, sv: 0, y: 0, xg: 0, xa: 0, dz: gauss() * 1.1, en: 60 + 0.4 * p.fi, mp: 0.8 + rnd() * 0.4, mt: 0.6 + rnd() * 0.8, mi: 0.6 + rnd() * 0.8, base: dyn(p) - pen(p, sl), warn: 0 };
    T.L.push(L); return L;
  }
  function lmSide(ci, side) {
    const x = pickXI(ci), c = S.C[ci], T = { ci, side, f: c.f, slots: x.slots.slice(), bench: x.bench.slice(), cur: new Array(11).fill(null), L: [], subs: 0, an: 0, chase: 0, tac: (c.tac || [0, 1, 1, 0]).slice(), rl: ci === S.user ? Object.assign({}, c.rl || {}) : {}, fo: ci === S.user ? Object.assign({}, c.fo || {}) : {}, ins: ci === S.user ? Object.assign({}, c.ins || {}) : {}, pk: c.pk || 0, talk: 0, dm: [], g: 0, ys: 0, xg: 0, pos: 0, fouls: 0, cor: 0, offs: 0, fat: 1, plan: [ri(56, 64), ri(66, 74), ri(76, 84)], mine: ci === S.user, pr: 425 + rnd() * 100, tkr: 0.58 + rnd() * 0.2, w: [], aw: [], wp: [], wt: [], acc: [] };
    for (let k = 0; k < 11; k++) if (x.pl[k]) T.cur[k] = lmLine(T, x.pl[k], k, 0);
    return T;
  }
  function lmR(L) { return L.base + L.dz + (L.en < 50 ? -(50 - L.en) * 0.12 : 0); }
  function lmCalc(T, wx) {
    let a = 0, aw = 0, d = 0, dw = 0, tot = 0, dp = 0, dn = 0, ap = 0, an = 0, mp = 0, mn = 0, sp = 0, mw = 0; T.tw = 0; T.taw = 0; T.pw = 0; T.tw2 = 0;
    for (let k = 0; k < 11; k++) {
      const L = T.cur[k], sl = T.slots[k], rd = L && T.rl[k] ? ROLEDEF[sl][T.rl[k]] : null, rr = L ? lmR(L) + (rd ? roleFit(L.p, sl, T.rl[k]) : 0) : 35; a += rr * AW[sl] * (rd ? 1 + (rd[1] - 1) * 0.5 : 1); aw += AW[sl]; d += rr * DW[sl] * (rd ? 1 + (rd[2] - 1) * 0.5 : 1); dw += DW[sl]; tot += rr; T.dm[k] = rd ? rd[6] : 1;
      if (!L) { T.w[k] = T.aw[k] = T.wp[k] = T.wt[k] = 0; continue; } const p = L.p, ln = LINE[sl], f = (rr / 70) * (rr / 70);
      if (ln === 1) { dp += p.st[0]; dn++; } else if (ln === 2) { mp += p.st[2]; mw += (p.st[4] + p.st[5]) / 2; mn++; } else if (ln === 3) { ap += p.st[0]; sp += (p.st[5] + p.st[0]) / 2; an++; }
      T.w[k] = SCW[sl] * (0.4 + p.st[1] / 100) * f * (1 + 0.05 * (p.ks || 0)) + 0.02; T.aw[k] = ASW[sl] * (0.4 + p.st[2] / 100) * f * (1 + 0.05 * (p.kp || 0)) + 0.02; T.wp[k] = PWT[sl] * (0.5 + p.st[2] / 140); T.wt[k] = TWT[sl] * (0.4 + p.st[4] / 120); if (rd) { T.w[k] *= rd[3]; T.aw[k] *= rd[4]; }
      T.tw += T.w[k]; T.taw += T.aw[k]; T.pw += T.wp[k]; T.tw2 += T.wt[k];
    }
    T.att = a / aw; T.def = d / dw; T.avg = tot / 11; T.dpace = dn ? dp / dn : 65; T.apace = an ? ap / an : 70; T.mpas = mn ? mp / mn : 65; T.mdef = mn ? mw / mn : 65; T.sphy = an ? sp / an : 68;
    const acc0 = clamp(62 + (T.mpas - 55) * 0.8 + (T.tac[3] === 1 ? 3 : T.tac[3] === 2 ? -3 : 0) - wx * 2, 55, 91);
    for (let k = 0; k < 11; k++) { const L = T.cur[k]; if (L) T.acc[k] = clamp(acc0 + (L.p.st[2] - T.mpas) * 0.25 + (LINE[T.slots[k]] <= 1 ? 4 : LINE[T.slots[k]] === 3 ? -7 : 0), 45, 97) / 100; }
    T.passT = T.pr * (0.9 + (T.mpas - 60) / 220) * (T.tac[3] === 1 ? 1.1 : T.tac[3] === 2 ? 0.9 : 1);
  }
  function lmLam(lm) {
    const H = lm.H, A = lm.A, o = lm.o, wx = lm.wx; lmCalc(H, wx); lmCalc(A, wx);
    let lh = (o.neutral ? 1.25 : 1.40) * Math.exp((H.att - A.def) / 15), la = (o.neutral ? 1.25 : 1.10) * Math.exp((A.att - H.def) / 15);
    const mh = tacMod(H, H, A, A), ma = tacMod(A, A, H, H);
    const sa = T => 0.008 * staffLv(T.ci, 'att') + 0.004 * staffLv(T.ci, 'mid') + (T.mine && S.staff && S.staff.att && S.staff.att.sty === T.tac[3] ? 0.008 : 0), sd = T => 0.008 * staffLv(T.ci, 'def') + 0.004 * staffLv(T.ci, 'mid') + 0.003 * staffLv(T.ci, 'gk');
    lh *= mh[0] * ma[1] * (1 + sa(H)) * (1 - sd(A)); la *= ma[0] * mh[1] * (1 + sa(A)) * (1 - sd(H));
    if (H.mine && !o.neutral && !o.fr && S.inc) lh *= S.inc.tp === 0 ? 1.015 : S.inc.tp === 2 ? 0.99 : 1;
    if (wx) { const f = wx === 2 ? 0.9 : 0.96, sf = T => T.tac[3] === 1 ? 0.97 : T.tac[3] === 2 ? 1.02 : 1; lh *= f * sf(H); la *= f * sf(A); }
    if (!o.fr && (H.mine || A.mine)) { const dd = dq(), co = cohesion() * 0.02; if (H.mine) { lh *= dd.lam * (1 + co); la *= dd.opp * (1 - co * 0.5); } else { la *= dd.lam * (1 + co); lh *= dd.opp * (1 - co * 0.5); } }
    lm.lh = Math.min(6, lh); lm.la = Math.min(6, la); H.fat = mh[2]; A.fat = ma[2]; H.tdo = -PMC.risk * 15 * Math.log(mh[3]); A.tdo = -PMC.risk * 15 * Math.log(ma[3]);
    const bp = t => (t[3] === 1 ? 5 : t[3] === 2 ? -2.5 : t[3] === 3 ? -5 : 0) + t[0] * 1.2; lm.pb = clamp(50 + (H.mpas - A.mpas) * 0.35 + (H.avg - A.avg) * 0.5 + bp(H.tac) - bp(A.tac), 27, 73);
  }
  function lmCreate(hi, ai, o, quick) {
    o = o || {}; let wx = 0; { const wr = rnd(); if (wr > 0.93) wx = 2; else if (wr > 0.74) wx = 1; }
    const lm = { o, wx, min: 0, full: 90, note: '', done: 0, win: -1, sc: [], ev: [], H: lmSide(hi, 0), A: lmSide(ai, 1), auto: 0, asst: 0, dirty: 0, comp: '', rd: '' };
    lmLam(lm); for (const T of [lm.H, lm.A]) if (!T.mine) { const O = T === lm.H ? lm.A : lm.H; T.tac = aiTac(S.C[T.ci], T, O).slice(0, 4).concat(T.tac.slice(4)); } lmLam(lm); lm.str = [Math.round(lm.H.avg * 10) / 10, Math.round(lm.A.avg * 10) / 10]; if (!quick && pmOn(o)) pmInit(lm); return lm;
  }
  function lmRt(lm, T, L) {
    const O = T === lm.H ? lm.A : lm.H, gf = T.g, ga = O.g, res = gf > ga ? 0.3 : gf < ga ? -0.3 : 0, st = !L.on;
    let rt = (st ? 6.35 : 6.1) + L.dz * 0.42 * Math.min(1, L.mins / 30) + res * (st ? 1 : 0.5) * Math.min(1, lm.min / 60) + L.g * 0.95 + L.a * 0.55 + (L.base - T.avg) * 0.03 + L.kp * 0.05 + (L.tk + L.it) * 0.025 - L.y * 0.15 - (L.red ? 1 : 0);
    if (LINE[L.sl] <= 1) rt += (ga === 0 ? 0.5 * Math.min(1, L.mins / 90) : -0.18 * Math.min(ga, 4)) + L.sv * 0.1; else rt += 0.07 * gf;
    return clamp(rt, 3.5, 10);
  }
  function lmPick(T, w, tot, not) { let y = rnd() * (tot - (not >= 0 ? w[not] : 0)); for (let k = 0; k < 11; k++) { if (k === not || !T.cur[k]) continue; y -= w[k]; if (y <= 0) return k; } for (let k = 10; k >= 0; k--) if (T.cur[k] && k !== not) return k; return -1; }
  function lmBest(T, k) { const sl = T.slots[k]; let b = null, bv = -1e9; for (const p of T.bench) { if ((sl === 0) !== (p.p === 0)) continue; const v = dyn(p) - pen(p, sl); if (v > bv) { bv = v; b = p; } } return b ? [b, bv] : null; }
  function lmSub(lm, T, k, pin) { const L = T.cur[k], bi = T.bench.indexOf(pin); if (bi < 0) return false; T.bench.splice(bi, 1); if (L) L.off = lm.min; T.cur[k] = lmLine(T, pin, k, lm.min); T.subs++; lm.ev.push([lm.min, 's', T.side, pin.id, L ? L.id : 0]); lm.dirty = 1; return true; }
  function lmAuto(lm, T) {
    if (T.an >= 3 || T.subs >= 5 || lm.min < T.plan[T.an] || lm.min >= lm.full) return; T.an++;
    let bk = -1, bv = 1e9;
    for (let k = 0; k < 11; k++) { const L = T.cur[k]; if (!L || T.slots[k] === 0 || (L.on > 0 && L.on > lm.min - 25)) continue; let ln = 0; for (const q of T.L) if (q.off && LINE[q.sl] === LINE[L.sl]) ln++; const v = L.en + (lmRt(lm, T, L) - 6.5) * 10 + ln * 14 + (LINE[L.sl] === 1 ? 5 : 0) + (L.g ? 8 : 0); if (v < bv) { bv = v; bk = k; } }
    if (bk < 0) return; const c = lmBest(T, bk); if (!c || c[1] < T.cur[bk].base - 7) return; lmSub(lm, T, bk, c[0]);
  }
  function lmInjure(lm, T, k) {
    const L = T.cur[k], p = L.p, c = S.C[T.ci], medM = 1 - 0.07 * staffLv(T.ci, 'med'); p.inj = Math.max(1, Math.round((ri(1, 3) === 3 ? ri(4, 14) : ri(1, 4)) * medM));
    if (T.mine) msg(p.n + ' was injured in the ' + lm.min + 'th minute and is out for about ' + p.inj + ' week' + (p.inj > 1 ? 's' : '') + (p.kn ? '. He had only just come back and was not fully ready.' : L.en < 40 ? '. He was running on empty when it happened.' : '.'), 'inj');
    else if (p.o >= 85 && p.inj >= 4) news('INJURY', p.n + ' out for ' + p.inj + ' weeks', c.n + ' confirm that ' + p.n + ' picked up an injury and will miss around ' + p.inj + ' weeks. A big blow: he is their ' + Math.round(p.o) + '-rated ' + POS[p.p] + '.');
    lm.ev.push([lm.min, 'i', T.side, p.id, 0]); const b = T.subs < 5 ? lmBest(T, k) : null;
    if (b) lmSub(lm, T, k, b[0]); else { L.off = lm.min; T.cur[k] = null; lm.dirty = 1; }
  }
  function lmMinute(lm) {
    const H = lm.H, A = lm.A, fr = lm.o.fr; lm.min++; const m = lm.min;
    if (m % 5 === 1 || lm.dirty) { lmLam(lm); lm.dirty = 0; }
    const ps = clamp(lm.pb + gauss() * 7, 12, 88); H.pos += ps; lm.ps = ps;
    for (let s = 0; s < 2; s++) {
      const T = s ? A : H, O = s ? H : A, lam = s ? lm.la : lm.lh, pb = s ? 100 - lm.pb : lm.pb, pm = T.passT * (s ? 100 - ps : ps) / 50 / 90, tm = (13 + (100 - pb) * 0.13 + T.tac[2] * 2) / 90, im = (7 + (100 - pb) * 0.09) / 90, l1 = lam / 90, dr = T.fat * (1 - 0.03 * staffLv(T.ci, 'fit'));
      T.xg += l1; T.fouls += (9.5 + T.tac[2] * 1.5) / 90;
      for (let k = 0; k < 11; k++) {
        const L = T.cur[k]; if (!L) continue; L.mins++; L.en -= (T.slots[k] === 0 ? 0.1 : clamp(0.62 - (L.p.st[5] - 60) * 0.004, 0.46, 0.76)) * dr * (T.dm[k] || 1);
        const np = pm * T.wp[k] / T.pw * L.mp; L.pas += np; L.cmp += np * T.acc[k]; L.tk += tm * T.wt[k] / T.tw2 * L.mt; L.it += im * T.wt[k] / T.tw2 * L.mi; L.xg += l1 * T.w[k] / T.tw; const xa = l1 * 0.72 * T.aw[k] / T.taw; L.xa += xa; L.kp += xa * 2.2;
        if (T.mine && !L.warn && L.en < 46 && T.slots[k] !== 0) { L.warn = 1; lm.ev.push([m, 'w', s, L.id, 0]); }
      }
      const u = rnd();
      if (u < l1) { const pk = rnd() < 0.11; let k = -1; if (pk) { k = T.cur.findIndex(L => L && L.id === T.pk); if (k < 0) { let bv = -1; for (let q = 1; q < 11; q++) { const L = T.cur[q]; if (L && T.slots[q] !== 0 && L.p.st[1] > bv) { bv = L.p.st[1]; k = q; } } } } else k = lmPick(T, T.w, T.tw, -1); const L = k >= 0 ? T.cur[k] : null; if (L) { L.g++; L.sh++; L.sot++; T.g++; let aid = pk ? -1 : 0; if (!pk && rnd() < 0.72) { const ak = lmPick(T, T.aw, T.taw, k), AL = ak >= 0 ? T.cur[ak] : null; if (AL) { AL.a++; aid = AL.id; } } lm.sc.push([L.id, m, s, aid]); lm.ev.push([m, 'g', s, L.id, aid]); } }
      else if (u < l1 + (4.5 * lam + 1.2) / 90) { const k = lmPick(T, T.w, T.tw, -1), L = k >= 0 ? T.cur[k] : null; if (L) { L.sh++; if (rnd() < 0.36) { L.sot++; const gk = O.cur[O.slots.indexOf(0)]; if (gk) gk.sv++; lm.ev.push([m, 'c', s, L.id, 0]); } else if (rnd() < 0.4) lm.ev.push([m, 'm', s, L.id, 0]); if (rnd() < 0.4) T.cor++; } }
      const v = rnd(), yp = (1.4 + T.tac[2] * 0.35) / 90;
      if (v < yp + 0.045 / 90) { const cw = k => T.cur[k] ? (TWT[T.slots[k]] + 0.25) * (trait(T.cur[k].p) === 4 ? 1.6 : 1) : 0; let wy = 0; for (let k = 0; k < 11; k++) wy += cw(k); let y = rnd() * wy, kk = -1; for (let k = 0; k < 11; k++) { if (!T.cur[k]) continue; y -= cw(k); if (y <= 0) { kk = k; break; } } const L = kk >= 0 ? T.cur[kk] : null;
        if (L && T.slots[kk] !== 0) { if (v >= yp) lmRed(lm, T, kk, 1); else if (!L.y) { L.y = 1; T.ys++; lm.ev.push([m, 'y', s, L.id, 0]); } else if (rnd() < 0.45) { T.ys++; lmRed(lm, T, kk, 2); } } }
      else if (v < yp + 0.045 / 90 + (O.tac[1] === 2 ? 2.8 : 1.6) / 90) T.offs++;
      else if (v > 1 - 0.035 / 90) { let k = T.cur.findIndex(L => L && L.id === T.pk); if (k < 0) { let bv = -1; for (let q = 1; q < 11; q++) { const L = T.cur[q]; if (L && L.p.st[1] > bv) { bv = L.p.st[1]; k = q; } } } const L = k >= 0 ? T.cur[k] : null; if (L) { L.sh++; const gk = O.cur[O.slots.indexOf(0)]; if (rnd() < 0.65) { L.sot++; if (gk) gk.sv++; } lm.ev.push([m, 'x', s, L.id, 0]); } }
      const tr = T.mine ? (S.C[T.ci].tr === undefined ? 1 : S.C[T.ci].tr) : 1, ir = 0.006 / 90 * 11 * (lm.wx === 2 ? 1.4 : 1) * (tr === 0 ? 0.85 : tr === 2 ? 1.25 : 1) * (1 - 0.05 * staffLv(T.ci, 'med')) * (fr ? 0.3 : 1);
      if (rnd() < ir * 6.48) { const k = ri(0, 10), L = T.cur[k]; if (L && rnd() < (L.p.fi < 55 ? 2.4 : L.p.fi < 70 ? 1.5 : 1) * (L.p.kn ? 1.8 : 1) * (L.en < 35 ? 1.5 : 1) / 6.48) lmInjure(lm, T, k); }
    }
  }
  function lmRed(lm, T, k, kind) { const L = T.cur[k]; L.red = kind; L.off = lm.min; T.cur[k] = null; lm.ev.push([lm.min, 'r', T.side, L.id, kind]); lm.dirty = 1; }
  function lmTie(lm) { const a = lm.o.agg; return a ? lm.H.g + a[1] === lm.A.g + a[0] : lm.H.g === lm.A.g; }
  function lmStep(lm, n) {
    for (let i = 0; i < n && !lm.done; i++) {
      if (lm.min >= lm.full) { if (lm.full === 90 && lm.o.ko && lmTie(lm)) { lm.full = 120; lm.note = 'aet'; } else { lm.done = 1; break; } }
      if (lm.pm) { if (PMC.strict) pmChunk(lm); else { try { pmChunk(lm); } catch (e) { if (typeof console !== 'undefined') console.error('positional engine', e); lm.pm = null; lm.min = Math.min(lm.min, lm.full - 1); lmMinute(lm); } } } else lmMinute(lm);
      for (let s = 0; s < 2; s++) { const T = s ? lm.A : lm.H, O = s ? lm.H : lm.A; if (!T.mine || lm.auto || lm.asst) lmAuto(lm, T);
        if (!T.mine && !T.chase && lm.min >= 70 && lm.min <= 90) { const d = T.g - O.g; if (d < 0) { T.tac[0] = Math.min(2, T.tac[0] + 1); T.chase = 1; lm.dirty = 1; } else if (d > 0 && lm.min >= 80) { T.tac[0] = Math.max(-2, T.tac[0] - 1); T.chase = 1; lm.dirty = 1; } } }
    }
    if (!lm.done && lm.min >= lm.full && !(lm.full === 90 && lm.o.ko && lmTie(lm))) lm.done = 1;
    return lm.done;
  }
  function lmSnap(lm) {
    const H = lm.H, A = lm.A, hp = lm.min ? Math.round(H.pos / lm.min) : 50;
    const mk = T => { const tot = [T === H ? hp : 100 - hp, 0, 0, 0, 0, 0, 0, 0, Math.round(T.fouls) + T.ys, T.cor, T.offs, T.ys, 0];
      const p = T.L.map(L => { const a = [L.id, L.sl, Math.round(lmRt(lm, T, L) * 10) / 10, L.g, L.a, L.sh, L.sot, Math.round(L.pas), Math.round(L.cmp), Math.round(L.kp) + L.a, Math.round(L.tk), Math.round(L.it), L.sv, L.mins, L.y, L.on, L.off, Math.round(L.en), L.red || 0]; tot[1] += a[5]; tot[2] += a[6]; tot[3] += a[7]; tot[4] += a[8]; tot[5] += a[10]; tot[7] += a[11]; tot[12] += a[12]; return a; });
      tot[6] = Math.round(tot[5] * T.tkr); return { f: T.f, p, t: tot }; };
    return { h: H.ci, a: A.ci, gh: H.g, ga: A.g, note: lm.note, win: lm.win, min: lm.min, full: lm.full, sc: lm.sc, ev: lm.ev, md: [mk(H), mk(A)], xg: [Math.round(H.xg * 100) / 100, Math.round(A.xg * 100) / 100], str: lm.str, wx: lm.wx, ps: Math.round(lm.ps === undefined ? 50 : lm.ps), lam: [Math.round(lm.lh * 100) / 100, Math.round(lm.la * 100) / 100], tac: [H.tac.slice(), A.tac.slice()], comp: lm.comp, rd: lm.rd, fr: lm.o.fr ? 1 : 0, t: S.t, px: lm.pm ? pmPx(lm) : null };
  }
  function lmFinish(lm) {
    const H = lm.H, A = lm.A, o = lm.o, fr = o.fr, gh = H.g, ga = A.g, ag = o.agg;
    let win = gh > ga ? 0 : ga > gh ? 1 : -1;
    if (o.ko) { const th = gh + (ag ? ag[1] : 0), ta = ga + (ag ? ag[0] : 0); if (th === ta) { lm.note = 'pens'; win = rnd() < 0.5 + (H.avg - A.avg) * 0.006 ? 0 : 1; } else win = th > ta ? 0 : 1; }
    lm.win = win; lm.done = 1; let best = null, br = -1;
    for (let s = 0; s < 2; s++) {
      const T = s ? A : H, O = s ? H : A, c = S.C[T.ci], gf = T.g, gc = O.g, res = gf > gc ? 0.3 : gf < gc ? -0.3 : 0, fatM = T.fat * (fr ? 0.5 : 1) * (1 - 0.03 * staffLv(T.ci, 'fit')), capIn = c.cap && T.L.some(L => L.id === c.cap && !L.on);
      for (const L of T.L) {
        const p = L.p, rt = lmRt(lm, T, L), st = !L.on, sl = L.sl; p._r = rt; if (rt > br && L.mins >= 20) { br = rt; best = p; }
        if (fr) { if (st) { const fs = p.fs || (p.fs = [0, 0, 0, 0]); fs[0]++; fs[1] += L.g; fs[2] += L.a; fs[3] += rt; } }
        else { const ss = p.ss; if (st) { ss[0]++; ss[3] += rt; if (gc === 0 && LINE[sl] <= 1) ss[4]++; } else ss[9]++; ss[1] += L.g; ss[2] += L.a; ss[5] += L.xg; ss[6] += L.xa; ss[7] += L.sh; ss[10] += L.tk; ss[11] += L.it; ss[12] += L.pas; ss[13] += L.cmp; ss[14] += L.kp + L.a; ss[15] += L.sv; }
        p.fi = Math.max(20, p.fi - (sl === 0 ? 4 : clamp(14 - (p.st[5] - 60) * 0.08, 9, 16)) * fatM * L.mins / 90);
        p.sh = Math.min(100, (p.sh || 78) + (st ? (fr ? 5 : 7) : 3));
        if (!fr) { if (st) { p.fm = clamp(p.fm * 0.8 + (rt - 6.6) * 0.55, -3, 3); p.mo = clamp(p.mo + 0.6 + res * 5 + (capIn ? 0.15 : 0), 0, 100); } else { p.mo = clamp(p.mo + 0.2 + (L.g ? 1 : 0), 0, 100); if (L.g || L.a) p.fm = clamp(p.fm + 0.3, -3, 3); } }
        if (!fr) { if (L.red) { p.sus = L.red === 2 ? 1 : ri(1, 3); if (T.mine) msg(p.n + ' was sent off and is suspended for ' + p.sus + ' match' + (p.sus > 1 ? 'es' : '') + '.', 'ev'); } else if (L.y && T.mine) { p.yc = (p.yc || 0) + 1; if (p.yc >= 5) { p.yc = 0; p.sus = 1; msg(p.n + ' has picked up five yellow cards and misses the next match.', 'ev'); } } if (T.mine && st && trait(p) === 4) p.mo = clamp(p.mo + res * 3, 0, 100); }
        p._pl = S.t;
      }
      if (!fr) { const ld = T.mine ? Math.min(3, T.L.filter(L => !L.on && trait(L.p) === 1).length) : 0; for (const q of c.sq) { if (q.sus > 0 && q._pl !== S.t) q.sus--; if (ld && q._pl === S.t) q.mo = clamp(q.mo + 0.12 * ld, 0, 100); } }
      if (!fr) { const sq = c.sq, xa = T.avg; for (let i = 0; i < sq.length; i++) { const p = sq[i]; if (p._pl !== S.t && !p.inj) p.mo = clamp(p.mo - (p.role !== undefined ? (p.role === 0 ? 1.3 : p.role === 1 ? 0.8 : p.role === 2 ? 0.35 : 0.05) : p.o >= xa - 3 ? 0.8 : 0.1), 0, 100); } }
    }
    if (!fr && best) best.ss[8]++;
    const r = lmSnap(lm); r.best = best ? best.id : 0; if (lm.note === 'pens') { const w = ri(3, 5), l = Math.max(0, w - ri(1, 2)); r.pens = win === 0 ? [w, l] : [l, w]; } const us = r.md[H.mine ? 0 : 1]; r.rt = us.p.filter(L => !L[15]).map(L => [L[0], L[1], L[2]]); let mo = null; for (const L of us.p) if (!mo || L[2] > mo[2]) mo = L; r.motm = mo ? mo[0] : 0;
    return r;
  }
  function cupDraw(cup, r) { if (cup.dr && cup.dr[0] === r) return cup.dr[1]; let ent = cup.alive; if (r >= 1 && cup.wait.length) { ent = ent.concat(cup.wait); cup.wait = []; } if (r === 0 && cup.alive.length === 0) { cup.alive = cup.wait; cup.wait = []; ent = cup.alive; } shuffle(ent); cup.dr = [r, ent]; return ent; }
  function userFixture() {
    const u = S.user;
    for (const ev of S.sched[S.t] || []) {
      if (ev[0] === 'P') { const Q = S.po[ev[1]]; if (!Q) continue; if (ev[2] === 'f') { const T = Q.f; if (T && (T.a === u || T.b === u)) return { h: T.a, a: T.b, o: { ko: true, neutral: true }, comp: Q.n, rd: 'Final' }; } else for (const T of Q.sf) { if (T.a !== u && T.b !== u) continue; if (ev[3] === 0) return { h: T.b, a: T.a, o: {}, comp: Q.n, rd: 'Semi-final, 1st leg' }; const f = T.legs[0]; return { h: T.a, a: T.b, o: { ko: true, agg: [f[1], f[0]] }, comp: Q.n, rd: 'Semi-final, 2nd leg' }; } continue; }
      if (ev[0] === 'L') { if (S.C[u].l !== ev[1]) continue; const L = S.L[ev[1]]; for (const m of L.rounds[ev[2]]) if (m[0] === u || m[1] === u) return { h: m[0], a: m[1], o: {}, comp: L.n, rd: 'Matchday ' + (ev[2] + 1) }; }
      else if (ev[0] === 'C') { const cup = S.cups[ev[1]], r = ev[2]; if (cup.w >= 0 || cup.out[u] !== undefined || (cup.alive.indexOf(u) < 0 && cup.wait.indexOf(u) < 0)) continue; const ent = cupDraw(cup, r); for (let i = 0; i + 1 < ent.length; i += 2) if (ent[i] === u || ent[i + 1] === u) return { h: ent[i], a: ent[i + 1], o: { ko: true, neutral: cup.rounds - r === 1 }, comp: cup.n, rd: cupRoundName(cup, r) }; }
      else if (ev[0] === 'E') { const E = S.eu[ev[1]]; for (const m of E.lp[ev[2]]) if (m[0] === u || m[1] === u) return { h: m[0], a: m[1], o: {}, comp: E.n, rd: 'League phase ' + (ev[2] + 1) }; }
      else { const E = S.eu[ev[1]], stg = ev[2], ties = E.ko[stg]; if (!ties) continue; for (const T of ties) { if (T.a !== u && T.b !== u) continue; if (stg === 'f') return { h: T.a, a: T.b, o: { ko: true, neutral: true }, comp: E.n, rd: 'Final' }; if (ev[3] === 0) return { h: T.b, a: T.a, o: {}, comp: E.n, rd: STAGEN[stg] + ', 1st leg' }; const f = T.legs[0]; return { h: T.a, a: T.b, o: { ko: true, agg: [f[1], f[0]] }, comp: E.n, rd: STAGEN[stg] + ', 2nd leg' }; } }
    }
    return null;
  }
  function liveBegin() {
    if (S.over || S.fired || LM) return LM ? { lm: 1 } : { none: 1 }; let fx;
    if (S.t === 0 && S.pre && S.prei < S.pre.length) { const f = S.pre[S.prei]; ensureSquad(S.user); fx = { h: f.home ? S.user : f.opp, a: f.home ? f.opp : S.user, o: { fr: 1 }, comp: 'Pre-season friendly', rd: 'Game ' + (S.prei + 1) + ' of ' + S.pre.length }; }
    else { if ((S.t === 9 || S.t === 51) && S.ddk !== ddKey()) return { dd: 1 }; while (S.dn > 0) { S.dn--; dailyTick(); } completePending(); fx = userFixture(); if (!fx) return { none: 1 }; if (S.dc && fx.comp !== S.L[S.dc.li].n) return { none: 1 }; }
    LM = lmCreate(fx.h, fx.a, fx.o); LM.comp = fx.comp; LM.rd = fx.rd; LM.asst = S.opts.asub ? 1 : 0; LM.rec = 1; if (S.opts.iron) S.lv = 1; return { lm: 1 };
  }
  function liveStep(n) { if (!LM) return { done: 1 }; lmStep(LM, n || 1); return { min: LM.min, full: LM.full, done: LM.done, ht: LM.pm ? LM.ht || 0 : (LM.min === 45 ? 1 : 0), pm: LM.pm ? 1 : 0 }; }
  function liveView() { if (!LM) return null; const v = lmSnap(LM), T = LM.H.mine ? LM.H : LM.A; v.live = 1; v.me = { f: T.f, rl: T.rl, talk: T.talk, side: T.side, subs: T.subs, left: 5 - T.subs, tac: T.tac.slice(), asst: LM.asst, slots: T.slots, bench: T.bench.map(p => p.id), fo: Object.assign({}, T.fo || {}), ins: Object.assign({}, T.ins || {}), cur: T.cur.map(L => L ? L.id : 0), pm: LM.pm ? 1 : 0 }; return v; }
  function liveSub(outId, inId) {
    const lm = LM; if (!lm || lm.done) return { ok: false, msg: 'The match is over.' }; const T = lm.H.mine ? lm.H : lm.A;
    if (T.subs >= 5) return { ok: false, msg: 'You have used all five substitutions.' };
    const k = T.cur.findIndex(L => L && L.id === outId), pin = T.bench.find(p => p.id === inId); if (k < 0 || !pin) return { ok: false, msg: 'That change is not possible.' };
    if ((T.slots[k] === 0) !== (pin.p === 0)) return { ok: false, msg: T.slots[k] === 0 ? 'Only a goalkeeper can go in goal.' : 'A goalkeeper cannot play outfield.' };
    const out = T.cur[k].p.n; lmSub(lm, T, k, pin); lmLam(lm); lm.dirty = 0; return { ok: true, msg: pin.n + ' is on for ' + out + '.' };
  }
  function liveTac(i, v) { const lm = LM; if (!lm) return; const T = lm.H.mine ? lm.H : lm.A, lim = [[-2, 2], [0, 2], [0, 2], [0, 3], [0, 2]][i]; if (!lim) return; while (T.tac.length < 5) T.tac.push(1); T.tac[i] = clamp(Math.round(+v), lim[0], lim[1]); lmLam(lm); }
  function liveAsst(b) { S.opts.asub = b ? 1 : 0; if (LM) LM.asst = b ? 1 : 0; }
  function liveEnd() { const lm = LM; if (!lm) return null; lm.rec = 0; if (!lm.done) { lm.auto = 1; lmStep(lm, 200); lmStep(lm, 200); } LMRES = lmFinish(lm); LM = null; S.lv = 0; const r = advance(); LMRES = null; return r; }

  // ---------- fixtures ----------
  function roundRobin(teams, reps) {
    const t = shuffle(teams.slice()); if (t.length % 2) t.push(-1);
    const n = t.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const m = [];
      for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a < 0 || b < 0) continue; m.push((r + i) % 2 === 0 ? [a, b] : [b, a]); }
      rounds.push(m); t.splice(1, 0, t.pop());
    }
    const out = [];
    for (let k = 0; k < reps; k++) for (const m of rounds) out.push(k % 2 ? m.map(x => [x[1], x[0]]) : m);
    return out;
  }
  function newTable(teams) { const t = {}; for (const c of teams) t[c] = [0, 0, 0, 0, 0, 0, 0]; return t; } // P W D L GF GA Pts
  function tblAdd(t, h, a, gh, ga) { const H = t[h], A = t[a]; H[0]++; A[0]++; H[4] += gh; H[5] += ga; A[4] += ga; A[5] += gh; if (gh > ga) { H[1]++; A[3]++; H[6] += 3; } else if (gh < ga) { A[1]++; H[3]++; A[6] += 3; } else { H[2]++; A[2]++; H[6]++; A[6]++; } }
  function sortTable(t, ded) { return Object.keys(t).map(Number).sort((x, y) => { const a = t[x], b = t[y]; const pa = a[6] - ((ded && ded[x]) || 0), pb = b[6] - ((ded && ded[y]) || 0); return pb - pa || (b[4] - b[5]) - (a[4] - a[5]) || b[4] - a[4] || S.C[y].rep - S.C[x].rep; }); }
  function table(li) { const L = S.L[li]; return sortTable(L.tbl, L.ded); }

  function setupSeason(firstQual) {
    S.sched = []; for (let i = 0; i < SLOTS; i++) S.sched.push([]);
    { let t = 0, n = 0; for (const c of S.C) { c.rep = calcRep(c); if (c.l >= 0) { t += c.rep; n++; } } S.mrep = t / n; }
    for (let li = 0; li < S.L.length; li++) {
      const L = S.L[li]; let t = 0; for (const c of L.teams) t += S.C[c].rep; L.lvl = t / L.teams.length;
    }
    { const al = S.C.map((c, i) => att(i)).sort((a, b) => b - a); S.elite = al[14]; }
    for (const L of S.L) { const o = L.teams.slice().sort((a, b) => S.C[b].rep - S.C[a].rep), n = o.length; o.forEach((ci, i) => { const c = S.C[ci]; if (ci === S.user) { if (!c.tac) c.tac = [0, 1, 1, 0]; return; } if (!c.mgr || !c.tac) { newMgr(ci, i / n); if (!(S.hist || []).length) c.mgr.s = S.season - 1 - ci % 4; } }); }
    S.pol = S.po || []; S.po = [];
    for (let p = 0; p < 12; p++) X.byPos[p].sort((a, b) => b.o - a.o);
    for (let ci = 0; ci < S.C.length; ci++) { const c = S.C[ci]; if (c.l >= 0 || c.eu) ensureSquad(ci); if (ci !== S.user || !c.f) bestFormation(ci); }
    for (let li = 0; li < S.L.length; li++) {
      const L = S.L[li], n = L.teams.length, reps = n > 24 ? 1 : n >= 13 ? 2 : n >= 11 ? 3 : 4;
      L.rounds = roundRobin(L.teams, reps); L.res = []; L.tbl = newTable(L.teams); L.ded = L.nded || {}; L.nded = {};
      const R = L.rounds.length; for (let r = 0; r < R; r++) S.sched[Math.floor(r * WEEKS / R) * 2].push(['L', li, r]);
    }
    // domestic cups
    S.cups = [];
    const byC = {}; for (const L of S.L) (byC[L.c] = byC[L.c] || []).push(L);
    for (const ctry in byC) {
      let ent = []; for (const L of byC[ctry]) ent = ent.concat(L.teams);
      if (ent.length < 8) continue;
      ent.sort((a, b) => S.L[S.C[a].l].t - S.L[S.C[b].l].t || S.C[b].rep - S.C[a].rep);
      const rounds = Math.ceil(Math.log2(ent.length)), B = 1 << rounds, byes = B - ent.length;
      const cup = { n: CUPN[ctry] || (ctry + ' Cup'), c: ctry, alive: ent.slice(byes), wait: ent.slice(0, byes), rounds, rnd: 0, res: [], out: {}, w: -1 };
      const ci = S.cups.length; S.cups.push(cup);
      const ws = CUPW.slice(CUPW.length - rounds); for (let r = 0; r < rounds; r++) S.sched[ws[r] * 2 + 1].push(['C', ci, r]);
      if (ctry === 'ENG' && rounds <= LCW.length) { const c2 = { n: 'EFL Cup', c: ctry, lc: 1, alive: ent.slice(byes), wait: ent.slice(0, byes), rounds, rnd: 0, res: [], out: {}, w: -1 }, i2 = S.cups.length; S.cups.push(c2); const w2 = LCW.slice(LCW.length - rounds); for (let r = 0; r < rounds; r++) S.sched[w2[r] * 2 + 1].push(['C', i2, r]); }
    }
    // europe
    const q = firstQual; S.eu = [];
    const nm = [['Champions League', 'cl'], ['Europa League', 'el'], ['Conference League', 'ecl']];
    for (let k = 0; k < 3; k++) {
      const teams = q[k]; const lp = roundRobin(teams, 1).slice(0, 8).map((m, r) => r % 2 ? m.map(x => [x[1], x[0]]) : m);
      S.eu.push({ n: nm[k][0], k: nm[k][1], teams, lp, tbl: newTable(teams), res: [], ko: {}, out: {}, stage: 'lp', w: -1 });
      for (let r = 0; r < 8; r++) S.sched[EUW[r] * 2 + 1].push(['E', k, r]);
      for (const stg in EUKO) EUKO[stg].forEach((w, leg) => S.sched[w * 2 + 1].push(['K', k, stg, leg]));
    }
    S.um = []; S.t = 0;
  }

  function qualify(order, cupW) {
    // order: league index -> clubs sorted by finish. returns [cl, el, ecl]
    const top = {}; for (let li = 0; li < S.L.length; li++) { const L = S.L[li]; if (L.t === 1 && EUR.indexOf(L.c) >= 0) top[L.c] = order[li].slice(); }
    const used = new Set(), cl = [], el = [], ecl = [];
    const take = (c, arr) => { const l = top[c]; if (!l) return false; for (const x of l) if (!used.has(x)) { used.add(x); arr.push(x); return true; } return false; };
    for (const c of EUR) for (let i = 0; i < (CLS[c] || 0); i++) take(c, cl);
    const roe = []; S.C.forEach((c, i) => { if (c.eu && c.l < 0) roe.push(i); }); roe.sort((a, b) => S.C[b].rep - S.C[a].rep);
    for (let i = 0; i < roe.length && cl.length < 36; i++) if (i < 3) { used.add(roe[i]); cl.push(roe[i]); }
    let g = 0; while (cl.length < 36 && g++ < 50) for (const c of EUR) { if (cl.length < 36) take(c, cl); }
    for (const c of EUR) for (let i = 0; i < (ELS[c] || 0); i++) take(c, el);
    if (cupW) for (const x of cupW) if (x >= 0 && !used.has(x) && el.length < 36 && EUR.indexOf(S.C[x].ctry) >= 0) { used.add(x); el.push(x); }
    for (let i = 3; i < roe.length && i < 9 && el.length < 36; i++) { used.add(roe[i]); el.push(roe[i]); }
    g = 0; while (el.length < 36 && g++ < 50) for (const c of EUR) { if (el.length < 36) take(c, el); }
    for (let i = 9; i < roe.length && ecl.length < 36; i++) { used.add(roe[i]); ecl.push(roe[i]); }
    g = 0; while (ecl.length < 36 && g++ < 50) for (const c of EUR) { if (ecl.length < 36) take(c, ecl); }
    return [cl, el, ecl];
  }

  // ---------- running a slot ----------
  function runLeague(li, r, out) {
    const L = S.L[li], ms = L.rounds[r], rr = [];
    for (const m of ms) { const x = simMatch(m[0], m[1]); tblAdd(L.tbl, m[0], m[1], x.gh, x.ga); rr.push([m[0], m[1], x.gh, x.ga]); if (x.sc) { x.comp = L.n; x.rd = 'Matchday ' + (r + 1); x.t = S.t; out.push(x); } }
    L.res[r] = rr;
  }
  function cupRoundName(cup, r) { const left = cup.rounds - r; return left === 1 ? 'Final' : left === 2 ? 'Semi-final' : left === 3 ? 'Quarter-final' : 'Round ' + (r + 1); }
  function runCup(ci, r, out) {
    const cup = S.cups[ci]; if (cup.w >= 0) return;
    const ent = cupDraw(cup, r), nx = [], rr = []; cup.dr = null;
    for (let i = 0; i + 1 < ent.length; i += 2) {
      const h = ent[i], a = ent[i + 1], fin = cup.rounds - r === 1;
      const x = simMatch(h, a, { ko: true, neutral: fin }); const w = x.win === 0 ? h : a, l = x.win === 0 ? a : h;
      nx.push(w); cup.out[l] = r; rr.push([h, a, x.gh, x.ga, x.note, w]);
      if (x.sc) { x.comp = cup.n; x.rd = cupRoundName(cup, r); x.t = S.t; out.push(x); }
    }
    if (ent.length % 2) nx.push(ent[ent.length - 1]);
    cup.res[r] = rr; cup.alive = nx; cup.rnd = r + 1;
    if (nx.length === 1 && !cup.wait.length) { cup.w = nx[0]; cup.out[nx[0]] = 99; }
  }
  function runEuLP(k, r, out) {
    const E = S.eu[k], rr = [];
    for (const m of E.lp[r]) { const x = simMatch(m[0], m[1]); tblAdd(E.tbl, m[0], m[1], x.gh, x.ga); rr.push([m[0], m[1], x.gh, x.ga]); if (x.sc) { x.comp = E.n; x.rd = 'League phase ' + (r + 1); x.t = S.t; out.push(x); } }
    E.res[r] = rr;
    if (r === 7) { const o = sortTable(E.tbl); E.rank = o; for (let i = 24; i < o.length; i++) E.out[o[i]] = 'lp'; E.ko.po = []; for (let i = 0; i < 8; i++) E.ko.po.push({ a: o[8 + i], b: o[23 - i], legs: [], w: -1 }); E.stage = 'po'; }
  }
  function runEuKO(k, stg, leg, out) {
    const E = S.eu[k]; const ties = E.ko[stg]; if (!ties) return;
    for (const T of ties) {
      if (stg === 'f') {
        const x = simMatch(T.a, T.b, { ko: true, neutral: true }); T.legs.push([x.gh, x.ga, x.note]); T.w = x.win === 0 ? T.a : T.b;
        E.out[x.win === 0 ? T.b : T.a] = 'f'; E.out[T.w] = 'w'; E.w = T.w; E.stage = 'done';
        if (x.sc) { x.comp = E.n; x.rd = 'Final'; x.t = S.t; out.push(x); }
      } else if (leg === 0) {
        const x = simMatch(T.b, T.a); T.legs.push([x.ga, x.gh, '']); // lower seed (b) hosts first leg; stored as [a goals, b goals]
        if (x.sc) { x.comp = E.n; x.rd = STAGEN[stg] + ', 1st leg'; x.t = S.t; out.push(x); }
      } else {
        const f = T.legs[0]; const x = simMatch(T.a, T.b, { ko: true, agg: [f[1], f[0]] }); T.legs.push([x.gh, x.ga, x.note]); T.w = x.win === 0 ? T.a : T.b; E.out[x.win === 0 ? T.b : T.a] = stg;
        if (x.sc) { x.comp = E.n; x.rd = STAGEN[stg] + ', 2nd leg'; x.agg = [f[0] + x.gh, f[1] + x.ga]; x.t = S.t; out.push(x); }
      }
    }
    const last = stg === 'f' ? true : leg === 1; if (!last || stg === 'f') return;
    const w = ties.map(T => T.w);
    if (stg === 'po') { E.ko.r16 = []; for (let i = 0; i < 8; i++) E.ko.r16.push({ a: E.rank[i], b: w[7 - i], legs: [], w: -1 }); E.stage = 'r16'; }
    else if (stg === 'r16') { E.ko.qf = []; for (let i = 0; i < 4; i++) E.ko.qf.push({ a: w[i], b: w[7 - i], legs: [], w: -1 }); E.stage = 'qf'; }
    else if (stg === 'qf') { E.ko.sf = []; for (let i = 0; i < 2; i++) E.ko.sf.push({ a: w[i], b: w[3 - i], legs: [], w: -1 }); E.stage = 'sf'; }
    else if (stg === 'sf') { E.ko.f = [{ a: w[0], b: w[1], legs: [], w: -1 }]; E.stage = 'f'; }
  }

  const FROM = { tr: ['Transfer desk', 'Transfer update'], inj: ['Head physio', 'Injury report'], ct: ['Club secretary', 'Contracts'], ev: ['Assistant manager', 'Club news'], win: ['The board', 'Objectives'], info: ['The board', 'From the boardroom'] };
  function msg(txt, kind) { const f = FROM[kind] || FROM.info; S.inbox.unshift({ id: S.mid++, s: S.season, t: S.t, k: kind || 'info', from: f[0], sub: f[1], x: txt, rep: -1 }); if (S.inbox.length > 160) S.inbox.length = 160; }
  function mail(from, sub, body, opts, ctx) { S.inbox.unshift({ id: S.mid++, s: S.season, t: S.t, k: 'mail', from, sub, x: body, opts: opts || null, ctx: ctx || null, rep: -1 }); if (S.inbox.length > 160) S.inbox.length = 160; }
  function reply(id, i) {
    const m = S.inbox.find(x => x.id === id); if (!m || !m.opts || m.rep >= 0) return { ok: false, msg: 'Already answered.' };
    const c = m.ctx || {}, u = S.C[S.user], p = c.pid ? X.PM.get(c.pid) : null; m.rep = i; let out = { ok: true, msg: 'Reply sent.' };
    if (c.type === 'playtime' && p && p.c === S.user) {
      if (i === 0) { p.mo = clamp(p.mo + 12, 0, 100); p.prom = S.t + 12; p.ps = p.ss[0]; out.msg = p.n + ' takes you at your word. Start him at least three times in the next six weeks.'; }
      else if (i === 1) { const good = rnd() < 0.4; p.mo = clamp(p.mo + (good ? 5 : -8), 0, 100); out.msg = good ? p.n + ' accepts the challenge.' : p.n + ' is not impressed.'; }
      else { p.tl = 1; p.mo = clamp(p.mo + 4, 0, 100); out.msg = p.n + ' is now transfer listed.'; }
    } else if (c.type === 'retire' && p && p.c === S.user) { if (i === 0) { const r = persuade(p.id); out.msg = r.msg; } else out.msg = p.n + ' will be given a proper send-off.'; }
    else if (c.type === 'contract' && p && p.c === S.user) { if (i === 0) out = { ok: true, open: 'renew', pid: p.id, msg: '' }; else { p.mo = clamp(p.mo - 6, 0, 100); out.msg = p.n + ' is disappointed.'; } }
    else if (c.type === 'windfall') { if (i === 0) { u.bal += c.amt; out.msg = money(c.amt) + ' added to the transfer budget.'; } else { const w = Math.round(c.amt / 45 / 100) * 100; u.wb += w; out.msg = money(w) + ' a week added to the wage budget.'; } }
    else if (c.type === 'trialist') { if (i === 0) { if (u.sq.length >= 38) { m.rep = -1; return { ok: false, msg: 'Your squad is full.' }; } const q = genPlayer(S.user, c.a, c.o, 0, c.pot, c.p); q.role = 4; q.sk = 1; out.msg = q.n + ' joins the academy.'; } else out.msg = 'You passed on the trialist.'; }
    else if (c.type === 'agent' && p) { if (i === 0) out = { ok: true, open: 'buy', pid: p.id, msg: '' }; else out.msg = 'You turned the agent down.'; }
    else if (c.type === 'formation') { if (i === 0) { u.f = c.f; u.xi = null; u.auto = 1; out.msg = 'The team will line up in a ' + c.f + '.'; } else out.msg = 'You keep your own shape.'; }
    else if (c.type === 'boardmid') { if (i === 0) { S.vow = 1; out.msg = 'The board will hold you to that.'; } else out.msg = 'The board will wait for May.'; }
    else if (c.type === 'treq' && p && p.c === S.user) { if (i === 0) { p.tl = 1; p.mo = clamp(p.mo + 6, 0, 100); out.msg = p.n + ' is on the transfer list. He will give everything until a move comes.'; } else { p.mo = clamp(p.mo - (trait(p) === 4 ? 22 : 14), 0, 100); out.msg = p.n + ' is furious. Expect it to show.'; } }
    else if (c.type === 'row') { const a = X.PM.get(c.a), b = X.PM.get(c.b); if (a && b) { if (i === 0) { a.mo = clamp(a.mo + 8, 0, 100); b.mo = clamp(b.mo - 12, 0, 100); } else if (i === 1) { b.mo = clamp(b.mo + 8, 0, 100); a.mo = clamp(a.mo - 12, 0, 100); } else { a.mo = clamp(a.mo - 4, 0, 100); b.mo = clamp(b.mo - 4, 0, 100); } } out.msg = i === 2 ? 'Both players are fined. Neither is happy, but it is settled.' : 'You have taken a side.'; }
    if (c.type === 'press') { const sq = u.sq; if (i === 0) { for (const q of sq) q.mo = clamp(q.mo + 3, 0, 100); S.vowM = { t: c.t, k: 0 }; out.msg = 'Bold. The dressing room loved it. Now back it up on the pitch.'; } else if (i === 1) { for (const q of sq) q.mo = clamp(q.mo + 1, 0, 100); out.msg = 'Measured. Nobody will pin that on a dressing-room wall.'; } else { for (const q of sq) if (q.mo < 55) q.mo = clamp(q.mo + 4, 0, 100); S.vowM = { t: c.t, k: 2 }; out.msg = 'You took the heat off the players. The ones short of confidence noticed.'; } }
    m.ans = out.msg; return out;
  }
  function rebuildPos() { for (let i = 0; i < 12; i++) X.byPos[i] = []; for (const p of S.P) if (p.c >= -1) X.byPos[p.p].push(p); for (let i = 0; i < 12; i++) X.byPos[i].sort((a, b) => b.o - a.o); }
  function unread() { let n = 0; for (const m of S.inbox) if (m.opts && m.rep < 0) n++; return n; }
  function windowOpen() { if ((S.t === 9 || S.t === 51) && S.ddk === ddKey()) return false; return S.t < 10 || (S.t >= 42 && S.t < 52); }
  function dateOf(t) { const b = new Date(Date.UTC(S.season, 7, 7)), off = (6 - b.getUTCDay() + 7) % 7; return new Date(Date.UTC(S.season, 7, 7 + off + Math.floor(t / 2) * 7 + (t % 2 ? 4 : 0))); }

  function ddKey() { return S.season * 2 + (S.t < 10 ? 0 : 1); }
  function ddAdvance(h) {
    if (!S.dd) return 0;
    for (let i = 0; i < h && S.dd > 0; i++) { completePending(); rivalsTick(); if (S.dd % 3 === 0) aiWindow(); userOffers(); S.offers = S.offers.filter(o => X.PM.get(o.pid) && X.PM.get(o.pid).c === S.user); S.dd--; }
    if (S.dd <= 0) { S.dd = 0; S.ddk = ddKey(); completePending(); for (const d of S.pend) { const p = X.PM.get(d.pid); msg('The window shut before the deal for ' + (p ? p.n : 'your target') + ' could be completed.', 'tr'); } S.pend = []; S.offers = S.offers.filter(o => o.cl); msg('The transfer window has closed.', 'tr'); }
    return S.dd;
  }
  function advance(skipDD) {
    const out = [];
    if (S.over) return { matches: out, seasonEnd: null, over: 1 };
    if (S.fired) return { matches: out, seasonEnd: null, fired: 1 };
    if (S.t === 0 && S.pre && S.prei < S.pre.length) { if (skipDD) skipPre(); else return playFriendly(); }
    if ((S.t === 9 || S.t === 51) && S.ddk !== ddKey()) { if (!S.dd) { S.dd = 20; mail('Transfer desk', 'Deadline day', 'The window shuts in 20 hours. Phones are ringing across the league. Deals agreed now go through within the hour.'); } if (skipDD) ddAdvance(99); else return { matches: out, seasonEnd: null, dd: S.dd }; }
    while (S.dn > 0) { S.dn--; dailyTick(); }
    completePending();
    if (!S.inc.sp && S.inc.offers.length && S.t >= 2) { signSponsor(0); msg('No shirt sponsor had been chosen, so the commercial director signed the guaranteed deal with ' + S.inc.sp.n + '.', 'ev'); }
    X.hat = []; if (S.t === SLOTS - 1 && !LMRES && !S.dc && lastCall().length) return { matches: out, seasonEnd: null, lastcall: lastCall() };
    for (const ev of S.sched[S.t] || []) {
      if (ev[0] === 'L') runLeague(ev[1], ev[2], out); else if (ev[0] === 'C') runCup(ev[1], ev[2], out); else if (ev[0] === 'E') runEuLP(ev[1], ev[2], out); else if (ev[0] === 'P') runPO(ev[1], ev[2], ev[3], out); else runEuKO(ev[1], ev[2], ev[3], out);
    }
    const uc = S.C[S.user];
    for (const m of out) { S.um.push(m); if (isDerby(m.h === S.user ? m.a : m.h)) m.derby = 1; const us = m.h === S.user, gf = us ? m.gh : m.ga, ga = us ? m.ga : m.gh, g = S.mg; g.p++; g.gf += gf; g.ga += ga; const won = m.note === 'pens' ? (m.win === (us ? 0 : 1)) : gf > ga, lost = m.note === 'pens' ? !won : gf < ga; if (won) g.w++; else if (lost) g.l++; else g.d++; m.res = won ? 'W' : lost ? 'L' : 'D'; if (us && m.rd !== 'Final') gateIncome(m); if (won && S.inc.sp && S.inc.sp.win && m.comp === S.L[uc.l].n) { uc.bal += S.inc.sp.win; S.fin.spons += S.inc.sp.win; } matchFx(m); if (S.fired) break; }
    if (S.vowM && S.vowM.t <= S.t) { const m = out[0]; if (m && S.vowM.t === S.t) { const k = S.vowM.k, r = m.res; if (k === 0) { if (r === 'W') { for (const q of uc.sq) q.mo = clamp(q.mo + 3, 0, 100); S.mr = clamp(S.mr + 1, 0, 100); msg('You said you would win and you did. The press room is yours this week and the squad is flying.', 'ev'); } else if (r === 'L') { for (const q of uc.sq) q.mo = clamp(q.mo - 5, 0, 100); S.mr = clamp(S.mr - 1, 0, 100); msg('Your pre-match confidence is all over the back pages after the defeat. The dressing room is flat.', 'ev'); } } else if (k === 2) { if (r === 'L') S.mr = clamp(S.mr - 1, 0, 100); else if (r === 'W') S.mr = clamp(S.mr + 1, 0, 100); } } S.vowM = null; }
    try { newsDesk(S.sched[S.t] || [], out); } catch (e) { if (typeof console !== 'undefined') console.error('news desk', e); }
    // recovery, sharpness, injuries
    const wk = S.t % 2 === 0, P_ = S.P, tr = uc.tr === undefined ? 1 : uc.tr, fitB = staffLv(S.user, 'fit') * 0.45 + (tr === 0 ? 1.5 : tr === 2 ? -1.5 : 0) + 0.3 * S.inc.fac.trn, medLv = staffLv(S.user, 'med'), shD = tr === 2 ? 0.8 : tr === 0 ? 2.2 : 1.5;
    for (let i = 0; i < P_.length; i++) {
      const p = P_[i]; if (p.c < 0) continue; const mine = p.c === S.user;
      if (p.fi < 100) { p.fi += 6.5 + (mine ? fitB : 0.9); if (p.fi > 100) p.fi = 100; }
      if (wk) {
        if (p.inj > 0) { p.inj--; if (!p.inj) p.kn = mine && medLv >= 4 ? 1 : 2; } else if (p.kn) p.kn--;
        if (p._pl !== S.t && p._pl !== S.t - 1) { p.fm *= 0.93; p.sh = Math.max(35, (p.sh === undefined ? 78 : p.sh) - (mine ? shD : 1)); }
        p.mo += (55 - p.mo) * 0.02;
      }
    }
    if (windowOpen()) { aiWindow(); userOffers(); loanOffers(); }
    S.offers = S.offers.filter(o => o.exp > S.t && X.PM.get(o.pid) && X.PM.get(o.pid).c === S.user);
    S.loffers = S.loffers.filter(o => o.exp > S.t && windowOpen() && X.PM.get(o.pid) && X.PM.get(o.pid).c === S.user);
    scoutTick();
    if (S.t % 8 === 7) { develop(1 / 11.5); merchIncome(); acadTick(); }
    if (wk) userEvent();
    if (S.t === 41) contractWarn(); if (S.t === 70) retRoll(); if (S.t === 72) contractWarn(1); if (S.t === 86) contractWarn(2);
    if (S.t === 44) aiSackings(true);
    S.jobs = S.jobs.filter(j => j.why === 'open' || (j.s === S.season && S.t - j.t < 10));
    if (S.t === 41) mail('Assistant manager', 'January window: suggestions ready', 'The window opens next week. The staff have put together who to buy, who to loan and who to move on. It is all in Transfers, Suggestions.');
    if (S.t % 14 === 13) refreshPools();
    S.t++; S.dn = S.t < SLOTS ? (S.t % 2 ? 4 : 3) : 0; if (S.t === 92) setupPlayoffs(); if (S.dc && S.dc.ready && !S.dc.res && lgLeft(S.dc.li) === 0) dailyEnd();
    if (!skipDD && (S.t === 9 || S.t === 51) && S.ddk !== ddKey() && !S.dd) { S.dd = 20; mail('Transfer desk', 'Deadline day', 'The window shuts in 20 hours. Phones are ringing across the league. Deals agreed now go through within the hour.'); }
    let end = null;
    if (S.t >= SLOTS) end = endSeason();
    return { matches: out, seasonEnd: end };
  }
  function nextDay() {
    if (S.over) return { matches: [], seasonEnd: null };
    if (S.t === 0 && S.pre && S.prei < S.pre.length) return playFriendly();
    if ((S.t === 9 || S.t === 51) && S.ddk !== ddKey()) return advance();
    if (S.dn > 0) { S.dn--; dailyTick(); return { matches: [], seasonEnd: null, day: 1 }; }
    return advance();
  }
  function dailyTick() {
    completePending();
    for (const k in S.neg) { const n = S.neg[k]; if (n.ten > 0) n.ten = Math.max(0, n.ten - 4); if (n.cten > 0) n.cten = Math.max(0, n.cten - 4); }
    if (windowOpen()) { rivalsTick(); if (rnd() < 0.3) rumourTick(); }
    if (S.dn === 1) pressCheck();
  }
  function pressCheck() {
    const f = nextUserFixtures(1)[0]; if (!f || f.t !== S.t || f.tbd || S.inbox.some(m => m.ctx && m.ctx.type === 'press' && m.rep < 0)) return;
    const opp = f.h === S.user ? f.a : f.h, O = S.C[opp], u = S.C[S.user], d = O.rep - u.rep; if (!isDerby(opp) && rnd() > (d >= -1 ? 0.4 : 0.1)) return;
    const q = isDerby(opp) ? 'It is derby day against ' + O.n + '. The supporters have talked about nothing else all week. What is your message to them?' : d > 3 ? O.n + ' are the stronger side on paper and most people expect them to win. Can your team really get a result?' : d < -3 ? 'You are heavy favourites against ' + O.n + '. Is there a danger your players take this one lightly?' : 'There is very little between you and ' + O.n + '. What decides a game like this?';
    mail('Press officer', 'Press conference: ' + (f.h === S.user ? 'home to ' : 'away at ') + O.n, 'The room is full ahead of the ' + f.comp + ' match. First question: "' + q + '"', ['We will win. I back these players against anyone', 'They are a good side and we respect them', 'Any pressure is on me, not on the players'], { type: 'press', t: f.t });
  }
  function dateNow() { if (S.t === 0 && S.pre && S.prei < S.pre.length) return new Date(dateOf(0).getTime() - ((S.pre.length - S.prei) * 5 + 2) * 864e5); return new Date(dateOf(Math.min(S.t, SLOTS - 1)).getTime() - (S.dn || 0) * 864e5); }

  // ---------- development ----------
  function develop(frac) {
    const uc = S.C[S.user], tr = uc.tr === undefined ? 1 : uc.tr, trM = tr === 0 ? 0.92 : tr === 2 ? 1.1 : 1, DK = ['gk', 'def', 'mid', 'att'], ups = [], downs = [];
    for (const p of S.P) {
      if (p.c < -1) continue;
      const pr = PROFILES[p.gp]; let d = 0; const a = p.a, isGK = p.p === 0, mine = p.c === S.user;
      const exp = Math.max(8, S.t / 2.4); const share = p.c < 0 ? 0.15 : Math.min(1, (p.ss[0] + 0.35 * p.ss[9]) / exp);
      const avg = p.ss[0] >= 3 ? p.ss[3] / p.ss[0] : 6.5;
      // dynamic potential: reviewed every month for players still developing
      if (frac > 0.05 && a <= 25 && p.c >= 0) {
        const lim = p.p0 === undefined ? (p.p0 = p.pot) : p.p0, lo = Math.max(Math.ceil(p.o), lim - 6), hi = Math.min(93, lim + 5); let ch = 0;
        if (share >= 0.5 && avg >= 7.22 && p.pot < hi && rnd() < (0.065 + (p.mo - 60) * 0.001) * clamp((90 - p.pot) / 10, 0.12, 1)) ch = 1;
        else if (share >= 0.35 && p.ss[0] >= 5 && avg < 6.38 && p.pot > lo && rnd() < 0.1) ch = -1;
        else if (share < 0.12 && a >= 20 && S.t > 20 && p.pot > lo && rnd() < 0.03) ch = -1;
        if (ch) { p.pot += ch; if (mine) { p.pd = (p.pd || 0) + ch; (ch > 0 ? ups : downs).push(p); } }
      }
      if (a <= pr.end && p.pot > p.o) {
        const gap = p.pot - p.o; let g = Math.max(0.6, gap * (a <= 21 ? 0.33 * pr.gm : 0.28)); if (g > 7) g = 7; if (g > gap) g = gap;
        d = g * (0.45 + 0.75 * share) * clamp(1 + (avg - 6.6) * 0.25, 0.7, 1.35) * (1 + (p.mo - 62) / 250) * (trait(p) === 0 ? 1.08 : trait(p) === 6 ? 0.93 : 1);
        if (mine) d *= trM * (1 + 0.04 * (staffLv(S.user, DK[LINE[p.p]]) - 2)) * (1 + 0.025 * S.inc.fac.trn);
      } else if (a >= pr.dec + (isGK ? 2 : 0)) { d = -(0.6 + 0.45 * (a - pr.dec - (isGK ? 2 : 0))) * pr.df * (p.mo < 35 ? 1.25 : 1); }
      else d = (hash(p.id + S.season * 31 + S.t) - 0.5) * 0.5 + (p.o > p.pot ? -0.4 : 0);
      d *= frac; if (d === 0) continue;
      p.o = clamp(p.o + d, 30, 99);
      const st = p.st; for (let i = 0; i < 6; i++) st[i] = clamp(st[i] + d * (d < 0 && (i === 0 || i === 5) ? 1.6 : d < 0 && i === 2 ? 0.3 : 1), 20, 99);
    }
    if (ups.length || downs.length) mail('Head coach', 'Potential review', (ups.length ? 'The staff have raised their ceiling for ' + ups.map(p => p.n + ' (now ' + p.pot + ')').join(', ') + ' on the back of what they are doing in matches. ' : '') + (downs.length ? 'We have had to lower expectations for ' + downs.map(p => p.n + ' (now ' + p.pot + ')').join(', ') + '. They need minutes and better performances to turn that around.' : ''));
  }
  // ---------- transfers ----------
  function asking(p) {
    if (p.c < 0) return 0; const c = S.C[p.c]; const rank = c.sq.indexOf(p);
    let f = rank < 3 ? 1.8 : rank < 11 ? 1.45 : rank < 18 ? 1.15 : 0.95; if (p.tl) f = 0.85;
    return Math.round(xtv(p) * f / 1000) * 1000;
  }
  function willing(p, ci) {
    const A = att(ci), need = p.o - A, elite = A >= (S.elite || 99);
    if (p.c < 0) { const m = 8 + (p.a >= 31 ? 3 : 0) + (p.a <= 20 ? 2 : 0) + p.idle * 2; return need <= m || elite ? null : 'He wants a bigger club than yours right now.'; }
    if (p.c === ci) return 'He already plays for you.';
    const cur = att(p.c), rank = S.C[p.c].sq.indexOf(p), tr = trait(p); const slack = (p.tl ? 8 : rank >= 14 ? 5 : 1) + (tr === 5 ? 4 : tr === 2 ? -1 : 0);
    if (tr === 3 && !p.tl && rank < 11 && hash(p.id + S.season * 3) < 0.5) return 'He is settled at ' + S.C[p.c].n + ' and does not want to leave.';
    if (need > 4 + (p.tl ? 3 : 0) + (tr === 5 ? 3 : 0) && !elite) return 'He does not think your club matches his level.';
    if (A < cur - slack) return 'He does not want to step down from ' + S.C[p.c].n + '.';
    return null;
  }
  function demand(p, ci) { const need = Math.max(0, p.o - att(ci)); return Math.round(wage(p) * (1 + need * 0.05) * (p.c < 0 ? Math.max(0.6, 0.82 - p.idle * 0.08) : 1.1) * (trait(p) === 5 ? 1.12 : 1) / 100) * 100; }
  function activeRules() { return S.ch && !S.ch.done && !S.ch.fail ? S.ch.rules : null; }
  function ruleBlock(p, fee) {
    if (S.emb === S.season || S.emb === -1) return 'Transfer embargo: the club cannot register new players this season.';
    const r = activeRules(); if (!r) return null;
    if (r.noSign) return 'Objective rule: no signings allowed.';
    if (r.faOnly && p.c >= 0) return 'Objective rule: free agents only.';
    if (r.maxAge && p.a > r.maxAge) return 'Objective rule: signings must be ' + r.maxAge + ' or younger.';
    if (r.minAge && p.a < r.minAge) return 'Objective rule: signings must be ' + r.minAge + ' or older.';
    if (r.nat != null && r.nat !== '' && p.nat !== +r.nat) return 'Objective rule: ' + D.nats[+r.nat] + ' players only.';
    if (r.maxOvr && Math.round(p.o) > r.maxOvr) return 'Objective rule: signings must be rated ' + r.maxOvr + ' or lower.';
    if (r.maxFee != null && r.maxFee !== '' && fee > +r.maxFee) return 'Objective rule: maximum fee is ' + money(+r.maxFee) + '.';
    if (r.lowerOnly && p.c >= 0) { const c = S.C[p.c], u = S.C[S.user]; if (c.l >= 0 && u.l >= 0 && (S.L[c.l].c !== S.L[u.l].c || S.L[c.l].t <= S.L[u.l].t)) return 'Objective rule: only sign from lower divisions of your country.'; if (c.l < 0) return 'Objective rule: only sign from lower divisions of your country.'; }
    return null;
  }
  function movePlayer(p, to, fee, w, yrs) {
    const from = p.c;
    if (from >= 0) { const s = S.C[from].sq; s.splice(s.indexOf(p), 1); S.C[from].bal += fee; }
    if (to >= 0) { const c = S.C[to]; c.sq.push(p); c.sq.sort((a, b) => b.o - a.o); c.bal -= fee; p.w = w || wage(p); p.cy = yrs || 3; p.j = S.season; p.mo = 65; p.idle = 0; } else { p.cy = 0; }
    p.c = to; p.tl = 0; if (p.us && from >= 0 && from !== S.user && fee > 0) { const cut = Math.round(fee * p.us / 100); S.C[to >= 0 ? to : from].bal += 0; S.C[from].bal -= cut; S.C[S.user].bal += cut; msg('Sell-on clause: ' + S.C[from].n + ' sold ' + p.n + ' and you receive ' + money(cut) + ' (' + p.us + '%).', 'tr'); delete p.us; } if (from === S.user) { delete p.role; delete p.rc; delete p.so; delete p.wc; delete p.ll; } if (to === S.user && p.role === undefined) p.role = expRole(p, S.user);
    if (to === S.user || from === S.user || fee >= 15e6) { S.tlog.unshift({ s: S.season, t: S.t, p: p.id, n: p.n, f: from, to, fee, o: Math.round(p.o), a: p.a }); if (S.tlog.length > 400) S.tlog.length = 400; }
  }
  // ---------- negotiations (user) ----------
  const ROLES = ['Crucial', 'Important', 'Rotation', 'Sporadic', 'Prospect'];
  function expRole(p, ci) { const sq = S.C[ci].sq; let r = 0; for (const q of sq) if (q !== p && q.o > p.o) r++; if (p.a <= 21 && r >= 11) return 4; return r < 3 ? 0 : r < 9 ? 1 : r < 17 ? 2 : 3; }
  function winId() { return S.t < 10 ? 0 : 1; }
  function pendWages() { let t = 0; for (const d of S.pend) t += d.st === 'hij' ? d.w2 : d.w; return t; }
  function reserved() { let t = 0; for (const d of S.pend) t += d.fee / (d.inst || 1) + (d.bonus || 0); return t; }
  function tense(n, key, ratio) { n[key] = Math.min(100, (n[key] || 0) + 10 + (1 - clamp(ratio, 0, 1)) * 90); return n[key] >= 100; }
  function rivalsFor(p) { const out = []; for (const r of S.rum) if (r.pid === p.id && r.ci !== S.user && out.indexOf(r.ci) < 0) out.push(r.ci); const ur = S.C[S.user].rep; if (p.o >= ur - 2) { const k = p.o >= ur + 2 ? 2 : 1; for (let i = 0; i < k; i++) if (rnd() < 0.55) { const ci = rivalFor(p); if (out.indexOf(ci) < 0 && ci !== p.c) out.push(ci); } } return out; }
  function bbFor(pid) { const p = X.PM.get(pid); return p ? (S.bb || []).find(b => b.pid === pid && b.ci === p.c && b.s >= S.season) || null : null; }
  function approach(pid) {
    const p = X.PM.get(pid); if (!p || p.c < -1) return { ok: false, msg: 'Player not found.' };
    if (p.c === S.user) return { ok: false, msg: 'He already plays for you.' };
    if (!windowOpen()) return { ok: false, msg: 'The transfer window is closed.' };
    const rb = ruleBlock(p, 0); if (rb) return { ok: false, msg: rb };
    if (S.pend.some(d => d.pid === pid)) return { ok: false, msg: 'This deal is agreed and going through.' };
    const bb = bbFor(pid);
    if (!bb && p.c >= 0 && isRival(p.c)) return { ok: false, msg: S.C[p.c].n + ' will not do business with ' + S.C[S.user].n + '. ' + (isDerby(p.c) ? 'Rivals do not sell to each other.' : 'You are fighting them for the same places in the table, and they will not strengthen you.') };
    const w = bb ? null : willing(p, S.user); if (w) return { ok: false, msg: w };
    if (S.C[S.user].sq.length + S.pend.length >= 40) return { ok: false, msg: 'Your squad is full (40 players).' };
    let n = S.neg[pid];
    if (!n || n.s !== S.season || n.win !== winId()) {
      const h = hash(pid * 3 + S.season * 17 + winId()), fa = p.c < 0, a = fa ? 0 : asking(p) * dq().buy, dm = demand(p, S.user);
      n = S.neg[pid] = { s: S.season, win: winId(), st: fa ? 'con' : 'enq', ask: Math.round(a * 1.1 / 1000) * 1000, min: Math.round(a * (0.86 + 0.1 * h) / 1000) * 1000, ten: 0, cten: 0, fee: fa ? 0 : -1, so: 0, inst: 0, lb: 0, age: 0,
        dm: Math.round(dm * 1.08 / 100) * 100, cmin: Math.round(dm * (0.9 + 0.08 * hash(pid * 5 + 1)) / 100) * 100, exp: expRole(p, S.user), said: '', riv: fa ? [] : rivalsFor(p), xtv: fa ? value(p) : xtv(p) };
      if (bb) { n.st = 'con'; n.fee = bb.fee; n.inst = 1; n.bb = 1; n.riv = []; n.said = 'You have triggered the ' + money(bb.fee) + ' buy-back clause. ' + S.C[p.c].n + ' cannot refuse. Now agree terms with the player.'; }
      else if (fa) n.said = 'I am available. I am looking for around ' + money(n.dm) + ' a week.';
      else n.said = 'Make an enquiry to find out whether ' + S.C[p.c].n + ' will sell, and for how much.';
    }
    if (n.st === 'dead') return { ok: false, msg: n.said || 'Talks have broken down. Try again next window.', n, p };
    return { ok: true, n, p };
  }
  function negEnquire(pid) {
    const a = approach(pid); if (!a.ok) return a; const n = a.n, p = a.p; if (n.st !== 'enq') return { ok: true, n, p, msg: n.said };
    const c = S.C[p.c], rank = c.sq.indexOf(p), h = hash(pid * 3 + S.season * 17 + winId());
    if (p.loan) { n.st = 'dead'; n.said = p.n + ' is on loan at ' + c.n + ' and cannot be sold until he goes back to his parent club.'; return { ok: false, res: 'dead', msg: n.said, n, p }; }
    if (rank < 3 && c.rep > S.C[S.user].rep && h < 0.3) { n.st = 'dead'; n.said = c.n + ' say he is not for sale in this window. Do not call again.'; return { ok: false, res: 'dead', msg: n.said, n, p }; }
    n.st = 'fee';
    n.said = (p.tl ? 'He is on the transfer list. ' : rank < 3 ? 'He is one of our most important players, so it will cost you. ' : rank >= 14 ? 'He is not a regular for us. ' : '') + 'We would listen to offers around ' + money(n.ask) + '.' + (n.riv.length ? ' You should know that ' + n.riv.map(ci => S.C[ci].n).join(' and ') + ' are asking about him too.' : '');
    return { ok: true, res: 'enq', n, p, msg: n.said };
  }
  function negFee(pid, o) {
    const a = approach(pid); if (!a.ok) return a; const n = a.n, p = a.p, u = S.C[S.user], club = S.C[p.c].n;
    if (n.st === 'enq') return { ok: false, msg: 'Make an enquiry first.', n };
    if (n.st !== 'fee') return { ok: false, msg: 'The fee is already settled.', n };
    const fee = Math.max(0, Math.round(o.fee || 0)), so = clamp(Math.round(o.so || 0), 0, 30), inst = clamp(Math.round(o.yrs || 1), 1, 3), lb = o.lb ? 1 : 0;
    const rb = ruleBlock(p, fee); if (rb) return { ok: false, msg: rb, n };
    if (fee / inst > u.bal - reserved()) return { ok: false, msg: 'You cannot afford that fee.', n };
    const V = fee * (inst === 1 ? 1 : inst === 2 ? 0.96 : 0.92) + so / 100 * value(p) * 0.35 + (lb ? value(p) * 0.05 : 0);
    if (V >= n.min) {
      n.fee = fee; n.so = so; n.inst = inst; n.lb = lb; n.st = 'con'; n.age = 0;
      n.said = 'Deal. ' + club + ' accept ' + money(fee) + (so ? ' plus ' + so + '% of any future sale' : '') + (inst > 1 ? ', paid over ' + inst + ' years' : '') + (lb ? ', with the player loaned back to them until the summer' : '') + '. Now agree terms with the player.';
      news('FEE AGREED', S.C[S.user].n + ' agree fee for ' + p.n, 'Understand ' + S.C[S.user].n + ' and ' + club + ' have shaken hands on a ' + money(fee) + ' package for ' + p.n + (inst > 1 ? ', spread over ' + inst + ' years' : '') + (so ? ', with a ' + so + '% sell-on clause' : '') + '. Personal terms are the last step.' + (n.riv.length ? ' ' + S.C[n.riv[0]].n + ' have not given up and are still in contact with the player.' : ' No other club is close.'), S.user, p.id);
      return { ok: true, res: 'accept', msg: n.said, n };
    }
    const ratio = V / n.min;
    if (tense(n, 'ten', ratio)) { n.st = 'dead'; n.said = club + ' have walked away from the table. Try again next window.'; news('TALKS OFF', p.n + ' deal collapses', 'Talks between ' + S.C[S.user].n + ' and ' + club + ' for ' + p.n + ' are over. The selling club lost patience with the offers on the table' + (n.riv.length ? ', and ' + S.C[n.riv[0]].n + ' are now in pole position.' : '.'), S.user, p.id); return { ok: false, res: 'dead', msg: n.said, n }; }
    const hot = n.ten >= 70 ? ' Their patience is nearly gone.' : '';
    if (ratio >= 0.72) { n.ask = Math.max(Math.round(n.min * 1.02 / 1000) * 1000, Math.round((n.ask - (n.ask - n.min) * 0.45) / 1000) * 1000); n.said = 'Not enough. ' + club + ' come back with ' + money(n.ask) + '.' + hot; return { ok: true, res: 'counter', msg: n.said, n }; }
    n.said = club + ' reject that out of hand. They still want ' + money(n.ask) + '.' + hot; return { ok: true, res: 'reject', msg: n.said, n };
  }
  function conValue(o, exp) {
    const y = clamp(Math.round(o.y) || 3, 1, 5); let v = (o.w || 0) + (o.bonus || 0) / (y * 52); const role = o.role === undefined ? exp : o.role;
    v *= roleF(role, exp); if (o.rc) v *= 1.04; if (o.pro) v *= 1.03; if (o.rel) v *= 0.95; return v;
  }
  function roleF(role, exp) { const steps = role === 4 ? (exp === 4 ? 0 : -3) : exp === 4 ? 1 : exp - role; return 1 + clamp(steps * 0.05, -0.15, 0.1); }
  function conNeed(n, o) { o = o || {}; const role = o.role === undefined ? n.exp : +o.role, y = clamp(Math.round(o.y) || 3, 1, 5), f = roleF(role, n.exp) * (o.rc ? 1.04 : 1) * (o.pro ? 1.03 : 1) * (o.rel ? 0.95 : 1); return Math.max(0, Math.ceil((n.dm / f - (o.bonus || 0) / (y * 52)) / 100) * 100); }
  function conAsk(n, o, role) { // what he wants, in words that match the role on the table
    const f = roleF(role, n.exp) * (o.rc ? 1.04 : 1) * (o.pro ? 1.03 : 1) * (o.rel ? 0.95 : 1), need = Math.ceil(n.dm / f / 100) * 100;
    if (roleF(role, n.exp) < 1) return 'He wants ' + money(n.dm) + ' a week to be ' + ROLES[n.exp].toLowerCase() + ' to the team. As a ' + (role === 4 ? 'prospect' : ROLES[role].toLowerCase() + ' player') + ' it would take ' + money(need) + '.';
    return 'He wants ' + money(need === n.dm || f >= 1 ? n.dm : need) + ' a week' + (o.rel && need > n.dm ? ' with that relegation cut in' : '') + '.'; }
  function negContract(pid, o) {
    const a = approach(pid); if (!a.ok) return a; const n = a.n, p = a.p, u = S.C[S.user];
    if (n.st !== 'con') return { ok: false, msg: 'Agree a fee with his club first.', n };
    const w = Math.max(0, Math.round(o.w || 0)), y = clamp(Math.round(o.y) || 3, 1, 5), bonus = Math.max(0, Math.round(o.bonus || 0)), role = o.role === undefined ? n.exp : +o.role;
    if (wageBill(S.user) + pendWages() + (n.lb ? 0 : w) > u.wb) return { ok: false, msg: 'That wage would break your wage budget (' + money(u.wb) + ' a week).', n };
    if (n.fee / (n.inst || 1) + bonus > u.bal - reserved()) return { ok: false, msg: 'You cannot afford the fee and signing bonus together.', n };
    if (n.exp <= 1 && role !== 4 && role - n.exp >= 2) { if (tense(n, 'cten', 0.75)) { n.st = 'dead'; n.said = p.n + ' has walked away. He felt you did not rate him.'; return { ok: false, res: 'dead', msg: n.said, n }; } n.said = 'He will not sign as a ' + ROLES[role].toLowerCase() + ' player. He sees himself as ' + ROLES[n.exp].toLowerCase() + ' to this team.'; return { ok: true, res: 'reject', msg: n.said, n }; }
    const V = conValue({ w, y, bonus, role, rc: o.rc, pro: o.pro, rel: o.rel }, n.exp);
    if (V >= n.cmin) { S.pend.push({ pid, fee: n.fee, so: n.so, inst: n.inst, lb: n.lb, w, yrs: y, role, bonus, rc: o.rc ? 1 : 0, pro: o.pro ? 1 : 0, rel: o.rel ? 1 : 0, from: p.c, st: 'ok' }); n.st = 'done'; n.said = 'Agreed. I will sign.'; return { ok: true, res: 'accept', msg: 'Deal agreed. ' + p.n + ' joins within a day.', n }; }
    const ratio = V / n.cmin;
    if (tense(n, 'cten', w >= n.dm ? Math.max(ratio, 0.95) : ratio)) { n.st = 'dead'; n.said = p.n + ' has walked away from the talks.'; if (p.c >= 0) news('TALKS OFF', p.n + ' turns down ' + S.C[S.user].n, 'A fee was agreed, but ' + p.n + ' has rejected the contract offer from ' + S.C[S.user].n + ' and the move is dead. His camp felt the terms were well short of what he can get elsewhere.', S.user, p.id); return { ok: false, res: 'dead', msg: n.said, n }; }
    if (w < n.dm) n.dm = Math.max(Math.round(n.cmin * 1.02 / 100) * 100, Math.round((n.dm - (n.dm - n.cmin) * 0.45) / 100) * 100);
    n.said = (ratio >= 0.85 ? 'Closer. ' : 'That is well short. ') + conAsk(n, o, role) + (n.cten >= 70 ? ' His agent is ready to leave the room.' : '');
    return { ok: true, res: 'counter', msg: n.said, n };
  }
  function negWalk(pid) { const n = S.neg[pid]; if (n && n.st !== 'done') { n.st = 'dead'; n.said = 'You walked away from the talks.'; } }
  function rivalsTick() {
    for (const k in S.neg) {
      const n = S.neg[k]; if (n.s !== S.season || n.win !== winId() || (n.st !== 'fee' && n.st !== 'con') || !n.riv || !n.riv.length) continue;
      const p = X.PM.get(+k); if (!p || p.c < 0 || p.c === S.user || p.loan) continue; n.age = (n.age || 0) + 1;
      if (rnd() > 0.2) continue; const rc = pick(n.riv), R = S.C[rc], own = S.C[p.c].n; if (rc === p.c) continue;
      if (n.st === 'fee') {
        if (n.age > 6 && rnd() < 0.3 && !willing(p, rc) && R.sq.length < 34 && S.C[p.c].sq.length > 16) {
          const fee = Math.min(Math.round(n.min * 1.05 / 1000) * 1000, Math.max(0, Math.round(R.bal))), w = demand(p, rc); n.st = 'dead'; n.said = R.n + ' moved faster and have signed him.';
          news('TWIST', R.n + ' beat ' + S.C[S.user].n + ' to ' + p.n, 'While ' + S.C[S.user].n + ' were still haggling over the fee, ' + R.n + ' went straight to ' + own + ' with ' + money(fee) + ' and got an answer inside the hour. ' + p.n + ' has agreed terms and signs today. A painful one for ' + S.C[S.user].n + ', who had been in talks for days.', rc, p.id);
          msg(R.n + ' have signed ' + p.n + ' from under your nose for ' + money(fee) + '.', 'tr'); movePlayer(p, rc, fee, w, ri(3, 5)); continue;
        }
        n.min = Math.round(n.min * 1.05 / 1000) * 1000; n.ask = Math.max(n.ask, Math.round(n.min * 1.06 / 1000) * 1000); n.ten = Math.min(92, (n.ten || 0) + 6); p.ht = (p.ht || 0) + 1;
        n.said = R.n + ' have put in a bid. ' + own + ' now want ' + money(n.ask) + '.';
        news('BIDDING WAR', R.n + ' enter the race for ' + p.n, R.n + ' have submitted an official bid to ' + own + ' for ' + p.n + ', the player ' + S.C[S.user].n + ' have been chasing. ' + own + ' are now using the interest to push the price up: the asking price is understood to be ' + money(n.ask) + '. Expect this one to move quickly.', rc, p.id);
        msg(R.n + ' have bid for ' + p.n + '. ' + own + ' have raised the asking price to ' + money(n.ask) + '.', 'tr');
      } else {
        n.cmin = Math.round(n.cmin * 1.07 / 100) * 100; n.dm = Math.max(n.dm, Math.round(n.cmin * 1.04 / 100) * 100); n.said = R.n + ' have offered him a contract. He now wants ' + money(n.dm) + ' a week.';
        msg(R.n + ' are trying to turn the head of ' + p.n + ' with a better contract. He now wants ' + money(n.dm) + ' a week from you.', 'tr');
      }
    }
  }
  function finishDeal(d, w) {
    const p = X.PM.get(d.pid), u = S.C[S.user], k = d.inst || 1, now = Math.round(d.fee / k), from = d.from;
    movePlayer(p, S.user, now, w, d.yrs); S.fin.buy += d.fee; if (d.fee > 0 && (!S.rec.sign || d.fee > S.rec.sign[0])) { S.rec.sign = [d.fee, p.n, S.season]; story('Club-record signing: ' + p.n + ' for ' + money(d.fee) + '.'); }
    if (k > 1) { for (let i = 1; i < k; i++) S.debt.push({ amt: i === k - 1 ? d.fee - now * (k - 1) : now, to: d.from, n: p.n, s: S.season + i - 1 }); if (S.tlog[0] && S.tlog[0].p === p.id) S.tlog[0].fee = d.fee; }
    if (d.bonus) u.bal -= d.bonus;
    p.role = d.role === undefined ? expRole(p, S.user) : d.role; p.rc = d.rc ? Math.round(value(p) * 2 / 1e5) * 1e5 : 0; if (d.so && d.from >= 0) p.so = [d.from, d.so];
    if (d.pro || d.rel) p.wc = [d.pro ? 1 : 0, d.rel ? 1 : 0]; else delete p.wc;
    if (S.bb) S.bb = S.bb.filter(b => b.pid !== p.id); p.sk = 1; delete p.us;
    msg(p.n + ' has signed' + (d.fee ? ' for ' + money(d.fee) : ' on a free transfer') + '.', 'tr');
    dealNews(p, from, S.user, d.fee, w, d.yrs);
    if (d.lb && from >= 0 && windowOpen()) { loanMove(p, from, 1, 0); msg(p.n + ' stays at ' + S.C[from].n + ' on loan until the end of the season, as agreed in the deal.', 'tr'); }
  }
  function completePending() {
    const keep = [];
    for (const d of S.pend) {
      const p = X.PM.get(d.pid); if (!p || p.c !== d.from) { msg('The deal for ' + (p ? p.n : 'your target') + ' collapsed: he has moved elsewhere.', 'tr'); continue; }
      if (d.st === 'hij') { if (!windowOpen()) { msg('The hijacked deal for ' + p.n + ' has lapsed.', 'tr'); continue; } keep.push(d); continue; }
      if (rnd() < 0.08 && p.o >= S.C[S.user].rep - 2) { d.st = 'hij'; d.w2 = Math.round(d.w * 1.15 / 100) * 100; d.rival = rivalFor(p); news('TWIST', S.C[d.rival].n + ' try to hijack ' + p.n + ' deal', 'Late drama. ' + p.n + ' had agreed to join ' + S.C[S.user].n + ', but ' + S.C[d.rival].n + ' have called his agent with a bigger contract and the signing is on hold. ' + S.C[S.user].n + ' must now match ' + money(d.w2) + ' a week or lose him.', d.rival, p.id); msg(S.C[d.rival].n + ' are trying to hijack your deal for ' + p.n + '. He now wants ' + money(d.w2) + ' a week. Decide in the Transfer Hub.', 'tr'); keep.push(d); continue; }
      finishDeal(d, d.w);
    }
    S.pend = keep;
    for (const o of S.offers.filter(x => x.cl)) { const p = X.PM.get(o.pid); if (p && p.c === S.user) { msg(S.C[o.ci].n + ' activated the release clause of ' + p.n + ' (' + money(o.fee) + ').', 'tr'); sell(p, o.ci, o.fee); } }
    S.offers = S.offers.filter(x => !x.cl);
  }
  function rivalFor(p) { const rv = rivals(), rl = rv.derby.concat(rv.live).filter(ci => ci !== p.c && S.C[ci].rep >= p.o - 6 && S.C[ci].sq.length < 36); if (rl.length && rnd() < 0.6) return pick(rl); for (let i = 0; i < 40; i++) { const ci = ri(0, S.C.length - 1); if (ci !== S.user && ci !== p.c && Math.abs(S.C[ci].rep - S.C[S.user].rep) < 4) return ci; } return (S.user + 1) % S.C.length; }
  function resolveHijack(pid, match) {
    const i = S.pend.findIndex(d => d.pid === pid && d.st === 'hij'); if (i < 0) return { ok: false, msg: 'No such deal.' }; const d = S.pend[i], p = X.PM.get(pid);
    if (!match) { S.pend.splice(i, 1); if (p.c !== d.from) return { ok: true, msg: 'You walked away.' }; if (d.rival !== p.c && S.C[d.rival].sq.length < 38) movePlayer(p, d.rival, Math.min(d.fee, Math.max(0, S.C[d.rival].bal)), d.w2, d.yrs); return { ok: true, msg: 'You walked away. ' + p.n + ' joins ' + S.C[d.rival].n + '.' }; }
    if (wageBill(S.user) + pendWages() > S.C[S.user].wb) return { ok: false, msg: 'Matching that wage would break your wage budget.' };
    S.pend.splice(i, 1); finishDeal(d, d.w2); return { ok: true, msg: p.n + ' has signed.' };
  }
  function release(pid) { const p = X.PM.get(pid); if (!p || p.c !== S.user) return { ok: false, msg: 'Not your player.' }; if (p.loan) return { ok: false, msg: 'He is here on loan. He goes back to his club in the summer.' }; if (S.C[S.user].sq.length <= 16) return { ok: false, msg: 'You need at least 16 players.' }; movePlayer(p, -1, 0); msg('You released ' + p.n + '.', 'tr'); return { ok: true, msg: p.n + ' released.' }; }
  function renewDemand(p) { const tr = trait(p); return Math.round(Math.max(p.w, wage(p)) * (tr === 3 ? 1 : tr === 5 ? 1.16 : 1.08) / 100) * 100; }
  function renew(pid, yrs) {
    const p = X.PM.get(pid); if (!p || p.c !== S.user) return { ok: false, msg: 'Not your player.' };
    const w = renewDemand(p); p.w = w; p.cy = clamp(yrs || 3, 1, 5); return { ok: true };
  }
  function renewStart(pid) {
    const p = X.PM.get(pid); if (!p || p.c !== S.user) return { ok: false, msg: 'Not your player.' };
    if (p.loan) return { ok: false, msg: 'He is here on loan. You cannot offer him a contract.' };
    let n = S.rn[pid];
    if (!n) { const dm = renewDemand(p), h = hash(pid * 11 + S.season); n = S.rn[pid] = { dm: Math.round(dm * 1.06 / 100) * 100, cmin: Math.round(dm * (0.9 + 0.08 * h) / 100) * 100, cten: 0, exp: expRole(p, S.user), st: p.mo < 25 ? 'dead' : 'con', said: p.mo < 25 ? p.n + ' is unhappy and will not discuss a new deal right now.' : 'I would stay for around ' + money(Math.round(dm * 1.06 / 100) * 100) + ' a week.' }; }
    return { ok: n.st !== 'dead', n, p, msg: n.said };
  }
  function renewOffer(pid, o) {
    const a = renewStart(pid); if (!a.n) return a; const n = a.n, p = a.p, u = S.C[S.user];
    if (n.st !== 'con') return { ok: false, msg: n.said, n };
    const w = Math.max(0, Math.round(o.w || 0)), y = clamp(Math.round(o.y) || 3, 1, 5), bonus = Math.max(0, Math.round(o.bonus || 0)), role = o.role === undefined ? n.exp : +o.role;
    if (wageBill(S.user) - p.w + pendWages() + w > u.wb) return { ok: false, msg: 'That wage would break your wage budget (' + money(u.wb) + ' a week).', n };
    if (bonus > u.bal - reserved()) return { ok: false, msg: 'You cannot afford that signing bonus.', n };
    const V = conValue({ w, y, bonus, role, rc: o.rc, pro: o.pro, rel: o.rel }, n.exp);
    if (V >= n.cmin) { p.w = w; p.cy = y; p.role = role; u.bal -= bonus; p.rc = o.rc ? Math.round(value(p) * 2 / 1e5) * 1e5 : (p.rc || 0); if (o.pro || o.rel) p.wc = [o.pro ? 1 : 0, o.rel ? 1 : 0]; else delete p.wc; p.mo = clamp(p.mo + 8, 0, 100); n.st = 'done'; n.said = 'Agreed. Happy to stay.'; return { ok: true, res: 'accept', msg: p.n + ' signs a new ' + y + '-year deal at ' + money(w) + ' a week.', n }; }
    const ratio = V / n.cmin;
    if (tense(n, 'cten', w >= n.dm ? Math.max(ratio, 0.95) : ratio)) { n.st = 'dead'; n.said = p.n + ' has broken off contract talks until next season.'; p.mo = clamp(p.mo - 6, 0, 100); return { ok: false, res: 'dead', msg: n.said, n }; }
    if (w < n.dm) n.dm = Math.max(Math.round(n.cmin * 1.02 / 100) * 100, Math.round((n.dm - (n.dm - n.cmin) * 0.45) / 100) * 100);
    n.said = (ratio >= 0.85 ? 'Closer. ' : 'That is well short. ') + conAsk(n, o, role) + (n.cten >= 70 ? ' He is close to ending the talks.' : ''); return { ok: true, res: 'counter', msg: n.said, n };
  }
  function toggleList(pid) { const p = X.PM.get(pid); if (p && p.c === S.user && !p.loan) p.tl = p.tl ? 0 : 1; return p ? p.tl : 0; }
  function toggleShort(pid) { const i = S.short.indexOf(pid); if (i >= 0) S.short.splice(i, 1); else { S.short.unshift(pid); spot(X.PM.get(pid)); } return i < 0; }
  function setRole(pid, r) { const p = X.PM.get(pid); if (p && p.c === S.user) p.role = r; }
  function userOffers() {
    const u = S.C[S.user]; if (u.sq.length <= 16) return;
    for (const p of u.sq) {
      if (p.loan || S.offers.some(o => o.pid === p.id)) continue;
      if (p.j === S.season && !p.tl) continue; const pr = p.tl ? 0.22 : p.mo < 25 ? 0.08 : 0.012; if (rnd() > pr) continue;
      for (let i = 0; i < 25; i++) {
        const ci = ri(0, S.C.length - 1), c = S.C[ci]; if (ci === S.user || c.sq.length >= 36 || c.sq.length < 11 || isRival(ci)) continue;
        if (p.o < c.sq[Math.min(10, c.sq.length - 1)].o - 1 || p.o > c.rep + 8) continue;
        if (!p.tl && att(ci) < att(S.user) - 2) continue;
        let fee = Math.round(value(p) * (p.tl ? (p.j === S.season ? 0.5 + rnd() * 0.25 : 0.7 + rnd() * 0.3) : 0.9 + rnd() * 0.3) * dq().sell / 1000) * 1000; let max = Math.round(fee * (1.05 + rnd() * 0.17) / 1000) * 1000, cl = 0;
        if (p.rc && max >= p.rc * 0.9 && c.bal >= p.rc) { fee = max = p.rc; cl = 1; }
        if (fee > c.bal) continue; if (max > c.bal) max = fee;
        const yrs = !cl && fee > 4e6 ? (rnd() < 0.3 ? 2 : rnd() < 0.12 ? 3 : 1) : 1;
        S.offers.push({ pid: p.id, ci, fee, max, ten: 0, cl, yrs, exp: S.t + 5 }); if (u.sq.indexOf(p) < 4) news('BID', c.n + ' bid for ' + p.n, c.n + ' have made their move for ' + p.n + '. An opening offer of ' + money(fee) + ' has gone in to ' + u.n + (cl ? ', which meets his release clause. The player now decides.' : '. He is one of their most important players and the first answer is expected to be no, but ' + c.n + ' are prepared to go higher.'), ci, p.id);
        msg(cl ? c.n + ' have met the ' + money(fee) + ' release clause of ' + p.n + '. He leaves when you next advance.' : c.n + ' offer ' + money(fee) + (yrs > 1 ? ' (paid over ' + yrs + ' years)' : '') + ' for ' + p.n + '. Respond in the Transfer Hub.', 'tr'); break;
      }
    }
  }
  function sellF(opt) { return opt ? (opt.bb ? 0.93 : 1) * (1 - clamp(+opt.so || 0, 0, 20) * 0.006) : 1; }
  function sell(p, ci, fee, yrs, opt) {
    const so = p.so, k = yrs || 1, now = Math.round(fee / k), w = wage(p), y = ri(2, 4); movePlayer(p, ci, now, w, y); S.fin.sell += fee; if (fee >= 4e7) award('sale'); if (fee > 0 && (!S.rec.sale || fee > S.rec.sale[0])) { S.rec.sale = [fee, p.n, S.season]; story('Record sale: ' + p.n + ' to ' + S.C[ci].n + ' for ' + money(fee) + '.'); }
    if (k > 1) { for (let i = 1; i < k; i++) S.cred.push({ amt: i === k - 1 ? fee - now * (k - 1) : now, n: p.n, s: S.season + i - 1 }); if (S.tlog[0] && S.tlog[0].p === p.id) S.tlog[0].fee = fee; }
    if (so && fee > 0) { const cut = Math.round(fee * so[1] / 100); S.C[S.user].bal -= cut; S.C[so[0]].bal += cut; msg(S.C[so[0]].n + ' receive ' + money(cut) + ' from their ' + so[1] + '% sell-on clause.', 'tr'); }
    if (opt && opt.bb && fee > 0) { S.bb = (S.bb || []).filter(b => b.pid !== p.id); S.bb.push({ pid: p.id, ci, fee: Math.round(fee * 1.5 / 1e4) * 1e4, s: S.season + 2 }); }
    if (opt && +opt.so > 0) p.us = clamp(Math.round(+opt.so), 0, 20);
    S.offers = S.offers.filter(x => x.pid !== p.id); S.loffers = S.loffers.filter(x => x.pid !== p.id);
    dealNews(p, S.user, ci, fee, w, y);
  }
  function answerOffer(pid, ci, acc, opt) {
    const i = S.offers.findIndex(o => o.pid === pid && o.ci === ci); if (i < 0) return { ok: false, msg: 'That offer has expired.' }; const o = S.offers[i];
    if (!acc) { if (o.cl) return { ok: false, msg: 'His release clause has been met. You cannot block the move.' }; S.offers.splice(i, 1); return { ok: true, msg: 'Offer rejected.' }; }
    const p = X.PM.get(pid); if (S.C[S.user].sq.length <= 16) return { ok: false, msg: 'You need at least 16 players.' };
    const fee = o.cl ? o.fee : Math.round(o.fee * sellF(opt) / 1000) * 1000;
    sell(p, ci, fee, o.yrs, o.cl ? null : opt); return { ok: true, msg: p.n + ' sold to ' + S.C[ci].n + ' for ' + money(fee) + '.' };
  }
  function sellCounter(pid, ci, ask, opt) {
    const i = S.offers.findIndex(o => o.pid === pid && o.ci === ci); if (i < 0) return { ok: false, msg: 'That offer has expired.' }; const o = S.offers[i], p = X.PM.get(pid), c = S.C[ci];
    ask = Math.round(ask || 0); if (o.cl) return { ok: false, msg: 'His release clause has been met.' };
    const f = sellF(opt), max = o.max * f;
    if (ask <= max) { if (S.C[S.user].sq.length <= 16) return { ok: false, msg: 'You need at least 16 players.' }; sell(p, ci, ask, o.yrs, opt); return { ok: true, res: 'accept', msg: c.n + ' agree to pay ' + money(ask) + '. ' + p.n + ' is sold.' }; }
    if (tense(o, 'ten', max / ask)) { S.offers.splice(i, 1); news('TALKS OFF', c.n + ' walk away from ' + p.n, c.n + ' have pulled out of the race for ' + p.n + '. ' + S.C[S.user].n + ' held out for ' + money(ask) + ' and the buyers decided the price was too high.', ci, p.id); return { ok: false, res: 'dead', msg: c.n + ' have withdrawn their interest.' }; }
    o.fee = Math.round((o.fee + (o.max - o.fee) * 0.55) / 1000) * 1000; return { ok: true, res: 'counter', msg: c.n + ' will not go that high. They raise their bid to ' + money(Math.round(o.fee * f / 1000) * 1000) + (f < 1 ? ' with the clauses you asked for' : '') + '.' + (o.ten >= 70 ? ' They are close to walking away.' : '') };
  }
  function aiWindow() {
    const nC = S.C.length; X.nc = 0; rumourTick();
    // good free agents get picked up by clubs that can use them
    const fa = []; for (let q = 0; q < 12; q++) { const pl = X.byPos[q]; for (let i = 0, n = 0; i < pl.length && n < 6; i++) { const p = pl[i]; if (p.o < 70) break; if (p.c === -1) { fa.push(p); n++; } } }
    for (const p of fa) { for (let i = 0; i < 25; i++) { const ci = ri(0, nC - 1), c = S.C[ci]; if (ci === S.user || c.sq.length < 11 || c.sq.length >= 34) continue; if (p.o < c.sq[10].o + 0.5 || (p.o > c.rep + 9 && att(ci) < S.elite) || willing(p, ci)) continue; aiDeal(p, ci, 0, demand(p, ci), ri(1, 4)); break; } }
    // the richest clubs go after the best players at smaller clubs
    const rich = S.C.map((c, i) => i).sort((x, y) => S.C[y].bal - S.C[x].bal).slice(0, 40);
    for (const ci of rich) {
      const c = S.C[ci]; if (ci === S.user || c.sq.length < 11 || c.sq.length >= 33 || rnd() < 0.5) continue;
      const x = pickXI(ci); let wk = 1, wv = 1e9; for (let s2 = 0; s2 < 11; s2++) if (x.r[s2] < wv) { wv = x.r[s2]; wk = s2; }
      const pool = X.byPos[x.slots[wk]], a = att(ci);
      for (let i = 0; i < pool.length && i < 300; i++) {
        const p = pool[i]; if (p.o < wv + 2) break;
        if (p.c === ci || p.c === S.user || p.c < 0 || p.inj || p.loan || p.a > 30 || p.j === S.season) continue;
        if (S.C[p.c].sq.length <= 20 || att(p.c) > a - 1.5) continue;
        const fee = asking(p); if (fee > c.bal * 0.7 || willing(p, ci)) continue;
        aiDeal(p, ci, fee, demand(p, ci), ri(3, 5)); break;
      }
    }
    for (let k = 0; k < 60; k++) {
      const ci = ri(0, nC - 1); if (ci === S.user) continue; const c = S.C[ci]; if (c.sq.length < 11 || c.sq.length >= 34 || c.bal < 0) continue;
      const x = pickXI(ci); let wk = 1, wv = 1e9; for (let s = 1; s < 11; s++) if (x.r[s] < wv) { wv = x.r[s]; wk = s; }
      if (rnd() < 0.12) { wk = 0; wv = x.r[0]; }
      const pool = X.byPos[x.slots[wk]]; if (!pool.length) continue; const a = att(ci); let best = null, bs = -1e9, bfee = 0;
      let i0 = 0, i1 = pool.length - 1; { let lo = 0, hi = pool.length; while (lo < hi) { const m = (lo + hi) >> 1; if (pool[m].o > a + 7) lo = m + 1; else hi = m; } i0 = lo; lo = 0; hi = pool.length; while (lo < hi) { const m = (lo + hi) >> 1; if (pool[m].o >= wv + 1.5) lo = m + 1; else hi = m; } i1 = lo - 1; }
      if (i1 < i0) continue;
      for (let i = 0; i < 45; i++) {
        const p = pool[i0 + Math.floor(rnd() * (i1 - i0 + 1))];
        if (p.c === ci || p.c === S.user || p.c < -1 || p.inj || p.loan || p.a > 32 || p.o < wv + 1.5 || p.o > a + 7) continue;
        if (p.c >= 0 && (S.C[p.c].sq.length <= 20 || p.j === S.season)) continue;
        const fee = p.c < 0 ? 0 : asking(p); if (fee > c.bal * 0.6) continue;
        if (willing(p, ci)) continue;
        const sc = p.o + (p.a < 24 ? (p.pot - p.o) * 0.3 : 0) - (c.bal > 0 ? fee / c.bal * 2 : 0); if (sc > bs) { bs = sc; best = p; bfee = fee; }
      }
      if (best) aiDeal(best, ci, bfee, demand(best, ci), ri(2, 5));
    }
  }

  // ---------- user events ----------
  function userEvent() {
    const u = S.C[S.user], sq = u.sq; if (sq.length < 12) return;
    // promises kept or broken
    for (const p of sq) if (p.prom && S.t >= p.prom) { if (p.ss[0] - (p.ps || 0) >= 3) { p.mo = clamp(p.mo + 6, 0, 100); mail(p.n, 'Thanks, boss', 'You kept your word and gave me games. I will repay you on the pitch.'); } else { p.mo = clamp(p.mo - 18, 0, 100); mail(p.n, 'You broke your promise', 'You said I would play. I have barely had a look-in since. I will not forget this.'); } delete p.prom; delete p.ps; }
    // players asking for games
    if (S.t > 8 && rnd() < 0.3) { const c = sq.filter(p => !p.inj && !p.prom && p.mo < 42 && (p.role !== undefined ? p.role <= 2 : p.o >= u.rep - 3) && (!p.mc || S.t - p.mc > 14)); if (c.length) { const p = pick(c); p.mc = S.t; mail(p.n, 'I need more game time', 'Boss, I have started ' + p.ss[0] + ' matches this season. I came here to play, as ' + (ROLES[p.role] || 'an important').toLowerCase() + ' part of this squad. Where do I stand?', ['You will get your chance soon', 'Earn your place in training', 'I will let you leave'], { type: 'playtime', pid: p.id }); } }
    // players asking for a new deal
    if (rnd() < 0.07) { const c = sq.filter(p => p.cy <= 2 && p.ss[0] >= 8 && p.ss[3] / p.ss[0] >= 6.95 && p.w < wage(p) * 0.9 && (!p.mc || S.t - p.mc > 20)); if (c.length) { const p = pick(c); p.mc = S.t; mail(p.n + ' (via his agent)', 'Time to talk about a new contract', p.n + ' is averaging ' + (p.ss[3] / p.ss[0]).toFixed(2) + ' this season on ' + money(p.w) + ' a week, with ' + p.cy + ' year' + (p.cy > 1 ? 's' : '') + ' left. Other clubs pay players like him far more. Shall we sit down?', ['Open contract talks', 'Not right now'], { type: 'contract', pid: p.id }); } }
    // coaching staff report every four weeks
    if (S.t % 8 === 0 && S.t > 0) {
      const up = sq.filter(p => p.lo !== undefined && p.o - p.lo >= 0.4).sort((a, b) => (b.o - b.lo) - (a.o - a.lo)).slice(0, 4), tired = sq.filter(p => p.fi < 62 && !p.inj).slice(0, 4), hot = sq.filter(p => p.fm > 1.2).slice(0, 3);
      let body = up.length ? 'Biggest improvers this month: ' + up.map(p => p.n + ' (+' + (p.o - p.lo).toFixed(1) + ', now ' + Math.round(p.o) + ')').join(', ') + '. ' : 'No one has made a big jump in training this month. ';
      if (hot.length) body += 'In form: ' + hot.map(p => p.n).join(', ') + '. '; if (tired.length) body += 'Tired legs, consider a rest: ' + tired.map(p => p.n + ' (' + Math.round(p.fi) + '%)').join(', ') + '.';
      mail('Head coach', 'Monthly development report', body); for (const p of sq) p.lo = p.o;
    }
    if (S.t === 6 && u.auto) { const cur = u.f, base = pickXI(S.user).avg; let bf = cur, bv = base; for (const f in FORMS) { u.f = f; const v = pickXI(S.user).avg; if (v > bv + 0.6) { bv = v; bf = f; } } u.f = cur; if (bf !== cur) mail('Assistant manager', 'A shape that suits this squad better', 'I have been looking at the group. In a ' + bf + ' our best eleven rates ' + bv.toFixed(1) + ' against ' + base.toFixed(1) + ' in the current ' + cur + '. Want me to set it up?', ['Switch to the ' + bf, 'Keep my shape'], { type: 'formation', f: bf }); }
    if (S.t > 20 && rnd() < 0.06) { const pos = table(u.l).indexOf(S.user) + 1; if (pos > S.board.pos + 2) { const c = sq.filter(p => trait(p) === 2 && sq.indexOf(p) < 6 && !p.loan && !p.tl && (!p.mc || S.t - p.mc > 20)); if (c.length) { const p = pick(c); p.mc = S.t; mail(p.n, 'I want to leave', 'Boss, I will be straight with you. We are ' + ord(pos) + ' and I did not come here for that. I want to play at a higher level and I am asking you to let me go.', ['Put him on the transfer list', 'Refuse: you are going nowhere'], { type: 'treq', pid: p.id }); } } }
    if (S.t === 40) { const pos = table(u.l).indexOf(S.user) + 1, ok = pos <= S.board.pos; mail('Club owner', 'Mid-season review', 'We sit ' + ord(pos) + '. The target I set was to ' + S.board.txt.charAt(0).toLowerCase() + S.board.txt.slice(1) + '. ' + (ok ? 'I am pleased with the direction. Keep it going.' : 'This is below what I expect. What do I tell the other directors?'), ['We will hit the target', 'Judge us in May'], { type: 'boardmid' }); }
    // agents offering players while the window is open
    if (windowOpen() && rnd() < 0.14) { const lo = u.rep - 4, hi = u.rep + 4; const pool = S.P.filter(p => (p.c === -1 || (p.c >= 0 && p.c !== S.user && p.tl)) && p.o >= lo && p.o <= hi && p.a <= 32 && !willing(p, S.user) && !ruleBlock(p, 0)); if (pool.length) { const p = pick(pool); mail('Agent of ' + p.n, 'My client is available', p.n + ' (' + POS[p.p] + ', ' + p.a + ', rated ' + Math.round(p.o) + ') ' + (p.c < 0 ? 'is a free agent' : 'can leave ' + S.C[p.c].n) + ' and likes the idea of joining you. He would want around ' + money(demand(p, S.user)) + ' a week.', ['Open talks', 'Not interested'], { type: 'agent', pid: p.id }); } }
    if (rnd() > 0.04) return; const k = ri(1, 4);
    if (k === 1) { const p = pick(sq); if (p.inj) return; p.inj = ri(2, 8); msg('Training ground injury: ' + p.n + ' is out for ' + p.inj + ' weeks.', 'inj'); }
    else if (k === 2) { const a = pick(sq), b = pick(sq); if (a === b) return; a.mo = clamp(a.mo - 6, 0, 100); b.mo = clamp(b.mo - 6, 0, 100); mail('Assistant manager', 'Bust-up at training', a.n + ' and ' + b.n + ' squared up after a late tackle in the small-sided game. The lads are waiting to see how you handle it.', ['Back ' + a.n, 'Back ' + b.n, 'Fine them both'], { type: 'row', a: a.id, b: b.id }); }
    else if (k === 3) { let tv = 0; for (let i = 0; i < Math.min(18, sq.length); i++) tv += value(sq[i]); const amt = Math.round(tv * 0.03 / 10000) * 10000; if (amt <= 0) return; mail('Club owner', 'New sponsorship money', 'A new commercial partner has come in. I can release ' + money(amt) + ' to you. Where do you want it?', ['Transfer budget', 'Wage budget'], { type: 'windfall', amt }); }
    else { if (sq.length >= 38) return; const a = ri(16, 17), o = Math.max(42, Math.round(u.rep - ri(12, 18))), pot = Math.min(91, o + ri(14, 24)), pp = pick([0, 1, 1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 11]); mail('Head of youth', 'A trialist worth a look', 'We have had a ' + a + '-year-old ' + POS[pp] + ' in on trial. He is around ' + o + ' now and my guess is he tops out near ' + pot + '. Do you want him in the academy?', ['Sign him', 'Pass'], { type: 'trialist', a, o, pot, p: pp }); }
  }
  function contractWarn(k) { if (k) { const L = leaving().filter(x => x.why === 'contract' && !x.auto); if (!L.length) return; const nm = L.slice(0, 6).map(x => X.PM.get(x.id).n).join(', ') + (L.length > 6 ? ' and ' + (L.length - 6) + ' more' : '');
      mail('Club secretary', k === 1 ? 'Contracts: twelve weeks left' : 'Contracts: final weeks', (k === 1 ? 'These players are out of contract this summer and will leave for nothing unless you agree new deals: ' : 'Last call. Unless you act, these players walk out of the door when the season ends: ') + nm + '. The Leaving this summer panel on the hub has a button for each one.'); alertU(k === 1 ? 'Contracts running out' : 'Last call on contracts', L.length + ' player' + (L.length > 1 ? 's' : '') + ' leave' + (L.length > 1 ? '' : 's') + ' on a free this summer: ' + nm + '.'); return; }
    const l = S.C[S.user].sq.filter(p => p.cy <= 1 && !p.loan); if (l.length) { alertU('Contracts', l.length + ' contract' + (l.length > 1 ? 's' : '') + ' run out this summer.'); msg(l.length + ' contract' + (l.length > 1 ? 's' : '') + ' run out this summer: ' + l.slice(0, 6).map(p => p.n).join(', ') + (l.length > 6 ? ' and more' : '') + '.', 'ct'); } }

  // ---------- season end ----------
  function endSeason() {
    const sum = { season: S.season, leagues: [], user: null, eu: [], cups: [], moves: [] };
    const order = S.L.map((L, li) => table(li)); const u = S.C[S.user];
    // prize money and champions
    const champs = { s: S.season, l: [], eu: [], cup: [] }; S._b0 = S.C[S.user].bal;
    S.L.forEach((L, li) => { const o = order[li], n = o.length; champs.l.push(o[0]); o.forEach((ci, i) => { S.C[ci].bal += Math.round(L.m * 1e6 * (1 - 0.6 * i / (n - 1))); S.C[ci].lp = i + 1; }); S.C[o[0]].tit = (S.C[o[0]].tit || 0) + 1; });
    S.eu.forEach((E, k) => { champs.eu.push(E.w); const base = [15e6, 5e6, 3e6][k]; for (const ci of E.teams) { const st = E.out[ci]; const mult = st === 'w' ? 6 : st === 'f' ? 4.5 : st === 'sf' ? 3.5 : st === 'qf' ? 2.7 : st === 'r16' ? 2 : st === 'po' ? 1.4 : 1; S.C[ci].bal += Math.round(base * mult); } });
    S.cups.forEach(c => { champs.cup.push([c.n, c.w]); if (c.w >= 0) S.C[c.w].bal += 1e6; });
    S.champs.push(champs); S.fin.prize = Math.max(0, u.bal - S._b0); delete S._b0;
    // user record
    const ul = u.l, UL = S.L[ul], pos = order[ul].indexOf(S.user) + 1, row = UL.tbl[S.user];
    const cup = S.cups.find(c => c.c === UL.c); let cupTxt = '-';
    if (cup && cup.out[S.user] !== undefined) cupTxt = cup.out[S.user] === 99 ? 'Winner' : cupRoundName(cup, cup.out[S.user]);
    let euTxt = '-'; S.eu.forEach(E => { if (E.out[S.user] !== undefined || E.teams.indexOf(S.user) >= 0) euTxt = E.n + ': ' + STAGEN[E.out[S.user] || 'lp']; });
    let ts = null; for (const p of u.sq) if (!ts || p.ss[1] > ts.ss[1]) ts = p; let bp = null; for (const p of u.sq) if (p.ss[0] >= 10 && (!bp || p.ss[3] / Math.floor(p.ss[0]) > bp.ss[3] / Math.floor(bp.ss[0]))) bp = p;
    const rec = { s: S.season, club: u.n, lg: UL.n, tier: UL.t, pos, n: order[ul].length, pts: row[6] - ((UL.ded && UL.ded[S.user]) || 0), w: row[1], d: row[2], l: row[3], gf: row[4], ga: row[5], cup: cupTxt, eu: euTxt, ts: ts ? [ts.n, ts.ss[1]] : null, bp: bp ? [bp.n, Math.round(bp.ss[3] / Math.floor(bp.ss[0]) * 100) / 100] : null, tro: [] };
    if (pos === 1) rec.tro.push(UL.n); if (cup && cup.w === S.user) { rec.tro.push(cup.n); rec.cupW = 1; } S.cups.forEach(c => { if (c.lc && c.w === S.user) rec.tro.push(c.n); }); (S.po || []).forEach(q => { if (q.w === S.user) rec.tro.push(q.n); }); S.eu.forEach(E => { if (E.w === S.user) rec.tro.push(E.n); });
    for (const t of rec.tro) S.trophies.push({ s: S.season, n: t });
    // promotion / relegation
    const byC = {}; S.L.forEach((L, li) => { (byC[L.c] = byC[L.c] || [])[L.t - 1] = li; });
    for (const ctry in REL) { const tiers = byC[ctry]; if (!tiers) continue; REL[ctry].forEach((k, i) => { const up = tiers[i], dn = tiers[i + 1]; if (up === undefined || dn === undefined) return; const down = order[up].slice(-k), ups = poUps(ctry, dn, order[dn], k); for (const ci of down) { S.C[ci].l = dn; sum.moves.push([ci, up, dn]); } for (const ci of ups) { S.C[ci].l = up; S.C[ci].bal += Math.round(S.L[up].m * 0.5e6); S.C[ci].wb = Math.max(S.C[ci].wb, S.L[up].aw * 0.85); sum.moves.push([ci, dn, up]); } }); }
    if (u.l !== ul) { rec.mv = S.L[u.l].t < UL.t ? 'Promoted' : 'Relegated'; let ch = 0; for (const p of u.sq) if (p.wc && !p.loan) { if (rec.mv === 'Promoted' && p.wc[0]) { p.w = Math.round(p.w * 1.15 / 100) * 100; ch++; } else if (rec.mv === 'Relegated' && p.wc[1]) { p.w = Math.round(p.w * 0.75 / 100) * 100; ch++; } } if (ch) msg(ch + ' contract clause' + (ch > 1 ? 's' : '') + ' triggered by ' + (rec.mv === 'Promoted' ? 'promotion: wages rise 15%.' : 'relegation: wages are cut 25%.'), 'ct'); }
    { const sp = S.inc.sp; if (sp) { if (sp.bon && S.board && rec.pos <= S.board.pos) { u.bal += sp.bon; S.fin.spons += sp.bon; msg(sp.n + ' pay the ' + money(sp.bon) + ' bonus for hitting the league target.', 'win'); } else if (sp.bon) msg('The league target was missed, so the ' + money(sp.bon) + ' bonus from ' + sp.n + ' is not paid.', 'ev'); if (--sp.yrs <= 0) S.inc.sp = null; } }
    rec.board = boardEval(rec, cup, rec.mv === 'Relegated'); rec.mr = S.mr;
    for (const d of S.debt.filter(x => x.s <= S.season)) { u.bal -= d.amt; if (d.to >= 0) S.C[d.to].bal += d.amt; msg('Instalment paid for ' + d.n + ': ' + money(d.amt) + '.', 'tr'); } S.debt = S.debt.filter(x => x.s > S.season);
    rec.bp = S.board ? S.board.pos : 0; rec.df = dmin(); rec.sc = seasonScore(rec, UL.lvl || u.rep, rec.bp ? rec.bp - pos : 0, rec.df, S.opts.iron);
    S.hist.push(rec); sum.user = rec;
    S.L.forEach((L, li) => { sum.leagues.push([li, order[li][0]]); L.teams = []; });
    S.C.forEach((c, ci) => { if (c.l >= 0) S.L[c.l].teams.push(ci); });
    S.eu.forEach(E => sum.eu.push([E.n, E.w])); S.cups.forEach(c => sum.cups.push([c.n, c.w]));
    // financial fair play: wage bill over budget -> points deduction next season
    if (wageBill(S.user) > u.wb * 1.05) { S.L[u.l].nded = S.L[u.l].nded || {}; S.L[u.l].nded[S.user] = 3; msg('Your wage bill is over budget. The league deducts 3 points next season.', 'ev'); sum.ded = 3; }
    const q = qualify(order, S.cups.map(c => c.w)); sum.q = q.map(a => a.indexOf(S.user) >= 0);
    // goal check
    checkGoal(rec, sum);
    S.arch.push({ s: S.season, club: u.n, lg: UL.n, rows: u.sq.filter(p => p.ss[0] + p.ss[9] > 0).map(p => [p.id, p.n, p.p, p.a, Math.round(p.o), p.ss[0], p.ss[9], p.ss[1], p.ss[2], Math.round(p.ss[5] * 10) / 10, Math.round(p.ss[6] * 10) / 10, p.ss[7], p.ss[4], p.ss[8], p.ss[0] ? Math.round(p.ss[3] / p.ss[0] * 100) / 100 : 0, value(p), Math.round(p.ss[10]), Math.round(p.ss[11]), p.ss[12] ? Math.round(p.ss[13] / p.ss[12] * 100) : 0, Math.round(p.ss[14]), Math.round(p.ss[15])]) });
    S.finH.push(Object.assign({ s: S.season }, S.fin)); S.fin = FIN0();
    for (const d of S.cred.filter(x => x.s <= S.season)) { u.bal += d.amt; msg('Instalment received for ' + d.n + ': ' + money(d.amt) + '.', 'tr'); } S.cred = S.cred.filter(x => x.s > S.season);
    // players: final development step, dynamic potential, ageing, contracts, retirement
    develop(0.5 / 11.5); returnLoans();
    const retired = [], autoRen = []; S.gone = [];
    for (const p of S.P) {
      if (p.c < -1) continue;
      const ap = p.ss[0], avg = ap ? p.ss[3] / ap : 0;
      if (p.pot < p.o) p.pot = Math.round(p.o);
      p.car[0] += ap; p.car[1] += p.ss[1]; p.car[2] += p.ss[2]; if (ap + p.ss[9] > 0) { p.hs.unshift([S.season, p._lc !== undefined ? p._lc : p.c, ap, p.ss[1], p.ss[2], Math.round(p.ss[5] * 10) / 10, Math.round(p.ss[6] * 10) / 10, Math.round(avg * 100) / 100, p.ss[4], p.ss[8], p.ss[7], p.ss[9], Math.round(p.o), Math.round(p.ss[10]), Math.round(p.ss[11]), Math.round(p.ss[12]), Math.round(p.ss[13]), Math.round(p.ss[14]), Math.round(p.ss[15])]); while (p.hs.length > 4) hoAdd(p, p.hs.pop()); } p.ss = SS0();
      delete p._lc; delete p.fs; p.pd = 0; p.kn = 0; p.sus = 0; p.yc = 0; p.sh = p.c === S.user ? 62 : 76; if (p.ht) p.ht = Math.max(0, p.ht - 2); p.a++; p.fi = 100; p.inj = 0; p.fm *= 0.3; p._pl = -9; if (p.y && p.a > 21) delete p.y;
      const ra = p.p === 0 ? 36 : 34;
      if (p.c < 0) { p.idle++; p.o = Math.max(30, p.o - 0.8); if ((p.a >= 33 && p.idle >= 1) || p.idle >= 3 || p.a >= 37) { retired.push(p); continue; } }
      else {
        if (S.retS === S.season ? p.ret === 1 : (p.a >= ra && rnd() < (p.a - ra + 1) * 0.22)) { if (p.c === S.user) msg(p.n + ' has retired.', 'ct'); S.gone.push([p.n, p.c, 'r', Math.round(p.o), p.a, p.car[0]]); retired.push(p); continue; }
        p.cy--;
        if (p.cy <= 0) {
          if (p.c === S.user) { if (S.opts.autoRenew && p.mo >= 25 && p.o >= u.rep - 9 && wageBill(S.user) - p.w + renewDemand(p) <= u.wb) { p.w = renewDemand(p); p.cy = p.a >= 31 ? 1 : 3; autoRen.push(p.n); } else { msg(p.n + ' leaves at the end of his contract.', 'ct'); S.gone.push([p.n, S.user, 'c', Math.round(p.o), p.a, 0]); movePlayer(p, -1, 0); } }
          else if (rnd() < (S.C[p.c].sq.indexOf(p) < 14 ? 0.985 : p.a >= 32 ? 0.55 : 0.8)) { p.cy = ri(1, 4); p.w = Math.max(p.w, wage(p)); } else movePlayer(p, -1, 0);
        }
      }
      p.w = p.c >= 0 ? p.w : wage(p);
    }
    if (autoRen.length) msg('Contracts renewed automatically: ' + autoRen.join(', ') + '. Switch this off in Office, Settings to handle renewals yourself.', 'ct');
    for (const p of retired) { if (p.c >= 0) { const s = S.C[p.c].sq; s.splice(s.indexOf(p), 1); } p.c = -2; }
    S.P = S.P.filter(p => p.c >= -1 || p.car[0] > 300); // keep a few long-career names; drop the rest
    for (const p of S.P) { delete p.ret; delete p.retT; }
    S.season++; S.neg = {}; S.rn = {}; S.offers = []; S.pend = []; S.rum = []; S.loffers = []; S.yrep = []; S.ln = {}; S.bb = (S.bb || []).filter(b => b.s >= S.season); S.reports = S.reports.filter(r => { const q = X.PM.get(r.pid); return q && q.c >= -1 && q.c !== S.user; }).slice(0, 40); S.short = S.short.filter(id => { const q = X.PM.get(id); return q && q.c >= -1 && q.c !== S.user; });
    rebuild();
    // youth intake, squad trimming, budgets
    S.C.forEach((c, ci) => {
      c.rep = calcRep(c);
      if (c.l < 0 && !c.eu) return;
      if (ci === S.user) acadSeason(); else for (let i = 0; i < 2; i++) { if (c.sq.length < 38) youth(ci); }
      if (ci !== S.user) { while (c.sq.length > 32) { let wi = c.sq.length - 1; movePlayer(c.sq[wi], -1, 0); } let tv = 0; for (let i = 0; i < Math.min(18, c.sq.length); i++) tv += value(c.sq[i]); c.bal = Math.min(Math.max(c.bal * 0.6, 0) + tv * 0.05, (c.l >= 0 ? S.L[c.l].m : 3) * 4e6 + tv * 0.12); }
      c.eq = q[0].indexOf(ci) >= 0 ? 1.15 : q[1].indexOf(ci) >= 0 || q[2].indexOf(ci) >= 0 ? 1.06 : 1;
    });
    leagueWages();
    S.C.forEach((c, ci) => { if (c.l < 0) { c.wb = Math.round(wageBill(ci) * 1.1); return; } const L = S.L[c.l], n = L.teams.length, pos = Math.min(c.lp || n, n); c.wb = Math.round(Math.max(wageBill(ci) * 1.05, L.aw * (1.2 - 0.5 * (pos - 1) / (n - 1)) * (c.eq || 1))); });
    setupSeason(q); setBoard(); refreshPools(); makePre(); S.dn = 0; seasonIncome();
    news('SEASON', 'The ' + (S.season - 1) + '/' + String(S.season).slice(2) + ' season is over', 'Champions crowned: ' + sum.leagues.filter(x => S.L[x[0]].t === 1).slice(0, 6).map(x => S.C[x[1]].n + ' (' + S.L[x[0]].n + ')').join(', ') + '. ' + sum.eu.filter(x => x[1] >= 0).map(x => S.C[x[1]].n + ' lift the ' + x[0]).join('; ') + '. The summer window is open and the phones are already ringing.', sum.eu[0] ? sum.eu[0][1] : -1);
    { const g = S.gone || [], mine = g.filter(x => x[1] === S.user), legends = g.filter(x => x[2] === 'r' && x[1] !== S.user && x[3] >= 82).sort((a, b) => b[3] - a[3]).slice(0, 4);
      if (mine.length) newsM('FAREWELL', mine.length === 1 ? mine[0][0] + ' leaves ' + u.n : mine.length + ' players leave ' + u.n, mine.map(x => x[0] + (x[2] === 'r' ? ' retires' : ' leaves at the end of his contract')).join('. ') + '.', S.user);
      if (legends.length) newsM('RETIRED', legends.length === 1 ? legends[0][0] + ' retires' : 'End of an era: ' + legends.map(x => x[0]).join(', ') + ' retire', legends.map(x => x[0] + ' (' + x[4] + ') calls time on his career' + (x[5] > 300 ? ' after ' + x[5] + ' club appearances' : '')).join('. ') + '.', legends[0][1]);  delete S.gone; }
    for (const p of u.sq) if (p.role === undefined) p.role = p.y ? 4 : expRole(p, S.user);
    seasonWrap(rec, sum);
    S.last = sum; S.review = 1;
    return sum;
  }
  function leagueWages() { S.L.forEach(L => { let t = 0; for (const ci of L.teams) t += wageBill(ci); L.aw = t / Math.max(1, L.teams.length); }); }
  const GOALS = { cl: 'Win the Champions League', top: 'Win the top division', promo: 'Reach the top division', treble: 'Win the league, cup and Champions League in one season', unbeaten: 'Go a whole league season unbeaten', cup: 'Win the domestic cup', none: 'No finish line: play by the rules for as long as you like' };
  function ord(n) { return n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'); }
  function startChallenge(def) { if (S.ch && !S.ch.done && !S.ch.fail) S.chLog.push({ name: S.ch.name, start: S.ch.start, end: S.season, res: 'Abandoned' }); S.ch = { id: def.id || 'custom', name: def.name, rules: def.rules || {}, goal: def.goal || 'none', limit: +def.limit || 0, start: S.season, done: 0, fail: 0 }; msg('Objective started: ' + def.name + '.', 'win'); }
  function dropChallenge() { if (S.ch) { if (!S.ch.done && !S.ch.fail) S.chLog.push({ name: S.ch.name, start: S.ch.start, end: S.season, res: 'Abandoned' }); S.ch = null; } }
  function checkGoal(rec, sum) {
    const c = S.ch; if (!c || c.done || c.fail) return; let ok = false; const g = c.goal;
    if (g === 'cl') ok = rec.tro.indexOf('Champions League') >= 0;
    else if (g === 'top') ok = rec.tier === 1 && rec.pos === 1;
    else if (g === 'promo') ok = S.L[S.C[S.user].l].t === 1;
    else if (g === 'treble') ok = rec.tier === 1 && rec.pos === 1 && rec.cupW && rec.tro.indexOf('Champions League') >= 0;
    else if (g === 'unbeaten') ok = rec.l === 0;
    else if (g === 'cup') ok = !!rec.cupW;
    const n = rec.s - c.start + 1;
    if (ok) { c.done = rec.s; sum.goal = c.name; S.chLog.push({ name: c.name, start: c.start, end: rec.s, res: 'Completed' }); msg('Objective complete: ' + c.name + ', in ' + n + ' season' + (n > 1 ? 's' : '') + '.', 'win'); }
    else if (c.limit && n >= c.limit) { c.fail = rec.s; sum.fail = c.name; S.chLog.push({ name: c.name, start: c.start, end: rec.s, res: 'Failed' }); msg('Objective failed: ' + c.name + '. The ' + c.limit + '-season deadline has passed.', 'ev'); }
  }
  function setBoard() {
    const u = S.C[S.user], L = S.L[u.l], n = L.teams.length, z = zones(u.l);
    const r = L.teams.slice().sort((a, b) => S.C[b].rep - S.C[a].rep).indexOf(S.user) + 1; let pos, txt;
    const safe = n - Math.max(1, z.down);
    if (r === 1) { pos = 1; txt = 'Win the ' + L.n; }
    else if (r >= safe - 1) { pos = safe; txt = z.down ? 'Avoid relegation' : 'Avoid finishing bottom'; }
    else if (z.up && r <= z.up + 1) { pos = z.up; txt = 'Win promotion'; }
    else { pos = Math.min(safe, r + 2); txt = 'Finish ' + ord(pos) + ' or higher'; }
    const b = { pos, txt, cup: -1, cupTxt: '' };
    const cup = S.cups.find(c => c.c === L.c);
    if (cup) { const all = []; S.C.forEach((c, i) => { if (c.l >= 0 && S.L[c.l].c === L.c) all.push(i); }); const rc = all.sort((x, y) => S.C[y].rep - S.C[x].rep).indexOf(S.user) + 1;
      if (rc <= 4) { b.cup = cup.rounds - 2; b.cupTxt = 'Reach the ' + cup.n + ' semi-finals'; } else if (rc <= 12) { b.cup = cup.rounds - 3; b.cupTxt = 'Reach the ' + cup.n + ' quarter-finals'; } else { b.cup = Math.min(2, cup.rounds - 3); b.cupTxt = 'Reach round ' + (b.cup + 1) + ' of the ' + cup.n; } }
    S.board = b;
  }
  function boardEval(rec, cup, relegated) {
    const b = S.board, out = []; if (!b) return out; let d = 0;
    const ok = rec.pos <= b.pos || (b.txt === 'Win promotion' && rec.mv === 'Promoted'); out.push([b.txt, ok]); d += ok ? (rec.pos <= b.pos - 3 || rec.pos === 1 ? 12 : 8) : (relegated ? -16 : rec.pos > b.pos + 4 ? -12 : -7);
    if (b.cup >= 0 && cup) { const o = cup.out[S.user], k = o !== undefined && o >= b.cup; out.push([b.cupTxt, k]); d += k ? 3 : -3; }
    const fin = wageBill(S.user) <= S.C[S.user].wb * 1.05; out.push(['Keep the wage bill within budget', fin]); d += fin ? 2 : -5;
    if (S.vow) { d += ok ? 3 : -4; S.vow = 0; }
    S.mr = clamp(S.mr + d, 0, 100); return out;
  }

  // ---------- new game ----------
  function newGame(data, o) {
    D = data; o = o || {};
    S = { v: 7, ach: {}, achNew: [], spot: [], flash: [], nsack: 0, nprom: 0, dc: null, over: null, lv: 0, po: [], acad: [], rec: {}, story: [], jobs: [], intl: [], fired: null, sack: null, emb: 0, mrf: 0, ln: {}, news: [], rum: [], loffers: [], bb: [], reports: [], yrep: [], scouts: [], scoutPool: [], staffPool: [], lout: [], pre: [], prei: 0, dn: 0, mg: { n: o.manager || 'Manager', p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }, rs: (o.seed | 0) || 12345, season: 2026, start: 2026, t: 0, user: o.club, nid: 900000, inbox: [], hist: [], champs: [], trophies: [], tlog: [], neg: {}, offers: [], pend: [], um: [],
      ch: null, chLog: [], rn: {}, debt: [], cred: [], short: [], mr: 60, board: null, arch: [], fin: FIN0(), finH: [], mid: 1, dd: 0, ddk: -1, opts: { autoRenew: o.autoRenew !== false, diff: o.diff === undefined ? 1 : +o.diff, iron: o.iron ? 1 : 0 }, P: [], C: [], L: [] };
    S.L = data.leagues.map(l => ({ n: l.n, c: l.c, t: l.t, m: l.m, teams: [] }));
    S.C = data.clubs.map(c => ({ n: c[0], l: c[1], ctry: c[2], eu: c[3], k1: c[4], k2: c[5], f: '4-3-3', bal: 0, wb: 0, rep: 50, auto: 1, xi: null }));
    S.P = data.players.map(mkPlayer);
    { const pr = S.P.filter(p => p.a >= 24 && p.a <= 29 && p.c >= 0).map(p => p.o).sort((a, b) => a - b); S.pd = []; for (let i = 0; i <= 100; i++) S.pd.push(pr[Math.min(pr.length - 1, Math.floor(i / 100 * (pr.length - 1)))]); S.pd[100] = pr[pr.length - 1] + 1; S.tune = 1.0; }
    // the ratings database lists no unattached players, so the deepest reserves start as free agents
    { const by = {}; for (const p of S.P) if (p.c >= 0) (by[p.c] = by[p.c] || []).push(p); for (const ci in by) { if (S.C[ci].l < 0) continue; const l = by[ci].sort((a, b) => b.o - a.o); for (let i = 26; i < l.length; i++) { const p = l[i]; if (p.a >= 23 && l.length - (i - 26) > 24) { p.c = -1; p.cy = 0; } } } }
    rebuild();
    // optional: start the user's club in another division of the same country
    const u = S.C[S.user];
    if (o.startLeague !== undefined && o.startLeague !== null && o.startLeague !== u.l && u.l >= 0) {
      const tl = o.startLeague, lower = S.L[tl].t > S.L[u.l].t; let cand = -1, cv = lower ? -1 : 1e9;
      S.C.forEach((c, ci) => { if (c.l !== tl) return; const r = calcRep(c); if (lower ? r > cv : r < cv) { cv = r; cand = ci; } });
      if (cand >= 0) { S.C[cand].l = u.l; u.l = tl; S.swap = [cand, tl]; }
    }
    S.C.forEach((c, ci) => { if (c.l >= 0) S.L[c.l].teams.push(ci); c.rep = calcRep(c); });
    S.C.forEach((c, ci) => { let tv = 0; for (let i = 0; i < Math.min(18, c.sq.length); i++) tv += value(c.sq[i]); c.bal = Math.round(tv * 0.1 / 10000) * 10000; });
    // first season: seed Europe from squad strength
    const order = S.L.map(L => L.teams.slice().sort((a, b) => S.C[b].rep - S.C[a].rep));
    const q = qualify(order, null);
    if (o.scn === 'ded') { const ul = S.C[S.user].l; S.L[ul].nded = {}; S.L[ul].nded[S.user] = 12; }
    setupSeason(q); initStaff(); refreshPools();
    leagueWages(); bestFormation(S.user);
    S.C.forEach((c, ci) => { c.wb = Math.round(Math.max(wageBill(ci) * 1.2, c.l >= 0 ? S.L[c.l].aw * 0.6 : 0)); });
    if (S.swap) { const c = S.C[S.user]; c.wb = Math.round(Math.max(wageBill(S.user) * 1.2, S.L[c.l].aw)); let tv = 0; for (const ci of S.L[c.l].teams) tv += S.C[ci].bal; c.bal = Math.round(Math.min(c.bal, tv / S.L[c.l].teams.length * 1.5) / 10000) * 10000; }
    for (const p of S.C[S.user].sq) p.role = expRole(p, S.user);
    S.dmin = S.opts.diff; S.cid = o.cid || ('c' + (S.rs >>> 0).toString(36));
    setBoard(); if (o.scn && o.scn !== 'std' && o.scn !== 'ded') applyScenario(o.scn); else S.scn = o.scn || 'std'; makePre(); initInc(); if (S.scn === 'youth') S.inc.fac.acd = 3; acadIntake(S.scn === 'youth' ? 14 : 8); for (const y of S.acad) { y.a = ri(15, 17); } story('Took charge of ' + S.C[S.user].n + ' in the ' + S.L[S.C[S.user].l].n + '.'); { const sq = S.C[S.user].sq; let cp = null; for (const p of sq) { p.sh = 62; p.sk = 1; if (!cp || p.a * 2 + p.o > cp.a * 2 + cp.o) cp = p; } if (cp) S.C[S.user].cap = cp.id; }
    msg('Welcome to ' + S.C[S.user].n + '. The board wants you to: ' + S.board.txt.toLowerCase() + '. The summer transfer window is open until the end of August.', 'info');
    return S;
  }


  // ---------- news wire ----------
  const INSIDER = { n: 'Dario Vance', h: '@VanceOnTheWire' };
  function news(tag, h, b, ci, pid) { S.news.unshift({ id: S.mid++, s: S.season, t: S.t, d: S.dn || 0, tag, h, b, ci: ci === undefined ? -1 : ci, pid: pid || 0 }); if (S.news.length > 260) S.news.length = 260; }
  function dealNews(p, from, to, fee, w, yrs) {
    const T = S.C[to].n, F = from >= 0 ? S.C[from].n : null, v = value(p), big = fee >= 60e6;
    const l1 = F ? pick([p.n + ' to ' + T + ', DONE DEAL. ', 'It is sealed: ' + p.n + ' joins ' + T + '. ', 'All signed. ' + p.n + ' is a ' + T + ' player. ', 'Confirmed: ' + T + ' have their man. ' + p.n + ' has put pen to paper. ']) : pick([p.n + ' signs for ' + T + ' as a free agent. ', 'Free agent ' + p.n + ' has found his next club: ' + T + '. ']);
    const l2 = F ? (fee > 0 ? 'Fee agreed with ' + F + ' at ' + money(fee) + (fee > v * 1.3 ? ', well above the ' + money(v) + ' the market had him at' : fee < v * 0.8 ? ', a bargain against a ' + money(v) + ' valuation' : '') + '. ' : 'No fee involved. ') : 'No fee, so the money goes into the contract. ';
    const l3 = 'Contract until June ' + (S.season + yrs + (S.t >= 0 ? 0 : 0)) + ' on about ' + money(w) + ' a week. ';
    const l4 = pick(['Medical passed this morning and the paperwork went through an hour ago.', 'He flew in last night and has already seen the training ground.', 'The player pushed for this move from the very first call.', 'It took ' + ri(2, 9) + ' days from first contact to signature.', big ? 'One of the biggest deals of the window.' : 'Smart business, done quietly.', 'His agent was in the building until late last night finishing the details.']);
    const rank = S.C[to].sq.indexOf(p), l5 = rank === 0 ? ' He arrives as the best player in the squad.' : rank > 0 && rank < 5 ? ' He goes straight into the first eleven.' : p.a <= 20 ? ' One for the future, but they rate him very highly.' : '';
    news('DONE DEAL', p.n + ' joins ' + T + (fee ? ' for ' + money(fee) : ' on a free'), l1 + l2 + l3 + l4 + l5, to, p.id);
  }
  function aiDeal(p, ci, fee, w, yrs) {
    const from = p.c; movePlayer(p, ci, fee, w, yrs);
    const ul = S.C[S.user].l, near = (S.C[ci].l === ul || (from >= 0 && S.C[from].l === ul)) && p.o >= S.C[S.user].rep - 1;
    if ((fee >= 30e6 || p.o >= 85 || (from < 0 && p.o >= 80) || near) && (X.nc = (X.nc || 0) + 1) <= 3) dealNews(p, from, ci, fee, w, yrs);
  }
  function rumourTick() {
    const keep = [], u = S.C[S.user];
    for (const r of S.rum) {
      const p = X.PM.get(r.pid), c = S.C[r.ci]; if (!p || p.c < 0 || p.c === r.ci || p.loan || c.sq.length >= 33) continue;
      const own = S.C[p.c].n; r.n = (r.n || 0) + 1;
      if (p.c === S.user) {
        if (!S.offers.some(o => o.pid === p.id) && u.sq.length > 16) { const fee = Math.round(xtv(p) * (1 + rnd() * 0.3) / 1000) * 1000; if (fee <= c.bal) { S.offers.push({ pid: p.id, ci: r.ci, fee, max: Math.round(fee * (1.1 + rnd() * 0.3) / 1000) * 1000, ten: 0, cl: 0, yrs: fee > 4e6 && rnd() < 0.3 ? 2 : 1, exp: S.t + 5 }); msg(c.n + ' have followed up their interest with a ' + money(fee) + ' bid for ' + p.n + '. Respond in the Transfer Hub.', 'tr'); news('BID', c.n + ' table ' + money(fee) + ' for ' + p.n, 'The interest was real. ' + c.n + ' have sent a formal offer of ' + money(fee) + ' to ' + u.n + ' for ' + p.n + '. ' + u.n + ' have not replied yet. The player is aware and is waiting to see what his club does.', r.ci, p.id); } }
        continue;
      }
      const fee = asking(p), x = rnd();
      if (x < 0.45 && fee <= c.bal * 0.85 && !willing(p, r.ci) && S.C[p.c].sq.length > 18) aiDeal(p, r.ci, fee, demand(p, r.ci), ri(3, 5));
      else if (x < 0.65 || r.n >= 3) news('TALKS OFF', c.n + ' end interest in ' + p.n, pick(['No deal. ' + c.n + ' have walked away from ' + p.n + ' after ' + own + ' refused to move on a ' + money(fee) + ' valuation. ', c.n + ' have cooled on ' + p.n + '. The numbers ' + own + ' wanted were never going to work. ']) + pick(['They will look at other targets.', 'One to revisit next window, perhaps.', 'The player stays put, for now.']), r.ci, p.id);
      else { p.ht = (p.ht || 0) + 1; news('BID REJECTED', own + ' turn down ' + c.n + ' for ' + p.n, own + ' have rejected an offer of around ' + money(Math.round(fee * 0.8 / 1e5) * 1e5) + ' from ' + c.n + ' for ' + p.n + '. They want closer to ' + money(fee) + '. ' + c.n + ' are preparing a second bid and the player is keen on the move.', r.ci, p.id); keep.push(r); }
    }
    S.rum = keep;
    if (S.rum.length >= 4 || rnd() > 0.6) return;
    const rich = S.C.map((c, i) => i).filter(i => i !== S.user && S.C[i].sq.length >= 14 && S.C[i].sq.length < 33).sort((x, y) => S.C[y].bal - S.C[x].bal).slice(0, 40), ci = pick(rich), c = S.C[ci];
    const x = pickXI(ci); let wk = 1, wv = 1e9; for (let k = 1; k < 11; k++) if (x.r[k] < wv) { wv = x.r[k]; wk = k; }
    const pool = X.byPos[x.slots[wk]], a = att(ci);
    for (let i = 0, tries = 0; i < pool.length && tries < 60; i++) {
      const p = pool[i]; if (p.o < wv + 2) break; if (p.o > a + 8) continue; tries++;
      if (p.c < 0 || p.c === ci || p.loan || p.inj || p.a > 30 || p.j === S.season || S.rum.some(r => r.pid === p.id) || rnd() < 0.7) continue;
      if (asking(p) > c.bal || willing(p, ci) || (p.c === S.user && isRival(ci))) continue;
      S.rum.push({ pid: p.id, ci, n: 0 }); p.ht = (p.ht || 0) + 1; const own = S.C[p.c].n;
      news('RUMOUR', c.n + ' want ' + p.n, pick(['One to watch. ', 'Hearing this from two separate sources. ', 'This is moving. ']) + c.n + ' have made ' + p.n + ' (' + POS[p.p] + ', ' + p.a + ') their priority target and first contact with ' + own + ' has been made. ' + (p.c === S.user ? own + ' have told them he is not for sale, but a formal bid is expected within days.' : 'The asking price is in the region of ' + money(asking(p)) + '. ' + pick(['Personal terms should not be a problem.', 'The player is open to the move.', own + ' do not want to sell, but every player has a price.'])), ci, p.id);
      break;
    }
  }

  // ---------- loans ----------
  function loanMove(p, to, share, fee, opt) {
    const from = p.c, s = S.C[from].sq; s.splice(s.indexOf(p), 1); const c = S.C[to]; c.sq.push(p); c.sq.sort((a, b) => b.o - a.o);
    p.loan = { o: from, w: Math.round(p.w * share / 100) * 100, opt: opt || 0 }; p.c = to; p.tl = 0; p.ll = 0;
    if (fee) { c.bal -= fee; S.C[from].bal += fee; }
    if (from === S.user) (S.lout = S.lout || []).push(p.id);
    S.tlog.unshift({ s: S.season, t: S.t, p: p.id, n: p.n, f: from, to, fee: fee || 0, o: Math.round(p.o), a: p.a, loan: 1 }); if (S.tlog.length > 400) S.tlog.length = 400;
    S.offers = S.offers.filter(x => x.pid !== p.id); S.loffers = S.loffers.filter(x => x.pid !== p.id);
  }
  function returnLoans() {
    const touched = new Set();
    for (const p of S.P) {
      if (!p.loan) continue; const o = p.loan.o, at = p.c; p._lc = at;
      if (at >= 0) { const s = S.C[at].sq, i = s.indexOf(p); if (i >= 0) s.splice(i, 1); }
      if (at === S.user) { delete p.role; msg(p.n + ' has gone back to ' + S.C[o].n + ' at the end of his loan.', 'tr'); }
      else if (o === S.user) { msg(p.n + ' is back from his loan at ' + S.C[at].n + ': ' + p.ss[0] + ' starts, ' + p.ss[1] + ' goals, ' + p.ss[2] + ' assists' + (p.ss[0] ? ', average rating ' + (p.ss[3] / p.ss[0]).toFixed(2) : '') + '.', 'tr'); if (p.role === undefined) p.role = 3; }
      p.c = o; S.C[o].sq.push(p); touched.add(o); delete p.loan;
    }
    for (const ci of touched) S.C[ci].sq.sort((a, b) => b.o - a.o); S.lout = [];
  }
  function buyOption(pid) {
    const p = X.PM.get(pid), u = S.C[S.user]; if (!p || p.c !== S.user || !p.loan || !p.loan.opt) return { ok: false, msg: 'There is no option to buy.' };
    const fee = p.loan.opt, from = p.loan.o, rb = ruleBlock({ c: from, a: p.a, nat: p.nat, o: p.o }, fee); if (rb) return { ok: false, msg: rb };
    if (fee > u.bal - reserved()) return { ok: false, msg: 'You cannot afford the ' + money(fee) + ' option.' };
    if (wageBill(S.user) - p.loan.w + p.w + pendWages() > u.wb) return { ok: false, msg: 'His full wage would break your wage budget.' };
    u.bal -= fee; S.C[from].bal += fee; delete p.loan; p.cy = 3; p.j = S.season; S.fin.buy += fee;
    S.tlog.unshift({ s: S.season, t: S.t, p: p.id, n: p.n, f: from, to: S.user, fee, o: Math.round(p.o), a: p.a });
    msg('You have made the loan of ' + p.n + ' permanent for ' + money(fee) + '.', 'tr'); dealNews(p, from, S.user, fee, p.w, 3);
    return { ok: true, msg: p.n + ' is now your player.' };
  }
  function toggleLoanList(pid) { const p = X.PM.get(pid); if (p && p.c === S.user && !p.loan) p.ll = p.ll ? 0 : 1; return p ? p.ll : 0; }
  function loanOffers() {
    const u = S.C[S.user]; if (u.sq.length <= 16) return; const ua = att(S.user);
    for (const p of u.sq) {
      if (!p.ll || p.loan || p.inj > 3 || S.loffers.some(o => o.pid === p.id) || rnd() > 0.35) continue;
      for (let i = 0; i < 40; i++) {
        const ci = ri(0, S.C.length - 1), c = S.C[ci]; if (ci === S.user || c.l < 0 || c.sq.length < 14 || c.sq.length >= 34) continue;
        if (att(ci) > ua - 1 || p.o < c.sq[10].o - 1 || p.o > c.rep + 7) continue;
        const share = Math.round(clamp(0.5 + (c.rep - p.o + 6) * 0.05 + rnd() * 0.2, 0.3, 1) * 20) / 20;
        S.loffers.push({ pid: p.id, ci, share, fee: Math.round(value(p) * 0.02 / 1e4) * 1e4, exp: S.t + 5 });
        msg(c.n + ' (' + S.L[c.l].n + ') want ' + p.n + ' on loan until the end of the season. They would pay ' + Math.round(share * 100) + '% of his wages. Respond in the Transfer Hub.', 'tr'); break;
      }
    }
  }
  function answerLoan(pid, ci, acc) {
    const i = S.loffers.findIndex(o => o.pid === pid && o.ci === ci); if (i < 0) return { ok: false, msg: 'That loan offer has expired.' }; const o = S.loffers[i], p = X.PM.get(pid);
    S.loffers.splice(i, 1); if (!acc) return { ok: true, msg: 'Loan offer rejected.' };
    if (!windowOpen()) return { ok: false, msg: 'The transfer window is closed.' };
    if (!p || p.c !== S.user || p.loan) return { ok: false, msg: 'He is no longer available.' };
    if (S.C[S.user].sq.length <= 16) return { ok: false, msg: 'You need at least 16 players.' };
    loanMove(p, ci, o.share, o.fee); msg(p.n + ' has joined ' + S.C[ci].n + ' on loan until the end of the season.', 'tr');
    return { ok: true, msg: p.n + ' has gone to ' + S.C[ci].n + ' on loan.' };
  }

  // ---------- staff and scouts ----------
  function staffWageOf(lv) { return Math.max(200, Math.round(wage({ o: S.C[S.user].rep, a: 25 }) * (0.08 + 0.1 * lv) / 100) * 100); }
  function staffName() { const nm = names(), ks = Object.keys(nm), e = nm[pick(ks)]; return pick(e[0]) + ' ' + pick(e[1]); }
  function mkStaff(k, lv) { return { n: staffName(), k, lv, w: staffWageOf(lv), sty: ri(0, 3) }; }
  function mkScout(lv) { return { n: staffName(), lv, w: Math.max(200, Math.round(staffWageOf(lv) * 0.6 / 100) * 100), task: null, left: 0 }; }
  function maxStaffLv() { return clamp(Math.round((S.C[S.user].rep - 52) / 6), 1, 5); }
  function initStaff() { const b = clamp(Math.round((S.C[S.user].rep - 60) / 7), 1, 4); S.staff = {}; for (const k in DEPT) S.staff[k] = mkStaff(k, k === 'fit' || k === 'med' ? 2 : b); S.scouts = [mkScout(clamp(b, 1, 3))]; }
  function staffWages() { let t = 0; for (const k in S.staff) if (S.staff[k]) t += S.staff[k].w; for (const s of S.scouts || []) t += s.w; return t; }
  function refreshPools() {
    const mx = maxStaffLv(), ks = Object.keys(DEPT); S.staffPool = [];
    for (let i = 0; i < 9; i++) S.staffPool.push(mkStaff(i < 6 ? ks[i] : pick(ks), clamp(mx - ri(0, 2) + (rnd() < 0.12 ? 1 : 0), 1, 5)));
    S.scoutPool = []; for (let i = 0; i < 4; i++) S.scoutPool.push(mkScout(clamp(mx - ri(0, 2), 1, 5)));
  }
  function hireCoach(i) {
    const s = S.staffPool[i]; if (!s) return { ok: false, msg: 'He has taken another job.' }; const u = S.C[S.user], old = S.staff[s.k], comp = old ? old.w * 8 : 0;
    if (wageBill(S.user) + pendWages() - (old ? old.w : 0) + s.w > u.wb) return { ok: false, msg: 'His wage would break your wage budget.' };
    if (comp > u.bal - reserved()) return { ok: false, msg: 'You cannot afford the ' + money(comp) + ' pay-off for ' + old.n + '.' };
    u.bal -= comp; S.staff[s.k] = s; S.staffPool.splice(i, 1);
    msg(s.n + ' joins as ' + DEPT[s.k].toLowerCase() + ' (level ' + s.lv + ').' + (old ? ' ' + old.n + ' leaves with a ' + money(comp) + ' pay-off.' : ''), 'ev'); return { ok: true, msg: s.n + ' hired.' };
  }
  function hireScout(i) { const s = S.scoutPool[i]; if (!s) return { ok: false, msg: 'He has taken another job.' }; if (S.scouts.length >= 3) return { ok: false, msg: 'You can employ three scouts at most. Release one first.' }; if (wageBill(S.user) + pendWages() + s.w > S.C[S.user].wb) return { ok: false, msg: 'His wage would break your wage budget.' }; S.scouts.push(s); S.scoutPool.splice(i, 1); return { ok: true, msg: s.n + ' hired as a scout.' }; }
  function fireScout(i) { const s = S.scouts[i]; if (!s) return { ok: false, msg: 'No such scout.' }; S.scouts.splice(i, 1); return { ok: true, msg: s.n + ' released.' }; }
  function scoutTime(s, type) { return type === 'youth' ? 10 - s.lv : Math.max(2, 7 - s.lv); }
  function setScoutTask(i, T) {
    const s = S.scouts[i]; if (!s) return { ok: false, msg: 'No such scout.' };
    if (!T) { s.task = null; s.left = 0; return { ok: true, msg: s.n + ' is back at base.' }; }
    s.task = { type: T.type === 'youth' ? 'youth' : 'pro', ctry: T.ctry || '', pos: T.pos === undefined || T.pos === '' ? -1 : +T.pos, maxAge: +T.maxAge || 40, maxVal: +T.maxVal || 0, focus: T.focus === 'pot' ? 'pot' : 'now', loan: T.loan ? 1 : 0 };
    s.left = scoutTime(s, s.task.type); return { ok: true, msg: s.n + ' is on the road. First report in about ' + Math.ceil(s.left / 2) + ' week' + (s.left > 2 ? 's' : '') + '.' };
  }
  function scoutTick() { for (const s of S.scouts || []) { if (!s.task) continue; if (--s.left > 0) continue; s.left = scoutTime(s, s.task.type); if (s.task.type === 'youth') youthReport(s); else proReport(s); } }
  function posOk(p, tp) { return tp < 0 || (tp >= 100 ? LINE[p.p] === tp - 100 : p.p === tp || p.al.indexOf(tp) >= 0); }
  function proReport(s) {
    const T = s.task, u = S.user, seen = new Set(S.reports.map(r => r.pid)), c = [], ur = S.C[u].rep;
    for (const p of S.P) {
      if (p.c < -1 || p.c === u || p.loan || p.a > T.maxAge || seen.has(p.id) || !posOk(p, T.pos)) continue;
      if (p.o > ur + 9 || p.o < ur - 14) continue;
      if (T.ctry && (p.c < 0 || S.C[p.c].ctry !== T.ctry)) continue;
      if (T.maxVal && p.c >= 0 && xtv(p) > T.maxVal) continue;
      if (T.loan ? !loanable(p) : willing(p, u)) continue;
      if (ruleBlock(p, 0)) continue;
      c.push([(T.focus === 'pot' ? p.pot * 0.75 + p.o * 0.25 : p.o + (p.pot - p.o) * 0.1) + gauss() * (5.5 - s.lv), p]);
    }
    c.sort((a, b) => b[0] - a[0]); const n = Math.min(c.length, 2 + s.lv), found = [];
    for (let i = 0; i < n; i++) { const p = c[i][1]; p.sk = 1; spot(p); S.reports.unshift({ pid: p.id, s: S.season, t: S.t, by: s.n }); found.push(p); }
    if (S.reports.length > 80) S.reports.length = 80;
    mail(s.n + ' (scout)', found.length ? 'Scouting report: ' + found.length + ' player' + (found.length > 1 ? 's' : '') + ' found' : 'Scouting report: nothing new', found.length ? 'I have finished this round. ' + found.slice(0, 6).map(p => p.n + ' (' + POS[p.p] + ', ' + p.a + ', ' + Math.round(p.o) + ' now, ' + p.pot + ' potential, ' + (p.c >= 0 ? S.C[p.c].n : 'free agent') + ')').join('; ') + '. The full reports are in Transfers, Scouting. I will keep looking unless you change my instructions.' : 'Nobody new fits those instructions. Widen the search (age, value or region) and I will go again.');
  }
  function youthReport(s) {
    const T = s.task, nm = names(); if (S.yrep.length >= 12) { mail(s.n + ' (scout)', 'Youth list is full', 'There are already twelve youngsters waiting for your decision in Transfers, Scouting. Sign or reject some and I will bring you more.'); return; }
    const n = rnd() < 0.2 + s.lv * 0.08 ? 2 : 1, found = [];
    for (let i = 0; i < n; i++) {
      const q = rnd() * 100, j = Math.floor(q), pd = S.pd; let pot = pd[j] + (pd[Math.min(100, j + 1)] - pd[j]) * (q - j);
      pot = clamp(67.5 + (pot - 67.5) * 0.85 + (S.C[S.user].rep - (S.mrep || 69)) * 0.3 + s.lv * 1.1 + S.tune, 50, 92);
      const gap = Math.min(26, 10 + Math.abs(gauss()) * 6), a = ri(15, 17), LP = [[0], [1, 1, 2, 3], [4, 5, 5, 6, 7, 8], [9, 10, 11, 11]];
      const pos = T.pos >= 100 ? pick(LP[T.pos - 100]) : T.pos >= 0 ? T.pos : pick([0, 1, 1, 1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 11]);
      let nat; if (T.ctry) { const cl = []; S.C.forEach((c, ci) => { if (c.ctry === T.ctry && c.sq.length) cl.push(ci); }); nat = cl.length ? pick(S.C[pick(cl)].sq).nat : pick(S.P).nat; } else nat = rnd() < 0.7 ? pick(S.C[S.user].sq).nat : pick(S.P).nat;
      const e = nm[nat] || nm[pick(Object.keys(nm))], err = 6 - s.lv, y = { id: S.mid++, n: pick(e[0]) + ' ' + pick(e[1]), nat, a, p: pos, o: Math.round(Math.max(40, pot - gap)), pot: Math.round(pot), lo: Math.round(pot - ri(1, err)), hi: Math.min(94, Math.round(pot + ri(1, err))), by: s.n };
      S.yrep.push(y); found.push(y);
    }
    mail(s.n + ' (scout)', 'Youth scouting: ' + found.map(y => y.n).join(' and '), found.map(y => y.n + ' is a ' + y.a + '-year-old ' + POS[y.p] + ' from ' + D.nats[y.nat] + ', about ' + y.o + ' now. I think he ends up between ' + y.lo + ' and ' + y.hi + '.').join(' ') + ' You can sign ' + (found.length > 1 ? 'them' : 'him') + ' to the academy from Transfers, Scouting.');
  }
  function rejectYouth(id) { const i = S.yrep.findIndex(y => y.id === id); if (i >= 0) S.yrep.splice(i, 1); return { ok: true, msg: 'Removed from the list.' }; }
  function known(p) { return p.c === S.user || !!p.sk || (p.loan && p.loan.o === S.user); }

  // ---------- pre-season and team report ----------
  function makePre() {
    const u = S.C[S.user], all = []; S.C.forEach((c, i) => { if (i !== S.user && c.l >= 0 && c.sq.length >= 14) all.push(i); });
    const near = all.filter(i => Math.abs(S.C[i].rep - u.rep) < 3 && S.C[i].l !== u.l), weak = all.filter(i => S.C[i].rep < u.rep - 4 && S.C[i].rep > u.rep - 10), strong = all.filter(i => S.C[i].rep > u.rep + 3 && S.C[i].rep < u.rep + 9);
    const used = [], pk = a => { const l = a.filter(i => used.indexOf(i) < 0), x = l.length ? pick(l) : pick(all); used.push(x); return x; };
    S.pre = [pk(weak), pk(near), pk(strong), pk(near)].map((opp, i) => ({ opp, home: i % 2 === 0 ? 1 : 0, res: null })); S.prei = 0;
  }
  function playFriendly() {
    const f = S.pre[S.prei], h = f.home ? S.user : f.opp, a = f.home ? f.opp : S.user; ensureSquad(S.user);
    const x = simMatch(h, a, { fr: 1 }); x.comp = 'Pre-season friendly'; x.rd = 'Game ' + (S.prei + 1) + ' of ' + S.pre.length; x.t = 0; x.fr = 1; f.res = [x.gh, x.ga]; f.m = x; S.prei++;
    for (const p of S.C[f.opp].sq) { p.fi = 100; p._pl = -9; } for (const p of S.C[S.user].sq) { p.fi = Math.min(100, p.fi + 14); p._pl = -9; }
    if (S.prei >= S.pre.length) endPre();
    return { matches: [x], seasonEnd: null, pre: 1 };
  }
  function endPre() { for (const p of S.C[S.user].sq) p.fi = 100; preReport(); }
  function skipPre() { if (!S.pre || S.prei >= S.pre.length) return; const played = S.prei; S.prei = S.pre.length; for (const p of S.C[S.user].sq) p.fi = 100; if (played) preReport(); else msg('You skipped pre-season. The squad starts the season short of match sharpness.', 'ev'); }
  // what a set of instructions does against one opponent (oi) or a typical side in your league, next to Balanced: for the tactics screen
  function tacRead(t, oi) {
    const me = pickXI(S.user), u = S.C[S.user], L = S.L[u.l]; let O, oc = null;
    if (oi >= 0 && S.C[oi]) { O = pickXI(oi); oc = S.C[oi]; }
    else { O = { apace: 0, dpace: 0, mpas: 0, mdef: 0, sphy: 0 }; let n = 0; for (const ci of (L ? L.teams : [])) { if (ci === S.user) continue; const y = pickXI(ci); for (const k in O) O[k] += y[k]; n++; } for (const k in O) O[k] = n ? O[k] / n : 68; }
    const a = tacMod({ tac: t }, me, O, oc), b = tacMod({ tac: [0, 1, 1, 0, 1] }, me, O, oc);
    return { own: a[0] / b[0] - 1, opp: a[1] / b[1] - 1, fat: a[2] - 1, me: { dpace: me.dpace, apace: me.apace, mpas: me.mpas, mdef: me.mdef, sphy: me.sphy }, O: { apace: O.apace, dpace: O.dpace, mpas: O.mpas, mdef: O.mdef, sphy: O.sphy }, oc: oc ? oc.tac || [0, 1, 1, 0] : null };
  }
  function teamReport() {
    const u = S.C[S.user], L = S.L[u.l], x = pickXI(S.user), la = [0, 0, 0, 0], ln = [0, 0, 0, 0]; let pa = 0, pd = 0, pm = 0, av = 0, n = 0;
    for (const ci of L.teams) { if (ci === S.user) continue; const y = pickXI(ci); for (let k = 0; k < 11; k++) { const l = LINE[y.slots[k]]; la[l] += y.r[k]; ln[l]++; } pa += y.apace; pd += y.dpace; pm += y.mpas; av += y.avg; n++; }
    n = n || 1; const avg = la.map((v, i) => ln[i] ? v / ln[i] : 60), lg = { apace: pa / n, dpace: pd / n, mpas: pm / n, avg: av / n };
    const slots = x.pl.map((p, k) => { const sl = x.slots[k]; return { k, slot: sl, pid: p ? p.id : 0, r: x.r[k], lg: avg[LINE[sl]], d: x.r[k] - avg[LINE[sl]], depth: u.sq.filter(q => q !== p && !q.inj && x.pl.indexOf(q) < 0 && (q.p === sl || q.al.indexOf(sl) >= 0) && q.o >= (p ? p.o : 0) - 5).length }; });
    const tips = [], worst = slots.slice().sort((a, b) => a.d - b.d), best = worst[worst.length - 1];
    for (let i = 0; i < 2; i++) { const w = worst[i]; if (w && w.d < -0.8) tips.push(['Upgrade', POS[w.slot] + ' is ' + (i ? 'also ' : '') + 'below the league standard: your starter rates ' + Math.round(w.r) + ' against a league average of ' + Math.round(w.lg) + ' for that line.' + (w.depth ? '' : ' There is no real cover behind him either.')]); }
    if (best && best.d > 1.5) tips.push(['Strength', POS[best.slot] + ' is your strongest position, ' + best.d.toFixed(1) + ' above the league average.']);
    const thin = slots.filter(s => !s.depth && s.slot !== 0).map(s => POS[s.slot]); if (thin.length >= 2) tips.push(['Depth', 'No cover within five rating points at ' + thin.slice(0, 4).join(', ') + '. One injury there and the level drops sharply.']);
    if (x.dpace < lg.apace - 5) tips.push(['Defensive line', 'Your defenders are slow (pace ' + Math.round(x.dpace) + ') next to the forwards in this league (' + Math.round(lg.apace) + '). A high line will be punished. A mid or low block is safer.']); else if (x.dpace > lg.apace) tips.push(['Defensive line', 'Your back line (pace ' + Math.round(x.dpace) + ') is quick enough to hold a high line and squeeze the pitch.']);
    if (x.mpas > lg.mpas + 2.5) tips.push(['Build-up', 'Midfield passing (' + Math.round(x.mpas) + ') is well above the league (' + Math.round(lg.mpas) + '). Possession build-up suits this group.']); else if (x.mpas < lg.mpas - 2.5) tips.push(['Build-up', 'Midfield passing (' + Math.round(x.mpas) + ') is below the league (' + Math.round(lg.mpas) + '). Possession will cost you: go direct or counter.']);
    if (x.sphy >= 74) tips.push(['Build-up', 'Your forwards are quick and strong (' + Math.round(x.sphy) + '). Direct play gets the most out of them.']);
    if (x.avg < lg.avg - 1.5) tips.push(['Mentality', 'You are one of the weaker elevens in the division (' + x.avg.toFixed(1) + ' against ' + lg.avg.toFixed(1) + '). Counter-attack gives a bonus against stronger teams, and a defensive mentality keeps scores down.']); else if (x.avg > lg.avg + 2) tips.push(['Mentality', 'You are stronger than most of this league (' + x.avg.toFixed(1) + ' against ' + lg.avg.toFixed(1) + '). An attacking mentality turns that into more goals.']);
    let lo = null; for (const k of ['att', 'mid', 'def', 'gk']) if (!lo || staffLv(S.user, k) < staffLv(S.user, lo)) lo = k; if (S.staff && staffLv(S.user, lo) < maxStaffLv()) tips.push(['Staff', 'Your ' + DEPT[lo].toLowerCase() + ' is level ' + staffLv(S.user, lo) + '. The club can attract level ' + maxStaffLv() + '.']);
    return { slots, avg, lg, mine: { dpace: x.dpace, apace: x.apace, mpas: x.mpas, sphy: x.sphy, att: x.att, def: x.def, avg: x.avg }, tips };
  }
  function preReport() {
    const u = S.C[S.user], res = S.pre.filter(f => f.res).map(f => (f.home ? u.n + ' ' + f.res[0] + '-' + f.res[1] + ' ' + S.C[f.opp].n : S.C[f.opp].n + ' ' + f.res[0] + '-' + f.res[1] + ' ' + u.n)).join(', ');
    const pl = u.sq.filter(p => p.fs && p.fs[0] >= 2).sort((a, b) => b.fs[3] / b.fs[0] - a.fs[3] / a.fs[0]), top = pl.slice(0, 3), bot = pl.slice(-2).reverse(), r = teamReport();
    mail('Assistant manager', 'Pre-season report', 'Results: ' + res + '. ' + (top.length ? 'Best in the friendlies: ' + top.map(p => p.n + ' (' + (p.fs[3] / p.fs[0]).toFixed(2) + (p.fs[1] ? ', ' + p.fs[1] + ' goals' : '') + ')').join(', ') + '. ' : '') + (bot.length && pl.length > 5 ? 'Struggled: ' + bot.map(p => p.n + ' (' + POS[p.p] + ', ' + (p.fs[3] / p.fs[0]).toFixed(2) + ')').join(', ') + '. ' : '') + r.tips.slice(0, 3).map(t => t[1]).join(' ') + ' The full breakdown is in Squad, Tactics.');
  }

  // ---------- manager controls ----------
  function setTac(i, v) { const c = S.C[S.user]; if (!c.tac) c.tac = [0, 1, 1, 0]; const lim = [[-2, 2], [0, 2], [0, 2], [0, 3], [0, 2]][i]; while (c.tac.length < 5) c.tac.push(1); if (lim) c.tac[i] = clamp(Math.round(+v), lim[0], lim[1]); }
  function setTrain(v) { S.C[S.user].tr = clamp(Math.round(+v), 0, 2); }
  function setCaptain(pid) { S.C[S.user].cap = pid; }
  function setManager(n) { S.mg.n = String(n || 'Manager').slice(0, 30); }
  function budgetRange() { const u = S.C[S.user], min = Math.ceil((wageBill(S.user) + pendWages()) / 100) * 100, max = Math.floor((u.wb + Math.max(0, u.bal - reserved()) / 50) / 100) * 100; return { min: Math.min(min, u.wb), max: Math.max(max, u.wb), wb: u.wb, bal: u.bal, rate: 50 }; }
  function setWageBudget(v) { const u = S.C[S.user], r = budgetRange(); v = clamp(Math.round(+v / 100) * 100, r.min, r.max); u.bal -= (v - u.wb) * 50; u.wb = v; return { ok: true, wb: u.wb, bal: u.bal }; }


  // ---------- income: matchday, sponsors, merchandise, facilities, board requests ----------
  const SPN = ['Northwind Air', 'Kestrel Energy', 'Volt Mobile', 'Harbour Bank', 'Apex Tyres', 'Lumen Cloud', 'Redwood Insurance', 'Orbit Logistics', 'Solara Power', 'Pinnacle Motors', 'Bluefin Foods', 'Atlas Freight'];
  function FIN0() { return { buy: 0, sell: 0, prize: 0, gate: 0, spons: 0, merch: 0, board: 0, fac: 0 }; }
  function incBase() { const u = S.C[S.user]; let tv = 0; for (let i = 0; i < Math.min(18, u.sq.length); i++) tv += value(u.sq[i]); return Math.round(Math.max(tv * 0.04, S.L[u.l].m * 150000) / 1e4) * 1e4; }
  function sponsorOffers() {
    const I = S.inc, b = I.base * 0.35 * (1 + 0.2 * I.fac.com), r = v => Math.max(1000, Math.round(v / 1000) * 1000), nm = shuffle(SPN.slice());
    I.offers = [{ n: nm[0], k: 'Guaranteed', fix: r(b), win: 0, bon: 0, yrs: 3 }, { n: nm[1], k: 'Win bonus', fix: r(b * 0.5), win: r(b * 0.75 / 16), bon: 0, yrs: 2 }, { n: nm[2], k: 'Ambition', fix: r(b * 0.4), win: 0, bon: r(b * 1.6), yrs: 1 }];
  }
  function initInc() { S.inc = { base: 0, tp: 1, fac: { std: 0, com: 0, acd: 0, trn: 0 }, sp: null, offers: [], req: {} }; S.inc.base = incBase(); sponsorOffers(); mail('Commercial director', 'Shirt sponsor: three offers on the table', 'Three companies want their name on the shirt. One pays a guaranteed fee for three years, one pays less up front but adds a bonus for every league win, and one bets on you hitting the board\'s league target. Choose in Office, Commercial. If nothing is signed before the second league game I will take the guaranteed deal.'); }
  function signSponsor(i) { const I = S.inc, o = I.offers[i]; if (!o || I.sp) return { ok: false, msg: 'That offer is no longer available.' }; I.sp = o; I.offers = []; S.C[S.user].bal += o.fix; S.fin.spons += o.fix; return { ok: true, msg: o.n + ' signed. ' + money(o.fix) + ' paid into the budget.' }; }
  function seasonIncome() { const I = S.inc, u = S.C[S.user]; I.base = incBase(); I.req = {}; if (I.sp) { u.bal += I.sp.fix; S.fin.spons += I.sp.fix; msg(I.sp.n + ' pay this season\'s ' + money(I.sp.fix) + ' sponsorship fee.', 'info'); } else { sponsorOffers(); mail('Commercial director', 'Shirt sponsor: new offers', 'The shirt deal has run out and three new offers are in. They are sized to where the club is now, so a club on the rise does better on short deals. Choose in Office, Commercial.'); } }
  function gateIncome(m) {
    const I = S.inc, u = S.C[S.user], prev = S.um.slice(-6, -1); let pts = 0; for (const q of prev) pts += q.res === 'W' ? 3 : q.res === 'D' ? 1 : q.res ? 0 : 1.5;
    const form = prev.length ? pts / (prev.length * 3) : 0.5, eu = S.eu.some(E => E.n === m.comp), fill = clamp(0.62 + form * 0.3 + (I.tp === 0 ? 0.08 : I.tp === 2 ? -0.1 : 0) + (eu ? 0.06 : 0), 0.4, 1);
    const amt = Math.round(I.base * 0.45 / 23 * [0.8, 1, 1.25][I.tp] * fill / 0.8 * (1 + 0.25 * I.fac.std) * (eu ? 1.6 : 1) * (m.derby ? 1.3 : 1) / 100) * 100;
    u.bal += amt; S.fin.gate += amt; m.gate = amt; m.fill = Math.round(fill * 100);
  }
  function merchIncome() { const I = S.inc, u = S.C[S.user], lv = S.L[u.l].lvl || u.rep; let st = 0; for (const p of u.sq) if (p.o >= lv + 8) st++; const amt = Math.round(I.base * 0.2 / 11 * (1 + 0.2 * I.fac.com) * (1 + Math.min(5, st) * 0.1) / 100) * 100; u.bal += amt; S.fin.merch += amt; I.stars = Math.min(5, st); }
  function setTicket(v) { S.inc.tp = clamp(Math.round(+v), 0, 2); }
  function facCost(k) { const lv = S.inc.fac[k]; return lv >= 3 ? 0 : Math.round((lv + 1) * 0.5 * S.inc.base / 1e4) * 1e4; }
  function upgradeFac(k) { const I = S.inc, u = S.C[S.user]; if (I.fac[k] === undefined) return { ok: false, msg: 'Unknown facility.' }; if (I.fac[k] >= 3) return { ok: false, msg: 'Already at the top level.' }; const cost = facCost(k); if (cost > u.bal - reserved()) return { ok: false, msg: 'You cannot afford the ' + money(cost) + ' this would cost.' }; u.bal -= cost; S.fin.fac += cost; I.fac[k]++; return { ok: true, msg: 'Work complete. Now level ' + I.fac[k] + '.' }; }
  function boardOdds() { return clamp((S.mr - 30) / 50, 0.05, 0.9); }
  function boardRequest(kind) {
    const I = S.inc, u = S.C[S.user]; if (I.req[kind]) return { ok: false, msg: 'You have already asked this season. The board will not hear it again until the summer.' };
    I.req[kind] = 1; const ok = rnd() < boardOdds();
    if (!ok) { S.mr = clamp(S.mr - 2, 0, 100); mail('Club owner', 'Request refused', 'I have looked at the numbers and the answer is no. Results first, then we talk about more money. Asking has not helped your standing with the other directors.'); return { ok: false, msg: 'The board said no. Manager rating down 2.' }; }
    if (kind === 'tr') { const amt = Math.round(I.base * (0.5 + S.mr / 100) / 1e4) * 1e4; u.bal += amt; S.fin.board += amt; S.mr = clamp(S.mr - 4, 0, 100); mail('Club owner', 'Extra transfer funds approved', 'You have made your case and the board has released ' + money(amt) + ' for transfers. That is goodwill spent. We expect to see it on the pitch.'); return { ok: true, msg: money(amt) + ' added to the transfer budget. Manager rating down 4.' }; }
    const add = Math.round(u.wb * 0.07 / 100) * 100; u.wb += add; S.mr = clamp(S.mr - 3, 0, 100); mail('Club owner', 'Wage budget raised', 'The board has agreed to raise the wage budget by ' + money(add) + ' a week. Use it well.'); return { ok: true, msg: 'Wage budget up ' + money(add) + ' a week. Manager rating down 3.' };
  }

  // ---------- loans: every club takes its own view ----------
  function loanStance(p) {
    if (p.c < 0) return { ok: false, msg: 'He is a free agent. Sign him instead.' };
    if (p.loan) return { ok: false, msg: 'He is already out on loan this season.' };
    const c = S.C[p.c], r = c.sq.indexOf(p), n = c.sq.length, h = hash(p.id * 7 + p.c * 13 + S.season);
    if (p.inj > 4) return { ok: false, msg: 'He is injured. ' + c.n + ' will not send him out until he is fit.' };
    if (p.j === S.season && !p.y) return { ok: false, msg: c.n + ' have only just signed him.' };
    if (n <= 20) return { ok: false, msg: c.n + ' are short of numbers and cannot let anyone go on loan.' };
    if (r < 8) return { ok: false, msg: 'He is a key player for ' + c.n + '. They will not loan him out. A permanent offer is the only way.' };
    if (p.cy < 2) return { ok: false, msg: 'His contract is running down. ' + c.n + ' would rather sell him than loan him.' };
    if (r < 14) { if (!(p.a <= 23 || p.tl)) return { ok: false, msg: 'He is part of the first-team squad at ' + c.n + '. They would sell at the right price but will not loan him.' }; if (n < 25 || h < 0.45) return { ok: false, msg: c.n + ' want to keep him around the first team this season. Make a permanent offer, or try again next window.' }; }
    else if (h < 0.12) return { ok: false, msg: 'The manager at ' + c.n + ' wants to keep his squad together this season.' };
    return { ok: true, share: Math.round((0.4 + 0.5 * hash(p.id * 7 + S.season)) * 20) / 20 };
  }
  function loanable(p) { return p.c >= 0 && p.c !== S.user && loanStance(p).ok; }
  function loanTerms(pid) {
    const p = X.PM.get(pid); if (!p || p.c < -1) return { ok: false, msg: 'Player not found.' };
    if (p.c === S.user) return { ok: false, msg: 'He already plays for you.' };
    if (!windowOpen()) return { ok: false, msg: 'The transfer window is closed.' };
    if (isRival(p.c)) return { ok: false, msg: S.C[p.c].n + ' will not loan a player to a rival.' };
    const st = loanStance(p); if (!st.ok) return st;
    const rb = ruleBlock(p, 0); if (rb) return { ok: false, msg: rb };
    const u = S.C[S.user]; if (u.sq.filter(q => q.loan).length >= 5) return { ok: false, msg: 'You already have five players in on loan.' };
    if (u.sq.length + S.pend.length >= 40) return { ok: false, msg: 'Your squad is full (40 players).' };
    if (att(S.user) < att(p.c) - 15 || p.o > u.rep + 5) return { ok: false, msg: S.C[p.c].n + ' want him to go out at a higher level than yours.' };
    if (expRole(p, S.user) === 3) return { ok: false, msg: S.C[p.c].n + ' only loan him out to play. He would not get enough games with you.' };
    let n = S.ln[pid]; if (!n || n.s !== S.season || n.win !== winId()) n = S.ln[pid] = { s: S.season, win: winId(), ten: 0, ask: Math.min(1, st.share + 0.15), st: 'open' };
    if (n.st === 'dead') return { ok: false, msg: S.C[p.c].n + ' have ended the loan talks for this window.' };
    return { ok: true, p, min: st.share, share: n.ask, n, fee: Math.round(value(p) * 0.03 / 1e4) * 1e4, opt: p.a <= 29 ? Math.round(asking(p) * 1.1 / 1e4) * 1e4 : 0, wage: Math.round(p.w * n.ask / 100) * 100, club: p.c };
  }
  function loanOffer(pid, o) {
    const t = loanTerms(pid); if (!t.ok) return t; const u = S.C[S.user], p = t.p, club = S.C[t.club].n, share = clamp(Math.round((+o.share || 0) * 20) / 20, 0, 1), fee = Math.max(0, Math.round(+o.fee || 0)), w = Math.round(p.w * share / 100) * 100;
    if (wageBill(S.user) + pendWages() + w > u.wb) return { ok: false, msg: 'His wages would break your wage budget (' + money(u.wb) + ' a week).' };
    if (fee > u.bal - reserved()) return { ok: false, msg: 'You cannot afford that loan fee.' };
    const V = share + clamp((fee - t.fee) / Math.max(1, t.fee) * 0.08, -0.08, 0.15), opt = o.opt ? t.opt : 0;
    if (V >= t.min - 0.001) {
      loanMove(p, S.user, share, fee, opt); p.role = expRole(p, S.user); p.sk = 1; p.mo = 65; t.n.st = 'done';
      msg(p.n + ' joins on loan from ' + club + ' until the end of the season.', 'tr');
      news('LOAN', p.n + ' joins ' + u.n + ' on loan', club + ' have sent ' + p.n + ' (' + POS[p.p] + ', ' + p.a + ') to ' + u.n + ' until the end of the season. ' + u.n + ' cover ' + Math.round(share * 100) + '% of his wages' + (fee ? ' and pay a ' + money(fee) + ' loan fee' : '') + (opt ? '. The deal includes an option to buy for ' + money(opt) + '.' : '. There is no option to buy.'), S.user, p.id);
      return { ok: true, res: 'accept', msg: p.n + ' has joined on loan.' };
    }
    if (tense(t.n, 'ten', V / t.min)) { t.n.st = 'dead'; return { ok: false, res: 'dead', msg: club + ' have ended the loan talks. He stays where he is this window.' }; }
    t.n.ask = Math.max(t.min, Math.round((t.n.ask - 0.05) * 20) / 20);
    return { ok: true, res: 'counter', msg: club + ' say no. They want you to cover ' + Math.round(t.n.ask * 100) + '% of his wages' + (fee < t.fee ? ' and pay the ' + money(t.fee) + ' loan fee' : '') + '.' };
  }
  function loanIn(pid, withOpt) { const t = loanTerms(pid); if (!t.ok) return t; return loanOffer(pid, { share: t.share, fee: t.fee, opt: withOpt }); }

  // ---------- position averages and transfer advice ----------
  const PAK = ['g', 'a', 'xg', 'xa', 'sh', 'kp', 'pas', 'tk', 'it', 'sv'];
  function perApp(p, prev) {
    let ap, v;
    if (prev) { const h = p.hs[0]; if (!h || h[0] !== S.season - 1 || h[2] < 1) return null; ap = h[2]; v = { g: h[3], a: h[4], xg: h[5], xa: h[6], sh: h[10], kp: h[17] || 0, pas: h[15] || 0, cmp: h[16] || 0, tk: h[13] || 0, it: h[14] || 0, sv: h[18] || 0, cs: h[8], avg: h[7] }; }
    else { const s = p.ss; ap = s[0]; if (ap < 1) return null; v = { g: s[1], a: s[2], xg: s[5], xa: s[6], sh: s[7], kp: s[14], pas: s[12], cmp: s[13], tk: s[10], it: s[11], sv: s[15], cs: s[4], avg: s[3] / ap }; }
    const o = { ap, avg: v.avg, acc: v.pas ? v.cmp / v.pas * 100 : 0, cs: v.cs / ap * 100 }; for (const k of PAK) o[k] = v[k] / ap; return o;
  }
  function posAvg(li, pos, prev) {
    const key = S.season + ':' + S.t + ':' + li + ':' + pos + ':' + (prev ? 1 : 0); X.pa = X.pa || {}; if (X.pa[key]) return X.pa[key]; if (Object.keys(X.pa).length > 80) X.pa = {};
    const teams = li >= 0 ? new Set(S.L[li].teams) : null, min = prev ? 10 : Math.max(3, Math.floor(S.t / 10));
    const run = byLine => { const acc = {}; let n = 0; for (const p of S.P) { if (byLine ? LINE[p.p] !== LINE[pos] : p.p !== pos) continue; const club = prev ? (p.hs[0] ? p.hs[0][1] : -1) : p.c; if (club < 0 || (teams && !teams.has(club))) continue; const v = perApp(p, prev); if (!v || v.ap < min) continue; n++; for (const k in v) acc[k] = (acc[k] || 0) + v[k]; } if (n) for (const k in acc) acc[k] /= n; acc.n = n; return acc; };
    let r = run(false); r.grp = POS[pos]; if (r.n < 6) { r = run(true); r.grp = ['goalkeepers', 'defenders', 'midfielders', 'attackers'][LINE[pos]]; }
    return X.pa[key] = r;
  }
  function suggest() {
    const u = S.C[S.user], key = S.season + ':' + S.t + ':' + S.dn + ':' + u.sq.length + ':' + Math.round(u.bal / 1e4) + ':' + S.pend.length; if (X.sg && X.sg.key === key) return X.sg.list;
    const out = [], rep = teamReport(), budget = u.bal - reserved(), room = u.wb - wageBill(S.user) - pendWages(), seen = new Set(S.pend.map(d => d.pid)), cap = X.PM.get(u.cap), xi = pickXI(S.user), inXI = new Set(xi.pl.filter(Boolean).map(p => p.id));
    const form = p => p.ss[0] >= 3 ? ' This season: ' + p.ss[0] + ' starts, ' + p.ss[1] + ' goals, ' + p.ss[2] + ' assists, average ' + (p.ss[3] / p.ss[0]).toFixed(2) + '.' : p.hs[0] && p.hs[0][2] >= 5 ? ' Last season: ' + p.hs[0][2] + ' starts, ' + p.hs[0][3] + ' goals, ' + p.hs[0][4] + ' assists, average ' + p.hs[0][7].toFixed(2) + '.' : '';
    const can = (p, fee) => !seen.has(p.id) && p.c !== S.user && !p.loan && fee <= budget && demand(p, S.user) <= room && !ruleBlock(p, fee) && !willing(p, S.user);
    const weak = rep.slots.slice().sort((a, b) => a.d - b.d);
    // assistant manager: upgrades where the eleven is weakest
    for (let i = 0; i < 3 && i < weak.length; i++) {
      const w = weak[i]; if (w.d > 0.8) break; const cur = w.pid ? X.PM.get(w.pid) : null, base = cur ? cur.o : 0, pool = X.byPos[w.slot]; let n = 0;
      for (let j = 0; j < pool.length && j < 2500 && n < 2; j++) { const p = pool[j]; if (p.o < base + 1.5) continue; if (p.a > 31 || p.o > u.rep + 8 || p.c < -1) continue; const ask = p.c < 0 ? 0 : asking(p); if (!can(p, ask)) continue; seen.add(p.id); n++;
        out.push({ by: 'Assistant manager', kind: 'buy', pid: p.id, why: POS[w.slot] + ' is ' + (w.d < -0.8 ? 'below the standard of this league' : 'where an upgrade would show most') + '. He rates ' + Math.round(p.o) + ' against ' + (cur ? Math.round(cur.o) + ' for ' + cur.n : 'an empty slot') + ', and ' + (p.c < 0 ? 'he is a free agent' : S.C[p.c].n + ' want about ' + money(ask)) + '.' + form(p) }); }
    }
    // loan cover where there is no depth
    if (windowOpen()) { let n = 0; for (const w of rep.slots) { if (w.depth || w.slot === 0 || n >= 2) continue; const pool = X.byPos[w.slot], cur = w.pid ? X.PM.get(w.pid) : null; for (let j = 0; j < pool.length && j < 2500; j++) { const p = pool[j]; if (seen.has(p.id) || p.c < 0 || p.c === S.user || p.o > u.rep + 5 || p.o < (cur ? cur.o - 4 : 0)) continue; if (p.o < u.rep - 8) break; if (!loanStance(p).ok) continue; const t = loanTerms(p.id); if (!t.ok || t.wage > room || t.fee > budget) continue; seen.add(p.id); n++; out.push({ by: 'Assistant manager', kind: 'loan', pid: p.id, why: 'There is no cover at ' + POS[w.slot] + '. ' + S.C[p.c].n + ' would loan him for about ' + Math.round(t.share * 100) + '% of his wages (' + money(t.wage) + ' a week)' + (t.fee ? ' plus a ' + money(t.fee) + ' fee' : '') + '.' + form(p) }); break; } } }
    // chief scout: prospects
    { const sc = S.scouts[0], by = sc ? sc.n + ' (scout)' : 'Chief scout', c = []; for (const p of S.P) { if (p.a > 21 || p.c < -1 || p.c === S.user || p.loan || seen.has(p.id)) continue; const est = p.sk ? p.pot : p.pot - (p.id % 3) + 1; if (est < u.rep + 3 || est < p.o + 6 || p.o < u.rep - 12) continue; c.push([est + (p.sk ? 1.5 : 0) + p.o * 0.15, p, est]); }
      c.sort((a, b) => b[0] - a[0]); let n = 0; for (let j = 0; j < c.length && j < 250 && n < 3; j++) { const p = c[j][1], ask = p.c < 0 ? 0 : asking(p); if (!can(p, ask)) continue; seen.add(p.id); n++; out.push({ by, kind: 'buy', pid: p.id, why: 'One for the future. ' + p.a + ' years old, ' + Math.round(p.o) + ' now, and I ' + (p.sk ? 'have watched him enough to say ' + p.pot : 'think he could reach around ' + c[j][2]) + '. ' + (p.c < 0 ? 'He is a free agent.' : S.C[p.c].n + ' want about ' + money(ask) + '.') + (p.sk ? '' : ' Send a scout to firm up the potential.') }); } }
    // captain: the dressing room
    { const by = cap ? cap.n + ' (captain)' : 'Club captain';
      for (const p of u.sq) if (!p.loan && p.cy <= 1 && inXI.has(p.id) && p.mo >= 35) { out.push({ by, kind: 'renew', pid: p.id, why: 'The lads would hate to lose him. He starts every week and his contract is up in the summer. Get it done, boss.' }); break; }
      const un = u.sq.filter(p => !p.loan && p.mo < 32 && (p.role === undefined || p.role <= 2)).sort((a, b) => a.mo - b.mo)[0]; if (un) out.push({ by, kind: 'sell', pid: un.id, why: 'He is not happy and it is starting to show around the place. Give him games or let him go, but it cannot drift.' });
      let age = 0; for (const p of xi.pl) if (p) age += p.a; age /= 11; if (age < 25.5 || (weak[0] && !weak[0].depth)) { const sl = weak[0] ? weak[0].slot : 5, pool = X.byPos[sl]; for (let j = 0; j < pool.length && j < 3000; j++) { const p = pool[j]; if (p.c !== -1 || p.a < 29 || p.o > u.rep + 6) continue; if (p.o < u.rep - 5) break; if (!can(p, 0)) continue; seen.add(p.id); out.push({ by, kind: 'buy', pid: p.id, why: 'We are a young group' + (age < 25.5 ? ' (the eleven averages ' + age.toFixed(1) + ')' : '') + ' and an older head would help. He is ' + p.a + ', without a club, and would cost nothing but wages.' + form(p) }); break; } } }
    // sporting director: sales and loans out
    { const by = 'Sporting director', rank = u.sq.slice().sort((a, b) => b.o - a.o); let n = 0;
      for (const p of rank) { if (n >= 3) break; if (p.loan || p.tl || inXI.has(p.id) || S.offers.some(o => o.pid === p.id)) continue; const r = rank.indexOf(p); let why = '';
        if (p.a >= 30 && r >= 13 && p.w > wage(p) * 0.9) why = 'He is ' + p.a + ', outside your best thirteen and on ' + money(p.w) + ' a week. His value only goes one way from here: ' + money(xtv(p)) + ' today.';
        else if (p.a >= 27 && r >= 11 && p.fm > 1.2 && p.cy <= 2) why = 'He is in form, not in your first eleven and has ' + p.cy + ' year' + (p.cy > 1 ? 's' : '') + ' left. The market will not rate him higher than the ' + money(xtv(p)) + ' it does now.';
        else if (p.cy <= 1 && r >= 11 && p.a >= 24 && xtv(p) > 2e5) why = 'His contract runs out in the summer and he is not a starter. Sell now for around ' + money(xtv(p)) + ' or lose him for nothing.';
        if (why) { n++; out.push({ by, kind: 'sell', pid: p.id, why }); } }
      let m = 0; for (const p of u.sq) { if (m >= 2) break; if (p.loan || p.ll || p.a > 21 || inXI.has(p.id) || p.pot - p.o < 7 || p.cy < 2) continue; if (S.t > 12 && (p.ss[0] + 0.35 * p.ss[9]) / Math.max(8, S.t / 2.4) > 0.3) continue; m++; out.push({ by, kind: 'loanout', pid: p.id, why: 'He has ' + Math.round(p.pot - p.o) + ' points of growth in him and is not getting minutes here. A season starting somewhere else is worth more to his development than our bench.' }); } }
    X.sg = { key, list: out }; return out;
  }

  // ---------- difficulty, personalities, player roles ----------
  const DIFF = [{ n: 'Easy', lam: 1.06, opp: 0.95, buy: 0.9, sell: 1.1, mr: 0.7 }, { n: 'Normal', lam: 1, opp: 1, buy: 1, sell: 1, mr: 1 }, { n: 'Hard', lam: 0.96, opp: 1.04, buy: 1.1, sell: 0.92, mr: 1.25 }, { n: 'Legendary', lam: 0.92, opp: 1.08, buy: 1.2, sell: 0.85, mr: 1.5 }];
  function dq() { const d = S.opts.diff; return DIFF[d === undefined ? 1 : d] || DIFF[1]; }
  const TRAITS = [['Professional', 'Trains properly: develops 8% faster.'], ['Leader', 'Lifts the players around him when he starts. The best choice for captain.'], ['Ambitious', 'Wants to play at the highest level. Hard to keep if the club stands still, hard to sign for a step down.'], ['Loyal', 'Settled where he is. Renews for less and rarely asks to leave.'], ['Temperamental', 'Bigger swings in morale and more cards.'], ['Mercenary', 'Goes where the money is: wants higher wages but will join almost anyone.'], ['Laid-back', 'Does not mind the bench, but develops a little slower.'], ['Balanced', 'No strong tendencies either way.']];
  function trait(p) { const h = hash(p.id * 17 + 5); return h < 0.12 ? 0 : h < 0.22 ? 1 : h < 0.36 ? 2 : h < 0.48 ? 3 : h < 0.58 ? 4 : h < 0.66 ? 5 : h < 0.74 ? 6 : 7; }
  // role: [name, attack, defence, scoring, assists, key attributes, energy drain, what it does]
  const R_GK = [['Goalkeeper', 1, 1, 1, 1, [3, 0], 1, 'Stays on his line and keeps it simple.'], ['Sweeper keeper', 1.03, 1.02, 1, 1.4, [4, 2], 1, 'Comes off his line and starts attacks. Needs speed and kicking.']];
  const R_CB = [['Defender', 1, 1, 1, 1, [4, 5], 1, 'Marks, blocks, clears.'], ['Ball-playing defender', 1.15, 0.97, 1, 1.4, [2, 4], 1, 'Steps out and passes through the lines. A little less safe.'], ['Stopper', 0.9, 1.06, 1, 0.8, [5, 4], 1.05, 'Steps up to win it early. Needs strength.']];
  const R_FB = [['Fullback', 1, 1, 1, 1, [4, 0], 1, 'Defends first, supports when it is safe.'], ['Wingback', 1.3, 0.9, 1.1, 1.35, [0, 3], 1.15, 'Gets forward at every chance. More attack, less cover, more running.'], ['Inverted fullback', 1.12, 0.97, 0.8, 1.2, [2, 4], 1, 'Tucks into midfield to help keep the ball.']];
  const R_CDM = [['Holding midfielder', 0.85, 1.1, 0.7, 0.8, [4, 5], 1, 'Screens the back line.'], ['Deep-lying playmaker', 1.15, 0.94, 0.8, 1.4, [2, 3], 1, 'Runs the game from deep. Less protection.']];
  const R_CM = [['Box-to-box', 1, 1, 1, 1, [5, 2], 1.08, 'Covers every blade of grass.'], ['Playmaker', 1.12, 0.9, 0.8, 1.4, [2, 3], 1, 'Sets the tempo and creates.'], ['Holding midfielder', 0.85, 1.12, 0.7, 0.8, [4, 5], 1, 'Sits and protects.']];
  const R_CAM = [['Playmaker', 1, 1, 0.9, 1.3, [2, 3], 1, 'Finds the pass between the lines.'], ['Shadow striker', 1.05, 0.95, 1.4, 0.8, [1, 0], 1.05, 'Arrives late in the box to score.']];
  const R_WM = [['Winger', 1.05, 0.95, 1, 1.2, [0, 3], 1.05, 'Stays wide and takes his man on.'], ['Wide midfielder', 0.95, 1.1, 0.9, 1, [2, 4], 1, 'Works both ways and keeps the shape.']];
  const R_W = [['Winger', 1, 1, 0.9, 1.3, [0, 3], 1.05, 'Hugs the line and crosses.'], ['Inside forward', 1.03, 0.97, 1.3, 0.85, [1, 3], 1, 'Cuts in to shoot.']];
  const R_ST = [['Advanced forward', 1, 1, 1, 1, [1, 0], 1, 'Leads the line and runs in behind.'], ['Poacher', 0.97, 0.9, 1.25, 0.6, [1, 3], 0.95, 'Lives in the box. Scores more, creates little.'], ['Target forward', 1, 1.05, 0.95, 1.25, [5, 1], 1, 'Holds it up and brings others in. Needs strength.'], ['False nine', 1.05, 1, 0.75, 1.6, [2, 3], 1, 'Drops deep to create for the runners.']];
  const ROLEDEF = [R_GK, R_CB, R_FB, R_FB, R_CDM, R_CM, R_CAM, R_WM, R_WM, R_W, R_W, R_ST];
  R_GK.push(['Ball-playing keeper', 1.02, 1, 1, 1.3, [2, 3], 1, 'Plays short from the back and joins the build-up.']);
  R_CB.push(['Wide back', 1.05, 0.98, 1, 1.1, [0, 4], 1.04, 'Pulls wide when you have the ball to give a passing angle.']);
  R_FB.push(['Attacking wingback', 1.4, 0.85, 1.15, 1.45, [0, 3], 1.2, 'Plays as a winger when you have the ball. Leaves space behind him.']);
  R_CDM.push(['Centre-half', 0.8, 1.14, 0.6, 0.7, [4, 5], 1, 'Drops between the centre-backs and never leaves.'], ['Box crasher', 1.1, 0.95, 1.25, 0.9, [5, 1], 1.08, 'Arrives late in the box when the ball reaches the final third.']);
  R_CM.push(['Half-winger', 1.05, 0.97, 0.9, 1.25, [0, 2], 1.05, 'Drifts wide to make an overload and cross.'], ['Deep-lying playmaker', 1.1, 0.95, 0.8, 1.35, [2, 3], 1, 'Comes short for the ball and plays through the lines.']);
  R_CAM.push(['Classic 10', 1.05, 0.9, 0.95, 1.45, [2, 3], 0.95, 'Free role: comes to the ball, plays the killer pass, does little defending.'], ['Half-winger', 1.03, 0.97, 0.9, 1.25, [0, 2], 1.05, 'Drifts wide to make an overload and cross.']);
  R_WM.push(['Wide playmaker', 1.03, 0.97, 0.85, 1.35, [2, 3], 1, 'Comes inside to create.'], ['Inside forward', 1.05, 0.95, 1.3, 0.85, [1, 3], 1, 'Cuts in to shoot.']);
  R_W.push(['Wide playmaker', 1.03, 0.97, 0.85, 1.35, [2, 3], 1, 'Comes inside to create.']);
  function roleFit(p, sl, ri) { const rd = ROLEDEF[sl][ri]; if (!rd || !ri) return 0; let s = 0; for (const i of rd[5]) s += p.st[i]; return clamp((s / rd[5].length - p.o) * 0.07, -1.5, 1.2); }
  function setSlotRole(k, ri) { const c = S.C[S.user]; c.rl = c.rl || {}; if (+ri) c.rl[k] = +ri; else delete c.rl[k]; }
  function setPenTaker(pid) { S.C[S.user].pk = pid; }
  function cohesion() { const sq = S.C[S.user].sq; let t = 0, n = Math.min(18, sq.length); for (let i = 0; i < n; i++) t += sq[i].mo; return n ? clamp((t / n - 58) / 35, -1, 1) : 0; }
  function dynamics() {
    const u = S.C[S.user], sq = u.sq, top = sq.slice(0, 18), infl = p => p.a * 1.2 + p.o * 0.6 + (trait(p) === 1 ? 14 : 0) + (u.cap === p.id ? 10 : 0) + Math.min(6, (p.car ? p.car[0] : 0) / 40), nat = {};
    for (const p of sq) nat[p.nat] = (nat[p.nat] || 0) + 1;
    return { harmony: Math.round(top.reduce((s, p) => s + p.mo, 0) / Math.max(1, top.length)), coh: cohesion(), leaders: sq.filter(p => trait(p) === 1).map(p => p.id), unhappy: sq.filter(p => p.mo < 38).sort((a, b) => a.mo - b.mo).map(p => p.id), hier: sq.slice().sort((a, b) => infl(b) - infl(a)).slice(0, 6).map(p => p.id), groups: Object.keys(nat).map(k => [+k, nat[k]]).filter(x => x[1] >= 3).sort((a, b) => b[1] - a[1]) };
  }

  // ---------- rivals ----------
  const DERBY = [['Sheffield Wed', 'Sheffield Utd'], ['Sheffield Wed', 'Leeds United'], ['Sheffield Wed', 'Barnsley'], ['Sheffield Wed', 'Rotherham Utd'], ['Sheffield Utd', 'Leeds United'], ['Man Utd', 'Manchester City'], ['Man Utd', 'Liverpool'], ['Man Utd', 'Leeds United'], ['Liverpool', 'Everton'], ['Liverpool', 'Manchester City'], ['Arsenal', 'Spurs'], ['Arsenal', 'Chelsea'], ['Chelsea', 'Spurs'], ['Chelsea', 'West Ham'], ['West Ham', 'Millwall'], ['West Ham', 'Spurs'], ['Newcastle Utd', 'Sunderland'], ['Aston Villa', 'Birmingham City'], ['Aston Villa', 'West Brom'], ['Wolves', 'West Brom'], ['Birmingham City', 'West Brom'], ['Crystal Palace', 'Brighton'], ["Nott'm Forest", 'Derby County'], ["Nott'm Forest", 'Leicester City'], ['Derby County', 'Leicester City'], ["Nott'm Forest", 'Notts County'], ['Southampton', 'Portsmouth'], ['Bristol City', 'Bristol Rovers'], ['Cardiff City', 'Swansea City'], ['Ipswich', 'Norwich'], ['Burnley', 'Blackburn Rovers'], ['Bolton', 'Wigan Athletic'], ['Huddersfield', 'Leeds United'], ['Huddersfield', 'Bradford City'], ['Stoke City', 'Port Vale'], ['Plymouth Argyle', 'Exeter City'], ['Notts County', 'Mansfield Town'], ['Barnsley', 'Rotherham Utd'],
    ['Real Madrid', 'FC Barcelona'], ['Real Madrid', 'Atlético de Madrid'], ['FC Barcelona', 'RCD Espanyol'], ['Sevilla FC', 'Real Betis'], ['Athletic Club', 'Real Sociedad'], ['Valencia CF', 'Villarreal CF'], ['Celta', 'RC Deportivo'],
    ['FC Bayern München', 'Borussia Dortmund'], ['Borussia Dortmund', 'FC Schalke 04'], ['Hamburger SV', 'SV Werder Bremen'], ['Hamburger SV', 'FC St. Pauli'], ['1. FC Köln', 'Leverkusen'], ['Union Berlin', 'Hertha BSC'], ['1. FC Nürnberg', 'Fürth'],
    ['Lombardia FC', 'Milano FC'], ['Juventus', 'Torino'], ['Juventus', 'Lombardia FC'], ['Juventus', 'Fiorentina'], ['AS Roma', 'SS Lazio'], ['Genoa', 'Sampdoria'], ['SSC Napoli', 'AS Roma'],
    ['Paris SG', 'Paris FC'], ['OGC Nice', 'AS Monaco'], ['LOSC Lille', 'RC Lens'], ['Ajax', 'Feyenoord'], ['Ajax', 'PSV'], ['Feyenoord', 'PSV'], ['SL Benfica', 'Sporting CP'], ['SL Benfica', 'FC Porto'], ['FC Porto', 'Sporting CP'], ['Celtic', 'Rangers'], ['Hearts', 'Hibernian'],
    ['Galatasaray', 'Fenerbahçe'], ['Galatasaray', 'Beşiktaş'], ['Fenerbahçe', 'Beşiktaş'], ['Club Brugge', 'RSC Anderlecht'], ['Club Brugge', 'Cercle Brugge'], ['RSC Anderlecht', 'Standard Liège'], ['SK Rapid', 'FK Austria Wien'], ['FC Basel 1893', 'FC Zürich'], ['FC Zürich', 'GC Zürich'], ['F.C. København', 'Brøndby IF'], ['AIK', 'Djurgårdens IF'], ['AIK', 'Hammarby IF'], ['Djurgårdens IF', 'Hammarby IF'], ['Rosenborg BK', 'Lillestrøm SK'], ['Legia Warszawa', 'Lech Poznań'],
    ['Boca Juniors', 'River Plate'], ['Racing Club', 'Independiente'], ['Club América', 'Club Guadalajara'], ['Al Hilal', 'Al Nassr'], ['Al Ittihad', 'Al Ahli']];
  function derbySet(ci) { if (!X.rv) { X.rv = new Map(); const idx = {}; S.C.forEach((c, i) => { idx[c.n] = i; }); for (const d of DERBY) { const a = idx[d[0]], b = idx[d[1]]; if (a === undefined || b === undefined) continue; if (!X.rv.has(a)) X.rv.set(a, new Set()); if (!X.rv.has(b)) X.rv.set(b, new Set()); X.rv.get(a).add(b); X.rv.get(b).add(a); } } return X.rv.get(ci) || null; }
  function isDerby(ci) { const s = derbySet(S.user); return !!s && s.has(ci); }
  function liveRivals() {
    const key = S.season + ':' + S.t + ':' + S.user; if (X.lr && X.lr.key === key) return X.lr.set; const set = new Set(), u = S.C[S.user], L = S.L[u.l];
    if (S.t >= 16) { const o = table(u.l), i = o.indexOf(S.user), me = L.tbl[S.user][6]; for (let j = Math.max(0, i - 2); j <= Math.min(o.length - 1, i + 2); j++) if (j !== i && Math.abs(L.tbl[o[j]][6] - me) <= 4) set.add(o[j]); }
    else if (u.lp) for (const ci of L.teams) if (ci !== S.user && S.C[ci].lp && Math.abs(S.C[ci].lp - u.lp) <= 1 && S.season > S.start) set.add(ci);
    X.lr = { key, set }; return set;
  }
  function isRival(ci) { return ci >= 0 && ci !== S.user && (isDerby(ci) || liveRivals().has(ci)); }
  function rivals() { const d = derbySet(S.user); return { derby: d ? Array.from(d) : [], live: Array.from(liveRivals()).filter(ci => !isDerby(ci)) }; }

  // ---------- managers: theirs and yours ----------
  function story(x) { S.story.push({ s: S.season, t: Math.min(S.t, SLOTS - 1), x }); if (S.story.length > 300) S.story.shift(); }
  function newMgr(ci, f) {
    const c = S.C[ci]; if (f === undefined) { const L = c.l >= 0 ? S.L[c.l] : null; if (L) { const o = L.teams.slice().sort((a, b) => S.C[b].rep - S.C[a].rep); f = o.indexOf(ci) / o.length; } else f = 0.5; }
    const h = rnd(); c.mgr = { n: staffName(), s: S.season };
    c.tac = f < 0.3 ? [h < 0.6 ? 1 : 0, h < 0.5 ? 2 : 1, h < 0.55 ? 2 : 1, h < 0.6 ? 1 : 0] : f < 0.7 ? [0, 1, 1, h < 0.3 ? 1 : h < 0.55 ? 2 : 0] : [h < 0.6 ? -1 : 0, h < 0.55 ? 0 : 1, h < 0.3 ? 0 : 1, h < 0.6 ? 3 : 2];
  }
  function addJob(ci, why) { if (ci === S.user || S.C[ci].l < 0 || S.jobs.some(j => j.ci === ci)) return false; S.jobs.push({ ci, s: S.season, t: S.t, why }); return true; }
  function aiSackings(mid, moved) {
    let nn = 0; const u = S.C[S.user];
    S.L.forEach((L, li) => { const n = L.teams.length, exp = L.teams.slice().sort((a, b) => S.C[b].rep - S.C[a].rep), ord = mid ? table(li) : null;
      for (const ci of L.teams) { if (ci === S.user || (moved && moved.has(ci))) continue; const c = S.C[ci]; if (!c.mgr || c.mgr.s >= S.season - (mid ? 0 : 1)) continue; const pos = mid ? ord.indexOf(ci) + 1 : (c.lp || 0), e = exp.indexOf(ci) + 1; if (!pos || pos - e <= n * 0.3 || rnd() > (mid ? 0.3 : 0.55)) continue;
        const old = c.mgr.n; newMgr(ci);
        if ((li === u.l || c.rep >= 80) && nn++ < 4) news('SACKED', c.n + ' sack ' + old, c.n + ' have parted company with ' + old + ' after a run that left them ' + ord_(pos) + ', well short of where a squad like theirs should be. ' + c.mgr.n + ' takes over and is expected to change the way they play.', ci);
        if (!S.fired && c.rep >= u.rep - 3 && c.rep <= u.rep + clamp((S.mr - 50) / 5, -1, 6) && rnd() < 0.5 && addJob(ci, 'vacancy')) mail(c.n, 'Would you talk to us?', 'We have made a change in the dugout and your name is on a short list. If you are interested, the offer is in Office, Manager. It will not stay open for long.'); } });
  }
  function ord_(n) { return n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'); }
  function jobOffers(fired) {
    const u = S.C[S.user], tro = S.trophies.filter(t => t.s >= S.season - 2).length, hi = fired ? u.rep - 2 : u.rep + clamp((S.mr - 55) / 5, -2, 6) + tro, lo = fired ? u.rep - 12 : u.rep + 0.5, c = [];
    S.C.forEach((x, i) => { if (i !== S.user && x.l >= 0 && x.rep >= lo && x.rep <= hi) c.push(i); }); shuffle(c);
    const n = fired ? 4 : S.mr >= 78 ? 3 : S.mr >= 66 ? 2 : S.mr >= 56 ? (rnd() < 0.5 ? 1 : 0) : 0; let k = 0; for (let i = 0; i < c.length && k < n; i++) if (addJob(c[i], fired ? 'open' : 'approach')) k++;
    if (fired && S.jobs.length < 3) { const all = []; S.C.forEach((x, i) => { if (i !== S.user && x.l >= 0 && x.rep < u.rep) all.push(i); }); all.sort((a, b) => S.C[b].rep - S.C[a].rep); for (let i = 0; i < all.length && S.jobs.length < 3; i += 3) addJob(all[i], 'open'); }
    if (!fired && k) mail('Your agent', k > 1 ? k + ' clubs want to talk to you' : 'A club wants to talk to you', 'Your work has been noticed. ' + S.jobs.filter(j => j.why === 'approach').map(j => S.C[j.ci].n).join(', ') + (k > 1 ? ' have' : ' has') + ' asked whether you would consider a move. The details are in Office, Manager. Take your time, but they will look elsewhere after a few weeks.');
  }
  function fire(resigned) {
    const u = S.C[S.user]; S.fired = { club: u.n, s: S.season, t: S.t, res: resigned ? 1 : 0 }; S.sack = null; S.jobs = []; if (!resigned) S.nsack = (S.nsack || 0) + 1;
    if (S.opts.iron && !resigned) { S.over = { why: 'sacked', s: S.season, t: S.t }; story('Sacked by ' + u.n + '. In Ironman, that is the end of the career.'); return; }
    story(resigned ? 'Resigned as manager of ' + u.n + '.' : 'Sacked by ' + u.n + '.'); if (!resigned) news('SACKED', u.n + ' sack ' + S.mg.n, u.n + ' have dismissed ' + S.mg.n + ' after the board lost patience with results. The search for a successor has started. ' + S.mg.n + ' is expected to be back in work quickly.', S.user);
    jobOffers(true);
  }
  function resign() { if (S.fired) return { ok: false, msg: 'You are already out of work.' }; if (S.dc) return { ok: false, msg: 'Not during a daily challenge.' }; if (S.opts.iron && S.sack) return { ok: false, msg: 'In Ironman you cannot walk out while you are on a final warning.' }; fire(true); return { ok: true, msg: 'You have resigned.' }; }
  function sackCheck(end) {
    if (S.fired || S.dc) return; const k = S.sack;
    if (end) { if (S.mr < 18) fire(false); else S.sack = null; return; }
    if (!k) { if (S.mr < 22 && !(S.season === S.start && S.t < 24)) { S.sack = { n: 0 }; mail('Club owner', 'Final warning', 'Results are nowhere near what this club expects and the other directors want a change. I have bought you five matches. Turn it around or I will have to act.'); } return; }
    k.n++; if (k.n >= 5) { if (S.mr >= 25) { S.sack = null; mail('Club owner', 'You have bought yourself time', 'That is better. The pressure is off for now. Keep it going.'); } else fire(false); }
  }
  function matchFx(m) {
    const u = S.C[S.user], us = m.h === S.user, opp = us ? m.a : m.h, O = S.C[opp], gf = us ? m.gh : m.ga, ga = us ? m.ga : m.gh, r = m.res, d = O.rep - u.rep;
    let x = r === 'W' ? 0.6 + clamp(d * 0.1, -0.2, 1) : r === 'D' ? clamp(d * 0.08, -0.3, 0.5) - 0.1 : -0.7 + clamp(d * 0.1, -0.4, 0.5); if (x < 0) x *= dq().mr; if (m.comp !== S.L[u.l].n) x *= 0.7;
    if (m.derby) { x += r === 'W' ? 2 : r === 'L' ? -2 : 0; const dm = r === 'W' ? 3 : r === 'L' ? -3 : 0; if (dm) for (const p of u.sq) p.mo = clamp(p.mo + dm, 0, 100); if (r === 'W' && gf - ga >= 3) story('Beat rivals ' + O.n + ' ' + gf + '-' + ga + '.'); }
    S.mrf = (S.mrf || 0) + x; const w = Math.trunc(S.mrf); if (w) { S.mr = clamp(S.mr + w, 0, 100); S.mrf -= w; }
    const R = S.rec, gd = gf - ga; if (gd > 0 && (!R.bigW || gd > R.bigW[0] - R.bigW[1] || (gd === R.bigW[0] - R.bigW[1] && gf > R.bigW[0]))) R.bigW = [gf, ga, O.n, S.season]; if (gd < 0 && (!R.bigL || gd < R.bigL[0] - R.bigL[1])) R.bigL = [gf, ga, O.n, S.season];
    if (r !== 'L') { R.run = (R.run || 0) + 1; if (R.run > (R.best || 0)) R.best = R.run; } else R.run = 0; if (r === 'W') { R.wrun = (R.wrun || 0) + 1; if (R.wrun > (R.wbest || 0)) R.wbest = R.wrun; } else R.wrun = 0;
    achMatch(m, opp); chaseFx(m); sackCheck(false);
  }
  function switchClub(ci) {
    const old = S.user, oc = S.C[old], nc = S.C[ci];
    if (S.ch && !S.ch.done && !S.ch.fail) S.chLog.push({ name: S.ch.name, start: S.ch.start, end: S.season, res: 'Abandoned' }); S.ch = null;
    for (const p of oc.sq) { delete p.role; delete p.ll; } oc.auto = 1; oc.xi = null; delete oc.rl; delete oc.pk; delete oc.tr; delete oc.bn; delete oc.fo; delete oc.ins; newMgr(old);
    S.offers = []; S.loffers = []; S.neg = {}; S.rn = {}; S.ln = {}; S.pend = []; S.short = []; S.reports = []; S.yrep = []; S.debt = []; S.cred = []; S.bb = []; S.um = []; S.acad = []; S.sack = null; S.vowM = null; S.vow = 0; S.emb = 0;
    S.user = ci; nc.auto = 1; nc.xi = null; delete nc.mgr; if (!nc.tac) nc.tac = [0, 1, 1, 0]; X.sg = null; X.pa = null; X.lr = null; X.rv = null;
    let cp = null; for (const p of nc.sq) { p.role = expRole(p, ci); p.sk = 1; if (!cp || p.a * 2 + p.o > cp.a * 2 + cp.o) cp = p; } nc.cap = cp ? cp.id : 0;
    S.lout = S.P.filter(p => p.loan && p.loan.o === ci).map(p => p.id);
    initStaff(); refreshPools(); S.inc = { base: 0, tp: 1, fac: { std: 0, com: 0, acd: 0, trn: 0 }, sp: null, offers: [], req: {} }; S.inc.base = incBase(); sponsorOffers(); signSponsor(0);
    nc.wb = Math.max(nc.wb, Math.round(wageBill(ci) * 1.08)); bestFormation(ci); acadIntake(6); setBoard(); S.mr = 55; S.mrf = 0;
    if (S.t === 0) makePre(); else { S.pre = []; S.prei = 0; }
    { const cs = new Set(S.hist.map(h => h.club)); cs.add(oc.n); cs.add(nc.n); if (cs.size >= 3) award('journey'); }
    S.jobs = []; S.fired = null; story('Appointed manager of ' + nc.n + ' (' + S.L[nc.l].n + ').');
    news('APPOINTED', nc.n + ' appoint ' + S.mg.n, nc.n + ' have named ' + S.mg.n + ' as their new manager, ' + (S.hist.length ? 'after ' + S.hist.length + ' season' + (S.hist.length > 1 ? 's' : '') + ' in the game' : 'in his first job') + '. The board want him to ' + S.board.txt.toLowerCase() + '.', ci);
    msg('Welcome to ' + nc.n + '. The board wants you to: ' + S.board.txt.toLowerCase() + '. You inherit the staff and the squad; the commercial director has signed a one-off shirt deal to tide the club over.', 'info');
  }
  function takeJob(ci) { if (!S.jobs.some(j => j.ci === ci)) return { ok: false, msg: 'That offer has gone.' }; if (LM) return { ok: false, msg: 'Finish the match first.' }; switchClub(ci); return { ok: true, msg: 'You are the new manager of ' + S.C[ci].n + '.' }; }

  // ---------- play-offs ----------
  function setupPlayoffs() {
    S.po = []; while (S.sched.length < SLOTS) S.sched.push([]);
    S.L.forEach((L, li) => { const cfg = PO[L.c] && PO[L.c][L.t]; if (!cfg) return; const o = table(li), s = o.slice(cfg[0], cfg[0] + 4); if (s.length < 4) return; const i = S.po.length;
      S.po.push({ li, n: L.n + ' play-offs', sf: [{ a: s[0], b: s[3], legs: [], w: -1 }, { a: s[1], b: s[2], legs: [], w: -1 }], f: null, w: -1 }); S.sched[92].push(['P', i, 'sf', 0]); S.sched[93].push(['P', i, 'sf', 1]); S.sched[94].push(['P', i, 'f', 0]);
      if (s.indexOf(S.user) >= 0) mail('Club secretary', 'You are in the play-offs', 'A finish of ' + ord_(o.indexOf(S.user) + 1) + ' puts us in the play-offs. Two-legged semi-final first, the lower-placed side at home in the first leg, then a one-off final on neutral ground. One club goes up.'); });
  }
  function runPO(i, stg, leg, out) {
    const Q = S.po[i]; if (!Q) return;
    if (stg === 'f') { const T = Q.f; if (!T) return; const x = simMatch(T.a, T.b, { ko: true, neutral: true }); T.legs.push([x.gh, x.ga, x.note]); T.w = x.win === 0 ? T.a : T.b; Q.w = T.w; if (x.sc) { x.comp = Q.n; x.rd = 'Final'; x.t = S.t; out.push(x); }
      if (Q.li === S.C[S.user].l) news('PROMOTED', S.C[Q.w].n + ' win the play-off final', S.C[Q.w].n + ' are going up. They beat ' + S.C[Q.w === T.a ? T.b : T.a].n + ' ' + Math.max(x.gh, x.ga) + '-' + Math.min(x.gh, x.ga) + (x.note === 'pens' ? ' on penalties' : x.note === 'aet' ? ' after extra time' : '') + ' in the ' + Q.n + ' final, the most valuable single match in the division.', Q.w); return; }
    for (const T of Q.sf) {
      if (leg === 0) { const x = simMatch(T.b, T.a); T.legs.push([x.ga, x.gh, '']); if (x.sc) { x.comp = Q.n; x.rd = 'Semi-final, 1st leg'; x.t = S.t; out.push(x); } }
      else { const f = T.legs[0], x = simMatch(T.a, T.b, { ko: true, agg: [f[1], f[0]] }); T.legs.push([x.gh, x.ga, x.note]); T.w = x.win === 0 ? T.a : T.b; if (x.sc) { x.comp = Q.n; x.rd = 'Semi-final, 2nd leg'; x.agg = [f[0] + x.gh, f[1] + x.ga]; x.t = S.t; out.push(x); } }
    }
    if (leg === 1) Q.f = { a: Q.sf[0].w, b: Q.sf[1].w, legs: [], w: -1 };
  }
  function poUps(ctry, dn, ord, k) { const cfg = PO[ctry] && PO[ctry][S.L[dn].t]; if (!cfg) return ord.slice(0, k); const q = (S.po || []).find(x => x.li === dn), w = q && q.w >= 0 ? q.w : ord[cfg[0]]; return ord.slice(0, cfg[0]).concat([w]); }

  // ---------- academy ----------
  function acadMk(a) {
    const nm = names(), q = rnd() * 100, j = Math.floor(q), pd = S.pd, lv = S.inc ? S.inc.fac.acd : 0; let pot = pd[j] + (pd[Math.min(100, j + 1)] - pd[j]) * (q - j);
    pot = clamp(67.5 + (pot - 67.5) * 0.85 + (S.C[S.user].rep - (S.mrep || 69)) * 0.45 + S.tune + lv * 1.3, 48, 92); const gap = Math.min(28, 12 + Math.abs(gauss()) * 6) - (a - 15) * 2, sq = S.C[S.user].sq;
    const nat = sq.length && rnd() < 0.8 ? pick(sq).nat : pick(S.P).nat, e = nm[nat] || nm[pick(Object.keys(nm))], err = 5 - lv;
    return { id: S.mid++, n: pick(e[0]) + ' ' + pick(e[1]), nat, a, p: pick([0, 1, 1, 1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 11]), o: Math.max(38, pot - gap), pot: Math.round(pot), lo: Math.round(pot - ri(1, err)), hi: Math.min(94, Math.round(pot + ri(1, err))), gp: ri(0, 5), d: 0 };
  }
  function acadIntake(n) { const out = []; for (let i = 0; i < n && S.acad.length < 20; i++) { const y = acadMk(ri(15, 16)); S.acad.push(y); out.push(y); } return out; }
  function acadTick() { const lv = S.inc.fac.acd, trn = S.inc.fac.trn; for (const y of S.acad) { const g = Math.max(0, y.pot - y.o) * 0.035 * (1 + 0.1 * lv + 0.03 * trn) * (0.7 + rnd() * 0.6); y.o += g; y.d = g; } }
  function acadSeason() {
    const gone = []; S.acad = S.acad.filter(y => { y.a++; if (y.a >= 19) { gone.push(y.n); return false; } return true; });
    if (gone.length) msg('Too old for the academy and released: ' + gone.join(', ') + '. Promote players before they turn 19 if you want to keep them.', 'ct');
    const inn = acadIntake(4 + (S.inc.fac.acd >= 2 ? 1 : 0) + (S.inc.fac.acd >= 3 ? 1 : 0)), best = inn.slice().sort((a, b) => b.hi - a.hi)[0];
    if (best) mail('Head of youth', 'This year\'s academy intake', inn.length + ' new players have joined the academy. The one to watch is ' + best.n + ', a ' + best.a + '-year-old ' + POS[best.p] + ' who is about ' + Math.round(best.o) + ' now and could reach ' + best.lo + ' to ' + best.hi + '. They develop in the academy until you promote them from Squad, Academy; anyone not promoted by 19 is released.');
  }
  function promoteYouth(id) {
    const i = S.acad.findIndex(y => y.id === id); if (i < 0) return { ok: false, msg: 'He is no longer in the academy.' }; const y = S.acad[i], u = S.C[S.user];
    if (u.sq.length >= 38) return { ok: false, msg: 'Your squad is full.' };
    if (wageBill(S.user) + pendWages() + wage({ o: y.o, a: y.a }) > u.wb) return { ok: false, msg: 'His first professional wage would break your wage budget.' };
    const p = genPlayer(S.user, y.a, y.o, 0, y.pot, y.p); p.n = y.n; p.nat = y.nat; p.gp = y.gp; p.role = 4; p.sk = 1; S.acad.splice(i, 1); S.nprom = (S.nprom || 0) + 1; if (S.nprom >= 3) award('acad');
    msg(p.n + ' (' + POS[p.p] + ', ' + p.a + ') has signed his first professional contract.', 'tr'); if (y.pot >= u.rep + 6) story('Academy graduate ' + p.n + ' promoted to the first team at ' + p.a + '.');
    return { ok: true, msg: p.n + ' is now in the first-team squad.', pid: p.id };
  }
  function releaseYouth(id) { const i = S.acad.findIndex(y => y.id === id); if (i >= 0) S.acad.splice(i, 1); return { ok: true, msg: 'Released from the academy.' }; }
  function signYouth(id) {
    const i = S.yrep.findIndex(y => y.id === id); if (i < 0) return { ok: false, msg: 'He has signed elsewhere.' }; const y = S.yrep[i];
    if (S.acad.length >= 20) return { ok: false, msg: 'The academy is full (20). Promote or release someone first.' };
    const rb = ruleBlock({ c: -1, a: y.a, nat: y.nat, o: y.o }, 0); if (rb) return { ok: false, msg: rb };
    S.acad.push({ id: y.id, n: y.n, nat: y.nat, a: y.a, p: y.p, o: y.o, pot: y.pot, lo: y.lo, hi: y.hi, gp: ri(0, 5), d: 0 }); S.yrep.splice(i, 1);
    msg(y.n + ' (' + POS[y.p] + ', ' + y.a + ') has joined the academy.', 'tr'); return { ok: true, msg: y.n + ' has joined the academy.' };
  }

  // ---------- international tournaments ----------
  const EURN = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Holland', 'Netherlands', 'Portugal', 'Belgium', 'Turkey', 'Türkiye', 'Scotland', 'Austria', 'Switzerland', 'Denmark', 'Norway', 'Sweden', 'Poland', 'Romania', 'Republic of Ireland', 'Croatia', 'Serbia', 'Czech Republic', 'Czechia', 'Ukraine', 'Hungary', 'Greece', 'Wales', 'Slovakia', 'Slovenia', 'Albania', 'Georgia', 'Finland', 'Iceland', 'Northern Ireland', 'Bosnia and Herzegovina', 'North Macedonia', 'Montenegro', 'Kosovo', 'Bulgaria', 'Israel', 'Russia'];
  function intlCup() {
    const y = S.season; if (y % 2) return; const wc = y % 4 === 2, name = wc ? 'World Cup' : 'European Championship', by = {};
    for (const p of S.P) { if (p.c < -1) continue; (by[p.nat] = by[p.nat] || []).push(p.o); }
    let tm = []; for (const k in by) { if (!wc && EURN.indexOf(D.nats[k]) < 0) continue; const a = by[k].sort((x, z) => z - x).slice(0, 14); if (a.length < 14) continue; tm.push([+k, a.reduce((s, v) => s + v, 0) / 14]); }
    tm.sort((a, b) => b[1] - a[1]); let n = wc ? 32 : 16; while (n > tm.length) n /= 2; if (n < 8) return; tm = shuffle(tm.slice(0, n)); let ru = -1, sf = [];
    while (tm.length > 1) { const nx = []; if (tm.length === 4) sf = tm.map(t => t[0]); for (let i = 0; i < tm.length; i += 2) { const a = tm[i], b = tm[i + 1], ga = pois(1.3 * Math.exp((a[1] - b[1]) / 9)), gb = pois(1.3 * Math.exp((b[1] - a[1]) / 9)), w = ga > gb ? a : gb > ga ? b : (rnd() < 0.5 ? a : b); nx.push(w); if (tm.length === 2) ru = (w === a ? b : a)[0]; } tm = nx; }
    const w = tm[0][0]; S.intl.push({ y, n: name, w, ru, sf }); for (const p of S.P) if (p.nat === w && p.c >= 0 && p.o >= 78) p.mo = clamp(p.mo + 10, 0, 100);
    news('INTERNATIONAL', D.nats[w] + ' win the ' + y + ' ' + name, D.nats[w] + ' are champions. They beat ' + D.nats[ru] + ' in the final of the ' + name + '. Their players come back to their clubs on a high, and a few of them with bigger price tags.', -1);
  }

  // ---------- scenarios, opposition report, season wrap ----------
  function applyScenario(k) {
    const u = S.C[S.user], L = S.L[u.l]; S.scn = k || 'std';
    if (k === 'emb') S.emb = S.season;
    else if (k === 'fire') { let cash = 0; for (const p of u.sq.slice(0, 4)) { cash += value(p) * 0.6; let done = false; for (let i = 0; i < 60 && !done; i++) { const ci = ri(0, S.C.length - 1), c = S.C[ci]; if (ci !== S.user && c.l >= 0 && c.sq.length < 34 && c.rep > p.o - 5 && c.rep < p.o + 8) { movePlayer(p, ci, 0, wage(p), 3); done = true; } } if (!done) movePlayer(p, -1, 0); } u.bal += Math.round(cash / 1e4) * 1e4; u.rep = calcRep(u); bestFormation(S.user); setBoard(); }
    else if (k === 'rich') { u.bal = Math.round((u.bal * 4 + 2e7) / 1e5) * 1e5; u.wb = Math.round(u.wb * 1.5); const b = S.board; b.pos = Math.max(1, b.pos - 3); b.txt = b.pos === 1 ? 'Win the ' + L.n : 'Finish ' + ord_(b.pos) + ' or higher'; }
    else if (k === 'inj') { for (const p of shuffle(u.sq.slice(0, 11)).slice(0, 5)) p.inj = ri(6, 10); bestFormation(S.user); }
    else if (k === 'tiny') { const keep = u.sq.slice(0, 18), gk = keep.filter(p => p.p === 0).length; if (gk < 2) { const g = u.sq.slice(18).find(p => p.p === 0); if (g) keep[17] = g; } for (const p of u.sq.slice()) if (keep.indexOf(p) < 0) movePlayer(p, -1, 0); u.rep = calcRep(u); u.wb = Math.round(wageBill(S.user) * 1.1 / 100) * 100; bestFormation(S.user); }
    else if (k === 'youth') S.emb = -1;
    else if (k === 'broke') { u.bal = 0; u.wb = Math.round(wageBill(S.user) * 0.85 / 100) * 100; }
  }
  function oppReport(ci) {
    const c = S.C[ci], x = pickXI(ci), me = pickXI(S.user), t = c.tac || [0, 1, 1, 0], L = c.l >= 0 ? S.L[c.l] : null, form = [];
    if (L) for (let r = L.res.length - 1; r >= 0 && form.length < 5; r--) { const rr = L.res[r]; if (!rr) continue; for (const m of rr) if (m[0] === ci || m[1] === ci) { const gf = m[0] === ci ? m[2] : m[3], ga = m[0] === ci ? m[3] : m[2]; form.push(gf > ga ? 'W' : gf < ga ? 'L' : 'D'); } }
    const key = x.pl.map((p, k) => p ? [p.id, x.slots[k], Math.round(x.r[k])] : null).filter(Boolean).sort((a, b) => b[2] - a[2]).slice(0, 3); let weak = null; for (let k = 1; k < 11; k++) if (x.pl[k] && (!weak || x.r[k] < weak[2])) weak = [x.pl[k].id, x.slots[k], Math.round(x.r[k])];
    let sc = null; for (const p of c.sq) if (!sc || p.ss[1] > sc.ss[1]) sc = p; const tips = [];
    if (x.dpace < me.apace - 4) tips.push('Their back line is slow (pace ' + Math.round(x.dpace) + ' against your forwards\' ' + Math.round(me.apace) + ').' + (t[1] === 2 ? ' They also hold a high line, so pace in behind will hurt them.' : ' Direct play gets your forwards running at them.'));
    if (t[1] === 2 && me.apace >= x.dpace) tips.push('They defend high. Your forwards are quick enough to punish that.');
    if (t[2] === 2) tips.push('They press high and tire late. Keep fresh legs for the last twenty minutes.');
    if (t[3] === 1 && x.mpas > me.mpas + 3) tips.push('They want the ball and are good with it (midfield passing ' + Math.round(x.mpas) + ' against your ' + Math.round(me.mpas) + '). Pressing them is hard work; a compact block and the counter is safer.');
    if (x.avg > me.avg + 2) tips.push('They are the stronger eleven by ' + (x.avg - me.avg).toFixed(1) + '. Counter-attack earns its bonus here, and a lower mentality keeps the score down.'); else if (x.avg < me.avg - 2) tips.push('You are stronger by ' + (me.avg - x.avg).toFixed(1) + '. An attacking mentality turns that into goals.');
    if (weak) tips.push('Their weakest starter is at ' + POS[weak[1]] + ' (' + weak[2] + ').');
    return { f: c.f, tac: t, mgr: c.mgr ? c.mgr.n : '', avg: x.avg, mine: me.avg, form: form.reverse(), key, weak, scorer: sc && sc.ss[1] ? [sc.id, sc.ss[1]] : null, tips, derby: isDerby(ci), rival: isRival(ci), pos: L ? table(c.l).indexOf(ci) + 1 : 0 };
  }
  function seasonWrap(rec, sum) {
    const moved = new Set(sum.moves.map(m => m[0]));
    story('Finished ' + ord_(rec.pos) + ' in the ' + rec.lg + ' with ' + rec.club + ' (' + rec.w + 'W ' + rec.d + 'D ' + rec.l + 'L, ' + rec.pts + ' points)' + (rec.mv ? '. ' + rec.mv + '.' : '.') + (rec.tro.length ? ' Won: ' + rec.tro.join(', ') + '.' : '') + (rec.ts && rec.ts[1] ? ' Top scorer: ' + rec.ts[0] + ' (' + rec.ts[1] + ').' : ''));
    S.jobs = S.jobs.filter(j => j.why === 'open'); aiSackings(false, moved); intlCup(); sackCheck(true); achSeason(rec); S.dmin = S.opts.diff; if (!S.fired) jobOffers(false);
  }
  function setDiff(v) { if (S.opts.iron) return; S.opts.diff = clamp(Math.round(+v), 0, 3); S.dmin = Math.min(S.dmin === undefined ? 3 : S.dmin, S.opts.diff); }

  // ---------- in-match: swap positions, change shape, team talk ----------
  function lmMine() { return LM ? (LM.H.mine ? LM.H : LM.A) : null; }
  function liveSwap(a, b) { const lm = LM, T = lmMine(); if (!T || lm.done) return { ok: false, msg: 'The match is over.' }; const i = T.cur.findIndex(L => L && L.id === a), j = T.cur.findIndex(L => L && L.id === b); if (i < 0 || j < 0 || i === j) return { ok: false, msg: 'Pick two players who are on the pitch.' }; if (T.slots[i] === 0 || T.slots[j] === 0) return { ok: false, msg: 'The goalkeeper stays in goal.' };
    const A = T.cur[i], B = T.cur[j]; T.cur[i] = B; T.cur[j] = A; A.k = j; A.sl = T.slots[j]; A.base = dyn(A.p) - pen(A.p, A.sl); B.k = i; B.sl = T.slots[i]; B.base = dyn(B.p) - pen(B.p, B.sl); lmLam(lm); return { ok: true, msg: A.p.n + ' and ' + B.p.n + ' have swapped positions.' }; }
  function liveForm(f) { const lm = LM, T = lmMine(); if (!T || lm.done || !FORMS[f]) return { ok: false, msg: 'That is not possible right now.' }; const ns = FORMS[f], ls = T.cur.filter(Boolean), nc = new Array(11).fill(null), free = ns.map((s, k) => k);
    const gk = ls.find(L => L.sl === 0), g0 = ns.indexOf(0); if (gk) { nc[g0] = gk; free.splice(free.indexOf(g0), 1); } const rest = ls.filter(L => L !== gk);
    while (rest.length && free.length) { let bi = 0, bk = 0, bv = 1e9; for (let i = 0; i < rest.length; i++) for (let q = 0; q < free.length; q++) { if (ns[free[q]] === 0) continue; const v = pen(rest[i].p, ns[free[q]]) - (rest[i].sl === ns[free[q]] ? 0.5 : 0); if (v < bv) { bv = v; bi = i; bk = q; } } if (bv > 1e8) break; nc[free[bk]] = rest[bi]; rest.splice(bi, 1); free.splice(bk, 1); }
    T.f = f; T.slots = ns.slice(); T.cur = nc; T.rl = {}; T.fo = {}; T.ins = {}; for (let k = 0; k < 11; k++) { const L = nc[k]; if (L) { L.k = k; L.sl = ns[k]; L.base = dyn(L.p) - pen(L.p, L.sl); } } lmLam(lm); return { ok: true, msg: 'The team has changed to a ' + f + '.' }; }
  function liveTalk(k) { const lm = LM, T = lmMine(); if (!T || lm.done) return { ok: false, msg: 'The match is over.' }; if (T.talk) return { ok: false, msg: 'You have already had your say in this match.' }; T.talk = 1; const O = T === lm.H ? lm.A : lm.H, d = T.g - O.g, fav = T.avg - O.avg; let up = 0, dn = 0;
    for (const L of T.cur) { if (!L) continue; const tr = trait(L.p); let x = 0; if (k === 0) x = d > 0 ? 0.3 : d === 0 ? (fav < -1 ? 0.25 : 0) : -0.3; else if (k === 1) x = d < 0 || (d === 0 && fav > 1) ? (tr === 4 || tr === 6 ? -0.25 : tr <= 2 ? 0.6 : 0.35) : d > 0 ? -0.3 : 0.1; else { x = 0.1; L.en = Math.min(100, L.en + 4); } L.dz += x; if (x > 0) up++; else if (x < 0) dn++; }
    lmLam(lm); return { ok: true, msg: up > dn * 2 ? 'That landed. ' + up + ' of them look lifted.' : dn > up ? 'That went down badly. ' + dn + ' of them took it the wrong way.' : 'A mixed reaction: ' + up + ' responded, ' + dn + ' did not.' }; }


  // ================= v7: career score, ironman, achievements, records chase, daily challenge, friend teams =================
  const DMULT = [0.7, 1, 1.3, 1.6];
  function dmin() { const d = S.dmin === undefined ? S.opts.diff : Math.min(S.dmin, S.opts.diff === undefined ? 1 : S.opts.diff); return clamp(d === undefined ? 1 : d, 0, 3); }
  function troPts(n, rec, lf) {
    if (n === rec.lg) return 500 * lf; const k = S.eu ? S.eu.findIndex(E => E.n === n) : -1; if (k >= 0) return [800, 450, 300][k] || 300;
    if (/play-offs/.test(n)) return 150; const c = (S.cups || []).find(x => x.n === n); return c && c.lc ? 150 : 250;
  }
  function seasonScore(rec, lvl, over, d, iron) {
    const lf = clamp((lvl - 45) / 35, 0.3, 1.1); let s = 1000 * lf * (rec.n - rec.pos) / Math.max(1, rec.n - 1);
    s += clamp(over, -8, 12) * 25; for (const t of rec.tro || []) s += troPts(t, rec, lf);
    if (rec.mv === 'Promoted') s += 250; else if (rec.mv === 'Relegated') s -= 250;
    s *= DMULT[d] * (iron ? 1.2 : 1); return Math.max(0, Math.round(s));
  }
  function careerScore() { let s = 0; for (const h of S.hist) s += h.sc || 0; return Math.max(0, s - 200 * (S.nsack || 0)); }
  function scoreParts() { return { seasons: S.hist.map(h => ({ s: h.s, club: h.club, lg: h.lg, pos: h.pos, sc: h.sc || 0, df: h.df === undefined ? 1 : h.df, tro: h.tro || [] })), sacks: S.nsack || 0, total: careerScore(), mult: DMULT[dmin()] * (S.opts.iron ? 1.2 : 1) }; }
  function wallEntry(why) {
    const cl = []; for (const h of S.hist) if (cl.indexOf(h.club) < 0) cl.push(h.club); const u = S.C[S.user].n; if (cl.indexOf(u) < 0 && !S.fired) cl.push(u);
    const best = S.hist.slice().sort((a, b) => a.tier - b.tier || a.pos - b.pos)[0];
    return { id: S.cid, n: S.mg.n, clubs: cl, s0: S.start, s1: S.season, se: S.hist.length, sc: careerScore(), tro: S.trophies.length, why: why || (S.over && S.over.why) || 'retired', iron: S.opts.iron ? 1 : 0, d: dmin(), best: best ? ord_(best.pos) + ', ' + best.lg : '', g: [S.mg.p, S.mg.w, S.mg.d, S.mg.l] };
  }
  function retire() { if (LM) return { ok: false, msg: 'Finish the match first.' }; if (S.dc) return { ok: false, msg: 'Not during a daily challenge.' }; S.over = { why: 'retired', s: S.season, t: S.t }; story('Retired from management.'); return { ok: true, msg: 'Career closed.' }; }

  // ---------- achievements ----------
  const ACH = [['win1', 'First of many', 'Win your first competitive match.'], ['rout', 'Statement made', 'Win a match by five goals or more.'], ['derby', 'Bragging rights', 'Win a derby.'], ['ten', 'Backs to the wall', 'Win a match after having a player sent off.'], ['late', 'Late show', 'Win by one goal with a winner in the 88th minute or later.'], ['comeback', 'Never in doubt', 'Win after being two goals down.'], ['pens', 'Nerves of steel', 'Win a penalty shoot-out.'], ['hat', 'Match ball', 'Have a player score a hat-trick.'], ['giant', 'Giant killing', 'Beat a side rated eight or more above yours.'], ['cs5', 'Brick wall', 'Keep five clean sheets in a row.'], ['unb15', 'Hard to beat', 'Go 15 matches unbeaten.'], ['win8', 'On a roll', 'Win eight matches in a row.'], ['m100', 'Century', 'Manage 100 competitive matches in one career.'],
    ['tro1', 'Silverware', 'Win any trophy.'], ['title', 'Champions', 'Win a league title.'], ['cup', 'Cup kings', 'Win the domestic cup.'], ['euro', 'Continental', 'Win a European trophy.'], ['double', 'The Double', 'Win the league and the domestic cup in one season.'], ['treble', 'The Treble', 'League, domestic cup and Champions League in one season.'], ['promo', 'Going up', 'Win promotion.'], ['invinc', 'Invincibles', 'Go a league season unbeaten.'], ['cent', 'Relentless', 'Average 2.55 points a game over a league season.'], ['over', 'Overachiever', 'Finish six or more places above the board target.'], ['boot', 'Golden boot', 'Have a player score 25 in a season.'], ['surv', 'Great escape', 'Stay up after starting on minus 12 points.'],
    ['acad', 'Class act', 'Promote three academy players in one career.'], ['sale', 'Cashing in', 'Sell a player for €40M or more.'], ['wonder', 'Eye for talent', 'A player you spotted at 21 or younger improves by 10.'], ['journey', 'Journeyman', 'Manage three different clubs in one career.'], ['s5', 'Part of the furniture', 'Complete five seasons in a row at one club.'], ['hard', 'Proving ground', 'Finish a season on Hard or above without being sacked.'], ['legend', 'Legend', 'Win a league title on Legendary.'], ['iron3', 'Iron will', 'Complete three seasons of an Ironman career.'], ['daily', 'Showing up', 'Finish a daily challenge.'], ['dailyw', 'Job done', 'Hit the target in a daily challenge.'], ['friend', 'Among friends', 'Beat a friend\'s team.']];
  const UNLOCK = { hard: 'Legendary difficulty', tro1: 'the Bare bones scenario', acad: 'the Academy only scenario', comeback: 'the Injury crisis scenario' };
  function award(id) {
    if (!S.ach) S.ach = {}; if (S.ach[id] || (S.dc && !S.dc.ready)) return; const a = ACH.find(x => x[0] === id); if (!a) return;
    S.ach[id] = S.season; (S.achNew = S.achNew || []).push(id); msg('Achievement: ' + a[1] + '. ' + a[2] + (UNLOCK[id] ? ' This unlocks ' + UNLOCK[id] + ' for new careers.' : ''), 'win');
  }
  function achMatch(m, opp) {
    if (S.dc && !S.dc.ready) return; const us = m.h === S.user, side = us ? 0 : 1, gf = us ? m.gh : m.ga, ga = us ? m.ga : m.gh, R = S.rec, u = S.C[S.user], O = S.C[opp];
    R.cs = ga === 0 ? (R.cs || 0) + 1 : 0; if (R.cs >= 5) award('cs5'); if ((R.run || 0) >= 15) award('unb15'); if ((R.wrun || 0) >= 8) award('win8'); if (S.mg.p >= 100) award('m100');
    if (m.res !== 'W') return; award('win1'); if (gf - ga >= 5) award('rout'); if (m.derby) award('derby'); if (m.note === 'pens') award('pens'); if (O.rep - u.rep >= 8) award('giant');
    if ((m.ev || []).some(e => e[1] === 'r' && e[2] === side)) award('ten');
    const sc = (m.sc || []).slice().sort((a, b) => a[1] - b[1]), by = {}; let a = 0, b = 0, down = 0, last = 0;
    for (const g of sc) { if (g[2] === side) { a++; last = g[1]; by[g[0]] = (by[g[0]] || 0) + 1; if (by[g[0]] >= 3) award('hat'); } else b++; if (b - a >= 2) down = 1; }
    if (down) award('comeback'); if (gf - ga === 1 && last >= 88 && m.note !== 'pens') award('late');
  }
  function achSeason(rec) {
    if (S.dc) return; const d = dmin(), tro = rec.tro || [];
    if (tro.length) award('tro1'); if (rec.pos === 1) award('title'); if (rec.cupW) award('cup'); if (tro.some(t => S.eu.some(E => E.n === t))) award('euro');
    if (rec.pos === 1 && rec.cupW) { award('double'); if (tro.indexOf('Champions League') >= 0) award('treble'); }
    if (rec.mv === 'Promoted') award('promo'); const gp = rec.w + rec.d + rec.l; if (gp >= 20 && rec.l === 0) award('invinc'); if (gp >= 20 && rec.pts >= 2.55 * gp) award('cent');
    if (rec.bp && rec.bp - rec.pos >= 6) award('over'); if (rec.ts && rec.ts[1] >= 25) award('boot');
    if (S.scn === 'ded' && S.hist.length === 1 && rec.mv !== 'Relegated') award('surv');
    if (!S.fired) { if (d >= 2) award('hard'); if (d === 3 && rec.pos === 1) award('legend'); if (S.opts.iron && S.hist.length >= 3) award('iron3'); }
    if (S.hist.length >= 5 && S.hist.slice(-5).every(h => h.club === rec.club)) award('s5');
    if (spotted().some(x => x.gain >= 10)) award('wonder');
  }

  // ---------- records in reach, and players you spotted early ----------
  function clubArch() { const n = S.C[S.user].n; return S.arch.filter(a => a.club === n); }
  function seasonRec(k) { let b = null; for (const ar of clubArch()) for (const r of ar.rows) if (!b || r[k] > b[1]) b = [r[1], r[k], ar.s, r[0]]; return b && b[1] > 0 ? b : null; }
  function allTime() { const m = new Map(); for (const ar of clubArch()) for (const r of ar.rows) { const x = m.get(r[0]) || { id: r[0], n: r[1], g: 0, ap: 0 }; x.g += r[7]; x.ap += r[5] + r[6]; m.set(r[0], x); } for (const p of S.C[S.user].sq) { const x = m.get(p.id) || { id: p.id, n: p.n, g: 0, ap: 0 }; x.g += p.ss[1]; x.ap += p.ss[0] + p.ss[9]; x.here = 1; m.set(p.id, x); } return Array.from(m.values()); }
  function flash(x) { (S.flash = S.flash || []).push(x); if (S.flash.length > 6) S.flash.shift(); }
  function chaseFx(m) {
    if (S.dc) return; const us = m.h === S.user, side = us ? 0 : 1, R = S.rec, u = S.C[S.user];
    if (m.res === 'L') R.pb = R.best || 0; else if ((R.pb || 0) >= 6 && R.run === R.pb + 1) { flash('New record: ' + R.run + ' matches unbeaten.'); story('Set a new unbeaten record under ' + S.mg.n + ': ' + R.run + ' matches.'); news('RECORD', u.n + ' set a new unbeaten record', u.n + ' are now ' + R.run + ' matches without defeat, the longest run of ' + S.mg.n + '\'s time in charge. The previous best was ' + R.pb + '.', S.user); }
    for (const k of [7, 8]) { const rec = seasonRec(k); if (!rec || rec[1] < 8) continue; const by = {}; for (const g of m.sc || []) { if (g[2] !== side) continue; const id = k === 7 ? g[0] : g[3]; if (id > 0) by[id] = (by[id] || 0) + 1; }
      for (const id in by) { const p = X.PM.get(+id); if (!p || p.c !== S.user) continue; const now = k === 7 ? p.ss[1] : p.ss[2], before = now - by[id], w = k === 7 ? 'goals' : 'assists';
        if (before <= rec[1] && now > rec[1]) { flash('Club record: ' + p.n + ' has ' + now + ' ' + w + ' this season.'); story(p.n + ' broke the club record for ' + w + ' in a season (' + rec[1] + ', ' + rec[0] + ').'); news('RECORD', p.n + ' breaks the ' + u.n + ' ' + w + ' record', p.n + ' now has ' + now + ' ' + w + ' this season, passing the ' + rec[1] + ' that ' + rec[0] + ' managed in ' + rec[2] + '/' + String(rec[2] + 1).slice(2) + '. No ' + u.n + ' player has had more in a season under ' + S.mg.n + '.', S.user); }
        else if (before < rec[1] && now === rec[1]) flash(p.n + ' has equalled the club record of ' + rec[1] + ' ' + w + ' in a season.'); } }
  }
  function chase() {
    const out = [], u = S.C[S.user], R = S.rec || {}, L = S.L[u.l];
    for (const k of [7, 8]) { const rec = seasonRec(k), w = k === 7 ? 'goals' : 'assists'; if (!rec || rec[1] < 8) continue; for (const p of u.sq) { const v = k === 7 ? p.ss[1] : p.ss[2]; if (v >= 5 && v <= rec[1] && rec[1] - v <= 5) out.push({ k: 'season', id: p.id, x: p.n + ' has ' + v + ' ' + w + ' this season. The record is ' + rec[1] + ' (' + rec[0] + ', ' + rec[2] + '/' + String(rec[2] + 1).slice(2) + ').', left: rec[1] - v + 1, cur: v, rec: rec[1] }); else if (v > rec[1]) out.push({ k: 'season', id: p.id, x: p.n + ' holds the new record for ' + w + ' in a season: ' + v + ' and counting.', left: 0, cur: v, rec: rec[1], done: 1 }); } }
    if (clubArch().length) { const at = allTime().sort((a, b) => b.g - a.g), top = at[0]; if (top && top.g >= 15) for (const x of at.slice(1, 6)) if (x.here && top.g - x.g <= 8 && x.g >= 10) out.push({ k: 'alltime', id: x.id, x: x.n + ' has ' + x.g + ' goals for the club. ' + top.n + ' leads the all-time list with ' + top.g + '.', left: top.g - x.g + 1, cur: x.g, rec: top.g }); }
    if ((R.best || 0) >= 6 && (R.run || 0) >= R.best - 3 && R.run > 0) out.push({ k: 'run', x: R.run >= R.best ? 'Unbeaten in ' + R.run + ': the longest run of your time here, and still going.' : 'Unbeaten in ' + R.run + '. The record is ' + R.best + '.', left: Math.max(0, R.best - R.run + 1), cur: R.run, rec: R.best, done: R.run >= R.best ? 1 : 0 });
    if ((R.wbest || 0) >= 4 && (R.wrun || 0) >= R.wbest - 2 && R.wrun > 1) out.push({ k: 'wrun', x: R.wrun >= R.wbest ? R.wrun + ' wins in a row: a new best.' : R.wrun + ' wins in a row. The record is ' + R.wbest + '.', left: Math.max(0, R.wbest - R.wrun + 1), cur: R.wrun, rec: R.wbest, done: R.wrun >= R.wbest ? 1 : 0 });
    { const H = S.hist.filter(h => h.club === u.n && h.lg === L.n), row = L.tbl[S.user]; let bp = 0; for (const h of H) if (h.pts > bp) bp = h.pts; const tot = L.rounds ? L.rounds.length : 0, pts = row ? row[6] - ((L.ded && L.ded[S.user]) || 0) : 0; if (bp && row && row[0] >= 10 && row[0] < tot) { const pace = Math.round(pts / row[0] * tot); if (pace > bp) out.push({ k: 'pts', x: 'On course for ' + pace + ' points. The best under you in this division is ' + bp + '.', left: bp + 1 - pts, cur: pts, rec: bp }); } }
    return out;
  }
  function spot(p) { if (!p || p.a > 21 || p.c === S.user || p.c < -1) return; if (!S.spot) S.spot = []; if (S.spot.some(x => x.id === p.id)) return; S.spot.unshift({ id: p.id, s: S.season, o: Math.round(p.o), a: p.a, v: value(p), c: p.c }); if (S.spot.length > 60) S.spot.length = 60; }
  function spotted() { if (!S.spot) S.spot = []; S.spot = S.spot.filter(x => { const p = X.PM.get(x.id); return p && p.c >= -1; }); return S.spot.map(x => { const p = X.PM.get(x.id); return { p, x, gain: Math.round(p.o) - x.o, v: value(p) }; }); }

  // ---------- daily challenge: the same seeded run-in for everyone ----------
  const DCL = ['Premier League', 'EFL Championship', 'LaLiga', 'LaLiga 2', 'Bundesliga', 'Bundesliga 2', 'Serie A', 'Serie B', 'Ligue 1', 'Ligue 2'], DCDOWN = ['EFL Championship', 'Bundesliga 2'];
  const DCT = { escape: ['The great escape', 'Avoid relegation'], title: ['Title run-in', 'Win the league'], europe: ['Race for Europe', 'Finish in the Champions League places'], promo: ['Promotion push', 'Win automatic promotion'] };
  let DCC = null;
  function dseed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dailyInfo(data, date) {
    if (DCC && DCC.date === date) return DCC; const sd = dseed('touchline-' + date), r = k => hash(sd % 1000003 + k * 7919);
    const names = DCL.filter(n => data.leagues.some(l => l.n === n)), ln = names[Math.floor(r(1) * names.length)], li = data.leagues.findIndex(l => l.n === ln), L = data.leagues[li];
    const by = {}; for (const p of data.players) { const c = data.clubs[p[4]]; if (c && c[1] === li) (by[p[4]] = by[p[4]] || []).push(p[7]); }
    const cl = Object.keys(by).map(Number).map(ci => { const t = by[ci].sort((a, b) => b - a).slice(0, 14); return [ci, t.reduce((a, b) => a + b, 0) / t.length]; }).sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(x => x[0]), n = cl.length;
    const x = r(2), type = L.t > 1 ? (x < 0.5 || DCDOWN.indexOf(ln) < 0 ? 'promo' : 'escape') : x < 0.4 ? 'escape' : x < 0.75 ? 'title' : 'europe';
    const club = type === 'escape' ? cl[n - 1 - Math.floor(r(3) * 5)] : type === 'title' ? cl[1 + Math.floor(r(3) * 4)] : type === 'europe' ? cl[5 + Math.floor(r(3) * 5)] : cl[2 + Math.floor(r(3) * 6)];
    return DCC = { date, seed: (sd & 0x7fffffff) || 7, li, lg: ln, type, title: DCT[type][0], goal: DCT[type][1], club, cn: data.clubs[club][0], gap: 3 + Math.floor(r(4) * 4), left: 10 };
  }
  function lgLeft(li) { let n = 0; for (let t = S.t; t < SLOTS; t++) for (const ev of S.sched[t] || []) if (ev[0] === 'L' && ev[1] === li) n++; return n; }
  function dailyStart(data, date, name) {
    const I = dailyInfo(data, date); newGame(data, { club: I.club, seed: I.seed, diff: 1, manager: name || 'Manager', cid: 'd' + date });
    S.dc = { date, type: I.type, li: S.C[S.user].l, gap: I.gap, left: I.left, tgt: 0, ready: 0, res: null }; S.opts.iron = 1; skipPre(); return S;
  }
  function dailyStep(k) {
    const dc = S.dc; if (!dc || dc.ready) return 1; const tot = S.L[dc.li].rounds.length; let g = 0;
    while (g++ < (k || 4) && lgLeft(dc.li) > dc.left) advance(true);
    const left = lgLeft(dc.li); if (left > dc.left) return clamp(1 - (left - dc.left) / Math.max(1, tot - dc.left), 0, 0.99);
    dailySet(); return 1;
  }
  function dailySet() {
    const dc = S.dc, li = dc.li, L = S.L[li], n = L.teams.length, z = zones(li), u = S.user, c = S.C[u];
    const tgt = dc.type === 'escape' ? n - Math.max(1, z.down) : dc.type === 'title' ? 1 : dc.type === 'europe' ? Math.max(1, z.cl || 4) : Math.max(1, z.up || 2);
    const others = table(li).filter(x => x !== u), line = others[tgt - 1], ded = x => (L.ded && L.ded[x]) || 0, lp = L.tbl[line][6] - ded(line), row = L.tbl[u], want = Math.max(0, lp - dc.gap) + ded(u);
    let g = 0; while (row[6] < want && g++ < 200) { if (want - row[6] >= 3 && row[3] > 0) { row[3]--; row[1]++; row[6] += 3; } else if (row[3] > 0) { row[3]--; row[2]++; row[6]++; } else if (row[2] > 0 && want - row[6] >= 2) { row[2]--; row[1]++; row[6] += 2; } else break; }
    g = 0; while (row[6] > want && g++ < 200) { if (row[6] - want >= 3 && row[1] > 0) { row[1]--; row[3]++; row[6] -= 3; } else if (row[2] > 0) { row[2]--; row[3]++; row[6]--; } else if (row[1] > 0 && row[6] - want >= 2) { row[1]--; row[2]++; row[6] -= 2; } else break; }
    dc.tgt = tgt; dc.line = line; dc.p0 = row[6]; dc.gd0 = row[4] - row[5]; dc.gap = Math.max(0, lp - (row[6] - ded(u))); dc.left = lgLeft(li); dc.ready = 1;
    S.mr = 55; S.mrf = 0; S.sack = null; S.fired = null; S.inbox = []; S.um = S.um.slice(-5); dc.um0 = S.um.length; S.rec = {}; S.story = []; S.ach = {}; S.achNew = []; S.jobs = []; S.flash = []; S.vowM = null; S.neg = {}; S.offers = []; S.loffers = []; S.pend = []; S.dd = 0;
    for (const p of c.sq) { p.inj = 0; p.sus = 0; p.kn = 0; p.fi = Math.max(p.fi, 94); p.sh = Math.max(p.sh || 0, 78); p.role = expRole(p, u); } c.auto = 1; c.xi = null; bestFormation(u);
    const T = DCT[dc.type]; story('Daily challenge, ' + dc.date + ': ' + T[0] + ' with ' + c.n + '.');
    mail('Club owner', T[0] + ': ' + dc.left + ' games to go', 'You have walked into ' + c.n + ' with ' + dc.left + ' league games left. We are ' + dc.gap + ' point' + (dc.gap === 1 ? '' : 's') + ' behind ' + S.C[line].n + ', and we need to finish above them to ' + T[1].toLowerCase() + '. The window is shut, so it is this squad or nothing. Cup ties are handled by your assistant. Every manager playing today starts from exactly this position.');
  }
  function dailyEnd() {
    const dc = S.dc, L = S.L[dc.li], row = L.tbl[S.user], pos = table(dc.li).indexOf(S.user) + 1, pts = row[6] - dc.p0, gd = row[4] - row[5] - dc.gd0, ok = pos <= dc.tgt; let w = 0, d = 0, l = 0;
    for (const m of S.um.slice(dc.um0 || 0)) if (m.comp === L.n) { if (m.res === 'W') w++; else if (m.res === 'D') d++; else l++; }
    dc.res = { sc: Math.max(0, pts * 25 + gd * 5 + (ok ? 300 : 0)), pos, pts, gd, ok, w, d, l }; award('daily'); if (ok) award('dailyw');
    S.over = { why: 'daily', s: S.season, t: S.t }; story((ok ? 'Target hit' : 'Target missed') + ': finished ' + ord_(pos) + ' after taking ' + pts + ' points from the run-in.');
  }
  function dailyView() { const dc = S.dc; if (!dc) return null; const L = S.L[dc.li], row = L.tbl[S.user], T = DCT[dc.type]; return { date: dc.date, type: dc.type, title: T[0], goal: T[1], tgt: dc.tgt, line: dc.line, left: dc.ready ? lgLeft(dc.li) : dc.left, gap: dc.gap, pts: dc.ready ? row[6] - dc.p0 : 0, gd: dc.ready ? row[4] - row[5] - dc.gd0 : 0, pos: table(dc.li).indexOf(S.user) + 1, ready: dc.ready, res: dc.res }; }

  // ---------- friend teams: export your squad as a code, play someone else's ----------
  let GH = null;
  function b64e(s) { s = unescape(encodeURIComponent(s)); return typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'); }
  function b64d(b) { const s = typeof atob !== 'undefined' ? atob(b) : Buffer.from(b, 'base64').toString('binary'); return decodeURIComponent(escape(s)); }
  function teamCode() {
    const u = S.C[S.user], x = pickXI(S.user), pl = x.pl.filter(Boolean).concat(x.bench).slice(0, 20);
    return 'TL1-' + b64e(JSON.stringify({ v: 1, m: S.mg.n, c: u.n, k: [u.k1, u.k2], f: u.f, t: (u.tac || [0, 1, 1, 0]).slice(), sc: careerScore(), se: S.hist.length, a: Math.round(x.avg * 10) / 10, p: pl.map(p => [p.n, p.a, p.nat, p.p, p.al || [], Math.round(p.o * 10) / 10, p.st.map(Math.round), p.sm, p.wf, p.sty || [], p.ft]) }));
  }
  function teamParse(code) {
    try {
      const s = String(code || '').replace(/\s+/g, ''); if (s.slice(0, 4) !== 'TL1-' || s.length > 20000) return null; const o = JSON.parse(b64d(s.slice(4)));
      const int = (v, a, b, d) => (typeof v === 'number' && isFinite(v) ? clamp(Math.round(v), a, b) : d), str = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[<>&"']/g, '').slice(0, n), hex = v => /^[0-9a-fA-F]{6}$/.test(v) ? v : '5b6779';
      if (!o || !Array.isArray(o.p) || o.p.length < 11 || o.p.length > 20) return null;
      const T = { m: str(o.m, 30) || 'Manager', c: str(o.c, 40) || 'Unknown FC', k: [hex(o.k && o.k[0]), hex(o.k && o.k[1])], f: FORMS[o.f] ? o.f : '4-3-3', t: [int(o.t && o.t[0], -2, 2, 0), int(o.t && o.t[1], 0, 2, 1), int(o.t && o.t[2], 0, 2, 1), int(o.t && o.t[3], 0, 3, 0)], sc: int(o.sc, 0, 1e7, 0), se: int(o.se, 0, 200, 0), a: 0, p: [] };
      for (const r of o.p) { if (!Array.isArray(r) || !Array.isArray(r[6]) || r[6].length !== 6) return null; T.p.push([str(r[0], 40) || 'Player', int(r[1], 15, 45, 25), int(r[2], 0, D.nats.length - 1, 0), int(r[3], 0, 11, 6), (Array.isArray(r[4]) ? r[4] : []).slice(0, 4).map(v => int(v, 0, 11, 6)), typeof r[5] === 'number' && isFinite(r[5]) ? clamp(r[5], 30, 95) : 60, r[6].map(v => int(v, 20, 99, 60)), int(r[7], 1, 5, 3), int(r[8], 1, 5, 3), (Array.isArray(r[9]) ? r[9] : []).slice(0, 12).map(v => int(v, 0, 299, 0)), int(r[10], 0, 2, 1)]); }
      if (!T.p.some(r => r[3] === 0)) return null; const os = T.p.map(r => r[5]).sort((a, b) => b - a).slice(0, 11); T.a = Math.round(os.reduce((a, b) => a + b, 0) / 11 * 10) / 10; return T;
    } catch (e) { return null; }
  }
  function ghostClub(T, base) {
    const gi = S.C.length, sq = T.p.map((r, i) => { const p = { id: base + i, n: r[0], a: r[1], nat: r[2], c: gi, p: r[3], al: r[4], o: r[5], pot: Math.round(r[5]), gp: 0, st: r[6], sm: r[7], wf: r[8], ft: r[10], w: 0, cy: 1, mo: 60, fi: 100, sh: 80, fm: 0, inj: 0, tl: 0, idle: 0, ss: SS0(), car: [0, 0, 0], hs: [], j: 0, sty: r[9] }; p.p0 = p.pot; styleCalc(p); return p; }).sort((a, b) => b.o - a.o);
    const c = { n: T.c, l: -1, ctry: '', eu: 0, k1: T.k[0], k2: T.k[1], f: T.f, bal: 0, wb: 0, rep: 0, auto: 1, xi: null, tac: T.t, sq, gh: 1, mgr: { n: T.m, s: S.season } }; c.rep = calcRep(c);
    S.C.push(c); for (const p of sq) X.PM.set(p.id, p); return gi;
  }
  // o (optional): { home: you are the home side, comp, rd, seed: mixed into the dice so a replay is not a copy }
  function ghostBegin(code, o) {
    if (LM) return { ok: false, msg: 'Finish the current match first.' }; if (S.fired || S.over) return { ok: false, msg: 'You need a club first.' }; if (S.dd > 0) return { ok: false, msg: 'Not on deadline day.' }; if (GH) ghostClear();
    const T = teamParse(code); if (!T) return { ok: false, msg: 'That is not a valid team code.' }; const u = S.C[S.user]; o = o || {};
    if (u.sq.filter(p => !p.inj && !p.sus).length < 11) return { ok: false, msg: 'You do not have eleven fit players.' };
    const snap = { rs: S.rs, inbox: S.inbox.slice(), mid: S.mid, news: S.news.slice(), pl: u.sq.map(p => [p, p.fi, p.sh, p.fs ? p.fs.slice() : null, p.inj, p.kn, p.mo, p.fm, p._pl, p._r]) };
    if (o.seed) S.rs = (S.rs ^ (o.seed | 0)) | 0;
    const gi = ghostClub(T, 8000000); GH = { gi, snap, T, done: 0 };
    LM = lmCreate(S.user, gi, o.home ? { fr: 1 } : { fr: 1, neutral: 1 }); LM.rec = 1; LM.comp = o.comp || 'Friend challenge'; LM.rd = o.rd || 'v ' + T.m; LM.asst = S.opts.asub ? 1 : 0; return { ok: true, lm: 1, msg: '' };
  }
  // league fixture between two friends' teams, neither of them yours: played out at once and left no trace in the career
  function ghostPair(codeH, codeA, seed) {
    if (LM || GH) return null; const TH = teamParse(codeH), TA = teamParse(codeA); if (!TH || !TA) return null;
    const rs = S.rs, n0 = S.C.length; S.rs = (S.rs ^ (seed | 0)) | 0; let r = null;
    try { const hi = ghostClub(TH, 8000000), ai = ghostClub(TA, 8000100), lm = lmCreate(hi, ai, { fr: 1 }, 1); lm.auto = 1; lmStep(lm, 200); lmStep(lm, 200); lmFinish(lm); r = { gh: lm.H.g, ga: lm.A.g, gl: lm.sc.map(x => { const p = X.PM.get(x[0]); return [p ? p.n : '', x[1], x[2]]; }) }; }
    finally { for (let i = n0; i < S.C.length; i++) for (const p of S.C[i].sq) X.PM.delete(p.id); S.C.length = n0; S.rs = rs; }
    return r;
  }
  function ghostEnd() {
    const lm = LM; if (!lm || !GH) return null; lm.rec = 0; if (!lm.done) { lm.auto = 1; lmStep(lm, 200); lmStep(lm, 200); } const r = lmFinish(lm); LM = null; const sn = GH.snap;
    S.rs = sn.rs; S.inbox = sn.inbox; S.mid = sn.mid; S.news = sn.news; for (const x of sn.pl) { const p = x[0]; p.fi = x[1]; p.sh = x[2]; if (x[3]) p.fs = x[3]; else delete p.fs; p.inj = x[4]; p.kn = x[5]; p.mo = x[6]; p.fm = x[7]; p._pl = x[8]; p._r = x[9]; }
    r.ghost = 1; r.res = r.gh > r.ga ? 'W' : r.gh < r.ga ? 'L' : 'D'; r.vs = { m: GH.T.m, c: GH.T.c }; r.gl = lm.sc.map(x => { const p = X.PM.get(x[0]); return [p ? p.n : '', x[1], x[2]]; }); GH.done = 1; if (r.res === 'W') award('friend'); return r;
  }
  function ghostClear() { if (!GH) return; const c = S.C[GH.gi]; if (c && c.gh) { for (const p of c.sq) X.PM.delete(p.id); S.C.length = GH.gi; } GH = null; }
  function abandoned() {
    if (!S.lv || LM) return null; S.lv = 0; if (S.over || S.fired) return null; const b = liveBegin(); if (!b.lm) { S.lv = 0; return null; }
    LM.asst = 1; const r = liveEnd(); msg('You left the dugout while the match was being played, so your assistant saw it out. In ' + (S.dc ? 'a daily challenge' : 'Ironman') + ' a match cannot be replayed.', 'ev'); return r;
  }
  function takeNew() { const a = S.achNew || []; S.achNew = []; return a; }
  function takeFlash() { const a = S.flash || []; S.flash = []; return a; }
  function v7up() {
    if (!S.ach) S.ach = {}; S.achNew = []; if (!S.spot) S.spot = []; S.flash = []; S.nsack = S.story.filter(e => /^Sacked by /.test(e.x)).length; S.nprom = S.nprom || 0; S.dc = null; S.over = null; S.lv = 0; S.dmin = S.opts.diff === undefined ? 1 : S.opts.diff; S.opts.iron = 0; if (!S.cid) S.cid = 'c' + ((S.rs >>> 0) ^ (S.start * 2654435761 >>> 0)).toString(36) + S.hist.length;
    for (const h of S.hist) if (h.sc === undefined) { const L = S.L.find(x => x.n === h.lg); h.sc = seasonScore(h, L ? L.lvl || 65 : 65, 0, S.dmin, 0); h.df = S.dmin; }
    msg('New in this version: a career score, Ironman mode, a daily challenge, achievements that unlock new scenarios, records in reach, a friends leaderboard, matches against a friend\'s team, and crowd noise during games. It is all under the Compete tab.', 'info');
  }

  // ================= positional match engine: 22 players and a ball on a 105 x 68 metre pitch =================
  // Home attacks towards x = 105. "Own frame" for a side: u = distance from its own goal line, v = distance from its own left touchline.
  const PMC = { risk: 1, S: 1, KP: 16, KT: 16, KS: 27, KI: 16, KD: 17, passB: 4.3, prP: 1.0, react: 0.5, icpt: 0.12, keepV: 0.012, longP: 0.0007, thinkA: 1.2, thinkB: 1.5, mkBox: 0.25, tkWin: 0.15, tkR: 1.6, tkP: 0.06, tkD: 0.17, jock: 2.3, vmK: 0.9, farIn: 0.4, idio: 0.6, boxEng: 24, recI: 0.25, boxFoul: 0.12, boxCarry: 0.35, mLine: 1.5, dmUp: 0.2, run1: 0.55, run2: 0.55, amUp: 0.1, amBack: 0.08, mLen: 0.1, mTr: 0.5, trG: 14, mTw: 0.24, lenL: 4, foul: 0.3, carry: 0.8, shotW: 0.9, yel: 0.17, think: 1.25, xgA: 0.455, xgD: 9, onB: 0.36, drain: 0.0051, lag: 1.6, clk: 1.18, recP: 3.2, boxI: 2.5, boxLine: 15, thruP: 1.3, thruM: 0.2, brk: 0.11, crowd: 0.84, crowd2: 0.875, c2R: 10, freeD: 8.5, trW: 3.5, trD: 0.35, trV: 0.005, lenA: 10, lenB: 0.42, shoRef: -5, shotThr: 0.06, longThr: 0.24, pacL: 0.6, pacT: 0.5, longB: 0.014, temp: 0.014, blk: 0.34, hold: 1 };
  // small rating offsets [attack, defence] that keep the seven shapes level with each other in the positional engine
  const PFB = { '4-2-3-1': [1.8, 0], '4-4-2': [0.5, 1.5], '4-3-3': [1, 0], '3-5-2': [-1, 0], '3-4-3': [0, -1.5] };
  const PDT = 0.2, psig = x => 1 / (1 + Math.exp(-x));
  const PMV = { 2: 8, 3: 60, 7: 7, 8: 61, 9: 6, 10: 62 }, PMSP = { 0: [[34]], 1: [[34], [25, 43], [21, 34, 47]], 4: [[34], [26, 42], [22, 34, 46]], 5: [[34], [24, 44], [20, 34, 48]], 6: [[34], [26, 42], [22, 34, 46]], 11: [[34], [26, 42], [21, 34, 47]] };
  const PFR_OUT = [0, 0, 0.04, 0.04, 0.3, 0.5, 0.7, 0.55, 0.55, 0.8, 0.8, 1], PFR_IN = [0, 0, 0.24, 0.24, 0.26, 0.5, 0.82, 0.78, 0.78, 0.92, 0.92, 1];
  const PMRB = { 'Sweeper keeper': { gk: 1 }, 'Ball-playing keeper': { gk: 0.5, sgk: 1 }, 'Ball-playing defender': { fi: 0.04, risk: -0.15, cry: 0.2 }, 'Stopper': { mk: 0.25, prs: 0.3 }, 'Wide back': { wide: 0.5, fi: 0.05 },
    'Wingback': { fi: 0.2, fo: 0.03, crs: 0.3 }, 'Inverted fullback': { inv: 1, fi: 0.08 }, 'Attacking wingback': { fi: 0.32, fo: 0.06, crs: 0.4, run: 0.3 },
    'Holding midfielder': { hold: 1, fi: -0.06, fo: -0.04 }, 'Deep-lying playmaker': { fi: -0.04, come: 1, risk: -0.1, thr: 0.3 }, 'Centre-half': { hold: 1, fi: -0.12, fo: -0.12 }, 'Box crasher': { fi: 0.12, late: 1, sh: -0.2 },
    'Box-to-box': { fi: 0.08, fo: -0.03, late: 0.5 }, 'Playmaker': { come: 1, thr: 0.4, risk: -0.15 }, 'Half-winger': { wide: 0.6, fi: 0.06, crs: 0.2 }, 'Shadow striker': { fi: 0.1, late: 1, run: 0.6, sh: -0.25 }, 'Classic 10': { come: 0.6, thr: 0.5, fo: 0.1, lazy: 1 },
    'Winger': { wide: 1, crs: 0.4, drb: 0.3 }, 'Wide midfielder': { fo: -0.06, fi: -0.04 }, 'Wide playmaker': { inv: 0.5, thr: 0.4, come: 0.5 }, 'Inside forward': { inv: 0.8, run: 0.5, sh: -0.25 },
    'Advanced forward': { run: 0.8 }, 'Poacher': { run: 1, sh: -0.3, lazy: 1 }, 'Target forward': { tgt: 1, run: 0.2 }, 'False nine': { drop: 1, thr: 0.4, run: 0.1 } };
  const PINS = [['Mark tightly', 'Sticks to the nearest attacker instead of holding his zone.'], ['Press harder', 'Closes the ball down from further away. Costs energy.'], ['Shoot on sight', 'Takes shots from positions others would pass from.'], ['Play it safe', 'Chooses the simple pass and avoids risk.'], ['Take players on', 'Runs with the ball instead of releasing it.'], ['Hold position', 'Stays in his slot: no forward runs, no roaming.']];
  const pmHyp = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  function pmC(lm, k) { const c = lm.pm.cn || (lm.pm.cn = {}); c[k] = (c[k] || 0) + 1; }
  function pmOn(o) { return !(S.opts && S.opts.pm === 0); }
  function pmMin(lm) { const M = lm.pm; return clamp(Math.ceil(M.t / 60), M.p0 + 1, M.p1); }
  function pmXt(s, x, y) { const d = Math.hypot((s ? x : 105 - x), (34 - y) * 1.15); return 0.003 + 0.27 * Math.exp(-d / 15); }
  function pmInit(lm) {
    const M = lm.pm = { t: 0, p0: 0, p1: 45, add: 60 + ri(0, 120), half: 1, E: [new Array(11).fill(null), new Array(11).fill(null)], B: { st: 'dead', x: 52.5, y: 34, z: 0, h: null }, side: 0, gain: 0, lastMin: 0, tick: 0, pt: [0, 0], next: 60, fr: [], fe: [], hl: [], cuts: [], lastShot: -99, pstart: 0, prev: null, prev2: null, mu: { pas: 65, dri: 65, def: 65, sho: 60, phy: 68, pac: 70, ov: 72 },
      px: { ter: [[0, 0, 0], [0, 0, 0]], ch: [[0, 0, 0], [0, 0, 0]], reg: [[0, 0, 0], [0, 0, 0]], shots: [], ap: [new Float32Array(33), new Float32Array(33)], line: [0, 0, 0, 0], thr: [0, 0], drb: [[0, 0], [0, 0]], air: [[0, 0], [0, 0]], dist: [0, 0] }, inj: 0 };
    // rating-point offsets that used to be multipliers on expected goals: home advantage, staff, difficulty, cohesion, weather
    const H = lm.H, A = lm.A, o = lm.o, fr = o.fr, ln = x => 15 * Math.log(x);
    const sa = T => 0.008 * staffLv(T.ci, 'att') + 0.004 * staffLv(T.ci, 'mid') + (T.mine && S.staff && S.staff.att && S.staff.att.sty === T.tac[3] ? 0.008 : 0), sd = T => 0.008 * staffLv(T.ci, 'def') + 0.004 * staffLv(T.ci, 'mid') + 0.003 * staffLv(T.ci, 'gk');
    H.ao = ln((o.neutral ? 1 : 1.12) * (1 + sa(H))); A.ao = ln((o.neutral ? 1 : 0.88) * (1 + sa(A))); H.dfo = -ln(1 - sd(H)); A.dfo = -ln(1 - sd(A));
    if (H.mine && !o.neutral && !fr && S.inc) H.ao += ln(S.inc.tp === 0 ? 1.015 : S.inc.tp === 2 ? 0.99 : 1);
    if (lm.wx) { const f = ln(lm.wx === 2 ? 0.9 : 0.96); H.ao += f; A.ao += f; }
    if (!fr && (H.mine || A.mine)) { const dd = dq(), co = cohesion() * 0.02, U = H.mine ? H : A; U.ao += ln(dd.lam * (1 + co)); U.dfo -= ln(dd.opp * (1 - co * 0.5)); }
    // AI managers do not start a positional match with a plan that is suicidal for the matchup
    for (const T of [H, A]) { if (T.mine) continue; const O = T === H ? A : H, d = (T.avg || 0) - (O.avg || 0), tc = T.tac; if (tc[0] > 1) tc[0] = 1; if (d < -2 && tc[0] > 0) tc[0] = 0; if (d < -5 && tc[0] > -1) tc[0] = -1; if (tc[1] === 2 && (d < -2 || (T.dpace || 65) < (O.apace || 70) - 8)) tc[1] = 1; }
    pmSync(lm); pmSetKick(lm, 0, 0);
  }
  function pmBase(T) { const cnt = {}, idx = {}, out = []; for (let k = 0; k < 11; k++) { const sl = T.slots[k]; if (PMV[sl] === undefined) cnt[sl] = (cnt[sl] || 0) + 1; } for (let k = 0; k < 11; k++) { const sl = T.slots[k]; let v = PMV[sl]; if (v === undefined) { const n = cnt[sl], i = idx[sl] = idx[sl] === undefined ? 0 : idx[sl] + 1, tb = PMSP[sl] || PMSP[5]; v = (tb[Math.min(n, tb.length) - 1] || [34])[Math.min(i, 2)]; } out.push(v); } return out; }
  function pmSync(lm) {
    const M = lm.pm; let n = 0; const mu = { pas: 0, dri: 0, def: 0, sho: 0, phy: 0, pac: 0, ov: 0 }, tm = [{ pas: 0, dri: 0, def: 0, sho: 0, phy: 0, pac: 0, ov: 0, n: 0, gk: 0 }, { pas: 0, dri: 0, def: 0, sho: 0, phy: 0, pac: 0, ov: 0, n: 0, gk: 0 }];
    for (let s = 0; s < 2; s++) {
      const T = s ? lm.A : lm.H, E = M.E[s], base = pmBase(T), old = new Map(); for (const e of E) if (e) old.set(e.L, e); T.nfb = T.slots.indexOf(2) < 0 && T.slots.indexOf(3) < 0 ? 1 : 0; T.ncb = T.slots.filter(x => x === 1).length; T.n3 = T.slots.filter(x => LINE[x] === 3).length; T.ndm = T.slots.filter(x => x === 4).length; T.ncm = T.slots.filter(x => x === 5).length;
      for (let k = 0; k < 11; k++) {
        const L = T.cur[k]; if (!L) { E[k] = null; continue; }
        let e = old.get(L); const sl = T.slots[k];
        if (!e) { const u0 = 8 + PFR_OUT[sl] * 30, v0 = base[k]; e = { s, k, x: s ? 105 - u0 : u0, y: s ? 68 - v0 : v0, vx: 0, vy: 0, tx: 0, ty: 0, ur: 0.6, think: 0, stun: 0, cd: 0, run: 0, prot: 0, dm: 0, ofe: gauss() * 0.7, car: null }; if (L.on > 0 && M.tick > 0) { e.x = 52.5; e.y = s ? 67 : 1; } }
        E[k] = e; e.k = k; e.L = L; e.p = L.p; e.sl = sl; e.v0 = base[k]; e.fo = (T.fo && T.fo[k]) || 0; e.ins = (T.ins && T.ins[k]) || 0;
        const rd = ROLEDEF[sl][T.rl[k] || 0] || ROLEDEF[sl][0]; e.rb = PMRB[rd[0]] || {}; e.rn = rd[0];
        const p = L.p, bst = T.bst || 0, adj = lmR(L) + (T.rl[k] ? roleFit(p, sl, T.rl[k]) : 0) - p.o + bst, gkp = p.p === 0;
        e.pac = clamp((gkp ? 45 + (p.st[4] - 40) * 0.3 : p.st[0]) + bst * (PMC.bstPace === undefined ? 1 : PMC.bstPace), 30, 99); e.sho = (gkp ? 25 : p.st[1]) + adj + (p.ks || 0) * 0.6; e.pas = (gkp ? p.st[2] - 8 : p.st[2]) + adj + (p.kp || 0) * 0.8; e.dri = (gkp ? 35 : p.st[3]) + adj; e.def = (gkp ? 30 : p.st[4]) + adj; e.phy = (gkp ? 65 : p.st[5]) + adj; e.gk = sl === 0 ? p.o + adj : 30; e.ov = p.o + adj;
        e.en = (L.en >= 62 ? 1 : 1 - 0.0045 * (62 - Math.max(L.en, 5))) * (sl === 0 ? 0.85 : 1);
        if (sl !== 0) { mu.pas += e.pas; mu.dri += e.dri; mu.def += e.def; mu.sho += e.sho; mu.phy += e.phy; mu.pac += e.pac; mu.ov += e.ov; n++; tm[s].pas += e.pas; tm[s].dri += e.dri; tm[s].def += e.def; tm[s].sho += e.sho; tm[s].phy += e.phy; tm[s].pac += e.pac; tm[s].ov += e.ov; tm[s].n++; } else tm[s].gk = e.gk;
      }
    }
    { const G = [null, {}, {}, {}], ks = ['pas', 'dri', 'def', 'sho', 'phy']; for (let ln = 1; ln <= 3; ln++) { const g = G[ln]; g.n = 0; for (const k of ks) g[k] = 0; } for (let s = 0; s < 2; s++) for (const e of M.E[s]) { if (!e || e.sl === 0) continue; const g = G[LINE[e.sl]]; g.n++; for (const k of ks) g[k] += e[k] - e.ov; }
      const b = 1 - PMC.idio; if (b > 0) { for (const k in mu) mu[k] = 0; for (let s = 0; s < 2; s++) { for (const k in tm[s]) if (k !== 'gk') tm[s][k] = 0; for (const e of M.E[s]) { if (!e || e.sl === 0) continue; const g = G[LINE[e.sl]]; for (const k of ks) e[k] -= b * (e[k] - e.ov - g[k] / g.n); for (const k in mu) { mu[k] += e[k]; tm[s][k] += e[k]; } tm[s].n++; } } } }
    if (n) for (const k in mu) M.mu[k] = mu[k] / n;
    { const g = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]; for (let s = 0; s < 2; s++) for (const e of M.E[s]) { if (!e || e.sl === 0) continue; const q = g[LINE[e.sl]]; q[0]++; q[1] += e.pac; q[2] += e.def; q[3] += e.dri; q[4] += e.sho; } const fw = g[2][0] + g[3][0];
      M.mu.dD = g[1][0] ? g[1][2] / g[1][0] : M.mu.def; M.mu.dA = fw ? (g[2][3] + g[3][3]) / fw : M.mu.dri; M.mu.sA = fw ? (g[2][4] + g[3][4]) / fw : M.mu.sho; M.mu.pl = [0, 1, 2, 3].map(i => g[i][0] ? g[i][1] / g[i][0] : M.mu.pac); }
    { const c = 1 - 1 / PMC.S, gm = tm[0].gk && tm[1].gk ? (tm[0].gk + tm[1].gk) / 2 : tm[0].gk || tm[1].gk || 70;
      M.mu.gk = gm; for (let s = 0; s < 2; s++) { const T = s ? lm.A : lm.H, t = tm[s], d = {}; for (const k of ['pas', 'dri', 'def', 'sho', 'phy', 'pac', 'ov']) d[k] = t.n ? (t[k] / t.n - M.mu[k]) * (k === 'pac' ? Math.max(c, PMC.pacT) : c) : 0; const dg = t.gk ? (t.gk - gm) * c : 0;
        const fb = PFB[T.f] || [0, 0], ao = T.ao + fb[0], dfo = T.dfo + fb[1] + (T.tdo || 0); for (const e of M.E[s]) { if (!e) continue; e.pas += ao - d.pas; e.dri += ao - d.dri; e.sho += ao - d.sho; e.def += dfo - d.def; e.phy -= d.phy; e.pac -= d.pac + PMC.pacL * ((M.mu.pl[LINE[e.sl]] || M.mu.pac) - M.mu.pac); e.ov -= d.ov; if (e.sl === 0) e.gk += dfo - dg; e.vm = (7.2 + PMC.vmK * clamp((e.pac - M.mu.pac) / 27.5, -1, 1)) * e.en; } } }
    { const h = M.B.h; if (h && M.E[h.s][h.k] !== h) { M.B.h = null; M.B.st = 'loose'; M.B.x1 = M.B.x; M.B.y1 = M.B.y; M.B.lt = M.side; } if (M.B.wait && M.E[M.B.wait.s][M.B.wait.k] !== M.B.wait) M.B.wait = null; }
  }
  const pmU = (s, x) => (s ? 105 - x : x), pmV = (s, y) => (s ? 68 - y : y);
  function pmPress(lm, e) { const O = lm.pm.E[1 - e.s]; let d1 = 99; for (const o of O) if (o && o.stun < lm.pm.t) { const d = pmHyp(e.x, e.y, o.x, o.y); if (d < d1) d1 = d; } return clamp((5.5 - d1) / 4.5, 0, 1); }
  function pmNearest(E, x, y, noGk, not) { let b = null, bd = 1e9; for (const e of E) { if (!e || e === not || (noGk && e.sl === 0)) continue; const d = pmHyp(e.x, e.y, x, y); if (d < bd) { bd = d; b = e; } } return b; }
  function pmGkOf(lm, s) { const E = lm.pm.E[s]; for (const e of E) if (e && e.sl === 0) return e; return null; }
  function pmOffLine(lm, s) { // world x of the offside line for attackers of side s
    const O = lm.pm.E[1 - s]; let a = 1e9, b = 1e9; for (const o of O) { if (!o) continue; const u = pmU(1 - s, o.x); if (u < a) { b = a; a = u; } else if (u < b) b = u; } const lu = Math.min(b === 1e9 ? 52.5 : b, 52.5); return s ? lu : 105 - lu; }
  function pmEv(lm, ty, side, a, b, x, y) { const M = lm.pm; lm.ev.push([pmMin(lm), ty, side, a, b]); if (lm.rec) M.fe.push([M.fr.length, lm.ev.length - 1, x === undefined ? M.B.x : x, y === undefined ? M.B.y : y]); }
  function pmHl(lm, kind, pad) { const M = lm.pm; if (!lm.rec) return; const n = M.fr.length; M.hl.push([Math.max(0, Math.min(M.pstart, n - 25), n - 75), n + (pad || 14), kind]); M.lastShot = M.tick; }
  function pmGive(lm, e, think) { const M = lm.pm, B = M.B; if (M.side !== e.s) { M.side = e.s; M.gain = M.t; M.gu = pmU(e.s, e.x); M.trw = (PMC.trW + clamp((55 - M.gu) / PMC.trG, 0, 4)) * (1 + PMC.mTw * (e.s ? lm.H : lm.A).tac[0]); M.pstart = M.fr.length; M.px.reg[e.s][Math.min(2, Math.floor(pmU(e.s, e.x) / 35))]++; M.prev = null; M.prev2 = null; } B.st = 'held'; B.h = e; B.x = e.x; B.y = e.y; B.z = 0; e.prot = M.t + 0.45; e.car = null; e.nc = 0; e.free = false;
    if (e.sl !== 0 && pmU(e.s, e.x) > 30 && (M.thruRec === e || (M.t - M.gain < (M.trw || PMC.trW) && M.gu !== undefined && M.gu < 60))) { const gx = e.s ? 0 : 105, dx = gx - e.x, dy = (34 - e.y) * 0.6, d = Math.hypot(dx, dy) || 1, cx = dx / d, cy = dy / d; let near = 99; for (const o of M.E[1 - e.s]) { if (!o || o.sl === 0 || o.stun > M.t) continue; const ox = o.x - e.x, oy = o.y - e.y, al = ox * cx + oy * cy; if (al < -1) continue; const dd = Math.hypot(ox, oy); if (dd < near) near = dd; } if (near > PMC.freeD) { e.car = [cx, cy]; e.free = true; } }
    const T = e.s ? lm.A : lm.H, bu = T.tac[3]; e.think = think !== undefined ? think : (PMC.thinkA + rnd() * PMC.thinkB) * PMC.think * (bu === 1 ? 1.2 : bu === 2 ? 0.85 : 1) * (1 - 0.45 * pmPress(lm, e)) * (e.sl === 0 ? 2.6 : 1) * (M.t - M.gain < 0.5 && e.sl !== 0 ? 0.6 : 1); }
  // ---------- restarts ----------
  function pmShape(lm, s, bx, has, cut) { // team shape positions around a ball position; used for cuts and as the base of every target
    const M = lm.pm, T = s ? lm.A : lm.H, E = M.E[s], tc = T.tac, bu = pmU(s, bx), ment = tc[0], ln = tc[1], pr = tc[2], wd = tc[4] === undefined ? 1 : tc[4];
    let lineU, len; if (has) { lineU = clamp(bu - 30 + ment * PMC.mLine, 14, 56 + ment * 2); len = 44 + ment * 1.5; } else { lineU = Math.max(Math.min(bu - [26, 21, 16][ln], [34, 42, 50][ln] + ment * 1.5), Math.min(PMC.boxLine + ln, bu - 4), 5); len = clamp(Math.min(31 + pr * 1.5, PMC.lenA + (ln - 1) * PMC.lenL + bu * PMC.lenB) * (1 + PMC.mLen * ment), 12, 38); }
    T.lineU = lineU; T.len = len; T.wf = has ? [0.84, 1, 1.12][wd] : 0.72; return T; }
  function pmPlace(lm, mode, side, bx, by) { // instant reposition for kick-offs, corners, penalties and attacking free kicks
    const M = lm.pm; if (lm.rec) M.cuts.push([M.fr.length, mode]);
    for (let s = 0; s < 2; s++) { const E = M.E[s], T = s ? lm.A : lm.H, att = s === side;
      if (mode === 'ko') { for (const e of E) { if (!e) continue; const fr = PFR_OUT[e.sl], u = e.sl === 0 ? 5 : 16 + fr * 30, v = 34 + (e.v0 - 34) * 0.9; e.x = s ? 105 - u : u; e.y = s ? 68 - v : v; e.vx = e.vy = 0; e.run = 0; e.stun = 0; } }
      else { const gx = side ? 0 : 105, dir = side ? -1 : 1, out = E.filter(e => e && e.sl !== 0), gk = pmGkOf(lm, s);
        if (att) { const by2 = out.slice().sort((a, b) => b.phy + b.sho * 0.3 - a.phy - a.sho * 0.3), spots = mode === 'pen' ? null : [[6, -5], [8.5, 3], [10, -9], [5, 8], [12, 0], [19, -11], [21, 9]]; let i = 0;
          for (const e of by2) { if (mode === 'pen') { e.x = gx - dir * (19 + (i % 3) * 2); e.y = 14 + (i * 41) % 40; } else if (i < spots.length - (T.tac[0] < 0 ? 1 : 0)) { e.x = gx - dir * spots[i][0]; e.y = 34 + spots[i][1]; } else { e.x = gx - dir * (42 + (i - spots.length) * 9); e.y = 22 + ((i * 17) % 24); } e.vx = e.vy = 0; i++; } if (gk) { gk.x = s ? 99 : 6; gk.y = 34; } }
        else { const A2 = M.E[side].filter(e => e && e.sl !== 0 && Math.abs(e.x - gx) < 24), d2 = out.slice().sort((a, b) => b.def + b.phy * 0.4 - a.def - a.phy * 0.4); let i = 0;
          for (const e of d2) { const a = A2[i]; if (mode === 'pen') { e.x = gx - dir * (18.5 + (i % 3) * 1.5); e.y = 12 + (i * 37) % 44; } else if (a) { e.x = a.x + dir * 1.2; e.y = a.y + (34 - a.y) * 0.08; } else if (i < 9) { e.x = gx - dir * (4 + (i % 3) * 4); e.y = 28 + (i % 4) * 4; } else { e.x = gx - dir * 30; e.y = 34; } e.vx = e.vy = 0; i++; } if (gk) { gk.x = gx - dir * 1.2; gk.y = 34; } }
      } }
  }
  function pmSetKick(lm, side, addClock) { const M = lm.pm; M.t += addClock; M.B = { st: 'dead', rs: 'ko', side, x: 52.5, y: 34, z: 0, h: null, w: 1.2 }; M.side = side; M.gain = M.t; pmPlace(lm, 'ko', side); M.pstart = M.fr.length; }
  function pmDead(lm, rs, side, x, y, clock) { const M = lm.pm; M.t += clock || 0; M.B = { st: 'dead', rs, side, x: clamp(x, 0.3, 104.7), y: clamp(y, 0.3, 67.7), z: 0, h: null, w: rs === 'throw' ? 2.2 : rs === 'gk' ? 2.6 : rs === 'fk' ? 2.4 : 1.4 }; M.B.wait = rs === 'gk' ? pmGkOf(lm, side) : rs === 'throw' || rs === 'fk' ? (pmNearest(M.E[side], M.B.x, M.B.y, true) || pmNearest(M.E[side], M.B.x, M.B.y)) : null; if (M.side !== side) { M.side = side; M.gain = M.t - 30; M.prev = null; M.prev2 = null; } M.pstart = M.fr.length;
    for (let s = 0; s < 2; s++) for (const e of M.E[s]) if (e) { e.run = 0; e.car = null; } }
  function pmOut(lm, x, y, last) { // ball left the pitch at (x, y); last = side that touched it last
    const M = lm.pm; if (x <= 0 || x >= 105) { const end = x <= 0 ? 0 : 1, def = end, T = def ? lm.A : lm.H; if (last === def) { (def ? lm.H : lm.A).cor++; pmDead(lm, 'corner', 1 - def, end ? 105 : 0, y < 34 ? 0.5 : 67.5, 32); } else pmDead(lm, 'gk', def, end ? 99.5 : 5.5, 34 + (rnd() < 0.5 ? -8 : 8), 26); }
    else pmDead(lm, 'throw', 1 - last, x, y <= 0 ? 0.4 : 67.6, 13); }
  function pmRestart(lm) { // execute the pending restart
    const M = lm.pm, B = M.B, s = B.side, E = M.E[s], T = s ? lm.A : lm.H, dir = s ? -1 : 1, gx = s ? 0 : 105;
    if (B.rs === 'ko') { const k = pmNearest(E, 52.5, 34, true); if (k) { k.x = 52.5 - dir * 0.5; k.y = 34; pmGive(lm, k, 0.7); } return; }
    if (B.rs === 'gk' || B.rs === 'throw' || B.rs === 'fk') { const k = B.wait || pmNearest(E, B.x, B.y); if (!k) return; if (pmHyp(k.x, k.y, B.x, B.y) > 1.6 && B.w > -5) return; k.x = B.x; k.y = B.y; k.vx = k.vy = 0; pmGive(lm, k, B.rs === 'gk' ? 0.9 : 0.7); return; }
    if (B.rs === 'corner' || B.rs === 'fkx') { pmPlace(lm, 'corner', s, B.x, B.y); const tk = E.filter(e => e && e.sl !== 0).sort((a, b) => b.pas - a.pas)[0]; if (!tk) return pmDead(lm, 'gk', 1 - s, s ? 5.5 : 99.5, 34, 0); tk.x = B.x; tk.y = B.y; pmGive(lm, tk, 0.6); tk.mustCross = 1; return; }
    if (B.rs === 'fks') { pmPlace(lm, 'corner', s, B.x, B.y); const tk = E.filter(e => e && e.sl !== 0).sort((a, b) => b.sho - a.sho)[0]; if (!tk) return; tk.x = B.x; tk.y = B.y; pmGive(lm, tk, 0.6); const d = pmHyp(B.x, B.y, gx, 34); pmShot(lm, tk, clamp(0.105 - (d - 18) * 0.005, 0.03, 0.11), 0, 'fk'); return; }
    if (B.rs === 'pen') { pmPlace(lm, 'pen', s); let tk = E.find(e => e && e.L.id === T.pk) || E.filter(e => e && e.sl !== 0).sort((a, b) => b.sho - a.sho)[0]; if (!tk) return; B.x = gx - dir * 11; B.y = 34; tk.x = B.x - dir * 1.5; tk.y = 34; pmGive(lm, tk, 0.5); pmShot(lm, tk, 0.78, 0, 'pen'); return; }
  }
  // ---------- on-ball decisions ----------
  function pmXg(lm, e, x, y, pr, head) { const gx = e.s ? 0 : 105, d = pmHyp(x, y, gx, 34); let nb = 0, n2 = 0; { const O = lm.pm.E[1 - e.s], ax = gx - x, ay = 34 - y, D2 = ax * ax + ay * ay || 1; for (const o of O) { if (!o || o.sl === 0) continue; const a = ((o.x - x) * ax + (o.y - y) * ay) / D2; if (a > -0.15 && pmHyp(o.x, o.y, x, y) < PMC.c2R) n2++; if (a > 0.03 && a < 0.97 && pmHyp(o.x, o.y, x + ax * a, y + ay * a) < 2.6) nb++; } } const a = Math.abs(Math.atan2(gx - x, y - 30.34) - Math.atan2(gx - x, y - 37.66)), af = clamp(a / 0.64, 0, 1.25); return clamp(PMC.xgA * Math.exp(-d / PMC.xgD) * (0.35 + 0.65 * af) * (1 - 0.45 * pr) * (head ? 0.5 : 1) * Math.pow(PMC.crowd, Math.min(nb, 4)) * Math.pow(PMC.crowd2, Math.min(n2, 7)), 0.004, 0.9); }
  function pmLane(lm, e, qx, qy, vb, loft, list) { // probability that no opponent cuts out a pass from e to (qx, qy)
    const M = lm.pm, O = M.E[1 - e.s], dx = qx - e.x, dy = qy - e.y, D2 = dx * dx + dy * dy || 1, D = Math.sqrt(D2), T = D / vb; let pn = 1;
    for (const o of O) { if (!o || o.stun > M.t) continue; let a = ((o.x - e.x) * dx + (o.y - e.y) * dy) / D2; a = clamp(a, 0, 1); if (a < 0.06) continue; if (loft && a < 0.82) continue; if (o.sl === 0 && a < 0.9) continue;
      const cx = e.x + dx * a, cy = e.y + dy * a, d = pmHyp(o.x, o.y, cx, cy), reach = o.vm * Math.max(0, a * T - PMC.react) * 0.85 + 1.0, m = reach - d; if (m < -3.5) continue;
      const po = psig(m / 1.3) * clamp(PMC.icpt + (o.def - M.mu.def) / (PMC.KI * 4), 0.06, 0.95) * (a > 0.9 ? PMC.recI : 1) * (pmU(o.s, cx) < 26 ? PMC.boxI : 1); if (po > 0.01) { pn *= 1 - po; if (list) list.push([o, po, a]); } }
    return pn; }
  function pmPassOpt(lm, h, m, pr, thru) {
    const M = lm.pm, s = h.s, dir = s ? -1 : 1, T = s ? lm.A : lm.H, bu = T.tac[3], ment = T.tac[0]; let qx, qy, lead = 0;
    if (thru) { const off = pmOffLine(lm, s), mu0 = pmU(s, m.x), ou = pmU(s, off); if (mu0 > ou + 0.4 || mu0 < pmU(s, h.x) - 2) return null; lead = 9 + rnd() * 9; const qu = Math.min(Math.max(mu0, ou) + lead, 101); if (qu < mu0 + 5) return null; qx = s ? 105 - qu : qu; qy = clamp(m.y + (34 - m.y) * 0.22, 3, 65); }
    else { const tf = pmHyp(h.x, h.y, m.x, m.y) / 16; qx = clamp(m.x + m.vx * tf * 0.7, 1, 104); qy = clamp(m.y + m.vy * tf * 0.7, 1, 67); }
    const D = pmHyp(h.x, h.y, qx, qy); if (D < 4 || D > 62) return null; const vb = clamp(10 + D * 0.42, 11, 24), gain = pmU(s, qx) - pmU(s, h.x);
    let pG = pmLane(lm, h, qx, qy, vb, false), loft = false; if ((pG < 0.45 && D > 20) || D > 32) { const pL = pmLane(lm, h, qx, qy, vb * 0.8, true); if (pL > pG || D > 32) { loft = true; pG = pL; } }
    const zp = (h.pas - M.mu.pas) / PMC.KP, pAcc = psig(zp + PMC.passB - D / 21 - PMC.prP * pr - (loft ? 0.7 : 0) - (thru ? PMC.thruP : 0) - (lm.wx ? 0.12 * lm.wx : 0));
    const O = M.E[1 - s], no = pmNearest(O, qx, qy), dr = no ? pmHyp(no.x, no.y, qx, qy) : 20; let pRec = 1, pc, brk = 0;
    if (thru) { const tr = pmHyp(m.x, m.y, qx, qy) / (m.vm * 1.02) + 0.15; let td = 99; for (const o of O) { if (!o) continue; const t = pmHyp(o.x, o.y, qx, qy) / o.vm + (o.sl === 0 ? 0.9 : 0.55); if (t < td) td = t; } pRec = psig((td - tr - PMC.thruM) * 1.5); brk = PMC.brk * clamp((td - tr) / 1.4, 0, 1) * clamp((pmU(s, qx) - 40) / 25, 0.4, 1); }
    else if (loft) pRec = dr < 3.5 && no ? psig((m.phy - no.phy) / 12 + 0.15) * 0.92 : 0.94; else pRec = psig(2.7 + (m.dri - M.mu.dri) / 15 - PMC.recP * clamp((3.5 - dr) / 3.5, 0, 1));
    pc = pAcc * pG * pRec; const xt = Math.max(pmXt(s, qx, qy) * (thru ? 1.1 : 1), brk), here = pmXt(s, h.x, h.y);
    let val = xt + 0.01 * Math.min(dr, 10) / 10 + 0.0007 * gain - PMC.longP * Math.max(0, D - 22); if (M.t - M.gain < (M.trw || PMC.trW) && bu !== 1) val += PMC.trV * gain / 30; if (bu === 1) val += (D < 20 ? 0.012 : 0) - (loft ? 0.012 : 0); else if (bu === 2) val += 0.009 * gain / 30; else if (bu === 3 && M.t - M.gain < 7) val += 0.014 * gain / 30;
    if (m.sl === 0) val -= 0.012 - 0.012 * pr; if (h.rb.thr && thru) val += 0.01 * h.rb.thr; if (m.rb.tgt && loft) val += 0.008;
    const risk = (1 - ment * 0.05 + (pmU(s, h.x) < 35 ? 0.6 : 0) + ((h.ins & 8) ? 0.6 : 0) - (h.rb.risk || 0)) * 0.9;
    return { k: 'pass', m, qx, qy, D, vb, loft, thru, pAcc, pG, pRec, pc, ev: pc * val - (1 - pc) * (pmXt(1 - s, qx, qy) * risk + PMC.keepV + here * 0.6) - (gain < -2 && !pr ? 0.004 : 0) }; }
  function pmDecide(lm, h) {
    const M = lm.pm, s = h.s, dir = s ? -1 : 1, gx = s ? 0 : 105, T = s ? lm.A : lm.H, E = M.E[s], O = M.E[1 - s], pr = pmPress(lm, h), hu = pmU(s, h.x), opts = [];
    if (h.mustCross) { h.mustCross = 0; return pmCross(lm, h, true); }
    const dg = pmHyp(h.x, h.y, gx, 34);
    if (dg < 33 && h.sl !== 0) { const xg = pmXg(lm, h, h.x, h.y, pr), thr = PMC.shotThr * (1 + (h.rb.sh || 0)) * ((h.ins & 4) ? 0.75 : 1) * (dg > 17 ? PMC.longThr : 1); if (xg >= thr) opts.push({ k: 'shot', xg, ev: xg * PMC.shotW * 1.05 + (dg > 17 ? PMC.longB * (1 - 0.6 * pr) * ((h.ins & 4) ? 1.3 : 1) : 0) }); }
    const aware = 0.72 + clamp((h.ov - 60) / 100, 0, 0.3), off = pmOffLine(lm, s);
    for (const m of E) { if (!m || m === h) continue; const mu0 = pmU(s, m.x), offs = mu0 > pmU(s, off) + 0.25 && mu0 > hu + 0.5 && mu0 > 52.5; if (offs && rnd() < aware) continue;
      const a = pmPassOpt(lm, h, m, pr, false); if (a) { a.offs = offs; opts.push(a); }
      if (m.sl !== 0 && (m.run > M.t || (m.rb.late && hu > 60)) && mu0 > hu && hu > 28 && !offs) { const b = pmPassOpt(lm, h, m, pr, true); if (b) opts.push(b); } }
    if (h.sl !== 0) { // carry the ball: best of five headings
      let best = null; for (const ang of [0, 0.6, -0.6, 1.25, -1.25, 3.14]) { const tg = Math.atan2(34 - h.y, gx - h.x) + ang, cx = Math.cos(tg), cy = Math.sin(tg), nx = h.x + cx * 7, ny = h.y + cy * 7; if (nx < 1 || nx > 104 || ny < 1 || ny > 67) continue; let keep = 0.985, near = 99;
        for (const o of O) { if (!o || o.stun > M.t) continue; const d = pmHyp(o.x, o.y, h.x + cx * 3.5, h.y + cy * 3.5); if (d < near) near = d; if (d < 4.2) keep *= psig((h.dri - M.mu.dA - o.def + M.mu.dD) / PMC.KD - 0.6 + (d - 2) * 0.6); }
        const ev = keep * (pmXt(s, nx, ny) + 0.004 * Math.min(near, 8) / 8) * ((dg < 19 ? PMC.boxCarry : 1) * PMC.carry + (h.rb.cry || 0) * 0.1 + (h.rb.drb || 0) * 0.12 + ((h.ins & 16) ? 0.14 : 0) - ((h.nc || 0) >= 3 && near < 7 ? 0.25 : 0)) - (1 - keep) * pmXt(1 - s, h.x, h.y) * 0.9; if (!best || ev > best.ev) best = { k: 'carry', cx, cy, ev, near }; }
      if (best) opts.push(best);
      const wide = Math.abs(h.y - 34) > 17, cu = hu > 82; if (wide && cu) { let nb = 0; for (const m of E) if (m && m !== h && pmU(s, m.x) > 87 && Math.abs(m.y - 34) < 15) nb++; if (nb) opts.push({ k: 'cross', ev: 0.03 + 0.012 * nb + (h.rb.crs || 0) * 0.02 - 0.02 * pr }); }
      if (hu < 26 && pr > 0.55) opts.push({ k: 'clear', ev: 0.006 }); }
    if (!opts.length) { h.think = 0.5; return; }
    const tmp = PMC.temp * (1 + clamp((M.mu.ov - h.ov) / 40, -0.3, 0.6)); let mx = -1e9; for (const o of opts) if (o.ev > mx) mx = o.ev; let tot = 0; for (const o of opts) { o.w = Math.exp((o.ev - mx) / tmp); tot += o.w; } let y = rnd() * tot, ch = opts[0]; for (const o of opts) { y -= o.w; if (y <= 0) { ch = o; break; } }
    if (lm.dbg) pmC(lm, 'd_' + ch.k + (ch.thru ? 'T' : ch.loft ? 'L' : ''));
    if (ch.k === 'shot') return pmShot(lm, h, ch.xg, pr); if (ch.k === 'cross') return pmCross(lm, h, false); if (ch.k === 'clear') return pmClear(lm, h);
    if (ch.k === 'carry') { h.free = ch.near > 6.5; h.car = [ch.cx, ch.cy]; h.nc = (h.nc || 0) + 1; h.think = (0.7 + rnd() * 0.7) * (ch.near > 7 ? 1.4 : 1); return; }
    pmPass(lm, h, ch, pr); }
  function pmPass(lm, h, a, pr) {
    const M = lm.pm, B = M.B, s = h.s, m = a.m; h.L.pas++; h.car = null; let res = 'ok', by = null, at = 1, x1 = a.qx, y1 = a.qy;
    if (a.offs && rnd() < 0.9) res = 'off';
    else if (rnd() > a.pAcc) { res = 'astray'; const er = a.D * (0.14 + rnd() * 0.2), an = rnd() * 6.283; x1 += Math.cos(an) * er; y1 += Math.sin(an) * er; }
    else { const list = []; pmLane(lm, h, a.qx, a.qy, a.loft ? a.vb * 0.8 : a.vb, a.loft, list); for (const it of list) if (rnd() < it[1]) { if (!by || it[2] < at) { by = it[0]; at = it[2]; } } if (by) res = 'int'; else if (rnd() > a.pRec) res = a.loft || a.thru ? 'lost' : 'poor'; }
    if (lm.dbg) pmC(lm, 'p_' + res + (a.thru ? 'T' : a.loft ? 'L' : ''));
    B.st = 'fly'; B.h = null; B.kind = a.thru ? 'thru' : a.loft ? 'loft' : 'pass'; B.x0 = h.x; B.y0 = h.y; B.x1 = x1; B.y1 = y1; B.T = a.D / (a.loft ? a.vb * 0.8 : a.vb); B.t0 = 0; B.res = res; B.rec = m; B.by = by; B.at = at; B.from = h; B.loft = a.loft;
    if (res === 'ok' || res === 'poor' || res === 'lost') { m.meet = [x1, y1, M.t + B.T + 0.3]; } if (by) by.meet = [h.x + (x1 - h.x) * at, h.y + (y1 - h.y) * at, M.t + B.T * at + 0.2];
    if (a.thru) M.px.thr[s]++; M.prev2 = M.prev; M.prev = h; }
  function pmCross(lm, h, corner) {
    const M = lm.pm, B = M.B, s = h.s, dir = s ? -1 : 1, gx = s ? 0 : 105, E = M.E[s], O = M.E[1 - s], pr = corner ? 0 : pmPress(lm, h); h.L.pas++; h.car = null;
    const c = E.filter(m => m && m !== h && m.sl !== 0 && Math.abs(m.x - gx) < 17 && Math.abs(m.y - 34) < 15); let m = null, bw = -1; for (const q of c) { const w = (q.phy + q.sho) * (0.6 + rnd() * 0.8); if (w > bw) { bw = w; m = q; } }
    B.by = null; const pDel = psig((h.pas - M.mu.pas) / PMC.KP + (corner ? 0.25 : 0.1) - pr); let res = 'astray', x1 = gx - dir * (6 + rnd() * 8), y1 = 34 + (rnd() - 0.5) * 16, win = false;
    if (m && rnd() < pDel) { x1 = clamp(m.x + dir * 0.5, 1, 104); y1 = m.y; const d = pmNearest(O, x1, y1, true), g = pmGkOf(lm, 1 - s), claim = g && pmHyp(g.x, g.y, x1, y1) < 6.5 && rnd() < 0.3; if (claim) { res = 'gkc'; } else { const dd = d ? pmHyp(d.x, d.y, x1, y1) : 9; win = !d || dd > 2.6 || rnd() < psig((m.phy - d.phy) / 12 - 0.35); res = win ? 'head' : 'clr'; M.px.air[s][win ? 0 : 1]++; if (d && !win) B.by = d; } }
    const D = pmHyp(h.x, h.y, x1, y1); B.st = 'fly'; B.h = null; B.kind = 'cross'; B.x0 = h.x; B.y0 = h.y; B.x1 = x1; B.y1 = y1; B.T = D / 17; B.t0 = 0; B.res = res; B.rec = m; B.from = h; B.loft = true; if (m) m.meet = [x1, y1, M.t + B.T + 0.2]; M.prev2 = M.prev; M.prev = h; }
  function pmClear(lm, h) { const M = lm.pm, B = M.B, s = h.s, dir = s ? -1 : 1, d = 28 + rnd() * 22, an = (rnd() - 0.5) * 1.3, x1 = h.x + dir * Math.cos(an) * d, y1 = h.y + Math.sin(an) * d; h.L.pas++; h.car = null; B.st = 'fly'; B.h = null; B.kind = 'clear'; B.x0 = h.x; B.y0 = h.y; B.x1 = x1; B.y1 = y1; B.T = d / 19; B.t0 = 0; B.res = 'astray'; B.rec = null; B.by = null; B.from = h; B.loft = true; M.prev = null; M.prev2 = null; }
  function pmShot(lm, h, xg, pr, set) {
    const M = lm.pm, B = M.B, s = h.s, dir = s ? -1 : 1, gx = s ? 0 : 105, T = s ? lm.A : lm.H, O = M.E[1 - s], g = pmGkOf(lm, 1 - s), L = h.L, head = set === 'head'; h.car = null;
    if (lm.dbg) { pmC(lm, 'sh_' + (set || ((h.nc || 0) > 0 ? 'carry' : 'pass'))); if (M.t - M.gain < 13 && M.gu < 52) pmC(lm, 'shc' + s); pmC(lm, 'sht' + s); const dd = pmHyp(h.x, h.y, gx, 34); pmC(lm, 'shd_' + (dd < 11 ? 'a' : dd < 16.5 ? 'b' : dd < 22 ? 'c' : 'd')); }
    L.sh++; L.xg += xg; T.xg += xg; const as = set === 'pen' ? null : M.prev && M.prev !== h && M.prev.s === s ? M.prev : null; if (as) as.L.xa += xg;
    let blk = false; if (!set) for (const o of O) { if (!o || o.sl === 0) continue; const ax = gx - h.x, ay = 34 - h.y, D2 = ax * ax + ay * ay, a = ((o.x - h.x) * ax + (o.y - h.y) * ay) / D2; if (a > 0.02 && a < 0.6 && pmHyp(o.x, o.y, h.x + ax * a, h.y + ay * a) < 1.5 && rnd() < PMC.blk) { blk = o; break; } }
    const pOn = set === 'pen' ? 0.93 : clamp(PMC.onB + 0.9 * xg + (h.sho - M.mu.sho - 8) / 170 - 0.1 * pr, 0.12, 0.93), gkS = g ? g.gk : 40, xa = psig(Math.log(xg / (1 - xg)) + (h.sho - (M.mu.sA || M.mu.sho) - gkS + (M.mu.gk || gkS) + PMC.shoRef) / PMC.KS);
    let res, y1 = 34 + (rnd() - 0.5) * 6.4, x1 = gx; const ch = Math.abs(h.y - 34) < 11 ? 1 : (pmV(s, h.y) < 34 ? 0 : 2); M.px.ch[s][ch]++;
    if (blk) { res = 'blk'; x1 = blk.x; y1 = blk.y; }
    else if (rnd() > pOn) { res = 'off'; y1 = 34 + (rnd() < 0.5 ? -1 : 1) * (4.2 + rnd() * 7); x1 = gx + dir * 1.5; }
    else { L.sot++; res = rnd() < clamp(xa / pOn, 0.02, 0.97) ? 'goal' : 'save'; if (res === 'goal') x1 = gx + dir * 1.2; else { x1 = g ? g.x : gx - dir; y1 = g ? g.y : 34; } }
    const D = pmHyp(h.x, h.y, x1, y1); B.st = 'fly'; B.h = null; B.kind = 'shot'; B.x0 = h.x; B.y0 = h.y; B.x1 = x1; B.y1 = y1; B.T = Math.max(0.25, D / (head ? 15 : 26)); B.t0 = 0; B.res = res; B.from = h; B.as = as; B.set = set; B.xg = xg; B.loft = false; B.by = blk || null;
    M.px.shots.push([s, Math.round(h.x * 10) / 10, Math.round(h.y * 10) / 10, Math.round(xg * 100) / 100, res === 'goal' ? 2 : res === 'save' ? 1 : res === 'blk' ? 3 : 0, L.id, pmMin(lm)]);
    pmHl(lm, res === 'goal' ? 'g' : res === 'save' ? 'c' : set === 'pen' ? 'x' : 'm', res === 'goal' ? 22 : 14); }
  function pmShotEnd(lm) {
    const M = lm.pm, B = M.B, h = B.from, s = h.s, T = s ? lm.A : lm.H, OT = s ? lm.H : lm.A, g = pmGkOf(lm, 1 - s), L = h.L, mn = pmMin(lm), pen = B.set === 'pen';
    if (B.res === 'goal') { L.g++; T.g++; const as = B.as; let aid = pen ? -1 : 0; if (as) { as.L.a++; aid = as.L.id; } lm.sc.push([L.id, mn, s, aid]); pmEv(lm, 'g', s, L.id, aid, B.x1, B.y1); pmSetKick(lm, 1 - s, 58); return; }
    const as = B.as; if (as && !pen) as.L.kp++;
    if (B.res === 'save') { if (g) g.L.sv++; pmEv(lm, pen ? 'x' : 'c', s, L.id, 0, B.x1, B.y1); const r = rnd(); if (r < 0.5 && g) { pmGive(lm, g, 2.2); M.t += 12; } else if (r < 0.86) { T.cor++; pmDead(lm, 'corner', s, s ? 0 : 105, rnd() < 0.5 ? 0.5 : 67.5, 24); } else { B.st = 'loose'; B.x1 = clamp(B.x + (s ? 1 : -1) * (5 + rnd() * 9), 2, 103); B.y1 = clamp(B.y + (rnd() - 0.5) * 18, 2, 66); B.lt = 1 - s; } return; }
    if (B.res === 'blk') { const r = rnd(); if (r < 0.45) { T.cor++; pmDead(lm, 'corner', s, s ? 0 : 105, B.y < 34 ? 0.5 : 67.5, 24); } else { B.st = 'loose'; B.x1 = clamp(B.x + (rnd() - 0.5) * 16, 2, 103); B.y1 = clamp(B.y + (rnd() - 0.5) * 16, 2, 66); B.lt = 1 - s; } return; }
    if (pen || rnd() < 0.6) pmEv(lm, pen ? 'x' : 'm', s, L.id, 0, B.x1, B.y1); pmDead(lm, 'gk', 1 - s, s ? 5.5 : 99.5, 34 + (rnd() < 0.5 ? -8 : 8), 27); }
  function pmFlyEnd(lm) {
    const M = lm.pm, B = M.B, h = B.from, s = h.s, O = M.E[1 - s], dir = s ? -1 : 1, gx = s ? 0 : 105; B.x = B.x1; B.y = B.y1; B.z = 0;
    if (B.kind === 'shot') return pmShotEnd(lm);
    if (B.res === 'off') { (s ? lm.A : lm.H).offs++; pmDead(lm, 'fk', 1 - s, B.rec ? B.rec.x : B.x, B.rec ? B.rec.y : B.y, 22); return; }
    if (B.x1 <= 0 || B.x1 >= 105 || B.y1 <= 0 || B.y1 >= 68) return pmOut(lm, B.x1, B.y1, s);
    const m = B.rec;
    if (B.kind === 'cross') { if (B.res === 'head' && m) { m.x = B.x1; m.y = B.y1; h.L.cmp++; const xg = pmXg(lm, m, m.x, m.y, 0.3, true); M.prev = h; pmGive(lm, m, 0.1); return pmShot(lm, m, xg, 0.3, 'head'); } if (B.res === 'gkc') { const g = pmGkOf(lm, 1 - s); if (g) { pmGive(lm, g, 2.4); M.t += 5; return; } } if (B.res === 'clr' && B.by) { const d = B.by; d.x = B.x1; d.y = B.y1; if (rnd() < 0.45) { (s ? lm.A : lm.H).cor++; return pmDead(lm, 'corner', s, s ? 0 : 105, B.y0 < 34 ? 0.5 : 67.5, 28); } pmGive(lm, d, 0.05); return pmClear(lm, d); } B.st = 'loose'; B.lt = s; B.x1 = clamp(B.x + (rnd() - 0.5) * 10, -2, 107); B.y1 = clamp(B.y + (rnd() - 0.5) * 10, 1, 67); return; }
    if (B.res === 'ok' && m && M.E[m.s][m.k] === m) { if (pmHyp(m.x, m.y, B.x1, B.y1) < 6) { m.x += (B.x1 - m.x) * 0.7; m.y += (B.y1 - m.y) * 0.7; } h.L.cmp++; M.thruRec = B.kind === 'thru' ? m : null; pmGive(lm, m); M.thruRec = null; return; }
    if (B.res === 'lost') { const d = pmNearest(O, B.x1, B.y1); if (B.kind === 'loft' && d && d.sl !== 0) { M.px.air[s][1]++; d.x += (B.x1 - d.x) * 0.6; d.y += (B.y1 - d.y) * 0.6; if (rnd() < 0.55) { pmGive(lm, d, 0.05); return pmClear(lm, d); } pmGive(lm, d); return; } if (d) { pmGive(lm, d, d.sl === 0 ? 2.2 : undefined); return; } }
    B.st = 'loose'; B.lt = s; const k = B.res === 'poor' ? 2.5 : 5; B.x1 = clamp(B.x + (rnd() - 0.5) * k * 2, -1, 106); B.y1 = clamp(B.y + (rnd() - 0.5) * k * 2, -1, 69); }
  function pmFoul(lm, o, h) { // o fouled h
    const M = lm.pm, T = o.s ? lm.A : lm.H, s = h.s, gx = s ? 0 : 105, dir = s ? -1 : 1, hu = pmU(s, h.x), inBox = hu > 88.5 && Math.abs(h.y - 34) < 20.1; T.fouls++; M.inj += 0.004;
    const last = (() => { let n = 0; for (const q of M.E[o.s]) if (q && q !== o && q.sl !== 0 && pmU(s, q.x) > hu) n++; return n === 0; })(), brk = M.t - M.gain < 8 && hu > 45;
    let red = rnd() < 0.004 + (last && hu > 72 && Math.abs(h.y - 34) < 18 ? 0.06 : 0), yel = !red && rnd() < PMC.yel * (o.L.y ? 0.15 : 1) * (brk ? 1.8 : 1) * (inBox ? 1.4 : 1) * (trait(o.p) === 4 ? 1.5 : 1);
    if (red) { pmHl(lm, 'r', 8); const k = o.k; M.E[o.s][k] = null; lmRed(lm, T, k, 1); if (lm.rec) M.fe.push([M.fr.length, lm.ev.length - 1, o.x, o.y]); }
    else if (yel) { if (o.L.y) { T.ys++; pmHl(lm, 'r', 8); const k = o.k; M.E[o.s][k] = null; lmRed(lm, T, k, 2); if (lm.rec) M.fe.push([M.fr.length, lm.ev.length - 1, o.x, o.y]); } else { o.L.y = 1; T.ys++; pmEv(lm, 'y', o.s, o.L.id, 0, o.x, o.y); } }
    if (inBox) { pmHl(lm, 'x', 30); return pmDead(lm, 'pen', s, gx - dir * 11, 34, 75); }
    const d = pmHyp(h.x, h.y, gx, 34); if (d < 25 && Math.abs(h.y - 34) < 13 && rnd() < 0.5) return pmDead(lm, 'fks', s, h.x, h.y, 55); if (hu > 80) return pmDead(lm, 'fkx', s, h.x, h.y, 45); pmDead(lm, 'fk', s, h.x, h.y, 30); }
  function pmDuel(lm, h) { // defenders within reach try to win the ball
    const M = lm.pm, O = M.E[1 - h.s], T = h.s ? lm.H : lm.A; if (h.sl === 0 || h.prot > M.t) return false;
    for (const o of O) { if (!o || o.sl === 0 || o.stun > M.t || o.cd > M.t) continue; const d = pmHyp(o.x, o.y, h.x, h.y); if (d > 2.7) continue; if (h.think > 0.3) h.think = 0.3; if (d > PMC.tkR) continue; if (rnd() > (h.car ? PMC.tkD : PMC.tkP) * (pmU(o.s, o.x) < 30 ? 1.6 : 1)) continue; o.cd = M.t + 2.2;
      const pw = psig((o.def - M.mu.dD - h.dri + M.mu.dA) / PMC.KT + PMC.tkWin + ((h.ins & 16) ? -0.1 : 0)), r = rnd(); if (lm.dbg) pmC(lm, 'duel');
      if (r < pw) { o.L.tk++; T.tkw = (T.tkw || 0) + 1; M.px.drb[h.s][1]++; h.stun = M.t + 0.9; if (pmU(h.s, h.x) > 86 && Math.abs(h.y - 34) > 9 && rnd() < 0.4) { (h.s ? lm.A : lm.H).cor++; pmDead(lm, 'corner', h.s, h.s ? 0 : 105, h.y < 34 ? 0.5 : 67.5, 28); return true; } if (rnd() < 0.72) pmGive(lm, o); else { const B = M.B; B.st = 'loose'; B.h = null; B.lt = o.s; B.x1 = clamp(h.x + (rnd() - 0.5) * 9, 1, 104); B.y1 = clamp(h.y + (rnd() - 0.5) * 9, 1, 67); } return true; }
      if (r < pw + (1 - pw) * PMC.foul * (1 - 0.1 * (T.tac[2] - 1) + ((o.ins & 2) ? 0.15 : 0)) * (pmU(h.s, h.x) > 88.5 && Math.abs(h.y - 34) < 20.1 ? PMC.boxFoul : 1)) { pmFoul(lm, o, h); return true; }
      o.stun = M.t + 1.25; M.px.drb[h.s][0]++; if (rnd() < 0.4) o.L.tk++; }
    return false; }
  // ---------- off-ball movement ----------
  function pmTargets(lm) {
    const M = lm.pm, B = M.B, bx = B.x, by = B.y, hd = B.h, fly = B.st === 'fly', dead = B.st === 'dead'; if (M.sbx === undefined || dead) { M.sbx = bx; M.sby = by; } else { M.sbx += (bx - M.sbx) * PDT / PMC.lag; M.sby += (by - M.sby) * PDT / PMC.lag; } const sx = M.sbx, sy = M.sby;
    for (let s = 0; s < 2; s++) {
      const T = s ? lm.A : lm.H, E = M.E[s], O = M.E[1 - s], tc = T.tac, has = M.side === s, dir = s ? -1 : 1, bu = pmU(s, sx), bv = pmV(s, sy), rbu = pmU(s, bx), pr = tc[2], off = pmU(s, pmOffLine(lm, s)); pmShape(lm, s, sx, has);
      const tr = M.t - M.gain, brkOn = has && tr < (M.trw || PMC.trW) && M.gu !== undefined && M.gu < 70; const lineU = T.lineU, len = T.len, wf = T.wf, zone = pr === 2 ? 200 : pr === 1 ? 74 : 58, hu = hd ? pmU(s, hd.x) : rbu;
      let pressers = null; if (!has && !dead) { const c = []; for (const e of E) { if (!e || e.sl === 0 || e.stun > M.t) continue; const d = pmHyp(e.x, e.y, bx, by) * (LINE[e.sl] === 1 && bu > 38 ? 1.7 : 1) * ((e.ins & 2) ? 0.75 : 1) * (e.rb.prs ? 0.85 : 1) * (e.rb.lazy ? 1.5 : 1); c.push([d, e]); } c.sort((a, b) => a[0] - b[0]); pressers = c.slice(0, rbu < zone ? 1 + pr + (rbu < 30 ? 1 : 0) : 1).map(x => x[1]); }
      for (const e of E) { if (!e) continue; const sl = e.sl, ln = LINE[sl], rb = e.rb, eu = pmU(s, e.x); let u, v, ur = 0.5;
        if (sl === 0) { const gy = 34, gd = pmHyp(bx, by, s ? 105 : 0, gy); if (has) { u = clamp(lineU - 24, 5, 26 + (rb.gk || 0) * 6); v = 34 + (bv - 34) * 0.1; } else { const out = clamp(gd * 0.11, 1.4, 5.5 + (rb.gk || 0) * 2) + (gd > 48 && rb.gk ? 6 * rb.gk : 0), k = out / Math.max(gd, 1); u = pmU(s, (s ? 105 : 0) + (bx - (s ? 105 : 0)) * k); v = pmV(s, gy + (by - gy) * k); if (hd && hd.s !== s && gd < 20 && pmPress(lm, hd) < 0.2) { u += 3.5; ur = 1; } } }
        else { let fr = has ? PFR_IN[sl] + (rb.fi || 0) + e.fo * 0.1 + (ln === 1 && sl !== 1 ? tc[0] * 0.04 : ln === 2 ? tc[0] * 0.02 : 0) : PFR_OUT[sl] + (rb.fo || 0) + e.fo * 0.04 + (ln === 2 ? tc[0] * 0.06 : ln === 3 ? tc[0] * 0.03 : 0); if (T.nfb && (sl === 7 || sl === 8)) fr += has ? -0.08 : -0.42; if (has && sl === 4 && T.ndm >= 2 && !T.ncm) fr += PMC.dmUp; if (T.n3 <= 1 && sl >= 6 && sl <= 8) fr += has ? (bu > 55 ? PMC.amUp : PMC.amUp / 2) : -PMC.amBack; if (has && rb.hold) fr = Math.min(fr, 0.3); if (has && (e.ins & 32)) fr = Math.min(fr, PFR_IN[sl]);
          if (has && rb.drop && bu < 75) fr -= 0.2; if (has && rb.late && bu > 68) fr += 0.14; if (has && rb.come && pmHyp(e.x, e.y, bx, by) > 16) fr += (bu - (lineU + fr * len)) / len * 0.35;
          u = lineU + fr * len; let v0 = e.v0; if (has && rb.inv) v0 = 34 + (v0 - 34) * (1 - 0.55 * rb.inv * (bu > 55 || ln === 1 ? 1 : 0.4)); if (has && rb.wide) v0 = 34 + (v0 - 34) * (1 + 0.1 * rb.wide);
          if (has && bu > 58 && (sl >= 7 && sl <= 10) && (bv - 34) * (v0 - 34) < 0 && !(e.ins & 32)) v0 = 34 + (v0 - 34) * (sl >= 9 || T.n3 <= 1 ? PMC.farIn : (1 + PMC.farIn) / 2);
          v = 34 + (v0 - 34) * wf + (bv - 34) * (has ? 0.16 : 0.36); if (PMV[sl] === undefined && has && ln >= 2) v += (bv - v) * 0.08;
          if (has) { const cap = off - 0.15 + e.ofe; if (rnd() < 0.004) e.ofe = gauss() * 0.9; if (u > cap && u > bu + 0.5) u = Math.max(cap, bu + 0.5); const rn = ln === 3 || rb.run || (T.n3 <= 1 && (sl === 6 || sl === 7 || sl === 8)); if (rn) { if (e.run > M.t) { u = Math.max(u, Math.min(off - 0.3 + e.ofe * 0.6, 100)); ur = 0.95; } else if (hd && hu > 34 && hu < 88 && eu >= hu && !(e.ins & 32) && rnd() < (0.04 + 0.1 * (rb.run || (ln === 3 ? 0.4 : PMC.run1))) * (T.n3 === 2 && sl === 11 ? PMC.run2 : 1) * PDT * (off < 72 ? 2.6 : off < 80 ? 1.5 : 0.8)) e.run = M.t + 2.6; } if (brkOn && (ln === 3 || (ln === 2 && (tc[3] === 3 || tc[0] > 1 || rb.late || rb.run || (T.n3 <= 1 && sl >= 6))))) { ur = Math.max(ur, 0.92); u = Math.min(Math.max(u, eu + 6), Math.max(off - 0.4 + e.ofe, bu + 1), 100); if (rn) e.run = M.t + 0.6; } u = Math.min(u, 101); }
          else { if (ln === 1) u = Math.min(u, Math.max(rbu - 2.5, 5)); if (rbu < eu - 1 && ln <= 2) { ur = 0.95; u = Math.min(u, rbu - 3); } if (tr < 5) ur = Math.max(ur, 0.85); if (tr < PMC.trD * (1 + PMC.mTr * tc[0])) ur = Math.min(ur, 0.35);
            // marking: shade towards the nearest attacker in the zone, goal side
            let mk = null, md = (e.ins & 1) ? 13 : 9; for (const a of O) { if (!a || a === hd || a.sl === 0) continue; const au = pmU(s, a.x); if (au > 62) continue; const d = pmHyp(a.x, a.y, s ? 105 - u : u, s ? 68 - v : v); if (d < md) { md = d; mk = a; } }
            if (mk) { const w = (ln === 1 ? 0.5 : 0.4) + (rb.mk || 0) + ((e.ins & 1) ? 0.3 : 0) + (pmU(s, mk.x) < 30 ? PMC.mkBox * (1 - 0.4 * tc[0]) : 0), mu0 = pmU(s, mk.x) - 1.6, mv = pmV(s, mk.y); u += ((ln === 1 ? Math.max(mu0, lineU - 0.5) : mu0) - u) * w; v += (mv - v) * w; } }
          v = clamp(v, 2.5, 65.5); u = clamp(u, 3, 102); }
        let tx = s ? 105 - u : u, ty = s ? 68 - v : v;
        if (pressers && sl !== 0) { const i = pressers.indexOf(e); if (i === 0) { const gxo = s ? 105 : 0, gd = pmHyp(bx, by, gxo, 34) + 0.1, jk = hd && hd.s !== s ? (gd < PMC.boxEng ? 0.8 : (e.ins & 2) || pr === 2 ? PMC.jock * 0.6 : PMC.jock) : 0.3; tx = bx + (hd ? hd.vx * 0.3 : 0) + (gxo - bx) / gd * jk; ty = by + (hd ? hd.vy * 0.3 : 0) + (34 - by) / gd * jk; ur = rbu < zone || pmHyp(e.x, e.y, bx, by) < 9 ? 1 : 0.7; if (rbu >= zone && pmHyp(e.x, e.y, bx, by) < 7) { tx = bx - dir * 6; } } else if (i > 0) { tx += (bx - dir * 5 - tx) * 0.65; ty += (by + (i === 1 ? 4 : -4) - ty) * 0.65; ur = 0.92; } }
        if (has && hd && hd !== e && sl !== 0) { const d = pmHyp(e.x, e.y, hd.x, hd.y); if (d < 6.5) { tx += (e.x - hd.x) / (d + 0.1) * 3; ty += (e.y - hd.y) / (d + 0.1) * 3; } }
        if (e.meet) { if (e.meet[2] < M.t) e.meet = null; else { tx = e.meet[0]; ty = e.meet[1]; ur = 1.05; } }
        if (B.st === 'loose' && sl !== 0 && e.chase === M.tick) { tx = B.x1; ty = B.y1; ur = 1.05; }
        if (hd === e) { if (e.car) { tx = e.x + e.car[0] * 8; ty = e.y + e.car[1] * 8; ur = e.free ? 0.94 : 0.8; } else { tx = e.x + dir * (sl === 0 ? 0 : 2.5); ty = e.y; ur = 0.4; } }
        if (dead && B.wait === e) { tx = B.x; ty = B.y; ur = 1.1; } else if (dead && !has && (B.rs === 'fk' || B.rs === 'throw') && pmHyp(tx, ty, B.x, B.y) < 9) { const d = pmHyp(tx, ty, B.x, B.y) + 0.1; tx = B.x + (tx - B.x) / d * 9.2; ty = B.y + (ty - B.y) / d * 9.2; }
        e.tx = clamp(tx, 0.5, 104.5); e.ty = clamp(ty, 0.5, 67.5); e.ur = e.stun > M.t ? 0.25 : ur; } } }
  function pmMove(lm) {
    const M = lm.pm; for (let s = 0; s < 2; s++) for (const e of M.E[s]) { if (!e) continue; const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy), vmax = e.vm * e.ur, sp = d < 0.05 ? 0 : Math.min(vmax, d / (e.ur >= 0.85 ? 0.4 : 1.5)), wx = d ? dx / d * sp : 0, wy = d ? dy / d * sp : 0, ax = wx - e.vx, ay = wy - e.vy, am = Math.hypot(ax, ay), amax = 7.5 * PDT;
      if (am > amax) { e.vx += ax / am * amax; e.vy += ay / am * amax; } else { e.vx = wx; e.vy = wy; } const mv = Math.hypot(e.vx, e.vy) * PDT; e.x = clamp(e.x + e.vx * PDT, 0, 105); e.y = clamp(e.y + e.vy * PDT, 0, 68); e.dm += mv * (mv > e.vm * PDT * 0.8 ? 1.45 : 1) * (e.sl === 0 ? 0.25 : 1); } }
  function pmFrame(lm) { const M = lm.pm, B = M.B, f = new Float32Array(48); for (let s = 0; s < 2; s++) for (let k = 0; k < 11; k++) { const e = M.E[s][k], i = (s * 11 + k) * 2; if (e) { f[i] = e.x; f[i + 1] = e.y; } else { f[i] = -99; f[i + 1] = -99; } } f[44] = B.x; f[45] = B.y; f[46] = B.z || 0; f[47] = B.h ? B.h.s * 11 + B.h.k : B.st === 'dead' ? -2 : -1; M.fr.push(f); }
  function pmTick(lm) {
    const M = lm.pm, B = M.B; M.tick++;
    if (B.st === 'dead') { B.w -= PDT; pmTargets(lm); pmMove(lm); if (B.w <= 0) pmRestart(lm); if (lm.rec) pmFrame(lm); return; }
    M.t += PDT * PMC.clk; M.pt[M.side]++; if (lm.dbg) pmC(lm, 's_' + B.st); { const s = M.side, t3 = Math.min(2, Math.floor(pmU(s, B.x) / 35)); M.px.ter[s][t3]++; }
    if (B.st === 'held') { const h = B.h; if (!h || M.E[h.s][h.k] !== h) { B.st = 'loose'; B.h = null; B.x1 = B.x; B.y1 = B.y; B.lt = M.side; } else { const dir = h.s ? -1 : 1; B.x = clamp(h.x + (h.car ? h.car[0] : dir) * 0.7, 0, 105); B.y = clamp(h.y + (h.car ? h.car[1] : 0) * 0.7, 0, 68); if (!pmDuel(lm, h) && M.B.h === h && M.B.st === 'held') { h.think -= PDT; if (h.think <= 0) pmDecide(lm, h); } } }
    else if (B.st === 'fly') { B.t0 += PDT; const k = clamp(B.t0 / B.T, 0, 1); B.x = B.x0 + (B.x1 - B.x0) * k; B.y = B.y0 + (B.y1 - B.y0) * k; B.z = B.loft ? Math.sin(k * Math.PI) * Math.min(9, B.T * 4.5) : B.kind === 'shot' ? k * 1.2 : 0;
      if (B.res === 'int' && B.by && k >= B.at) { const o = B.by; if (M.E[o.s][o.k] === o) { o.x += (B.x - o.x) * 0.75; o.y += (B.y - o.y) * 0.75; if (rnd() < (B.at < 0.88 ? 0.42 : 0.15)) o.L.it++; pmGive(lm, o); } else B.res = 'ok'; }
      else if (B.kind !== 'shot' && (B.x < 0 || B.x > 105 || B.y < 0 || B.y > 68)) { B.z = 0; pmOut(lm, B.x, B.y, B.from ? B.from.s : M.side); }
      else if (k >= 1) pmFlyEnd(lm); }
    else if (B.st === 'loose') { const d = pmHyp(B.x, B.y, B.x1, B.y1); if (d > 0.3) { const sp = Math.min(d, 9 * PDT); B.x += (B.x1 - B.x) / d * sp; B.y += (B.y1 - B.y) / d * sp; } B.z = 0;
      if (B.x <= 0 || B.x >= 105 || B.y <= 0 || B.y >= 68) pmOut(lm, B.x, B.y, B.lt === undefined ? M.side : B.lt);
      else { let got = null, gd = 1.5; for (let s = 0; s < 2; s++) { const c = pmNearest(M.E[s], B.x1, B.y1, false); if (c) c.chase = M.tick; const c2 = pmNearest(M.E[s], B.x, B.y, false); if (c2) { c2.chase = M.tick; const dd = pmHyp(c2.x, c2.y, B.x, B.y) - (c2.stun > M.t ? -3 : 0) + rnd() * 0.3; if (dd < gd) { gd = dd; got = c2; } } } if (got) pmGive(lm, got, got.sl === 0 ? 2 : undefined); } }
    pmTargets(lm); pmMove(lm);
    if (lm.rec) pmFrame(lm); }
  function pmChunk(lm) {
    const M = lm.pm, H = lm.H, A = lm.A; pmSync(lm); M.ids = []; for (let s = 0; s < 2; s++) for (let k = 0; k < 11; k++) { const L = (s ? A : H).cur[k]; M.ids.push(L ? L.id : 0); } M.fr = []; M.fe = []; M.hl = []; M.cuts = []; M.pstart = 0; M.lastShot = -99; const t0 = M.t, pend = M.p1 * 60 + (M.p1 === 45 || M.p1 === 90 ? M.add : 30), tick0 = M.tick; M.next = Math.min(pend, (Math.floor(M.t / 60) + 1) * 60); let n = 0, over = false;
    for (let s = 0; s < 2; s++) for (const e of M.E[s]) if (e) e.dm = 0;
    while (n++ < 1400) { pmTick(lm); const B = M.B; if (lm.done) break;
      if (M.t >= M.next && M.tick - M.lastShot > 16) { const safe = B.st === 'dead' || (B.st === 'held' && pmU(M.side, B.x) < 70) || n > 900; if (safe) { if (M.t >= pend) over = true; break; } } }
    // minute bookkeeping: minutes played, possession, energy, tired warnings, injuries
    const mn = over ? M.p1 : pmMin(lm), dm = Math.max(0, mn - M.lastMin); lm.min = mn; M.lastMin = mn; const tot = M.pt[0] + M.pt[1] || 1; lm.ps = Math.round(M.pt[0] / tot * 100); H.pos = lm.ps * mn; A.pos = (100 - lm.ps) * mn; H.tkr = A.tkr = 1;
    for (let s = 0; s < 2; s++) { const T = s ? A : H, E = M.E[s], dr = 1 - 0.03 * staffLv(T.ci, 'fit'); let tk = 0; for (const L of T.L) tk += L.tk; T.tkr = tk ? clamp((T.tkw || 0) / tk, 0.3, 0.95) : 0.7;
      for (let k = 0; k < 11; k++) { const e = E[k]; if (!e) continue; const L = e.L; L.mins += dm; M.px.dist[s] += e.dm; const ap = M.px.ap[s]; ap[k * 3] += e.x; ap[k * 3 + 1] += e.y; ap[k * 3 + 2]++;
        L.en -= e.dm * PMC.drain * clamp(1 - (L.p.st[5] - 60) * 0.0065, 0.74, 1.23) * dr * (T.dm[k] || 1) * ((e.ins & 2) ? 1.06 : 1) * (1 + 0.07 * (T.tac[2] - 1)) + (e.sl === 0 ? 0.1 * dm : 0); if (L.en < 5) L.en = 5;
        if (T.mine && !L.warn && L.en < 46 && e.sl !== 0) { L.warn = 1; lm.ev.push([mn, 'w', s, L.id, 0]); } }
      const tr = T.mine ? (S.C[T.ci].tr === undefined ? 1 : S.C[T.ci].tr) : 1, ir = 0.006 / 90 * 11 * (lm.wx === 2 ? 1.4 : 1) * (tr === 0 ? 0.85 : tr === 2 ? 1.25 : 1) * (1 - 0.05 * staffLv(T.ci, 'med')) * (lm.o.fr ? 0.3 : 1);
      if (!lm.dbg) for (let i = 0; i < dm; i++) if (rnd() < ir * 6.48) { const k = ri(0, 10), L = T.cur[k]; if (L && rnd() < (L.p.fi < 55 ? 2.4 : L.p.fi < 70 ? 1.5 : 1) * (L.p.kn ? 1.8 : 1) * (L.en < 35 ? 1.5 : 1) / 6.48) { lmInjure(lm, T, k); if (lm.rec) M.fe.push([M.fr.length - 1, lm.ev.length - 1, 0, 0]); } } }
    { const lh = M.E[0], la = M.E[1]; let a = 0, b = 0, na = 0, nb = 0; for (const e of lh) if (e && LINE[e.sl] === 1) { a += e.x; na++; } for (const e of la) if (e && LINE[e.sl] === 1) { b += 105 - e.x; nb++; } if (na) { M.px.line[0] += a / na; M.px.line[1]++; } if (nb) { M.px.line[2] += b / nb; M.px.line[3]++; } }
    lm.ht = 0; if (over) { M.t = M.p1 * 60; if (M.p1 === 45) { M.p0 = 45; M.p1 = 90; M.add = 120 + ri(0, 180); lm.ht = 1; pmSync(lm); pmSetKick(lm, 1, 0); } else if (M.p1 === 90) { M.p0 = 90; M.p1 = 105; pmSync(lm); pmSetKick(lm, 0, 0); } else if (M.p1 === 105) { M.p0 = 105; M.p1 = 120; pmSync(lm); pmSetKick(lm, 1, 0); } }
    M.t0 = t0; }
  function pmPx(lm) { const M = lm.pm, px = M.px, r = v => Math.round(v * 10) / 10, ap = [[], []]; for (let s = 0; s < 2; s++) { const T = s ? lm.A : lm.H; for (let k = 0; k < 11; k++) { const n = px.ap[s][k * 3 + 2], L = T.cur[k]; ap[s].push(n && L ? [L.id, r(px.ap[s][k * 3] / n), r(px.ap[s][k * 3 + 1] / n)] : null); } }
    return { ter: px.ter, ch: px.ch, reg: px.reg, shots: px.shots, ap, line: [px.line[1] ? r(px.line[0] / px.line[1]) : 0, px.line[3] ? r(px.line[2] / px.line[3]) : 0], thr: px.thr, drb: px.drb, air: px.air, dist: [Math.round(px.dist[0]), Math.round(px.dist[1])] }; }
  function liveFrames() { const lm = LM; if (!lm || !lm.pm) return null; const M = lm.pm; return { f: M.fr, fe: M.fe, hl: M.hl, cuts: M.cuts, ids: M.ids || [], dt: PDT, t0: M.t0, t1: M.t, min: lm.min }; }
  function setSlotFocus(k, v) { const c = S.C[S.user]; c.fo = c.fo || {}; v = clamp(Math.round(+v), -1, 1); if (v) c.fo[k] = v; else delete c.fo[k]; }
  function setSlotIns(k, bit, on) { const c = S.C[S.user]; c.ins = c.ins || {}; const b = 1 << +bit; c.ins[k] = on ? (c.ins[k] || 0) | b : (c.ins[k] || 0) & ~b; if (!c.ins[k]) delete c.ins[k]; }
  function liveSlot(k, what, a, b) { const lm = LM, T = lmMine(); if (!T || lm.done || !T.cur[k]) return { ok: false, msg: 'That is not possible right now.' }; k = +k;
    if (what === 'role') { if (!ROLEDEF[T.slots[k]][+a]) return { ok: false, msg: 'Unknown role.' }; if (+a) T.rl[k] = +a; else delete T.rl[k]; } else if (what === 'focus') { T.fo[k] = clamp(Math.round(+a), -1, 1); } else if (what === 'ins') { const bit = 1 << +a; T.ins[k] = b ? (T.ins[k] || 0) | bit : (T.ins[k] || 0) & ~bit; } else return { ok: false, msg: '' };
    lmLam(lm); return { ok: true, msg: T.cur[k].p.n + ': ' + (what === 'role' ? ROLEDEF[T.slots[k]][T.rl[k] || 0][0] : what === 'focus' ? ['defend', 'balanced', 'attack'][(T.fo[k] || 0) + 1] + ' focus' : PINS[+a][0].toLowerCase() + (b ? ' on' : ' off')) + '.' }; }
  function pmSim(hi, ai, o, opt) { // headless match for calibration and tests: no effect on the career
    opt = opt || {}; const rs = S.rs; if (opt.seed) S.rs = opt.seed | 0; const lm = lmCreate(hi, ai, Object.assign({ fr: 1 }, o || {})); lm.dbg = 1; lm.auto = 1; if (opt.rec) lm.rec = 1;
    if (opt.tac) for (let s = 0; s < 2; s++) if (opt.tac[s]) (s ? lm.A : lm.H).tac = opt.tac[s].slice(); if (opt.shift) { lm.H.ao += opt.shift; lm.H.dfo += opt.shift; } if (opt.boost) lm.H.bst = opt.boost; if (opt.ao) lm.H.ao += opt.ao; if (opt.dfo) lm.H.dfo += opt.dfo; if (opt.rl) lm.H.rl = opt.rl; if (opt.fo) lm.H.fo = opt.fo; if (opt.ins) lm.H.ins = opt.ins; if (opt.nosub) lm.H.subs = lm.A.subs = 5;
    const frames = []; let g = 0; while (!lm.done && g++ < 400) { lmStep(lm, 1); if (opt.rec) frames.push(liveFramesOf(lm)); } const r = lmSnap(lm); r.lamOld = [lm.lh, lm.la]; r.en = [lm.H, lm.A].map(T => { let t = 0, n = 0; for (const L of T.L) if (!L.on && !L.off && L.sl !== 0) { t += L.en; n++; } return n ? t / n : 0; }); r.cn = lm.pm ? lm.pm.cn : null; r.clock = lm.pm ? lm.pm.t : 0; r.ticks = lm.pm ? lm.pm.tick : 0; if (opt.rec) r.frames = frames; if (!opt.keepRng) S.rs = rs; return r; }
  function liveFramesOf(lm) { const M = lm.pm; return M ? { f: M.fr, fe: M.fe, hl: M.hl, cuts: M.cuts, ids: M.ids, dt: PDT, t0: M.t0, t1: M.t, min: lm.min } : null; }

  // ================= departures (expiring contracts, retirements) and the news desk =================
  // seasons that roll off the 4-season history are folded into per-club totals (p.ho[club] = [seasons, 0, ...sums]; [7] holds rating x apps)
  function hoAdd(p, r) { p.ho = p.ho || {}; const a = p.ho[r[1]] || (p.ho[r[1]] = new Array(19).fill(0)); a[0]++; for (let i = 2; i < 19; i++) { if (i === 12) continue; a[i] = Math.round(((a[i] || 0) + (i === 7 ? (r[7] || 0) * (r[2] || 0) : (r[i] || 0))) * 100) / 100; } }
  const WRITER = { n: 'Nia Okafor', h: '@OkaforMatchDesk' };
  function newsM(tag, h, b, ci, pid) { news(tag, h, b, ci, pid); S.news[0].k = 'm'; }
  function nfOnce(key) { S.nf = S.nf || {}; if (S.nf[key] === S.season) return false; S.nf[key] = S.season; return true; }
  function alertU(h, x) { (S.alerts = S.alerts || []).push({ h, x }); if (S.alerts.length > 6) S.alerts.shift(); }
  function takeAlerts() { const a = S.alerts || []; S.alerts = []; return a; }
  // ---- who is leaving the user's club this summer ----
  function leaving() { const u = S.C[S.user], out = []; if (!u || S.dc) return out;
    for (const p of u.sq) { if (p.loan) continue; const n = S.rn[p.id];
      if (p.ret === 1) out.push({ id: p.id, why: 'retire', tried: !!p.retT });
      else if (p.cy <= 1 && !(n && n.st === 'done')) { const auto = !!(S.opts.autoRenew && p.mo >= 25 && p.o >= u.rep - 9); out.push({ id: p.id, why: 'contract', dead: !!(n && n.st === 'dead'), ld: !!(n && n.ld), auto }); } }
    return out.sort((a, b) => X.PM.get(b.id).o - X.PM.get(a.id).o); }
  function retRoll() { // decided in March, carried out in the summer, so it can be announced and argued over
    for (const p of S.P) { if (p.c < 0 || p.ret !== undefined) continue; const ra = p.p === 0 ? 36 : 34, a1 = p.a + 1; if (a1 < ra || rnd() >= (a1 - ra + 1) * 0.22) continue; p.ret = 1;
      if (p.c === S.user) { mail('Club secretary', p.n + ' plans to retire', p.n + ' (' + p.a + ', ' + POS[p.p] + ') has told the staff this will be his last season. He is open to one more conversation before he makes it official.', ['Ask him to play one more season', 'Wish him well'], { type: 'retire', pid: p.id }); alertU('Retirement', p.n + ' plans to retire this summer. Ask him to stay in your inbox or the Leaving panel.'); }
      else if (p.o >= 83 && nfOnce('ret' + p.id)) newsM('RETIRING', p.n + ' to retire this summer', p.n + ' (' + p.a + ') has told ' + S.C[p.c].n + ' that this season will be his last. ' + (p.car[0] > 300 ? 'A career of more than ' + Math.floor(p.car[0] / 100) * 100 + ' appearances is coming to an end.' : 'One last run-in, then the boots go on the wall.'), p.c, p.id); }
    S.retS = S.season; }
  function persuade(pid) { const p = X.PM.get(pid); if (!p || p.c !== S.user || p.ret !== 1) return { ok: false, msg: 'Nothing to discuss.' }; if (p.retT) return { ok: false, msg: p.n + ' has already given you his answer.' };
    p.retT = 1; const ra = p.p === 0 ? 36 : 34, ch = clamp(0.62 - 0.14 * (p.a + 1 - ra) + (p.mo - 55) / 160 + (p.ss[0] >= 15 ? 0.12 : -0.08), 0.08, 0.85);
    if (rnd() < ch) { p.ret = 0; if (p.cy <= 1) p.cy += 1; p.mo = clamp(p.mo + 6, 0, 100); story('Talked ' + p.n + ' out of retiring.'); return { ok: true, res: 'stay', msg: p.n + ' will play one more season. His contract runs a year longer on the same wage.' }; }
    return { ok: true, res: 'go', msg: p.n + ' thanks you, but his mind is made up. He retires in the summer.' }; }
  function lastDitch(pid) { const p = X.PM.get(pid), n = S.rn[pid]; if (!p || p.c !== S.user || !n || n.st !== 'dead') return { ok: false, msg: 'There are no stalled talks to reopen.' }; if (n.ld) return { ok: false, msg: 'You have already had your last chance with ' + p.n + '.' };
    if (S.t < 72) return { ok: false, msg: 'He will not reopen talks yet. Try again in the final weeks of the season.' };
    n.ld = 1; n.st = 'con'; n.cten = 55; n.dm = Math.round(n.dm * 1.12 / 100) * 100; n.cmin = Math.round(n.cmin * 1.08 / 100) * 100; n.said = 'His agent agrees to one last meeting. The price has gone up: ' + money(n.dm) + ' a week. If this fails, he leaves on a free.'; return { ok: true, msg: n.said }; }
  function lastCall() { return S.t === SLOTS - 1 && S.lcS !== S.season && !S.dc ? leaving().filter(x => !x.auto) : []; }
  function lastCallAck() { S.lcS = S.season; }
  // ---- the match desk ----
  const BIGL = li => S.L[li].t === 1 && S.L[li].teams.reduce((s, c) => s + S.C[c].rep, 0) / S.L[li].teams.length >= 74.5;
  function newsDesk(evs, out) { const u = S.C[S.user], ul = u.l, cands = [];
    const add = (pri, tag, h, b, ci, pid) => cands.push([pri, tag, h, b, ci, pid]);
    const hat = X.hat || [];
    for (const ev of evs) {
      if (ev[0] === 'L') { const li = ev[1], r = ev[2], L = S.L[li], mine = li === ul, big = BIGL(li); if (!mine && !big) continue; const rows = L.res[r] || [], left = L.rounds.length - r - 1;
        for (const hh of hat) { const p = X.PM.get(hh[0]); if (!p || S.C[hh[1]].l !== li) continue; const row = rows.find(x => x[0] === hh[1] || x[1] === hh[1]); if (!row) continue; const opp = row[0] === hh[1] ? row[1] : row[0], sc = row[0] + '' === hh[1] + '' ? row[2] + '–' + row[3] : row[3] + '–' + row[2];
          if (mine || p.o >= 84) add(mine ? 8 : 7, 'HAT-TRICK', p.n + ' hits ' + (hh[2] > 3 ? hh[2] : 'a hat-trick') + ' against ' + S.C[opp].n, p.n + ' scored ' + hh[2] + ' as ' + S.C[hh[1]].n + ' ' + (row[0] === hh[1] ? (row[2] > row[3] ? 'beat' : row[2] === row[3] ? 'drew with' : 'lost to') : (row[3] > row[2] ? 'beat' : row[3] === row[2] ? 'drew with' : 'lost to')) + ' ' + S.C[opp].n + ' ' + sc + ' in the ' + L.n + '.', hh[1], p.id); }
        let bw = null, up = null; for (const x of rows) { const m = Math.abs(x[2] - x[3]); if (m >= 4 && (!bw || m > bw[4])) bw = [...x, m]; if (x[2] !== x[3]) { const w = x[2] > x[3] ? x[0] : x[1], l = w === x[0] ? x[1] : x[0], d = S.C[l].rep - S.C[w].rep; if (d >= (mine ? 7 : 9) && (!up || d > up[3])) up = [w, l, x, d]; } }
        if (bw && (mine || Math.max(S.C[bw[0]].rep, S.C[bw[1]].rep) >= 82)) { const hw = bw[2] > bw[3], w = hw ? bw[0] : bw[1], l = hw ? bw[1] : bw[0]; add(mine ? 5 : 3, 'RESULT', S.C[w].n + ' thrash ' + S.C[l].n + ' ' + Math.max(bw[2], bw[3]) + '–' + Math.min(bw[2], bw[3]), 'A rout in the ' + L.n + '. ' + S.C[w].n + ' ' + (hw ? 'at home' : 'on the road') + ' put ' + Math.max(bw[2], bw[3]) + ' past ' + S.C[l].n + ', who now sit ' + ord(table(li).indexOf(l) + 1) + '.', w); }
        if (up && (mine || S.C[up[1]].rep >= 83)) { const x = up[2], sc = x[2] > x[3] ? x[2] + '–' + x[3] : x[3] + '–' + x[2]; add(mine ? 6 : 5, 'SHOCK', S.C[up[0]].n + ' stun ' + S.C[up[1]].n, 'Nobody saw this coming. ' + S.C[up[0]].n + ' beat ' + S.C[up[1]].n + ' ' + sc + ' in the ' + L.n + '. On paper they were miles apart.', up[0]); }
        const tb = table(li), top = tb[0]; X.lead = X.lead || {}; if (r >= 5 && X.lead[li] !== undefined && X.lead[li] !== top && (mine || big)) add(mine ? 6 : 4, 'TOP SPOT', S.C[top].n + ' go top of the ' + L.n, S.C[top].n + ' are the new leaders with ' + L.tbl[top][6] + ' points from ' + L.tbl[top][0] + ' games. ' + S.C[X.lead[li]].n + ' drop to ' + ord(tb.indexOf(X.lead[li]) + 1) + '.', top); X.lead[li] = top;
        if (left >= 0 && L.tbl[top][6] - L.tbl[tb[1]][6] > left * 3 && nfOnce('champ' + li)) add(10, 'CHAMPIONS', S.C[top].n + ' are ' + L.n + ' champions', S.C[top].n + ' cannot be caught. ' + (left ? 'With ' + left + ' game' + (left > 1 ? 's' : '') + ' to spare, ' : '') + 'they finish the job on ' + L.tbl[top][6] + ' points' + (top === S.user ? '. Your title.' : '.'), top);
        if (mine) { const z = zones(li), safe = tb.length - z.down; if (z.down && safe > 0 && left < 10) for (let i = safe; i < tb.length; i++) { const c = tb[i]; if (L.tbl[c][6] + left * 3 < L.tbl[tb[safe - 1]][6] && nfOnce('rel' + c)) add(c === S.user ? 10 : 6, 'RELEGATED', S.C[c].n + ' are relegated', S.C[c].n + ' go down from the ' + L.n + '. ' + (c === S.user ? 'The board will want answers.' : 'It has been coming for weeks.'), c); } }
        if (mine && S.t % 10 === 5) { let best = null; for (const ci of L.teams) for (const p of S.C[ci].sq) if (!best || p.ss[1] > best.ss[1]) best = p; if (best && best.ss[1] >= 5) add(2, 'GOLDEN BOOT', best.n + ' leads the ' + L.n + ' scoring chart', best.n + ' of ' + S.C[best.c].n + ' has ' + best.ss[1] + ' goals this season' + (best.ss[2] ? ' and ' + best.ss[2] + ' assists' : '') + '.', best.c, best.id); } }
      else if (ev[0] === 'C') { const cup = S.cups[ev[1]]; if (!cup || cup.w < 0 || !nfOnce('cup' + ev[1])) continue; const fin = cup.res[cup.rounds - 1] && cup.res[cup.rounds - 1][0], mine = cup.c === u.ctry || cup.w === S.user;
        if (fin && (mine || S.C[cup.w].rep >= 80)) { const sc = fin[5] === fin[0] ? fin[2] + '–' + fin[3] : fin[3] + '–' + fin[2], ru = fin[5] === fin[0] ? fin[1] : fin[0]; add(cup.w === S.user ? 10 : 7, 'CUP FINAL', S.C[cup.w].n + ' win the ' + cup.n, S.C[cup.w].n + ' beat ' + S.C[ru].n + ' ' + sc + (fin[4] === 'pens' ? ' on penalties' : fin[4] === 'aet' ? ' after extra time' : '') + ' in the final.', cup.w); } }
      else if (ev[0] !== 'E' && ev[0] !== 'P') { const k = ev[1], E2 = S.eu[k]; if (!E2) continue;
        if (E2.stage === 'done' && E2.w >= 0 && nfOnce('euw' + k)) { const f = E2.ko.f && E2.ko.f[0], ru = f ? (f.a === E2.w ? f.b : f.a) : -1; add(10, 'EUROPE', S.C[E2.w].n + ' win the ' + E2.n, S.C[E2.w].n + (ru >= 0 ? ' beat ' + S.C[ru].n : '') + ' in the final' + (f && f.legs[0] ? ' ' + Math.max(f.legs[0][0], f.legs[0][1]) + '–' + Math.min(f.legs[0][0], f.legs[0][1]) + (f.legs[0][2] === 'pens' ? ' on penalties' : f.legs[0][2] === 'aet' ? ' after extra time' : '') : '') + '. ' + (k === 0 ? 'Champions of Europe.' : 'Silverware on the continent.'), E2.w); }
        else if (E2.stage === 'sf' && E2.ko.sf && nfOnce('eusf' + k)) add(k === 0 ? 6 : 3, 'EUROPE', E2.n + ' semi-finals set', E2.ko.sf.map(t => S.C[t.a].n + ' v ' + S.C[t.b].n).join(' and ') + '. Two more ties to the final.', E2.ko.sf[0].a); } }
    // the user's own form
    const um = S.um.slice(-8), last = um[um.length - 1]; if (last && out.length) { let w = 0, nw = 0; for (let i = um.length - 1; i >= 0 && um[i].res === 'W'; i--) w++; for (let i = um.length - 1; i >= 0 && um[i].res !== 'W'; i--) nw++;
      if ([4, 6, 10, 15, 20].indexOf(w) >= 0) add(4, 'FORM', u.n + ' make it ' + w + ' wins in a row', 'Everything is clicking for ' + S.mg.n + '\'s side. ' + w + ' straight wins and the dressing room believes.', S.user);
      if ([5, 8, 12].indexOf(nw) >= 0) add(4, 'FORM', u.n + ' without a win in ' + nw, 'The pressure is building on ' + S.mg.n + '. ' + nw + ' games without a win.', S.user);
      for (const m of out) { if (!m.sc) continue; const cnt = {}; for (const g of m.sc) if (g[0]) cnt[g[0]] = (cnt[g[0]] || 0) + 1; for (const id in cnt) if (cnt[id] >= 3) { const p = X.PM.get(+id); if (p && p.c === S.user) add(8, 'HAT-TRICK', p.n + ' hat-trick for ' + u.n, p.n + ' scored ' + cnt[id] + ' in the ' + m.gh + '–' + m.ga + ' against ' + S.C[m.h === S.user ? m.a : m.h].n + '.', S.user, p.id); } } }
    cands.sort((a, b) => b[0] - a[0]); const seen = new Set(); let n = 0;
    for (const c of cands) { const key = c[1] + c[2]; if (seen.has(key) || n >= 3) continue; seen.add(key); n++; newsM(c[1], c[2], c[3], c[4], c[5]); } }
  // ---------- views / helpers ----------
  function money(v) { const a = Math.abs(v), s = v < 0 ? '-' : ''; return s + '€' + (a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M' : a >= 1e3 ? Math.round(a / 1e3) + 'K' : Math.round(a)); }
  function leaders(li, key, n) {
    const out = []; const teams = li === -1 ? null : new Set(S.L[li].teams);
    for (const p of S.P) { if (p.c < 0 || (teams && !teams.has(p.c))) continue; const ap = p.ss[0]; if (!ap) continue; const v = key === 'g' ? p.ss[1] : key === 'a' ? p.ss[2] : key === 'cs' ? p.ss[4] : key === 'xg' ? p.ss[5] : key === 'xa' ? p.ss[6] : key === 'motm' ? p.ss[8] : (ap >= Math.max(5, S.t / 8) ? p.ss[3] / ap : 0); if (v > 0) out.push([p, v]); }
    out.sort((a, b) => b[1] - a[1]); return out.slice(0, n || 15);
  }
  function nextUserFixtures(n) {
    const out = []; for (let t = S.t; t < SLOTS && out.length < n; t++) for (const ev of S.sched[t] || []) {
      if (ev[0] === 'L') { const L = S.L[ev[1]]; if (S.C[S.user].l !== ev[1]) continue; for (const m of L.rounds[ev[2]]) if (m[0] === S.user || m[1] === S.user) out.push({ t, comp: L.n, h: m[0], a: m[1] }); }
      else if (ev[0] === 'E') { const E = S.eu[ev[1]]; for (const m of E.lp[ev[2]]) if (m[0] === S.user || m[1] === S.user) out.push({ t, comp: E.n, h: m[0], a: m[1] }); }
      else if (ev[0] === 'K') { const E = S.eu[ev[1]], ties = E.ko[ev[2]]; if (ties) { for (const T of ties) if (T.a === S.user || T.b === S.user) out.push(ev[2] === 'f' ? { t, comp: E.n + ' final', h: T.a, a: T.b } : ev[3] === 0 ? { t, comp: E.n, h: T.b, a: T.a } : { t, comp: E.n, h: T.a, a: T.b }); } else if (E.out[S.user] === undefined && E.teams.indexOf(S.user) >= 0 && t > S.t) out.push({ t, comp: E.n + ' (' + STAGEN[ev[2]] + ')', h: -1, a: -1, tbd: 1 }); }
      else if (ev[0] === 'C') { const c = S.cups[ev[1]]; if (c.out[S.user] === undefined && (c.alive.indexOf(S.user) >= 0 || c.wait.indexOf(S.user) >= 0) && (ev[2] > 0 || c.alive.indexOf(S.user) >= 0)) out.push({ t, comp: c.n + ' (' + cupRoundName(c, ev[2]) + ')', h: -1, a: -1, tbd: 1 }); }
      else if (ev[0] === 'P') { const Q = S.po[ev[1]]; if (Q) { const ts = ev[2] === 'f' ? (Q.f ? [Q.f] : []) : Q.sf; for (const T of ts) if (T.a === S.user || T.b === S.user) out.push(ev[2] === 'f' ? { t, comp: Q.n + ' final', h: T.a, a: T.b } : ev[3] === 0 ? { t, comp: Q.n, h: T.b, a: T.a } : { t, comp: Q.n, h: T.a, a: T.b }); } }
    }
    return out;
  }
  function zones(li) {
    const L = S.L[li], z = { up: 0, down: 0, cl: 0, el: 0, po: 0 }; const r = REL[L.c];
    if (r) { if (L.t > 1) z.up = r[L.t - 2] || 0; z.down = r[L.t - 1] || 0; }
    if (PO[L.c] && PO[L.c][L.t]) { z.up = PO[L.c][L.t][0]; z.po = PO[L.c][L.t][1]; }
    if (L.t === 1 && EUR.indexOf(L.c) >= 0) { z.cl = CLS[L.c] || 0; z.el = ELS[L.c] || 0; }
    return z;
  }
  function euTable(k) { return sortTable(S.eu[k].tbl); }
  function tiers(ctry) { const out = []; S.L.forEach((L, li) => { if (L.c === ctry) out.push(li); }); return out.sort((a, b) => S.L[a].t - S.L[b].t); }
  const PDEF = { sus: 0, yc: 0, inj: 0, tl: 0, idle: 0, fi: 100, pd: 0, kn: 0, j: 0, fm: 0, ht: 0, sh: 76, mo: 60, ll: 0, sk: 0 };
  function save() {
    const o = Object.assign({}, S); o.C = S.C.filter(c => !c.gh); delete o.flash; o.P = S.P.map(p => { const q = Object.assign({}, p); if (p.id < 900000) { delete q.n; delete q.nat; delete q.al; delete q.sm; delete q.wf; delete q.ft; delete q.sty; } delete q.ks; delete q.kp; for (const k in PDEF) if (q[k] === PDEF[k] || q[k] === undefined) delete q[k]; if (q.p0 === q.pot) delete q.p0; if (!q.hs.length) delete q.hs; if (!q.car[0] && !q.car[1] && !q.car[2]) delete q.car; const ss = q.ss; let z = true; for (let i = 0; i < ss.length; i++) if (ss[i]) { z = false; break; } if (z) delete q.ss; return q; });
    return JSON.stringify(o, (k, v) => (k === 'sq' || k === '_r' || k === '_pl' || k === 'xc' || k === '_b0' || k === '_lc' || k === '_r2' || k === 'mgrX') ? undefined : (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v));
  }
  function load(data, json) {
    D = data; S = typeof json === 'string' ? JSON.parse(json) : json; const m = new Map(); for (const r of data.players) m.set(r[0], r);
    for (const p of S.P) { if (p.n === undefined) { const r = m.get(p.id); p.n = r[1]; p.nat = r[3]; p.al = r[6]; p.sm = r[14]; p.wf = r[15]; p.ft = r[16]; } if (!p.sty) { const r = m.get(p.id); p.sty = (r && r[18]) || []; } for (const k in PDEF) if (p[k] === undefined) p[k] = PDEF[k]; if (!p.hs) p.hs = []; if (!p.car) p.car = [0, 0, 0]; if (!p.ss) p.ss = SS0(); if (p.p0 === undefined) p.p0 = p.pot; styleCalc(p); }
    rebuild(); for (let q = 0; q < 12; q++) X.byPos[q].sort((a, b) => b.o - a.o); for (const c of S.C) c.rep = c.rep || calcRep(c);
    if ((S.v || 2) < 3) {
      S.v = 3; S.news = []; S.rum = []; S.loffers = []; S.bb = []; S.reports = []; S.yrep = []; S.lout = []; S.pre = []; S.prei = 0; S.dn = 0; S.neg = {}; S.rn = {};
      const g = S.mg = { n: 'Manager', p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }; for (const h of S.hist) { g.p += h.w + h.d + h.l; g.w += h.w; g.d += h.d; g.l += h.l; g.gf += h.gf; g.ga += h.ga; }
      for (const o of S.offers) o.ten = 0; for (const c of S.C) if (!c.tac) c.tac = [0, 1, 1, 0]; for (const p of S.C[S.user].sq) p.sk = 1;
      initStaff(); refreshPools(); msg('Your save has been updated: tactics, staff, scouts, loans, training, press conferences and day-by-day advancing are now available.', 'info');
    }
    for (const p of S.P) while (p.ss.length < 16) p.ss.push(0); if (!S.ln) S.ln = {};
    if (S.v === 5) { S.v = 6; v6up(); }
    if (S.v < 5 && S.v >= 4) { S.v = 6; v6up(); msg('New in this version: make your own substitutions and tactical changes during a match, loan talks with every club, transfer suggestions from your staff, and position averages on every player.', 'info'); }
    if (S.v < 4) { S.v = 6; initInc(); v6up(); const z = FIN0(); for (const k in z) if (S.fin[k] === undefined) S.fin[k] = 0; msg('New in this version: live matches with full statistics, a commercial department (sponsors, ticket prices, facilities) and board requests for extra funds.', 'info'); }
    if (S.v === 6) { S.v = 7; v7up(); } S.flash = []; GH = null; LM = null;
    return S;
  }
  function setFormation(f) { if (FORMS[f]) { S.C[S.user].f = f; S.C[S.user].xi = null; S.C[S.user].rl = {}; S.C[S.user].fo = {}; S.C[S.user].ins = {}; } }
  function v6up() { const u = S.C[S.user]; if (!S.po) S.po = []; if (!S.acad) S.acad = []; if (!S.rec) S.rec = {}; if (!S.story) S.story = []; if (!S.jobs) S.jobs = []; if (!S.intl) S.intl = []; S.fired = S.fired || null; S.sack = null; S.mrf = 0; S.mr = Math.round(S.mr); if (S.opts.diff === undefined) S.opts.diff = 1; while (S.sched.length < SLOTS) S.sched.push([]); for (const c of S.C) if (c.l >= 0 && c !== u && !c.mgr) c.mgr = { n: staffName(), s: S.season - 1 }; for (const h of S.hist) if (!h.club) h.club = u.n; for (const a of S.arch) if (!a.club) a.club = u.n; if (!S.acad.length) acadIntake(6); story('Managing ' + u.n + ' in the ' + S.L[u.l].n + '.'); if (S.t >= 92 && !S.po.length) setupPlayoffs(); msg('New in this version: difficulty levels, job security and job offers, rivals, promotion play-offs, the EFL Cup, red cards, penalties and suspensions, player roles, opposition reports, a youth academy, personalities, club records and three save slots.', 'info'); }
  function benchSet(id, on) {
    const c = S.C[S.user], x = pickXI(S.user), cur = x.bench.map(p => p.id), p = X.PM.get(+id); if (!p || p.c !== S.user) return { ok: false, msg: 'He is not in your squad.' };
    if (!on) { if (cur.indexOf(p.id) < 0) return { ok: false, msg: 'He is not on the bench.' }; c.bn = cur.filter(q => q !== p.id); return { ok: true, msg: p.n + ' drops to the reserves.' }; }
    if (cur.indexOf(p.id) >= 0) return { ok: true, msg: '' }; if (x.pl.indexOf(p) >= 0) return { ok: false, msg: 'He is in the starting eleven.' }; if (p.inj || p.sus) return { ok: false, msg: p.n + ' is not available.' };
    if (cur.length >= 9) return { ok: false, msg: 'The bench is full. Swap him with one of the nine.' }; cur.push(p.id); c.bn = cur; return { ok: true, msg: p.n + ' is on the bench.' };
  }
  function benchSwap(inId, outId) {
    const c = S.C[S.user], x = pickXI(S.user), cur = x.bench.map(p => p.id), p = X.PM.get(+inId), i = cur.indexOf(+outId); if (!p || p.c !== S.user || i < 0) return { ok: false, msg: 'That swap is not possible.' };
    if (cur.indexOf(p.id) >= 0 || x.pl.indexOf(p) >= 0) return { ok: false, msg: 'He is already in the matchday squad.' }; if (p.inj || p.sus) return { ok: false, msg: p.n + ' is not available.' };
    const out = X.PM.get(+outId); cur[i] = p.id; c.bn = cur; return { ok: true, msg: p.n + ' takes ' + (out ? out.n + '\'s' : 'a') + ' place on the bench.' };
  }
  function benchAuto() { delete S.C[S.user].bn; return { ok: true, msg: 'Your assistant has picked the bench.' }; }
  function setXI(ids) { const c = S.C[S.user]; c.xi = ids; c.auto = ids ? 0 : 1; }

  const api = { POS, LINE, FORMS, PROFILES, STAGEN, SLOTS, newGame, advance, table, value, wage, dyn, dynParts, pen, pickXI, bestFormation, asking, willing, demand, resolveHijack, release, renewDemand, toggleList, answerOffer, windowOpen, dateOf, money, leaders, nextUserFixtures, save, load, setFormation, setXI, wageBill, att, ruleBlock, cupRoundName, reserved, pendWages, zones, euTable, tiers, EUKO, EUW, GOALS, ROLES, expRole, reply, unread, ddAdvance, approach, negFee, negContract, negWalk, renewStart, renewOffer, conNeed, leaving, persuade, lastDitch, lastCall, lastCallAck, takeAlerts, WRITER, sellCounter, toggleShort, setRole, startChallenge, dropChallenge, activeRules, ord, hash, INSIDER, MENT, LINES, PRESS, BUILD, TRAIN, WX, DEPT, xtv, known, nextDay, dateNow, negEnquire, bbFor, loanable, loanTerms, loanIn, buyOption, toggleLoanList, answerLoan, staffLv, staffWageOf, staffWages, maxStaffLv, hireCoach, hireScout, fireScout, setScoutTask, signYouth, rejectYouth, teamReport, skipPre, setTac, setTrain, setCaptain, setManager, budgetRange, setWageBudget, tacMod, signSponsor, setTicket, facCost, upgradeFac, boardOdds, boardRequest, liveBegin, liveStep, liveView, liveSub, liveTac, liveAsst, liveEnd, loanStance, loanOffer, perApp, posAvg, suggest, liveOn: () => !!LM, DIFF, TRAITS, ROLEDEF, trait, roleFit, setSlotRole, setPenTaker, cohesion, dynamics, isDerby, isRival, rivals, takeJob, resign, promoteYouth, releaseYouth, oppReport, setDiff, liveSwap, liveForm, liveTalk, ACH, UNLOCK, DMULT, award, careerScore, scoreParts, wallEntry, retire, chase, spotted, dailyInfo, dailyStart, dailyStep, dailyView, teamCode, teamParse, tacRead, ghostBegin, ghostEnd, ghostClear, ghostPair, ghostOn: () => !!GH, abandoned, takeNew, takeFlash, dmin, benchSet, benchSwap, benchAuto, PMC, PINS, liveFrames, setSlotFocus, setSlotIns, liveSlot, pmSim, WIDTH: ['Narrow', 'Balanced', 'Wide'],
    get S() { return S; }, get X() { return X; }, player: id => X.PM.get(id) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FCE = api;
})(typeof window !== 'undefined' ? window : globalThis);
