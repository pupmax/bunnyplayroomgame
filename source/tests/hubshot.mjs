import { chromium } from 'playwright';
const b = await chromium.launch(); const errs = [];
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errs.push(String(e)));
await page.goto('http://localhost:4199/');
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 30000 });
await page.evaluate(() => { window.__game.scene.getScene('Title').scene.start('Hub'); });
await page.waitForTimeout(1500); await page.screenshot({ path: 'screenshots/v3/hub_dungeon.png' });
console.log('errors', errs); await b.close();
