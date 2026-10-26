// audit27 step 2 key screenshots (tester build): Boxing bag face, Acorn paw, Dive carry, Lasso rope, Zoe both paws + Hive bubble.
// Usage: URL=http://localhost:4201/ OUT=/workspace/playtest-bpg/audit27/integrated/ node tests/audit27shots.mjs
import { chromium, devices } from 'playwright';
const URL_ = process.env.URL || 'http://localhost:4201/', OUT = process.env.OUT || '/tmp/a27_';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto(URL_); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const cdp = await p.context().newCDPSession(p);
const touch = (type, x, y) => { const [X, Y] = P(x, y); return cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: X, y: Y }] }); };
const tap = (x, y) => p.touchscreen.tap(...P(x, y)); const wait = ms => p.waitForTimeout(ms);
const shot = (name, clip) => { const o = { path: OUT + name + '.png' }; if (clip) { const [x0, y0] = P(clip[0], clip[1]), [x1, y1] = P(clip[2], clip[3]); o.clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }; } return p.screenshot(o); };
const start = async key => { await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start(k); }, key);
  await p.waitForFunction(k => window.__pr?.scene === k, key, { timeout: 15000 });
  for (let i = 0; i < 6; i++) { await wait(700); if (await p.evaluate(() => window.__tutorialOpen === true)) { await wait(700); await tap(360, 640); } else if (i > 1) break; } };
const findText = (key, label) => p.evaluate(([key, label]) => { const S = window.__game.scene.getScene(key); let hit = null;
  const walk = l => l.forEach(o => { if (hit) return; if (o.list) walk(o.list); else if (o.type === 'Text' && o.text === label && o.visible) { const m = o.getWorldTransformMatrix(); hit = [m.tx, m.ty]; } }); walk(S.children.list); return hit; }, [key, label]);

// Boxing: bonk the bag a few times, frames of the bag face (zoomed + full)
await start('Boxing'); await wait(1500);
const pb = await findText('Boxing', 'PUNCH!');
for (let i = 0; i < 4; i++) { if (pb) await tap(...pb); await wait(90); await shot(`boxing_bag_bonk${i}`, [0, 120, 520, 760]); await wait(700); }
await shot('boxing_full');
// Hive: idle (both paws + start bubble), swing frames, win cheer
await start('Hive'); await wait(900); await shot('hive_bubble_start');
await shot('zoe_idle', [40, 880, 460, 1280]);
const hv = [360, 790]; await tap(...hv);
for (const [i, ms] of [[0, 30], [1, 60], [2, 70]]) { await wait(ms); await shot(`zoe_swing${i}`, [40, 600, 640, 1280]); }
await wait(1000);
await p.evaluate(() => window.__pr.force(true)); await wait(250); await shot('zoe_win_cheer', [40, 880, 460, 1280]);
// Acorn: idle paw w/ acorn, then mid-aim (touch held) paw
await start('Acorn'); await wait(1200); await shot('acorn_idle', [380, 60, 720, 520]);
await touch('touchStart', 360, 900); await wait(200); await touch('touchMove', 380, 860); await wait(300); await shot('acorn_aim', [300, 60, 720, 1000]); await touch('touchEnd');
await wait(250); await shot('acorn_release', [300, 60, 720, 1000]);
// Dive: wait for a Puppy, force the snatch, frames of the carry
await start('Dive'); await p.waitForFunction(() => !!window.__pr.pup(), null, { timeout: 20000 }).catch(() => {});
await wait(300);
const ok = await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); if (!S.pup || S.pup.done) return false; S.snatch(); return true; });
for (const ms of [60, 120, 200, 300]) { await wait(ms === 60 ? 60 : 90); await shot(`dive_carry_${ms}`, [0, 0, 560, 900]); }
// also grab numbers: talon grip vs puppy feet
const diveNums = await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); const lf = S.rig.point('lf'), rf = S.rig.point('rf'); return { snatched: !!S.pup?.done, grip: { x: (lf.x + rf.x) / 2, y: (lf.y + rf.y) / 2 }, pup: S.pup ? { x: S.pup.c.x, y: S.pup.c.y } : null, birdAngle: S.bird.angle }; });
// Lasso: hold to twirl, frames, release
await start('Lasso'); await wait(1200);
await touch('touchStart', 470, 1050); for (let i = 0; i < 3; i++) { await wait(220); await shot(`lasso_twirl${i}`, [0, 700, 720, 1280]); }
await touch('touchEnd'); await wait(200); await shot('lasso_throw', [0, 700, 720, 1280]);
console.log(JSON.stringify({ boxingPunchBtn: pb, diveSnatchCalled: ok, diveNums, errors: errs }));
await b.close();
