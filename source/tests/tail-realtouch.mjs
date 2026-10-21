// REAL-touch e2e (iPhone 390x844, hasTouch/isMobile): plays like a person with CDP touch events only (no scene method calls):
// chases by tapping/dragging toward Puppy, taps the glowing tail, taps through the tug. Logs HUD text after every grab / catch / yelp.
// usage: node tests/tail-realtouch.mjs [url] [style: naive|careful] [seconds]
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:4213/', STYLE = process.argv[3] || 'naive', SECS = +process.argv[4] || 45, OUT = process.env.OUT || '/tmp/rt_';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await ctx.newCDPSession(p);
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 }); await p.waitForTimeout(800);
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => ({ x: bx.x + x * bx.width / 720, y: bx.y + y * bx.height / 1280 });
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ ...P(x, y), id: 1 }] });
const tap = async (x, y) => { await touch('touchStart', x, y); await p.waitForTimeout(40); await touch('touchEnd', x, y); };
const drag = async (x0, y0, x1, y1, ms = 220) => { await touch('touchStart', x0, y0); const n = 6; for (let i = 1; i <= n; i++) { await p.waitForTimeout(ms / n); await touch('touchMove', x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); } await touch('touchEnd', x1, y1); };
const hudText = () => p.evaluate(() => { const S = window.__game.scene.getScene('Tail'); const t = S?.children?.list.find(o => o.type === 'Text' && /^TAILS/.test(o.text)); return t ? t.text : null; });
const look = () => p.evaluate(() => { const st = window.__pr?.st; if (!st) return null; const tip = window.__pr.tip?.(); return { ph: st.phase, pup: st.pup, glow: st.glow, px: st.px, py: st.py, face: st.face, bx: st.bx, by: st.by, tails: st.tails, grabs: st.grabs, yelps: st.yelps, slips: st.slips, time: st.time, running: st.running, ended: window.__pr.ended, tip }; });
await tap(360, 1150); // PLAY
await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 30000 }); await p.waitForTimeout(900); await tap(360, 640); // tutorial: tap anywhere
await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 });
await p.evaluate(() => { window.__game.scene.getScene('Tail').input.on('pointerdown', () => { window.__pdn = (window.__pdn || 0) + 1; }); });
const hud0 = await hudText(); console.log('HUD at start:', hud0); const log = []; let last = { grabs: 0, tails: 0, yelps: 0, slips: 0 }, shot = false; const t0 = Date.now(); const R = Math.random;
while (Date.now() - t0 < SECS * 1000) {
  const s = await look(); if (!s || s.ended) break;
  for (const k of ['grabs', 'tails', 'yelps', 'slips']) if (s[k] !== last[k]) { const h = await hudText(); log.push({ t: +((Date.now() - t0) / 1000).toFixed(1), ev: k, val: s[k], hud: h }); console.log(JSON.stringify(log.at(-1))); last[k] = s[k];
    if (k === 'tails' && !shot) { shot = true; await p.waitForTimeout(500); await p.screenshot({ path: OUT + 'hud_after_first_catch.png' }); } }
  await p.waitForTimeout(250); // human reaction delay
  if (s.ph === 'tug') { if (!globalThis.tugShot) { globalThis.tugShot = 1; await p.screenshot({ path: OUT + 'tug.png' }); } for (let i = 0; i < 4; i++) { const before = process.env.DBG ? await p.evaluate(() => [window.__pr.st.tug, window.__pdn || 0]) : 0; await tap(360 + (R() - 0.5) * 200, 820 + (R() - 0.5) * 200); const after = process.env.DBG ? await p.evaluate(() => [window.__pr.st.tug, window.__pdn || 0, window.__pr.st.phase]) : 0;
      if (process.env.DBG) console.log('tug', before.map(v => +(+v).toFixed(3)), '->', after.map(v => typeof v === 'number' ? +v.toFixed(3) : v)); await p.waitForTimeout(120); } continue; }
  if (s.ph === 'catch') { await p.waitForTimeout(700); await tap(360, 700); continue; }
  const aim = () => [s.tip.x + (R() - 0.5) * 70, s.tip.y + (R() - 0.5) * 70];
  if (s.glow && !globalThis.s1Shot && await p.evaluate(() => !!window.__game.scene.getScene('Tail').step1)) { globalThis.s1Shot = 1; await p.waitForTimeout(250); await p.screenshot({ path: OUT + 'step1.png' }); continue; }
  if (s.glow) { await tap(...aim()); continue; } // tail glows: tap it
  if (STYLE === 'naive') { // chase like a person: tap where Puppy is (often ON him), sometimes drag from Bunny toward him
    if (R() < 0.5) await tap(s.px + (R() - 0.5) * 80, s.py - 60 + (R() - 0.5) * 80); else await drag(s.bx, s.by - 60, s.px, s.py - 40);
  } else { await tap(s.px - s.face * 150, s.py); }
}
const end = await look(); console.log('END', JSON.stringify({ tails: end?.tails, grabs: end?.grabs, yelps: end?.yelps, slips: end?.slips, hud: await hudText() }), 'errors', errs.length, errs[0] || '');
await p.screenshot({ path: OUT + 'end.png' }); await b.close();
// e2e assertion: real touch, human-paced play must move the HUD counter off 0
const first = log.find(e => e.ev === 'tails');
const ok = (end?.tails ?? 0) >= 1 && first && /TAILS\s*0\s*\/\s*6/.test(hud0) && /TAILS\s*[1-6]\s*\/\s*6/.test(first.hud) && errs.length === 0;
console.log(ok ? 'PASS counter 0 -> ' + end.tails + ' (first catch HUD: ' + first.hud + ')' : 'FAIL counter stayed ' + (end?.tails ?? 0)); process.exit(ok ? 0 : 1);
