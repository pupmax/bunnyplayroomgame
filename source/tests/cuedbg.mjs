import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto('http://localhost:4199/'); await p.evaluate(() => localStorage.setItem('playroom.tut.rubybag', '1')); await p.reload();
await p.waitForFunction(() => window.__game && window.__artReady, null, { timeout: 120000 });
const r = await p.evaluate(() => new Promise(res => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start('Boxing');
  setTimeout(() => { const S = G.scene.getScene('Boxing'), out = []; let started = false;
    const f = () => { const st = S.st; if (!st.running) return; if (!started && st.state === 'guard' && st.dizzy <= 0) { started = true; window.__pr.swingBack(1); }
      if (started) { out.push([st.state, +S.stT.toFixed(2), window.__pr.dodgeCue() ? 'G' : '-'].join(' ')); if (out.length > 40 || (out.length > 3 && st.state !== 'windup' && st.state !== 'punch')) { S.events.off('update', f); res(out); } } };
    S.events.on('update', f); }, 1500); }));
console.log(r.join(' | ')); await b.close();
