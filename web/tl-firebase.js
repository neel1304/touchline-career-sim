/* Touchline on its own website: the shared store, viewer identity and file saving that claude.ai provides,
   rebuilt on Firebase (Firestore + anonymous sign-in) behind the same window.claude.use() calls the game already makes.
   On claude.ai the platform's own window.claude is used and this file does nothing. Without a Firebase config the
   game runs single-player: shared leaderboards and friends leagues say they are unavailable. */
(function () {
  'use strict';
  if (window.claude && window.claude.use) return;
  const cfg = window.TL_FIREBASE, fb = window.firebase;
  const downloads = { save: ({ filename, data }) => { const b = data instanceof Blob ? data : new Blob([data], { type: 'text/plain' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = filename || 'touchline.txt'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return Promise.resolve(); } };
  let ready = null;
  function boot() {
    if (ready) return ready;
    if (!cfg || !cfg.apiKey || !fb) return (ready = Promise.resolve(null));
    ready = new Promise(res => {
      try {
        fb.initializeApp(cfg); const auth = fb.auth(), fs = fb.firestore(); let done = false;
        const go = u => { if (done || !u) return; done = true; res({ fs, uid: u.uid }); };
        auth.onAuthStateChanged(go); auth.signInAnonymously().catch(() => { if (!done) { done = true; res(null); } });
        setTimeout(() => { if (!done) { done = true; res(null); } }, 12000);
      } catch (e) { res(null); }
    });
    return ready;
  }
  // Firestore error codes, in the words the game's storage code understands
  const code = e => { const c = e && e.code; return { code: c === 'permission-denied' || c === 'unauthenticated' ? 'not_granted' : c === 'resource-exhausted' ? 'quota_exceeded' : c === 'invalid-argument' || c === 'not-found' || c === 'failed-precondition' ? 'invalid_argument' : 'unavailable', message: (e && e.message) || '' }; };
  const fail = p => p.catch(e => { throw code(e); });
  function wrapSnap(s) { return { id: s.id, exists: s.exists, data: () => s.data(), metadata: s.metadata }; }
  function wrapQuerySnap(q) { const docs = q.docs.map(wrapSnap); return { docs, size: q.size, empty: q.empty, metadata: q.metadata, docChanges: () => q.docChanges().map(c => ({ type: c.type, doc: wrapSnap(c.doc), oldIndex: c.oldIndex, newIndex: c.newIndex })) }; }
  function makeDb(fs, uid) {
    // every write carries its writer, so the security rules can let people change only what is theirs
    const now = () => (fb.auth().currentUser || {}).uid || uid, own = d => Object.assign({}, d, { _u: now() });
    function doc(path) {
      const r = fs.doc(path);
      return { id: r.id, path,
        get: () => fail(r.get()).then(wrapSnap),
        set: d => fail(r.set(own(d))), update: d => fail(r.update(own(d))), delete: () => fail(r.delete()),
        // a short lease kept in its own collection, so it never mixes with the document's own fields
        acquire: o => { const L = fs.collection('locks').doc(path.replace(/\//g, '~')), now = Date.now(), ttl = Math.min(600000, Math.max(1000, (o && o.ttlMs) || 30000));
          return fail(fs.runTransaction(t => t.get(L).then(s => { const x = s.exists ? s.data() : null; if (x && x.h !== o.holder && x.e > now) return { acquired: false, expiresAt: new Date(x.e).toISOString() }; t.set(L, { h: o.holder, e: now + ttl, _u: uid }); return { acquired: true, holder: o.holder, expiresAt: new Date(now + ttl).toISOString() }; }))); },
        onSnapshot: (next, err) => r.onSnapshot(s => next(wrapSnap(s)), e => err && err(code(e))),
        collection: c => coll(r.collection(c)) };
    }
    function coll(q) {
      const api = { path: q.path, where: (f, op, v) => coll(q.where(f, op, v)), orderBy: (f, d) => coll(q.orderBy(f, d)), limit: n => coll(q.limit(n)),
        get: () => fail(q.get()).then(wrapQuerySnap), onSnapshot: (next, err) => q.onSnapshot(s => next(wrapQuerySnap(s)), e => err && err(code(e))) };
      if (q.doc) { api.doc = id => doc(q.doc(id).path); api.add = d => { const r = q.doc(); return fail(r.set(own(d))).then(() => doc(r.path)); }; }
      return api;
    }
    return { doc, collection: p => coll(fs.collection(p)) };
  }
  // ---- optional Google sign-in and cloud saves: a career is compressed, cut into chunks and kept under the signed-in account ----
  if (cfg && cfg.apiKey && fb) {
    const toB64 = u => { let t = ''; for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(t); };
    const fromB64 = b => { const t = atob(b), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };
    const gz = async t => new Uint8Array(await new Response(new Blob([t]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    const gunz = async u => new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const CH = 700000, me = () => fb.auth().currentUser, slotRef = async (n, fs) => fs.collection('saves').doc(me().uid).collection('slots').doc(String(n));
    window.tlCloud = {
      ready: () => boot().then(b => !!b),
      user: () => { const u = fb.apps.length ? me() : null; return u && !u.isAnonymous ? { uid: u.uid, name: u.displayName || u.email || 'your Google account', email: u.email || '' } : null; },
      signIn: async () => { const b = await boot(); if (!b) throw new Error('offline'); const a = fb.auth(), p = new fb.auth.GoogleAuthProvider(), cur = a.currentUser;
        try { if (cur && cur.isAnonymous) await cur.linkWithPopup(p); else await a.signInWithPopup(p); }
        catch (e) { if (e.code === 'auth/credential-already-in-use' && e.credential) await a.signInWithCredential(e.credential); else throw e; }
        return window.tlCloud.user(); },
      signOut: () => fb.auth().signOut(),
      list: async () => { const b = await boot(), q = await b.fs.collection('saves').doc(me().uid).collection('slots').get(); return q.docs.map(d => Object.assign({ slot: +d.id }, d.data())).filter(x => x.n).sort((a, c) => c.ts - a.ts); },
      put: async (n, json, meta) => { const b = await boot(), base = await slotRef(n, b.fs), s = toB64(await gz(json)), k = Math.ceil(s.length / CH), v = Date.now(), old = await base.get(), oldN = old.exists ? (old.data().n || 0) : 0;
        for (let i = 0; i < k; i++) await base.collection('c').doc(String(i)).set({ d: s.slice(i * CH, (i + 1) * CH), v, _u: me().uid });
        await base.set(Object.assign({}, meta, { n: k, v, ts: v, _u: me().uid }));
        for (let i = k; i < oldN; i++) await base.collection('c').doc(String(i)).delete(); return true; },
      get: async n => { const b = await boot(), base = await slotRef(n, b.fs), m = await base.get(); if (!m.exists) throw new Error('missing'); const d = m.data(); let s = '';
        for (let i = 0; i < d.n; i++) { const c = await base.collection('c').doc(String(i)).get(); if (!c.exists || c.data().v !== d.v) throw new Error('updating'); s += c.data().d; } return gunz(fromB64(s)); },
      del: async n => { const b = await boot(), base = await slotRef(n, b.fs), m = await base.get(), k = m.exists ? (m.data().n || 0) : 0; for (let i = 0; i < k; i++) await base.collection('c').doc(String(i)).delete(); await base.delete(); }
    };
  }
  window.claude = { use: name => {
    if (name === 'downloads') return Promise.resolve(downloads);
    if (name !== 'db' && name !== 'user') return Promise.resolve(null);
    return boot().then(b => { if (!b) return null;
      if (name === 'db') return makeDb(b.fs, b.uid);
      const cur = () => (fb.auth().currentUser || {}).uid || b.uid; return { id: () => Promise.resolve(cur()), me: () => Promise.resolve({ id: cur(), name: '' }), can: () => true, canEdit: () => false, isOwner: () => false }; });
  } };
})();
