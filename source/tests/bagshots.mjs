import { chromium } from 'playwright';
const URL = process.env.BASE_URL || 'http://localhost:4199/';
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(URL); await page.evaluate(() => localStorage.setItem('playroom.tut.rubybag', '1'));
await page.reload(); await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 60000 });
await page.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Boxing'); });
await page.waitForFunction(() => window.__pr?.scene === 'Boxing' && window.__pr.st.running, null, { timeout: 30000 });
await page.waitForTimeout(3000); await page.screenshot({ path: 'screenshots/v6/bag_gameplay.png' });
await page.waitForFunction(() => window.__pr.st.state === 'guard', null, { timeout: 30000 }); await page.evaluate(() => window.__pr.swingBack(1));
await page.waitForFunction(() => window.__pr.stT() < 0.4, null, { timeout: 30000 }); await page.screenshot({ path: 'screenshots/v6/bag_swingback.png' });
await page.evaluate(() => { window.__pr.st.pupHp = 0; window.__pr.force(true); });
for (const [i, ms] of [[1, 700], [2, 1500]]) { await page.waitForTimeout(ms); await page.screenshot({ path: `screenshots/v6/bag_ko_${i}.png` }); }
console.log('errors', errs); await b.close();
