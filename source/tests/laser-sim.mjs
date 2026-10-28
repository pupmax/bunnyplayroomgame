// LASER LURE headless logic sim (mirrors Pounce.ts chase/boop/sniff/lost/tea/roomba/chain) for fast tuning.
// The real-touch browser bot (laser-realtouch.mjs) is the ground truth; this just finds the neighbourhood fast.
// usage: node tests/laser-sim.mjs [games=400] [JSON K overrides]
const N = +(process.argv[2] || 400), OV = JSON.parse(process.argv[3] || '{}');
const K = { NEED: 7, TIME: 30, STRIKES: 3, V: [280, 400, 545], ACC: [1500, 1550, 1500], ARRIVE: 4.0, RUN_AT: 0.9, ZOOM_AT: 2.2, HEAT_MAX: 3.4, HEAT_DECAY: 1.4,
  LOSE_D: [540, 520, 500, 480, 470, 460, 460], LOSE_T: 0.45, MIN_TIER: 1, GAIN: 1.25, SNIFF_FROM: 2, SNIFF_EVERY: [3.0, 4.6], SNIFF_T: [2.4, 1.9], WIGGLE: 140,
  ROOMBA_AT: 4, TEA_FROM: 4, TEA_SEC: 3, ROOMBA_W: 0.42, CHAIN_T: 5.5, ...OV };
const X0 = 70, X1 = 650, Y0 = 868, Y1 = 1205, CSS = 390 / 720;
const P = {
  pro:       { react: 0.14, speed: 2600, noise: 14, lead: [230, 300], over: 0.02, wig: 0.25, missSniff: 0.0,  tea: 0.95, distract: 0.0,  zone: 150, runup: 260, read: 0.25 },
  realistic: { react: 0.30, speed: 1400, noise: 38, lead: [260, 400], over: 0.14, wig: 0.8, missSniff: 0.15, tea: 0.55, distract: 0.06, zone: 110, runup: 200, read: 0.7 },
  sloppy:    { react: 0.42, speed: 1100, noise: 55, lead: [280, 470], over: 0.22, wig: 1.1,  missSniff: 0.3,  tea: 0.3,  distract: 0.10, zone: 95,  runup: 170, read: 1.0 },
};
const R = (a, b) => a + Math.random() * (b - a), F = r => R(r[0], r[1]), gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const BASE = { door: [612, 905, 72, 52], frame: [330, 892, 86, 42], bubble: [196, 985, 104, 44], rug: [392, 1068, 118, 46], basket: [140, 1150, 78, 46], piano: [578, 1152, 84, 44], tea: [540, 992, 70, 40], carrier: [360, 1172, 92, 44] };
const KINDS = ['basket', 'door', 'rug', 'piano', 'bubble', 'frame'];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function game(prof) {
  const B = P[prof], T = {}; for (const k in BASE) { const [x, y, rx, ry] = BASE[k]; T[k] = { k, x, y, rx, ry }; }
  const s = { time: K.TIME, c: 0, str: 0, px: 500, py: 950, vx: 0, vy: 0, dx: 430, dy: 975, heat: 0, far: 0, kind: '', chainI: -1, chainT: 0, chain: [], sniffIn: 0, sniffT: 0, wig: 0, ph: 'chase', bumpCd: 0, played: [], teas: 0, roomba: false, ra: 0, pause: 0, boops: 0, lost: 0 };
  const first = Math.random() < 0.5 ? 'rug' : 'bubble', rest = shuffle(KINDS.filter(k => k !== first && k !== 'basket')), plan = [first, rest[0], rest[1], rest[2], 'basket', rest[3]];
  const tier = h => h >= K.ZOOM_AT ? 2 : h >= K.RUN_AT ? 1 : 0, act = () => s.chainI >= 0 ? s.chain[s.chainI] : s.kind, teaOn = () => s.c >= K.TEA_FROM;
  const light = () => { s.kind = ''; s.chainI = -1; if (s.c >= K.NEED - 1) { const pool = shuffle(['bubble', 'rug', 'piano', 'basket'].filter(k => k !== s.played.at(-1))); s.chain = [pool[0], pool[1], 'carrier']; s.chainI = 0; s.chainT = 0; s.roomba = false; }
    else { s.kind = plan[s.c]; s.roomba = s.c === K.ROOMBA_AT && s.kind === 'basket'; if (s.roomba) s.ra = Math.PI * 0.9; } if (!s.roomba) { T.basket.x = 140; T.basket.y = 1150; } s.sniffIn = F(K.SNIFF_EVERY); };
  light();
  // bot state
  const hist = []; let gt = 0, finger = { x: 0, y: 0, down: false }, cool = 0, distract = 0, wigT = 0, wigDir = 1, miss = false, lead = F(B.lead), aim = { x: 0, y: 0 }, lastPh = 'chase', runup = { on: false, pt: null };
  const dt = 1 / 60;
  const setDot = (x, y) => { const nx = cl(x, X0 - 20, X1 + 20), ny = cl(y, Y0 - 30, Y1 + 10); const d = Math.hypot(nx - s.dx, ny - s.dy); s.dx = nx; s.dy = ny; if (s.ph === 'sniff') s.wig += d; };
  const hit = t => { const ex = (s.px - t.x) / t.rx, ey = (s.py - t.y) / t.ry; return ex * ex + ey * ey <= 1; };
  for (let it = 0; it < 60 * 400; it++) {
    gt += dt;
    if (s.pause > 0) { s.pause -= dt; if (s.pause <= 0 && s.after) { const f = s.after; s.after = null; f(); } }
    // ---------------- bot
    hist.push({ t: gt, ph: s.ph, px: s.px, py: s.py, tier: tier(s.heat), c: s.c, tr: act() ? { ...T[act()] } : null }); while (hist.length > 2 && hist[1].t <= gt - B.react) hist.shift();
    const seen = hist[0];
    if (s.ph !== lastPh) { if (s.ph === 'sniff') { wigT = B.wig * R(0.7, 1.4); miss = Math.random() < B.missSniff; } if (s.ph === 'chase') { lead = F(B.lead); cool = Math.max(cool, B.read); } lastPh = s.ph; }
    if (Math.random() < B.distract * dt) distract = R(0.4, 1.1);
    let want = null;
    if (distract > 0) distract -= dt; else if (cool > 0) cool -= dt; else {
      if (s.ph === 'sniff') { wigT -= dt; if (wigT <= 0 && !miss && (gt * 12 | 0) % 2 === 0) { wigDir *= -1; want = { x: s.dx + wigDir * 70, y: s.dy }; } }
      else if (seen.ph === 'chase' && seen.tr) {
        let tx = seen.tr.x, ty = seen.tr.y; const pu = { x: seen.px, y: seen.py }, tea = T.tea;
        if (teaOn() && Math.random() < B.tea) { const vx = tx - pu.x, vy = ty - pu.y, L = Math.hypot(vx, vy) || 1, ux = vx / L, uy = vy / L;
          const k = cl((tea.x - pu.x) * ux + (tea.y - pu.y) * uy, 0, L), cx = pu.x + ux * k, cy = pu.y + uy * k, d = Math.hypot(tea.x - cx, (tea.y - cy) * 1.6);
          if (d < 150 && k > 40 && k < L - 40) { const side = ((tea.x - pu.x) * uy - (tea.y - pu.y) * ux) > 0 ? 1 : -1; tx = tea.x - uy * side * 190; ty = tea.y + ux * side * 120; } }
        const L0 = Math.hypot(tx - pu.x, ty - pu.y);
        if (seen.c >= 1 && seen.tier < K.MIN_TIER) { if (L0 < B.runup || runup.on) { runup.on = true;
            if (!runup.pt || Math.hypot(runup.pt.x - pu.x, runup.pt.y - pu.y) < 90) {
              const C = [[110, 900], [360, 900], [610, 920], [620, 1060], [600, 1190], [360, 1195], [110, 1190], [100, 1040]].map(([x, y]) => ({ x, y, d: Math.hypot(x - seen.tr.x, y - seen.tr.y) + R(0, 120) }))
                .filter(c => Math.hypot(c.x - pu.x, c.y - pu.y) > 160 && !(teaOn() && Math.hypot(c.x - tea.x, c.y - tea.y) < 120)).sort((a, b) => b.d - a.d);
              runup.pt = C[0] ?? { x: 360, y: 1040 }; }
            tx = runup.pt.x; ty = runup.pt.y; } } else { runup.on = false; runup.pt = null; }
        const vx = tx - pu.x, vy = ty - pu.y, L = Math.hypot(vx, vy) || 1;
        let ld = Math.min(L + 60, lead); if (Math.random() < B.over * dt) ld = lead * 1.9;
        aim.x += (gauss() * B.noise - aim.x) * Math.min(1, dt * 3); aim.y += (gauss() * B.noise - aim.y) * Math.min(1, dt * 3);
        want = { x: pu.x + vx / L * ld + aim.x, y: pu.y + vy / L * ld + aim.y };
      }
    }
    if (want) { want.x = cl(want.x, 75, 645); want.y = cl(want.y, 860, 1205);
      // finger in css px; a re-grip costs 80-220 ms
      const fx = (want.x - s.dx) / K.GAIN * CSS, fy = (want.y - s.dy) / K.GAIN * CSS, dl = Math.hypot(fx, fy), mx = B.speed * dt, f = dl > mx ? mx / dl : 1;
      finger.x += fx * f; finger.y += fy * f; if (Math.hypot(finger.x, finger.y) > B.zone * 1.6) { finger.x = finger.y = 0; cool = R(0.08, 0.22); }
      else if (s.ph === 'chase' || s.ph === 'sniff') setDot(s.dx + fx * f / CSS * K.GAIN, s.dy + fy * f / CSS * K.GAIN); }
    // ---------------- game
    if (s.pause > 0) continue;
    if (s.ph === 'chase' || s.ph === 'sniff') { s.time -= dt; if (s.time <= 0) return { win: false, ...s }; }
    if (s.roomba) { s.ra += dt * K.ROOMBA_W; T.basket.x = 380 + Math.cos(s.ra) * 210; T.basket.y = 1060 + Math.sin(s.ra) * 100; }
    if (s.chainI > 0 && s.ph === 'chase') { s.chainT -= dt; if (s.chainT <= 0) { s.chainI = 0; s.chainT = 0; } }
    if (s.ph === 'sniff') { s.sniffT -= dt; if (s.wig >= K.WIGGLE) { s.ph = 'chase'; s.sniffIn = F(K.SNIFF_EVERY); } else if (s.sniffT <= 0) lost(); continue; }
    if (s.ph !== 'chase') continue;
    const ddx = s.dx - s.px, ddy = s.dy - s.py, dist = Math.hypot(ddx, ddy), tr = tier(s.heat), V = K.V[tr], A = K.ACC[tr] * (tr === 2 && s.c >= K.SNIFF_FROM ? 0.8 : 1);
    const wv = dist < 22 ? 0 : Math.min(V, dist * K.ARRIVE), ux = dist > 0 ? ddx / dist : 0, uy = dist > 0 ? ddy / dist : 0;
    let ax = ux * wv - s.vx, ay = uy * wv - s.vy; const al = Math.hypot(ax, ay), lim = A * dt; if (al > lim) { ax *= lim / al; ay *= lim / al; }
    s.vx += ax; s.vy += ay; s.px += s.vx * dt; s.py += s.vy * dt;
    if (s.px < X0 || s.px > X1) { s.px = cl(s.px, X0, X1); s.vx *= -0.2; } if (s.py < Y0 || s.py > Y1) { s.py = cl(s.py, Y0, Y1); s.vy *= -0.2; }
    const sp = Math.hypot(s.vx, s.vy);
    if (sp > V * 0.55 && dist > 30) s.heat = Math.min(K.HEAT_MAX, s.heat + dt); else if (sp < 120) s.heat = Math.max(0, s.heat - K.HEAT_DECAY * dt);
    const lose = K.LOSE_D[Math.min(s.c, K.LOSE_D.length - 1)];
    if (dist > lose) s.far += dt; else s.far = Math.max(0, s.far - dt * 2);
    if (s.far >= K.LOSE_T) { lost(); continue; }
    if (s.c >= K.SNIFF_FROM && s.chainI < 0) { s.sniffIn -= dt; const t = T[act()]; if (s.sniffIn <= 0 && Math.hypot(s.px - t.x, s.py - t.y) > 200) { s.ph = 'sniff'; s.sniffT = F(K.SNIFF_T); s.wig = 0; s.vx = s.vy = 0; continue; } }
    s.bumpCd = Math.max(0, s.bumpCd - dt);
    const a = T[act()];
    if (hit(a)) {
      if (tr < K.MIN_TIER && s.c >= 1) { if (s.bumpCd <= 0) { s.bumpCd = 0.7; s.boops++; const an = Math.atan2(s.py - a.y, s.px - a.x); s.vx = Math.cos(an) * 260; s.vy = Math.sin(an) * 160; s.heat = 0; } }
      else if (s.chainI >= 0 && a.k !== 'carrier') { s.played.push(a.k); s.chainI++; s.chainT = K.CHAIN_T; s.vx *= -0.35; s.vy *= -0.35; s.heat = Math.max(s.heat, K.RUN_AT); }
      else { s.played.push(a.k); s.c = a.k === 'carrier' ? K.NEED : s.c + 1; if (s.c >= K.NEED) return { win: true, ...s };
        s.ph = 'gag'; s.vx = s.vy = 0; s.pause = 2.4; s.after = () => { s.heat = 0; s.ph = 'chase'; light(); const t = T[act()], an = Math.atan2(t.y - s.py, t.x - s.px); s.dx = s.px + Math.cos(an) * 110; s.dy = s.py + Math.sin(an) * 110; }; }
      continue;
    }
    if (teaOn() && hit(T.tea)) { s.teas++; s.time = Math.max(0.5, s.time - K.TEA_SEC); s.vx = s.vy = 0; s.heat = 0; s.ph = 'gag'; s.pause = 1.5; s.after = () => { s.ph = 'chase'; s.px = cl(s.px + (s.px < T.tea.x ? -90 : 90), X0, X1); s.dx = s.px + (s.px < T.tea.x ? -120 : 120); s.dy = s.py + 40; }; }
  }
  return { win: false, ...s };
  function lost() { s.ph = 'lost'; s.str++; s.lost++; s.heat = 0; s.vx = s.vy = 0; s.far = 0; if (s.chainI > 0) { s.chainI = 0; s.chainT = 0; }
    if (s.str >= K.STRIKES) { s.ph = 'end'; s.dead = true; s.pause = 0; return; }
    s.pause = 2.0; s.after = () => { s.px = 216; s.py = 886; s.dx = s.px + 130; s.dy = s.py + 60; s.ph = 'chase'; s.sniffIn = F(K.SNIFF_EVERY); }; }
}
for (const prof of ['sloppy', 'realistic', 'pro']) {
  let w = 0, c = 0, str = 0, boops = 0, teas = 0, left = 0, dead = 0; const why = {};
  for (let i = 0; i < N; i++) { const r = game(prof); if (r.dead) { r.win = false; } w += r.win; c += r.c; str += r.str; boops += r.boops; teas += r.teas; if (r.win) left += r.time; dead += !!r.dead; }
  console.log(`${prof.padEnd(9)} win ${(100 * w / N).toFixed(0)}%  catches ${(c / N).toFixed(1)}  strikes ${(str / N).toFixed(2)}  struckOut ${(100 * dead / N).toFixed(0)}%  boops ${(boops / N).toFixed(1)}  teas ${(teas / N).toFixed(2)}  winTimeLeft ${(left / Math.max(1, w)).toFixed(1)}s`);
}
