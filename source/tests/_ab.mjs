import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:4199/'); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 120000 });
await p.evaluate(() => { for (const k of ['rubybag','glassia3','zoe1','nana1','midnight1','noir1','iris1','linye1','bunny1']) localStorage.setItem('playroom.tut.' + k, '1'); });
for (const k of ['Hub', 'Football', 'Hive', 'Acorn', 'Pounce', 'Trash', 'Shadow', 'Lasso', 'Champion', 'Boxing', 'Dive']) {
  await p.evaluate(k => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start(k); }, k); await p.waitForTimeout(2200);
  await p.screenshot({ path: `screenshots/v9/ab_${k}.png` });
  console.log(k, JSON.stringify(await p.evaluate(() => ({ baked: window.__autobake.baked, mb: window.__autobake.mb, keys: window.__autobake.cache.size, tex: Object.keys(window.__game.textures.list).length }))));
}
console.log('errors', errs.length, errs[0] || ''); await b.close();
