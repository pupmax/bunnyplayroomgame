// Back-to-back Shadow catches: the previous 'Gotcha' bubble must not cover the new SQUASHED!/PLOP! stamp.
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:4201/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });
await p.evaluate(() => { localStorage.setItem('playroom-test.tut.linye1', '1'); const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start('Shadow'); });
await p.waitForFunction(() => window.__pr?.st?.running && window.__pr.squash().ready, null, { timeout: 60000 });
const gw = ms => p.evaluate(ms => new Promise(r => { const S = window.__game.scene.getScene('Shadow'), t = S.time.now; const f = () => S.time.now - t >= ms ? r() : requestAnimationFrame(f); f(); }), ms);
let fails = 0; const check = (n, ok, info = '') => { console.log(ok ? 'PASS' : 'FAIL', n, info); if (!ok) fails++; };
await gw(2000); // settle: early swiftshader frames hitch (>500 ms) and Phaser's tween lag-smoothing would stretch the first measured catch
for (const [v1, v2] of [['A', 'C'], ['C', 'A'], ['B', 'A']]) {
  await p.evaluate(v => { const S = window.__game.scene.getScene('Shadow'); window.__pr.forceSquash(v); window.__acc = 0; window.__tt0 = S.st.time; if (window.__accF) S.events.off('update', window.__accF); window.__accF = (t, d) => { if (window.__pr.squash().phase) window.__acc += d; }; S.events.on('update', window.__accF); S.tag(); }, v1);
  await p.waitForFunction(() => !window.__pr.squash().phase, null, { timeout: 20000, polling: 'raf' });
  const dur = await p.evaluate(() => { const S = window.__game.scene.getScene('Shadow'); return { ms: Math.round(window.__acc), timerDrop: +(window.__tt0 - S.st.time).toFixed(2) }; });
  check(`${v1} catch plays ~3 s (no skip), level timer frozen`, dur.ms >= 2850 && dur.ms <= 3300 && dur.timerDrop < 0.1, JSON.stringify(dur));
  await p.waitForFunction(() => window.__game.scene.getScene('Shadow').tagBub?.active, null, { timeout: 5000 });
  await gw(120); // the Gotcha bubble is up; tag again straight away
  await p.evaluate(v => { const S = window.__game.scene.getScene('Shadow'); window.__old = S.tagBub; window.__pr.forceSquash(v); S.tag(); }, v2);
  await p.waitForFunction(() => window.__pr.squash().phase === 'hold', null, { timeout: 5000 }); await gw(60);
  const r = await p.evaluate(() => { const S = window.__game.scene.getScene('Shadow'), o = window.__old, w = S.sq.w1;
    const wb = w.getBounds(), ob = o?.active ? o.getBounds() : null; const overlap = ob ? !(ob.right < wb.left || ob.left > wb.right || ob.bottom < wb.top || ob.top > wb.bottom) : false;
    return { phase: S.sq.phase, stamp: w.visible ? w.text : '', oldAlive: !!o?.active, oldAlpha: o?.active ? +o.alpha.toFixed(2) : 0, overlap }; });
  if (v2 === 'A' && v1 === 'C') await p.locator('canvas').screenshot({ path: 'screenshots/v11/shadow_backtoback.png' });
  check(`${v1}->${v2} old Gotcha bubble gone while stamp shows`, r.phase === 'hold' && !!r.stamp && (!r.oldAlive || r.oldAlpha < 0.05), JSON.stringify(r));
  await p.waitForFunction(() => !window.__pr.squash().phase, null, { timeout: 20000 }); await gw(1500);
}
check('no errors', errs.length === 0, errs.slice(0, 2).join(' / '));
console.log(fails ? 'RESULT FAIL' : 'RESULT PASS'); await b.close();
