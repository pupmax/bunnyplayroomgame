// Loop guard: an exception thrown inside a frame (tween callback / scene update) must not stop the game loop.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const url of [process.env.RUBY || 'http://localhost:4200/', process.env.MAIN || 'http://localhost:4199/']) {
  const p = await (await b.newContext({ viewport: { width: 440, height: 956 } })).newPage();
  await p.goto(url); await p.waitForFunction(() => window.__game?.scene.getScenes(true).some(s => /Title/.test(s.sys.settings.key)), null, { timeout: 120000 });
  const r = await p.evaluate(() => new Promise(res => {
    const g = window.__game, sc = g.scene.getScenes(true)[0];
    sc.tweens.add({ targets: {}, x: 1, duration: 50, onComplete: () => { throw new Error('boom in tween callback'); } });
    let n = 0; sc.events.on('update', () => { if (++n === 5) throw new Error('boom in update'); });
    const f0 = g.loop.frame; setTimeout(() => res({ advanced: g.loop.frame - f0, lastErr: window.__lastErr?.slice(0, 60), errs: window.__errs.length, guarded: !!g.loop.__guarded }), 2500);
  }));
  console.log(url, JSON.stringify(r), r.advanced > 10 && r.errs >= 2 ? 'PASS loop survives frame exceptions' : 'FAIL');
}
await b.close();
