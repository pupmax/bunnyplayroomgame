import { chromium } from 'playwright';
const only = process.argv[2];
const b = await chromium.launch(); const errs = []; const res = [];
const ok = (n, c, extra = '') => { res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${extra}`); console.log(res[res.length - 1]); };
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:4199/');
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 30000 });
const bx = await page.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const ev = (f, a) => page.evaluate(f, a); const wait = (ms) => page.waitForTimeout(ms);
const start = (k) => ev((k) => { window.__game.scene.getScenes(true)[0].scene.start(k); }, k);
const DOORS = [[90, 1080], [270, 1080], [450, 1080], [630, 1080], [630, 750], [450, 750], [270, 750], [90, 750], [360, 300]];
async function level(idx, name, key, scene, bot, metric) {
  if (only && only !== key) return;
  await ev((n) => { localStorage.setItem('playroom.beaten', String(n)); }, idx);
  await start('Hub'); await wait(1500);
  if (idx === 4) await page.screenshot({ path: 'screenshots/v5/00_hub_all_doors.png' });
  await wait(400); await page.mouse.click(...P(...DOORS[idx]));
  const opened = await page.waitForFunction((s) => window.__game.scene.isActive(s), scene, { timeout: 10000 }).then(() => true, () => false); ok(`${name}: door opens ${scene}`, opened);
  await wait(500); await page.screenshot({ path: `screenshots/v5/${key}_1_tutorial.png` });
  for (let i = 0; i < 30 && !(await ev(() => !!window.__pr.st?.running)); i++) { if (await ev(() => !!window.__tutorialOpen)) await page.mouse.click(...P(360, 860)); await wait(300); } // card ignores taps for its first 0.6 s
  await page.waitForFunction(() => window.__pr.st?.running, null, { timeout: 8000 });
  let shot = false; const t0 = Date.now();
  while (Date.now() - t0 < (key === 'midnight' || key === 'bunny' ? 30000 : 16000) && !(await ev(() => window.__pr.st.over || (window.__pr.st.time ?? 99) < 6)) && !(key === 'bunny' && shot)) {
    await bot(); const m = await ev(metric);
    if (!shot && m >= 1) { await wait(60); await page.screenshot({ path: `screenshots/v5/${key}_2_hit.png` }); shot = true; }
  }
  if (!shot) await page.screenshot({ path: `screenshots/v5/${key}_2_hit.png` });
  const m = await ev(metric); const st = await ev(() => window.__pr.st); ok(`${name}: bot scored`, m >= 1, JSON.stringify(st).slice(0, 200));
  await page.mouse.up().catch(() => {});
  // stop the bot with time to spare (slow headless frames can run the clock out) and force the win while the level is still live
  if (await ev(() => window.__pr.st.over)) console.log(`note: ${name} level ended before forced win`, JSON.stringify(await ev(() => window.__pr.st)).slice(0, 120));
  await ev(() => window.__pr.force(true)); await wait(1800); await page.screenshot({ path: `screenshots/v5/${key}_3_win.png` });
  if (idx < 8) {
    await page.mouse.click(...P(360, 1010)); await wait(idx === 6 ? 3600 : 1000);
    const T = key === 'midnight' ? 30000 : 15000; // slow headless frames late in long runs
    ok(`${name}: interlude`, await page.waitForFunction(() => window.__game.scene.isActive('Interlude'), null, { timeout: T }).then(() => true, () => false)); await page.screenshot({ path: `screenshots/v5/${key}_4_interlude.png` });
    ok(`${name}: unlocks next`, await page.waitForFunction((n) => localStorage.getItem('playroom.beaten') === String(n + 1), idx, { timeout: T }).then(() => true, () => false));
  } else {
    await wait(1500); ok('Bunny: champion screen', await ev(() => window.__game.scene.isActive('Champion'))); await wait(1500); await page.screenshot({ path: 'screenshots/v5/bunny_4_champion.png' });
    ok('Bunny: beaten 9', await ev(() => localStorage.getItem('playroom.beaten') === '9'));
  }
}
let holding = false;
const hold = async (on) => { if (on && !holding) { await page.mouse.move(...P(360, 640)); await page.mouse.down(); holding = true; } if (!on && holding) { await page.mouse.up(); holding = false; } };
await level(4, 'Midnight', 'midnight', 'Dive', async () => {
  const s = await ev(() => ({ st: window.__pr.st, p: window.__pr.pup() }));
  if (s.p && s.p.x - 190 < 300 && s.p.x - 190 > -40) await hold(false); else await hold(s.st.y > 480);
  await wait(30);
}, () => window.__pr.st.catches);
await hold(false);
await level(5, 'Noir', 'noir', 'Pounce', async () => {
  const s = await ev(() => window.__pr.st);
  if (s.look === 'away' && s.px - s.x < 230 && !s.busy) { await hold(false); await page.mouse.click(...P(530, 1180)); await wait(300); return; }
  await hold(s.look === 'away' && !s.busy && s.noise < 80); await wait(40);
}, () => window.__pr.st.catches);
await hold(false);
await level(6, 'Iris', 'iris', 'Trash', async () => {
  const s = await ev(() => window.__pr.st); const lead = s.mode === 'run' ? 0.56 * 330 : s.mode === 'walk' ? 0.56 * 140 : 0;
  const px = s.px + Math.sign(s.pv) * lead;
  if (!s.umbrella && Math.abs(px - s.ix) < 35 && s.cool <= 0) await page.mouse.click(...P(360, 700)); await wait(25);
}, () => window.__pr.st.bonks);
await level(7, 'Linye', 'linye', 'Shadow', async () => {
  const s = await ev(() => ({ p: window.__pr.pup(), pools: window.__pr.pools, lit: window.__pr.lit(), st: window.__pr.st }));
  let bi = -1, bd = 1e9; s.pools.forEach(([x, y], i) => { const d = Math.hypot(x - s.p.x, y - s.p.y); if (d < bd && !s.lit[i]) { bd = d; bi = i; } });
  if (bi >= 0 && bd < 140 && s.st.cool <= 0) await page.mouse.click(...P(...s.pools[bi])); await wait(60);
}, () => window.__pr.st.tags);
await level(8, 'Bunny', 'bunny', 'Lasso', async () => {
  const s = await ev(() => ({ p: window.__pr.pup(), st: window.__pr.st }));
  if (s.st.flying) { await wait(80); return; }
  await page.mouse.move(...P(s.p.x, s.p.y)); await page.mouse.down();
  const t0 = Date.now(); while (Date.now() - t0 < 2500) { const g = await ev(() => window.__pr.green()); const p = await ev(() => window.__pr.pup()); await page.mouse.move(...P(p.x, p.y)); if (g > 0.85) break; await wait(15); }
  await page.mouse.up(); await wait(600);
}, () => window.__pr.st.ropes);
ok('no errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
