// Monte-Carlo of the Punching-Bag rules in Boxing.ts (same constants) + reasonable-player bots.
// Pendulum x=sin(phase); punch lands while |x|<GREEN (PERFECT <PERF). At a swing extreme the bag may come AT Ruby
// (wind-up, shrinking ring) -> dodge the safe way; dodge = bag OPEN (free hits), miss = bonk (HP loss + dizzy).
const R = Math.random, g = () => Math.sqrt(-2 * Math.log(R() || 1e-9)) * Math.cos(2 * Math.PI * R());
export const C = { TIME: 60, PUP_HP: 1525, RUBY_HP: 100, GREEN: 0.26, PERF: 0.08, HIT: 9, PERF_BONUS: 6, COMBO_MAX: 4,
  PERIOD: [1.7, 1.45, 1.2], ATK_P: [0.3, 0.42, 0.55], WIND: [1.0, 0.8, 0.65], OPEN_T: 1.3, BONK: 20, DIZZY: 1.2, COOL_HIT: 0.22, COOL_MISS: 0.45, COUNTER: 12, PTS: 0.2 };
function game(c, P) {
  let t = 0, ph = 0, hp = c.PUP_HP, rh = c.RUBY_HP, combo = 0, dizzy = 0, cool = 0, lastExt = 0, meter = 0;
  const dt = 1 / 60; let exts = 0, lastAtk = 0; let mode = 'swing', mT = 0, side = 1, react = 0, choice = 0, punchedThisPass = false, planT = -1;
  while (t < c.TIME) { t += dt; const rd = t < 20 ? 0 : t < 40 ? 1 : 2; dizzy -= dt; cool -= dt;
    const hit = (perf, ctr) => { combo++; let d = c.HIT + Math.min(combo, c.COMBO_MAX) * 2 + (perf ? c.PERF_BONUS : 0) + (ctr ? c.COUNTER : 0); hp -= d; meter += perf ? 15 : 8; cool = c.COOL_HIT;
      if (meter >= 100) { meter = 0; hp -= 24; } };
    if (hp <= 0) return true;
    if (mode === 'swing') { const w = 2 * Math.PI / c.PERIOD[rd]; ph += w * dt; const x = Math.sin(ph);
      if (Math.abs(x) > 0.97 && t - lastExt > 0.3) { lastExt = t; punchedThisPass = false;
        exts++; if ((R() < c.ATK_P[rd] || exts - lastAtk >= 4 || (lastAtk === 0 && exts >= 2)) && dizzy <= 0) { lastAtk = exts; mode = 'wind'; mT = c.WIND[rd]; side = Math.sign(x); react = Math.max(0.12, P.rt + g() * P.rtJ); choice = R() < P.wrong ? side : -side; continue; } }
      // bot aims a punch at the predicted centre crossing (with timing noise)
      if (Math.abs(x) > 0.6) planT = -1;
      if (planT < 0 && Math.abs(x) < 0.6 && !punchedThisPass && !(P.skip && (punchedThisPass = R() < P.skip))) { const tc = ((Math.round(ph / Math.PI) * Math.PI) - ph) / w; planT = t + Math.max(0, tc) + g() * P.tim; }
      if (planT > 0 && t >= planT) { planT = -1; punchedThisPass = true; if (dizzy <= 0 && cool <= 0) { const xx = Math.abs(Math.sin(ph)); if (xx < c.GREEN) hit(xx < c.PERF); else { combo = 0; cool = c.COOL_MISS; } } }
    } else if (mode === 'wind') { mT -= dt; react -= dt;
      if (mT <= 0) { const ok = react <= 0 && choice === -side && dizzy <= 0;
        if (ok) { mode = 'open'; mT = c.OPEN_T; if (P.counter && R() < P.counter) hit(false, true); }
        else { rh -= c.BONK; combo = 0; dizzy = c.DIZZY; mode = 'swing'; if (rh <= 0) return false; } } }
    else { mT -= dt; if (dizzy <= 0 && cool <= 0 && R() < dt / P.mash) hit(false); if (mT <= 0) { mode = 'swing'; ph = 0; } }
  }
  LEFT.push(hp / c.PUP_HP); return hp / c.PUP_HP <= c.PTS && hp / c.PUP_HP < rh / c.RUBY_HP; // points: only when the bag is nearly KO
}
let LEFT = [];
// QC-calibrated bots (report6): human leaves ~45-62% of 1525 HP, slow ~47-66% (700 ms reactions, skips half the passes)
const BOTS = { human: { rt: 0.5, rtJ: 0.15, wrong: 0.12, tim: 0.1, mash: 0.5, counter: 0.05, skip: 0.35 }, slow: { rt: 0.7, rtJ: 0.18, wrong: 0.15, tim: 0.12, mash: 0.65, counter: 0, skip: 0.5 } };
if (true) { const N = +process.argv[2] || 4000, c = { ...C, ...JSON.parse(process.argv[3] || '{}') };
  for (const [k, P] of Object.entries(BOTS)) { LEFT = []; let w = 0; for (let i = 0; i < N; i++) w += game(c, P) ? 1 : 0; LEFT.sort((a,b)=>a-b); console.log(k.padEnd(7), (100 * w / N).toFixed(1) + '%', 'median HP left', (100*LEFT[LEFT.length>>1]).toFixed(0)+'%'); LEFT = []; } }
