import { chromium, devices } from 'playwright';
const OUT = process.env.OUT || '/workspace/playtest-bpg/audit27/final/hang/', URL_ = process.env.URL || 'http://localhost:4201/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL_); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const tap = (x, y) => p.touchscreen.tap(...P(x, y)); const wait = ms => p.waitForTimeout(ms);
const start = k => p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start(k); }, k);
const tut = async () => { for (let i = 0; i < 40 && !(await p.evaluate(() => !!window.__pr?.st?.running)); i++) { if (await p.evaluate(() => !!window.__tutorialOpen)) await p.mouse.click(...P(360, 860)); await wait(400); } };
await start('Lasso'); await p.waitForFunction(() => window.__pr?.scene === 'Lasso', null, { timeout: 15000 }); await tut(); await wait(1500);
const hangs = [];
for (let i = 0; i < 2; i++) {
  await p.evaluate(() => window.__game.scene.getScene('Lasso').reeled());
  await p.waitForFunction(() => window.__game.scene.getScene('Lasso').st.phase === 'tied', null, { timeout: 5000 }).catch(() => {});
  for (const [j, ms] of [[0, 2500], [1, 2500]]) { await wait(ms); await p.screenshot({ path: OUT + `1_lasso_hang_${i}_${j}.png` }); }
  hangs.push(await p.evaluate(() => ({ hang: window.__pr.hang, st: window.__pr.st.phase, ropes: window.__pr.st.ropes, depthHang: window.__game.scene.getScene('Lasso').hang.root.depth })));
  await p.waitForFunction(() => window.__game.scene.getScene('Lasso').st.phase !== 'tied', null, { timeout: 60000 }).catch(() => {}); await wait(1500);
}
await p.evaluate(() => window.__pr.force(true)); const champ = await p.waitForFunction(() => window.__game.scene.isActive('Champion'), null, { timeout: 30000 }).then(() => true, () => false);
for (const ms of [3000, 3000]) { await wait(ms); await p.screenshot({ path: OUT + `2_champion_${ms}_${Date.now() % 1000}.png` }); }
console.log(JSON.stringify({ hangs, champ, errs })); await b.close();
