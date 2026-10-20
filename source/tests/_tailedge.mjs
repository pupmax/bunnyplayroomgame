// edge check: force a tug with Puppy hugging each wall, screenshot, verify Bunny on-screen
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:4213/'); await p.evaluate(() => localStorage.setItem('playroom-tail.tut.tail1', '1'));
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 });
for (const [px, face, n] of [[630, -1, 'R'], [90, 1, 'L']]) {
  await p.evaluate(() => { const G = window.__game; G.scene.stop('SoloTitle'); G.scene.start('Tail'); });
  await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 });
  await p.evaluate(([px, face]) => { const S = window.__game.scene.getScene('Tail'), st = S.st; st.px = px; st.py = 1000; st.face = face; S.pup.flip(face < 0); st.pup = 'pause'; S.pt = 0; S.pDur = 99; st.glow = true; st.bx = px - face * 140; st.by = 1000; st.tx = st.bx; st.ty = 1000; S.startTug(); }, [px, face]);
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(90); console.log(n, JSON.stringify(await p.evaluate(() => { const S = window.__game.scene.getScene('Tail'), st = S.st; return { bx: Math.round(st.bx), px: Math.round(st.px), bunRoot: Math.round(S.bun.root.x), bunSx: S.bun.root.scaleX, pupRoot: Math.round(S.pup.root.x), tip: Math.round(S.pup.tipPos().x), face: st.face }; }))); }
  const r = await p.evaluate(() => { const st = window.__pr.st; return { bx: Math.round(st.bx), px: Math.round(st.px), ph: st.phase }; }); console.log(n, JSON.stringify(r));
  await p.screenshot({ path: `/tmp/edge_${n}.png` });
}
console.log('errs', errs.length); await b.close();
