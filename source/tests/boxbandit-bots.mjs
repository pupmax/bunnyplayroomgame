// Box Bandit (Pounce) difficulty bots: frame-stepped (headless steps, no rendering) so a full 75 s level takes seconds.
// Every bot input goes through the real tap handler (__pr.tap(x, y)), so it plays exactly like a finger would.
// Two actions only: MEOW when he heads for Noir's box, POUNCE when his head is in another box, then tap-tap the tug.
// average = human lag 300-450 ms, misses ~15% of MEOW moments, hesitates sometimes, ~5% impatient early POUNCE; good = 180-260 ms, no mistakes;
// spam = mashes MEOW/POUNCE/the floor every 90-150 ms.
// usage: URL=http://localhost:4241/ N=30 MODES=average,spam,good node tests/boxbandit-bots.mjs
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:4199/', N = +(process.env.N || 20), MODES = (process.env.MODES || 'average,spam').split(',');
const K = process.env.K ? JSON.parse(process.env.K) : null;
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 30000 });
await p.evaluate(() => { localStorage.setItem('playroom-test.tut.noir3', '1'); localStorage.setItem('playroom.tut.noir3', '1'); window.__game.loop.sleep(); window.__bbT = performance.now(); });
const out = {};
for (const mode of MODES) {
  const res = []; for (let g = 0; g < N; g++) { const r = await p.evaluate(game, { mode, K, dbg: !!process.env.DBG }); res.push(r); if (process.env.DBG) console.log(JSON.stringify(r)); }
  const wins = res.filter(r => r.win).length;
  const avg = (k) => (res.reduce((a, r) => a + r[k], 0) / res.length).toFixed(1);
  out[mode] = { games: N, wins, rate: Math.round(100 * wins / N) + '%', boops: avg('boops'), busts: avg('busts'), slips: avg('slips'), timeLeft: avg('time') };
  console.log(mode, JSON.stringify(out[mode]));
}
console.log('errors', errs.length, errs.slice(0, 3)); await b.close();

async function game({ mode, K, dbg }) {
  const trace = [];
  const G = window.__game, DT = 1000 / 60; let T = window.__bbT || 0;
  const step = (n) => { for (let i = 0; i < n; i++) { T += DT; G.headlessStep(T, DT); } window.__bbT = T; };
  const tick = () => new Promise(r => setTimeout(r, 0));
  G.scene.getScenes(true).forEach(s => s.scene.stop()); window.__pr = null; step(3); await tick(); G.scene.start('Pounce'); G.scene.getScene('Pounce').tweens.getDelta = () => DT;
  for (let i = 0; i < 400 && !(window.__pr?.scene === 'Pounce' && window.__pr.ready && window.__pr.st.running); i++) { step(5); await tick(); }
  const pr = window.__pr, s = pr.st; if (K) { Object.assign(pr.K, K); if (K.TIME) s.time = K.TIME; }
  G.scene.getScene('Pounce').tweens.getDelta = () => DT; // TweenManager runs on wall-clock (Date.now): feed it the stepped frame time
  const R = (a, b) => a + Math.random() * (b - a);
  const q = []; let now = 0; const later = (ms, fn) => q.push({ at: now + ms, fn });
  const tap = (x, y) => pr.tap(x, y), MEOW = () => tap(190, 1180), POUNCE = () => tap(530, 1180);
  let dbgPhase = '', seen = {}, nextTap = 0, lastPup = '', lastPhase = '';
  const lag = () => mode === 'good' ? R(180, 260) : R(300, 450);
  for (let f = 0; f < 20000 && !pr.ended; f++) {
    now += DT; step(1); if (f % 300 === 0) await tick();
    for (let i = q.length - 1; i >= 0; i--) if (q[i].at <= now) { const a = q.splice(i, 1)[0]; a.fn(); }
    const key = s.phase + '|' + s.pup + '|' + s.pbox + '|' + s.tgt;
    if (dbg && s.phase !== dbgPhase && trace.length < 80) trace.push(s.time.toFixed(1) + ':' + s.phase + ':' + s.tug.toFixed(2) + ':' + s.pup); dbgPhase = s.phase;
    if (mode === 'spam') {
      if (now >= nextTap) { nextTap = now + R(90, 150); const r = Math.random();
        if (r < 0.35) MEOW(); else if (r < 0.65) POUNCE(); else tap(R(60, 660), R(760, 1060)); }
      continue;
    }
    // ---- average / good: watch, then act after a human reaction lag
    if (s.phase === 'tug') { if (now >= nextTap) { nextTap = now + (mode === 'good' ? R(110, 140) : R(140, 190)); tap(360, 640); } continue; }
    lastPhase = s.phase;
    if (s.phase !== 'hunt' || key === lastPup) continue; lastPup = key; seen = {};
    if (s.pup === 'peek' && s.pbox !== s.noirBox) { // head in the WRONG box: POUNCE (avg bot sometimes hesitates)
      const hes = mode === 'average' && Math.random() < 0.2 ? R(250, 600) : 0; later(lag() + hes, POUNCE); }
    if ((s.pup === 'walk' || s.pup === 'feint' || s.pup === 'sniff') && s.tgt === s.noirBox && s.meowRow < 2) { // he's coming for my box: MEOW
      if (mode === 'good' || Math.random() < 0.85) later(lag(), MEOW); }
    if (mode === 'average' && s.pup === 'walk' && s.tgt !== s.noirBox && Math.random() < 0.05) later(lag(), POUNCE); // impatient mistake
  }
  step(80);
  return { win: pr.ended === 'win', boops: s.boops, busts: s.busts, slips: s.slips, time: +s.time.toFixed(1), ...(dbg ? { trace: trace.join(' ') } : {}) };
}
