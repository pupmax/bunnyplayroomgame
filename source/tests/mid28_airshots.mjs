// Marc fb 28 Oct: Midnight's Dive air-pose shots (carry grab, mid-carry x2, fling), hop pose, gameplay frame + crops, at 390x844 (iPhone 13).
// Usage: URL=http://127.0.0.1:4402/ TAG=before OUT=/workspace/playtest-bpg/midnight28/ node tests/mid28_airshots.mjs
import { chromium, devices } from 'playwright';
const URL_ = process.env.URL || 'http://127.0.0.1:4402/', OUT = process.env.OUT || '/workspace/playtest-bpg/midnight28/', TAG = process.env.TAG || 'before';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL_); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const wait = ms => p.waitForTimeout(ms); const tap = (x, y) => p.touchscreen.tap(...P(x, y));
await p.evaluate(() => { window.__game.scene.getScenes(true).forEach(s => s.scene.stop()); window.__pr = {}; }); await wait(300);
await p.evaluate(() => window.__game.scene.start('Dive')); await p.waitForFunction(() => window.__pr?.scene === 'Dive', null, { timeout: 15000 });
for (let i = 0; i < 6; i++) { await wait(700); if (await p.evaluate(() => window.__tutorialOpen === true)) { await wait(700); await tap(360, 640); } else if (i > 1) break; }
await p.waitForFunction(() => window.__pr.st.running, null, { timeout: 20000 }); await wait(1200);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); });
const clean = () => p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); for (const r of S.roofs) { r.lamp = undefined; r.chim = undefined; } S.st.spotted = 999; S.pigeons.forEach(g => g.img.destroy()); S.pigeons = []; S.pigT = 999;
  S.children.list.filter(o => o.type === 'Text' && o.depth >= 800).forEach(o => o.destroy()); }); // shots only: no beams/chimneys/pigeons/penalty pops cluttering Puppy
const step = n => p.evaluate(n => { const g = window.__game; for (let i = 0; i < n; i++) { window.__T += 16.667; g.step(window.__T, 16.667); } }, n);
// pup world box -> page clip
const clipPup = async (pad = 150) => { const r = await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); const c = S.pup?.c; if (!c) return null; const m = c.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; });
  if (!r) return undefined; const [x0, y0] = P(r.x - pad, r.y - pad * 1.9), [x1, y1] = P(r.x + pad, r.y + pad * 0.5); return { x: Math.max(0, x0), y: Math.max(0, y0), width: x1 - x0, height: y1 - y0 }; };
const shot = async (name, crop = true) => { await p.screenshot({ path: `${OUT}${TAG}_${name}.png` }); const c = crop && await clipPup(); if (c) await p.screenshot({ path: `${OUT}${TAG}_${name}_crop.png`, clip: c }); };
// gameplay frame: Puppy on a roof ahead, Midnight flying
await clean(); await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); if (!S.pup) S.spawnPup(); S.st.hold = false; }); await step(30); await clean(); await shot('1_gameplay', false);
// hop pose (phase 2)
await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); S.st.catches = 1; S.st.time = 30; }); await step(5);
await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); if (!S.pup) S.spawnPup(); const q = S.pup; q.x = 470; q.hopT = 0; }); await step(15); await shot('2_hop');
// snatch -> carry
await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); S.st.catches = 0; S.st.time = 40; if (!S.pup || S.pup.done) S.spawnPup(); const q = S.pup, s = S.st; q.x = 190; q.c.x = 190; q.hop = 0; q.hopS = -1e9; q.hopT = 99; s.y = q.roof.top - 70 - 40 - 20; s.vy = 200; s.stun = 0; s.immune = 0; });
await step(2); await p.evaluate(() => { const S = window.__game.scene.getScene('Dive'); if (!S.pup.done) S.snatch(); });
await clean(); await step(24); await clean(); await shot('3_carry_grab');
await step(40); await clean(); await shot('4_carry_mid');
await step(40); await clean(); await shot('5_carry_late');
// end of carry -> fling tumble
const left = await p.evaluate(() => window.__game.scene.getScene('Dive').st.carry); await step(Math.ceil(left * 60) + 6); await clean(); await shot('6_fling');
console.log(JSON.stringify({ tag: TAG, errs }));
await p.evaluate(() => window.__game.loop.wake()); await b.close();
