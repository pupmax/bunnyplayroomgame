import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto('http://localhost:4199/'); await p.waitForFunction(() => window.__game && window.__artReady, null, { timeout: 180000 });
const L = ['Boxing', 'Football', 'Hive', 'Acorn', 'Dive', 'Pounce', 'Trash', 'Shadow', 'Lasso'];
const go = k => p.evaluate(k => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.key !== k && s.scene.stop()); G.scene.start(k); }, k);
const snap = () => p.evaluate(() => { window.gc && window.gc(); return { keys: Object.keys(window.__game.textures.list), heap: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) }; });
let prev = null;
for (let loop = 0; loop < 6; loop++) { for (const k of L) { await go(k); await p.waitForTimeout(2500); }
  await go('Boxing'); await p.waitForTimeout(2500); const s = await snap();
  console.log('loop', loop, 'tex', s.keys.length, 'heap', s.heap); prev = s.keys; }
await b.close();
