// Casual phone player bot for Nana's Acorn Barrage: under-leads, 40-90px aim error, 0.6-1.3s between throws,
// usually waits out umbrella/leaf cover. Usage: node tests/qcbots/acorn-casual.mjs N  -> prints per-game result + win rate.
import { chromium } from 'playwright';
const N = +(process.argv[2] || 6), MODE = process.argv[3] || 'casual'; // casual | sloppy (no lead, 60-120px error)
const b = await chromium.launch(); const errs = [];
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:4199/', { timeout: 90000 });
await p.evaluate(() => { localStorage.setItem('playroom.tut.nana2', '1'); localStorage.setItem('playroom.beaten', '3'); });
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 60000 });
let wins = 0; const t0 = Date.now();
for (let g = 0; g < N; g++) {
  const r = await p.evaluate((MODE) => new Promise(res => {
    const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.key !== 'Acorn' && s.scene.stop()); G.scene.start('Acorn');
    setTimeout(() => {
      const S = G.scene.getScene('Acorn'), R = Math.random; let last = null, vel = { x: 0, y: 0 }, nextShot = 0, f;
      const done = (o) => { S.events.off('update', f); res(o); };
      f = () => {
        const st = S.st; if (st.over) return done({ win: st.hits >= 10 || window.__pr.ended === 'win', hits: st.hits, shots: st.shots, time: +st.time.toFixed(1) });
        if (!st.running) return; const now = S.time.now, px = S.pup.x, py = S.pup.y;
        if (last) { const dt = (now - last.t) / 1000; if (dt > 0) vel = { x: (px - last.x) / dt * 0.5 + vel.x * 0.5, y: (py - last.y) / dt * 0.5 + vel.y * 0.5 }; } last = { x: px, y: py, t: now };
        if (now < nextShot || st.cool > 0) return;
        if ((st.umbrella || st.hiding >= 0) && !st.golden && R() < 0.85) { nextShot = now + 300; return; }
        const lead = MODE === 'sloppy' ? 0 : 0.3 * R(); // casual: leads a little, inconsistently (seconds)
        const a = R() * Math.PI * 2, m = MODE === 'sloppy' ? 60 + R() * 60 : 40 + R() * 50;
        S.fling(px + vel.x * lead + Math.cos(a) * m, py + vel.y * lead - 60 + Math.sin(a) * m); nextShot = now + 600 + R() * 700;
      };
      S.events.on('update', f);
    }, 1500);
  }), MODE);
  if (r.win) wins++; console.log('game', g + 1, JSON.stringify(r), `${((Date.now() - t0) / 1000) | 0}s`);
}
console.log(`WINRATE ${MODE} ${wins}/${N}`); console.log('errors', errs.length, errs.slice(0, 2).join(' | '));
await b.close();
