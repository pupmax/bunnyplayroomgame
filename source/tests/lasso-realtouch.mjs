// PLAYROOM RODEO (Lasso finale) REAL-touch e2e: iPhone 390x844 (hasTouch/isMobile), CDP touch events only (no scene calls
// during play). A human-ish player: reaction delays, aim noise, leads Puppy by a guessed amount, holds 0.3-1.0 s, taps the
// tug at ~6/s, swipes when he winds up a charge. Asserts: catch -> tie-up (clock paused) -> tug -> round 2/3 -> win
// (drag-off -> Champion) or loss card (title, counts == HUD, buttons press-armed). Saves key-moment shots.
// usage: node tests/lasso-realtouch.mjs [url] [style: human|idle] [runs]   env SHOTS=dir
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://127.0.0.1:4377/test.html', STYLE = process.argv[3] || 'human', RUNS = +process.argv[4] || 1, SHOTS = process.env.SHOTS || '';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await ctx.newCDPSession(p);
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') || window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 });
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => ({ x: bx.x + x * bx.width / 720, y: bx.y + y * bx.height / 1280 });
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ ...P(x, y), id: 1 }] });
const wait = ms => p.waitForTimeout(ms); const R = Math.random;
const tap = async (x, y) => { await touch('touchStart', x, y); await wait(40); await touch('touchEnd', x, y); };
const look = () => p.evaluate(() => { const r = window.__pr; if (!r || r.scene !== 'Lasso' || !r.st) return { scene: window.__game.scene.getScenes(true).map(s => s.sys.settings.key).join(',') }; const s = r.st;
  const S = window.__game.scene.getScene('Lasso'); const hud = S.children.list.find(o => o.type === 'Text' && /^ROPED \d/.test(o.text))?.text;
  return { ph: s.phase, pup: s.pup, px: s.px, py: s.py, ropes: s.ropes, round: s.round, time: s.time, tug: s.tug, flying: s.flying, hold: s.hold, running: s.running, ended: r.ended, card: !!r.cardShown,
    throws: s.throws, misses: s.misses, slips: s.slips, dodges: s.dodges, plants: s.plants, bonks: s.bonks, decoys: s.decoys, hud, armed: window.__cardArmed?.(), clock: s.clock, need: r.K.NEED, fps: Math.round(window.__game.loop.actualFps) }; });
const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
const shotOnce = {}; const once = async (name) => { if (shotOnce[name]) return; shotOnce[name] = 1; await shot(name); };
const results = [];
for (let run = 0; run < RUNS; run++) {
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.includes('.tut.')) localStorage.removeItem(k); window.__pr = null; const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start('Lasso'); window.__trace = []; clearInterval(window.__ti); window.__ti = setInterval(() => { const r = window.__pr; if (r && r.st) { const s = r.st; const k = s.phase + '/' + s.pup + '/' + s.flying + '/' + (s.bannerT > 0) + (s.phase === 'tug' ? '/' + s.tug.toFixed(1) : ''); const L = window.__trace[window.__trace.length - 1]; if (!L || L.k !== k) window.__trace.push({ k, c: +s.clock.toFixed(1), t: +s.time.toFixed(1) }); } }, 100); });
  await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 30000 }); await wait(900); if (run === 0) await shot('00_tutorial'); await tap(360, 640);
  await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 }); await wait(300); if (run === 0) await shot('01_couch');
  const t0 = Date.now(); const ev = []; let fin = null, fpsMin = 999, last = null, prev = null, tiedSeen = null, maxTugTaps = 0, tugTaps = 0, timeFrozenTie = true, hudMismatch = 0;
  while (Date.now() - t0 < 200000) {
    const s = await look(); if (s.ph) { fin = s; fpsMin = Math.min(fpsMin, s.fps); } if (!s.ph) { if (/Champion/.test(s.scene)) { ev.push({ t: (Date.now() - t0) / 1000, ev: 'champion' }); break; } await wait(100); continue; }
    if (last) for (const k of ['ropes', 'round', 'slips', 'dodges', 'plants', 'bonks', 'decoys', 'misses']) if (s[k] !== last[k]) ev.push({ t: +((Date.now() - t0) / 1000).toFixed(1), ev: k, v: s[k], hud: s.hud, clock: +s.time.toFixed(1) });
    if (last && (last.ph !== s.ph || (process.env.DBG && last.pup !== s.pup))) ev.push({ t: +((Date.now() - t0) / 1000).toFixed(1), ev: 'phase', v: s.ph + '/' + s.pup + '/' + s.time.toFixed(1) });
    if (s.ph === 'tied' && s.ropes < s.need) { if (!tiedSeen) { tiedSeen = { t: Date.now(), clock: s.time }; await wait(400); await once('04_tied'); } else if (Math.abs(s.time - tiedSeen.clock) > 0.01) timeFrozenTie = false; }
    else tiedSeen = null;
    if (s.hud && !s.hud.includes(`ROPED ${s.ropes}/${s.need}`) && s.ph !== 'over') hudMismatch++;
    if (s.ended === 'lose' || s.ph === 'over') { await p.waitForFunction(() => window.__pr && window.__pr.cardShown && window.__cardArmed && ((window.__arm0 = window.__cardArmed()), true), null, { polling: 'raf', timeout: 10000 }); ev.push({ t: (Date.now() - t0) / 1000, ev: 'card' }); break; }
    if (s.ph === 'outro') { await wait(500); await once('07_win_dragoff'); await wait(3300); last = s; continue; }
    if (s.ph === 'tied') { await wait(150); last = s; continue; }
    if (s.ph === 'tug') { if (last?.ph !== 'tug') { tugTaps = 0; await wait(220 + R() * 150); } // react
      for (let b = 0; b < 2; b++) { await tap(360 + (R() - 0.5) * 300, 900 + (R() - 0.5) * 300); tugTaps++; if (b === 0) await wait(90 + R() * 50); } if (process.env.DBG) ev.push({ t: +((Date.now() - t0) / 1000).toFixed(1), ev: 'tap', v: tugTaps }); if (tugTaps >= 5 && tugTaps < 7) await once('03_tug'); await wait(60 + R() * 60); last = s; continue; }
    if (s.ph !== 'free') { await wait(100); last = s; continue; }
    if (STYLE === 'idle') { await wait(300); last = s; continue; }
    if (s.pup === 'wind' || s.pup === 'charge') { await wait(200 + R() * 250); const s2 = await look(); if (s2.pup === 'wind' || s2.pup === 'charge') { await once('05_charge_warning'); const dir = R() < 0.5 ? -1 : 1, x0 = 360;
        await touch('touchStart', x0, 1000); for (let i = 1; i <= 4; i++) { await wait(25); await touch('touchMove', x0 + dir * 35 * i, 1000); } await touch('touchEnd', x0 + dir * 140, 1000); }
      last = s; continue; }
    if (s.pup === 'plant' && !shotOnce['06_faceplant']) { await wait(200); await once('06_faceplant'); }
    if (s.pup === 'crash') { await wait(80); last = s; continue; }
    // aim: sample velocity, lead by a guess, add noise; hold a while (bigger loop), slide, release
    await wait(180 + R() * 220); // human reaction / decision
    const a = await look(); await wait(120); const c = await look(); if (c.ph !== 'free' || c.pup === 'wind' || c.pup === 'charge' || c.pup === 'crash') { last = c; continue; }
    const vx = (c.px - a.px) / 0.12 / 1.8, vy = (c.py - a.py) / 0.12 / 1.8; // (eval round trips make the sampled gap ~1.8x longer)
    const hold = c.pup === 'plant' ? 250 : 300 + R() * 650, lead = (hold + 420) / 1000 * (0.4 + R() * 0.5);
    let tx = c.px + vx * lead + (R() - 0.5) * 90, ty = c.py - 70 + vy * lead + (R() - 0.5) * 70;
    const sx = 300 + R() * 200, sy = 1000 + R() * 120; await touch('touchStart', sx, sy);
    const steps = 5; for (let i = 1; i <= steps; i++) { await wait(hold / steps); await touch('touchMove', sx + (tx - sx) * i / steps, sy + (ty - sy) * i / steps); if (i === 4) await once('02_swipe_fling'); }
    await touch('touchEnd', tx, ty); await wait(450); last = s;
  }
  const end = (await look()).ph ? await look() : fin; const dur = (Date.now() - t0) / 1000;
  let cardOk = null;
  if (end.card) {
    // press-arming: a tap the instant the card is up must NOT fire (taps meant for the game), a deliberate press after a quiet gap does
    const armed0 = await p.evaluate(() => window.__arm0); await tap(215, 1010); await wait(250); const stillCard = (await look()).card && (await p.evaluate(() => window.__game.scene.isActive('Lasso')));
    await wait(900); const armed1 = (await look()).armed; await shot(run === 0 ? '08_loss_card' : `08_loss_card_${run}`);
    const title = await p.evaluate(() => window.__game.scene.getScene('Lasso').children.list.flatMap(o => o.list || [o]).filter(o => o.type === 'Text').map(o => o.text).join(' | '));
    await tap(215, 1010); await p.waitForFunction(() => window.__pr && !window.__pr.cardShown && window.__pr.st && window.__pr.st.running, null, { polling: 200, timeout: 15000 }).catch(() => {});
    const retried = await p.evaluate(() => !!(window.__pr && !window.__pr.cardShown && window.__game.scene.isActive('Lasso')));
    cardOk = { retryRestarts: retried, armedAtOpen: armed0, stillCardAfterEarlyTap: stillCard, armedLater: armed1, hasTitle: /PUPPY GOT AWAY\.\.\.\nFOR NOW!/.test(title), countsMatch: title.includes(`${end.ropes}/${end.need} roped`) && end.hud.includes(`ROPED ${end.ropes}/${end.need}`), noLegacy: !/SO CLOSE|did a thing/i.test(title) };
  }
  const champion = ev.some(e => e.ev === 'champion');
  const r = { run, style: STYLE, outcome: champion ? 'WIN' : end.card ? 'LOSE' : 'TIMEOUT', secs: +dur.toFixed(1), gameSecs: +(end.clock ?? 0).toFixed(1), clockLeft: +(end.time ?? 0).toFixed(1), fpsMin, ropes: end.ropes, round: end.round ?? 3, throws: end.throws, misses: end.misses, slips: end.slips, dodges: end.dodges, plants: end.plants, bonks: end.bonks, decoys: end.decoys,
    clockFrozenDuringTie: timeFrozenTie, hudMismatch, cardOk, errors: errs.length };
  results.push(r); console.log(JSON.stringify(r)); console.log('  events:', ev.filter(e => e.ev !== 'misses' && (process.env.DBG || e.ev !== 'phase')).map(e => `${e.t}s ${e.ev}=${e.v ?? ''}${e.hud ? ' [' + e.hud + ' ' + e.clock + ']' : ''}`).join(' · '));
  if (champion && SHOTS) { await wait(1500); await shot('09_champion'); }
  if (process.env.DBG) console.log('TRACE', JSON.stringify(await p.evaluate(() => window.__trace.map(x => x.c + ':' + x.k + ':' + x.t))));
  await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start('Title'); }); await wait(500);
}
await b.close(); if (errs.length) console.log('ERRORS', errs.slice(0, 5));
const bad = results.filter(r => r.outcome === 'TIMEOUT' || r.errors || r.hudMismatch || !r.clockFrozenDuringTie || (r.cardOk && !(r.cardOk.armedAtOpen === false && r.cardOk.retryRestarts && r.cardOk.stillCardAfterEarlyTap && r.cardOk.armedLater && r.cardOk.hasTitle && r.cardOk.countsMatch && r.cardOk.noLegacy)));
console.log(`RUNS ${results.length} WINS ${results.filter(r => r.outcome === 'WIN').length} LOSSES ${results.filter(r => r.outcome === 'LOSE').length} ${bad.length ? 'FAIL ' + bad.length : 'PASS'}`);
process.exit(bad.length ? 1 : 0);
