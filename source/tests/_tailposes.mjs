// Close-up pose sheet of the Tail Catch rigs (tail attachment in every pose) + title, iPhone-size viewport.
import { chromium, devices } from 'playwright';
import * as require_fs from 'fs';
const pos = {};
const URL = process.env.URL || 'http://localhost:4213/', OUT = process.env.OUT || '/tmp/poses/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL); await p.evaluate(() => { localStorage.setItem('playroom-tail.tut.tail1', '1'); });
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 }); await p.waitForTimeout(1500);
await p.screenshot({ path: OUT + 'title.png' });
await p.evaluate(() => { const G = window.__game; G.scene.stop('SoloTitle'); G.scene.start('Tail'); });
await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 }); await p.waitForTimeout(3000);
const setup = (mode) => p.evaluate((mode) => { const S = window.__game.scene.getScene('Tail'), st = S.st;
  st.time = 30; st.px = 470; st.py = 1030; st.face = -1; S.pup.flip(true); st.bx = 650; st.by = 1030; st.tx = st.bx; st.ty = st.by; S.bvx = S.bvy = 0;
  if (mode === 'run') { S.from = { x: 470, y: 1030 }; S.to = { x: 200, y: 1030 }; st.pup = 'dash'; S.pt = 0; S.pDur = 99; S.legs = 0; S.firstLeg = false; st.glow = false; }
  if (mode === 'bunrun') { st.pup = 'pause'; S.pt = 0; S.pDur = 99; S.turnAt = -1; st.glow = false; st.px = 650; st.bx = 90; st.tx = 700; st.ty = 1100; st.by = 1060; }
  if (mode === 'idle') { st.pup = 'pause'; S.pt = 0; S.pDur = 99; S.turnAt = -1; st.glow = false; st.px = 560; st.bx = 200; st.tx = 200; st.ty = 1030; }
  if (mode === 'skid') { st.pup = 'skid'; S.pt = 0; S.pDur = 99; S.skidV = 0; st.glow = false; }
  if (mode === 'glow' || mode === 'glownear') { st.pup = 'pause'; S.pt = 0.2; S.pDur = 99; S.turnAt = -1; st.glow = true; if (mode === 'glownear') { st.bx = 660; st.tx = 660; } else { st.bx = 690; st.tx = 690; st.by = 1150; st.ty = 1150; } }
  if (mode === 'tug') { st.pup = 'pause'; S.pDur = 99; st.glow = true; S.startTug(); st.tug = 0.6; S.TK_pull = 0; }
  if (mode === 'catch') { st.pup = 'pause'; S.pDur = 99; st.glow = true; S.startTug(); S.startCatch(); }
}, mode);
const freeze = () => p.evaluate(() => { const K = window.__pr.K; K.__s = [K.TUG_PULL, K.TUG_SURGE, K.CATCH]; K.TUG_PULL = 0; K.TUG_SURGE = 0; K.CATCH = 99; });
await freeze();
for (const [m, w] of [['bunrun', 380], ['idle', 500], ['run', 160], ['skid', 300], ['glow', 400], ['glownear', 400], ['tug', 500], ['catch', 900]]) { await setup(m); await p.waitForTimeout(w); await p.screenshot({ path: `${OUT}${m}.png` }); pos[m] = await p.evaluate(() => [window.__pr.st.bx, window.__pr.st.by]); }
require_fs.writeFileSync(OUT + 'pos.json', JSON.stringify(pos));
console.log('errors', errs.length, errs[0] || ''); await b.close();
