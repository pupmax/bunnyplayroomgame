// Painted-style full-screen backgrounds (720x1280 SVG), rasterised at boot.
import { radial, linear } from './svg';
import { hallLair } from './hallLair';
const W = 720, H = 1280;
const blur = (id: string, s: number) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`;
const vignette = (id = 'vg') => radial(id, [[0, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']], 0.5, 0.5, 0.75);
function rnd(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function crowd(y0: number, rows: number, seed: number, cols: string[], scale = 1): string {
  const r = rnd(seed); let o = '';
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * 46 * scale, sz = (18 + row * 4) * scale;
    for (let x = -10; x < W + 20; x += sz * 2.1) {
      const c = cols[Math.floor(r() * cols.length)], dx = x + r() * 10, ear = r();
      o += `<g fill="${c}"><circle cx="${dx}" cy="${y}" r="${sz}"/><rect x="${dx - sz * 1.1}" y="${y + sz * 0.6}" width="${sz * 2.2}" height="${sz * 2}" rx="${sz * 0.8}"/>`;
      if (ear < 0.33) o += `<ellipse cx="${dx - sz * 0.5}" cy="${y - sz * 1.2}" rx="${sz * 0.25}" ry="${sz * 0.7}"/><ellipse cx="${dx + sz * 0.5}" cy="${y - sz * 1.2}" rx="${sz * 0.25}" ry="${sz * 0.7}"/>`;
      else if (ear < 0.66) o += `<circle cx="${dx - sz * 0.75}" cy="${y - sz * 0.75}" r="${sz * 0.38}"/><circle cx="${dx + sz * 0.75}" cy="${y - sz * 0.75}" r="${sz * 0.38}"/>`;
      o += `</g>`;
      if (r() < 0.08) o += `<circle cx="${dx + sz}" cy="${y - sz}" r="${3 * scale}" fill="#fff"/><circle cx="${dx + sz}" cy="${y - sz}" r="${12 * scale}" fill="#fff" opacity="0.25"/>`;
    }
  }
  return o;
}
export const BACKGROUNDS: Record<string, () => { body: string; defs: string }> = {
  arena: () => {
    const defs = linear('aSky', [[0, '#0d0618'], [0.45, '#2a1140'], [0.62, '#4a1d5e']]) + linear('beam', [[0, 'rgba(255,248,220,0.55)'], [1, 'rgba(255,248,220,0)']])
      + linear('canvas', [[0, '#5aa2ff'], [0.4, '#3a86ff'], [1, '#1f4fb8']]) + linear('apron', [[0, '#e0243a'], [1, '#8a0f20']]) + linear('post', [[0, '#9aa3b5'], [0.4, '#ffffff'], [1, '#7a8396']], 0, 0, 1, 0)
      + radial('spot', [[0, 'rgba(255,255,240,0.55)'], [1, 'rgba(255,255,240,0)']], 0.5, 0.5, 0.5) + vignette() + blur('bl', 18) + blur('bl2', 6);
    const ropes = [560, 625, 690].map((y, i) => { const c = ['#ff3b6b', '#ffffff', '#3a86ff'][i];
      return `<path d="M30 ${y} Q360 ${y + 18} 690 ${y}" stroke="#22111a" stroke-width="16" fill="none"/><path d="M30 ${y} Q360 ${y + 18} 690 ${y}" stroke="${c}" stroke-width="11" fill="none"/><path d="M30 ${y - 3} Q360 ${y + 15} 690 ${y - 3}" stroke="#fff" stroke-opacity="0.5" stroke-width="3" fill="none"/>`; }).join('');
    const body = `<rect width="${W}" height="${H}" fill="url(#aSky)"/>`
      + `<g opacity="0.9">${crowd(330, 4, 7, ['#1a0d26', '#22122f', '#2b1838'], 1)}</g>`
      + `<rect y="470" width="${W}" height="60" fill="#120818" opacity="0.6"/>`
      + `<g filter="url(#bl)"><polygon points="150,0 250,0 420,820 40,820" fill="url(#beam)"/><polygon points="470,0 570,0 690,820 300,820" fill="url(#beam)" opacity="0.8"/></g>`
      + `<ellipse cx="360" cy="430" rx="420" ry="80" fill="#c8a0ff" opacity="0.12" filter="url(#bl)"/>`
      + `<polygon points="-40,760 760,760 800,1280 -80,1280" fill="url(#canvas)"/>`
      + `<g stroke="#ffffff" stroke-opacity="0.08" stroke-width="3">${Array.from({ length: 12 }, (_, i) => `<line x1="${-40 + i * 72}" y1="760" x2="${-80 + i * 80}" y2="1280"/>`).join('')}</g>`
      + `<ellipse cx="360" cy="980" rx="300" ry="140" fill="url(#spot)"/>`
      + `<rect x="-10" y="740" width="740" height="34" fill="url(#apron)"/><text x="360" y="767" text-anchor="middle" font-family="Arial Black" font-size="26" fill="#ffdf6b" letter-spacing="8">BUNNY PLAYROOM ARENA</text>`
      + `<rect x="18" y="500" width="30" height="270" rx="8" fill="url(#post)" stroke="#22111a" stroke-width="5"/><rect x="672" y="500" width="30" height="270" rx="8" fill="url(#post)" stroke="#22111a" stroke-width="5"/>`
      + `<rect x="14" y="500" width="38" height="26" rx="6" fill="#e0243a" stroke="#22111a" stroke-width="4"/><rect x="668" y="500" width="38" height="26" rx="6" fill="#3a86ff" stroke="#22111a" stroke-width="4"/>`
      + ropes
      + `<g filter="url(#bl2)" opacity="0.5"><circle cx="200" cy="40" r="40" fill="#fff8d0"/><circle cx="520" cy="40" r="40" fill="#fff8d0"/></g><circle cx="200" cy="40" r="18" fill="#fff"/><circle cx="520" cy="40" r="18" fill="#fff"/>`
      + `<rect width="${W}" height="${H}" fill="url(#vg)"/>`;
    return { body, defs };
  },
  pitch: () => {
    const defs = linear('pSky', [[0, '#4fb3ff'], [0.7, '#bfe9ff'], [1, '#e9f8ff']]) + linear('grassA', [[0, '#5fcf5a'], [1, '#2f8f3a']]) + linear('grassB', [[0, '#6edb66'], [1, '#3a9f45']])
      + linear('stand', [[0, '#2b3a66'], [1, '#18223f']]) + linear('ad', [[0, '#ff5c8a'], [1, '#c2304a']]) + radial('sunG', [[0, 'rgba(255,255,230,0.9)'], [1, 'rgba(255,255,230,0)']]) + vignette() + blur('pbl', 10);
    const stripes = Array.from({ length: 9 }, (_, i) => { const y0 = 330 + i * 110, y1 = y0 + 110; const inset0 = 120 - i * 14, inset1 = 120 - (i + 1) * 14;
      return `<polygon points="${-inset0},${y0} ${W + inset0},${y0} ${W + inset1},${y1} ${-inset1},${y1}" fill="url(#${i % 2 ? 'grassA' : 'grassB'})"/>`; }).join('');
    const clouds = [[120, 80, 1], [480, 120, 0.8], [640, 60, 0.6]].map(([x, y, s]) => `<g fill="#fff" opacity="0.9" transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="70" ry="28"/><ellipse cx="-40" cy="8" rx="44" ry="22"/><ellipse cx="44" cy="8" rx="50" ry="22"/><ellipse cx="10" cy="-18" rx="40" ry="26"/></g>`).join('');
    const body = `<rect width="${W}" height="${H}" fill="url(#pSky)"/><circle cx="600" cy="70" r="120" fill="url(#sunG)"/>` + clouds
      + `<polygon points="0,170 720,170 720,300 0,300" fill="url(#stand)"/>` + `<g opacity="0.95">${crowd(190, 3, 3, ['#ff8a1f', '#ffdf6b', '#ff5c8a', '#3a86ff', '#ffffff', '#8a3ffc'], 0.7)}</g>`
      + [40, 680].map(x => `<rect x="${x - 6}" y="20" width="12" height="160" fill="#6b7591"/><rect x="${x - 40}" y="10" width="80" height="34" rx="6" fill="#dfe6f2" stroke="#22252b" stroke-width="4"/><g filter="url(#pbl)"><circle cx="${x}" cy="27" r="40" fill="#fffbe0" opacity="0.8"/></g>`).join('')
      + `<rect x="0" y="292" width="${W}" height="44" fill="url(#ad)"/><text x="360" y="323" text-anchor="middle" font-family="Arial Black" font-size="24" fill="#fff" letter-spacing="6">BUNNY PLAYROOM • BALL BONK • BUNNY PLAYROOM</text>`
      + stripes + `<rect y="330" width="${W}" height="30" fill="#000" opacity="0.12"/>`
      + `<g stroke="#ffffff" stroke-opacity="0.85" stroke-width="6" fill="none"><polygon points="40,350 680,350 740,1180 -20,1180"/><ellipse cx="360" cy="1160" rx="120" ry="40"/></g>`
      + `<rect width="${W}" height="${H}" fill="url(#vg)" opacity="0.7"/>`;
    return { body, defs };
  },
  hall: hallLair, // Bunny's cute gothic boudoir lair (src/art/hallLair.ts)
  meadow: () => {
    const R = rnd(11);
    const defs = linear('mSky', [[0, '#7fd3ff'], [0.55, '#c8f0ff'], [1, '#fff4c8']]) + linear('mGr', [[0, '#8ee05a'], [1, '#3f9f2e']]) + linear('mHill', [[0, '#a8e86a'], [1, '#5ab83a']]) + vignette();
    let fl = ''; for (let i = 0; i < 60; i++) { const x = R() * W, y = 560 + R() * 700; const c = ['#ff7aa0', '#fff', '#ffdf4a', '#b98aff'][i % 4]; fl += `<g><circle cx="${x}" cy="${y}" r="${5 + R() * 4}" fill="${c}" stroke="#2a2120" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2.5" fill="#ffb21f"/></g>`; }
    let gr = ''; for (let i = 0; i < 90; i++) { const x = R() * W, y = 560 + R() * 720; gr += `<path d="M${x} ${y} q3 -14 8 -18 M${x + 4} ${y} q0 -12 -6 -16" stroke="#3a8a2a" stroke-width="3" fill="none" opacity="0.6"/>`; }
    const cloud = (x: number, y: number, s: number) => `<g transform="translate(${x},${y}) scale(${s})" fill="#fff"><circle cx="0" cy="0" r="40"/><circle cx="45" cy="-15" r="50"/><circle cx="95" cy="0" r="38"/><rect x="0" y="0" width="95" height="38"/></g>`;
    const body = `<rect width="${W}" height="${H}" fill="url(#mSky)"/>` + cloud(60, 180, 0.9) + cloud(480, 120, 1.1) + cloud(300, 300, 0.6)
      + `<path d="M0 520 Q180 420 380 500 Q560 420 720 500 V620 H0Z" fill="url(#mHill)"/><path d="M0 580 Q360 520 720 580 V${H} H0Z" fill="url(#mGr)" stroke="#2f7f22" stroke-width="4"/>`
      + `<g transform="translate(610,470)"><rect x="-10" y="-20" width="20" height="80" fill="#8a5a2a" stroke="#2a2120" stroke-width="4"/><circle cx="0" cy="-50" r="56" fill="#4fbf3a" stroke="#2a2120" stroke-width="5"/><circle cx="-18" cy="-66" r="12" fill="#ff5c5c"/><circle cx="20" cy="-40" r="10" fill="#ff5c5c"/></g>`
      + gr + fl + `<rect width="${W}" height="${H}" fill="url(#vg)" opacity="0.6"/>`;
    return { body, defs };
  },
  forest: () => {
    const R = rnd(23);
    const defs = linear('fSky', [[0, '#9fe0ff'], [1, '#e8fbff']]) + linear('fGr', [[0, '#7ad64a'], [1, '#3a8f2a']]) + linear('bark', [[0, '#6a3e1c'], [0.5, '#9a6232'], [1, '#5a3214']], 0, 0, 1, 0) + vignette();
    let bush = ''; for (let i = 0; i < 14; i++) { const x = i * 60 - 20 + R() * 20; bush += `<circle cx="${x}" cy="${640 + R() * 20}" r="${50 + R() * 20}" fill="${i % 2 ? '#3f9f2e' : '#5ab83a'}" stroke="#2a5a1a" stroke-width="4"/>`; }
    let gr = ''; for (let i = 0; i < 70; i++) { const x = R() * W, y = 700 + R() * 580; gr += `<path d="M${x} ${y} q3 -14 8 -18 M${x + 4} ${y} q0 -12 -6 -16" stroke="#2f7f22" stroke-width="3" fill="none" opacity="0.6"/>`; }
    const body = `<rect width="${W}" height="${H}" fill="url(#fSky)"/>`
      + [[120, 0.5], [600, 0.4]].map(([x, o]) => `<g opacity="${o}"><rect x="${x - 20}" y="200" width="40" height="460" fill="#6a8a5a"/><circle cx="${x}" cy="220" r="120" fill="#7ab86a"/></g>`).join('')
      + bush + `<rect y="660" width="${W}" height="${H - 660}" fill="url(#fGr)"/><rect y="660" width="${W}" height="10" fill="#2a5a1a" opacity="0.4"/>` + gr
      + `<rect x="-40" y="0" width="150" height="${H}" fill="url(#bark)" stroke="#2a1408" stroke-width="6"/><path d="M20 300 q20 40 0 80 M60 700 q-14 40 0 90" stroke="#3a1e08" stroke-width="5" fill="none"/>`
      + `<circle cx="80" cy="60" r="220" fill="#3f9f2e" stroke="#2a5a1a" stroke-width="6"/><circle cx="330" cy="0" r="170" fill="#4fbf3a" stroke="#2a5a1a" stroke-width="6"/><circle cx="560" cy="-30" r="150" fill="#3f9f2e" stroke="#2a5a1a" stroke-width="6"/>`
      + `<path d="M60 300 Q300 270 560 300 L560 330 Q300 306 60 334Z" fill="url(#bark)" stroke="#2a1408" stroke-width="6"/><circle cx="520" cy="290" r="40" fill="#5ab83a" stroke="#2a5a1a" stroke-width="5"/>`
      + `<rect width="${W}" height="${H}" fill="url(#vg)" opacity="0.5"/>`;
    return { body, defs };
  },
  night: () => {
    const R = rnd(31); const defs = linear('nSky', [[0, '#0b0a24'], [0.6, '#1f1a4a'], [1, '#3a2a6a']]) + radial('moonG', [[0, 'rgba(255,245,190,0.6)'], [1, 'rgba(255,245,190,0)']]) + vignette();
    let st = ''; for (let i = 0; i < 90; i++) st += `<circle cx="${R() * W}" cy="${R() * 900}" r="${0.8 + R() * 2.4}" fill="#fff" opacity="${0.4 + R() * 0.6}"/>`;
    let far = '<path d="M0 1000 '; for (let x = 0; x <= W; x += 60) far += `L${x} ${880 - (R() * 120)} L${x + 60} ${880 - (R() * 120)} `; far += `L${W} ${H} L0 ${H}Z" fill="#241f4a"/>`;
    const body = `<rect width="${W}" height="${H}" fill="url(#nSky)"/>` + st + `<circle cx="540" cy="260" r="260" fill="url(#moonG)"/><circle cx="540" cy="260" r="110" fill="#fff4c0" stroke="#e8d890" stroke-width="6"/><circle cx="505" cy="230" r="18" fill="#e8d890" opacity="0.6"/><circle cx="570" cy="300" r="12" fill="#e8d890" opacity="0.6"/>` + far + `<rect width="${W}" height="${H}" fill="url(#vg)" opacity="0.5"/>`;
    return { body, defs };
  },
  room: () => {
    const defs = linear('rWall', [[0, '#2a1a3e'], [1, '#4a2e5e']]) + linear('rFloor', [[0, '#a8683a'], [1, '#6a3e1e']]) + radial('rLamp', [[0, 'rgba(255,220,150,0.5)'], [1, 'rgba(255,200,120,0)']]) + vignette();
    let boards = ''; for (let y = 760; y < H; y += 48) boards += `<rect y="${y}" width="${W}" height="4" fill="#4a2810" opacity="0.6"/>`; for (let i = 0; i < 18; i++) boards += `<rect x="${(i * 173) % W}" y="${760 + (i % 11) * 48}" width="4" height="48" fill="#4a2810" opacity="0.5"/>`;
    const body = `<rect width="${W}" height="${H}" fill="url(#rWall)"/>`
      + `<pattern id="wp" width="80" height="80" patternUnits="userSpaceOnUse"><circle cx="40" cy="40" r="6" fill="#fff" opacity="0.05"/><path d="M0 0 L80 80" stroke="#fff" stroke-opacity="0.03" stroke-width="6"/></pattern><rect width="${W}" height="760" fill="url(#wp)"/>`
      + `<rect x="80" y="330" width="200" height="260" rx="10" fill="#1a1030" stroke="#0d0618" stroke-width="8"/><rect x="92" y="342" width="176" height="236" fill="#2a3a7a"/><circle cx="210" cy="400" r="30" fill="#fff4c0"/><path d="M180 342 V578 M92 460 H268" stroke="#0d0618" stroke-width="8"/>`
      + `<rect x="430" y="420" width="180" height="20" rx="6" fill="#6a3e1e" stroke="#2a1408" stroke-width="5"/><rect x="460" y="360" width="40" height="60" rx="6" fill="#ff7aa0" stroke="#2a1408" stroke-width="4"/><rect x="520" y="340" width="30" height="80" rx="4" fill="#5ac8ff" stroke="#2a1408" stroke-width="4"/>`
      + `<circle cx="640" cy="200" r="200" fill="url(#rLamp)"/><path d="M640 0 V140" stroke="#111" stroke-width="5"/><path d="M600 180 L620 140 H660 L680 180Z" fill="#ffcf6b" stroke="#2a1408" stroke-width="5"/>`
      + `<rect y="740" width="${W}" height="${H - 740}" fill="url(#rFloor)"/><rect y="740" width="${W}" height="24" fill="#3a1e0a"/>` + boards + `<rect width="${W}" height="${H}" fill="url(#vg)"/>`;
    return { body, defs };
  },
  alley: () => {
    const defs = linear('aW', [[0, '#3a3456'], [1, '#2a2440']]) + linear('aG', [[0, '#55506a'], [1, '#3a3650']]) + vignette();
    let br = ''; for (let y = 340; y < 1000; y += 40) for (let x = (y / 40) % 2 ? -40 : 0; x < W; x += 80) br += `<rect x="${x + 3}" y="${y + 3}" width="74" height="34" rx="5" fill="#463e66" opacity="0.8"/>`;
    const body = `<rect width="${W}" height="${H}" fill="url(#aW)"/>` + br
      + `<rect y="310" width="${W}" height="40" fill="#6a6488" stroke="#1a1428" stroke-width="5"/>`
      + `<rect x="40" y="520" width="130" height="170" rx="8" fill="#ffcf6b" opacity="0.85" stroke="#1a1428" stroke-width="7"/><path d="M105 520 V690 M40 605 H170" stroke="#1a1428" stroke-width="6"/>`
      + `<rect x="560" y="560" width="110" height="140" rx="8" fill="#1a1428" stroke="#0d0a18" stroke-width="7"/>`
      + `<rect y="1000" width="${W}" height="${H - 1000}" fill="url(#aG)"/><rect y="1000" width="${W}" height="12" fill="#1a1428" opacity="0.6"/>`
      + `<g transform="translate(620,1000)"><rect x="-40" y="-110" width="80" height="110" rx="8" fill="#5a8a5a" stroke="#1a1428" stroke-width="6"/><rect x="-48" y="-124" width="96" height="20" rx="6" fill="#4a7a4a" stroke="#1a1428" stroke-width="6"/></g>`
      + `<rect width="${W}" height="${H}" fill="url(#vg)"/>`;
    return { body, defs };
  },
  dojo: () => {
    const defs = linear('dW', [[0, '#120a26'], [1, '#2a1650']]) + linear('dF', [[0, '#3a2a5e'], [1, '#1e1438']]) + radial('lan', [[0, 'rgba(255,190,120,0.55)'], [1, 'rgba(255,160,80,0)']]) + vignette();
    let tat = ''; for (let y = 640; y < H; y += 120) for (let x = 0; x < W; x += 240) tat += `<rect x="${x + ((y / 120) % 2) * 120 + 4}" y="${y + 4}" width="232" height="112" rx="6" fill="#4a3a6e" opacity="0.5" stroke="#1a0d33" stroke-width="3"/>`;
    const body = `<rect width="${W}" height="${H}" fill="url(#dW)"/>`
      + [120, 360, 600].map(x => `<rect x="${x - 90}" y="300" width="180" height="300" fill="#2a1a4a" stroke="#0d0618" stroke-width="6"/><path d="M${x} 300 V600 M${x - 90} 450 H${x + 90}" stroke="#0d0618" stroke-width="5"/><rect x="${x - 84}" y="306" width="168" height="288" fill="#c9b0ff" opacity="0.08"/>`).join('')
      + `<circle cx="600" cy="170" r="70" fill="#e8deff" opacity="0.9"/><circle cx="625" cy="150" r="64" fill="#120a26"/>`
      + `<rect y="620" width="${W}" height="${H - 620}" fill="url(#dF)"/>` + tat + `<rect y="610" width="${W}" height="16" fill="#0d0618"/>`
      + `<rect width="${W}" height="${H}" fill="url(#vg)"/>`;
    return { body, defs };
  },
  stage: () => {
    const defs = linear('sBack', [[0, '#3a1250'], [1, '#c76fb0']]) + linear('sCur', [[0, '#e0243a'], [0.5, '#b0162c'], [1, '#e0243a']], 0, 0, 1, 0) + linear('sFl', [[0, '#d98a4a'], [1, '#8a4a1a']]) + linear('beamS', [[0, 'rgba(255,248,220,0.5)'], [1, 'rgba(255,248,220,0)']]) + vignette();
    let pl = ''; for (let y = 840; y < H; y += 54) pl += `<rect y="${y}" width="${W}" height="4" fill="#5a2a0a" opacity="0.5"/>`;
    const body = `<rect width="${W}" height="${H}" fill="url(#sBack)"/>`
      + `<path d="M300 0 L420 0 L620 900 L100 900Z" fill="url(#beamS)"/>`
      + `<rect width="110" height="900" fill="url(#sCur)" stroke="#5a0a14" stroke-width="5"/><rect x="${W - 110}" width="110" height="900" fill="url(#sCur)" stroke="#5a0a14" stroke-width="5"/>`
      + `<path d="M0 0 H${W} V70 Q${W * 0.75} 120 ${W / 2} 70 Q${W * 0.25} 120 0 70Z" fill="url(#sCur)" stroke="#5a0a14" stroke-width="5"/>`
      + `<rect y="820" width="${W}" height="${H - 820}" fill="url(#sFl)"/><rect y="820" width="${W}" height="18" fill="#5a2a0a"/>` + pl
      + `<rect width="${W}" height="${H}" fill="url(#vg)" opacity="0.6"/>`;
    return { body, defs };
  },
  vignette: () => ({ defs: vignette(), body: `<rect width="${W}" height="${H}" fill="url(#vg)"/>` }),
};
export function backgroundSVG(key: string, k: number): string {
  const { body, defs } = BACKGROUNDS[key]();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * k}" height="${H * k}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
}
