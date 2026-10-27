// Marc fb 27 Oct: Hive slowed-pacing phone shot. Harness from fb27_boxhit (Boxing big-hit energy drop capture (white damage chunk + bar flash). Based on audit27final (frame-stepped): Lasso /test/ opener, Boxing Ruby line (SUPER SWING headbutt), Dive bonk -> 0.8 s immunity blink,
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
{ const T = await page(URL_);
  await T.start('Hive'); await T.p.waitForFunction(() => window.__pr.st.running, null, { timeout: 20000 }); await T.wait(+(process.env.W || 7000));
  await T.p.screenshot({ path: OUT + '8_hive_slower_pacing.png' }); console.log(JSON.stringify({ errs })); }
await b.close();
