// All-levels smoke (tester build): for each of the 10 levels, enter from the Hall (real taps on the door / bonus button), dismiss the
// tutorial, play ~6 s of random real touches, force a LOSS -> card -> RETRY (real tap) -> force a WIN -> card -> CONTINUE/HALL (real tap).
// Checks: scene launches, game loop alive, card appears both times, buttons work, zero page/console errors. Usage: URL=... node tests/allsmoke.mjs
import { chromium, devices } from 'playwright';
const URL_ = process.env.URL || 'http://localhost:4201/';
const OUT = process.env.OUT || '/tmp/allsmoke_';
const L = [['Ruby', 'Boxing', [90, 1080]], ['Glassia', 'Football', [270, 1080]], ['Zoe', 'Hive', [450, 1080]], ['Nana', 'Acorn', [630, 1080]], ['Midnight', 'Dive', [630, 750]],
  ['Noir', 'Pounce', [450, 750]], ['Iris', 'Trash', [270, 750]], ['Linye', 'Shadow', [90, 750]], ['Bunny boss', 'Lasso', [360, 300]], ['Tail bonus', 'Tail', [360, 578]]];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage();
let errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto(URL_); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const tap = (x, y) => p.touchscreen.tap(...P(x, y)); const wait = ms => p.waitForTimeout(ms);
const active = k => p.evaluate(k => window.__game.scene.isActive(k), k);
const until = (fn, arg, ms = 15000) => p.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const frame = () => p.evaluate(() => window.__game.loop.frame);
const dismissTut = async () => { for (let i = 0; i < 6; i++) { await wait(700); if (await p.evaluate(() => window.__tutorialOpen === true)) { await wait(700); await tap(360, 640); } else if (i > 1) break; } };
// tap a button by its label (searches the active level scene's display list, incl. containers); waits until it exists
const btn = async (key, labels, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) {
  const at = await p.evaluate(([key, labels]) => { const S = window.__game.scene.getScene(key); let hit = null;
    const walk = l => l.forEach(o => { if (hit) return; if (o.list) walk(o.list); else if (o.type === 'Text' && labels.includes(o.text) && o.visible) { const m = o.getWorldTransformMatrix(); hit = [m.tx, m.ty, o.text]; } });
    if (S?.sys.isActive()) walk(S.children.list); return hit; }, [key, labels]);
  if (at) { await wait(900); await tap(at[0], at[1]); return at[2]; } await wait(250); } return null; };
const rows = [];
await tap(360, 1120); await until(() => window.__game.scene.isActive('Hub')); await wait(2500);
for (const [who, key, door] of L) {
  if (only && !only.includes(key)) continue;
  errs = []; const r = { level: key, who }; const t0 = Date.now();
  try {
    await p.evaluate(() => { const g = window.__game; if (g.scene.isActive('Hub')) return; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start('Hub'); }); // (stop+start of an already-active Hub in one tick leaves nothing running: harness-only quirk)
    await until(() => window.__game.scene.isActive('Hub')); await wait(1200);
    await tap(...door); r.launch = await until(k => window.__game.scene.isActive(k) && window.__pr?.scene === k, key, 8000);
    if (!r.launch) { r.doorRetap = true; await p.screenshot({ path: OUT + key + '_noLaunch.png' }); await wait(1000); await tap(...door); r.launch = await until(k => window.__game.scene.isActive(k) && window.__pr?.scene === k, key, 12000); }
    if (!r.launch) throw new Error('did not launch');
    await dismissTut(); const f0 = await frame();
    for (let i = 0; i < 14; i++) { await tap(80 + Math.random() * 560, 450 + Math.random() * 700); await wait(250 + Math.random() * 250); }
    await wait(1500); r.loop = (await frame()) - f0 > 30; r.alive = await active(key);
    if (r.level === 'Lasso' || r.level === 'Tail') await p.screenshot({ path: OUT + key + '_play.png' }); else await p.screenshot({ path: OUT + key + '_play.png' });
    await p.evaluate(() => window.__pr.force(false)); r.lose = await until(() => window.__pr?.ended === 'lose', null, 20000);
    await wait(1500); await p.screenshot({ path: OUT + key + '_lose.png' });
    r.loseBtn = await btn(key, ['RETRY', 'PLAY AGAIN']); r.retry = await until(k => window.__game.scene.isActive(k) && window.__pr?.scene === k && !window.__pr.ended, key, 15000);
    await dismissTut(); await wait(1500);
    await p.evaluate(() => window.__pr.force(true)); r.win = await until(() => window.__pr?.ended === 'win', null, 25000);
    await wait(key === 'Tail' ? 4000 : 1500); await p.screenshot({ path: OUT + key + '_win.png' });
    r.winBtn = await btn(key, ['CONTINUE', 'HALL', 'NEXT', 'TAP TO CONTINUE']); await wait(1800);
    r.after = await p.evaluate(() => window.__game.scene.getScenes(true).map(s => s.sys.settings.key).join('+')) || 'stuck';
  } catch (e) { r.err = e.message; }
  r.errors = errs.length; r.firstErr = errs[0] || ''; r.s = Math.round((Date.now() - t0) / 1000);
  r.pass = !!(r.launch && r.loop && r.alive && r.lose && r.retry && r.win && r.after && r.after !== 'stuck' && !r.after.includes(key) && !r.errors && !r.err);
  console.log(JSON.stringify(r)); rows.push(r);
}
console.table(rows.map(r => ({ level: r.level, who: r.who, pass: r.pass, after: r.after, errors: r.errors, s: r.s })));
console.log('FAILS', rows.filter(r => !r.pass).length); await b.close(); process.exit(rows.every(r => r.pass) ? 0 : 1);
