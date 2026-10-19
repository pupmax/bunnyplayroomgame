// Sushi pieces, hazards and sushi-bar scenery. Same thick-outline + radial shading style as game 1.
import { INK as OUT, svgDoc, radial, linear, star } from './svg';

export interface Def { w: number; h: number; body: string; defs?: string; }
const SH = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="0.18"/>`;
const shine = (cx: number, cy: number, rx: number, ry: number, rot = -25) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="0.7" transform="rotate(${rot} ${cx} ${cy})"/>`;
const RICE = radial('rice', [[0, '#ffffff'], [0.7, '#f1ede4'], [1, '#d9d2c3']]);
const rice = (y = 70) => `<rect x="14" y="${y - 22}" width="92" height="44" rx="22" fill="url(#rice)" stroke="${OUT}" stroke-width="5"/>` +
  [24, 40, 58, 76, 92].map((x, i) => `<ellipse cx="${x}" cy="${y + (i % 2 ? 6 : 12)}" rx="4" ry="2.4" fill="#e3dccd"/>`).join('');
function nigiri(id: string, c0: string, c1: string, c2: string, stripes: string): Def {
  return { w: 120, h: 110, defs: RICE + radial(id, [[0, c0], [0.6, c1], [1, c2]]),
    body: SH(60, 98, 46, 8) + rice(74) +
      `<path d="M8 52 Q14 22 60 22 Q108 22 112 52 Q110 64 60 62 Q10 64 8 52 Z" fill="url(#${id})" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>` +
      stripes + shine(40, 34, 16, 5) };
}
export const SUSHI: Record<string, () => Def> = {
  salmon: () => nigiri('sal', '#ffb08a', '#ff8a5c', '#e2603a',
    [36, 56, 76].map(x => `<path d="M${x} 26 Q${x + 8} 42 ${x + 2} 60" stroke="#fff" stroke-width="4" fill="none" opacity="0.65" stroke-linecap="round"/>`).join('')),
  tuna: () => nigiri('tun', '#ff6d7a', '#e0313f', '#a8182a', ''),
  ebi: () => nigiri('ebi', '#ffd2b8', '#ff9e7a', '#f06a45',
    [32, 52, 72, 90].map(x => `<path d="M${x} 26 L${x} 60" stroke="#ff5a33" stroke-width="7" opacity="0.8"/>`).join('') +
    `<path d="M106 40 l14 -14 l2 22 Z" fill="#ff5a33" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>`),
  tamago: () => ({ w: 120, h: 110, defs: RICE + radial('tam', [[0, '#fff3a6'], [0.6, '#ffd94a'], [1, '#e8a91c']]),
    body: SH(60, 98, 46, 8) + rice(74) + `<rect x="10" y="24" width="100" height="40" rx="12" fill="url(#tam)" stroke="${OUT}" stroke-width="5"/>` +
      `<rect x="50" y="22" width="20" height="64" rx="4" fill="#1d3a2a" stroke="${OUT}" stroke-width="4"/>` + shine(32, 34, 14, 5) }),
  maki: () => ({ w: 110, h: 110, defs: RICE + radial('nori', [[0, '#3c6b4f'], [1, '#12261b']]),
    body: SH(55, 100, 40, 8) + `<circle cx="55" cy="55" r="44" fill="url(#nori)" stroke="${OUT}" stroke-width="5"/>` +
      `<circle cx="55" cy="55" r="33" fill="url(#rice)"/>` +
      `<circle cx="48" cy="50" r="10" fill="#ff8a5c" stroke="#c24a2a" stroke-width="2"/><rect x="56" y="54" width="14" height="10" rx="3" fill="#6fcf6a"/><rect x="50" y="62" width="10" height="9" rx="3" fill="#ffd94a"/>` +
      shine(36, 28, 12, 5) }),
  golden: () => ({ w: 120, h: 120, defs: radial('gold', [[0, '#fff7c2'], [0.5, '#ffd23a'], [1, '#c98a00']]) + radial('gin', [[0, '#fff'], [1, '#ffe27a']]),
    body: `<circle cx="60" cy="60" r="56" fill="#ffe680" opacity="0.35"/>` + `<circle cx="60" cy="60" r="44" fill="url(#gold)" stroke="${OUT}" stroke-width="5"/>` +
      `<circle cx="60" cy="60" r="30" fill="url(#gin)"/>` + star(60, 60, 18, '#ffb300', OUT, 3) + shine(42, 34, 13, 5) +
      `<path d="M14 18 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 l8 -4 Z" fill="#fff"/><path d="M104 92 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 l6 -3 Z" fill="#fff"/>` }),
  wasabi: () => ({ w: 120, h: 130, defs: radial('was', [[0, '#c8ff8a'], [0.55, '#7ccf3a'], [1, '#3f8a1a']]),
    body: SH(60, 120, 40, 7) +
      `<path d="M60 22 C92 22 106 52 104 76 C102 104 82 116 60 116 C38 116 18 104 16 76 C14 52 28 22 60 22 Z" fill="url(#was)" stroke="${OUT}" stroke-width="5"/>` +
      `<path d="M60 22 Q64 8 76 6" stroke="${OUT}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
      `<circle cx="78" cy="6" r="6" fill="#ffb300"/><circle cx="78" cy="6" r="3" fill="#fff36a"/>` +
      // angry face
      `<path d="M36 62 l16 8 M84 62 l-16 8" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="46" cy="76" r="5" fill="${OUT}"/><circle cx="74" cy="76" r="5" fill="${OUT}"/>` +
      `<path d="M48 96 Q60 88 72 96" stroke="${OUT}" stroke-width="4.5" fill="none" stroke-linecap="round"/>` + shine(40, 44, 12, 6) }),
  rotten: () => ({ w: 140, h: 100, defs: radial('rot', [[0, '#c9d39a'], [0.6, '#8f9a5c'], [1, '#5c6436']]),
    body: SH(70, 92, 52, 7) +
      `<path d="M14 50 Q40 18 86 26 Q104 30 114 44 L134 24 L130 52 L136 80 L114 62 Q100 78 76 80 Q30 82 14 50 Z" fill="url(#rot)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="M30 42 l10 10 M40 42 l-10 10" stroke="${OUT}" stroke-width="4.5" stroke-linecap="round"/>` +
      `<path d="M50 64 Q60 58 70 66" stroke="${OUT}" stroke-width="3.5" fill="none"/><path d="M64 38 v28 M80 36 v32 M96 40 v24" stroke="#5c6436" stroke-width="3"/>` +
      `<circle cx="60" cy="58" r="5" fill="#b5a35a"/><circle cx="88" cy="50" r="6" fill="#a39050"/>` +
      `<path d="M40 16 q6 -8 0 -14 M62 12 q6 -8 0 -12 M84 16 q6 -8 0 -14" stroke="#9fd13a" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85"/>` }),
  chefhat: () => ({ w: 130, h: 110, defs: radial('hat', [[0, '#ffffff'], [0.7, '#f1f1f4'], [1, '#c9cbd4']]),
    body: `<path d="M26 74 C4 70 4 34 30 34 C30 10 62 2 72 20 C84 4 118 12 110 40 C130 46 124 76 104 74 Z" fill="url(#hat)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>` +
      `<rect x="26" y="70" width="80" height="30" rx="8" fill="url(#hat)" stroke="${OUT}" stroke-width="5"/>` +
      `<path d="M48 76 v18 M66 76 v18 M84 76 v18" stroke="#d6d8e0" stroke-width="4"/>` + shine(44, 34, 12, 6) }),
  flame: () => ({ w: 80, h: 80, defs: radial('fl', [[0, '#fffbd0'], [0.4, '#ffd23a'], [0.75, '#ff7a1a'], [1, 'rgba(230,40,10,0)']]),
    body: `<circle cx="40" cy="40" r="40" fill="url(#fl)"/>` }),
  particle: () => ({ w: 24, h: 24, body: `<circle cx="12" cy="12" r="10" fill="#fff"/>` }),
  shadow: () => ({ w: 100, h: 30, defs: radial('sh', [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']], 0.5, 0.5, 0.5), body: `<ellipse cx="50" cy="15" rx="50" ry="15" fill="url(#sh)"/>` }),
  paw: () => ({ w: 70, h: 140, defs: radial('pfur', [[0, '#e0954f'], [0.6, '#c27230'], [1, '#8a4a1c']]),
    body: `<rect x="17" y="8" width="36" height="104" rx="18" fill="url(#pfur)" stroke="${OUT}" stroke-width="6"/>` +
      `<ellipse cx="35" cy="112" rx="24" ry="22" fill="url(#pfur)" stroke="${OUT}" stroke-width="6"/>` +
      `<ellipse cx="35" cy="118" rx="10" ry="7" fill="#f5b3a0"/><circle cx="24" cy="104" r="4" fill="#f5b3a0"/><circle cx="35" cy="100" r="4" fill="#f5b3a0"/><circle cx="46" cy="104" r="4" fill="#f5b3a0"/>` +
      shine(28, 40, 5, 18, 0) }),
  katana: () => ({ w: 60, h: 300, defs: linear('blade', [[0, '#ffffff'], [0.45, '#dfe8f2'], [0.55, '#9fb0c4'], [1, '#eef4fb']], 0, 0, 1, 0),
    body: `<path d="M24 210 L24 30 Q26 6 44 2 Q36 18 36 30 L36 210 Z" fill="url(#blade)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="M30 200 L30 40" stroke="#fff" stroke-width="3" opacity="0.9"/>` +
      `<ellipse cx="30" cy="214" rx="24" ry="9" fill="#ffd23a" stroke="${OUT}" stroke-width="5"/>` +
      `<rect x="21" y="220" width="18" height="70" rx="7" fill="#d6304a" stroke="${OUT}" stroke-width="5"/>` +
      [234, 252, 270].map(y => `<path d="M22 ${y} l16 10 M38 ${y} l-16 10" stroke="#22252b" stroke-width="3"/>`).join('') +
      `<circle cx="30" cy="292" r="6" fill="#ffd23a" stroke="${OUT}" stroke-width="4"/>` }),
  hand: () => ({ w: 110, h: 130,
    body: `<path d="M38 12 Q38 2 48 2 Q58 2 58 12 L58 56 Q64 48 72 52 Q80 46 88 52 Q98 50 100 62 L100 96 Q100 126 66 126 Q34 126 26 100 L12 72 Q8 62 18 60 Q26 58 32 68 L38 78 Z" fill="#ffffff" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
      `<path d="M58 56 L58 80 M72 54 L72 80 M86 54 L86 80" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>` +
      `<rect x="34" y="104" width="62" height="20" rx="8" fill="#ff5c8a" stroke="${OUT}" stroke-width="5"/>` }),
  // ---- rig parts ------------------------------------------------------
  pupUpper: () => ({ w: 40, h: 64, defs: radial('pu', [[0, '#e0954f'], [0.6, '#c27230'], [1, '#8a4a1c']]),
    body: `<rect x="5" y="4" width="30" height="56" rx="15" fill="url(#pu)" stroke="${OUT}" stroke-width="5"/>` + shine(15, 22, 4, 12, 0) }),
  pupFore: () => ({ w: 48, h: 76, defs: radial('pf', [[0, '#e8a060'], [0.6, '#c27230'], [1, '#8a4a1c']]),
    body: `<rect x="10" y="4" width="28" height="46" rx="14" fill="url(#pf)" stroke="${OUT}" stroke-width="5"/>` +
      `<ellipse cx="24" cy="54" rx="20" ry="18" fill="url(#pf)" stroke="${OUT}" stroke-width="5"/>` +
      `<ellipse cx="24" cy="60" rx="8" ry="6" fill="#f5b3a0"/><circle cx="15" cy="50" r="3.4" fill="#f5b3a0"/><circle cx="24" cy="47" r="3.4" fill="#f5b3a0"/><circle cx="33" cy="50" r="3.4" fill="#f5b3a0"/>` }),
  bunUpper: () => ({ w: 44, h: 52, defs: radial('lth', [[0, '#4a4452'], [0.4, '#1a171e'], [1, '#040305']], 0.32, 0.25, 0.85),
    body: `<rect x="5" y="4" width="34" height="44" rx="17" fill="url(#lth)" stroke="#2a2120" stroke-width="5"/><path d="M14 12 L14 36" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/>` }),
  bunFore: () => ({ w: 44, h: 66, defs: radial('lth2', [[0, '#4a4452'], [0.4, '#1a171e'], [1, '#040305']], 0.32, 0.25, 0.85) + radial('crm', [[0, '#fffaf6'], [1, '#d8c7bc']], 0.35, 0.3, 0.85),
    body: `<rect x="6" y="4" width="32" height="38" rx="16" fill="url(#lth2)" stroke="#2a2120" stroke-width="5"/><path d="M14 10 L14 30" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.5"/>` +
      `<ellipse cx="22" cy="48" rx="14" ry="13" fill="url(#crm)" stroke="#2a2120" stroke-width="4.5"/>` }),
  bunLeg: () => ({ w: 40, h: 46, defs: radial('lth3', [[0, '#3a3540'], [0.5, '#141217'], [1, '#040305']], 0.35, 0.3, 0.85),
    body: `<path d="M6 2 L6 28 Q6 42 20 42 Q34 42 34 28 L34 2 Z" fill="url(#lth3)" stroke="#2a2120" stroke-width="5" stroke-linejoin="round"/><path d="M12 24 v10" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.5"/>` }),
  dust: () => ({ w: 60, h: 60, defs: radial('du', [[0, 'rgba(255,240,220,0.95)'], [0.6, 'rgba(230,205,175,0.7)'], [1, 'rgba(230,205,175,0)']]), body: `<circle cx="30" cy="30" r="30" fill="url(#du)"/>` }),
  // ---- sushi bar background 720x1280 ------------------------------------
  bar: () => {
    let b = `<rect width="720" height="1280" fill="url(#wall)"/>`;
    // wood slats
    for (let x = 0; x < 720; x += 60) b += `<rect x="${x}" y="0" width="6" height="900" fill="#000" opacity="0.08"/>`;
    // window with night city glow
    b += `<rect x="70" y="250" width="240" height="250" rx="16" fill="url(#night)" stroke="#2a1410" stroke-width="10"/>` +
      `<path d="M190 250 v250 M70 375 h240" stroke="#2a1410" stroke-width="8"/>` +
      [[100, 300], [140, 330], [230, 290], [270, 420], [120, 440]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#ffe38a" opacity="0.8"/>`).join('');
    // menu board
    b += `<rect x="400" y="250" width="270" height="250" rx="14" fill="#2b1a14" stroke="#7a4a2a" stroke-width="8"/>` +
      `<text x="535" y="300" text-anchor="middle" font-family="Arial Black, Arial" font-size="30" fill="#ffd9a0">MENU</text>` +
      ['SALMON .... 2', 'TUNA ...... 2', 'EBI ....... 3', 'TAMAGO .... 1', 'BUNNYCANO . 5'].map((t, i) => `<text x="425" y="${345 + i * 32}" font-family="Courier New, monospace" font-weight="bold" font-size="20" fill="#f4ead8">${t}</text>`).join('');
    // lanterns
    for (const x of [130, 360, 590]) b += `<line x1="${x}" y1="0" x2="${x}" y2="60" stroke="#2a1410" stroke-width="4"/>` +
      `<ellipse cx="${x}" cy="110" rx="70" ry="60" fill="#ff2a4a" opacity="0.25"/>` +
      `<rect x="${x - 40}" y="56" width="80" height="12" rx="4" fill="#2a1410"/><ellipse cx="${x}" cy="110" rx="44" ry="50" fill="url(#lan)" stroke="${OUT}" stroke-width="5"/>` +
      `<path d="M${x - 40} 96 h80 M${x - 42} 124 h84" stroke="#a5122a" stroke-width="3"/><rect x="${x - 40}" y="152" width="80" height="12" rx="4" fill="#2a1410"/>`;
    // noren curtain
    b += `<rect x="0" y="180" width="720" height="16" fill="#2a1410"/>`;
    for (let i = 0; i < 6; i++) b += `<path d="M${i * 120 + 4} 190 h112 v40 q-56 12 -112 0 Z" fill="#283a7a" stroke="${OUT}" stroke-width="4"/>`;
    // back shelf w/ sake & cup
    b += `<rect x="0" y="560" width="720" height="18" fill="#5a3320"/>` +
      [60, 110, 600, 650].map(x => `<rect x="${x}" y="500" width="34" height="60" rx="10" fill="#e8e2d0" stroke="${OUT}" stroke-width="4"/>`).join('');
    // big counter
    b += `<rect x="0" y="960" width="720" height="40" fill="url(#top)" stroke="${OUT}" stroke-width="5"/>` +
      `<rect x="0" y="998" width="720" height="282" fill="url(#front)"/>` +
      `<rect x="0" y="998" width="720" height="16" fill="#000" opacity="0.25"/>` +
      `<path d="M0 968 h720" stroke="#fff" stroke-width="4" opacity="0.35"/>`;
    return { w: 720, h: 1280, body: b, defs: linear('wall', [[0, '#5a2e22'], [1, '#8a4d34']]) +
      linear('night', [[0, '#14204a'], [1, '#3a3f7a']]) + radial('lan', [[0, '#ffb0a0'], [0.6, '#ff3b4f'], [1, '#a5122a']]) +
      linear('top', [[0, '#f0c78f'], [1, '#c99456']]) + linear('front', [[0, '#7a4423'], [1, '#3c1f10']]) };
  },
  // a counter-top plate in front of bunny
  plate: () => ({ w: 200, h: 60, defs: radial('pl', [[0, '#ffffff'], [1, '#c9d0da']]),
    body: SH(100, 46, 90, 10) + `<ellipse cx="100" cy="30" rx="92" ry="22" fill="url(#pl)" stroke="${OUT}" stroke-width="5"/><ellipse cx="100" cy="28" rx="60" ry="12" fill="#e6ebf2"/>` }),
};
export function sushiSVG(key: string, k: number): string {
  const d = SUSHI[key]();
  return svgDoc(d.w, d.h, d.w * k, d.h * k, d.body, d.defs ?? '');
}
