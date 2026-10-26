import { chromium, devices } from 'playwright';
const url = process.argv[2], out = process.argv[3];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });
await p.evaluate(() => { const G = window.__game; G.scene.getScenes(true).forEach(s => G.scene.stop(s.sys.settings.key)); G.scene.start('Hub'); });
await p.waitForTimeout(1500); await p.screenshot({ path: out }); console.log('errors', errs); await b.close();
