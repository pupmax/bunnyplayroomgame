// Sneaky Pounce rework screenshots: tutorial card, suspicion meter, a dodge, a SPOTTED moment.  URL=http://localhost:4201/
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:4201/', OUT = process.env.OUT || 'screenshots/v12/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.includes('.tut.')) localStorage.removeItem(k); });
const start = () => p.evaluate(() => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.key !== 'Pounce' && s.scene.stop()); G.scene.start('Pounce'); });
const gw = ms => p.evaluate(ms => new Promise(r => { const S = window.__game.scene.getScene('Pounce'), t = S.time.now; const f = () => S.time.now - t >= ms ? r() : requestAnimationFrame(f); f(); }), ms);
// freeze the game loop the instant a condition holds (+ms of game time), so slow swiftshader screenshots catch the moment
const freezeWhen = (cond, ms = 0) => p.evaluate(([cond, ms]) => new Promise(r => { const G = window.__game, S = G.scene.getScene('Pounce'), f0 = new Function('st', 'return ' + cond); let t = -1;
  const f = () => { const st = window.__pr.st; if (t < 0 && f0(st)) t = S.time.now; if (t >= 0 && S.time.now - t >= ms) { G.loop.sleep(); return r(); } requestAnimationFrame(f); }; f(); }), [cond, ms]);
const wake = () => p.evaluate(() => window.__game.loop.wake());
const shot = async n => { await p.locator('canvas').screenshot({ path: OUT + n }); console.log('shot', OUT + n); };
await start(); await p.waitForFunction(() => window.__tutorialOpen, null, { timeout: 20000 }); await p.waitForTimeout(900); await shot('pounce_00_tutorial.png');
await p.waitForTimeout(1600); await p.touchscreen.tap(220, 500);
await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 20000 });
// 1) meter: Noir exposed mid-room while Puppy stares, meter ~2/3
await p.evaluate(() => { const s = window.__pr.st; s.x = 335; s.look = 'look'; s.lookT = 9; s.sus = 60; s.hold = false; window.__pr.K.SUS_STILL = 0; });
await gw(400); await shot('pounce_01_meter.png');
console.log('meter state', await p.evaluate(() => JSON.stringify({ sus: Math.round(window.__pr.st.sus), look: window.__pr.st.look })));
// 2) dodge: pounce while he's looking -> DODGED!, Noir tumbles back out of range
await p.evaluate(() => { const s = window.__pr.st; window.__pr.K.SUS_STILL = 55; s.sus = 10; s.x = s.px - 170; s.look = 'look'; s.lookT = 9; window.__game.scene.getScene('Pounce').pounce(); });
await freezeWhen("st.mode === 'dodge'", 160); await shot('pounce_02_dodge.png'); await wake();
console.log('dodge state', await p.evaluate(() => JSON.stringify({ mode: window.__pr.st.mode, x: Math.round(window.__pr.st.x), px: Math.round(window.__pr.st.px), dodges: window.__pr.st.dodges })));
await gw(1500);
// 3) spotted: walk in the open while he watches -> meter fills -> "!" + SPOTTED!
await p.evaluate(() => { const s = window.__pr.st; s.x = 300; s.sus = 40; s.look = 'look'; s.lookT = 9; s.hold = true; });
await freezeWhen('st.spotted', 60); await shot('pounce_03_spotted.png'); await wake(); await p.evaluate(() => { window.__pr.st.hold = false; });
await gw(3000);
await p.waitForFunction(() => window.__pr.st.mode === '', null, { timeout: 15000 }); await gw(300);
// 4) crouch wind-up behind the plant (hidden, 55% alpha): squash + wiggle + dust + "wiggle wiggle!" cue
await p.evaluate(() => { const s = window.__pr.st; s.x = 410; s.sus = 0; s.noise = 0; s.look = 'away'; s.lookT = 9; s.hold = false; }); await gw(250);
console.log('pre-crouch', await p.evaluate(() => { const S = window.__game.scene.getScene('Pounce'), s = S.st; return JSON.stringify({ x: s.x, nx: Math.round(S.noir.x), mode: s.mode, busy: s.busy, running: s.running, over: s.over, active: S.sys.isActive() }); }));
// slow-mo (5%) through the 180 ms wind-up so the screenshot lands mid-crouch
await p.evaluate(() => { const S = window.__game.scene.getScene('Pounce'); S.time.timeScale = 0.05; S.tweens.timeScale = 0.05; S.pounce(); });
await p.waitForTimeout(900); await p.screenshot({ path: OUT + 'pounce_04_crouch_plant.png' }); console.log('shot', OUT + 'pounce_04_crouch_plant.png (page)');
console.log('crouch state', await p.evaluate(() => { const S = window.__game.scene.getScene('Pounce'); const r = { mode: S.st.mode, leaping: S.leaping, nx: Math.round(S.noir.x), sy: +(S.noir.scaleY / 0.95).toFixed(2) }; S.time.timeScale = 1; S.tweens.timeScale = 1; return JSON.stringify(r); }));
await p.waitForFunction(() => window.__pr.st.mode === '', null, { timeout: 15000 }); await gw(400);
// 5) Noir right next to Puppy while he watches: the meter lifts above both heads (off her face)
await p.evaluate(() => { const s = window.__pr.st; window.__pr.K.SUS_STILL = 0; s.x = s.px - 100; s.sus = 45; s.look = 'look'; s.lookT = 9; s.hold = false; });
await gw(700); await shot('pounce_05_meter_close.png');
const ov = await p.evaluate(() => { const S = window.__game.scene.getScene('Pounce'), m = S.sus.getBounds(), n = S.noir.getBounds(); return { meterBottom: Math.round(m.bottom), noirTop: Math.round(n.top), clear: m.bottom <= n.top + 6 }; });
console.log('meter vs Noir head', JSON.stringify(ov));
// 6) sniff with Puppy at the far right edge: the "sniff sniff...?" text must stay on screen
await p.evaluate(() => { const s = window.__pr.st; window.__pr.K.SUS_STILL = 40; s.px = 640; s.x = 640 - 120; s.sus = 0; s.look = 'away'; s.lookT = 9; s.sniffT = 1.55; s.hold = false; });
await freezeWhen("st.look === 'warn'", 90); await shot('pounce_06_sniff_edge.png');
const sn = await p.evaluate(() => { const t = window.__game.scene.getScene('Pounce').children.list.find(o => o.type === 'Text' && /sniff/.test(o.text)); if (!t) return null; const b = t.getBounds(); return { left: Math.round(b.left), right: Math.round(b.right), onScreen: b.left >= 0 && b.right <= 720 }; });
console.log('sniff text bounds', JSON.stringify(sn)); await wake();
await gw(1500);
console.log('ERRORS', errs.length, errs.slice(0, 3).join(' / '));
await b.close();
