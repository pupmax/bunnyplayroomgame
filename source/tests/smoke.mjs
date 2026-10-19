// Headless smoke test (390x844 phone): title -> hub -> Ruby boxing fixes (fast/directional dodge, early-punch whiff,
// pause, corner tap, points win) -> interlude -> Glassia Ball Bonk (tap hint, real kicks, lose, win) -> hub.
import { chromium } from 'playwright';
const URL_ = process.env.URL || 'http://localhost:4199/';
const S = new URL('../screenshots/v1/', import.meta.url).pathname;
const errors = []; const fails = []; const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errors.push(String(e))); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.goto(URL_);
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 30000 });
const bx = await page.locator('canvas').boundingBox();
const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const tap = (x, y) => page.mouse.click(...P(x, y));
const swipe = async (pts) => { await page.mouse.move(...P(...pts[0])); await page.mouse.down(); for (const p of pts.slice(1)) await page.mouse.move(...P(...p), { steps: 4 }); await page.mouse.up(); };
const shot = (n) => page.screenshot({ path: S + n + '.png' });
const active = (k) => page.waitForFunction((k) => window.__game.scene.isActive(k), k, { timeout: 15000 });
const wait = (ms) => page.waitForTimeout(ms);
const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__pr.st)));
const until = (fn, arg, t = 40000) => page.waitForFunction(fn, arg, { timeout: t, polling: 16 });
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) fails.push(msg); };
const bodyBg = await page.evaluate(() => document.body.style.background); check(bodyBg.includes('gradient'), 'letterbox bars painted: ' + bodyBg.slice(0, 40));
await wait(1200); await shot('01_title');
await tap(360, 1120); await active('Hub'); await wait(1200); await shot('02_hub');
await tap(270, 1080); await wait(500); await shot('03_hub_glassia_locked');
check(await page.evaluate(() => window.__game.scene.isActive('Hub')), 'Glassia locked on fresh save');
await tap(90, 1080); await active('Boxing'); await wait(1200); await shot('04_ruby_tutorial_demo');
await tap(360, 930); await wait(1200);
// 1. fast dodge: tap the safe dodge right after the '!'
await until(() => window.__pr.st.state === 'guard' && window.__pr.st.dizzy <= 0, null, 20000); await page.evaluate(() => window.__pr.swingBack(Math.random() < 0.5 ? 1 : -1)); await until(() => window.__pr.st.state === 'windup');
let s0 = await st(); const safeX = s0.side > 0 ? 110 : 610, wrongX = s0.side > 0 ? 610 : 110;
await until(() => window.__pr.dodgeCue() || window.__pr.st.state !== 'windup'); const atCue = await page.evaluate(() => [window.__pr.st.state, +window.__pr.stT().toFixed(2), window.__pr.st.dizzy, window.__game.loop.actualFps | 0]); await tap(safeX, 1190); const afterTap = await page.evaluate(() => [window.__pr.st.state, +window.__pr.stT().toFixed(2), window.__pr.st.dodge]); console.log('cue', JSON.stringify(atCue), 'after tap', JSON.stringify(afterTap)); await shot('05_ruby_windup_telegraph');
await until(() => window.__pr.st.state !== 'windup' && window.__pr.st.state !== 'punch');
let s1 = await st(); check(s1.rubyHp === s0.rubyHp && s1.state === 'open', `dodge on the dodge-now cue avoids hit: hp ${s0.rubyHp}->${s1.rubyHp}, state ${s1.state}`);
await tap(360, 1190); await wait(150); await shot('06_ruby_hit_pow');
// 2. wrong-way dodge gets hit
await until(() => window.__pr.st.state === 'guard' && window.__pr.st.dizzy <= 0, null, 20000); await page.evaluate(() => window.__pr.swingBack(Math.random() < 0.5 ? 1 : -1)); await until(() => window.__pr.st.state === 'windup');
s0 = await st(); await tap(s0.side > 0 ? 610 : 110, 1190);
await until(() => window.__pr.st.state !== 'windup' && window.__pr.st.state !== 'punch');
s1 = await st(); check(s1.rubyHp < s0.rubyHp, `wrong-way dodge is hit: hp ${s0.rubyHp}->${s1.rubyHp}`);
// 3. early punch during wind-up whiffs (no counter / stun) + cooldown
await until(() => window.__pr.st.state === 'guard' && window.__pr.st.dizzy <= 0, null, 20000); await page.evaluate(() => window.__pr.swingBack(1)); await until(() => window.__pr.st.state === 'windup' && window.__pr.stT() > 0.4);
s0 = await st(); await tap(360, 1190); await wait(120);
s1 = await st(); check(s1.pupHp === s0.pupHp, `punch while the bag swings back does no damage (bag level): pupHp ${s0.pupHp}->${s1.pupHp}`);
await tap(s0.side > 0 ? 110 : 610, 1190);
// 4. top-left corner doesn't dodge
await until(() => window.__pr.st.state === 'guard' || window.__pr.st.state === 'open', null, 6000);
await page.evaluate(() => { window.__pr.st.dodge = 0; });
await tap(60, 250); await wait(60); check((await st()).dodge === 0, 'top-left tap does not dodge');
// 5. pause button
await tap(560, 64); await wait(400);
check(await page.evaluate(() => window.__game.scene.isPaused('Boxing') && window.__game.scene.isActive('Pause')), 'pause opens');
const tPaused = (await st()).time; await wait(700); check((await st()).time === tPaused, 'timer frozen while paused');
await shot('07_pause');
await tap(360, 670); await wait(300); check(await page.evaluate(() => window.__game.scene.isActive('Boxing')), 'resume works');
// 6. headbutt
await page.evaluate(() => { window.__pr.st.meter = 100; }); await wait(400);
await tap(360, 1060); await wait(330); await shot('08_ruby_headbutt_hit'); await wait(300);
// auto-pause on tab hide
await page.evaluate(() => window.__game.events.emit('hidden')); await wait(200);
check(await page.evaluate(() => window.__game.scene.isActive('Pause')), 'auto-pause on hidden'); await tap(360, 670); await wait(300);
// lose
await page.evaluate(() => window.__pr.force(false)); await wait(6000); await shot('09_ruby_lose');
await tap(215, 1010); await active('Boxing'); await wait(800);
// 7. timeout -> win on points
await page.evaluate(() => { window.__pr.st.pupHp = 60; window.__pr.st.time = 0.05; }); await wait(600); await shot('10_ruby_points_banner');
await wait(1500); await shot('11_ruby_win_card');
check((await page.evaluate(() => window.__pr.ended)) === 'win', 'timeout with more HP = win on points');
await tap(360, 1010); await active('Interlude');
await until(() => window.__pr.beat === 1); await wait(1500); await shot('12_interlude_win_on_points');
await until(() => window.__pr.beat === 2); await wait(900); await shot('13_interlude_bunny_teaser');
await until(() => window.__pr.beat === 3); await wait(1200); await shot('14_interlude_hub_walk');
await active('Hub'); await wait(800); await shot('15_hub_after_ruby');
// Glassia
await tap(270, 1080); await active('Football'); await wait(800); await shot('16_glassia_tutorial');
await tap(360, 860); await wait(1200);
await tap(360, 950); await wait(150); check(await page.evaluate(() => window.__pr.hint === 1), 'plain tap shows Swipe UP hint'); await shot('17_glassia_swipe_hint');
const aim = async () => { const p = await page.evaluate(() => window.__pr.pup()); const dx = p.x - 400, dy = p.y - 70 - 1100, L = Math.hypot(dx, dy), k = 260 / L;
  await swipe([[400, 1100], [400 + dx * k * 0.5, 1100 + dy * k * 0.5], [400 + dx * k, 1100 + dy * k]]); };
let shotDone = false;
for (let i = 0; i < 6; i++) { await until(() => window.__pr.st.ready || window.__pr.ended, null, 8000); if (await page.evaluate(() => window.__pr.ended)) break; await aim();
  const before = (await st()).hits; await wait(450); if ((await st()).hits > before && !shotDone) { await shot('18_glassia_bonk'); shotDone = true; }
  await wait(1700); console.log('kick', i + 1, await page.evaluate(() => window.__pr.last), JSON.stringify(await st())); }
const ended = await page.evaluate(() => window.__pr.ended); console.log('real Ball Bonk result:', ended, (await st()).hits, 'hits');
await wait(1200); await shot('19_glassia_endcard_real');
await page.evaluate(() => { window.__game.scene.getScene('Football').scene.restart(); }); await wait(1000);
await page.evaluate(() => window.__pr.force(false)); await wait(1600); await shot('20_glassia_lose');
await tap(215, 1010); await active('Football'); await wait(800);
await page.evaluate(() => window.__pr.force(true)); await wait(1600); await shot('21_glassia_win');
await tap(360, 1010); await active('Interlude'); await wait(1800); await shot('22_interlude_victory_glassia');
await tap(360, 640); await active('Hub'); await wait(1200); await shot('23_hub_after_glassia');
console.log('storage', await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))));
console.log('ERRORS', errors, 'FAILS', fails); await b.close();
