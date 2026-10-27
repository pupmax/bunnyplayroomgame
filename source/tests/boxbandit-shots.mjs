// Box Bandit key-moment capture at 390x844 (touch). Frame-stepped at a fixed 60 fps (headless CPU GL only manages ~10 fps live),
// so poses/timings in the shots match a real phone. An in-page helper bot plays; the capture script fires the MEOW itself.
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://localhost:4199/', OUT = process.env.OUT || '/tmp/bbs', MODE = process.env.MODE || 'win'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const st = () => p.evaluate(() => { const s = window.__pr?.st; return s ? { ph: s.phase, pup: s.pup, n: s.nState, nb: s.noirBox, pb: s.pbox, boops: s.boops, t: +s.time.toFixed(1), hint: s.hint, end: window.__pr.ended || '' } : null; });
const shot = async (n) => { await p.evaluate(() => window.__bbRender()); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n, JSON.stringify(await st())); };
const adv = (ms, cond = 'false') => p.evaluate(async ({ ms, cond }) => { const f = new Function('s', 'pr', 'return ' + cond); const n = Math.round(ms / (1000 / 60));
  for (let i = 0; i < n; i++) { window.__bbStep(); const pr = window.__pr; if (pr?.st && f(pr.st, pr)) return true; if (i % 200 === 199) await new Promise(r => setTimeout(r, 0)); } return false; }, { ms, cond });
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 30000 });
await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/00_title.png` });
await p.evaluate(() => { const G = window.__game, DT = 1000 / 60; G.loop.sleep(); let T = performance.now(); window.__bbNow = 0;
  window.__bbStep = () => { T += DT; window.__bbNow += DT; const sc = G.scene.getScene('Pounce'); if (sc) sc.tweens.getDelta = () => DT; G.headlessStep(T, DT); window.__bbBot?.(window.__bbNow); };
  window.__bbRender = () => { const sc = G.scene.getScene('Pounce'); if (sc) sc.tweens.getDelta = () => 0; T += 0.01; G.step(T, 0.01); }; });
await p.evaluate((tut) => { for (const k of ['playroom-test.tut.noir2', 'playroom.tut.noir2']) tut ? localStorage.removeItem(k) : localStorage.setItem(k, '1');
  const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); window.__pr = null; G.scene.start('Pounce'); }, MODE === 'tut');
await p.evaluate(async () => { for (let i = 0; i < 300 && !window.__pr?.ready; i++) { window.__bbStep(); await new Promise(r => setTimeout(r, 10)); } });
if (MODE === 'tut') { await adv(900); await shot('01_tutorial'); await b.close(); process.exit(0); }
await adv(5000, 's.running');
if (MODE === 'lose') { await p.evaluate(() => { window.__pr.st.time = 2.5; }); await adv(6000, '!!pr.ended'); await adv(700); await shot('90_lose'); await adv(1300); await shot('91_lose_card'); console.log('errs', errs); await b.close(); process.exit(0); }
await p.evaluate(() => { const pr = window.__pr, s = pr.st; let pendP = 0, nextTap = 0, grabAt = 0;
  window.__bbBot = (now) => { if (window.__bbHold) return;
    if (s.phase === 'hunt' && s.pup === 'peek' && s.pbox !== s.noirBox) { if (!pendP) pendP = now + (window.__bbPeekWait || 350); else if (now > pendP) { pendP = 0; pr.tap(530, 1180); } } else pendP = 0;
    if (s.phase === 'hunt' && s.pup === 'sniff' && s.tgt === s.noirBox && s.meowCd <= 0 && s.meowRow < 2) pr.tap(190, 1180);
    if (s.phase === 'grab') { if (!grabAt) grabAt = now + (window.__bbGrabWait || 400); else if (now > grabAt) { grabAt = 0; const t = pr.tip(); pr.tap(t.x, t.y); } } else grabAt = 0;
    if (s.phase === 'tug' && now > nextTap) { nextTap = now + 125; pr.tap(360, 640); } }; });
await p.evaluate(() => { window.__bbHold = 1; });
await adv(8000, "s.hint === 'meow'"); await adv(500); await shot('02a_meow_prompt');
await p.evaluate(() => window.__pr.tap(190, 1180)); await adv(250); await shot('02b_meow_lure'); await adv(450); await shot('02c_meow_dash');
await p.evaluate(() => { window.__bbHold = 0; window.__bbPeekWait = 900; window.__bbGrabWait = 1300; });
await adv(15000, "s.phase === 'hunt' && s.pup === 'peek' && s.pbox !== s.noirBox"); await adv(300); await shot('03_wrong_box_peek');
await adv(8000, "s.phase === 'seq'"); await adv(60); await shot('04a_boox'); await adv(200); await shot('04b_boox');
await adv(4000, "s.phase === 'grab'"); await adv(300); await shot('05_grab');
await adv(4000, "s.phase === 'tug'"); await adv(900); await shot('06a_tap_fast'); await adv(700); await shot('06b_tap_fast');
await adv(8000, "s.phase !== 'tug'");
for (let i = 0; i < 18; i++) { await adv(250); await shot('07_seq_' + String(i).padStart(2, '0')); }
await p.evaluate(() => { window.__bbPeekWait = 300; window.__bbGrabWait = 300; });
const ok = await adv(150000, "s.boops >= 6"); console.log('reached6', ok);
for (let i = 0; i < 30; i++) { await adv(300); await shot('80_win_' + String(i).padStart(2, '0')); if (await p.evaluate(() => !!window.__pr.ended)) { await adv(1600); await shot('89_win_card'); break; } }
console.log('errs', errs); await b.close();
