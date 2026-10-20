// iPhone-size (390x844 @3x, iPhone 15/16-ish) title card screenshot: node tests/_tailtitle.mjs <url> <out.png>
import { chromium, devices } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url); await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 });
await p.waitForTimeout(1800); await p.screenshot({ path: out }); console.log('shot', out, 'errors', errs.length, errs[0] || ''); await b.close();
