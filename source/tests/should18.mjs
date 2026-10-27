// Pups 2 report18 should-fixes: (1) Hall ignores leftover taps for 300 ms, (2) Boxing pause opens once under a
// 2-finger burst, (3) tutorial lockout is real-time only (closes ~600 ms after shown even after a heavy load),
// (4) a newer version.json never reloads mid-level or on a result card, only on the title/Hall/champion screens.
import { chromium, devices } from 'playwright';
const MAIN = process.env.MAIN || 'http://localhost:4199/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const mk = async (route) => {
  const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); let navs = 0; p.on('framenavigated', f => { if (f === p.mainFrame()) navs++; });
  if (route) await p.route('**/version.json*', route);
  await p.goto(MAIN); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 120000 });
  await p.evaluate(() => { window.__creates = {}; for (const s of window.__game.scene.scenes) { const o = s.create; const k = s.sys.settings.key; s.create = function (...a) { window.__creates[k] = (window.__creates[k] || 0) + 1; return o.apply(this, a); }; } });
  const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
  const start = (k) => p.evaluate(k => { const G = window.__game; G.scene.scenes.forEach(s => { if (s.sys.isActive() || s.sys.isPaused()) G.scene.stop(s.sys.settings.key); }); G.scene.start(k); }, k);
  return { ctx, p, errs, P, start, navs: () => navs };
};
{ const T = await mk(); const { p, P } = T;
  await p.evaluate(() => { localStorage.setItem('playroom.beaten', '8'); for (const k of ['rubybag','glassia3','zoe1','nana2','midnight1','noir3','iris1','linye1','bunny1','glassia_pen1','bunny2']) localStorage.setItem('playroom.tut.' + k, '1'); });
  // (1) lose Hive, hammer HALL (505,1010) for 600 ms: Hub once, no level started from leftover taps
  let leaks = 0;
  for (let r = 0; r < 5; r++) {
    await T.start('Hive'); await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 15000 }); await p.evaluate(() => window.__pr.force(false)); await p.waitForTimeout(2600);
    await p.evaluate(() => { window.__creates = {}; });
    const e = Date.now() + 450; while (Date.now() < e) { await p.touchscreen.tap(...P(505, 1010)); await p.waitForTimeout(30); }
    await p.waitForTimeout(800); const c = await p.evaluate(() => window.__creates);
    const lv = Object.keys(c).filter(k => k !== 'Hub'); if (lv.length || c.Hub !== 1) leaks++; console.log('  HALL burst', r, JSON.stringify(c));
  }
  ok(leaks === 0, `(1) HALL hammer (450 ms) x5: no door opened by leftover taps (${leaks} leaks)`);
  // (2) Boxing pause: 2-finger bursts on the pause button
  await T.start('Boxing'); await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 15000 }); await p.evaluate(() => { window.__creates = {}; });
  const cdp = await T.ctx.newCDPSession(p); const [px, py] = P(544, 64);
  for (let i = 0; i < 6; i++) { const pts = [{ x: px, y: py, id: 1 }, { x: px + 6, y: py + 4, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  await p.waitForTimeout(600);
  const pc = await p.evaluate(() => window.__creates.Pause || 0);
  ok(pc === 1, `(2) 2-finger pause burst: Pause created ${pc}x`); ok(T.errs.length === 0, '(1-2) errors ' + T.errs.length + ' ' + (T.errs[0] || ''));
  // (3) lockout real-time after a heavy load: 6x CPU throttle during scene start, burst taps, measure close gap
  await p.evaluate(() => { localStorage.removeItem('playroom.tut.nana2'); localStorage.removeItem('playroom.tut.midnight1'); });
  for (const lv of ['Acorn', 'Dive']) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await T.start(lv);
    await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 30000 });
    const e = Date.now() + 6000; while (Date.now() < e && await p.evaluate(() => window.__tutorialOpen)) { await p.touchscreen.tap(...P(360, 640)); await p.waitForTimeout(40); }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const g = await p.evaluate(() => Math.round(window.__tutorialClosedAt - window.__tutorialShownAt));
    ok(g >= 600 && g < 1300, `(3) ${lv} under 6x throttle: tutorial closed ${g} ms after shown (real-time lockout)`);
  }
  await T.ctx.close(); }
// (4) version check: newer build on the server while mid-level -> no reload until the result card
{ let newer = false; const T = await mk(r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ build: newer ? '2999123123' : '2000010100' }) })); const { p } = T;
  await p.evaluate(() => { localStorage.setItem('playroom.tut.zoe1', '1'); localStorage.setItem('playroom.beaten', '8'); });
  await T.start('Hive'); await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 15000 });
  newer = true; const n0 = T.navs(); await p.evaluate(() => (window).__test_recheck = 1);
  // simulate the boot-time check finding a newer build while in the level (as if the fetch was slow)
  await p.evaluate(() => import('./' + [...document.scripts].find(s => s.src.includes('assets/')).src.split('/').slice(-2).join('/')).catch(() => null));
  await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 }); // new boot: title is safe -> hops
  await p.waitForTimeout(2500); const hopTitle = T.navs() - n0;
  ok(hopTitle === 2 && p.url().includes('v=2999123123'), `(4a) newer build seen on the title: one hop (${hopTitle - 1})`);
  // now mid-level with a pending newer build that arrives late
  await p.evaluate(() => sessionStorage.removeItem('playroom.updhop'));
  await p.route('**/version.json*', async r => { await new Promise(res => setTimeout(res, 3000)); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ build: '2999999999' }) }); });
  await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
  await T.start('Hive'); await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 15000 }); const n1 = T.navs();
  await p.waitForTimeout(5000); const mid = T.navs() - n1; const pending = await p.evaluate(() => window.__updatePending);
  ok(mid === 0 && pending === '2999999999', `(4b) newer build arrives mid-level: no reload during play (navs ${mid}, pending ${pending})`);
  await p.evaluate(() => window.__pr.force(false)); await p.waitForTimeout(3500);
  ok(T.navs() - n1 === 0, `(4c) result card (Retry) is NOT a reload point (report19) (navs ${T.navs() - n1})`);
  await p.evaluate(() => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start('Hub'); }); await p.waitForTimeout(2500);
  ok(T.navs() - n1 === 1 && p.url().includes('v=2999999999'), `(4d) reloads once the Hall shows (navs ${T.navs() - n1})`);
  await T.ctx.close(); }
console.log('FAILS', fails); await b.close();
