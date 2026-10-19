// Auto-bake fidelity: pause the scene, screenshot with baking on and off, pixel-diff.
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 })).newPage();
await p.goto(process.env.URL || 'http://localhost:4199/'); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 120000 });
await p.evaluate(() => { for (const k of ['rubybag','glassia3','zoe1','nana1','midnight1','noir1','iris1','linye1','bunny1']) localStorage.setItem('playroom.tut.' + k, '1'); });
let worst = 0;
for (const k of ['Hub', 'Title', 'Football', 'Hive', 'Acorn', 'Pounce', 'Trash', 'Shadow', 'Lasso', 'Champion', 'Boxing']) {
  await p.evaluate(k => { const G = window.__game; G.scene.scenes.forEach(s => { if (s.sys.isActive() || s.sys.isPaused()) G.scene.stop(s.sys.settings.key); }); G.scene.start(k); }, k); await p.waitForTimeout(2200);
  await p.evaluate(() => { const G = window.__game; G.scene.getScenes(true).forEach(s => { s.tweens.pauseAll(); s.time.paused = true; G.scene.pause(s.sys.settings.key); }); window.__abOff = false; });
  await p.waitForTimeout(200); await p.screenshot({ path: `/tmp/abd/${k}_on.png` });
  await p.waitForTimeout(200); await p.screenshot({ path: `/tmp/abd/${k}_on2.png` });
  await p.evaluate(() => { window.__abOff = true; }); await p.waitForTimeout(200); await p.screenshot({ path: `/tmp/abd/${k}_off.png` });
  await p.evaluate(() => { window.__abOff = false; });
  console.log(k, 'baked', await p.evaluate(() => window.__autobake.baked));
}
await b.close();
