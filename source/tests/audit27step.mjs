// Frame-stepped captures (loop slept, game.step by hand) for Dive carry + Zoe swing; logs talon grip vs Puppy each step.
import { chromium, devices } from 'playwright';
const URL_ = process.env.URL || 'http://localhost:4201/', OUT = process.env.OUT || '/tmp/a27s_';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL_); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const wait = ms => p.waitForTimeout(ms); const tap = (x, y) => p.touchscreen.tap(...P(x, y));
const clip = c => { const [x0, y0] = P(c[0], c[1]), [x1, y1] = P(c[2], c[3]); return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }; };
const start = async key => { await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start(k); }, key);
  await p.waitForFunction(k => window.__pr?.scene === k, key, { timeout: 15000 });
  for (let i = 0; i < 6; i++) { await wait(700); if (await p.evaluate(() => window.__tutorialOpen === true)) { await wait(700); await tap(360, 640); } else if (i > 1) break; } };
const sleep = () => p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); });
const step = n => p.evaluate(n => { const g = window.__game; for (let i = 0; i < n; i++) { window.__T += 16.667; g.step(window.__T, 16.667); } }, n);
const wake = () => p.evaluate(() => window.__game.loop.wake());
// Dive
await start('Dive'); await p.waitForFunction(() => !!window.__pr.pup(), null, { timeout: 20000 }); await wait(400);
await sleep(); await p.evaluate(() => window.__game.scene.getScene('Dive').snatch());
const dive = [];
for (let f = 0; f <= 30; f++) { if (f) await step(1);
  const d = await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); const lf = S.rig.point('lf'), rf = S.rig.point('rf'); const pc = S.pup?.c;
    return { grip: [Math.round((lf.x + rf.x) / 2), Math.round((lf.y + rf.y) / 2)], pup: pc ? [Math.round(pc.x), Math.round(pc.y)] : null, ang: +S.bird.angle.toFixed(1), carry: !!S.pup?.carry }; });
  dive.push({ f, ...d }); if ([2, 6, 12, 18, 24].includes(f)) await p.screenshot({ path: `${OUT}dive_carry_f${f}.png`, clip: clip([0, 300, 520, 1000]) }); }
await wake();
// Zoe swing: tap an empty hive spot, then step
await start('Hive'); await wait(600); await sleep();
await p.evaluate(() => { const S = window.__game.scene.getScene('Hive'); S.swing(360, 830); });
for (const f of [0, 2, 4, 6, 8, 11, 16, 24]) { await step(f ? (f - (globalThis.__last ?? 0)) : 0); globalThis.__last = f; await p.screenshot({ path: `${OUT}zoe_swing_f${String(f).padStart(2, '0')}.png`, clip: clip([20, 580, 640, 1280]) }); }
await wake();
// Boxing: woozy bag face + hearts/stars popping from Puppy's head (stepped)
await start('Boxing'); await wait(1500); await sleep();
await p.evaluate(() => { const S = window.__game.scene.getScene('Boxing'); S.setFace('hearts'); S.faceLock = 0.7; S.popHead(); });
for (const f of [6, 14, 24]) { await step(f === 6 ? 6 : f === 14 ? 8 : 10); await p.screenshot({ path: `${OUT}boxing_bagface_f${f}.png`, clip: clip([60, 120, 600, 800]) }); }
await wake();
// Acorn: Nana idle with the acorn in her paw (wider crop)
await start('Acorn'); await wait(1200); await p.screenshot({ path: `${OUT}acorn_idle.png`, clip: clip([0, 0, 720, 640]) });
console.log(JSON.stringify({ dive, errs }));
await b.close();
