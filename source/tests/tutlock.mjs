// Timed lockout + transition hammering. For /ruby/ PLAY and every main-game Hall door: hammer the button (5 taps,
// 40 ms apart) then keep tapping every 40 ms. Checks: the tutorial card closes >= 600 ms after it was first drawn,
// the level scene is created exactly once, PLAY AGAIN / CONTINUE (Trash -> Interlude) / Title PLAY create once.
import { chromium, devices } from 'playwright';
const MAIN = process.env.MAIN || 'http://localhost:4199/', RUBY = process.env.RUBY || 'http://localhost:4200/';
const DOORS = [[90, 1080], [270, 1080], [450, 1080], [630, 1080], [630, 750], [450, 750], [270, 750], [90, 750], [360, 300]];
const LEVELS = ['Boxing', 'Football', 'Hive', 'Acorn', 'Dive', 'Pounce', 'Trash', 'Shadow', 'Lasso'];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const rows = []; let fails = 0;
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
async function page(url, title) {
  const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForFunction(t => window.__game?.scene.isActive(t), title, { timeout: 120000 });
  await p.evaluate(() => { window.__creates = {}; for (const s of window.__game.scene.scenes) { const o = s.create; const k = s.sys.settings.key; s.create = function (...a) { window.__creates[k] = (window.__creates[k] || 0) + 1; return o.apply(this, a); }; } });
  const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
  const tap = (x, y) => p.touchscreen.tap(...P(x, y));
  const hammer = async (x, y, n = 5) => { for (let i = 0; i < n; i++) { await tap(x, y); await p.waitForTimeout(40); } };
  const burstUntilClosed = async () => { await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 30000 }).catch(() => {}); const sp = [[360, 1080], [110, 1080], [610, 1080], [360, 640], [360, 960]]; const e = Date.now() + 8000; let i = 0; while (Date.now() < e && await p.evaluate(() => window.__tutorialOpen)) { await tap(...sp[i++ % sp.length]); await p.waitForTimeout(40); } await burst(800); };
  const burst = async (ms) => { const sp = [[360, 1080], [110, 1080], [610, 1080], [360, 640], [360, 960]]; const e = Date.now() + ms; let i = 0; while (Date.now() < e) { await tap(...sp[i++ % sp.length]); await p.waitForTimeout(40); } };
  const resetCreates = () => p.evaluate(() => { window.__creates = {}; });
  const creates = () => p.evaluate(() => window.__creates);
  const lock = () => p.evaluate(() => ({ shown: window.__tutorialShownAt, closed: window.__tutorialClosedAt, open: window.__tutorialOpen }));
  const clearTut = () => p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.includes('.tut.')) localStorage.removeItem(k); });
  return { p, ctx, errs, tap, hammer, burst, burstUntilClosed, resetCreates, creates, lock, clearTut };
}
const gapCheck = async (T, label) => { const l = await T.lock(); const gap = l.closed && l.shown ? Math.round(l.closed - l.shown) : -1; rows.push({ label, gap }); ok(gap >= 600 && !l.open, `${label}: tutorial closed ${gap} ms after shown`); };
// ---- /ruby/
{ const T = await page(RUBY, 'SoloTitle');
  for (const run of [1, 2, 3]) {
    await T.clearTut(); await T.resetCreates(); await T.hammer(360, 1150); await T.burstUntilClosed();
    await gapCheck(T, `ruby PLAY run${run}`); ok((await T.creates()).Boxing === 1, `ruby PLAY run${run}: Boxing created ${(await T.creates()).Boxing}x`);
    // PLAY AGAIN hammer
    await T.p.evaluate(() => window.__pr.force(true)); await T.p.waitForTimeout(2500); await T.resetCreates(); await T.clearTut();
    const e = Date.now() + 6000; while (Date.now() < e && !(await T.creates()).Boxing) { await T.tap(215, 1010); await T.p.waitForTimeout(40); } await T.hammer(215, 1010, 6); await T.burstUntilClosed();
    await gapCheck(T, `ruby PLAY AGAIN run${run}`); ok((await T.creates()).Boxing === 1, `ruby PLAY AGAIN run${run}: Boxing created ${(await T.creates()).Boxing}x`);
    // MENU hammer back to title
    await T.p.evaluate(() => window.__pr.force(false)); await T.p.waitForTimeout(2500); await T.resetCreates();
    const e2 = Date.now() + 6000; while (Date.now() < e2 && !(await T.creates()).SoloTitle) { await T.tap(505, 1010); await T.p.waitForTimeout(40); } await T.hammer(505, 1010, 4); await T.p.waitForTimeout(600);
    ok((await T.creates()).SoloTitle === 1, `ruby MENU run${run}: SoloTitle created ${(await T.creates()).SoloTitle}x`);
  }
  ok(T.errs.length === 0, 'ruby errors ' + T.errs.length + ' ' + (T.errs[0] || '')); await T.ctx.close(); }
// ---- main game
{ const T = await page(MAIN, 'Title');
  await T.resetCreates(); await T.hammer(360, 1120, 6); await T.p.waitForFunction(() => window.__game.scene.isActive('Hub'), null, { timeout: 15000 }); await T.p.waitForTimeout(500);
  ok((await T.creates()).Hub === 1, `Title PLAY: Hub created ${(await T.creates()).Hub}x`);
  await T.p.evaluate(() => localStorage.setItem('playroom.beaten', '8'));
  for (let i = 0; i < 9; i++) {
    const lv = LEVELS[i];
    await T.clearTut(); await T.p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.sys.settings.key !== 'Hub' && s.scene.stop()); g.scene.start('Hub'); });
    await T.p.waitForTimeout(900); await T.resetCreates();
    await T.hammer(...DOORS[i]); await T.burstUntilClosed();
    const c = await T.creates(); const lk = Object.keys(c).filter(k => k !== 'Hub');
    ok(lk.length === 1 && lk[0] === lv && c[lv] === 1, `door ${i} (${lv}): creates ${JSON.stringify(c)}`);
    await gapCheck(T, `door ${lv}`);
    if (lv === 'Trash') { // win, hammer CONTINUE -> Interlude must start once
      await T.p.evaluate(() => window.__pr.force(true)); await T.p.waitForTimeout(2500); await T.resetCreates();
      const e = Date.now() + 6000; while (Date.now() < e && !(await T.creates()).Interlude) { await T.tap(360, 1010); await T.p.waitForTimeout(40); } await T.hammer(360, 1010, 6); await T.p.waitForTimeout(500);
      ok((await T.creates()).Interlude === 1, `Trash CONTINUE: Interlude created ${(await T.creates()).Interlude}x`);
    }
    if (lv === 'Hive') { // lose, hammer RETRY -> once
      await T.p.evaluate(() => window.__pr.force(false)); await T.p.waitForTimeout(2500); await T.resetCreates(); await T.clearTut();
      const e = Date.now() + 6000; while (Date.now() < e && !(await T.creates()).Hive) { await T.tap(215, 1010); await T.p.waitForTimeout(40); } await T.hammer(215, 1010, 6); await T.burstUntilClosed();
      ok((await T.creates()).Hive === 1, `Hive RETRY: created ${(await T.creates()).Hive}x`); await gapCheck(T, 'Hive RETRY');
    }
  }
  ok(T.errs.length === 0, 'main errors ' + T.errs.length + ' ' + (T.errs[0] || '')); await T.ctx.close(); }
const gaps = rows.map(r => r.gap); console.log(`LOCKOUT closes ${gaps.length}, min gap ${Math.min(...gaps)} ms, max ${Math.max(...gaps)} ms; FAILS ${fails}`);
await b.close();
