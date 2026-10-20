// PUPPY — matched to the clips: rich caramel fur with soft radial shading, wide
// squarish-round head with fur tufts on the cheeks and a fluffy top tuft, long
// narrow droopy ears close to the face, big round black eyes set low and wide,
// tiny dark nose + 'w' mouth, soft pink blush, chubby pear body, thin brown outline.
import { svgDoc, heart, star, bunnycano, blobPath, radial, arcOf } from './svg';

export const PUP_VB = { w: 200, h: 244, feetY: 238 };

const OUT = '#3b1f10';
const SW = 4.2;            // main outline
const SW2 = 3.6;           // details
const EYE = '#160c07';

export type PupFace = 'normal' | 'hearts' | 'dizzy' | 'panic';

export interface PupPose {
  bob: number; legBack: number; legFront: number; legLift: number; armBack: number;
  earL: number; earR: number; lean: number; face: PupFace; cup: boolean; noArm?: boolean; noTail?: boolean;
}

export const POSE_DEFAULT: PupPose = { bob: 0, legBack: 0, legFront: 0, legLift: 0, armBack: 10, earL: 0, earR: 0, lean: 0, face: 'normal', cup: true };

const DEFS =
  radial('fur', [[0, '#e7a058'], [0.5, '#c97830'], [1, '#9a521c']], 0.38, 0.3, 0.78) +
  radial('furBody', [[0, '#e09650'], [0.55, '#c27230'], [1, '#8f4a18']], 0.38, 0.32, 0.8) +
  radial('furDark', [[0, '#b8692b'], [1, '#93501d']], 0.5, 0.4, 0.75) +
  radial('ear', [[0, '#bd7032'], [1, '#7c3f16']], 0.35, 0.25, 0.85) +
  radial('blush', [[0, 'rgba(240,110,110,0.75)'], [1, 'rgba(240,110,110,0)']], 0.5, 0.5, 0.5) +
  radial('glow', [[0, 'rgba(255,214,160,0.55)'], [1, 'rgba(255,214,160,0)']], 0.5, 0.5, 0.5) +
  radial('ao', [[0, 'rgba(60,25,8,0.45)'], [1, 'rgba(60,25,8,0)']], 0.5, 0.5, 0.5);

// head geometry
const HX = 100, HY = 94, HRX = 74, HRY = 58;

function head(b: number): string {
  const path = blobPath(HX, HY + b, HRX, HRY, {
    power: 2.35, pear: 0.07,
    tufts: [{ a: 158, s: 6, w: 5 }, { a: 168, s: 5, w: 4 }, { a: 22, s: 6, w: 5 }, { a: 12, s: 5, w: 4 },
            { a: 128, s: 3, w: 4 }, { a: 52, s: 3, w: 4 }],
  });
  return `<path d="${path}" fill="url(#fur)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    `<path d="${arcOf(HX, HY + b, HRX, HRY, 140, 215, { power: 2.35, pear: 0.07, inset: 5 })}" fill="none" stroke="#ffd7a3" stroke-width="3.2" stroke-linecap="round" opacity="0.7"/>` +
    `<path d="${arcOf(HX, HY + b, HRX, HRY, 235, 300, { power: 2.35, pear: 0.07, inset: 7 })}" fill="none" stroke="#fff1d8" stroke-width="4" stroke-linecap="round" opacity="0.35"/>`;
}

function topTuft(b: number): string {
  return `<path d="M88 ${41 + b} C88 ${30 + b} 94 ${24 + b} 98 ${25 + b} C97 ${29 + b} 98 ${32 + b} 100 ${34 + b} ` +
    `C100 ${26 + b} 106 ${20 + b} 112 ${22 + b} C108 ${26 + b} 108 ${31 + b} 109 ${34 + b} ` +
    `C112 ${30 + b} 117 ${29 + b} 120 ${31 + b} C116 ${34 + b} 115 ${38 + b} 115 ${42 + b} Z" ` +
    `fill="#c7772f" stroke="${OUT}" stroke-width="${SW2}" stroke-linejoin="round"/>`;
}

function ear(side: 'L' | 'R', rot: number, b: number): string {
  // long, narrow, droopy ear hugging the side of the face
  const L = `M58 ${38 + b} C40 ${32 + b} 22 ${44 + b} 19 ${68 + b} C15 ${90 + b} 18 ${113 + b} 31 ${120 + b} ` +
    `C45 ${127 + b} 56 ${114 + b} 54 ${98 + b} C53 ${82 + b} 56 ${64 + b} 64 ${50 + b} Z`;
  const mir = (d: string) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, x, y) => `${200 - Number(x)} ${y}`);
  const d = side === 'L' ? L : mir(L);
  const px = side === 'L' ? 58 : 142;
  const sgn = side === 'L' ? 1 : -1;
  return `<g transform="rotate(${sgn * (rot + 5)} ${px} ${42 + b})">` +
    `<path d="${d}" fill="url(#ear)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    // little fur notch at the ear tip
    `<path d="${side === 'L' ? `M27 ${114 + b} l-3 6 l7 -2` : `M173 ${114 + b} l3 6 l-7 -2`}" fill="none" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g>`;
}

const EYES: [number, number][] = [[73, 103], [127, 103]];

function eyes(face: PupFace): string {
  if (face === 'hearts') return heart(73, 103, 32, '#ff3b6b', OUT, 3) + heart(127, 103, 32, '#ff3b6b', OUT, 3);
  if (face === 'dizzy') return EYES.map(([x, y]) =>
    `<path d="M${x} ${y} m-1 0 a2 2 0 1 1 3 1 a5 5 0 1 1 -7 -4 a9 9 0 1 1 3 13" fill="none" stroke="${EYE}" stroke-width="3.3" stroke-linecap="round"/>`).join('');
  if (face === 'panic') return EYES.map(([x, y]) =>
    `<ellipse cx="${x}" cy="${y - 2}" rx="13" ry="15" fill="#fff" stroke="${OUT}" stroke-width="3.2"/>` +
    `<circle cx="${x + 1}" cy="${y}" r="4.2" fill="${EYE}"/>`).join('');
  return EYES.map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="11.2" fill="${EYE}"/>` +
    `<circle cx="${x + 4}" cy="${y - 4}" r="4.2" fill="#fff"/>` +
    `<circle cx="${x - 4.5}" cy="${y + 5}" r="1.9" fill="#fff" opacity="0.9"/>` +
    `<path d="M${x - 8} ${y + 2} A9 9 0 0 0 ${x + 2} ${y + 9}" fill="none" stroke="#6b4a3a" stroke-width="1.6" opacity="0.6"/>`).join('');
}

function brows(face: PupFace): string {
  if (face === 'dizzy') return '';
  const lift = face === 'panic' ? -6 : 0;
  return `<path d="M66 ${84 + lift} Q74 ${79 + lift} 82 ${83 + lift}" fill="none" stroke="${OUT}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M118 ${83 + lift} Q126 ${79 + lift} 134 ${84 + lift}" fill="none" stroke="${OUT}" stroke-width="3.4" stroke-linecap="round"/>`;
}

function mouth(face: PupFace): string {
  if (face === 'panic') return `<ellipse cx="100" cy="133" rx="9" ry="11" fill="#5a1d14" stroke="${OUT}" stroke-width="3"/>` +
    `<ellipse cx="100" cy="138" rx="5.5" ry="4" fill="#ff7a8a"/>`;
  if (face === 'dizzy') return `<path d="M89 130 q3.5 -4 7 0 q3.5 4 7 0 q3.5 -4 7 0" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`;
  if (face === 'hearts') return `<path d="M91 125 q4.5 8 9 1 q4.5 7 9 -1" fill="#ff7a8a" stroke="${OUT}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  return `<path d="M93 124 q3.5 5 7 0.5 q3.5 4.5 7 -0.5" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`;
}

function leg(x: number, angle: number, lift: number, fill: string): string {
  const hipY = 204 - lift;
  return `<g transform="rotate(${angle} ${x} ${hipY})">` +
    `<path d="M${x - 13} ${hipY} L${x - 13} ${hipY + 22} Q${x - 13} ${hipY + 34} ${x + 2} ${hipY + 34} Q${x + 17} ${hipY + 34} ${x + 15} ${hipY + 22} L${x + 13} ${hipY} Z" ` +
    `fill="${fill}" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    `<path d="M${x - 2} ${hipY + 29} v4 M${x + 5} ${hipY + 29} v4" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>` +
    `</g>`;
}

function body(b: number): string {
  const path = blobPath(98, 180 + b, 50, 46, {
    pear: 0.2, power: 2.1,
    tufts: [{ a: 165, s: 4, w: 4 }, { a: 196, s: 3.5, w: 4 }, { a: 15, s: 4, w: 4 }, { a: 345, s: 3.5, w: 4 }],
  });
  return `<path d="${path}" fill="url(#furBody)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    `<ellipse cx="102" cy="${188 + b}" rx="25" ry="24" fill="url(#glow)"/>` +
    `<path d="${arcOf(98, 180 + b, 50, 46, 150, 215, { power: 2.1, pear: 0.2, inset: 4.5 })}" fill="none" stroke="#ffd7a3" stroke-width="3" stroke-linecap="round" opacity="0.65"/>` +
    `<ellipse cx="100" cy="${146 + b}" rx="46" ry="12" fill="url(#ao)"/>` +
    `<ellipse cx="84" cy="${214 + b}" rx="18" ry="7" fill="url(#ao)"/><ellipse cx="114" cy="${214 + b}" rx="18" ry="7" fill="url(#ao)"/>` +
    // arm crease line like the clips
    `<path d="M70 ${158 + b} q-3 12 1 24" fill="none" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round" opacity="0.75"/>`;
}

export function puppySVG(pose: Partial<PupPose>, pxPerUnit: number): string {
  const p: PupPose = { ...POSE_DEFAULT, ...pose };
  const b = p.bob, f = p.face;
  let s = `<g transform="rotate(${p.lean} 100 200)">`;
  // back arm
  if (!p.noArm) s += `<g transform="translate(0 ${b}) rotate(${p.armBack} 62 156)">` +
    `<rect x="50" y="150" width="23" height="34" rx="11.5" fill="url(#furDark)" stroke="${OUT}" stroke-width="${SW}"/></g>`;
  // tail (fluffy)
  if (!p.noTail) s += `<path d="M58 ${196 + b} C42 ${196 + b} 32 ${186 + b} 33 ${172 + b} l4 3 l1 -6 C42 ${178 + b} 50 ${182 + b} 60 ${184 + b} Z" fill="#c27230" stroke="${OUT}" stroke-width="${SW2}" stroke-linejoin="round"/>`;
  s += leg(84, p.legBack, p.legLift, '#a85d24');
  s += body(b);
  s += leg(113, p.legFront, p.legLift, '#c27230');
  s += topTuft(b);
  s += head(b);
  s += `<g transform="translate(0 ${b})">`;
  s += `<ellipse cx="100" cy="118" rx="30" ry="20" fill="url(#glow)"/>`;           // very subtle muzzle light
  s += `<ellipse cx="58" cy="122" rx="13" ry="8" fill="url(#blush)" opacity="${f === 'hearts' ? 1 : 0.8}"/>` +
       `<ellipse cx="142" cy="122" rx="13" ry="8" fill="url(#blush)" opacity="${f === 'hearts' ? 1 : 0.8}"/>`;
  s += brows(f) + eyes(f);
  s += `<path d="M91 112 Q100 106 109 112 Q108 120 100 121 Q92 120 91 112 Z" fill="#24130b"/>` +
       `<ellipse cx="97" cy="112" rx="2.6" ry="1.5" fill="#fff" opacity="0.7"/>`;
  s += mouth(f);
  if (f === 'panic') {
    s += `<path d="M34 60 q-7 12 0 16 q7 -4 0 -16 Z" fill="#7fd4ff" stroke="${OUT}" stroke-width="2.6"/>` +
      `<path d="M166 52 q-7 12 0 16 q7 -4 0 -16 Z" fill="#7fd4ff" stroke="${OUT}" stroke-width="2.6"/>`;
  }
  if (f === 'dizzy') s += star(46, 30, 12) + star(156, 26, 10) + star(102, 8, 8);
  s += `</g>`;
  s += ear('L', p.earL, b) + ear('R', p.earR, b);
  // front paw + Bunnycano
  if (p.cup) {
    s += `<g transform="translate(0 ${b})">` + bunnycano(142, 140, 0.95, OUT) +
      `<ellipse cx="143" cy="174" rx="13.5" ry="12.5" fill="#c7772f" stroke="${OUT}" stroke-width="${SW}"/>` +
      `<path d="M137 171 q4 2.5 8 0" fill="none" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/></g>`;
  }
  s += `</g>`;
  return svgDoc(PUP_VB.w, PUP_VB.h, PUP_VB.w * pxPerUnit, PUP_VB.h * pxPerUnit, s, DEFS);
}

export function puppyFrames(): Record<string, Partial<PupPose>> {
  const frames: Record<string, Partial<PupPose>> = {};
  for (const face of ['normal', 'hearts'] as PupFace[]) {
    for (let i = 0; i < 6; i++) {
      const ph = (i / 6) * Math.PI * 2;
      frames[`run${i}_${face}`] = {
        face, bob: -Math.abs(Math.sin(ph)) * 6 + 2,
        legBack: -Math.sin(ph) * 30, legFront: Math.sin(ph) * 30,
        legLift: Math.max(0, Math.cos(ph)) * 4, armBack: -Math.sin(ph) * 40 + 5,
        earL: 3 + Math.sin(ph - 0.9) * 6, earR: 3 + Math.sin(ph - 0.9) * 6,
      };
    }
    frames[`jump_${face}`] = { face, bob: -4, legBack: -35, legFront: 40, legLift: 8, armBack: -140, earL: 18, earR: 18 };
    frames[`fall_${face}`] = { face, bob: 0, legBack: -10, legFront: 14, legLift: 0, armBack: -160, earL: 30, earR: 30 };
  }
  frames['dizzy'] = { face: 'dizzy', bob: 2, legBack: -15, legFront: 20, armBack: 40, earL: 14, earR: -4, lean: -6 };
  frames['panic'] = { face: 'panic', bob: -2, legBack: -8, legFront: 10, armBack: -150, earL: 20, earR: 20 };
  frames['stand'] = { face: 'normal' };
  return frames;
}

/** Puppy's tail on its own (for the Tail Catch bonus: it wags as a separate rig part). Big fluffy tail, base on the right
 *  (attaches at his back, he faces right), tip curling up-left with a cream tuft. viewBox 80x64, base at (74, 42). */
// Tail Catch's separate tail art lives in src/systems/tailRigs.ts (puppyTailSVG, one swappable function).
