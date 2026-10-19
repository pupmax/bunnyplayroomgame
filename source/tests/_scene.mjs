import { chromium } from 'playwright';
const [scene, out, tut] = process.argv.slice(2);
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto('http://localhost:4199/'); if (tut) await page.evaluate((t) => localStorage.setItem('playroom.tut.' + t, '1'), tut);
await page.reload(); await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 60000 });
await page.evaluate((s) => { const g = window.__game; g.scene.getScenes(true).forEach(x => g.scene.stop(x.scene.key)); g.scene.start(s); }, scene);
await page.waitForTimeout(4000); await page.screenshot({ path: out }); console.log('errors', errs); await b.close();
