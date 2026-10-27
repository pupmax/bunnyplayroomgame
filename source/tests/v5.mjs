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
  while (Date.now() - t0 < (key === 'midnight' || key === 'bunny' ? 30000 : key === 'noir' ? 45000 : 16000) && !(await ev(() => window.__pr.st.over || (window.__pr.st.time ?? 99) < 6)) && !(key === 'bunny' && shot)) {
    await bot(); const m = await ev(metric);
    if (!shot && m >= 1) { await wait(60); await page.screenshot({ path: `screenshots/v5/${key}_2_hit.png` }); shot = true; }
  }
  if (!shot) await page.screenshot({ path: `screenshots/v5/${key}_2_hit.png` });
  const m = await ev(metric); const st = await ev(() => window.__pr.st); ok(`${name}: bot scored`, m >= 1, JSON.stringify(st).slice(0, 200));
  await page.mouse.up().catch(() => {});
  // stop the bot with time to spare (slow headless frames can run the clock out) and force the win while the level is still live
  if (await ev(() => window.__pr.st.over)) console.log(`note: ${name} level ended before forced win`, JSON.stringify(await ev(() => window.__pr.st)).slice(0, 120));
  await page.waitForFunction(() => window.__pr.st.phase !== 'tied' && window.__pr.st.phase !== 'tug', null, { timeout: 10000 }).catch(() => {}); // Lasso: a forced win mid tie-up has no outro (only the real 5th catch drags him off)
  await ev(() => window.__pr.force(true)); await wait(1800); await page.screenshot({ path: `screenshots/v5/${key}_3_win.png` });
  if (idx < 8) {
    await page.mouse.click(...P(360, 1010)); await wait(idx === 6 ? 3600 : 1000);
    const T = key === 'midnight' ? 30000 : 15000; // slow headless frames late in long runs
    ok(`${name}: interlude`, await page.waitForFunction(() => window.__game.scene.isActive('Interlude'), null, { timeout: T }).then(() => true, () => false)); await page.screenshot({ path: `screenshots/v5/${key}_4_interlude.png` });
    ok(`${name}: unlocks next`, await page.waitForFunction((n) => localStorage.getItem('playroom.beaten') === String(n + 1), idx, { timeout: T }).then(() => true, () => false));
  } else {
    ok('Bunny: champion screen', await page.waitForFunction(() => window.__game.scene.isActive('Champion'), null, { timeout: 20000 }).then(() => true, () => false)); // new finale plays a drag-off outro first await wait(1500); await page.screenshot({ path: 'screenshots/v5/bunny_4_champion.png' });
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
await level(5, 'Noir', 'noir', 'Pounce', async () => { // Box Bandit: MEOW to misdirect, POUNCE on a wrong-box peek, tap the tail, tap-tap-tap
  const s = await ev(() => window.__pr.st);
  if (s.phase === 'tug') { await page.mouse.click(...P(360, 640)); await ev(() => { for (let i = 0; i < 3; i++) window.__pr.tap(360, 640); }); await wait(40); return; } // one real click + 3 in-page taps per pass: headless runs ~4-10 fps, too slow for real tap-fast clicks alone
  if (s.phase === 'grab') { const t = await ev(() => window.__pr.tip()); await page.mouse.click(...P(t.x, t.y)); await wait(150); return; }
  if (s.phase === 'hunt' && s.pup === 'peek' && s.pbox !== s.noirBox) { await page.mouse.click(...P(530, 1180)); await wait(300); return; }
  if (s.phase === 'hunt' && s.pup === 'sniff' && s.tgt === s.noirBox && s.meowCd <= 0 && s.meowRow < 2) { await page.mouse.click(...P(190, 1180)); await wait(200); return; }
  await wait(40);
}, () => window.__pr.st.boops);
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
await level(8, 'Bunny', 'bunny', 'Lasso', async () => { // new finale (Playroom Rodeo): hooks st.phase/pup/px/py like tests/lasso-realtouch.mjs (no __pr.green any more)
  const look = () => ev(() => { const s = window.__pr.st; return { ph: s.phase, pup: s.pup, px: s.px, py: s.py }; });
  const s = await look();
  if (s.ph === 'tug') { for (let i = 0; i < 3; i++) { await page.mouse.click(...P(360 + (Math.random() - 0.5) * 200, 900)); await wait(70); } return; } // tap-fast tug
  if (s.ph !== 'free' || s.pup === 'crash') { await wait(100); return; }
  if (s.pup === 'wind' || s.pup === 'charge') { await page.mouse.move(...P(360, 1000)); await page.mouse.down(); await page.mouse.move(...P(500, 1000), { steps: 4 }); await page.mouse.up(); await wait(200); return; } // swipe dodge
  const a = await look(); await wait(120); const c = await look(); if (c.ph !== 'free') return;
  const vx = (c.px - a.px) / 0.12 / 1.8, vy = (c.py - a.py) / 0.12 / 1.8, hold = 500, lead = (hold + 420) / 1000 * 0.6; // spin ~0.5 s, lead where he is going
  const tx = c.px + vx * lead, ty = c.py - 70 + vy * lead;
  await page.mouse.move(...P(400, 1060)); await page.mouse.down();
  for (let i = 1; i <= 5; i++) { await wait(hold / 5); await page.mouse.move(...P(400 + (tx - 400) * i / 5, 1060 + (ty - 1060) * i / 5)); }
  await page.mouse.up(); await wait(450);
}, () => window.__pr.st.ropes);
ok('no errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
