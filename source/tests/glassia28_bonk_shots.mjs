// Penalty Pup REBOUND BONK screenshots at 390x844 (DPR 2): prompt + target ring, head hit (real swipe through onUp), Glassia Oops bubble, too slow
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
const swipeAtHead = () => p.evaluate(() => { const Sc = window.__game.scene.getScene('Football'), h = window.__pr.head(); return { h, b: Sc.BALL0 }; }).then(async ({ h, b }) => {
  const bb = await p.locator('canvas').boundingBox(), s = bb.width / 720, P = (x, y) => [bb.x + x * s, bb.y + y * s];
  const x0 = b.x, y0 = b.y + 20, x1 = x0 + (h.x - b.x) * 0.35, y1 = y0 + (h.y - b.y) * 0.35;
  await p.mouse.move(...P(x0, y0)); await p.mouse.down(); await p.mouse.move(...P(x1, y1), { steps: 5 }); await p.mouse.up(); });
// a goal on shot 2 -> the bonk window -> real swipe at his head
await round(1); await freezeOn(green); await fire(false); await freezeOn("Sc.bk?.ph === 'open'", 0.5); await freezeIn(180, 0.3); await shot('16_bonk_prompt_target_ring');
await p.evaluate(() => { const Sc = window.__game.scene.getScene('Football'); Sc.time.timeScale = Sc.tweens.timeScale = 0.15; }); await swipeAtHead();
console.log('swipe result', await p.evaluate(() => JSON.stringify(window.__pr.bonkLast)));
await freezeIn(250, 0.15); await shot('17_bonk_head_hit');
await freezeIn(560, 0.4); await shot('18_bonk_glassia_oops_bubble');
await freezeIn(900, 0.5); await shot('18b_bonk_puppy_flustered');
// let the window run out: too slow
await round(2); await freezeOn(green); await fire(false); await freezeOn("Sc.bk?.ph === 'open'", 0.5); await freezeIn(1150, 0.6); await shot('19_bonk_too_slow');
console.log(saved.join('\n')); console.log('errors', errs); await b.close();
