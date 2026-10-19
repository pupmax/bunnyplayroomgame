import { chromium } from 'playwright';
const b = await chromium.launch(); const errs = []; const res = [];
const ok = (n, c, extra = '') => { res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${extra}`); };
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4199}/`;
await page.goto(BASE);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('playroom.beaten', '2'); });
await page.reload();
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 30000 });
const bx = await page.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];

// Open a hub door reliably: wait for the Hub to be active and its fade-in done, tap, then retry until the level scene is active.
async function openDoor(x, y, scene) {
  await page.waitForFunction(() => window.__game.scene.isActive('Hub') && window.__pr?.scene === 'Hub', null, { timeout: 10000 });
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(...P(x, y));
    if (await page.waitForFunction((s) => window.__game.scene.isActive(s), scene, { timeout: 4000 }).then(() => true, () => false)) return true;
  }
  return false;
}
const start = (k) => page.evaluate((k) => { window.__game.scene.getScenes(true)[0].scene.start(k); }, k);
// hub: Zoe door open
await start('Hub'); await page.waitForTimeout(1200);
ok('hub zoe open', await page.evaluate(() => window.__pr.beaten === 2)); await page.screenshot({ path: 'screenshots/v4/01_hub_zoe_open.png' });
ok('zoe door starts Hive', await openDoor(450, 1080, 'Hive'));
// tutorial
await page.waitForTimeout(500); await page.screenshot({ path: 'screenshots/v4/02_hive_tutorial.png' });
await page.mouse.click(...P(360, 860)); await page.waitForTimeout(300);
await page.waitForFunction(() => window.__pr.st?.running, null, { timeout: 8000 });
let shot = false; const t0 = Date.now();
while (Date.now() - t0 < 14000) {
  const act = await page.evaluate(() => window.__pr.active());
  const p = act.find(a => a.kind === 'pup');
  if (p) { await page.mouse.click(...P(p.x, p.y)); if (!shot && (await page.evaluate(() => window.__pr.st.combo)) >= 3) { await page.waitForTimeout(60); await page.screenshot({ path: 'screenshots/v4/03_hive_bonk_combo.png' }); shot = true; } }
  await page.waitForTimeout(70);
}
const hs = await page.evaluate(() => window.__pr.st); ok('hive bonks', hs.bonks >= 5, JSON.stringify(hs));
// decoy check
let dec = false, decKind = '', pre = null, hs2 = null; const t1 = Date.now();
while (Date.now() - t1 < 8000 && !dec) { const act = await page.evaluate(() => window.__pr.active()); const d = act.find(a => a.kind !== 'pup'); if (d) { decKind = d.kind; pre = await page.evaluate(() => ({ ...window.__pr.st })); await page.mouse.click(...P(d.x, d.y)); { const n0 = pre.stings + pre.spills; /* read the state the moment the penalty lands: a Puppy escaping a moment later also resets the combo */ const q = await page.waitForFunction((n0) => { const st = window.__pr.st; return st.stings + st.spills > n0 ? { ...st } : false; }, n0, { timeout: 1500, polling: 'raf' }).then(h => h.jsonValue(), () => null); dec = !!q; if (q) hs2 = q; } if (!dec) { await page.waitForTimeout(100); continue; } await page.waitForTimeout(150); await page.screenshot({ path: 'screenshots/v4/04_hive_decoy_penalty.png' }); } await page.waitForTimeout(60); }
if (!hs2) hs2 = await page.evaluate(() => window.__pr.st); // bees: sting resets combo; Bunny's drink (cano): spill costs CANO_PEN points but keeps the combo (QC rule)
ok('decoy penalty', dec && (decKind === 'bees' ? hs2.stings >= 1 && hs2.combo === 0 : hs2.spills >= 1 && hs2.combo >= pre.combo && hs2.score <= pre.score), decKind + ' ' + JSON.stringify({ pre, hs2 }));
await page.evaluate(() => window.__pr.force(true)); await page.waitForTimeout(1700); await page.screenshot({ path: 'screenshots/v4/05_hive_win.png' });
await page.mouse.click(...P(360, 1010)); await page.waitForTimeout(900);
ok('interlude after zoe', await page.evaluate(() => window.__game.scene.isActive('Interlude'))); await page.screenshot({ path: 'screenshots/v4/06_interlude_zoe.png' });
ok('beaten 3', await page.evaluate(() => localStorage.getItem('playroom.beaten') === '3'));
// Nana
await start('Hub');
ok('nana door starts Acorn', await openDoor(630, 1080, 'Acorn')); await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/v4/07_acorn_tutorial.png' });
await page.mouse.click(...P(360, 860)); await page.waitForFunction(() => window.__pr.st?.running, null, { timeout: 8000 });
let ashot = false; const t2 = Date.now();
while (Date.now() - t2 < 30000 && (await page.evaluate(() => window.__pr.st.hits)) < 1 && !(await page.evaluate(() => window.__pr.st.over))) {
  // lead the shot: sample Puppy twice and aim where he'll be when the acorn lands (~0.46 game-s)
  const q0 = await page.evaluate(() => ({ ...window.__pr.pup(), t: window.__pr.st.time })); await page.waitForTimeout(120);
  const q1 = await page.evaluate(() => ({ ...window.__pr.pup(), t: window.__pr.st.time })); const dtg = Math.max(0.02, q0.t - q1.t);
  const p = { x: q1.x + (q1.x - q0.x) / dtg * 0.46, y: q1.y + (q1.y - q0.y) / dtg * 0.46 }; const [x, y] = P(p.x, p.y - 60);
  await page.mouse.move(x, y - 60); await page.mouse.down(); await page.mouse.move(x, y, { steps: 3 });
  if (!ashot) { await page.screenshot({ path: 'screenshots/v4/08_acorn_aim.png' }); ashot = true; }
  await page.mouse.up(); await page.waitForTimeout(470);
  if ((await page.evaluate(() => window.__pr.last)) === 'hit' && !(await page.evaluate(() => window.__pr._s))) { await page.evaluate(() => window.__pr._s = 1); await page.screenshot({ path: 'screenshots/v4/09_acorn_hit.png' }); }
}
const as = await page.evaluate(() => window.__pr.st); ok('acorn hits (>=1, bot aims at current pos)', as.hits >= 1, JSON.stringify(as));
await page.evaluate(() => window.__pr.force(true)); await page.waitForTimeout(1700); await page.screenshot({ path: 'screenshots/v4/10_acorn_win.png' });
await page.mouse.click(...P(360, 1010)); await page.waitForTimeout(900);
ok('beaten 4', await page.evaluate(() => localStorage.getItem('playroom.beaten') === '4'));
await start('Hub'); await page.waitForTimeout(1200); await page.screenshot({ path: 'screenshots/v4/11_hub_after_nana.png' });
ok('no errors', errs.length === 0, errs.join(' | '));
console.log(res.join('\n')); await b.close();
