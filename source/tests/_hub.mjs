import { chromium } from 'playwright';
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto('http://localhost:4199/'); await page.evaluate(() => localStorage.setItem('playroom.beaten', '4'));
await page.reload(); await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 60000 });
await page.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(x => g.scene.stop(x.scene.key)); g.scene.start('Hub'); });
await page.waitForFunction(() => window.__game.scene.getScene('Hub').children.list.some(o => o.depth === 790 && o.scale >= 0.99), null, { timeout: 60000, polling: 16 }); const bb = await page.evaluate(() => { const o = window.__game.scene.getScene('Hub').children.list.find(o => o.depth === 790); const b = o.getBounds(); return [b.x, b.y, b.right, b.bottom]; }); console.log('bubble bounds', bb); await page.screenshot({ path: 'screenshots/v6/hub_bubble.png' }); await page.waitForTimeout(3000); await page.screenshot({ path: 'screenshots/v6/hub_linye.png' }); console.log('errors', errs); await b.close();
