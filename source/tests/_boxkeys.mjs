import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto('http://localhost:4199/');
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 90000 });
await page.evaluate(() => { localStorage.removeItem('playroom.tut.rubybag'); const T = window.__game.textures; const og = T.get.bind(T); window.__keys = new Set(); T.get = (k) => { if (typeof k === 'string') window.__keys.add(k); return og(k); };
  const oe = T.exists.bind(T); T.exists = (k) => { if (typeof k === 'string') window.__keys.add(k); return oe(k); }; window.__game.scene.getScene('Title').scene.start('Boxing'); });
const bx = await page.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const w = (ms) => page.waitForTimeout(ms);
await w(4000); // tutorial + demo
await page.mouse.click(...P(360, 930)); await w(1500); await page.mouse.click(...P(360, 860)); await w(1000);
for (let i = 0; i < 40; i++) { await page.mouse.click(...P(360, 1185)); await w(150); if (i % 9 === 0) await page.mouse.click(...P(110, 1185)); if (i % 13 === 0) await page.mouse.click(...P(610, 1185)); }
await page.evaluate(() => window.__pr.force(true)); await w(6000);
await page.evaluate(() => window.__game.scene.getScene('Boxing').scene.restart()); await w(2500);
await page.evaluate(() => window.__pr.force(false)); await w(5000);
await page.evaluate(() => window.__game.scene.getScene('Boxing').scene.restart()); await w(2500);
await page.evaluate(() => window.__pr.force(true, true)); await w(5000);
const keys = await page.evaluate(() => [...window.__keys]); fs.writeFileSync('/workspace/game/boxkeys.json', JSON.stringify(keys.sort()));
console.log(keys.length, keys.join(' ')); await b.close();
