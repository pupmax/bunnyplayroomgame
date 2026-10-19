import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://localhost:4199/'); await p.evaluate(() => { for (const n of ['playroom', 'playroom-ruby']) localStorage.setItem(n + '.tut.rubybag', '1'); }); await p.reload();
await p.waitForFunction(() => window.__game && window.__artReady, null, { timeout: 120000 });
const r = await p.evaluate(() => new Promise(res => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start('Boxing');
  setTimeout(() => { const S = G.scene.getScene('Boxing'); let phase = 0, hp0 = 0, early = null; const out = [];
    const f = () => { const st = S.st; if (!st.running) return;
      if (phase === 0 && st.state === 'guard' && st.dizzy <= 0) { hp0 = st.rubyHp; window.__pr.swingBack(1); phase = 1; }
      else if (phase === 1 && st.state === 'windup' && S.stT < S.windT - 0.05) { S.dodge(-st.side); early = { dcd: +S.dcd.toFixed(2), dodge: +st.dodge.toFixed(2) }; phase = 2; }
      else if (phase === 2 && window.__pr.dodgeCue()) { S.dodge(-st.side); phase = 3; }
      else if (phase === 3 && st.state !== 'windup' && st.state !== 'punch') { S.events.off('update', f); res({ early, hit: st.rubyHp < hp0, state: st.state }); } };
    S.events.on('update', f); }, 1500); }));
console.log(JSON.stringify(r), 'errors', errs.length); await b.close();
