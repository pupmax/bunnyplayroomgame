// audit27 step 3 captures (frame-stepped): Lasso /test/ opener, Boxing Ruby line (SUPER SWING headbutt), Dive bonk -> 0.8 s immunity blink,
// Pounce 2nd dodge -> pounceFled line. Also checks the Lasso opener pool on test vs main.
import { chromium, devices } from 'playwright';
const URL_ = process.env.URL || 'http://localhost:4201/', MAIN = process.env.MAIN || 'http://localhost:4199/', OUT = process.env.OUT || '/workspace/playtest-bpg/audit27/final/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = []; const res = {};
async function page(url) {
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
  const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
  const wait = ms => p.waitForTimeout(ms); const tap = (x, y) => p.touchscreen.tap(...P(x, y));
  const start = async key => { await p.evaluate(() => { window.__game.scene.getScenes(true).forEach(s => s.scene.stop()); window.__pr = {}; }); await wait(300);
    await p.evaluate(k => window.__game.scene.start(k), key);
    await p.waitForFunction(k => window.__pr?.scene === k, key, { timeout: 15000 });
    for (let i = 0; i < 6; i++) { await wait(700); if (await p.evaluate(() => window.__tutorialOpen === true)) { await wait(700); await tap(360, 640); } else if (i > 1) break; } };
  const texts = () => p.evaluate(() => { const out = []; const w = l => { for (const q of l) { if (q.type === 'Text' && q.visible && q.text.trim()) out.push(q.text); if (q.list) w(q.list); } }; window.__game.scene.getScenes(true).forEach(s => w(s.children.list)); return out; });
  const sleep = () => p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); });
  const step = n => p.evaluate(n => { const g = window.__game; for (let i = 0; i < n; i++) { window.__T += 16.667; g.step(window.__T, 16.667); } }, n);
  const wake = () => p.evaluate(() => window.__game.loop.wake());
  return { p, wait, start, texts, sleep, step, wake };
}
const openerOf = t => t.find(s => /^(Bunny|Puppy):/.test(s));
// Lasso opener: test build
{ const T = await page(URL_); const seen = []; let shot = false;
  for (let k = 0; k < 8; k++) { await T.start('Lasso'); await T.p.waitForFunction(() => window.__pr.st.running, null, { timeout: 15000 }); await T.wait(250);
    const o = openerOf(await T.texts()); seen.push(o);
    if (!shot && /Saddle up/.test(o || '')) { shot = true; await T.p.screenshot({ path: OUT + '1_lasso_test_opener.png' }); } }
  res.lassoTest = seen;
  // Boxing: SUPER SWING -> Ruby's headbutt line by Ruby
  await T.start('Boxing'); await T.p.waitForFunction(() => window.__pr.st.running, null, { timeout: 20000 }); await T.wait(2600);
  await T.sleep(); await T.p.evaluate(() => window.__game.scene.getScene('Boxing').superSwing()); await T.step(26);
  res.boxing = (await T.texts()).filter(s => s.length > 3).slice(-6); await T.p.screenshot({ path: OUT + '2_boxing_ruby_headbutt.png' }); await T.wake();
  // Dive: bonk -> 0.7 s stun -> 0.8 s blink immunity
  await T.start('Dive'); await T.p.waitForFunction(() => window.__pr.st.running, null, { timeout: 20000 }); await T.wait(1500);
  await T.sleep(); const t0 = await T.p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); const t = S.st.time; S.bonk(220, S.st.y); return t; });
  const log = []; for (let f = 1; f <= 100; f++) { await T.step(1); if (f % 6 === 0) log.push(await T.p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); return [+S.st.stun.toFixed(2), +S.st.immune.toFixed(2), +S.bird.alpha.toFixed(2)]; }));
    if (f === 54) await T.p.screenshot({ path: OUT + '3_dive_immunity_blink.png' }); }
  res.dive = { timeLost: +(t0 - await T.p.evaluate(() => window.__game.scene.getScene('Dive').st.time)).toFixed(2), frames6: log }; await T.wake();
  // Pounce: second dodge -> Puppy bolts (pounceFled)
  await T.start('Pounce'); await T.p.waitForFunction(() => window.__pr.st.running, null, { timeout: 20000 }); await T.wait(1800);
  await T.sleep(); await T.p.evaluate(() => { const S = window.__game.scene.getScene('Pounce'); S.st.dodges = 1; S.dodged(); }); await T.step(20);
  res.pounce = (await T.texts()).filter(s => s.length > 3); await T.p.screenshot({ path: OUT + '4_pounce_fled_line.png' }); await T.wake();
}
// Lasso opener: main build keeps the original pool
{ const M = await page(MAIN); const seen = [];
  for (let k = 0; k < 5; k++) { await M.start('Lasso'); await M.p.waitForFunction(() => window.__pr.st.running, null, { timeout: 15000 }); await M.wait(250); seen.push(openerOf(await M.texts())); }
  res.lassoMain = seen; }
console.log(JSON.stringify({ res, errs }, null, 1));
await b.close();
