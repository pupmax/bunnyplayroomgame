// 2.5D scenery for Puppy Town: sky bits, hazy hills, cute street buildings,
// hedges + fence, sidewalk, verge/road, FX textures and the 3D logo.
// All drawn in game-pixel units (1 unit = 1 game px) and rasterised at boot.
import { blobPath, radial, linear, heart, bunnycano, star } from './svg';
import { CAMEO_DEFS, miniPup, victimPoster, noGoPoster, wishlistPoster, hackingCenter, billboard, coffeeSacks, chocolatePile, cherryTruck } from './cameos';

export interface SceneArt { w: number; h: number; body: string; defs?: string; blur?: number; tile?: boolean; }

const OUT = '#4a3a33';
const TXT = `font-family="Arial Black, Arial Rounded MT Bold, Helvetica Neue, Arial, sans-serif" font-weight="900"`;

// ---------- helpers
function rng(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function tree(x: number, base: number, s: number, hue: 'a' | 'b' | 'c' = 'a'): string {
  const g = hue === 'a' ? 'treeA' : hue === 'b' ? 'treeB' : 'treeC';
  return `<g transform="translate(${x} ${base}) scale(${s})">` +
    `<path d="M-9 0 L-6 -70 Q0 -76 6 -70 L9 0 Z" fill="url(#trunk)" stroke="${OUT}" stroke-width="3"/>` +
    `<path d="M-2 -60 L-22 -84 M3 -66 L20 -90" stroke="#6b4a2f" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="${blobPath(0, -118, 62, 54, { power: 2, tufts: Array.from({ length: 14 }, (_, i) => ({ a: i * 25.7, s: 7, w: 9 })) })}" fill="url(#${g})" stroke="${OUT}" stroke-width="3"/>` +
    `<ellipse cx="-20" cy="-138" rx="22" ry="14" fill="#ffffff" opacity="0.18"/>` +
    `<circle cx="22" cy="-104" r="5" fill="#ff8fa8"/><circle cx="-26" cy="-96" r="4" fill="#fff2a8"/>` +
    `</g>`;
}
function lamp(x: number, base: number): string {
  return `<g transform="translate(${x} ${base})">` +
    `<rect x="-4" y="-150" width="8" height="150" fill="url(#metal)" stroke="${OUT}" stroke-width="2"/>` +
    `<path d="M-14 -150 L14 -150 L9 -176 L-9 -176 Z" fill="#3c4048" stroke="${OUT}" stroke-width="2.5"/>` +
    `<rect x="-8" y="-172" width="16" height="18" rx="3" fill="#fff4c2"/>` +
    `<circle cx="0" cy="-163" r="20" fill="url(#lampGlow)"/>` +
    `<path d="M-10 -176 L0 -186 L10 -176 Z" fill="#3c4048" stroke="${OUT}" stroke-width="2.5"/></g>`;
}
/** Tall post carrying a poster high enough to clear the hedges. */
function noticePost(x: number, base: number, posterSvg: string): string {
  return `<rect x="${x - 5}" y="${base - 310}" width="10" height="310" fill="url(#metal)" stroke="${OUT}" stroke-width="2"/>` + posterSvg;
}
/** Raised loading dock so small props clear the hedges. */
function dock(x: number, base: number, w: number, h: number): string {
  let st = '';
  for (let i = 0; i < w / 40; i++) st += `<path d="M${x + i * 40} ${base - 16} l20 -14" stroke="#f2c230" stroke-width="6" opacity="0.8"/>`;
  return `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="#9aa1ab" stroke="${OUT}" stroke-width="3"/>` +
    `<rect x="${x}" y="${base - h}" width="${w}" height="10" fill="#c9ced6" stroke="${OUT}" stroke-width="2"/>` +
    `<rect x="${x}" y="${base - 34}" width="${w}" height="34" fill="#2b2f36"/>` + st;
}
function bench(x: number, base: number): string {
  return `<g transform="translate(${x} ${base})">` +
    `<rect x="-46" y="-44" width="92" height="9" rx="3" fill="#b86b3a" stroke="${OUT}" stroke-width="2.5"/>` +
    `<rect x="-46" y="-30" width="92" height="9" rx="3" fill="#c97b46" stroke="${OUT}" stroke-width="2.5"/>` +
    `<rect x="-48" y="-18" width="96" height="8" rx="3" fill="#a75d30" stroke="${OUT}" stroke-width="2.5"/>` +
    `<path d="M-40 -10 V0 M40 -10 V0 M-40 -44 V-10 M40 -44 V-10" stroke="#3c4048" stroke-width="5" stroke-linecap="round"/></g>`;
}
function windowBox(x: number, y: number, w: number, h: number, frame = '#ffffff'): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#glassW)" stroke="${OUT}" stroke-width="3"/>` +
    `<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" stroke="${frame}" stroke-width="4"/>` +
    `<path d="M${x + 6} ${y + h - 8} L${x + w * 0.45} ${y + 6}" stroke="#fff" stroke-width="4" opacity="0.55" stroke-linecap="round"/>` +
    `<rect x="${x - 4}" y="${y + h}" width="${w + 8}" height="7" rx="2" fill="#fff" stroke="${OUT}" stroke-width="2"/>`;
}
function flowerBox(x: number, y: number, w: number): string {
  let f = '';
  for (let i = 0; i < w / 14; i++) f += `<circle cx="${x + 7 + i * 14}" cy="${y - 4 - (i % 2) * 4}" r="5.5" fill="${['#ff7aa2', '#ffd84d', '#ffffff', '#ff9f43'][i % 4]}" stroke="${OUT}" stroke-width="1.5"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="12" rx="3" fill="#a0613a" stroke="${OUT}" stroke-width="2.5"/>` +
    `<path d="M${x + 2} ${y} q${w / 4} -10 ${w / 2} -2 q${w / 4} -10 ${w / 2 - 4} 0" fill="#4caf50"/>` + f;
}
function door(x: number, base: number, w: number, h: number, col: string): string {
  return `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="${w / 2}" ry="${w / 2.4}" fill="${col}" stroke="${OUT}" stroke-width="3"/>` +
    `<rect x="${x + 6}" y="${base - h + 10}" width="${w - 12}" height="${h - 10}" rx="${(w - 12) / 2}" ry="${(w - 12) / 2.4}" fill="#000" opacity="0.12"/>` +
    `<circle cx="${x + w - 9}" cy="${base - h / 2}" r="3.5" fill="#ffd84d" stroke="${OUT}" stroke-width="1.5"/>`;
}
function roof(x1: number, x2: number, y: number, peak: number, fill: string): string {
  return `<path d="M${x1 - 14} ${y} L${(x1 + x2) / 2} ${peak} L${x2 + 14} ${y} Z" fill="${fill}" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M${x1 - 14} ${y} L${(x1 + x2) / 2} ${peak} L${(x1 + x2) / 2} ${peak + 16} L${x1 + 4} ${y} Z" fill="#fff" opacity="0.12"/>`;
}

const COMMON_DEFS =
  linear('trunk', [[0, '#9a6a44'], [1, '#6b4a2f']], 0, 0, 1, 0) +
  radial('treeA', [[0, '#9be07a'], [0.6, '#5fb85a'], [1, '#3d8f45']], 0.35, 0.3, 0.75) +
  radial('treeB', [[0, '#b6e98a'], [0.6, '#7cc865'], [1, '#4f9e4c']], 0.35, 0.3, 0.75) +
  radial('treeC', [[0, '#8fd6a0'], [0.6, '#4fae6c'], [1, '#2f8a52']], 0.35, 0.3, 0.75) +
  linear('metal', [[0, '#7b828c'], [0.4, '#c9ced6'], [1, '#4a4f57']], 0, 0, 1, 0) +
  radial('lampGlow', [[0, 'rgba(255,240,170,0.6)'], [1, 'rgba(255,240,170,0)']], 0.5, 0.5, 0.5) +
  linear('glassW', [[0, '#d9f1ff'], [0.5, '#8fcbeb'], [1, '#5e9fc4']]) +
  linear('wallCream', [[0, '#fff6e6'], [1, '#ecd9bd']], 0, 0, 1, 0.3) +
  linear('wallBrick', [[0, '#e3926a'], [1, '#c26d4b']], 0, 0, 1, 0.3) +
  linear('wallBlue', [[0, '#d7ecff'], [1, '#a9c9e8']], 0, 0, 1, 0.3) +
  linear('wallPink', [[0, '#ffe3ec'], [1, '#f2bccc']], 0, 0, 1, 0.3) +
  linear('wallMint', [[0, '#e3fbef'], [1, '#b6e3cc']], 0, 0, 1, 0.3);

// ---------- (b) distant hills + town silhouette (hazy)
function hills(): SceneArt {
  const W = 1440, H = 360;
  const wave = (base: number, amps: [number, number][]) => {
    let d = `M0 ${H}`;
    for (let x = 0; x <= W; x += 12) {
      let y = base;
      for (const [a, k] of amps) y -= a * Math.sin((x / W) * Math.PI * 2 * k + k);
      d += ` L${x} ${y.toFixed(1)}`;
    }
    return d + ` L${W} ${H} Z`;
  };
  let town = '';
  const r = rng(7);
  for (let i = 0; i < 16; i++) {
    const x = 30 + i * 88 + r() * 30, w = 40 + r() * 30, h = 50 + r() * 60, b = 250;
    town += `<rect x="${x}" y="${b - h}" width="${w}" height="${h}" fill="#b4c9d8"/>` +
      `<path d="M${x - 6} ${b - h} L${x + w / 2} ${b - h - 26 - r() * 12} L${x + w + 6} ${b - h} Z" fill="#a9bfd0"/>`;
    if (i % 3 === 0) town += `<rect x="${x + 8}" y="${b - h + 14}" width="8" height="10" fill="#e9f2f8"/><rect x="${x + 24}" y="${b - h + 14}" width="8" height="10" fill="#e9f2f8"/>`;
  }
  // church spire + windmill
  town += `<rect x="620" y="140" width="34" height="110" fill="#a9bfd0"/><path d="M612 140 L637 70 L662 140 Z" fill="#9fb6c8"/>` +
    `<rect x="1080" y="160" width="26" height="90" fill="#a9bfd0"/><g transform="translate(1093 160)"><path d="M0 0 L-50 -10 L-50 6 Z M0 0 L10 -50 L-6 -50 Z M0 0 L50 10 L50 -6 Z M0 0 L-10 50 L6 50 Z" fill="#b8ccdb"/></g>`;
  const body =
    `<rect width="${W}" height="${H}" fill="none"/>` + town +
    `<path d="${wave(250, [[22, 2], [10, 5]])}" fill="#b9dcc4"/>` +
    `<path d="${wave(290, [[26, 3], [8, 7]])}" fill="#a6d1b3"/>` +
    `<path d="${wave(330, [[14, 4], [6, 9]])}" fill="#96c8a5"/>` +
    // trees on far hills (dots)
    Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 37) % W}" cy="${300 - (i % 5) * 6}" r="${8 + (i % 3) * 3}" fill="#89bf98"/>`).join('');
  return { w: W, h: H, body, blur: 1.6, tile: true };
}

// ---------- (c) street buildings
function street(): SceneArt {
  const W = 2048, H = 480, B = 470; // B = ground line inside the strip
  let s = '';
  // Coffee Roastery
  {
    const x = 40, w = 300, top = B - 280;
    s += `<rect x="${x}" y="${top}" width="${w}" height="${B - top}" fill="url(#wallBrick)" stroke="${OUT}" stroke-width="3.5"/>`;
    for (let r = 0; r < 12; r++) for (let c = 0; c < 8; c++) s += `<rect x="${x + 6 + c * 37 + (r % 2) * 18}" y="${top + 8 + r * 22}" width="30" height="16" rx="3" fill="#000" opacity="0.06"/>`;
    s += `<rect x="${x - 10}" y="${top - 20}" width="${w + 20}" height="24" rx="4" fill="#5b3a29" stroke="${OUT}" stroke-width="3"/>`;
    // sign
    s += `<rect x="${x + 30}" y="${top + 16}" width="${w - 60}" height="48" rx="12" fill="url(#signWood)" stroke="${OUT}" stroke-width="3"/>` +
      `<text x="${x + w / 2 + 14}" y="${top + 49}" ${TXT} font-size="24" fill="#fff6e0" text-anchor="middle">Coffee Roastery</text>` +
      `<g transform="translate(${x + 48} ${top + 26}) scale(0.5)">${bunnycano(0, 0, 1, OUT, false)}</g>`;
    // striped awning
    const ay = top + 82, aw = w + 20;
    let stripes = '';
    for (let i = 0; i < 10; i++) stripes += `<path d="M${x - 10 + i * aw / 10} ${ay} h${aw / 10} l4 46 h${-aw / 10} Z" fill="${i % 2 ? '#fff4e6' : '#e0413c'}"/>`;
    let scallop = '';
    for (let i = 0; i < 10; i++) scallop += `<path d="M${x - 6 + i * aw / 10} ${ay + 46} a${aw / 20} 13 0 0 0 ${aw / 10} 0 Z" fill="${i % 2 ? '#fff4e6' : '#e0413c'}" stroke="${OUT}" stroke-width="2.5"/>`;
    s += stripes + `<path d="M${x - 10} ${ay} H${x + w + 10} l4 46 H${x - 6} Z" fill="none" stroke="${OUT}" stroke-width="3"/>` + scallop +
      `<path d="M${x - 6} ${ay + 46} H${x + w + 14}" stroke="#000" stroke-width="10" opacity="0.08" transform="translate(0 16)"/>`;
    // shop window with roaster + door
    s += windowBox(x + 22, top + 150, 150, 100, '#5b3a29') +
      `<circle cx="${x + 70}" cy="${top + 212}" r="22" fill="#2d2a2e" stroke="${OUT}" stroke-width="2"/><circle cx="${x + 70}" cy="${top + 212}" r="10" fill="#c2a04a"/>` +
      `<rect x="${x + 104}" y="${top + 214}" width="50" height="30" rx="6" fill="#3a2a22"/>` +
      door(x + 200, B, 64, 110, '#6b3f26') +
      `<rect x="${x + 196}" y="${B - 150}" width="72" height="30" rx="6" fill="#fff" stroke="${OUT}" stroke-width="2"/>` +
      `<text x="${x + 232}" y="${B - 129}" ${TXT} font-size="14" fill="#c0392b" text-anchor="middle">OPEN</text>`;
  }
  s += tree(420, B, 1.25, 'a') + noticePost(505, B, victimPoster(459, B - 300, -3));
  // Canky cottage
  {
    const x = 560, w = 250, top = B - 210;
    s += roof(x, x + w, top, top - 110, 'url(#roofBrown)') +
      `<rect x="${x}" y="${top}" width="${w}" height="${B - top}" fill="url(#wallCream)" stroke="${OUT}" stroke-width="3.5"/>` +
      `<circle cx="${x + w / 2}" cy="${top - 44}" r="20" fill="url(#glassW)" stroke="${OUT}" stroke-width="3"/>` +
      windowBox(x + 22, top + 40, 64, 60) + flowerBox(x + 18, top + 107, 72) +
      windowBox(x + w - 86, top + 40, 64, 60) + flowerBox(x + w - 90, top + 107, 72) +
      door(x + w / 2 - 34, B, 68, 120, '#8a5a2b') +
      `<rect x="${x + w / 2 - 50}" y="${top + 8}" width="100" height="30" rx="10" fill="url(#signWood)" stroke="${OUT}" stroke-width="2.5"/>` +
      `<text x="${x + w / 2}" y="${top + 30}" ${TXT} font-size="20" fill="#fff6e0" text-anchor="middle">Canky</text>` +
      `<rect x="${x + w - 40}" y="${top - 96}" width="22" height="50" fill="#b7684a" stroke="${OUT}" stroke-width="3"/>`;
  }
  s += bench(880, B) + tree(960, B, 0.9, 'b');
  // Bunnycano kiosk
  {
    const x = 1030, w = 190, top = B - 170;
    s += `<rect x="${x}" y="${top}" width="${w}" height="${B - top}" rx="8" fill="url(#wallMint)" stroke="${OUT}" stroke-width="3.5"/>` +
      `<rect x="${x + 16}" y="${top + 60}" width="${w - 32}" height="60" rx="6" fill="#3a2f2b" stroke="${OUT}" stroke-width="3"/>` +
      `<rect x="${x - 10}" y="${top + 118}" width="${w + 20}" height="16" rx="5" fill="#fff" stroke="${OUT}" stroke-width="3"/>`;
    let st = '';
    for (let i = 0; i < 8; i++) st += `<path d="M${x - 14 + i * (w + 28) / 8} ${top} h${(w + 28) / 8} l0 30 a${(w + 28) / 16} 10 0 0 1 ${-(w + 28) / 8} 0 Z" fill="${i % 2 ? '#fff' : '#ff8fb1'}" stroke="${OUT}" stroke-width="2"/>`;
    s += st + `<path d="M${x - 24} ${top} L${x + w / 2} ${top - 34} L${x + w + 24} ${top} Z" fill="#ff8fb1" stroke="${OUT}" stroke-width="3"/>` +
      `<g transform="translate(${x + w / 2 - 34} ${top - 150}) scale(1.7)">${bunnycano(0, 0, 1, OUT)}</g>` +
      `<rect x="${x + 10}" y="${top + 34}" width="${w - 20}" height="26" rx="8" fill="#fff" stroke="${OUT}" stroke-width="2.5"/>` +
      `<text x="${x + w / 2}" y="${top + 54}" ${TXT} font-size="18" fill="#e0413c" text-anchor="middle">Bunnycano</text>`;
  }
  s += lamp(1270, B) + tree(1335, B, 0.75, 'c');
  // blue house
  {
    const x = 1390, w = 220, top = B - 200;
    s += roof(x, x + w, top, top - 90, 'url(#roofSlate)') +
      `<rect x="${x}" y="${top}" width="${w}" height="${B - top}" fill="url(#wallBlue)" stroke="${OUT}" stroke-width="3.5"/>` +
      windowBox(x + 20, top + 30, 60, 56) + windowBox(x + w - 80, top + 30, 60, 56) +
      door(x + w / 2 - 30, B, 60, 104, '#e0413c') + flowerBox(x + 16, top + 93, 68);
  }
  s += tree(1680, B, 1.1, 'b');
  // pink house
  {
    const x = 1740, w = 210, top = B - 230;
    s += roof(x, x + w, top, top - 96, 'url(#roofBrown)') +
      `<rect x="${x}" y="${top}" width="${w}" height="${B - top}" fill="url(#wallPink)" stroke="${OUT}" stroke-width="3.5"/>` +
      windowBox(x + 22, top + 30, 56, 56) + windowBox(x + w - 78, top + 30, 56, 56) +
      windowBox(x + 22, top + 120, 56, 50) +
      door(x + w - 92, B, 62, 108, '#5b8bd6') + bench(1990, B);
  }
  const defs = COMMON_DEFS + CAMEO_DEFS +
    linear('signWood', [[0, '#a8683c'], [1, '#6e3f22']]) +
    linear('roofBrown', [[0, '#c46a4a'], [1, '#8f4430']]) +
    linear('roofSlate', [[0, '#7a8fb0'], [1, '#4d5f7f']]);
  return { w: W, h: H, body: s, defs, blur: 0.5, tile: true };
}

// ---------- (c2) second street block: clip cameos
export const STREET2 = { billboardX: 520 };
function street2(): SceneArt {
  const W = 2048, H = 480, B = 470;
  let s = hackingCenter(30, B);
  s += tree(470, B, 0.85, 'c');
  s += billboard(STREET2.billboardX, B);
  s += noticePost(830, B, victimPoster(784, B - 300, 3));
  // poster wall (tall, posters high up)
  s += `<rect x="880" y="${B - 300}" width="250" height="300" fill="url(#wallBrick)" stroke="${OUT}" stroke-width="3"/>` +
    `<rect x="872" y="${B - 310}" width="266" height="14" rx="3" fill="#8f4430" stroke="${OUT}" stroke-width="2.5"/>` +
    noGoPoster(892, B - 288) + wishlistPoster(1000, B - 290);
  // loading dock: excess chocolate + coffee sacks + roastery workers
  const D = 130;
  s += dock(1145, B, 190, D) + chocolatePile(1155, B - D);
  s += cherryTruck(1350, B);
  s += dock(1730, B, 300, D) + coffeeSacks(1736, B - D) +
    miniPup(1972, B - D, 0.55, { apron: true, sack: 'COFFEE' }) + miniPup(2012, B - D, 0.5, { apron: true, leg: 1 });
  const defs = COMMON_DEFS + CAMEO_DEFS + linear('signWood', [[0, '#a8683c'], [1, '#6e3f22']]);
  return { w: W, h: H, body: s, defs, blur: 0.5, tile: true };
}

// ---------- (d) near hedges + picket fence + flowers
function hedges(): SceneArt {
  const W = 1440, H = 230, B = 226;
  let s = '';
  // fence (period 60 divides 1440)
  s += `<rect x="0" y="${B - 120}" width="${W}" height="10" fill="#fffaf2" stroke="${OUT}" stroke-width="2"/>` +
       `<rect x="0" y="${B - 76}" width="${W}" height="10" fill="#fffaf2" stroke="${OUT}" stroke-width="2"/>`;
  for (let x = 10; x < W; x += 30) s += `<path d="M${x} ${B - 40} V${B - 140} L${x + 8} ${B - 152} L${x + 16} ${B - 140} V${B - 40} Z" fill="url(#picket)" stroke="${OUT}" stroke-width="2"/>`;
  // Secret Service Puppies peeking over the hedges with binoculars
  s += miniPup(560, B - 64, 0.72, { hat: 'deerstalker', binoculars: true }) +
       miniPup(1070, B - 70, 0.66, { hat: 'deerstalker', magnifier: true });
  const r = rng(11);
  const pieces = [[0, 260, 110], [240, 220, 96], [440, 300, 120], [720, 240, 104], [940, 260, 116], [1180, 280, 100]];
  for (const [x, w, h] of pieces) {
    const cx = x + w / 2, cy = B - h / 2;
    const tufts = Array.from({ length: 22 }, (_, i) => ({ a: 180 + i * 8.2, s: 7, w: 5 }));
    s += `<path d="${blobPath(cx, cy + 6, w / 2 + 10, h / 2 + 4, { power: 3.2, tufts })}" fill="url(#hedge)" stroke="#2e6b35" stroke-width="3"/>`;
    for (let i = 0; i < 9; i++) {
      const fx = x + 20 + r() * (w - 40), fy = B - h + 14 + r() * (h * 0.6);
      const col = ['#ff7aa2', '#ffffff', '#ffd84d', '#ff9fd0'][i % 4];
      s += `<g transform="translate(${fx.toFixed(1)} ${fy.toFixed(1)})">` +
        [0, 72, 144, 216, 288].map(a => `<circle cx="${(Math.cos(a * Math.PI / 180) * 5).toFixed(1)}" cy="${(Math.sin(a * Math.PI / 180) * 5).toFixed(1)}" r="4.2" fill="${col}"/>`).join('') +
        `<circle r="3" fill="#ffb02e"/></g>`;
    }
    // leafy texture marks
    for (let i = 0; i < 10; i++) s += `<path d="M${(x + 14 + r() * (w - 28)).toFixed(1)} ${(B - h * 0.2 - r() * h * 0.6).toFixed(1)} q6 -6 12 0" fill="none" stroke="#2f7d3a" stroke-width="2.4" opacity="0.6"/>`;
  }
  const defs = linear('picket', [[0, '#ffffff'], [1, '#e6ddd0']], 0, 0, 1, 0) +
    radial('hedge', [[0, '#8fd877'], [0.55, '#4fae4f'], [1, '#2f7d3a']], 0.35, 0.2, 0.9) + CAMEO_DEFS;
  return { w: W, h: H, body: s, defs, tile: true };
}

// ---------- verge (grass) + road in front, scrolls faster
function verge(): SceneArt {
  const W = 1440, H = 212;
  let s = `<rect x="0" y="0" width="${W}" height="56" fill="url(#grass)"/>` +
    `<rect x="0" y="56" width="${W}" height="${H - 56}" fill="url(#road)"/>` +
    `<rect x="0" y="56" width="${W}" height="6" fill="#000" opacity="0.18"/>`;
  for (let x = 0; x < W; x += 120) s += `<rect x="${x + 20}" y="128" width="70" height="10" rx="5" fill="#fff6d6" opacity="0.9"/>`;
  const r = rng(3);
  for (let i = 0; i < 120; i++) {
    const x = (r() * W).toFixed(1), y = 8 + r() * 46;
    s += `<path d="M${x} ${y.toFixed(1)} l-3 -10 M${x} ${y.toFixed(1)} l2 -12 M${x} ${y.toFixed(1)} l6 -8" stroke="${r() > 0.5 ? '#3f9a45' : '#6cc45f'}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 18; i++) s += `<circle cx="${(r() * W).toFixed(1)}" cy="${(14 + r() * 36).toFixed(1)}" r="3.5" fill="${['#ffffff', '#ffd84d', '#ff9fd0'][i % 3]}"/>`;
  for (let i = 0; i < 60; i++) s += `<circle cx="${(r() * W).toFixed(1)}" cy="${(70 + r() * 140).toFixed(1)}" r="${(1 + r() * 2).toFixed(1)}" fill="#fff" opacity="0.08"/>`;
  const defs = linear('grass', [[0, '#6cc45f'], [1, '#3f9a45']]) + linear('road', [[0, '#7b7f87'], [1, '#5a5e66']]);
  return { w: W, h: H, body: s, defs, tile: true };
}

// ---------- static sidewalk (top surface + kerb), 720 wide
function ground(): SceneArt {
  const W = 720, H = 126; // screen y 948..1074
  const s =
    `<rect x="0" y="0" width="${W}" height="12" fill="#a69c90"/>` +                        // back edging stones
    `<rect x="0" y="10" width="${W}" height="3" fill="#000" opacity="0.15"/>` +
    `<rect x="0" y="12" width="${W}" height="86" fill="url(#pave)"/>` +                     // walking surface
    `<rect x="0" y="12" width="${W}" height="18" fill="url(#aoBack)"/>` +                   // AO under hedges
    `<rect x="0" y="96" width="${W}" height="6" fill="#efe8dd"/>` +                          // kerb lip highlight
    `<rect x="0" y="102" width="${W}" height="24" fill="url(#kerb)"/>`;                      // kerb face
  const defs = linear('pave', [[0, '#cfc6ba'], [0.5, '#ddd5ca'], [1, '#e6dfd4']]) +
    linear('aoBack', [[0, 'rgba(40,30,20,0.28)'], [1, 'rgba(40,30,20,0)']]) +
    linear('kerb', [[0, '#b8afa3'], [1, '#8d857b']]);
  return { w: W, h: H, body: s, defs };
}

function cloud(seed: number): SceneArt {
  const r = rng(seed); const W = 300, H = 150;
  let s = '';
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) blobs.push([50 + i * 32 + r() * 10, 92 - Math.sin((i / 6) * Math.PI) * 34 - r() * 10, 30 + Math.sin((i / 6) * Math.PI) * 22 + r() * 8]);
  s += blobs.map(([x, y, rr]) => `<circle cx="${x}" cy="${y + 8}" r="${rr}" fill="#c9dcef"/>`).join('');
  s += blobs.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="url(#cl)"/>`).join('');
  s += `<rect x="40" y="96" width="220" height="18" rx="9" fill="#dce9f6"/>`;
  return { w: W, h: H, body: s, defs: radial('cl', [[0, '#ffffff'], [0.7, '#f7fbff'], [1, '#dbe8f5']], 0.38, 0.3, 0.75), blur: 1.2 };
}

function sun(): SceneArt {
  return { w: 320, h: 320, body:
    `<circle cx="160" cy="160" r="158" fill="url(#sg)"/>` +
    `<circle cx="160" cy="160" r="62" fill="url(#sd)"/>`,
    defs: radial('sg', [[0, 'rgba(255,246,190,0.9)'], [0.35, 'rgba(255,236,150,0.45)'], [1, 'rgba(255,236,150,0)']], 0.5, 0.5, 0.5) +
      radial('sd', [[0, '#fffdf0'], [0.7, '#fff2a8'], [1, '#ffd95a']], 0.42, 0.4, 0.62) };
}

function vignette(): SceneArt {
  return { w: 360, h: 640, body: `<rect width="360" height="640" fill="url(#vg)"/>`,
    defs: radial('vg', [[0, 'rgba(30,20,10,0)'], [0.62, 'rgba(30,20,10,0)'], [1, 'rgba(30,20,10,0.42)']], 0.5, 0.48, 0.72) };
}
function shadow(): SceneArt {
  return { w: 128, h: 48, body: `<ellipse cx="64" cy="24" rx="62" ry="22" fill="url(#sh)"/>`,
    defs: radial('sh', [[0, 'rgba(40,25,15,0.55)'], [0.6, 'rgba(40,25,15,0.3)'], [1, 'rgba(40,25,15,0)']], 0.5, 0.5, 0.5) };
}
function puff(): SceneArt {
  return { w: 64, h: 64, body: `<circle cx="32" cy="32" r="30" fill="url(#pf)"/>`,
    defs: radial('pf', [[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(245,238,228,0.7)'], [1, 'rgba(245,238,228,0)']], 0.45, 0.4, 0.55) };
}
function glow(): SceneArt {
  return { w: 128, h: 128, body: `<circle cx="64" cy="64" r="63" fill="url(#gl)"/>`,
    defs: radial('gl', [[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']], 0.5, 0.5, 0.5) };
}
function leaf(): SceneArt {
  return { w: 140, h: 90, body:
    `<path d="M10 60 Q40 0 130 20 Q100 80 10 60 Z" fill="#4f9e3f"/><path d="M14 58 Q70 34 126 22" stroke="#2f6b28" stroke-width="4" fill="none"/>`, blur: 4 };
}
function grassTuft(): SceneArt {
  let s = '';
  for (let i = 0; i < 14; i++) s += `<path d="M${30 + i * 12} 160 Q${26 + i * 12 + (i % 3) * 6} ${80 - (i % 4) * 14} ${40 + i * 12 + (i % 2 ? 18 : -12)} ${30 + (i % 5) * 10}" stroke="${i % 2 ? '#3f8f3a' : '#5bb34f'}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  return { w: 240, h: 170, body: s, blur: 5 };
}

function logo(): SceneArt {
  const W = 680, H = 340;
  const line = (txt: string, y: number, size: number, face: string, depth: number) => {
    let o = '';
    for (let i = depth; i >= 1; i--) o += `<text x="340" y="${y + i}" ${TXT} font-size="${size}" text-anchor="middle" fill="${i > depth - 2 ? '#2b1a12' : '#7a3f1c'}" stroke="#2b1a12" stroke-width="10" stroke-linejoin="round">${txt}</text>`;
    o += `<text x="340" y="${y}" ${TXT} font-size="${size}" text-anchor="middle" fill="url(#${face})" stroke="#2b1a12" stroke-width="5" stroke-linejoin="round" paint-order="stroke">${txt}</text>`;
    o += `<text x="340" y="${y}" ${TXT} font-size="${size}" text-anchor="middle" fill="url(#shine)">${txt}</text>`;
    return o;
  };
  const body =
    `<ellipse cx="340" cy="324" rx="290" ry="12" fill="#000" opacity="0.18"/>` +
    line('The Bunnycano', 100, 66, 'faceA', 12) +
    line('Delivery!', 214, 104, 'faceB', 15) +
    `<g transform="translate(150 246)"><rect x="0" y="0" width="380" height="58" rx="29" fill="url(#ribbon)" stroke="#2b1a12" stroke-width="5"/>` +
    `<text x="190" y="40" ${TXT} font-size="30" text-anchor="middle" fill="#fff">Bunny&#8217;s Puppy Games</text></g>` +
    heart(636, 56, 50, '#ff3b6b', '#2b1a12', 4) + heart(50, 190, 38, '#ff3b6b', '#2b1a12', 4) +
    star(612, 250, 20, '#ffe36b', '#2b1a12');
  const defs = linear('faceA', [[0, '#ffd08a'], [0.5, '#e6913f'], [1, '#b8611f']]) +
    linear('faceB', [[0, '#ffffff'], [0.6, '#ffe9f0'], [1, '#f5b3c6']]) +
    linear('shine', [[0, 'rgba(255,255,255,0.55)'], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]) +
    linear('ribbon', [[0, '#ff7aa2'], [1, '#e0416e']]);
  return { w: W, h: H, body, defs };
}

// ---------- the Bunny Playroom (finish). Door opening centred x=300, 300 wide x 280 high, logo centre (300, B-380).
export const PLAYROOM = { W: 600, H: 640, B: 636, doorW: 300, doorH: 280, logoY: 380, logoR: 78 };
const NEON = '#ff2a4a';
function neon(d: string, w = 6): string {
  return `<path d="${d}" fill="none" stroke="${NEON}" stroke-width="${w * 2.2}" opacity="0.55" filter="url(#neonBlur)" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${NEON}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="#ffd0d8" stroke-width="${w * 0.35}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function neonText(txt: string, x: number, y: number, size: number): string {
  return `<text x="${x}" y="${y}" ${TXT} font-size="${size}" text-anchor="middle" fill="${NEON}" filter="url(#neonBlur)" opacity="0.9">${txt}</text>` +
    `<text x="${x}" y="${y}" ${TXT} font-size="${size}" text-anchor="middle" fill="#ff5a70" stroke="#ffd0d8" stroke-width="1.2">${txt}</text>`;
}
function playroom(): SceneArt {
  const { W, H, B, doorW, doorH } = PLAYROOM;
  const top = B - 480, dx = 300 - doorW / 2;
  let s = `<rect x="20" y="${top}" width="560" height="${B - top}" fill="url(#charcoal)" stroke="#000" stroke-width="5"/>`;
  // wall panels
  for (let i = 0; i < 7; i++) s += `<path d="M${20 + i * 80} ${top + 8} V${B}" stroke="#000" stroke-width="2" opacity="0.35"/><path d="M${22 + i * 80} ${top + 8} V${B}" stroke="#fff" stroke-width="1" opacity="0.05"/>`;
  s += `<rect x="8" y="${top - 22}" width="584" height="26" fill="#121215" stroke="#000" stroke-width="4"/>`;
  // interior (visible when the door rolls up): red-lit room
  s += `<rect x="${dx}" y="${B - doorH}" width="${doorW}" height="${doorH}" fill="url(#interior)"/>` +
    `<rect x="${dx}" y="${B - 40}" width="${doorW}" height="40" fill="#3a0a12"/>` +
    `<path d="M${dx + 40} ${B - doorH + 40} h60 v90 h-60 Z M${dx + doorW - 100} ${B - doorH + 40} h60 v90 h-60 Z" fill="#ff2a4a" opacity="0.25"/>` +
    `<circle cx="${300}" cy="${B - doorH + 26}" r="10" fill="#ffd0d8"/>`;
  // door frame + neon
  s += `<rect x="${dx - 16}" y="${B - doorH - 16}" width="${doorW + 32}" height="${doorH + 16}" fill="none" stroke="#0b0b0d" stroke-width="14"/>` +
    neon(`M${dx - 26} ${B} V${B - doorH - 26} H${dx + doorW + 26} V${B}`, 6) +
    neon(`M34 ${top + 14} H566`, 5) + neon(`M34 ${top + 14} V${B - 10} M566 ${top + 14} V${B - 10}`, 4);
  // wall lamps
  for (const lx of [dx - 60, dx + doorW + 60]) s += `<circle cx="${lx}" cy="${B - 200}" r="34" fill="url(#lampRed)"/><rect x="${lx - 9}" y="${B - 214}" width="18" height="28" rx="5" fill="#2a0a10" stroke="${NEON}" stroke-width="2.5"/>`;
  // neon words either side of the logo
  s += neonText('BUNNY', 118, B - 368, 38) + neonText('PLAYROOM', 483, B - 368, 30);
  // logo backplate (logo itself is an image laid on top in-game)
  s += `<circle cx="300" cy="${B - PLAYROOM.logoY}" r="${PLAYROOM.logoR + 14}" fill="#0b0b0d" stroke="#000" stroke-width="4"/>`;
  s += `<rect x="${dx - 40}" y="${B - 6}" width="${doorW + 80}" height="10" rx="3" fill="#2a2a30" stroke="#000" stroke-width="2"/>`;
  const defs = linear('charcoal', [[0, '#34343c'], [0.5, '#232328'], [1, '#141417']], 0, 0, 1, 0.4) +
    radial('interior', [[0, '#ff5a6e'], [0.45, '#b0142c'], [1, '#3a0610']], 0.5, 0.4, 0.75) +
    radial('lampRed', [[0, 'rgba(255,60,80,0.75)'], [1, 'rgba(255,60,80,0)']], 0.5, 0.5, 0.5) +
    `<filter id="neonBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>`;
  return { w: W, h: H, body: s, defs };
}
function garageDoor(): SceneArt {
  const { doorW: w, doorH: h } = PLAYROOM;
  let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#slat)" stroke="#000" stroke-width="4"/>`;
  for (let y = 22; y < h; y += 26) s += `<path d="M2 ${y} H${w - 2}" stroke="#0e0e10" stroke-width="3"/><path d="M2 ${y + 3} H${w - 2}" stroke="#fff" stroke-width="1.5" opacity="0.08"/>`;
  s += `<rect x="0" y="${h - 22}" width="${w}" height="10" fill="#ff2a4a" opacity="0.85"/>` +
    `<rect x="${w / 2 - 30}" y="${h - 46}" width="60" height="10" rx="5" fill="#55555d" stroke="#000" stroke-width="2"/>` +
    `<path d="M10 8 L${w * 0.4} 8" stroke="#fff" stroke-width="3" opacity="0.12" stroke-linecap="round"/>`;
  return { w, h, body: s, defs: linear('slat', [[0, '#3a3a42'], [1, '#1c1c21']]) };
}
function spill(): SceneArt {
  return { w: 440, h: 150, body: `<path d="M120 0 H320 L440 150 H0 Z" fill="url(#sp)"/>`,
    defs: radial('sp', [[0, 'rgba(255,60,80,0.85)'], [0.6, 'rgba(255,40,70,0.35)'], [1, 'rgba(255,40,70,0)']], 0.5, 0.0, 0.95) };
}
// whipped-cream canister (source of the cream puddles). Logo slot at (55,128) r 30.
export const CANISTER = { W: 110, H: 250, logoX: 55, logoY: 128, logoR: 30 };
function canister(): SceneArt {
  const { W, H } = CANISTER;
  const s = `<ellipse cx="55" cy="${H - 8}" rx="54" ry="8" fill="#fffaf2" stroke="${OUT}" stroke-width="2.5"/>` +
    `<path d="M14 ${H - 10} V70 Q14 48 36 44 H74 Q96 48 96 70 V${H - 10} Z" fill="url(#steelC)" stroke="${OUT}" stroke-width="4"/>` +
    `<rect x="44" y="18" width="22" height="28" rx="4" fill="url(#steelC)" stroke="${OUT}" stroke-width="3"/>` +
    `<path d="M66 26 H90 Q100 26 100 36" fill="none" stroke="${OUT}" stroke-width="10" stroke-linecap="round"/><path d="M66 26 H90 Q100 26 100 36" fill="none" stroke="#c9ced6" stroke-width="5" stroke-linecap="round"/>` +
    `<rect x="14" y="88" width="82" height="118" fill="#e8467c" stroke="${OUT}" stroke-width="3"/>` +
    `<text x="55" y="182" ${TXT} font-size="13" fill="#fff" text-anchor="middle">WHIPPED</text>` +
    `<text x="55" y="198" ${TXT} font-size="13" fill="#fff" text-anchor="middle">CREAM</text>` +
    `<path d="M22 60 V${H - 20}" stroke="#fff" stroke-width="6" opacity="0.45" stroke-linecap="round"/>` +
    `<path d="M0 ${H - 6} Q10 ${H - 26} 30 ${H - 14} Q44 ${H - 30} 60 ${H - 14} Q80 ${H - 28} 96 ${H - 12} Q110 ${H - 14} 108 ${H - 4} Z" fill="#ffffff" stroke="${OUT}" stroke-width="2.5"/>`;
  return { w: W, h: H, body: s, defs: linear('steelC', [[0, '#8e96a1'], [0.3, '#f4f7fa'], [0.6, '#b9c1cb'], [1, '#6d7680']], 0, 0, 1, 0) };
}
function sparkle(): SceneArt {
  return { w: 64, h: 64, body: `<circle cx="32" cy="32" r="22" fill="url(#spg)"/><path d="M32 2 Q35 29 62 32 Q35 35 32 62 Q29 35 2 32 Q29 29 32 2 Z" fill="#fffbe0" stroke="#f0b400" stroke-width="2"/>`,
    defs: radial('spg', [[0, 'rgba(255,240,150,0.9)'], [1, 'rgba(255,240,150,0)']], 0.5, 0.5, 0.5) };
}
function cup(): SceneArt {
  return { w: 140, h: 170, body: `<g transform="translate(14 8) scale(2.3)">${bunnycano(0, 0, 1, OUT)}</g>` };
}
function detective(leg: 0 | 1): SceneArt {
  return { w: 150, h: 170, body: miniPup(60, 166, 1, { hat: 'deerstalker', magnifier: true, leg }), defs: CAMEO_DEFS };
}

export const SCENERY: Record<string, () => SceneArt> = {
  scn_hills: hills, scn_street: street, scn_hedges: hedges, scn_verge: verge, scn_ground: ground,
  scn_cloud1: () => cloud(5), scn_cloud2: () => cloud(21), scn_cloud3: () => cloud(77), scn_sun: sun,
  fx_vignette: vignette, fx_shadow: shadow, fx_puff: puff, fx_glow: glow, fx_leaf: leaf, fx_grass: grassTuft,
  scn_street2: street2,
  ui_logo: logo, obj_playroom: playroom, obj_garagedoor: garageDoor, fx_spill: spill, obj_canister: canister,
  ui_cup: cup, fx_sparkle: sparkle, gag_det0: () => detective(0), gag_det1: () => detective(1),
};

/** Build the SVG for a scenery asset at `res` px per game px. */
export function scenerySVG(key: string, res: number): { svg: string; w: number; h: number } {
  const a = SCENERY[key]();
  // tiling strips are drawn three times (shifted by +-W) so the edges wrap seamlessly
  let content = a.tile ? `<g transform="translate(${-a.w} 0)">${a.body}</g>${a.body}<g transform="translate(${a.w} 0)">${a.body}</g>` : a.body;
  const filt = a.blur ? `<filter id="bl" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${a.blur}"/></filter>` : '';
  if (a.blur) content = `<g filter="url(#bl)">${content}</g>`;
  const body = content;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(a.w * res)}" height="${Math.round(a.h * res)}" viewBox="0 0 ${a.w} ${a.h}">` +
    `<defs>${a.defs ?? ''}${filt}</defs>${body}</svg>`;
  return { svg, w: a.w, h: a.h };
}
