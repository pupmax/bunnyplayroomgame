// PENALTY PUP game-clock model (companion to glassia_realtouch.mjs).
// The real-touch bots on this box are limited by the headless renderer (5-20 fps, CDP touch acks once per frame), which adds
// ~250-600 ms of game time to every reaction, far more than a phone does. This model runs the SAME player profiles inside the
// page on the game clock: it watches the same visible-event channel (__pr.st.vis), waits reaction + swipe + touch latency
// and then shoots through the scene's own fire() path (the same path onUp uses after a swipe or tap). It measures the
// difficulty curve (tells, feints, windows, early saves), not touch handling, which glassia_realtouch.mjs covers.
// usage: node tests/glassia_sim.mjs [url] [realistic|sloppy|pro] [games] [parallel] [speed]
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://127.0.0.1:4311/', PROF = process.argv[3] || 'realistic', GAMES = +process.argv[4] || 20, PAR = +process.argv[5] || 4, SPEED = +process.argv[6] || 2;
const LAT = +(process.env.LAT || 100);
const PROFILES = { // same numbers as glassia_realtouch.mjs
  realistic: { rt: [320, 60], swipe: 140, early: 0.06, fool: 0.35, wrong: 0.04, mid: 0.12, tap: 0.3 },
  sloppy: { rt: [420, 90], swipe: 170, early: 0.15, fool: 0.6, wrong: 0.08, mid: 0.05, tap: 0.4 },
  pro: { rt: [260, 40], swipe: 120, early: 0.02, fool: 0.1, wrong: 0.01, mid: 0.2, tap: 0.2 },
};
const P = PROFILES[PROF];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
async function worker(id, n, out) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 120000 });
  await p.evaluate(() => localStorage.setItem('glassia_pen1', '1'));
  for (let g = 0; g < n; g++) {
    await p.evaluate(() => { const G = window.__game; G.scene.getScenes(true).forEach(x => G.scene.stop(x.scene.key)); G.scene.start('Football'); });
    await p.waitForFunction(() => window.__pr?.scene === 'Football' && window.__game.scene.isActive('Football'), null, { timeout: 30000 });
    if (await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 4000 }).then(() => 1, () => 0)) { await p.waitForTimeout(900); const bb = await p.locator('canvas').boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); }
    await p.evaluate(({ P, LAT, SPEED, DBG }) => { window.__simDbg = DBG; if (!window.__noRender) { window.__noRender = 1; window.__game.scene.render = () => {}; } // logic only: no drawing, so frames stay ~16 ms like a phone
      const Sc = window.__game.scene.getScene('Football'), pr = window.__pr; Sc.time.timeScale = Sc.tweens.timeScale = SPEED;
      const gauss = ([m, s]) => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.max(150, m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); };
      const Z = pr.zones(); let shot = -1, pend = null, early = null, prevG = pr.now(); window.__simLog = [];
      // every visible cue, at the game time it happens (a slow frame can show two cues at once, so hook vis() itself)
      const vis0 = Object.getPrototypeOf(Sc).vis.bind(Sc); Sc.vis = (k, side = 0) => { vis0(k, side); const st = pr.st, now = pr.now(), v = { k, side }; if (window.__simDbg) window.__simLog.push(`${st.shot}:${k}${side}@${Math.round(now)}${pend ? (pend.fooled ? 'F' : 'P') + Math.round(pend.at) : ''}`);
        if (st.shot !== shot) { shot = st.shot; pend = null; early = Math.random() < P.early ? { at: 0 } : null; }
          if (v.k === 'tell' && early && !early.at) early.at = now + 250 + Math.random() * 600;
          if (v.k === 'dive' && !pend) { const r = Math.random(), target = r < P.wrong ? v.side : r < P.wrong + P.mid ? 0 : -v.side, zs = Z.filter(z => z.side === target), tap = Math.random() < P.tap;
            pend = { at: now + gauss(P.rt) + (tap ? 60 : P.swipe) + LAT, z: zs[Math.floor(Math.random() * zs.length)], fooled: Math.random() < P.fool }; }
          if (v.k === 'fake' && pend && !pend.fooled) pend = null;
          if (v.k === 'up') pend = null; };
      const tick = () => {
        const st = pr.st, now = pr.now(), half = (now - prevG) / 2; prevG = now; // fire on the frame closest to the target time
        if (!st.ready || st.fired || st.over) return;
        if (early?.at && !pend && now >= early.at - half) { early = null; const zs = Z.filter(z => z.side !== 0); Sc.fire(zs[Math.floor(Math.random() * zs.length)]); window.__simLog.push('early-try'); return; }
        if (pend && now >= pend.at - half) { if (window.__simDbg) window.__simLog.push(`FIRE${pend.z.side}@${Math.round(now)}`); Sc.fire(pend.z); pend = null; }
      };
      Sc.events.on('postupdate', tick); Sc.events.once('shutdown', () => { Sc.events.off('postupdate', tick); delete Sc.vis; });
    }, { P, LAT, SPEED, DBG: !!process.env.DBG });
    await p.waitForFunction(() => !!window.__pr?.ended, null, { timeout: 240000, polling: 500 });
    if (process.env.DBG) console.log(await p.evaluate(() => window.__simLog.join(' ')));
    const r = await p.evaluate(() => ({ ended: window.__pr.ended, goals: window.__pr.st.goals, results: window.__pr.st.results }));
    out.push(r); console.log(`[w${id} g${g}] ${r.ended.toUpperCase()} ${r.goals} goals | ${r.results.join(',')}`);
  }
  if (errs.length) console.log(`[w${id}] errors`, errs.slice(0, 3)); out.errs = (out.errs || 0) + errs.length; await ctx.close();
}
const out = []; const per = Math.ceil(GAMES / PAR); await Promise.all(Array.from({ length: PAR }, (_, i) => worker(i, Math.max(0, Math.min(per, GAMES - i * per)), out))); await b.close();
const wins = out.filter(o => o.ended === 'win').length, cnt = {}, byShot = Array.from({ length: 8 }, () => ({}));
out.forEach(o => o.results.forEach((r, i) => { if (!r) return; cnt[r] = (cnt[r] || 0) + 1; byShot[i][r] = (byShot[i][r] || 0) + 1; }));
console.log('per shot #:', byShot.map((c, i) => `${i + 1}:${JSON.stringify(c)}`).join(' '));
console.log(`SIM ${PROF} lat ${LAT}ms speed ${SPEED}x: ${wins}/${out.length} wins = ${(100 * wins / out.length).toFixed(0)}% | ${JSON.stringify(cnt)} | errors ${out.errs || 0}`);
process.exit(out.errs ? 1 : 0);
