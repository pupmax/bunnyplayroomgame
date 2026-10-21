// Close-ups of Bunny HOLDING the tail: first grab frame, mid-tug yank, GOTCHA catch, win card (paw pinned to the tail end).
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:4213/', OUT = process.env.OUT || '/tmp/hold/';
import * as fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL); await p.evaluate(() => { localStorage.setItem('playroom-tail.tut.tail1', '1'); localStorage.setItem('playroom-tail.hint1', '1'); });
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 });
await p.evaluate(() => { const G = window.__game; G.scene.stop('SoloTitle'); G.scene.start('Tail'); });
await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 }); await p.waitForTimeout(1500);
const shot = async (name, full = false) => { const r = await p.evaluate(() => { const S = window.__game.scene.getScene('Tail'), c = window.__game.canvas.getBoundingClientRect(), k = c.width / 720, pw = S.bun.pawPos(), tp = S.pup.tipPos();
    return { x: c.left + pw.x * k, y: c.top + pw.y * k, gap: Math.hypot(pw.x - tp.x, pw.y - tp.y), ph: S.st.phase }; });
  await p.screenshot({ path: `${OUT}${name}.png`, clip: full ? undefined : { x: Math.max(0, r.x - 120), y: Math.max(0, r.y - 110), width: 240, height: 200 } });
  console.log(name, r.ph, 'gap', r.gap.toFixed(2)); };
const glowNear = (tails = 0) => p.evaluate((tails) => { const S = window.__game.scene.getScene('Tail'), st = S.st; st.tails = tails; st.time = 50;
  st.px = 420; st.py = 1030; st.face = -1; S.pup.flip(true); st.pup = 'pause'; S.pt = 0.2; S.pDur = 99; S.turnAt = -1; st.glow = true; st.cool = 0; S.stunned = false;
  st.bx = 600; st.by = 1040; st.tx = 600; st.ty = 1040; S.bvx = S.bvy = 0; }, tails);
const tapTip = () => p.evaluate(() => { const t = window.__pr.tip(); window.__pr.tap(t.x, t.y); });
await glowNear(); await p.waitForTimeout(400); await tapTip(); await p.waitForTimeout(40); await shot('1_grab'); await shot('1_grab_full', true);
await p.waitForTimeout(300);
await p.evaluate(() => window.__pr.tap(360, 800)); await p.waitForTimeout(30); await shot('2_midtug');
// mid-tug with a tug-back shout on screen (scene paused for the slow full-res capture)
await p.evaluate(() => { const S = window.__game.scene.getScene('Tail'); S.tugShout('Grr!'); }); await p.waitForTimeout(200); await p.evaluate(() => window.__game.scene.pause('Tail'));
const sh = await p.evaluate(() => { const S = window.__game.scene.getScene('Tail'), t = S.children.list.find(o => o.type === 'Text' && o.text === 'Grr!'), s = S.tapTxt; if (!t || !s) return null;
  const a = t.getBounds(), b = s.getBounds(); return { shout: [Math.round(a.top), Math.round(a.bottom)], sign: [Math.round(b.top), Math.round(b.bottom)], overlap: !(a.bottom < b.top || a.top > b.bottom || a.right < b.left || a.left > b.right) }; });
console.log('shout vs TAP sign', JSON.stringify(sh)); await shot('2_midtug_shout'); await shot('2_midtug_full', true); await p.evaluate(() => window.__game.scene.resume('Tail'));
for (let i = 0; i < 60 && await p.evaluate(() => window.__pr.st.phase) === 'tug'; i++) { await p.evaluate(() => window.__pr.tap(360, 800)); await p.waitForTimeout(110); }
await p.waitForTimeout(700); await shot('3_catch_full', true); await shot('3_catch');
await p.waitForFunction(() => window.__pr.st.phase === 'play', null, { timeout: 8000 });
await glowNear(5); await p.waitForTimeout(400); await tapTip(); await p.waitForTimeout(100);
for (let i = 0; i < 60 && await p.evaluate(() => window.__pr.st.phase) === 'tug'; i++) { await p.evaluate(() => window.__pr.tap(360, 800)); await p.waitForTimeout(110); }
await p.waitForFunction(() => window.__pr.ended === 'win', null, { timeout: 8000 });
const t0 = Date.now(); const g = await p.evaluate(() => { const S = window.__game.scene.getScene('Tail'); window.__og = { max: 0, n: 0 }; const f = () => { if (!S.outro) return; const pw = S.bun.paw2Pos(), tp = S.pup.tipPos(); window.__og.max = Math.max(window.__og.max, Math.hypot(pw.x - tp.x, pw.y - tp.y)); window.__og.n++; }; S.events.on('postupdate', f); return 1; });
await p.waitForTimeout(300); await p.screenshot({ path: OUT + '5_outro_a.png' }); console.log('outro shot a at', Date.now() - t0, 'ms');
await p.waitForTimeout(150); await p.screenshot({ path: OUT + '5_outro_b.png' }); console.log('outro shot b at', Date.now() - t0, 'ms');
await p.waitForFunction(() => window.__cardArmed && window.__cardArmed(), null, { timeout: 8000 }); console.log('card armed at', Date.now() - t0, 'ms', 'outro paw-tail gap', JSON.stringify(await p.evaluate(() => window.__og)));
await p.waitForTimeout(400); await shot('4_wincard'); await shot('4_wincard_full', true);
console.log('errors', errs.length, errs[0] || ''); await b.close();
