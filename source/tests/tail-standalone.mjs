// Standalone Tail Catch build (dist-tail on :4213): loader -> title card -> tutorial (600 ms lockout) -> Tail played to a real
// WIN with real touch taps -> PLAY AGAIN (double-tapped) -> real LOSS (time runs out) -> MENU. Own storage, no missing textures, 0 errors.
import { chromium } from 'playwright';
const BASE = process.env.TAIL_URL || 'http://localhost:4213/', OUT = 'screenshots/tail/game/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] }); const errs = [], res = [];
const ok = (n, c, x = '') => { res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); console.log(res.at(-1)); };
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const t0 = Date.now(); await page.goto(BASE);
await page.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 });
ok('boots to title card', true, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
ok('only standalone scenes', JSON.stringify(await page.evaluate(() => window.__game.scene.scenes.map(s => s.scene.key))) === '["Boot","SoloTitle","Tail","Pause"]');
const texCount = await page.evaluate(() => window.__game.textures.getTextureKeys().filter(k => !/^[0-9a-f]{8}-/.test(k)).length); ok('light texture set', texCount < 45, `${texCount} textures`);
await page.evaluate(() => { const T = window.__game.textures, og = T.get.bind(T); window.__miss = new Set(); T.get = (k) => { if (typeof k === 'string' && !T.exists(k) && !/^[0-9a-f]{8}-/.test(k)) window.__miss.add(k); return og(k); }; });
const bx = await page.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const tap = (x, y) => page.touchscreen.tap(...P(x, y));
const cardUp = () => page.waitForFunction(() => window.__game.scene.getScene('Tail').children.list.some(o => o.depth === 960 && o.alpha >= 0.99), null, { timeout: 90000, polling: 50 }).then(() => true, () => false);
const gameWait = async (sec) => { const s = await page.evaluate(() => window.__game.loop.time); await page.waitForFunction(([s, d]) => window.__game.loop.time - s >= d, [s, sec * 1000], { timeout: 60000, polling: 50 }); };
await gameWait(1.6); await page.screenshot({ path: OUT + 'tail_00_title.png' });
ok('title reads BUNNY vs PUPPY / CATCH PUPPY BY THE TAIL + build', await page.evaluate(() => { const t = window.__game.scene.getScene('SoloTitle').children.list.filter(o => o.type === 'Text').map(o => o.text).join('|'); return t.includes('BUNNY vs PUPPY') && t.includes('CATCH PUPPY') && t.includes('BY THE TAIL') && /build \d{10}/.test(t); }));
await tap(360, 1150); await tap(360, 1150);
ok('PLAY starts Tail', await page.waitForFunction(() => window.__game.scene.isActive('Tail'), null, { timeout: 30000 }).then(() => true, () => false));
ok('tutorial shows', await page.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 30000 }).then(() => true, () => false));
await tap(360, 640); // inside the 600 ms lockout: must NOT close
ok('tutorial ignores taps in the 600 ms lockout', await page.evaluate(() => window.__tutorialOpen === true));
await gameWait(1.2); await page.screenshot({ path: OUT + 'tail_01_tutorial.png' });
ok('tutorial says "Tap anywhere to start", no Got it', await page.evaluate(() => { const t = window.__game.scene.getScene('Tail').children.list.flatMap(o => o.list || [o]).filter(o => o.type === 'Text').map(o => o.text).join('|'); return /tap anywhere to start/i.test(t) && !/got it/i.test(t); }));
for (let i = 0; i < 6 && !(await page.evaluate(() => window.__pr?.st?.running)); i++) { await tap(360, 640); await gameWait(0.7); }
ok('level running after tutorial', await page.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 }).then(() => true, () => false));
// real play with touch: drag/tap Bunny to the spot behind Puppy, tap the tail when it glows, tap-tap the tug, skip catches
const shots = { dash: 0, glow: 0, tug: 0, catch: 0, lead: 0 }; let lines = new Set();
const shoot = async (k, n) => { if (!shots[k]) { shots[k] = 1; await page.screenshot({ path: OUT + n }); } };
const play = async (ms) => { const end = Date.now() + ms; while (Date.now() < end) {
  const s = await page.evaluate(() => { const st = window.__pr.st, tip = window.__pr.tip(); return { ended: window.__pr.ended, ph: st.phase, pup: st.pup, glow: st.glow, px: st.px, py: st.py, face: st.face, bx: st.bx, by: st.by, cool: st.cool, catchT: st.catchT, lead: st.lead, tip, reach: Math.hypot(st.bx - tip.x, st.by - 95 - tip.y) <= window.__pr.K.REACH, behind: (st.bx - st.px) * st.face < 0, tails: st.tails }; });
  if (s.ended) return s.ended;
  if (s.ph === 'catch') { if (s.catchT > 0.6) { await shoot(s.lead ? 'lead' : 'catch', s.lead ? 'tail_05_catch_lead.png' : 'tail_04_catch_gotcha.png'); } if (s.catchT > 0.9) await tap(360, 700); await page.waitForTimeout(60); continue; }
  if (s.ph === 'tug') { if (shots.tug === 0 && Math.random() < 0.3) await shoot('tug', 'tail_03_tug.png'); await tap(360, 760); await page.waitForTimeout(90); continue; }
  if (s.pup === 'dash' && s.tails >= 1 && s.cool < -0.3) await shoot('dash', 'tail_02a_chase_dash.png');
  if (s.glow && s.reach && s.behind && s.cool <= 0) { await shoot('glow', 'tail_02b_pause_glow.png'); await tap(s.tip.x, s.tip.y); await page.waitForTimeout(120); continue; }
  const tx = s.px - s.face * 140, ty = s.py; if (Math.hypot(tx - s.bx, ty - s.by) > 20) { const fx = Math.max(90, Math.min(630, tx)); if (Math.hypot(fx - s.px, ty - s.py + 90) > 160) await tap(fx, ty); }
  await page.waitForTimeout(80);
} return null; };
const r1 = await play(150000);
ok('played to a real WIN (6 tails)', r1 === 'win', JSON.stringify(await page.evaluate(() => ({ tails: window.__pr.st?.tails, time: window.__pr.st?.time?.toFixed(1), yelps: window.__pr.st?.yelps }))));
ok('screens: chase/glow/tug/catch', shots.glow && shots.tug && (shots.catch || shots.lead), JSON.stringify(shots));
ok('win -> result card', await cardUp()); await gameWait(0.3); await page.screenshot({ path: OUT + 'tail_06_win.png' });
ok('card shows PLAY AGAIN + MENU', await page.evaluate(() => { const t = window.__game.scene.getScene('Tail').children.list.flatMap(o => o.list || [o]).flatMap(o => o.list || [o]).filter(o => o.type === 'Text').map(o => o.text).join('|'); return t.includes('PLAY AGAIN') && t.includes('MENU'); }));
await tap(360 - 145, 1010); await tap(360 - 145, 1010); // double tap: must restart once
ok('PLAY AGAIN restarts Tail', await page.waitForFunction(() => window.__game.scene.isActive('Tail') && window.__pr?.st?.running && !window.__pr.ended, null, { timeout: 60000 }).then(() => true, () => false));
ok('no tutorial on replay', !(await page.evaluate(() => window.__tutorialOpen)));
ok('time runs out -> LOSE', await page.waitForFunction(() => window.__pr.ended === 'lose', null, { timeout: 120000, polling: 250 }).then(() => true, () => false));
ok('lose -> result card', await cardUp()); await gameWait(0.3); await page.screenshot({ path: OUT + 'tail_07_lose.png' });
await tap(360 + 145, 1010);
ok('MENU returns to title card', await page.waitForFunction(() => window.__game.scene.isActive('SoloTitle'), null, { timeout: 60000 }).then(() => true, () => false));
const storage = await page.evaluate(() => Object.keys(localStorage)); ok('own playroom-tail.* storage only', storage.every(k => !k.startsWith('playroom.') && !k.startsWith('playroom-ruby.') && !k.startsWith('playroom-linye.')) && storage.some(k => k.startsWith('playroom-tail.')), storage.join(','));
const miss = await page.evaluate(() => [...window.__miss]); ok('no missing textures', miss.length === 0, miss.join(','));
ok('0 console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(res.some(r => r.startsWith('FAIL')) ? 'RESULT FAIL' : 'RESULT PASS'); await b.close();
