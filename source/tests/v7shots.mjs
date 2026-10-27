import { chromium } from 'playwright';
const only = process.argv[2];
const b = await chromium.launch(); const errs = [];
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errs.push(String(e)));
await page.goto('http://localhost:4199/');
await page.evaluate(() => { for (const k of ['bunny1','rubybag','midnight1','noir2','nana1','linye1','glassia3','zoe1','iris1']) localStorage.setItem('playroom.tut.' + k, '1'); localStorage.setItem('playroom.beaten', '8'); });
await page.reload();
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 60000 });
const bx = await page.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const ev = (f, a) => page.evaluate(f, a); const wait = (ms) => page.waitForTimeout(ms);
const dir = 'screenshots/v7/';
const snap = async (n) => { await ev(() => window.__game.loop.sleep()); await wait(150); await page.screenshot({ path: dir + n + '.png' }); await ev(() => window.__game.loop.wake()); console.log('saved', n); };
const gameWait = async (sec) => { const t0 = await ev(() => window.__game.loop.time); await page.waitForFunction(([t0, s]) => window.__game.loop.time - t0 >= s * 1000, [t0, sec], { timeout: 60000, polling: 100 }); };
const start = (k) => ev((k) => { window.__game.scene.getScenes(true)[0].scene.start(k); }, k);
if (!only) { await wait(1500); await snap('00_title'); await start('Hub'); await page.waitForFunction(() => window.__game.scene.getScene('Hub').children.list.some(o => o.depth === 790 && o.scale >= 0.99), null, { timeout: 60000 }); await snap('01_hub'); }
const L = [
 ['02_ruby_bag', 'Boxing', async () => { await page.waitForFunction(() => window.__pr.st.state === 'guard' && Math.abs(window.__pr.st.x) < 0.25, null, { timeout: 30000, polling: 20 }).catch(() => {}); await page.mouse.click(...P(360, 1185)); await gameWait(0.06); }],
 ['03_glassia_football', 'Football', async () => { const p = await ev(() => window.__pr.pup()); const dx = p.x - 400, dy = p.y - 70 - 1100, k = 260 / Math.hypot(dx, dy);
   await page.mouse.move(...P(400, 1100)); await page.mouse.down(); await gameWait(0.05); for (let i = 1; i <= 4; i++) { await page.mouse.move(...P(400 + dx * k * i / 4, 1100 + dy * k * i / 4)); await gameWait(0.03); } await page.mouse.up();
   await page.waitForFunction(() => window.__pr.st.flying, null, { timeout: 20000, polling: 20 }).catch(() => {}); await gameWait(0.15); }],
 ['04_zoe_hive', 'Hive', async () => { await page.waitForFunction(() => window.__pr.active().some(a => a.kind === 'pup'), null, { timeout: 30000, polling: 30 }); const p = await ev(() => window.__pr.active().find(a => a.kind === 'pup')); await ev(() => { const s = window.__game.scene.getScene('Hive'); s.tweens.timeScale = 0.1; s.time.timeScale = 0.1; }); await page.mouse.click(...P(p.x, p.y)); await page.waitForFunction(() => window.__game.scene.getScene('Hive').zoe.hand.y < -450, null, { timeout: 20000, polling: 'raf' }).catch(() => {}); }],
 ['05_nana_acorn', 'Acorn', async () => { const p = await ev(() => window.__pr.pup()); await page.mouse.move(...P(360, 700)); await page.mouse.down(); await page.mouse.move(...P(p.x, p.y), { steps: 4 }); await gameWait(0.4); }],
 ['06_midnight_dive', 'Dive', async () => { await page.mouse.move(...P(360, 640)); await page.mouse.down(); await gameWait(0.9); }],
 ['07_noir_pounce', 'Pounce', async () => { await page.mouse.move(...P(360, 640)); await page.mouse.down(); await gameWait(0.8); await page.mouse.up(); await page.mouse.click(...P(530, 1180)); await gameWait(0.2); }],
 ['08_iris_trash', 'Trash', async () => { await page.mouse.click(...P(360, 700)); await gameWait(0.3); }],
 ['09_linye_shadow', 'Shadow', async () => { const s = await ev(() => ({ p: window.__pr.pup(), pools: window.__pr.pools })); let bi = 0, bd = 1e9; s.pools.forEach(([x, y], i) => { const d = Math.hypot(x - s.p.x, y - s.p.y); if (d < bd) { bd = d; bi = i; } }); await page.mouse.click(...P(...s.pools[bi])); await gameWait(0.15); }],
 ['10_bunny_lasso', 'Lasso', async () => { const p = await ev(() => window.__pr.pup()); await page.mouse.move(...P(p.x, p.y)); await page.mouse.down(); await gameWait(0.6); const q = await ev(() => window.__pr.pup()); await page.mouse.move(...P(q.x, q.y)); await page.mouse.up(); await gameWait(0.2); }],
];
for (const [name, scene, act] of L) {
  if (only && !only.split(',').some(o => name.includes(o))) continue;
  await start(scene);
  await page.waitForFunction(() => window.__pr?.st?.running || window.__pr?.st?.ready, null, { timeout: 60000, polling: 100 });
  await gameWait(2.5);
  await act(); await snap(name); await page.mouse.up().catch(() => {});
}
console.log('errors', errs.slice(0, 3)); await b.close();
