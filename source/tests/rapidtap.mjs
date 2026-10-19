// Rapid-tap stress (Marc: "must never hang if the player taps fast before the intro finishes").
// Mobile touch emulation; taps every ~50 ms cycling over PUNCH / DODGE L / DODGE R / centre / card hint, from scene
// start through intro, tutorial card and match start. Runs: first run (card), Play Again (real end-card button,
// tapped rapidly), Play Again with the card re-armed, Menu -> back in (card re-armed). /ruby/ + every main-game level.
import { chromium, devices } from 'playwright';
const MAIN = process.env.MAIN || 'http://localhost:4199/', RUBY = process.env.RUBY || 'http://localhost:4200/', LINYE = process.env.LINYE || 'http://localhost:4202/';
const LEVELS = (process.env.LEVELS || 'Boxing,Football,Hive,Acorn,Dive,Pounce,Trash,Shadow,Lasso').split(',');
const SPOTS = [[360, 1080], [110, 1080], [610, 1080], [360, 640], [360, 940], [200, 1180], [520, 800]];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const rows = []; let taps = 0;
async function session(url, standalone) {
  const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url);
  await p.waitForFunction(s => window.__game?.scene.isActive(s), standalone ? 'SoloTitle' : 'Title', { timeout: 120000 });
  const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
  const tap = async (x, y) => { await p.touchscreen.tap(...P(x, y)); taps++; };
  const rapid = async (ms, extra) => { const end = Date.now() + ms; let i = 0; while (Date.now() < end) { const s = extra && i % 3 === 0 ? extra : SPOTS[i % SPOTS.length]; await tap(...s); i++; await p.waitForTimeout(50); } };
  const clearTut = () => p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.includes('.tut.')) localStorage.removeItem(k); });
  const mark = () => p.evaluate(() => { if (window.__pr) window.__pr.__old = 1; });
  const check = async (level, run) => {
    // after the burst: loop must advance, card must be gone, match must be running, no errors
    const f1 = await p.evaluate(() => window.__game.loop.frame); await p.waitForTimeout(1200); const f2 = await p.evaluate(() => window.__game.loop.frame);
    const running = await p.waitForFunction(() => { const r = window.__pr; if (!r || r.__old || !r.st) return false; const s = r.st; return !!(s.running || s.ready || s.flying || r.ended); }, null, { timeout: 6000 }).then(() => true, () => false);
    const s = await p.evaluate(() => ({ act: window.__game.scene.getScenes(true).map(x => x.sys.settings.key).join(','), ended: window.__pr?.ended, old: !!window.__pr?.__old, st: JSON.stringify(window.__pr?.st || {}).slice(0, 120), tut: !!window.__tutorialOpen, scene: window.__pr?.scene, paused: window.__game.scene.isActive('Pause'), le: window.__lastErr || '' }));
    const r = { app: standalone || 'main', level, run, loopAlive: f2 > f1, running, tutOpen: s.tut, paused: s.paused, errors: errs.length, err: errs[0] || s.le };
    if (!running) Object.assign(r, { act: s.act, ended: s.ended, old: s.old, st: s.st });
    r.hung = !r.loopAlive || !r.running || r.tutOpen; rows.push(r); console.log(JSON.stringify(r)); errs.length = 0;
  };
  const endAndTap = async (spot) => { // lose the match, then hammer the end-card button until the next scene is up
    await p.evaluate(() => window.__pr.force(false)); await mark();
    const end = Date.now() + 15000;
    while (Date.now() < end && await p.evaluate(() => !!window.__pr?.__old)) { await tap(...spot); await p.waitForTimeout(50); }
  };
  for (const level of standalone ? [standalone === 'linye' ? 'Shadow' : 'Boxing'] : LEVELS) {
    const BY = level === 'Lasso' ? 800 : 1010; // Lasso has its own lose card (RETRY/HALL at y=800)
    // 1) first run, card shown — taps start on the title/PLAY (ruby) or right at scene start (main)
    await clearTut(); await mark();
    if (standalone) { const t = Date.now(); while (Date.now() - t < 1500 && await p.evaluate(() => window.__game.scene.isActive('SoloTitle'))) { await tap(360, 1150); await p.waitForTimeout(50); } }
    else await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.sys.settings.key !== k && s.scene.stop()); g.scene.start(k); }, level);
    await rapid(4000); await check(level, 'first');
    // 2) Play Again via the real end-card button (card already seen)
    await endAndTap([215, BY]); await rapid(3000); await check(level, 'playAgain');
    // 3) Play Again with the card re-armed
    await clearTut(); await endAndTap([215, BY]); await rapid(4000); await check(level, 'playAgain+card');
    // 4) Menu/Hall then back in, card re-armed
    await clearTut(); await endAndTap([505, BY]);
    if (standalone) { await p.waitForFunction(() => window.__game.scene.isActive('SoloTitle'), null, { timeout: 10000 }); await mark(); const t = Date.now(); while (Date.now() - t < 1500 && await p.evaluate(() => window.__game.scene.isActive('SoloTitle'))) { await tap(360, 1150); await p.waitForTimeout(50); } }
    else { await p.waitForFunction(() => window.__game.scene.isActive('Hub'), null, { timeout: 10000 }); await rapid(600); await mark(); await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.sys.settings.key !== k && s.scene.stop()); g.scene.start(k); }, level); }
    await rapid(4000); await check(level, 'menu+card');
  }
  await ctx.close();
}
if (!process.env.SKIP_RUBY) await session(RUBY, 'ruby');
if (!process.env.SKIP_LINYE) await session(LINYE, 'linye');
if (!process.env.SKIP_MAIN) await session(MAIN, false);
const hung = rows.filter(r => r.hung), errd = rows.filter(r => r.errors || r.err);
console.log(`RUNS ${rows.length} TAPS ${taps} HANGS ${hung.length} ERRORS ${errd.length}`);
await b.close();
