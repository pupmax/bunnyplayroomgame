// Tail Catch bot harness (frame-stepped, deterministic dt). Bots see Puppy through a reaction lag.
// usage: node tests/tailbots.mjs [modes] [N]   URL=http://localhost:4213/ (dist-tail)   TUNE='{"PAUSE":1.3}'
// casual: 300-400 ms reaction (+250 ms 20%), 15% mistakes (grabs a dim tail / from the front), tugs ~6 taps/s
// noob:   450-650 ms reaction (+300 ms 30%), 30% mistakes, sloppier positioning, tugs ~4.5 taps/s
// human:  ~250 ms reaction, imperfect aim (tap lands ~+-45 px off the tip, sloppy positioning), 10% mistakes, tugs ~5 taps/s
// spam:   taps Puppy's tail every 150 ms from wherever, never positions behind (should lose)
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:4213/';
const TUNE = JSON.parse(process.env.TUNE || '{}');
const MODES = (process.argv[2] || 'casual,noob,spam').split(','), N = +process.argv[3] || 10;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL); await p.evaluate(() => localStorage.setItem('playroom-tail.tut.tail1', '1'));
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 }); await p.waitForTimeout(500);
const table = [];
for (const mode of MODES) { const res = [];
  for (let g = 0; g < N; g++) {
    const r = await p.evaluate(async ([mode, tune]) => {
      const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.key !== 'Tail' && s.scene.stop()); G.scene.start('Tail');
      const W = ms => new Promise(r => setTimeout(r, ms)); await W(300); const S = G.scene.getScene('Tail');
      while (!window.__pr?.ready) await W(50);
      G.loop.sleep(); const RR = G.renderer; RR.preRender = RR.render = RR.postRender = () => {};
      let ft = performance.now(); const ft0 = ft, d0 = Date.now(); Date.now = () => d0 + (ft - ft0); performance.now = () => ft;
      let gt = 0; const step = n => { for (let i = 0; i < n; i++) { ft += 16.667; gt += 16.667; G.step(ft, 16.667); } };
      Object.assign(window.__pr.K, tune); if (tune.TIME) S.st.time = tune.TIME;
      let k = 0; while (!S.st.running && k < 600) { step(6); k++; if (k % 20 == 0) await W(0); }
      const st = S.st, R = Math.random, K = window.__pr.K, cas = mode === 'casual';
      const log = { grabs: 0, yelps: 0, slips: 0, attempts: 0, catchMs: [] };
      const hist = []; const hum = mode === 'human'; let lag = hum ? 250 : cas ? 350 : 520, lastGlow = false, nextAct = 0, mistake = false, nextTug = 0, skipAt = 0, catchStart = -1, frames = 0, catchAcc = 0;
      const seen = () => { const t = gt - lag; let v = hist[0]; for (const h of hist) { if (h.t <= t) v = h; else break; } return v; };
      while (!st.over && frames < 12000) {
        const tip = window.__pr.tip(); hist.push({ t: gt, glow: st.glow, px: st.px, py: st.py, face: st.face, tx: tip.x, ty: tip.y, pup: st.pup }); if (hist.length > 120) hist.shift();
        const v = seen();
        if (v.glow !== lastGlow) { lastGlow = v.glow; lag = hum ? 200 + R() * 100 + (R() < 0.15 ? 200 : 0) : cas ? 300 + R() * 100 + (R() < 0.2 ? 250 : 0) : 450 + R() * 200 + (R() < 0.3 ? 300 : 0); mistake = R() < (hum ? 0.1 : cas ? 0.15 : 0.3); }
        if (st.phase === 'catch') { if (catchStart < 0) { catchStart = gt; skipAt = gt + (R() < 0.5 ? 2500 : 600 + R() * 600); } if (gt >= skipAt) window.__pr.tap(360, 640); }
        else if (catchStart >= 0) { log.catchMs.push(Math.round(gt - catchStart)); catchStart = -1; }
        if (st.phase === 'tug') { if (gt >= nextTug) { window.__pr.tap(360, 800); nextTug = gt + 1000 / ((hum ? 5 : cas ? 6 : 4.5) * (0.8 + R() * 0.4)); } }
        else if (st.phase === 'play' && gt >= nextAct) {
          nextAct = gt + 90 + R() * 40;
          if (mode === 'spam') { window.__pr.tap(v.tx, v.ty); log.attempts++; nextAct = gt + 150; }
          else {
            const off = cas ? 140 : 140 + (R() - 0.5) * (hum ? 90 : 120), bx = v.px - v.face * off, by = v.py + (cas ? 0 : (R() - 0.5) * 60);
            const front = mistake && R() < 0.3; window.__pr.move(front ? v.px + v.face * 130 : bx, by);
            const reach = Math.hypot(st.bx - tip.x, st.by - 95 - tip.y) <= K.REACH;
            const want = (v.glow || (mistake && v.pup === 'skid')) && reach;
            if (want && st.cool <= 0) { log.attempts++; const ax = hum ? (R() + R() - 1) * 45 : 0, ay = hum ? (R() + R() - 1) * 45 : 0; window.__pr.tap(v.tx + ax, v.ty + ay); mistake = false; nextAct = gt + 250; }
          }
        }
        step(1); frames++; if (frames % 300 == 0) await W(0);
      }
      Object.assign(log, { grabs: st.grabs, yelps: st.yelps, slips: st.slips });
      return { win: window.__pr.ended === 'win', tails: st.tails, left: +st.time.toFixed(1), ...log, catchMs: log.catchMs.slice(0, 3).join('/') };
    }, [mode, TUNE]);
    res.push(r);
  }
  const w = res.filter(r => r.win).length, avg = (f) => (res.reduce((a, r) => a + f(r), 0) / res.length).toFixed(1);
  table.push({ mode, wins: `${w}/${N}`, pct: Math.round(100 * w / N), tails: avg(r => r.tails), yelps: avg(r => r.yelps), slips: avg(r => r.slips), left: avg(r => r.left), catchMs: res[0].catchMs });
  console.log(JSON.stringify(table.at(-1)));
}
console.table(table); console.log('ERRORS', errs.length, errs.slice(0, 3).join(' | ')); await b.close();
