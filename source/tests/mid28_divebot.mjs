// Marc fb 28 Oct: in-browser Dive bot playthroughs on the real build (same 'avg' policy as divesim.mjs: ~0.16 s reaction, dives ~150 px ahead of Puppy,
// dodges chimneys/pigeons with some misses). Drives st.hold from a scene update hook (same flag the touch handlers set). Usage: URL=... RUNS=3 node tests/mid28_divebot.mjs
import { chromium, devices } from 'playwright';
const URL_ = process.env.URL || 'http://127.0.0.1:4403/', RUNS = +(process.env.RUNS || 3), PAR = +(process.env.PAR || 3);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
async function one(i) {
  const errs = []; const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL_); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 180000 });
  const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
  await p.evaluate(() => { window.__game.scene.getScenes(true).forEach(s => s.scene.stop()); window.__pr = {}; }); await p.waitForTimeout(300);
  await p.evaluate(() => window.__game.scene.start('Dive')); await p.waitForFunction(() => window.__pr?.scene === 'Dive', null, { timeout: 20000 });
  for (let k = 0; k < 8; k++) { await p.waitForTimeout(700); if (await p.evaluate(() => window.__tutorialOpen === true)) { await p.waitForTimeout(700); await p.touchscreen.tap(...P(360, 640)); } else if (k > 1) break; }
  await p.waitForFunction(() => window.__pr.st.running, null, { timeout: 30000 });
  await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'), s = S.st, MX = 190; let dT = 0, plan = false, last = performance.now(), gameT = 0;
    const g = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
    S.events.on('update', () => { const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; if (!s.running || s.over || s.carry > 0) return; gameT += dt;
      dT -= dt; if (dT <= 0) { dT = Math.max(0.05, 0.16 + g() * 0.05); const sp = s.speed;
        const chim = S.roofs.find(r => r.chim !== undefined && r.x + r.chim - MX > -40 && r.x + r.chim - MX < 260 * (sp / 280));
        const pup = S.pup && !S.pup.done ? S.pup : null, pd = pup ? pup.x - MX : 999;
        let hold = s.y > 500 + g() * 30; if (pup && pd < 150 + g() * 45 && pd > -30) hold = false;
        if (chim && s.y > chim.top - 160 && !(pup && pd < 120)) hold = Math.random() > 0.12;
        if (s.phase === 3) { const pg = S.pigeons.find(q => q.x - MX < 220 && q.x - MX > -30 && Math.abs(q.y - s.y) < 120); if (pg && Math.random() > 0.25) hold = s.y > pg.y; }
        if (plan && !hold) s.diveFrom = s.y; plan = hold; }
      s.hold = plan; }); });
  await p.waitForFunction(() => window.__pr.st.over, null, { timeout: 400000, polling: 500 });
  const r = await p.evaluate(() => ({ ended: window.__pr.ended, catches: window.__pr.st.catches, left: +window.__pr.st.time.toFixed(1), score: window.__pr.st.score }));
  await p.context().close(); return { run: i, ...r, errs: errs.length };
}
const out = []; for (let i = 0; i < RUNS; i += PAR) out.push(...await Promise.all(Array.from({ length: Math.min(PAR, RUNS - i) }, (_, k) => one(i + k).catch(e => ({ run: i + k, error: String(e).slice(0, 200) })))));
console.log(JSON.stringify({ url: URL_, out })); await b.close();
