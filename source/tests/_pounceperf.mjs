// Pounce frame cost: old vs new build, 4x CPU throttle, real rendering, Noir sneaking + Puppy looking (meter active).
import { chromium, devices } from 'playwright';
for (const [name, url] of [['before', 'http://localhost:4203/'], ['after', 'http://localhost:4201/']]) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  console.log(name, 'goto'); await p.goto(url); console.log(name, 'loaded'); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });
  await p.evaluate(() => { localStorage.setItem('playroom-test.tut.noir1', '1'); const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start('Pounce'); });
  await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 }); console.log(name, 'running');

  const r = await p.evaluate(() => new Promise(res => { const S = window.__game.scene.getScene('Pounce'), st = window.__pr.st; const ou = S.sys.sceneUpdate; const ts = [];
    S.sys.sceneUpdate = (t, d) => { const a = performance.now(); ou.call(S, t, d); ts.push(performance.now() - a); st.x = Math.min(st.x, 300); st.hold = true; st.sus = Math.min(st.sus ?? 0, 50); st.noise = Math.min(st.noise, 40); };
    setTimeout(() => { S.sys.sceneUpdate = ou; if (!ts.length) return res({ frames: 0 }); ts.sort((a, b) => a - b); res({ frames: ts.length, avg: +(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(3), p95: +ts[Math.floor(ts.length * 0.95)].toFixed(3) }); }, 5000); }));
  console.log(name, 'scene update+draw ms', JSON.stringify(r)); await b.close();
}
