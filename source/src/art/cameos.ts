// Clip cameo props for the background: mini Puppies (Secret Service, roastery
// workers, hackers), posters, billboard, cherry truck, coffee sacks, chocolate pile,
// hacking command centre. All functions return SVG fragments in game-px units.
import { blobPath, radial, linear, heart, bunnycano } from './svg';

const OUT = '#4a3a33';
const INK = '#3b1f10';
export const CTXT = `font-family="Arial Black, Arial Rounded MT Bold, Helvetica Neue, Arial, sans-serif" font-weight="900"`;

export const CAMEO_DEFS =
  radial('mpFur', [[0, '#e7a058'], [0.55, '#c97830'], [1, '#9a521c']], 0.38, 0.3, 0.8) +
  radial('mpEar', [[0, '#b46a2e'], [1, '#7c3f16']], 0.35, 0.25, 0.85) +
  linear('tweed', [[0, '#a98a62'], [1, '#7a5f3e']]) +
  linear('burlap', [[0, '#d9b98a'], [1, '#b8915c']]) +
  linear('choc', [[0, '#7a4a2a'], [1, '#4a2a16']]) +
  linear('paper', [[0, '#fffdf6'], [1, '#efe6d2']]) +
  linear('darkWall', [[0, '#3a4560'], [1, '#232a3c']], 0, 0, 1, 0.3) +
  linear('screen', [[0, '#7ff0ff'], [1, '#2a9fc4']]) +
  linear('crate', [[0, '#d39a5c'], [1, '#9a6834']]) +
  linear('truckRed', [[0, '#ff6a5a'], [1, '#c8352a']]) +
  radial('cherryG', [[0, '#ff8a8a'], [0.5, '#d91f37'], [1, '#8f0c1f']], 0.35, 0.3, 0.8) +
  linear('steel', [[0, '#8e96a1'], [0.35, '#eef2f6'], [0.6, '#b9c1cb'], [1, '#6d7680']], 0, 0, 1, 0);

export interface PupOpts {
  hat?: 'deerstalker' | 'none';
  binoculars?: boolean;
  magnifier?: boolean;
  apron?: boolean;
  headset?: boolean;
  sack?: string;          // carry a coffee sack with this label
  leg?: 0 | 1;            // walk frame
  headOnly?: boolean;
}

/** Mini Puppy, feet at (0,0), ~118 units tall before scale. */
export function miniPup(x: number, y: number, s: number, o: PupOpts = {}): string {
  let g = '';
  const legA = o.leg === 1 ? -6 : 4, legB = o.leg === 1 ? 4 : -6;
  if (!o.headOnly) {
    g += `<rect x="${-20 + legA}" y="-24" width="15" height="24" rx="7" fill="url(#mpFur)" stroke="${INK}" stroke-width="3"/>` +
      `<rect x="${5 + legB}" y="-24" width="15" height="24" rx="7" fill="url(#mpFur)" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="0" cy="-42" rx="27" ry="25" fill="url(#mpFur)" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M24 -44 q14 -6 14 -20" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M24 -44 q14 -6 14 -20" fill="none" stroke="#c97830" stroke-width="3.5" stroke-linecap="round"/>`;
    if (o.apron) g += `<path d="M-17 -56 H17 L20 -22 Q0 -16 -20 -22 Z" fill="#fffaf0" stroke="${INK}" stroke-width="2.5"/><circle cx="0" cy="-40" r="5" fill="#6b3f26"/>`;
  }
  // head
  const hy = o.headOnly ? -34 : -82;
  g += `<ellipse cx="-31" cy="${hy + 4}" rx="11" ry="20" fill="url(#mpEar)" stroke="${INK}" stroke-width="3" transform="rotate(14 -31 ${hy + 4})"/>` +
    `<ellipse cx="31" cy="${hy + 4}" rx="11" ry="20" fill="url(#mpEar)" stroke="${INK}" stroke-width="3" transform="rotate(-14 31 ${hy + 4})"/>` +
    `<path d="${blobPath(0, hy, 34, 28, { power: 2.3 })}" fill="url(#mpFur)" stroke="${INK}" stroke-width="3"/>` +
    `<ellipse cx="-10" cy="${hy - 12}" rx="12" ry="6" fill="#fff" opacity="0.25"/>`;
  if (o.binoculars) {
    g += `<rect x="-24" y="${hy - 6}" width="20" height="18" rx="5" fill="#2a2a30" stroke="#000" stroke-width="2.5"/>` +
      `<rect x="4" y="${hy - 6}" width="20" height="18" rx="5" fill="#2a2a30" stroke="#000" stroke-width="2.5"/>` +
      `<rect x="-6" y="${hy - 2}" width="12" height="8" fill="#2a2a30"/><circle cx="-14" cy="${hy + 3}" r="5" fill="#6fd0ff" opacity="0.8"/><circle cx="14" cy="${hy + 3}" r="5" fill="#6fd0ff" opacity="0.8"/>` +
      `<circle cx="-26" cy="${hy + 14}" r="7" fill="url(#mpFur)" stroke="${INK}" stroke-width="2.5"/><circle cx="26" cy="${hy + 14}" r="7" fill="url(#mpFur)" stroke="${INK}" stroke-width="2.5"/>`;
  } else {
    g += `<circle cx="-12" cy="${hy + 2}" r="4.5" fill="#1a0f08"/><circle cx="12" cy="${hy + 2}" r="4.5" fill="#1a0f08"/>` +
      `<circle cx="-10.5" cy="${hy}" r="1.6" fill="#fff"/><circle cx="13.5" cy="${hy}" r="1.6" fill="#fff"/>`;
  }
  g += `<ellipse cx="0" cy="${hy + 12}" rx="5" ry="3.6" fill="#2a160c"/><path d="M-5 ${hy + 17} q2.5 3 5 0 q2.5 3 5 0" fill="none" stroke="#2a160c" stroke-width="2"/>`;
  if (o.hat === 'deerstalker') {
    g += `<path d="M-30 ${hy - 14} Q0 ${hy - 50} 30 ${hy - 14} Z" fill="url(#tweed)" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M-30 ${hy - 14} q-10 2 -14 8 q12 2 18 -4 Z M30 ${hy - 14} q10 2 14 8 q-12 2 -18 -4 Z" fill="#8a6c46" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M-20 ${hy - 26} L20 ${hy - 26} M-24 ${hy - 18} L24 ${hy - 18} M-8 ${hy - 38} L-12 ${hy - 14} M8 ${hy - 38} L12 ${hy - 14}" stroke="#5e4428" stroke-width="2" opacity="0.7"/>` +
      `<circle cx="0" cy="${hy - 36}" r="3" fill="#5e4428"/>`;
  }
  if (o.headset) {
    g += `<path d="M-30 ${hy} Q0 ${hy - 46} 30 ${hy}" fill="none" stroke="#222" stroke-width="5"/>` +
      `<rect x="-36" y="${hy - 6}" width="10" height="16" rx="4" fill="#333"/><rect x="26" y="${hy - 6}" width="10" height="16" rx="4" fill="#333"/>` +
      `<path d="M-30 ${hy + 8} q4 14 18 14" fill="none" stroke="#333" stroke-width="3"/><circle cx="-10" cy="${hy + 22}" r="3" fill="#ff3b6b"/>`;
  }
  if (o.magnifier && !o.headOnly) {
    g += `<path d="M24 -40 L44 -60" stroke="#6b3f26" stroke-width="7" stroke-linecap="round"/>` +
      `<circle cx="52" cy="-70" r="15" fill="#cfefff" fill-opacity="0.55" stroke="#c9a227" stroke-width="5"/>` +
      `<path d="M45 -76 q5 -5 11 -4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<circle cx="24" cy="-40" r="7" fill="url(#mpFur)" stroke="${INK}" stroke-width="2.5"/>`;
  }
  if (o.sack && !o.headOnly) {
    g += `<g transform="translate(0 ${hy - 40})"><path d="M-34 0 Q-38 -30 -20 -34 L20 -34 Q38 -30 34 0 Q0 8 -34 0 Z" fill="url(#burlap)" stroke="${INK}" stroke-width="3"/>` +
      `<text x="0" y="-12" ${CTXT} font-size="9" fill="#6b3f26" text-anchor="middle">${o.sack}</text></g>` +
      `<circle cx="-28" cy="${hy - 26}" r="7" fill="url(#mpFur)" stroke="${INK}" stroke-width="2.5"/><circle cx="28" cy="${hy - 26}" r="7" fill="url(#mpFur)" stroke="${INK}" stroke-width="2.5"/>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
}

function poster(x: number, y: number, w: number, h: number, inner: string, rot = 0): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">` +
    `<rect x="3" y="4" width="${w}" height="${h}" fill="#000" opacity="0.18"/>` +
    `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#paper)" stroke="${OUT}" stroke-width="2.5"/>` + inner +
    `<circle cx="${w / 2}" cy="6" r="3.5" fill="#e0413c" stroke="${OUT}" stroke-width="1.5"/></g>`;
}

/** 'OUR VICTIM' wanted poster of Puppy, 92x120. */
export function victimPoster(x: number, y: number, rot = -4): string {
  return poster(x, y, 92, 120,
    `<text x="46" y="24" ${CTXT} font-size="13" fill="#c0392b" text-anchor="middle">OUR VICTIM</text>` +
    `<rect x="14" y="30" width="64" height="56" fill="#ffe9c9" stroke="${OUT}" stroke-width="1.5"/>` +
    miniPup(46, 98, 0.62, { headOnly: true }) +
    `<text x="46" y="102" ${CTXT} font-size="8" fill="${OUT}" text-anchor="middle">REWARD:</text>` +
    `<text x="46" y="113" ${CTXT} font-size="8" fill="${OUT}" text-anchor="middle">1 BUNNYCANO</text>`, rot);
}

/** 'NO-GO LIST' with a crossed-out pineapple, 110x136. */
export function noGoPoster(x: number, y: number, rot = 3): string {
  const px = 55, py = 74;
  return poster(x, y, 110, 136,
    `<text x="55" y="24" ${CTXT} font-size="15" fill="${OUT}" text-anchor="middle">NO-GO LIST</text>` +
    `<path d="M${px - 8} ${py - 22} l-6 -16 l10 8 l4 -14 l4 14 l10 -8 l-6 16 Z" fill="#4caf50" stroke="${OUT}" stroke-width="1.5"/>` +
    `<ellipse cx="${px}" cy="${py}" rx="17" ry="23" fill="#f6c443" stroke="${OUT}" stroke-width="2"/>` +
    `<path d="M${px - 14} ${py - 10} L${px + 12} ${py + 16} M${px + 14} ${py - 10} L${px - 12} ${py + 16} M${px - 16} ${py + 4} L${px - 2} ${py - 18} M${px + 16} ${py + 4} L${px + 2} ${py - 18}" stroke="#c98f1e" stroke-width="1.6"/>` +
    `<circle cx="${px}" cy="${py - 4}" r="32" fill="none" stroke="#e0413c" stroke-width="6"/><path d="M${px - 22} ${py - 26} L${px + 22} ${py + 18}" stroke="#e0413c" stroke-width="6"/>` +
    `<path d="M16 120 H94 M16 128 H70" stroke="#b8b2a0" stroke-width="3"/>`, rot);
}

/** 'HACKING TARGET: Bunny's Wishlist' poster, 124x136. */
export function wishlistPoster(x: number, y: number, rot = -2): string {
  let lines = '';
  for (let i = 0; i < 4; i++) lines += `<rect x="16" y="${62 + i * 16}" width="10" height="10" fill="#fff" stroke="${OUT}" stroke-width="1.5"/><path d="M18 ${66 + i * 16} l3 4 l6 -8" stroke="#2e9e4a" stroke-width="2.5" fill="none"/><path d="M34 ${67 + i * 16} H${96 - i * 8}" stroke="#b8b2a0" stroke-width="3"/>`;
  return poster(x, y, 124, 136,
    `<rect x="0" y="0" width="124" height="22" fill="#1d2433"/>` +
    `<text x="62" y="16" ${CTXT} font-size="11" fill="#7ff0ff" text-anchor="middle">HACKING TARGET:</text>` +
    `<text x="62" y="44" ${CTXT} font-size="12" fill="#e0413c" text-anchor="middle">BUNNY'S</text>` +
    `<text x="62" y="58" ${CTXT} font-size="12" fill="#e0413c" text-anchor="middle">WISHLIST</text>` + lines +
    heart(104, 122, 16, '#ff3b6b', OUT, 1.5), rot);
}

/** Super Secret Puppy Hacking Command Center, footprint x..x+400, ground B. */
export function hackingCenter(x: number, B: number): string {
  const w = 400, top = B - 290;
  let s = `<rect x="${x}" y="${top}" width="${w}" height="${B - top}" fill="url(#darkWall)" stroke="${OUT}" stroke-width="3.5"/>` +
    `<rect x="${x - 8}" y="${top - 12}" width="${w + 16}" height="16" fill="#1a2030" stroke="${OUT}" stroke-width="3"/>`;
  // dish + antenna on roof
  s += `<path d="M${x + 320} ${top - 12} L${x + 330} ${top - 50} L${x + 340} ${top - 12} Z" fill="#9aa3ad" stroke="${OUT}" stroke-width="2.5"/>` +
    `<g transform="rotate(-28 ${x + 330} ${top - 64})"><path d="M${x + 296} ${top - 64} A34 16 0 0 0 ${x + 364} ${top - 64} Z" fill="url(#steel)" stroke="${OUT}" stroke-width="3"/>` +
    `<path d="M${x + 330} ${top - 64} L${x + 330} ${top - 96}" stroke="${OUT}" stroke-width="3"/><circle cx="${x + 330}" cy="${top - 98}" r="5" fill="#ff3b6b" stroke="${OUT}" stroke-width="2"/></g>` +
    `<path d="M${x + 60} ${top - 12} V${top - 70}" stroke="#9aa3ad" stroke-width="4"/><circle cx="${x + 60}" cy="${top - 72}" r="5" fill="#7ff0ff"/>`;
  // sign
  s += `<rect x="${x + 24}" y="${top + 14}" width="${w - 48}" height="62" rx="10" fill="#0f1420" stroke="#7ff0ff" stroke-width="3"/>` +
    `<text x="${x + w / 2}" y="${top + 40}" ${CTXT} font-size="18" fill="#7ff0ff" text-anchor="middle">SUPER SECRET PUPPY</text>` +
    `<text x="${x + w / 2}" y="${top + 66}" ${CTXT} font-size="18" fill="#ffffff" text-anchor="middle">HACKING COMMAND CENTER</text>`;
  // glowing screen windows with hacker pups
  for (let i = 0; i < 3; i++) {
    const wx = x + 26 + i * 124, wy = top + 100;
    s += `<rect x="${wx}" y="${wy}" width="100" height="78" rx="6" fill="url(#screen)" stroke="${OUT}" stroke-width="3"/>` +
      `<path d="M${wx + 8} ${wy + 16} H${wx + 60} M${wx + 8} ${wy + 28} H${wx + 44} M${wx + 66} ${wy + 12} l10 14 l12 -8" stroke="#ffffff" stroke-width="2.5" opacity="0.7" fill="none"/>` +
      miniPup(wx + 50, wy + 82, 0.55, { headOnly: true, headset: true });
  }
  s += `<rect x="${x + 160}" y="${B - 92}" width="80" height="92" rx="6" fill="#151b28" stroke="${OUT}" stroke-width="3"/>` +
    `<rect x="${x + 172}" y="${B - 82}" width="56" height="10" rx="3" fill="#7ff0ff" opacity="0.8"/>` +
    `<text x="${x + 200}" y="${B - 56}" ${CTXT} font-size="9" fill="#ff6b6b" text-anchor="middle">KEEP OUT</text>` +
    `<rect x="${x + 270}" y="${B - 90}" width="104" height="58" rx="5" fill="url(#screen)" stroke="${OUT}" stroke-width="3"/>` +
    `<text x="${x + 322}" y="${B - 55}" ${CTXT} font-size="11" fill="#0f1420" text-anchor="middle">OPERATION</text>` +
    `<text x="${x + 322}" y="${B - 41}" ${CTXT} font-size="11" fill="#c0392b" text-anchor="middle">CHERRIES</text>`;
  return s;
}

/** Countdown billboard 260 wide; live digits are drawn by the game at the display rect. */
export const BILLBOARD_DISPLAY = { dx: 130, dy: -238 }; // centre of display relative to (x, B)
export function billboard(x: number, B: number): string {
  const top = B - 320;
  return `<rect x="${x + 40}" y="${top + 150}" width="12" height="${B - top - 150}" fill="url(#steel)" stroke="${OUT}" stroke-width="2"/>` +
    `<rect x="${x + 208}" y="${top + 150}" width="12" height="${B - top - 150}" fill="url(#steel)" stroke="${OUT}" stroke-width="2"/>` +
    `<rect x="${x}" y="${top}" width="260" height="156" rx="10" fill="#1d2433" stroke="${OUT}" stroke-width="4"/>` +
    `<rect x="${x + 8}" y="${top + 8}" width="244" height="140" rx="6" fill="#262f44"/>` +
    `<text x="${x + 130}" y="${top + 38}" ${CTXT} font-size="22" fill="#ffd84d" text-anchor="middle">BUNNY COUNTDOWN</text>` +
    `<rect x="${x + 20}" y="${top + 52}" width="220" height="56" rx="6" fill="#07080c" stroke="#ff3b4f" stroke-width="2.5"/>` +
    `<text x="${x + 130}" y="${top + 134}" ${CTXT} font-size="14" fill="#ffffff" text-anchor="middle">UNTIL BUNNYCANO TIME</text>` +
    `<path d="M${x + 14} ${top + 160} H${x + 246}" stroke="#000" stroke-width="6" opacity="0.15"/>`;
}

/** Stack of coffee sacks with 'SUPER CUTENESS' / 'EXTRA STRONG BUNNYMOTIVATION'. Footprint ~170. */
export function coffeeSacks(x: number, B: number): string {
  const sack = (cx: number, cy: number, w: number, h: number, l1: string, l2: string) =>
    `<path d="M${cx - w / 2} ${cy + h / 2} Q${cx - w / 2 - 6} ${cy - h / 2 + 6} ${cx - w / 2 + 10} ${cy - h / 2} L${cx + w / 2 - 10} ${cy - h / 2} Q${cx + w / 2 + 6} ${cy - h / 2 + 6} ${cx + w / 2} ${cy + h / 2} Z" fill="url(#burlap)" stroke="${OUT}" stroke-width="3"/>` +
    `<path d="M${cx - w / 2 + 10} ${cy - h / 2 + 6} q${w / 4} 6 ${w / 2} 0 q${w / 4} -6 ${w / 2 - 20} 0" fill="none" stroke="#9a7444" stroke-width="2"/>` +
    `<text x="${cx}" y="${cy + 2}" ${CTXT} font-size="10" fill="#6b3f26" text-anchor="middle">${l1}</text>` +
    `<text x="${cx}" y="${cy + 15}" ${CTXT} font-size="8.5" fill="#c0392b" text-anchor="middle">${l2}</text>`;
  return sack(x + 52, B - 28, 104, 56, 'SUPER', 'CUTENESS') +
    sack(x + 158, B - 28, 104, 56, 'EXTRA STRONG', 'BUNNYMOTIVATION') +
    sack(x + 105, B - 80, 108, 54, 'PUPPY', 'COFFEE ROASTERY');
}

/** 'EXCESS STOCK' chocolate pile, footprint ~170. */
export function chocolatePile(x: number, B: number): string {
  let s = '';
  const rows = [6, 5, 4, 3, 2];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const bx = x + 10 + r * 14 + i * 28, by = B - 16 - r * 15;
      s += `<rect x="${bx}" y="${by}" width="28" height="15" rx="2" fill="url(#choc)" stroke="#2a160c" stroke-width="2"/>` +
        `<path d="M${bx + 9} ${by + 2} V${by + 13} M${bx + 19} ${by + 2} V${by + 13}" stroke="#2a160c" stroke-width="1.2" opacity="0.6"/>` +
        (i % 2 ? `<rect x="${bx + 2}" y="${by + 4}" width="10" height="7" fill="#e0413c"/>` : '');
    }
  });
  s += `<rect x="${x + 48}" y="${B - 150}" width="6" height="74" fill="#8a5a2b"/>` +
    `<rect x="${x + 4}" y="${B - 176}" width="104" height="36" rx="5" fill="#fff" stroke="${OUT}" stroke-width="2.5" transform="rotate(-6 ${x + 56} ${B - 158})"/>` +
    `<text x="${x + 56}" y="${B - 152}" ${CTXT} font-size="14" fill="#c0392b" text-anchor="middle" transform="rotate(-6 ${x + 56} ${B - 158})">EXCESS STOCK</text>`;
  return s;
}

/** Truck carrying a giant cherry crate, footprint ~360. */
export function cherryTruck(x: number, B: number): string {
  let cherries = '';
  for (let i = 0; i < 14; i++) {
    const cx = x + 40 + (i % 7) * 30 + (i > 6 ? 15 : 0), cy = B - 150 - (i > 6 ? 22 : 0) - (i % 2) * 6;
    cherries += `<circle cx="${cx}" cy="${cy}" r="15" fill="url(#cherryG)" stroke="${OUT}" stroke-width="2.5"/><circle cx="${cx - 5}" cy="${cy - 5}" r="3.5" fill="#fff" opacity="0.85"/>`;
  }
  return `<rect x="${x + 10}" y="${B - 70}" width="260" height="22" fill="#4a4f57" stroke="${OUT}" stroke-width="3"/>` +
    cherries +
    `<rect x="${x + 20}" y="${B - 150}" width="240" height="84" rx="4" fill="url(#crate)" stroke="${OUT}" stroke-width="3.5"/>` +
    `<path d="M${x + 20} ${B - 122} H${x + 260} M${x + 20} ${B - 94} H${x + 260}" stroke="#8a5a2b" stroke-width="3"/>` +
    `<rect x="${x + 70}" y="${B - 132}" width="140" height="40" rx="6" fill="#fff6e6" stroke="${OUT}" stroke-width="2.5"/>` +
    `<text x="${x + 140}" y="${B - 104}" ${CTXT} font-size="22" fill="#c0392b" text-anchor="middle">CHERRIES</text>` +
    `<path d="M${x + 270} ${B - 48} V${B - 120} Q${x + 272} ${B - 140} ${x + 296} ${B - 140} L${x + 330} ${B - 140} Q${x + 350} ${B - 136} ${x + 356} ${B - 100} L${x + 360} ${B - 48} Z" fill="url(#truckRed)" stroke="${OUT}" stroke-width="3.5"/>` +
    `<path d="M${x + 290} ${B - 126} H${x + 328} Q${x + 340} ${B - 124} ${x + 344} ${B - 100} H${x + 290} Z" fill="#cfefff" stroke="${OUT}" stroke-width="2.5"/>` +
    miniPup(x + 312, B - 98, 0.28, { headOnly: true }) +
    `<rect x="${x + 352}" y="${B - 74}" width="10" height="12" rx="3" fill="#ffe36b" stroke="${OUT}" stroke-width="2"/>` +
    [x + 60, x + 210, x + 320].map(cx => `<circle cx="${cx}" cy="${B - 22}" r="22" fill="#2a2a2e" stroke="#000" stroke-width="3"/><circle cx="${cx}" cy="${B - 22}" r="9" fill="url(#steel)"/>`).join('');
}

/** Little Bunnycano cup helper re-export for scenery. */
export { bunnycano };
