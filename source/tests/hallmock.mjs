// Hall/Title background shots at 390x844: node tests/hallmock.mjs <Hub|Title> <out.png> [port]  (needs a dev server; tester build so BONUS shows)
import { chromium, devices } from 'playwright';
const scene = process.argv[2] || 'Hub', out = process.argv[3], port = process.argv[4] || 4311;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${port}/test.html`);
await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 90000 });
if (scene !== 'Title') await p.evaluate((k) => { const G = window.__game; G.scene.getScenes(true).forEach(s => G.scene.stop(s.sys.settings.key)); G.scene.start(k); }, scene);
await p.waitForTimeout(1800); await p.screenshot({ path: out });
const info = await p.evaluate(() => { const s = window.__game.scene.getScene('Hub'); if (!s?.sys.isActive()) return null;
  return s.children.list.filter(o => o.type === 'Text' && /Bunny wins|RULES|DUNGEON/.test(o.text)).map(o => ({ t: o.text.split('\n')[0], size: o.style.fontSize, scale: +o.scaleX.toFixed(2), w: Math.round(o.displayWidth) })); });
console.log(scene, 'errors', errs, JSON.stringify(info)); await b.close();
