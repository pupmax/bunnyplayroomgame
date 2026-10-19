// Standalone Ruby build (dist-ruby on :4200): loader -> title card -> tutorial -> Boxing -> win card -> PLAY AGAIN -> lose card -> MENU.
import { chromium } from 'playwright';
const BASE = process.env.RUBY_URL || 'http://localhost:4200/';
const b = await chromium.launch(); const errs = [], res = [], missing = new Set();
const ok = (n, c, x = '') => { res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); console.log(res.at(-1)); };
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const t0 = Date.now(); await page.goto(BASE);
await page.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 });
ok('boots to title card', true, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
ok('only standalone scenes', JSON.stringify(await page.evaluate(() => window.__game.scene.scenes.map(s => s.scene.key))) === '["Boot","SoloTitle","Boxing","Pause"]');
const texCount = await page.evaluate(() => window.__game.textures.getTextureKeys().filter(k => !/^[0-9a-f]{8}-/.test(k)).length); ok('light texture set', texCount < 40, `${texCount} textures`);
await page.evaluate(() => { const T = window.__game.textures, og = T.get.bind(T); window.__miss = new Set(); T.get = (k) => { if (typeof k === 'string' && !T.exists(k) && !/^[0-9a-f]{8}-/.test(k)) window.__miss.add(k); return og(k); }; });
const bx = await page.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const cardUp = () => page.waitForFunction(() => window.__game.scene.getScene('Boxing').children.list.some(o => o.depth === 960 && o.alpha >= 0.99), null, { timeout: 60000, polling: 50 }).then(() => true, () => false);
const gameWait = async (sec) => { const s = await page.evaluate(() => window.__game.loop.time); await page.waitForFunction(([s, d]) => window.__game.loop.time - s >= d, [s, sec * 1000], { timeout: 60000, polling: 50 }); };
await gameWait(1.5); await page.screenshot({ path: 'screenshots/v8/ruby_00_title.png' });
await page.mouse.click(...P(360, 1150));
ok('PLAY starts Boxing', await page.waitForFunction(() => window.__game.scene.isActive('Boxing'), null, { timeout: 30000 }).then(() => true, () => false));
ok('Ruby tutorial shows', await page.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 30000 }).then(() => true, () => false));
await gameWait(1.2); await page.screenshot({ path: 'screenshots/v8/ruby_01_tutorial.png' });
for (let i = 0; i < 6 && !(await page.evaluate(() => window.__pr?.st?.running)); i++) { await page.mouse.click(...P(360, 930)); await gameWait(0.6); }
ok('match running after tutorial', await page.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 }).then(() => true, () => false));
let shot = false;
// freeze the loop ~one frame after a punch connects (hitFx) so the screenshot shows the impact
await page.evaluate(() => { const S = window.__game.scene.getScene('Boxing'), o = S.hitFx.bind(S); window.__hitNow = false;
  S.hitFx = (...a) => { o(...a); if (!window.__hitNow) { window.__hitNow = true; setTimeout(() => window.__game.loop.sleep(), 60); } }; });
for (let i = 0; i < 80 && !shot; i++) { await page.mouse.click(...P(360, 1185)); await page.waitForTimeout(180); shot = await page.evaluate(() => window.__hitNow); }
if (shot) { await page.waitForTimeout(250); await page.screenshot({ path: 'screenshots/v8/ruby_02_gameplay.png' }); await page.evaluate(() => window.__game.loop.wake()); }
ok('real punch lands', shot, JSON.stringify(await page.evaluate(() => ({ pupHp: window.__pr.st.pupHp, hits: window.__pr.st.hits }))));
await page.evaluate(() => window.__pr.force(true));
ok('win -> result card', await page.waitForFunction(() => window.__pr.ended === 'win', null, { timeout: 60000 }).then(() => true, () => false) && await cardUp());
await gameWait(0.3); await page.screenshot({ path: 'screenshots/v8/ruby_03_win.png' });
await page.mouse.click(...P(360 - 145, 1010));
ok('PLAY AGAIN restarts Boxing (no hub/interlude)', await page.waitForFunction(() => window.__game.scene.isActive('Boxing') && window.__pr?.st?.running && !window.__pr.ended, null, { timeout: 60000 }).then(() => true, () => false));
ok('no tutorial on replay', !(await page.evaluate(() => window.__tutorialOpen)));
await page.evaluate(() => window.__pr.force(false));
ok('lose -> result card', await page.waitForFunction(() => window.__pr.ended === 'lose', null, { timeout: 60000 }).then(() => true, () => false) && await cardUp());
await gameWait(0.3); await page.screenshot({ path: 'screenshots/v8/ruby_04_lose.png' });
await page.mouse.click(...P(360 + 145, 1010));
ok('MENU returns to title card', await page.waitForFunction(() => window.__game.scene.isActive('SoloTitle'), null, { timeout: 60000 }).then(() => true, () => false));
const storage = await page.evaluate(() => Object.keys(localStorage)); ok('does not touch full-game progress', !storage.includes('playroom.beaten'), storage.join(','));
const miss = await page.evaluate(() => [...window.__miss]); ok('no missing textures', miss.length === 0, miss.join(','));
ok('0 console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(res.some(r => r.startsWith('FAIL')) ? 'RESULT FAIL' : 'RESULT PASS'); await b.close();
