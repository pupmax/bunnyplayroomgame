// Penalty Pup v2 screenshots at 390x844 (DPR 2), frozen on exact game-clock moments: tell, kick, save, goal, dive arm close-ups, WRONG WAY gag
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:4311/', OUT = process.argv[3] || '/workspace/playtest-bpg/glassia28';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 120000 });
await p.evaluate(() => ['playroom-test.tut.glassia_pen2', 'playroom.tut.glassia_pen2'].forEach(k => localStorage.setItem(k, '1')));
const saved = [];
const shot = async name => { await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${name}.png` }); saved.push(`${OUT}/${name}.png`); };
const close = async name => { await p.waitForTimeout(250); const bb = await p.locator('canvas').boundingBox(), k = await p.evaluate(() => { const k = window.__game.scene.getScene('Football').kp, c = k.world(0, -0.45 * k.h); return { x: c.x, y: c.y, h: k.h }; });
  const s = bb.width / 720, cx = bb.x + k.x * s, cy = bb.y + k.y * s, w = 220, h = 220;
  await p.screenshot({ path: `${OUT}/${name}.png`, clip: { x: Math.max(0, Math.min(390 - w, cx - w / 2)), y: Math.max(0, cy - h / 2), width: w, height: h } }); saved.push(`${OUT}/${name}.png`); };
async function round(n, goals = 0) {
  await p.evaluate(() => { const G = window.__game; window.__pr = null; G.scene.getScenes(true).forEach(x => G.scene.stop(x.scene.key)); G.scene.start('Football'); });
  await p.waitForFunction(([n, goals]) => { const pr = window.__pr; if (pr?.scene !== 'Football') return false; if (pr.st.shot !== n) { pr.st.shot = n; pr.st.goals = goals; for (let i = 0; i < n; i++) pr.st.results[i] = i < goals ? 'goal' : 'save'; } return true; }, [n, goals], { timeout: 30000, polling: 'raf' });
}
// freeze the game clock exactly `ms` after the current moment (checked every frame), resolve when frozen
const freezeIn = (ms, ts = 0.15) => p.evaluate(([ms, ts]) => new Promise(res => { const Sc = window.__game.scene.getScene('Football'); Sc.time.timeScale = Sc.tweens.timeScale = ts; const t0 = Sc.gnow;
  const f = () => { if (Sc.gnow - t0 >= ms) { Sc.time.timeScale = Sc.tweens.timeScale = 0; Sc.events.off('postupdate', f); res(Math.round(Sc.gnow - t0)); } }; Sc.events.on('postupdate', f); }), [ms, ts]);
const freezeOn = (cond, ts = 0.3) => p.evaluate(([cond, ts]) => new Promise(res => { const Sc = window.__game.scene.getScene('Football'), st = window.__pr.st; Sc.time.timeScale = Sc.tweens.timeScale = ts; const fn = new Function('st', 'Sc', 'return ' + cond);
  const f = () => { if (fn(st, Sc)) { Sc.time.timeScale = Sc.tweens.timeScale = 0; Sc.events.off('postupdate', f); res(1); } }; Sc.events.on('postupdate', f); }), [cond, ts]);
const fire = (same, high = true) => p.evaluate(([same, high]) => { const Sc = window.__game.scene.getScene('Football'), st = window.__pr.st, side = same ? st.trueSide : -st.trueSide;
  Sc.fire(window.__pr.zones().find(z => z.side === side && z.high === high)); }, [same, high]);
const green = "st.ring === 'go' && st.lean !== 0";
// 1) the tell (green ring, honest lean), 2) the kick, 4) the goal
await round(1); await freezeOn("st.ring === 'wait'"); await close('09_arms_ready');
await freezeOn("st.ring === 'read'"); await freezeIn(120); await shot('08_read_yellow');
await freezeOn(green); await freezeIn(150); await shot('01_tell_green_lean'); await close('10_arms_tell_lean');
await fire(false); await freezeIn(150); await shot('02_kick');
await freezeIn(330); await shot('04a_goal_he_dives_wrong_way'); await close('11_arms_dive_wrong_way');
await freezeIn(300); await shot('04_goal');
// 3) a save, low corner (the mitt meets the ball) + lying + getting up
await round(2); await freezeOn(green); await fire(true, false); await freezeIn(540, 0.12); await shot('03_save_low_mitt_meets_ball'); await close('05_dive_arms_closeup_low');
await freezeIn(700, 0.5); await close('12_arms_lying'); await shot('03b_save_lying');
await freezeOn("st.phase === 'ready' && st.ring === 'wait'", 0.4); await freezeIn(1); await close('13_arms_getting_up_or_home');
// high-corner save close-up
await round(1); await freezeOn(green); await fire(true, true); await freezeIn(540, 0.12); await shot('03c_save_high'); await close('05c_dive_arms_closeup_high');
// 6) WRONG WAY gag on shot 7 (MEGA gloves, tail tell): shoot AWAY from the tail -> goal
await round(6, 3); await freezeOn(green); await freezeIn(200); await shot('06a_bluff_tail_tell'); await close('14_arms_mega_tell_tail');
await fire(false); await freezeIn(560 + 280, 0.25); await shot('06b_wrong_way_stamp');
await freezeIn(560, 0.25); await shot('06_wrong_way_doubletake'); await close('15_arms_wrong_way_doubletake');
// middle tummy catch + loss hug (arms at the chest)
await round(6, 3); await freezeOn(green); await fire(true, true); await freezeIn(1, 1); await p.evaluate(() => {}); 
console.log(saved.join('\n')); console.log('errors', errs); await b.close();
