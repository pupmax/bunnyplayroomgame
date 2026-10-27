// Trash-Can Drop real-touch test (iPhone-size 390x844, CDP touch events only, no scene calls during play).
// A human-ish player: watches Iris's ring and Puppy, guesses where he will be when the item lands (with reaction delay + judgement
// noise), and taps. Checks: varied knockouts (bag: no immediate repeats, several kinds), Bunny-photo daydreams (2-3 per game, none in
// the first ~5 s, each 2.5-3 s, DREAM BONK +500 when hit, pocketed when missed), win/lose cards, zero page errors.
// Usage: node tests/trash-realtouch.mjs [url] [human|idle|sloppy] [runs]   env SHOTS=dir saves key moments.
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://127.0.0.1:4388/test.html', STYLE = process.argv[3] || 'human', RUNS = +(process.argv[4] || 3), SHOTS = process.env.SHOTS;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await ctx.newCDPSession(p); const wait = ms => new Promise(r => setTimeout(r, ms)); let seed = 12345 + RUNS * 7 + STYLE.length; const R = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') || window.__game?.scene.isActive('SoloTitle') || window.__game?.scene.isActive('Hub'), null, { timeout: 120000 });
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => ({ x: bx.x + x * bx.width / 720, y: bx.y + y * bx.height / 1280 });
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ ...P(x, y), id: 1 }] });
const tap = async (x, y) => { await touch('touchStart', x, y); await wait(45); await touch('touchEnd', x, y); };
const shot = async (n) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png` }); };
const shotsDone = new Set(); const once = async (n) => { if (!SHOTS || shotsDone.has(n)) return false; shotsDone.add(n); await shot(n); return true; };
const look = () => p.evaluate(() => { const r = window.__pr; if (!r || r.scene !== 'Trash' || !r.st) return { scene: window.__game.scene.getScenes(true).map(s => s.sys.settings.key).join(',') };
  const S = window.__game.scene.getScene('Trash'), s = r.st; return { ...s, skin: r.skin?.(), photo: r.photo?.(), ended: r.ended, falling: S.falling.length, item: S.queue[0], card: !!S.children.list.find(o => o.type === 'Container' && o.depth >= 900), fps: Math.round(window.__game.loop.actualFps) }; });
const results = [];
for (let run = 0; run < RUNS; run++) {
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.includes('.tut.')) localStorage.removeItem(k); window.__pr = null; window.__tutorialOpen = false; const g = window.__game; g.scene.getScenes(true).filter(s => s.sys.settings.key !== 'Trash').forEach(s => s.scene.stop()); g.scene.start('Trash'); }); // start() restarts Trash (stop+start in one tick would leave it stopped)
  await p.waitForFunction(() => window.__pr?.scene === 'Trash' && window.__tutorialOpen, null, { timeout: 20000 }).catch(() => {});
  await wait(900); if (run === 0) await once('00_tutorial'); await tap(360, 900); // dismiss the tutorial card
  for (let i = 0; i < 40 && !(await p.evaluate(() => !!window.__pr?.st?.running)); i++) { await wait(1500); if (await p.evaluate(() => !!window.__tutorialOpen)) await tap(360, 900); }
  await p.waitForFunction(() => window.__pr?.skin?.(), null, { timeout: 15000 }).catch(() => {});
  const t0 = Date.now(); const kos = []; let last = null, dreamStart = null, dreamB = 0, dreamLens = [], firstPhotoEl = null, taps = 0, ev = [];
  while (Date.now() - t0 < 480000) {
    const s = await look(); if (!s.st && s.running === undefined) break; if (s.over || s.ended) { last = s; break; }
    // events
    if (last && s.bonks > last.bonks) { const kind = s.skin?.mode === 'wake' ? 'WAKE' : s.skin?.ko; kos.push(kind); ev.push(`${s.el.toFixed(1)} bonk ${kind}`);
      if (kind === 'WAKE') { await wait(260); await once('13_dream_bonk'); } else { await wait(kind === 'pop' ? 480 : 330); await once('10_ko_' + kind); } }
    if (last && s.photos > last.photos) { dreamStart = s.el; dreamB = s.dreamBonks; if (firstPhotoEl === null) firstPhotoEl = s.el; ev.push(`${s.el.toFixed(1)} PHOTO`); await wait(380); await once('11_photo_appears'); }
    if (dreamStart !== null && s.mode === 'dream' && s.el - dreamStart > 1.2) await once('12_puppy_dreaming');
    if (dreamStart !== null && s.mode !== 'dream') { dreamLens.push((s.dreamBonks > dreamB ? 'bonk@' : 'pocket@') + (s.el - dreamStart).toFixed(2)); dreamStart = null; }
    if (last && s.pockets > last.pockets) ev.push(`${s.el.toFixed(1)} pocketed`);
    if (last && s.misses > last.misses) ev.push(`${s.el.toFixed(1)} miss`);
    last = s;
    if (STYLE === 'idle') { await wait(200); continue; }
    if (s.cool > 0 || s.falling > 0) { await wait(60); continue; }
    // human estimate: where will Puppy be when the item lands, and is the ring there now?
    const fall = (s.item === '📦' ? 0.6 : 0.42) + 0.18, hitR = s.item === '📦' ? 100 : 75, speed = s.mode === 'run' ? 330 : s.mode === 'walk' ? 140 : 0;
    const noise = (STYLE === 'sloppy' ? 110 : 60) * (R() - 0.5) * 2, fut = s.px + Math.sign(s.pv) * speed * fall + noise;
    const ispd = 200 + (55 - s.time) * 3, iFut = s.ix + s.idir * ispd * 0.18; // the ring keeps moving during the reaction delay
    const ok = !s.umbrella && Math.abs(iFut - fut) < hitR * (STYLE === 'sloppy' ? 0.9 : 0.6);
    const impatient = STYLE === 'sloppy' && R() < 0.04;
    if (ok || impatient) { await wait(120 + R() * 120); await tap(200 + R() * 320, 700 + R() * 300); taps++; await wait(200); }
    else await wait(50);
  }
  const end = await look(); await wait(1500); const card = await look();
  const ko = kos.filter(k => k && k !== 'WAKE'); const repeats = ko.filter((k, i) => i > 0 && k === ko[i - 1]).length;
  const r = { run, style: STYLE, outcome: end.ended || (end.over ? (end.bonks >= 7 ? 'win' : 'lose') : 'TIMEOUT'), el: +(end.el ?? 0).toFixed(1), timeLeft: +(end.time ?? 0).toFixed(1), bonks: end.bonks, misses: end.misses, score: end.score, taps,
    photos: end.photos, firstPhotoAt: firstPhotoEl === null ? null : +firstPhotoEl.toFixed(1), dreamLens, dreamBonks: end.dreamBonks, pockets: end.pockets, kos: ko, koKinds: new Set(ko).size, repeats, card: card.card, fpsMin: end.fps, errors: errs.length };
  results.push(r); console.log(JSON.stringify(r)); console.log('  ', ev.join(' · '));
  if (SHOTS && r.outcome === 'win') { await once('14_win_card'); } if (SHOTS && r.outcome === 'lose') await once('15_lose_card');
}
await b.close(); if (errs.length) console.log('ERRORS', errs.slice(0, 5));
const bad = results.filter(r => r.errors || r.outcome === 'TIMEOUT' || r.repeats || !r.card || (r.firstPhotoAt !== null && r.firstPhotoAt < 5) || r.dreamLens.some(l => l.startsWith('pocket') && (+l.split('@')[1] < 2.3 || +l.split('@')[1] > 3.4)) || r.photos > 3 || (r.el > 30 && r.photos < 2));
console.log(`RUNS ${results.length} WINS ${results.filter(r => r.outcome === 'win').length} ${bad.length ? 'FAIL ' + bad.length : 'PASS'}`);
