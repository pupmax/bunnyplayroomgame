// 390x844 Title + Hub shots (Hall option C + BUNNY'S RULES plaque). Usage: URL=... OUT=... node tests/h11_hubtitle.mjs
import { chromium, devices } from 'playwright';
const OUT = process.env.OUT || '/workspace/playtest-bpg/audit27/final/hall/', URL_ = process.env.URL || 'http://localhost:4201/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL_); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 120000 });
await p.waitForTimeout(4000); await p.screenshot({ path: OUT + 'title.png' });
const v = await p.evaluate(() => fetch('version.json?t=' + Date.now()).then(r => r.json()).catch(() => ({})));
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start('Hub'); });
await p.waitForFunction(() => window.__game.scene.isActive('Hub'), null, { timeout: 30000 }); await p.waitForTimeout(5000); await p.screenshot({ path: OUT + 'hub.png' });
console.log(JSON.stringify({ build: v.build, errs })); await b.close();
