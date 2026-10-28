// RODEO catch-window touch bot (28 Oct v3): iPhone 390x844, CDP touch only. Reads only what a player SEES (Puppy's spot, the
// '!' tell / gold NOW! ring = st.win, the charge wind-up) and plays with human reaction delays + aim noise.
// usage: node tests/lasso28-touchbot.mjs <url> <novice|realistic|pro> <runs>   env SHOTS=dir
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:8828/', STYLE = process.argv[3] || 'realistic', RUNS = +process.argv[4] || 1, SHOTS = process.env.SHOTS || '';
const PR = { // reaction to the tell (s), aim noise (px), impatient throw chance per decision outside a window, tug taps/s, dodge chance, dodge reaction (s)
  novice: { react: [0.45, 0.8], noise: 150, imp: 0.75, tug: 4.2, dodge: 0.35, dreact: [0.45, 0.8], hold: [0.3, 0.9] },
  realistic: { react: [0.28, 0.5], noise: 80, imp: 0.22, tug: 6.0, dodge: 0.75, dreact: [0.25, 0.5], hold: [0.2, 0.55] },
  pro: { react: [0.17, 0.28], noise: 35, imp: 0.0, tug: 8.0, dodge: 0.97, dreact: [0.16, 0.28], hold: [0.15, 0.3] },
}[STYLE];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +(process.env.DPR || 1), hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await ctx.newCDPSession(p);
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') || window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 });
// time dilation: the shared box renders ~10 fps under load, and CDP can only push ~4 touches a wall second; the game is run at
// K x speed (every system: tweens, timers, scene update get delta*K) and every human timing below is in GAME seconds.
const K = +(process.env.K || 0.4); await p.evaluate(K => { const L = window.__game.loop, cb = L.callback; L.callback = (t, d) => cb(t, d * K); window.__K = K; }, K);
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => ({ x: bx.x + x * bx.width / 720, y: bx.y + y * bx.height / 1280 });
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ ...P(x, y), id: 1 }] });
let SPD = K; // game seconds per wall second (dt is capped at 50 ms/frame, so a slow headless GPU slows the game; human timings are in GAME time)
const wait = ms => p.waitForTimeout(ms); const gwait = ms => p.waitForTimeout(ms / SPD); const R = Math.random, U = ([a, c]) => (a + R() * (c - a)) * 1000;
const tap = async (x, y) => { await touch('touchStart', x, y); await wait(35); await touch('touchEnd', x, y); };
const look = () => p.evaluate(() => { const r = window.__pr; if (!r || r.scene !== 'Lasso' || !r.st) return { scene: window.__game.scene.getScenes(true).map(s => s.sys.settings.key).join(',') }; const s = r.st;
  return { ph: s.phase, pup: s.pup, px: s.px, py: s.py, win: s.win, lock: s.lock, ropes: s.ropes, round: s.round, time: s.time, ended: r.ended, card: !!r.cardShown, throws: s.throws, misses: s.misses, slips: s.slips, offs: s.offs, wins: s.wins, dodges: s.dodges, bonks: s.bonks, plants: s.plants, banner: s.bannerT > 0, fps: Math.round(window.__game.loop.actualFps), spd: Math.min(window.__K, 0.05 * window.__game.loop.actualFps) }; });
const shot = async n => { if (SHOTS) { await p.evaluate(() => window.__game.loop.sleep()); await p.screenshot({ path: `${SHOTS}/${STYLE}_${n}.png` }); await p.evaluate(() => window.__game.loop.wake()); } };
const once = {}; const shot1 = async n => { if (!once[n]) { once[n] = 1; await shot(n); } };
const throwAt = async (c, holdMs) => {
  const tx = c.px + (R() - 0.5) * 2 * PR.noise * 0.6, ty = c.py - 70 + (R() - 0.5) * 2 * PR.noise * 0.45;
  const sx = 300 + R() * 200, sy = 1020 + R() * 100; await touch('touchStart', sx, sy);
  for (let i = 1; i <= 4; i++) { await gwait(holdMs / 4); await touch('touchMove', sx + (tx - sx) * i / 4, sy + (ty - sy) * i / 4); }
  await touch('touchEnd', tx, ty);
};
const results = [];
for (let run = 0; run < RUNS; run++) {
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.includes('.tut.')) localStorage.removeItem(k); window.__pr = null; const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start('Lasso'); });
  await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 30000 }); await wait(700); await tap(360, 640);
  await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 });
  await p.evaluate(() => { const L = window.__game.scene.getScene('Lasso'); window.__lands = []; window.__tugs = []; if (!L.__wrapped) { L.__wrapped = 1; const o = L.land; window.__tugs = []; const ot = L.tap, os = L.slip; L.tap = function () { const g = window.__tugs; if (g.length && !g[g.length - 1].end) g[g.length - 1].taps++; return ot.call(this); }; L.slip = function () { const g = window.__tugs; if (g.length) { const e = g[g.length - 1]; e.end = 'slip@' + this.st.tugT.toFixed(1); e.wall = Math.round(performance.now() - e.t0); } return os.call(this); }; const osn = L.snag, orl = L.reeled; L.snag = function (f) { window.__tugs.push({ taps: 0, t0: performance.now() }); return osn.call(this, f); }; L.reeled = function () { const g = window.__tugs; if (g.length && !g[g.length - 1].end) g[g.length - 1].end = 'CAUGHT@' + this.st.tugT.toFixed(1); return orl.call(this); }; L.land = function (x, y, r) { const s = this.st; window.__lands.push({ win: s.win, pup: s.pup, d: Math.round(Math.hypot(x - s.px, (y - s.py + 70) * 0.85)), r: Math.round(r), tell: +this.tellT.toFixed(2), left: +this.winLeft.toFixed(2), ago: +this.closedAgo.toFixed(2) }); return o.call(this, x, y, r); }; } });
  const t0 = Date.now(); let fin = null, fpsMin = 99, seenTell = 0, lastWin = 'closed', nextImp = Date.now() + 900 / SPD, champion = false, lastPup = '';
  while (Date.now() - t0 < 150000 / SPD) {
    const s = await look(); if (!s.ph) { if (/Champion/.test(s.scene)) { champion = true; await wait(1200); if (run === 0) await shot1('champion'); break; } await wait(100); continue; }
    const prevPh = fin?.ph; fin = s; SPD = Math.max(0.1, s.spd); if (!s.banner) fpsMin = Math.min(fpsMin, s.fps);
    if (s.ended === 'lose' || s.ph === 'over') { await p.waitForFunction(() => window.__pr?.cardShown, null, { timeout: 10000 }).catch(() => {}); await wait(600); if (run === 0) await shot1('loss_card'); break; }
    if (s.ph === 'outro' || s.ph === 'tied' || s.ph === 'intro') { lastWin = 'closed'; seenTell = 0; await wait(120); continue; }
    if (s.ph === 'tug' && prevPh !== 'tug') { await gwait(U(PR.react)); } // notice the snag before mashing
    if (s.ph === 'tug') { for (let k = 0; k < 4; k++) { const t1 = Date.now(); await tap(360 + (R() - 0.5) * 300, 950 + (R() - 0.5) * 250); const left = 1000 / PR.tug / SPD - (Date.now() - t1); if (left > 0) await wait(left); } continue; }
    if (s.ph !== 'free') { await wait(80); continue; }
    if ((s.pup === 'wind') && lastPup !== 'wind') { lastPup = 'wind'; // charge warning: dodge (or freeze)
      if (R() < PR.dodge) { await gwait(U(PR.dreact)); const dir = R() < 0.5 ? -1 : 1; await touch('touchStart', 360, 1050); for (let i = 1; i <= 4; i++) { await wait(22); await touch('touchMove', 360 + dir * 40 * i, 1050); } await touch('touchEnd', 360 + dir * 160, 1050); }
      continue; }
    lastPup = s.pup;
    if (s.pup === 'wind' || s.pup === 'charge' || s.pup === 'crash' || s.pup === 'bonk') { await wait(60); continue; }
    if (s.lock > 0) { await wait(80); continue; }
    if (s.pup === 'plant') { await gwait(U(PR.react)); const c = await look(); if (c.ph === 'free' && c.pup === 'plant') { if (run === 0) await shot1('faceplant'); await throwAt(c, U(PR.hold) * 0.6); await wait(500); } continue; }
    if (s.win !== 'closed' && lastWin === 'closed') seenTell = Date.now();
    lastWin = s.win;
    if (s.win === 'tell' || s.win === 'open') {
      const since = (Date.now() - seenTell) * SPD, react = U(PR.react); if (since < react) { await gwait(react - since); }
      const c = await look(); if (c.ph !== 'free') continue; if (run === 0) await shot1(`window_r${c.round}`);
      await throwAt(c, U(PR.hold)); await gwait(480); lastWin = 'used'; continue; }
    if (s.win === 'closed' && Date.now() > nextImp) { nextImp = Date.now() + (700 + R() * 900) / SPD; // impatient / guessing throw outside a window
      if (R() < PR.imp) { const a = await look(); await wait(110); const c = await look(); if (c.ph !== 'free' || c.win !== 'closed') continue;
        const lead = 0.6, vx = (c.px - a.px) / 0.2, vy = (c.py - a.py) / 0.2; await throwAt({ ...c, px: c.px + vx * lead, py: c.py + vy * lead }, U(PR.hold)); await gwait(480); if (run === 0) await shot1('off_window_nope'); continue; } }
    await wait(60);
  }
  const r = { run, style: STYLE, spd: +SPD.toFixed(2), outcome: champion ? 'WIN' : fin?.card || fin?.ended === 'lose' ? 'LOSE' : 'TIMEOUT', ropes: champion ? 5 : fin?.ropes, round: fin?.round, clockLeft: +(fin?.time ?? 0).toFixed(1), throws: fin?.throws, offs: fin?.offs, slips: fin?.slips, wins: fin?.wins, dodges: fin?.dodges, bonks: fin?.bonks, plants: fin?.plants, fpsMin, secs: +((Date.now() - t0) / 1000).toFixed(0), errs: errs.length };
  results.push(r); console.log(JSON.stringify(r)); if (process.env.DBG) console.log(JSON.stringify(await p.evaluate(() => window.__lands)), JSON.stringify(await p.evaluate(() => window.__tugs)));
  await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start('Title'); }); await wait(400);
}
const w = results.filter(r => r.outcome === 'WIN').length;
console.log(`STYLE ${STYLE} RUNS ${results.length} WINS ${w} (${Math.round(100 * w / results.length)}%) TIMEOUTS ${results.filter(r => r.outcome === 'TIMEOUT').length} ERRS ${errs.slice(0, 3).join(' | ')}`);
await b.close();
