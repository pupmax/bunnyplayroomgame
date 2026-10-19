// Standalone Linye build (dist-linye on :4202): loader -> title card -> tutorial -> Shadow (played to a real win) -> PLAY AGAIN
// -> real loss (time runs out) -> MENU. Checks scenes, light texture set, no missing textures, own storage, 0 errors.
import { chromium } from 'playwright';
const BASE = process.env.LINYE_URL || 'http://localhost:4202/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] }); const errs = [], res = [];
const ok = (n, c, x = '') => { res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); console.log(res.at(-1)); };
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const t0 = Date.now(); await page.goto(BASE);
await page.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 });
ok('boots to title card', true, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
ok('only standalone scenes', JSON.stringify(await page.evaluate(() => window.__game.scene.scenes.map(s => s.scene.key))) === '["Boot","SoloTitle","Shadow","Pause"]');
const texCount = await page.evaluate(() => window.__game.textures.getTextureKeys().filter(k => !/^[0-9a-f]{8}-/.test(k)).length); ok('light texture set', texCount < 40, `${texCount} textures`);
await page.evaluate(() => { const T = window.__game.textures, og = T.get.bind(T); window.__miss = new Set(); T.get = (k) => { if (typeof k === 'string' && !T.exists(k) && !/^[0-9a-f]{8}-/.test(k)) window.__miss.add(k); return og(k); }; });
const bx = await page.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const tap = (x, y) => page.touchscreen.tap(...P(x, y));
const cardUp = () => page.waitForFunction(() => window.__game.scene.getScene('Shadow').children.list.some(o => o.depth === 960 && o.alpha >= 0.99), null, { timeout: 90000, polling: 50 }).then(() => true, () => false);
const gameWait = async (sec) => { const s = await page.evaluate(() => window.__game.loop.time); await page.waitForFunction(([s, d]) => window.__game.loop.time - s >= d, [s, sec * 1000], { timeout: 60000, polling: 50 }); };
await gameWait(1.5); await page.screenshot({ path: 'screenshots/v10/linye_00_title.png' });
ok('title reads LINYE vs PUPPY / SHADOW TAG', await page.evaluate(() => { const t = window.__game.scene.getScene('SoloTitle').children.list.filter(o => o.type === 'Text').map(o => o.text).join('|'); return t.includes('LINYE vs PUPPY') && t.includes('SHADOW TAG') && /build \d{10}/.test(t); }));
await tap(360, 1150);
ok('PLAY starts Shadow', await page.waitForFunction(() => window.__game.scene.isActive('Shadow'), null, { timeout: 30000 }).then(() => true, () => false));
ok('Linye tutorial shows', await page.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 30000 }).then(() => true, () => false));
await gameWait(1.2); await page.screenshot({ path: 'screenshots/v10/linye_01_tutorial.png' });
for (let i = 0; i < 6 && !(await page.evaluate(() => window.__pr?.st?.running)); i++) { await tap(360, 640); await gameWait(0.7); }
ok('level running after tutorial', await page.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 }).then(() => true, () => false));
// real play: tap the free pool nearest to Puppy; during a catch, tap to skip (after the 0.5 s minimum)
let shot = false, catches = new Set();
const play = async (ms) => { const end = Date.now() + ms; while (Date.now() < end) {
  const s = await page.evaluate(() => { const S = window.__game.scene.getScene('Shadow'); const lit = window.__pr.lit(); let bi = -1, bd = 1e9;
    window.__pr.pools.forEach(([x, y], i) => { if (lit[i]) return; const d = Math.hypot(x - S.pup.x, y - S.pup.y); if (d < bd) { bd = d; bi = i; } });
    return { ended: window.__pr.ended, sq: window.__pr.squash(), cool: window.__pr.st.cool, bi, bd, pool: bi >= 0 ? window.__pr.pools[bi] : null, holdMs: S.sq.phase === 'hold' ? S.time.now - S.sq.holdAt : 0 }; });
  if (s.ended) return s.ended;
  if (s.sq.phase) { catches.add(s.sq.v);
    if (s.sq.phase === 'hold' && !shot && s.holdMs > 500) { await page.screenshot({ path: 'screenshots/v10/linye_02_gameplay.png' }); shot = true; }
    if (s.sq.phase === 'hold' && s.holdMs > 650) await tap(360, 640); await page.waitForTimeout(60); continue; }
  if (s.pool && s.bd < 140 && s.cool <= 0) await tap(...s.pool); await page.waitForTimeout(70);
} return null; };
const r1 = await play(120000);
ok('played to a real WIN (12 tags)', r1 === 'win', JSON.stringify(await page.evaluate(() => ({ tags: window.__pr.st?.tags, time: window.__pr.st?.time }))));
ok('squash catches seen', catches.size >= 2, [...catches].join(''));
ok('gameplay screenshot during a catch', shot);
ok('win -> result card', await cardUp()); await gameWait(0.3); await page.screenshot({ path: 'screenshots/v10/linye_03_win.png' });
ok('card shows PLAY AGAIN + MENU', await page.evaluate(() => { const t = window.__game.scene.getScene('Shadow').children.list.flatMap(o => o.list || [o]).flatMap(o => o.list || [o]).filter(o => o.type === 'Text').map(o => o.text).join('|'); return t.includes('PLAY AGAIN') && t.includes('MENU'); }));
await tap(360 - 145, 1010); await tap(360 - 145, 1010); // double tap: must restart once
ok('PLAY AGAIN restarts Shadow', await page.waitForFunction(() => window.__game.scene.isActive('Shadow') && window.__pr?.st?.running && !window.__pr.ended, null, { timeout: 60000 }).then(() => true, () => false));
ok('no tutorial on replay', !(await page.evaluate(() => window.__tutorialOpen)));
// lose for real: don't tag, let the 32 s run out
ok('time runs out -> LOSE', await page.waitForFunction(() => window.__pr.ended === 'lose', null, { timeout: 120000, polling: 250 }).then(() => true, () => false));
ok('lose -> result card', await cardUp()); await gameWait(0.3); await page.screenshot({ path: 'screenshots/v10/linye_04_lose.png' });
await tap(360 + 145, 1010);
ok('MENU returns to title card', await page.waitForFunction(() => window.__game.scene.isActive('SoloTitle'), null, { timeout: 60000 }).then(() => true, () => false));
const storage = await page.evaluate(() => Object.keys(localStorage)); ok('own playroom-linye.* storage only', storage.every(k => !k.startsWith('playroom.') && !k.startsWith('playroom-ruby.')) && storage.some(k => k.startsWith('playroom-linye.')), storage.join(','));
const miss = await page.evaluate(() => [...window.__miss]); ok('no missing textures', miss.length === 0, miss.join(','));
ok('0 console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(res.some(r => r.startsWith('FAIL')) ? 'RESULT FAIL' : 'RESULT PASS'); await b.close();
