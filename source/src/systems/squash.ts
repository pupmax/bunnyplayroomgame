// Linye's SQUASH catch (Shadow Tag): three slapstick variants, picked at random per tag (never the same twice in a row).
//   A Back sit  - she sits on his back, smug, arms crossed; his head beside her knees: 'help!'
//   B Bounce    - she bounces on his springy back, arms out; his head up, spiral eyes: 'BOING BOING!'
//   C Cushion   - a big purple cushion lands on him, she sips a juice box on top; his head pokes out front: 'mmph!'
// Rule: Linye is never on or over Puppy's head/face; his head is always free, beside/in front of her (to her right).
// Art is authored as SVG in Puppy's style (art/puppy.ts) and rasterised ONCE into small textures; the animation only
// moves/rotates those images (no per-frame vector drawing). All objects are built once and reused on every tag.
import Phaser from 'phaser';
import { radial, blobPath, arcOf, star as svgStar } from '../art/svg';
import { RES } from './resolution';
import { HeroRig, HeroPose } from './rigs';
import { txt } from './fx';

export type SquashVariant = 'A' | 'B' | 'C';
const U = 0.74;              // world px per Puppy art unit at catch size (Puppy at 0.95x; he roams at 0.7x)
const GROUND = 246;          // art-space ground line
const POUNCE = 300, HOLD = 2400, BOING = 300, MIN_SKIP = 500; // ~3 s per catch (Marc: let the squished suffering play longer); skip still allowed after 0.5 s of hold
const OUT = '#3b1f10', SW = 4.2, SW2 = 3.6, EYE = '#160c07', LINK = '#22252b';
const DEFS = radial('fur', [[0, '#e7a058'], [0.5, '#c97830'], [1, '#9a521c']], 0.38, 0.3, 0.78) +
  radial('furBody', [[0, '#e09650'], [0.55, '#c27230'], [1, '#8f4a18']], 0.4, 0.3, 0.8) +
  radial('furDark', [[0, '#b8692b'], [1, '#93501d']], 0.5, 0.4, 0.75) +
  radial('ear', [[0, '#bd7032'], [1, '#7c3f16']], 0.35, 0.25, 0.85) +
  radial('blush', [[0, 'rgba(240,110,110,0.8)'], [1, 'rgba(240,110,110,0)']], 0.5, 0.5, 0.5) +
  radial('glow', [[0, 'rgba(255,214,160,0.55)'], [1, 'rgba(255,214,160,0)']], 0.5, 0.5, 0.5) +
  radial('ao', [[0, 'rgba(60,25,8,0.45)'], [1, 'rgba(60,25,8,0)']], 0.5, 0.5, 0.5) +
  radial('cush', [[0, '#d9c2ff'], [0.55, '#a77fe8'], [1, '#6b44b8']], 0.42, 0.32, 0.8);

// ---------- SVG pieces ----------
function leg(fill: string) { const len = 52;
  return `<path d="M-13 0 L-13 ${len - 12} Q-13 ${len} 1 ${len} Q16 ${len} 14 ${len - 12} L13 0 Z" fill="${fill}" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    `<path d="M-3 ${len - 5} v4 M5 ${len - 5} v4" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>`; }
function arm() { const len = 40;
  return `<rect x="-11" y="0" width="22" height="${len}" rx="11" fill="url(#furDark)" stroke="${OUT}" stroke-width="${SW}"/>` +
    `<ellipse cx="0" cy="${len}" rx="14" ry="13" fill="#c7772f" stroke="${OUT}" stroke-width="${SW}"/><path d="M-6 ${len + 4} q6 3 12 0" fill="none" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/>`; }
function tail() { return `<path d="M52 168 C28 156 22 134 30 114 l5 6 l3 -8 C40 136 48 148 68 156 Z" fill="#c27230" stroke="${OUT}" stroke-width="${SW2}" stroke-linejoin="round"/>`; }
function body() {
  const bx = 168, by = 188, rx = 128, ry = 60;
  const bulge = (cx: number, cy: number, r: number) => `<path d="${blobPath(cx, cy, r * 1.25, r, { power: 2.1 })}" fill="url(#furBody)" stroke="${OUT}" stroke-width="${SW}"/>`;
  let s = bulge(66, 222, 27) + bulge(274, 224, 26);
  s += `<path d="${blobPath(bx, by, rx, ry, { power: 2.4, pear: 0.18, tufts: [{ a: 182, s: 5, w: 4 }, { a: 196, s: 4, w: 4 }, { a: 350, s: 5, w: 4 }, { a: 8, s: 4, w: 4 }, { a: 300, s: 3, w: 4 }] })}" fill="url(#furBody)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  s += `<path d="M108 136 Q150 152 192 135" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
  s += `<path d="${arcOf(bx, by, rx, ry, 196, 250, { power: 2.4, pear: 0.18, inset: 5 })}" fill="none" stroke="#ffd7a3" stroke-width="3.4" stroke-linecap="round" opacity="0.7"/>`;
  s += `<path d="${arcOf(bx, by, rx, ry, 290, 335, { power: 2.4, pear: 0.18, inset: 6 })}" fill="none" stroke="#fff1d8" stroke-width="4" stroke-linecap="round" opacity="0.35"/>`;
  s += `<ellipse cx="${bx + 8}" cy="${by + 38}" rx="100" ry="14" fill="url(#ao)"/><ellipse cx="${bx + 20}" cy="${by - 6}" rx="40" ry="22" fill="url(#glow)"/>`;
  return s;
}
function head(v: SquashVariant) { // Puppy's head geometry (art/puppy.ts), pleading/dizzy faces; pivot (100,150) = neck
  const HX = 100, HY = 94, HRX = 74, HRY = 58, mmph = v === 'C', spiral = v === 'B';
  const ear = (side: number, rot: number) => {
    const L = 'M58 38 C40 32 22 44 19 68 C15 90 18 113 31 120 C45 127 56 114 54 98 C53 82 56 64 64 50 Z';
    const d = side < 0 ? L : L.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_m, x, y) => `${200 - Number(x)} ${y}`);
    return `<g transform="rotate(${-side * rot} ${side < 0 ? 58 : 142} 42)"><path d="${d}" fill="url(#ear)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/></g>`;
  };
  let h = ear(-1, 18) + ear(1, -2);
  h += `<path d="M88 41 C88 30 94 24 98 25 C97 29 98 32 100 34 C100 26 106 20 112 22 C108 26 108 31 109 34 C112 30 117 29 120 31 C116 34 115 38 115 42 Z" fill="#c7772f" stroke="${OUT}" stroke-width="${SW2}" stroke-linejoin="round"/>`;
  h += `<path d="${blobPath(HX, HY, HRX, HRY, { power: 2.35, pear: 0.07, tufts: [{ a: 158, s: 6, w: 5 }, { a: 168, s: 5, w: 4 }, { a: 22, s: 6, w: 5 }, { a: 12, s: 5, w: 4 }, { a: 128, s: 3, w: 4 }, { a: 52, s: 3, w: 4 }] })}" fill="url(#fur)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  h += `<path d="${arcOf(HX, HY, HRX, HRY, 140, 215, { power: 2.35, pear: 0.07, inset: 5 })}" fill="none" stroke="#ffd7a3" stroke-width="3.2" stroke-linecap="round" opacity="0.7"/>`;
  h += `<path d="${arcOf(HX, HY, HRX, HRY, 235, 300, { power: 2.35, pear: 0.07, inset: 7 })}" fill="none" stroke="#fff1d8" stroke-width="4" stroke-linecap="round" opacity="0.35"/>`;
  h += `<ellipse cx="100" cy="118" rx="30" ry="20" fill="url(#glow)"/><ellipse cx="56" cy="120" rx="14" ry="9" fill="url(#blush)"/><ellipse cx="144" cy="120" rx="14" ry="9" fill="url(#blush)"/>`;
  h += mmph
    ? `<path d="M56 66 Q70 70 86 78" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/><path d="M114 78 Q130 70 144 66" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>`
    : `<path d="M58 78 Q68 76 84 66" fill="none" stroke="${OUT}" stroke-width="3.6" stroke-linecap="round"/><path d="M116 66 Q132 76 142 78" fill="none" stroke="${OUT}" stroke-width="3.6" stroke-linecap="round"/>`;
  for (const [x, y] of [[72, 98], [128, 98]]) {
    h += `<ellipse cx="${x}" cy="${y}" rx="17" ry="20" fill="#fff" stroke="${OUT}" stroke-width="3.4"/>`;
    if (spiral) h += `<g transform="translate(${x} ${y}) scale(1.35) translate(${-x} ${-y})"><path d="M${x} ${y} m-1 0 a2 2 0 1 1 3 1 a5 5 0 1 1 -7 -4 a9 9 0 1 1 3 13" fill="none" stroke="${EYE}" stroke-width="2.8" stroke-linecap="round"/></g>`;
    else {
      h += `<circle cx="${x - 5}" cy="${y - 7}" r="9.5" fill="${EYE}"/><circle cx="${x - 2}" cy="${y - 11}" r="3.6" fill="#fff"/><circle cx="${x - 9}" cy="${y - 3}" r="1.6" fill="#fff"/>`;
      h += `<path d="M${x - 11} ${y + 12} q11 6 22 0" fill="none" stroke="#9fdcff" stroke-width="3" stroke-linecap="round" opacity="0.9"/>`;
    }
    h += `<path d="M${x - 24} ${y - 6} q-4 6 0 12 M${x + 24} ${y - 6} q4 6 0 12" fill="none" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>`;
  }
  h += `<path d="M91 116 Q100 110 109 116 Q108 124 100 125 Q92 124 91 116 Z" fill="#24130b"/><ellipse cx="97" cy="116" rx="2.6" ry="1.5" fill="#fff" opacity="0.7"/>`;
  if (mmph) {
    h += `<ellipse cx="68" cy="132" rx="13" ry="9" fill="#f0a15a" opacity="0.7"/><ellipse cx="132" cy="132" rx="13" ry="9" fill="#f0a15a" opacity="0.7"/>`;
    h += `<path d="M86 136 q4.5 -5 9 0 q4.5 5 9 0 q4.5 -5 9 0" fill="none" stroke="${OUT}" stroke-width="3.6" stroke-linecap="round"/>`;
  } else {
    h += `<path d="M88 134 q6 -6 12 -1 q6 -5 12 1 q-2 10 -12 10 q-10 0 -12 -10 Z" fill="#5a1d14" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>`;
    h += `<path d="M96 139 q-2 16 6 18 q8 1 7 -14 Z" fill="#ff7a8a" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/><path d="M102 141 v10" stroke="#c2405a" stroke-width="2" stroke-linecap="round"/>`;
  }
  h += `<path d="M168 40 q-9 15 0 20 q9 -5 0 -20 Z" fill="#7fd4ff" stroke="${OUT}" stroke-width="2.6"/><ellipse cx="166" cy="54" rx="2" ry="3" fill="#fff" opacity="0.8"/>`;
  return h;
}
function cushion() {
  const P = 'M40 150 C30 104 70 84 166 86 C262 84 302 104 294 150 C304 196 262 218 166 216 C70 218 28 196 40 150 Z';
  let s = `<path d="${P}" fill="url(#cush)" stroke="#2a1a4a" stroke-width="5" stroke-linejoin="round"/>`;
  s += `<path d="M60 112 C90 98 130 96 166 97" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.45"/>`;
  s += `<path d="M70 200 C110 210 230 210 270 198" fill="none" stroke="#4a2c8a" stroke-width="4" stroke-linecap="round" opacity="0.6"/>`;
  for (const [x, y] of [[70, 118], [262, 118], [70, 186], [262, 186]]) s += `<path d="M166 152 Q${(166 + x) / 2 + 6} ${(152 + y) / 2 - 4} ${x} ${y}" fill="none" stroke="#5a3a9a" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`;
  s += `<circle cx="166" cy="152" r="9" fill="#ffd36b" stroke="#2a1a4a" stroke-width="3.5"/>`;
  for (const [x, y, a] of [[40, 116, -30], [294, 116, 30], [36, 186, -150], [298, 186, 150]]) s += `<g transform="rotate(${a} ${x} ${y})"><path d="M${x} ${y} l-7 -16 l14 0 Z" fill="#ffd36b" stroke="#2a1a4a" stroke-width="3" stroke-linejoin="round"/></g>`;
  return s;
}
function bird() {
  return `<g stroke="${LINK}" stroke-width="4" stroke-linejoin="round"><ellipse cx="0" cy="6" rx="17" ry="13" fill="#ffe14d"/><circle cx="12" cy="-10" r="14" fill="#ffe14d"/>` +
    `<path d="M24 -12 L36 -7 L24 -3 Z" fill="#ffb020"/><path d="M-6 0 L-22 -16 L-2 -6 Z" fill="#f2c400"/></g>` +
    `<circle cx="15" cy="-13" r="3.2" fill="${LINK}"/><circle cx="16" cy="-14" r="1.2" fill="#fff"/>` +
    `<path d="M8 -24 L4 -30 M12 -24 L13 -31" stroke="${LINK}" stroke-width="3" stroke-linecap="round"/><path d="M-4 18 L-6 26 M4 18 L4 26" stroke="#ff8a00" stroke-width="3" stroke-linecap="round"/>`;
}
function puff() {
  const b: [number, number, number][] = [[-22, 4, 20], [0, -8, 26], [24, 2, 21], [8, 12, 18], [-10, 12, 16]];
  return b.map(([x, y, r]) => `<circle cx="${x + 3}" cy="${y + 5}" r="${r}" fill="#2a1c48" opacity="0.5"/>`).join('') +
    b.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#4a3a78" stroke-width="5"/>`).join('') +
    b.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e8e0ff"/>`).join('') + `<circle cx="-6" cy="-14" r="8" fill="#fff" opacity="0.8"/>`;
}
function burst() {
  const pts: string[] = [], sh: string[] = [];
  for (let i = 0; i < 22; i++) { const r = i % 2 ? 62 : 108 + (i % 4) * 10, a = i / 22 * Math.PI * 2, x = Math.cos(a) * r * 1.55, y = Math.sin(a) * r;
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`); sh.push(`${(x + 7).toFixed(1)} ${(y + 8).toFixed(1)}`); }
  return `<path d="M${sh.join(' L')} Z" fill="${LINK}"/><path d="M${pts.join(' L')} Z" fill="#fff" stroke="${LINK}" stroke-width="6" stroke-linejoin="round"/>`;
}
function juice() {
  return `<g transform="rotate(-12)"><rect x="-14" y="-36" width="28" height="40" rx="5" fill="#ff8fb8" stroke="${LINK}" stroke-width="4"/>` +
    `<circle cx="0" cy="-16" r="8" fill="#fff"/><circle cx="0" cy="-16" r="5" fill="#ff5c3a"/><ellipse cx="3" cy="-23" rx="3" ry="1.5" fill="#4caf50"/>` +
    `<path d="M6 -36 L6 -52 L-10 -64" fill="none" stroke="${LINK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M6 -36 L6 -52 L-10 -64" fill="none" stroke="#7fd4ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}
const ring = () => `<ellipse cx="0" cy="0" rx="74" ry="20" fill="none" stroke="#fff3b0" stroke-width="4" stroke-dasharray="15 13" opacity="0.75"/>`;
const dash = () => `<line x1="-16" y1="0" x2="16" y2="0" stroke="#fff" stroke-width="5.5" stroke-linecap="round" opacity="0.9"/>`;
const arcs = () => [26, 38].map(r => `<path d="M${(r * Math.cos(-0.7)).toFixed(1)} ${(r * Math.sin(-0.7)).toFixed(1)} A${r} ${r} 0 0 1 ${(r * Math.cos(0.7)).toFixed(1)} ${(r * Math.sin(0.7)).toFixed(1)}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.85"/>`).join('');

// key, viewBox x0 y0 w h, world px per unit, pivot (art units) -> origin
type Piece = { key: string; vb: [number, number, number, number]; s: number; pv?: [number, number]; svg: () => string };
const PIECES: Piece[] = [
  { key: 'sqz_body', vb: [22, 108, 298, 146], s: U, svg: body },
  { key: 'sqz_tail', vb: [14, 98, 86, 82], s: U, pv: [66, 160], svg: tail },
  { key: 'sqz_leg1', vb: [-18, -4, 36, 62], s: U, pv: [0, 0], svg: () => leg('#a85d24') },
  { key: 'sqz_leg2', vb: [-18, -4, 36, 62], s: U, pv: [0, 0], svg: () => leg('#c27230') },
  { key: 'sqz_arm', vb: [-17, -4, 34, 64], s: U, pv: [0, 0], svg: arm },
  { key: 'sqz_headA', vb: [-6, 12, 200, 152], s: U, pv: [100, 150], svg: () => head('A') },
  { key: 'sqz_headB', vb: [-6, 12, 200, 152], s: U, pv: [100, 150], svg: () => head('B') },
  { key: 'sqz_headC', vb: [-6, 12, 200, 152], s: U, pv: [100, 150], svg: () => head('C') },
  { key: 'sqz_cushion', vb: [14, 76, 306, 148], s: U, svg: cushion },
  { key: 'sqz_star', vb: [-19, -19, 38, 38], s: 1, pv: [0, 0], svg: () => svgStar(0, 0, 16, '#ffdf6b', LINK, 3.5) },
  { key: 'sqz_bird', vb: [-26, -34, 66, 64], s: 1, pv: [0, 0], svg: bird },
  { key: 'sqz_ring', vb: [-80, -26, 160, 52], s: 1, pv: [0, 0], svg: ring },
  { key: 'sqz_puff', vb: [-50, -40, 100, 80], s: 1, pv: [0, 0], svg: puff },
  { key: 'sqz_burst', vb: [-222, -150, 444, 302], s: 1, pv: [0, 0], svg: burst },
  { key: 'sqz_juice', vb: [-30, -72, 50, 82], s: 1, pv: [0, 0], svg: juice },
  { key: 'sqz_dash', vb: [-20, -5, 40, 10], s: 1, pv: [0, 0], svg: dash },
  { key: 'sqz_arcs', vb: [-6, -40, 48, 80], s: 1, pv: [0, 0], svg: arcs },
];
let artPromise: Promise<void> | null = null;
function bakeArt(scene: Phaser.Scene): Promise<void> {
  const tex = scene.textures;
  if (artPromise && PIECES.every(p => tex.exists(p.key))) return artPromise;
  const one = (p: Piece) => new Promise<void>((res) => {
    if (tex.exists(p.key)) return res();
    const [x0, y0, w, h] = p.vb, k = p.s * RES;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w * k)}" height="${Math.ceil(h * k)}" viewBox="${x0} ${y0} ${w} ${h}"><defs>${DEFS}</defs>${p.svg()}</svg>`;
    const img = new Image(); let tries = 0;
    img.onload = () => { if (!tex.exists(p.key)) tex.addImage(p.key, img); res(); };
    img.onerror = () => { if (++tries < 3) setTimeout(() => { img.src = img.src; }, 120); else res(); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  // one at a time with a yield, so boot/level start never spikes
  artPromise = PIECES.reduce((pr, p) => pr.then(() => one(p)).then(() => new Promise<void>(r => setTimeout(r, 0))), Promise.resolve());
  return artPromise;
}
function pieceImg(scene: Phaser.Scene, key: string): Phaser.GameObjects.Image {
  const p = PIECES.find(q => q.key === key)!; const [x0, y0, w, h] = p.vb;
  const img = scene.add.image(0, 0, key).setDisplaySize(w * p.s, h * p.s);
  if (p.pv) img.setOrigin((p.pv[0] - x0) / w, (p.pv[1] - y0) / h); else img.setOrigin(0, 0);
  return img;
}

// ---------- layouts (art units; local = ((x) * U, (y - GROUND) * U)) ----------
type Limb = { img: Phaser.GameObjects.Image; base: number; amp: number; sp: number; ph: number };
const L = (x: number) => x * U, Ly = (y: number) => (y - GROUND) * U;
const SEAT: Record<SquashVariant, [number, number]> = { A: [150, 134], B: [150, 150], C: [150, 98] };
const HEAD: Record<SquashVariant, [number, number, number]> = { A: [234, 58, -16], B: [238, 52, -24], C: [152, 92, -14] }; // translate + tilt
const ORBIT: Record<SquashVariant, [number, number, number, number]> = { A: [334, 46, 74, 20], B: [338, 40, 74, 20], C: [272, 92, 58, 16] };
const POSE: Record<SquashVariant, Partial<HeroPose>> = {
  A: { ls: 15, le: 95, rs: -15, re: -100, lh: 8, lk: -4, rh: 26, rk: -10, lean: -3, tilt: -7, sq: 0.03, dy: 0 },
  B: { ls: -108, le: -40, rs: 108, re: 40, lh: -36, lk: 46, rh: 36, rk: -46, lean: 0, tilt: 6, sq: -0.05, dy: 0 },
  C: { ls: -40, le: -50, rs: 150, re: 30, lh: 70, lk: 10, rh: 84, rk: 4, lean: -6, tilt: -4, sq: 0, dy: 0 },
};
const LEAP: Partial<HeroPose> = { ls: 140, le: 20, rs: 155, re: 15, lh: -70, lk: 60, rh: -40, rk: 50, lean: 28, tilt: 10, sq: -0.06, dy: 0 };

export class SquashCatch {
  phase: '' | 'pounce' | 'hold' | 'boing' = ''; variant: SquashVariant = 'A'; ready = false; forced?: SquashVariant; count = 0;
  private last?: SquashVariant; private t = 0; private holdAt = 0; private ox = 0; private gy = 0; private pupBase = 1;
  private back!: Phaser.GameObjects.Container; private front!: Phaser.GameObjects.Container;
  private limbs: Record<string, Limb> = {}; private head!: Phaser.GameObjects.Image; private headBase = 0;
  private bodyImgs: Phaser.GameObjects.GameObject[] = []; private cush!: Phaser.GameObjects.Image; private herShadow!: Phaser.GameObjects.Ellipse;
  private orbiters: Phaser.GameObjects.Image[] = []; private ring!: Phaser.GameObjects.Image; private puffs: Phaser.GameObjects.Image[] = [];
  private dashes: Phaser.GameObjects.Image[] = []; private arcImgs: Phaser.GameObjects.Image[] = [];
  private say!: Phaser.GameObjects.Text; private burst!: Phaser.GameObjects.Image; private w1!: Phaser.GameObjects.Text; private w2!: Phaser.GameObjects.Text;
  private juice!: Phaser.GameObjects.Image; private tws: Phaser.Tweens.Tween[] = []; private timer?: Phaser.Time.TimerEvent; private onDone?: () => void;
  private dead = false;
  constructor(private scene: Phaser.Scene, private linye: HeroRig, private pup: Phaser.GameObjects.Image) {
    scene.events.once('shutdown', () => { this.dead = true; this.phase = ''; });
    bakeArt(scene).then(() => { if (!this.dead && (scene.sys.isActive() || scene.sys.isPaused())) { try { this.build(); this.ready = true; } catch { this.ready = false; } } });
  }
  private build() {
    const S = this.scene;
    this.back = S.add.container(0, 0).setDepth(11).setVisible(false);
    this.front = S.add.container(0, 0).setDepth(13).setVisible(false);
    const limb = (key: string, x: number, y: number, base: number, amp: number, sp: number, ph: number) => {
      const img = pieceImg(S, key).setPosition(L(x), Ly(y)).setAngle(base); return { img, base, amp, sp, ph }; };
    const shadow = S.add.ellipse(L(175), Ly(248), 330 * U, 36 * U, 0x000000, 0.42);
    this.herShadow = S.add.ellipse(L(150), Ly(150), 110, 22, 0x1a0a33, 0.45);
    this.limbs.farArm = limb('sqz_arm', 284, 160, -150, 26, 14, 2);
    this.limbs.tail = limb('sqz_tail', 66, 160, 0, 12, 18, 0);
    this.limbs.leg1 = limb('sqz_leg1', 50, 178, 128, 22, 15, 0);
    this.limbs.leg2 = limb('sqz_leg2', 46, 204, 82, 22, 13, 1);
    const bodyI = pieceImg(S, 'sqz_body').setPosition(L(22), Ly(108));
    this.limbs.nearArm = limb('sqz_arm', 272, 212, -62, 26, 16, 0.5);
    this.cush = pieceImg(S, 'sqz_cushion').setPosition(L(14), Ly(76));
    this.limbs.cArm1 = limb('sqz_arm', 186, 200, 46, 24, 15, 0); this.limbs.cArm1.img.setScale(this.limbs.cArm1.img.scaleX, this.limbs.cArm1.img.scaleY * 0.9);
    this.limbs.cArm2 = limb('sqz_arm', 306, 198, -48, 24, 14, 1); this.limbs.cArm2.img.setScale(this.limbs.cArm2.img.scaleX, this.limbs.cArm2.img.scaleY * 0.9);
    for (let i = 0; i < 4; i++) this.dashes.push(pieceImg(S, 'sqz_dash'));
    for (let i = 0; i < 4; i++) this.arcImgs.push(pieceImg(S, 'sqz_arcs'));
    const l = this.limbs;
    this.back.add([shadow, l.farArm.img, l.tail.img, l.leg1.img, l.leg2.img, bodyI, this.herShadow, l.nearArm.img, this.cush, l.cArm1.img, l.cArm2.img, ...this.dashes, ...this.arcImgs]);
    this.bodyImgs = [bodyI];
    this.head = pieceImg(S, 'sqz_headA');
    this.ring = pieceImg(S, 'sqz_ring');
    for (let i = 0; i < 5; i++) this.orbiters.push(pieceImg(S, i < 3 ? 'sqz_star' : 'sqz_bird'));
    for (let i = 0; i < 3; i++) this.puffs.push(pieceImg(S, 'sqz_puff'));
    this.say = txt(S, 0, 0, 'help!', 26, '#ffffff', '#3b1f10', 6);
    this.front.add([this.head, this.ring, ...this.orbiters, this.say, ...this.puffs]);
    this.burst = pieceImg(S, 'sqz_burst').setDepth(34).setVisible(false);
    this.w1 = txt(S, 0, 0, 'SQUASHED!', 64, '#ffdf6b', '#e0243a', 12).setDepth(35).setVisible(false);
    this.w2 = txt(S, 0, 0, 'BOING!', 66, '#7dff9a', '#2a7a3a', 12).setDepth(35).setVisible(false);
    this.juice = pieceImg(S, 'sqz_juice').setDepth(12.5).setVisible(false);
    this.prewarm();
  }
  /** Draw every piece once, nearly transparent, for 3 frames (GPU texture/text uploads happen now, not on the first tag). */
  private prewarm() {
    const S = this.scene, objs: any[] = [this.back, this.front, this.burst, this.w1, this.w2, this.juice];
    this.back.setPosition(-400, 300); this.front.setPosition(-400, 300); this.burst.setPosition(-400, 300); this.w1.setPosition(-400, 300); this.w2.setPosition(-400, 300); this.juice.setPosition(-400, 300);
    for (const k in this.limbs) this.limbs[k].img.setVisible(true);
    this.cush.setVisible(true); this.herShadow.setVisible(true); this.say.setVisible(true);
    objs.forEach(o => o.setVisible(true).setAlpha(0.01));
    let n = 0; const heads = ['sqz_headA', 'sqz_headB', 'sqz_headC'];
    const step = () => {
      if (this.dead) return S.events.off('postupdate', step);
      if (this.phase) { objs.forEach(o => o.setAlpha(1)); return S.events.off('postupdate', step); }
      if (n < 3) { this.head.setTexture(heads[n]); n++; return; }
      S.events.off('postupdate', step); objs.forEach(o => o.setAlpha(1)); this.hideCatch();
    };
    S.events.on('postupdate', step);
  }
  private pick(): SquashVariant {
    if (this.forced) return this.forced;
    const opts = (['A', 'B', 'C'] as SquashVariant[]).filter(v => v !== this.last);
    return opts[Math.floor(Math.random() * opts.length)];
  }
  /** Start the catch at Puppy's spot. onDone fires after the boing (Puppy free to run). */
  start(onDone: () => void) {
    if (!this.ready || this.phase) return false;
    const S = this.scene, v = this.variant = this.pick(); this.last = v; this.count++; this.onDone = onDone; this.t = 0; this.pupBase = Math.abs(this.pup.scaleY) || this.pupBase;
    const cx = Phaser.Math.Clamp(this.pup.x, 180, 490), gy = this.gy = Phaser.Math.Clamp(this.pup.y, 800, 1190);
    this.ox = cx - 175 * U;
    this.back.setPosition(this.ox, gy).setScale(1); this.front.setPosition(this.ox, gy);
    // POUNCE: Puppy grows to catch size and braces, Linye leaps onto his back
    this.phase = 'pounce'; this.killTweens();
    const big = this.pupBase * 0.95 / 0.7;
    this.pup.setTexture('pup_panic').setAngle(0).setDepth(11).setVisible(true);
    this.tw({ targets: this.pup, x: this.ox + L(185), y: gy, scaleX: big, scaleY: big, duration: POUNCE, ease: 'Quad.Out' });
    const r = this.linye.root; S.tweens.killTweensOf(r); r.setScale(0.75).setAlpha(1);
    this.linye.setFlip(false).setMood('happy'); this.linye.act([], true); this.linye.setPose(LEAP);
    const [sx, sy] = SEAT[v], tx = this.ox + L(sx), ty = gy + Ly(sy) + (v === 'B' ? 0 : 25);
    const fx = r.x, fy = r.y, peak = Math.min(fy, ty) - 140;
    const k = { v: 0 };
    this.tw({ targets: k, v: 1, duration: POUNCE, ease: 'Sine.Out', onUpdate: () => { const a = k.v, x = fx + (tx - fx) * a, yl = fy + (ty - fy) * a;
      r.setPosition(x, yl + (peak - Math.min(fy, ty)) * Math.sin(Math.PI * a) * (1 - a * 0.25)); } });
    this.timer = S.time.delayedCall(POUNCE, () => this.toHold());
    return true;
  }
  private toHold() {
    const S = this.scene, v = this.variant, l = this.limbs, gy = this.gy;
    this.phase = 'hold'; this.holdAt = S.time.now; this.t = 0;
    this.pup.setVisible(false);
    // which parts show
    const AB = v !== 'C';
    l.farArm.img.setVisible(AB); l.nearArm.img.setVisible(AB); this.cush.setVisible(!AB); l.cArm1.img.setVisible(!AB); l.cArm2.img.setVisible(!AB);
    this.herShadow.setVisible(v === 'B');
    this.head.setTexture('sqz_head' + v); const [hx, hy, hr] = HEAD[v]; this.head.setPosition(L(hx + 100), Ly(hy + 150)).setAngle(hr); this.headBase = hr;
    const [ox, oy, rx, ry] = ORBIT[v]; this.ring.setPosition(L(ox), Ly(oy)).setScale(rx / 74, ry / 20);
    this.say.setVisible(v !== 'B');
    if (v === 'A') this.say.setText('help!').setFontSize(26).setPosition(L(404), Ly(146)).setAngle(10);
    if (v === 'C') this.say.setText('mmph!').setFontSize(30).setPosition(L(352), Ly(176)).setAngle(8);
    // squash dashes on his sides, motion arcs around kicking paws
    const D: [number, number, number][] = v === 'C' ? [[18, 112, -34], [11, 160, 0], [316, 112, 34], [323, 160, 0]] : [[30, 240, -22], [38, 253, -32], [324, 172, -18], [327, 205, 4]];
    this.dashes.forEach((d, i) => d.setPosition(L(D[i][0]), Ly(D[i][1])).setAngle(D[i][2]).setVisible(true));
    const A2: [number, number, number][] = v === 'C' ? [[-2, 140, -140], [-12, 196, -95], [152, 238, -150], [330, 236, 40]] : [[-2, 140, -140], [-12, 196, -95], [318, 262, 40], [300, 150, -60]];
    this.arcImgs.forEach((a, i) => a.setPosition(L(A2[i][0]), Ly(A2[i][1])).setAngle(A2[i][2]).setVisible(true));
    // puffs burst out of the floor at his ends
    const P: [number, number, number][] = [[-10, 26, 0.7], [380, 12, 0.75], [150, 30, 0.6]];
    this.puffs.forEach((p, i) => { p.setPosition(L(P[i][0]), P[i][1]).setScale(0.3).setAlpha(1); this.tw({ targets: p, scale: P[i][2] * 1.25, alpha: 0, duration: 900, ease: 'Quad.Out' }); });
    this.back.setVisible(true); this.front.setVisible(true);
    // Linye's pose
    const r = this.linye.root, [sx, sy] = SEAT[v];
    r.setPosition(this.ox + L(sx), gy + Ly(sy) + (v === 'B' ? 0 : 25));
    this.linye.setMood(v === 'A' ? 'smug' : 'happy').setPose(POSE[v]); this.linye.idleAmp = 0.5;
    // comic words
    const bx = Phaser.Math.Clamp(this.ox + L(175), 230, 490), by = gy - 385;
    this.burst.setVisible(v !== 'B').setPosition(bx, by).setAngle(v === 'A' ? -7 : -6).setScale(0);
    this.tw({ targets: this.burst, scaleX: v === 'A' ? 1 : 0.95, scaleY: v === 'A' ? 1 : 0.95, duration: 220, ease: 'Back.Out' });
    if (v === 'A') this.w1.setText('SQUASHED!').setColor('#ffdf6b').setStroke('#e0243a', 12).setPosition(bx, by).setAngle(-7);
    if (v === 'C') this.w1.setText('PLOP!').setColor('#d9c2ff').setStroke('#6b2fc9', 12).setPosition(bx, by).setAngle(-6);
    if (v === 'B') this.w1.setText('BOING').setColor('#ffdf6b').setStroke('#6b2fc9', 11).setPosition(Phaser.Math.Clamp(bx - 150, 110, 610), by + 30).setAngle(-12);
    this.w2.setVisible(v === 'B').setPosition(Phaser.Math.Clamp(bx + 120, 110, 610), by + 80).setAngle(9);
    for (const w of [this.w1, this.w2]) { if (w === this.w2 && v !== 'B') continue; w.setVisible(true).setScale(0); this.tw({ targets: w, scale: 1, duration: 240, ease: 'Back.Out', delay: w === this.w2 ? 120 : 40 }); }
    this.juice.setVisible(v === 'C');
    S.cameras.main.shake(140, 0.006);
    this.update(0);
    this.timer = S.time.delayedCall(HOLD, () => this.toBoing());
  }
  /** A tap during the hold skips to the boing (after MIN_SKIP ms of hold). Returns true if it skipped. */
  skip(): boolean {
    if (this.phase !== 'hold' || this.scene.time.now - this.holdAt < MIN_SKIP) return false;
    this.timer?.remove(); this.toBoing(); return true;
  }
  private toBoing() {
    if (this.phase !== 'hold') return;
    const S = this.scene; this.phase = 'boing'; this.killTweens();
    this.hideCatch();
    // Puppy pops back up tall (boing) and shrinks back to roaming size
    const big = this.pupBase * 0.95 / 0.7, fl = 1;
    this.pup.setVisible(true).setTexture('pup_panic').setPosition(this.ox + L(205), this.gy).setScale(big * 0.8 * fl, big * 1.3).setDepth(11);
    this.tw({ targets: this.pup, scaleX: this.pupBase * fl, scaleY: this.pupBase, duration: BOING, ease: 'Back.Out' });
    this.tw({ targets: this.pup, y: this.gy - 46, duration: BOING / 2, yoyo: true, ease: 'Quad.Out' });
    const r = this.linye.root; r.setPosition(this.ox + L(110), this.gy + 8);
    this.linye.idleAmp = 1; this.linye.setMood('happy').act([{ dur: 0.12, to: { rs: 100, re: 35, ls: -35, le: -95, lh: -6, rh: 8, lk: 0, rk: 0, lean: 3, tilt: 8, sq: 0, dy: 0 } }, { dur: 0.18, to: { rs: 120, re: 10 } }], false, 0.25);
    this.timer = S.time.delayedCall(BOING, () => { this.killTweens(); this.pup.setScale(this.pupBase).setY(this.gy); this.phase = ''; this.linye.setMood('smug'); const cb = this.onDone; this.onDone = undefined; cb?.(); });
  }
  /** Immediately end any catch (level over / shutdown). */
  abort() {
    if (!this.phase) return; this.timer?.remove(); this.killTweens(); this.hideCatch(); this.phase = '';
    this.pup.setVisible(true).setScale(this.pupBase); this.linye.idleAmp = 1; this.onDone = undefined;
  }
  private hideCatch() {
    this.back?.setVisible(false); this.front?.setVisible(false); this.burst?.setVisible(false); this.w1?.setVisible(false); this.w2?.setVisible(false); this.juice?.setVisible(false);
    if (this.back) this.back.setScale(1);
  }
  private tw(cfg: Phaser.Types.Tweens.TweenBuilderConfig) { const t = this.scene.tweens.add(cfg); this.tws.push(t); return t; }
  private killTweens() { for (const t of this.tws) t.stop(); this.tws = []; }
  /** per-frame live motion during the hold: only image transforms (no vector redraw). */
  update(dt: number) {
    if (this.phase !== 'hold') return;
    const t = this.t += dt, v = this.variant;
    for (const k in this.limbs) { const m = this.limbs[k]; if (m.img.visible) m.img.setAngle(m.base + Math.sin(t * m.sp + m.ph) * m.amp); }
    this.head.setAngle(this.headBase + Math.sin(t * 4) * 3 + (v === 'C' ? Math.sin(t * 11) * 3 : 0));
    const [ox, oy, rx, ry] = ORBIT[v];
    this.orbiters.forEach((o, i) => { const a = t * 2.8 + i * Math.PI * 2 / 5; o.setPosition(L(ox) + Math.cos(a) * rx, Ly(oy) + Math.sin(a) * ry);
      if (i < 3) o.setAngle(t * 180 + i * 40).setScale(i === 0 ? 0.95 : 0.8); else o.setScale((i === 3 ? 0.8 : 0.72) * (Math.cos(a) < 0 ? -1 : 1), i === 3 ? 0.8 : 0.72); });
    this.arcImgs.forEach((a, i) => a.setAlpha(0.45 + 0.55 * Math.abs(Math.sin(t * 7 + i))));
    const r = this.linye.root, [sx, sy] = SEAT[v], baseY = this.gy + Ly(sy) + (v === 'B' ? 0 : 25);
    if (v === 'A') this.linye.setPose({ lean: -3 + Math.sin(t * 2.6) * 4, tilt: -7 + Math.sin(t * 2.6 + 0.8) * 5 });
    else if (v === 'B') {
      const h = 130 * Math.abs(Math.sin(Math.PI * t / 0.6)); r.setPosition(this.ox + L(sx), baseY - h);
      const c = h < 28 ? 1 - h / 28 : 0; this.back.setScale(1 + c * 0.04, 1 - c * 0.1);
      this.herShadow.setScale(1 - h / 300); this.linye.setPose({ lh: -36 + c * 30, rh: 36 - c * 30, lk: 46 - c * 40, rk: -46 + c * 40, tilt: 6 + Math.sin(t * 5) * 4 });
    } else {
      const sip = Math.max(0, Math.sin(t * 5.2)); this.linye.setPose({ rs: 150 + sip * 14, re: 30 - sip * 12, tilt: -4 - sip * 4, lean: -6 + Math.sin(t * 1.8) * 2 });
      const q = this.linye.point('rp'); this.juice.setPosition(q.x, q.y - 8);
    }
  }
}
