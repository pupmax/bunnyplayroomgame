// BUNNY — matched to the clips: soft creamy white with warm-grey edge shading,
// wide slightly squashed head flowing into a pear body, upright rounded ears
// (about head height) with light pink inside, small wide-set black oval eyes,
// tiny pink nose, cat-like 'w' mouth, soft blush, dark thin outline.
// Default outfit: glossy black leather zip jacket with high collar (follows the
// round body), optional wraparound sunglasses.
import { svgDoc, heart, bunnycano, blobPath, radial, linear, arcOf } from './svg';

export const BUN_VB = { w: 240, h: 340, feetY: 334, bustH: 280 };

const OUT = '#2a2120';
const SW = 4.8;
const PINK = '#f6c4cc';
const NOSE = '#ee98a8';
const EYE = '#17110f';

export type BunExpr = 'cool' | 'coolwink' | 'unimpressed' | 'smile' | 'wink' | 'laugh' | 'stern';
export type BunPose = 'full' | 'bust' | 'sip' | 'wave' | 'rig';

const DEFS =
  radial('cream', [[0, '#ffffff'], [0.55, '#f8efe8'], [1, '#d9c8bd']], 0.36, 0.3, 0.8) +
  radial('creamS', [[0, '#fffaf6'], [1, '#d8c7bc']], 0.35, 0.3, 0.85) +
  radial('blush', [[0, 'rgba(246,150,165,0.85)'], [1, 'rgba(246,150,165,0)']], 0.5, 0.5, 0.5) +
  radial('leather', [[0, '#4a4452'], [0.4, '#1a171e'], [1, '#040305']], 0.32, 0.25, 0.85) +
  radial('aoB', [[0, 'rgba(40,25,20,0.4)'], [1, 'rgba(40,25,20,0)']], 0.5, 0.5, 0.5) +
  linear('earIn', [[0, '#f9d3d9'], [1, '#f2b6c0']]) +
  linear('glass', [[0, '#2c2c33'], [0.5, '#0b0b0e'], [1, '#000']]);

// geometry
const HX = 120, HY = 166, HRX = 72, HRY = 60;

function ears(): string {
  const one = (cx: number, rot: number) =>
    `<g transform="rotate(${rot} ${cx} 128)">` +
    `<path d="M${cx - 17} 128 C${cx - 24} 96 ${cx - 25} 46 ${cx - 8} 32 C${cx + 2} 26 ${cx + 15} 30 ${cx + 19} 43 C${cx + 26} 62 ${cx + 24} 100 ${cx + 19} 128 Z" ` +
    `fill="url(#creamS)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    `<path d="M${cx - 7} 116 C${cx - 10} 90 ${cx - 9} 60 ${cx - 2} 49 C${cx + 4} 45 ${cx + 8} 51 ${cx + 9} 60 C${cx + 11} 84 ${cx + 9} 104 ${cx + 7} 116 Z" fill="url(#earIn)"/>` +
    `</g>`;
  return one(93, -8) + one(147, 8) + `<ellipse cx="93" cy="124" rx="20" ry="8" fill="url(#aoB)"/><ellipse cx="147" cy="124" rx="20" ry="8" fill="url(#aoB)"/>`;
}

function headShape(): string {
  return `<path d="${blobPath(HX, HY, HRX, HRY, { power: 2.25, pear: 0.06 })}" fill="url(#cream)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    `<path d="${arcOf(HX, HY, HRX, HRY, 140, 220, { power: 2.25, pear: 0.06, inset: 5 })}" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity="0.9"/>` +
    `<ellipse cx="${HX - 26}" cy="${HY - 30}" rx="22" ry="12" fill="#fff" opacity="0.55" transform="rotate(-20 ${HX - 26} ${HY - 30})"/>`;
}

function face(expr: BunExpr): string {
  const cy = 176, ex = 30;
  const L = HX - ex, R = HX + ex;
  let s = `<ellipse cx="${L - 14}" cy="${cy + 18}" rx="14" ry="8" fill="url(#blush)"/>` +
          `<ellipse cx="${R + 14}" cy="${cy + 18}" rx="14" ry="8" fill="url(#blush)"/>`;
  const dot = (x: number) => `<ellipse cx="${x}" cy="${cy}" rx="7.2" ry="9.4" fill="${EYE}"/><circle cx="${x + 2.2}" cy="${cy - 3.6}" r="2.5" fill="#fff"/>`;
  const closed = (x: number) => `<path d="M${x - 8} ${cy + 3} Q${x} ${cy - 7} ${x + 8} ${cy + 3}" fill="none" stroke="${EYE}" stroke-width="4" stroke-linecap="round"/>`;
  const halfLid = (x: number) => `<path d="M${x - 8} ${cy - 1} H${x + 8} A8 6.5 0 0 1 ${x - 8} ${cy - 1} Z" fill="${EYE}"/>` +
    `<path d="M${x - 10} ${cy - 2} H${x + 10}" stroke="${EYE}" stroke-width="3.6" stroke-linecap="round"/>`;
  const catMouth = (open = false) => open
    ? `<path d="M${HX - 9} ${cy + 18} q4.5 5 9 0 q4.5 5 9 0 q-1 12 -9 12 q-8 0 -9 -12 Z" fill="#c9455e" stroke="${EYE}" stroke-width="3" stroke-linejoin="round"/>` +
      `<ellipse cx="${HX}" cy="${cy + 26}" rx="5" ry="3" fill="#ff9aac"/>`
    : `<path d="M${HX - 9} ${cy + 18} q4.5 5.5 9 0 q4.5 5.5 9 0" fill="none" stroke="${EYE}" stroke-width="3" stroke-linecap="round"/>`;
  switch (expr) {
    case 'cool':
      // wide wraparound one-piece sunglasses + smirk
      s += `<path d="M${L - 24} ${cy - 13} Q${HX} ${cy - 20} ${R + 24} ${cy - 13} L${R + 22} ${cy + 1} Q${R + 18} ${cy + 12} ${R - 4} ${cy + 11} Q${HX + 6} ${cy + 10} ${HX + 4} ${cy + 1} Q${HX} ${cy - 2} ${HX - 4} ${cy + 1} Q${HX - 6} ${cy + 10} ${L + 4} ${cy + 11} Q${L - 18} ${cy + 12} ${L - 22} ${cy + 1} Z" ` +
        `fill="url(#glass)" stroke="#000" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M${L - 10} ${cy - 7} l10 -1" stroke="#9aa0aa" stroke-width="3.5" stroke-linecap="round"/>` +
        `<path d="M${R} ${cy - 8} l10 -1" stroke="#9aa0aa" stroke-width="3.5" stroke-linecap="round"/>` +
        `<path d="M${HX - 8} ${cy + 19} q4 5 8 0 q5 5 11 -3" fill="none" stroke="${EYE}" stroke-width="3" stroke-linecap="round"/>`;
      break;
    case 'coolwink': {
      // shades pushed up onto the forehead + smug wink
      const shades = `<path d="M${L - 24} ${cy - 13} Q${HX} ${cy - 20} ${R + 24} ${cy - 13} L${R + 22} ${cy + 1} Q${R + 18} ${cy + 12} ${R - 4} ${cy + 11} Q${HX + 6} ${cy + 10} ${HX + 4} ${cy + 1} Q${HX} ${cy - 2} ${HX - 4} ${cy + 1} Q${HX - 6} ${cy + 10} ${L + 4} ${cy + 11} Q${L - 18} ${cy + 12} ${L - 22} ${cy + 1} Z" ` +
        `fill="url(#glass)" stroke="#000" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M${L - 10} ${cy - 7} l10 -1" stroke="#9aa0aa" stroke-width="3.5" stroke-linecap="round"/>` +
        `<path d="M${R} ${cy - 8} l10 -1" stroke="#9aa0aa" stroke-width="3.5" stroke-linecap="round"/>`;
      s += `<g transform="translate(0 -34) rotate(-7 ${HX} ${cy})">${shades}</g>` +
        closed(L) + dot(R) +
        `<path d="M${HX - 8} ${cy + 19} q4 5 8 0 q5 5 11 -3" fill="none" stroke="${EYE}" stroke-width="3" stroke-linecap="round"/>` +
        `<path d="M${R + 26} ${cy - 30} l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 Z" fill="#fff6b0" stroke="${OUT}" stroke-width="2"/>`;
      break;
    }
    case 'unimpressed':
      s += halfLid(L) + halfLid(R) + `<path d="M${HX - 7} ${cy + 22} H${HX + 7}" stroke="${EYE}" stroke-width="3" stroke-linecap="round"/>`;
      break;
    case 'smile':
      s += dot(L) + dot(R) + catMouth();
      break;
    case 'wink':
      s += closed(L) + dot(R) + catMouth(true) + heart(206, 110, 28, '#ff3b6b', OUT, 3);
      break;
    case 'laugh':
      s += closed(L) + closed(R) +
        `<path d="M${HX - 13} ${cy + 16} H${HX + 13} Q${HX + 12} ${cy + 36} ${HX} ${cy + 36} Q${HX - 12} ${cy + 36} ${HX - 13} ${cy + 16} Z" fill="#8a2236" stroke="${EYE}" stroke-width="3" stroke-linejoin="round"/>` +
        `<ellipse cx="${HX}" cy="${cy + 30}" rx="7.5" ry="4.5" fill="#ff8ca0"/>`;
      break;
    case 'stern':
      // angry slanted eyes like the whiteboard clip
      s += `<path d="M${L - 11} ${cy - 8} L${L + 10} ${cy - 1} Q${L + 9} ${cy + 9} ${L} ${cy + 9} Q${L - 10} ${cy + 8} ${L - 11} ${cy - 8} Z" fill="${EYE}"/>` +
        `<path d="M${R + 11} ${cy - 8} L${R - 10} ${cy - 1} Q${R - 9} ${cy + 9} ${R} ${cy + 9} Q${R + 10} ${cy + 8} ${R + 11} ${cy - 8} Z" fill="${EYE}"/>` +
        catMouth();
      break;
  }
  s += `<path d="M${HX - 5} ${cy + 10} Q${HX} ${cy + 7} ${HX + 5} ${cy + 10} Q${HX + 3} ${cy + 15} ${HX} ${cy + 15} Q${HX - 3} ${cy + 15} ${HX - 5} ${cy + 10} Z" fill="${NOSE}"/>`;
  return s;
}

function jacketBody(): string {
  // round pear body in glossy black leather; high puffy collar; zipper
  const body = blobPath(120, 264, 64, 58, { power: 2.05, pear: 0.12 });
  return `<path d="${body}" fill="url(#leather)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    `<path d="${arcOf(120, 264, 64, 58, 150, 215, { power: 2.05, pear: 0.12, inset: 4 })}" fill="none" stroke="#9aa3b5" stroke-width="3" stroke-linecap="round" opacity="0.8"/>` +
    // creases / shine (strong white highlights)
    `<path d="M76 250 Q78 228 96 218" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.75"/>` +
    `<path d="M74 266 Q74 260 76 256" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.6"/>` +
    `<path d="M160 234 Q170 248 168 270" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.55"/>` +
    `<path d="M88 300 Q100 308 112 306" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0.4"/>` +
    `<path d="M140 286 q8 6 10 16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.45"/>` +
    // zipper
    `<path d="M121 222 Q122 270 120 318" fill="none" stroke="#d5d9df" stroke-width="3.2"/>` +
    `<path d="M121 224 Q122 270 120 316" fill="none" stroke="#6f757e" stroke-width="7" stroke-dasharray="1.6 3.6"/>` +
    `<rect x="116" y="236" width="10" height="17" rx="3" fill="#e6e9ee" stroke="#000" stroke-width="2"/>` +
    // high collar hugging the neck/head
    `<path d="M70 214 Q120 236 170 214 Q172 228 162 236 Q120 252 78 236 Q68 228 70 214 Z" fill="url(#leather)" stroke="${OUT}" stroke-width="${SW - 0.8}" stroke-linejoin="round"/>` +
    `<path d="M84 226 Q102 234 116 236" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>` +
    `<path d="M140 233 Q152 230 160 224" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.5"/>`;
}

function sleeve(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${OUT}" stroke-width="${30 + SW}" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#141217" stroke-width="30" stroke-linecap="round"/>` +
    `<path d="M${x1 + (x2 - x1) * 0.15 - 4} ${y1 + (y2 - y1) * 0.15} L${x1 + (x2 - x1) * 0.6 - 4} ${y1 + (y2 - y1) * 0.6}" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/>` +
    `<ellipse cx="${x2}" cy="${y2}" rx="13" ry="12" fill="url(#creamS)" stroke="${OUT}" stroke-width="${SW - 0.8}"/>`;
}

export function bunnySVG(pose: BunPose, expr: BunExpr, pxPerUnit: number): string {
  let s = '';
  const full = pose !== 'bust' && pose !== 'rig';
  // fluffy tail
  s += `<path d="${blobPath(62, 296, 17, 16, { tufts: [{ a: 200, s: 4, w: 14 }, { a: 240, s: 4, w: 14 }, { a: 160, s: 4, w: 14 }, { a: 120, s: 3, w: 14 }] })}" fill="url(#creamS)" stroke="${OUT}" stroke-width="${SW - 0.8}" stroke-linejoin="round"/>`;
  if (full) {
    s += `<path d="M84 296 L84 318 Q84 332 100 332 Q114 332 114 318 L114 296 Z" fill="#141217" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
      `<path d="M126 296 L126 318 Q126 332 140 332 Q156 332 156 318 L156 296 Z" fill="#141217" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
      `<path d="M90 314 v8 M132 314 v8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.5"/>`;
  }
  s += sleeve(72, 244, 58, 286);
  s += jacketBody();
  if (pose === 'wave') s += sleeve(168, 240, 202, 198);
  else if (pose !== 'sip' && pose !== 'rig') s += sleeve(168, 244, 182, 286);
  s += ears() + headShape() + face(expr);
  if (pose === 'sip') {
    s += `<path d="M124 196 L162 180" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M124 196 L162 180" stroke="#ff5c8a" stroke-width="3.8" stroke-linecap="round"/>`;
    s += `<g transform="translate(150 182) scale(1.25)">` + bunnycano(0, 0, 1, OUT, false) + `</g>`;
    s += sleeve(172, 252, 158, 240);
  }
  const vbH = pose === 'bust' ? BUN_VB.bustH : BUN_VB.h;
  return svgDoc(BUN_VB.w, vbH, BUN_VB.w * pxPerUnit, vbH * pxPerUnit, s, DEFS);
}
