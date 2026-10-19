import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:4200/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
const p = await ctx.newPage(); await p.goto(URL); await p.evaluate(() => { for (const n of ['playroom', 'playroom-ruby']) localStorage.setItem(n + '.tut.rubybag', '1'); }); await p.reload();
await p.waitForFunction(() => window.__game && window.__artReady, null, { timeout: 120000 });
await p.evaluate((k) => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start(k); }, process.env.SCENE || 'Boxing'); await p.waitForTimeout(3000);
const r = await p.evaluate((SK) => { const G = window.__game, out = []; const S = G.scene.getScene(SK); const names = {}; for (const k of Object.keys(S)) { const v = S[k]; if (v && v.type === 'Graphics') names[k] = v; }
  const nameOf = o => Object.keys(names).find(k => names[k] === o) || '';
  for (const s of G.scene.getScenes(true)) { const walk = (l, path) => { for (const o of l) { if (o.type === 'Graphics') out.push([s.scene.key, path, nameOf(o), o.commandBuffer.length, o.visible, o.depth]); if (o.list) walk(o.list, path + '/' + (o.type)); } }; walk(s.children.list, ''); }
  return out.sort((a, b) => b[3] - a[3]); }, process.env.SCENE || 'Boxing');
for (const x of r) console.log(x.join(' ')); await b.close();
