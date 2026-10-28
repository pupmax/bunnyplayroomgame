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

export type PupFace = 'normal' | 'hearts' | 'dizzy' | 'panic' | AcornFace | IrisFace;

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
  if (isAcornFace(face)) return acornEyes(face); // Acorn Puppy faces (block at the end of this file)
  if (isIrisFace(face)) return irisEyes(face); // Trash-Can Drop faces (block at the end of this file)
  // 'hearts' frame = starry-eyed / stunned (Marc: no heart eyes on Puppy; little hearts or stars may pop from his HEAD instead)
  if (face === 'hearts') return EYES.map(([x, y]) => star(x, y, 15.5, '#ffd84d', OUT, 3) +
    `<circle cx="${x - 3.5}" cy="${y - 5}" r="2.4" fill="#fff" opacity="0.9"/>`).join('');
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
  if (isAcornFace(face)) return acornBrows(face);
  if (isIrisFace(face)) return irisBrows(face);
  if (face === 'dizzy') return '';
  const lift = face === 'panic' ? -6 : 0;
  return `<path d="M66 ${84 + lift} Q74 ${79 + lift} 82 ${83 + lift}" fill="none" stroke="${OUT}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M118 ${83 + lift} Q126 ${79 + lift} 134 ${84 + lift}" fill="none" stroke="${OUT}" stroke-width="3.4" stroke-linecap="round"/>`;
}

function mouth(face: PupFace): string {
  if (isAcornFace(face)) return acornMouth(face);
  if (isIrisFace(face)) return irisMouth(face);
  if (face === 'panic') return `<ellipse cx="100" cy="133" rx="9" ry="11" fill="#5a1d14" stroke="${OUT}" stroke-width="3"/>` +
    `<ellipse cx="100" cy="138" rx="5.5" ry="4" fill="#ff7a8a"/>`;
  if (face === 'dizzy') return `<path d="M89 130 q3.5 -4 7 0 q3.5 4 7 0 q3.5 -4 7 0" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`;
  if (face === 'hearts') return `<path d="M90 126 Q100 124 110 126 Q109 141 100 141 Q91 141 90 126 Z" fill="#5a1d14" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>` +
    `<ellipse cx="102" cy="136.5" rx="5.5" ry="3.6" fill="#ff7a8a"/>`; // goofy stunned gape
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

function body(b: number, crease = true): string {
  const path = blobPath(98, 180 + b, 50, 46, {
    pear: 0.2, power: 2.1,
    tufts: [{ a: 165, s: 4, w: 4 }, { a: 196, s: 3.5, w: 4 }, { a: 15, s: 4, w: 4 }, { a: 345, s: 3.5, w: 4 }],
  });
  return `<path d="${path}" fill="url(#furBody)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    `<ellipse cx="102" cy="${188 + b}" rx="25" ry="24" fill="url(#glow)"/>` +
    `<path d="${arcOf(98, 180 + b, 50, 46, 150, 215, { power: 2.1, pear: 0.2, inset: 4.5 })}" fill="none" stroke="#ffd7a3" stroke-width="3" stroke-linecap="round" opacity="0.65"/>` +
    `<ellipse cx="100" cy="${146 + b}" rx="46" ry="12" fill="url(#ao)"/>` +
    `<ellipse cx="84" cy="${214 + b}" rx="18" ry="7" fill="url(#ao)"/><ellipse cx="114" cy="${214 + b}" rx="18" ry="7" fill="url(#ao)"/>` +
    // arm crease line like the clips (off for the Penalty Pup keeper, whose arms are drawn by the scene)
    (crease ? `<path d="M70 ${158 + b} q-3 12 1 24" fill="none" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round" opacity="0.75"/>` : '');
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
  s += `<ellipse cx="58" cy="122" rx="13" ry="8" fill="url(#blush)" opacity="0.8"/>` +
       `<ellipse cx="142" cy="122" rx="13" ry="8" fill="url(#blush)" opacity="0.8"/>`;
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

// ---------- Acorn Barrage Puppy faces (Pups 3, option A "Tail Catch rig"). Self-contained block: only the type union above and one
// line at the top of eyes()/brows()/mouth() point here. No heart eyes: hearts/stars only ever pop from his HEAD (scene fx). ----------
export type AcornFace = 'blink' | 'happy' | 'ouch' | 'taunt' | 'worry' | 'ko';
const ACORN_FACES = new Set<string>(['blink', 'happy', 'ouch', 'taunt', 'worry', 'ko']);
function isAcornFace(f: PupFace): f is AcornFace { return ACORN_FACES.has(f); }
const arcEye = (x: number, y: number, up: boolean) => `<path d="M${x - 10} ${y + (up ? 3 : 1)} Q${x} ${y + (up ? -9 : 7)} ${x + 10} ${y + (up ? 3 : 1)}" fill="none" stroke="${EYE}" stroke-width="${up ? 4 : 3.6}" stroke-linecap="round"/>`;
const dotEye = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="11.2" fill="${EYE}"/><circle cx="${x + 4}" cy="${y - 4}" r="4.2" fill="#fff"/><circle cx="${x - 4.5}" cy="${y + 5}" r="1.9" fill="#fff" opacity="0.9"/>`;
function acornEyes(face: AcornFace): string {
  if (face === 'blink') return EYES.map(([x, y]) => arcEye(x, y, false)).join('');
  if (face === 'ko') return EYES.map(([x, y], i) => arcEye(x, y + (i ? 2 : -1), false) + `<path d="M${x - 4} ${y + 12} q4 3 8 0" fill="none" stroke="${EYE}" stroke-width="2.2" stroke-linecap="round" opacity="0.5"/>`).join(''); // KO'd (end cards): cute, comfy closed eyes, no spirals
  if (face === 'happy') return EYES.map(([x, y]) => arcEye(x, y, true)).join('');
  if (face === 'ouch') return EYES.map(([x, y], i) => { const d = i ? -1 : 1; // > <  squeezed shut
    return `<path d="M${x - 9 * d} ${y - 8} L${x + 8 * d} ${y} L${x - 9 * d} ${y + 8}" fill="none" stroke="${EYE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`; }).join('');
  if (face === 'taunt') return arcEye(EYES[0][0], EYES[0][1], true) + dotEye(EYES[1][0], EYES[1][1]); // wink
  return EYES.map(([x, y]) => `<ellipse cx="${x}" cy="${y - 1}" rx="12.5" ry="13.5" fill="#fff" stroke="${OUT}" stroke-width="3"/>` + // worry: wide eyes, looking UP at the acorn
    `<circle cx="${x}" cy="${y - 5}" r="7.6" fill="${EYE}"/><circle cx="${x + 2.5}" cy="${y - 7.5}" r="2.6" fill="#fff"/>`).join('');
}
const brow = (d: string) => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>`;
function acornBrows(face: AcornFace): string {
  if (face === 'ouch') return brow('M64 80 L83 88') + brow('M136 80 L117 88');
  if (face === 'ko') return brow('M66 80 Q74 76 82 79') + brow('M118 80 Q126 75 134 79');
  if (face === 'worry') return brow('M64 82 Q72 80 82 74') + brow('M118 74 Q128 80 136 82');
  if (face === 'taunt') return brow('M66 82 Q74 76 82 80') + brow('M118 76 Q126 72 134 78');
  return brow('M66 84 Q74 79 82 83') + brow('M118 83 Q126 79 134 84');
}
function acornMouth(face: AcornFace): string {
  if (face === 'ouch') return `<path d="M86 124 Q100 120 114 124 Q113 146 100 147 Q87 146 86 124 Z" fill="#5a1d14" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M89 125 h22 v4 q-11 3 -22 0 Z" fill="#fff"/><ellipse cx="100" cy="141" rx="7" ry="4" fill="#ff7a8a"/>`; // big "YOWCH" with teeth
  if (face === 'ko') return `<path d="M88 124 q6 6 12 0.5 q6 5.5 12 -0.5" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>` + // silly 'w' smile, tongue flopped out to one side
    `<path d="M101 127 Q99 143 108 144 Q116 144 113 126 Z" fill="#ff7a8a" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/><path d="M107.5 130 v8" stroke="#d9546a" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="105" cy="133" rx="2" ry="3" fill="#fff" opacity="0.55"/>`;
  if (face === 'happy') return `<path d="M90 124 Q100 122 110 124 Q108 137 100 137 Q92 137 90 124 Z" fill="#5a1d14" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="100" cy="133" rx="5" ry="3" fill="#ff7a8a"/>`;
  if (face === 'taunt') return `<path d="M93 124 q3.5 5 7 0.5 q3.5 4.5 7 -0.5" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M96 127 Q95 140 102 140 Q109 140 107 127 Z" fill="#ff7a8a" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/><path d="M101.5 129 v7" stroke="#d9546a" stroke-width="1.8" stroke-linecap="round"/>`; // tongue out: nyah!
  if (face === 'worry') return `<path d="M92 130 q4 -4 8 0 q4 4 8 0" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>` + // wobbly mouth + sweat drops
    `<path d="M34 60 q-7 12 0 16 q7 -4 0 -16 Z" fill="#7fd4ff" stroke="${OUT}" stroke-width="2.6"/><path d="M166 52 q-7 12 0 16 q7 -4 0 -16 Z" fill="#7fd4ff" stroke="${OUT}" stroke-width="2.6"/>`;
  return `<path d="M93 124 q3.5 5 7 0.5 q3.5 4.5 7 -0.5" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`;
}
// ---------- end Acorn Barrage Puppy faces ----------

// ---------- Trash-Can Drop Puppy faces (Iris level: hit reactions + the Bunny-photo daydream). Self-contained block: only the type
// union above and one line at the top of eyes()/brows()/mouth() point here. 'lovey' heart eyes are ONLY for the Bunny-photo daydream
// (Marc asked for it, 2026-10-27); everywhere else hearts only pop from his head. ----------
export type IrisFace = 'lovey' | 'xeyes'; // NB: 'ko' is taken by the Acorn block (end-card KO face)
const IRIS_FACES = new Set<string>(['lovey', 'xeyes']);
function isIrisFace(f: PupFace): f is IrisFace { return IRIS_FACES.has(f); }
function irisEyes(face: IrisFace): string {
  if (face === 'lovey') return EYES.map(([x, y]) => heart(x, y + 1, 30, '#ff4f86', OUT, 3)).join('');
  return EYES.map(([x, y]) => `<path d="M${x - 9} ${y - 9} L${x + 9} ${y + 9} M${x + 9} ${y - 9} L${x - 9} ${y + 9}" fill="none" stroke="${EYE}" stroke-width="4.6" stroke-linecap="round"/>`).join(''); // xeyes: X X
}
function irisBrows(face: IrisFace): string {
  if (face === 'lovey') return brow('M64 80 Q72 72 82 76') + brow('M118 76 Q128 72 136 80'); // raised, dreamy
  return '';
}
function irisMouth(face: IrisFace): string {
  if (face === 'lovey') return `<path d="M90 124 Q100 134 110 124" fill="none" stroke="${OUT}" stroke-width="3.2" stroke-linecap="round"/>` + // soppy smile + big blush
    `<ellipse cx="60" cy="124" rx="15" ry="9" fill="#ff7a9a" opacity="0.55"/><ellipse cx="140" cy="124" rx="15" ry="9" fill="#ff7a9a" opacity="0.55"/>`;
  return `<path d="M88 128 Q100 122 112 128" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>` + // xeyes: tongue lolling out the side
    `<path d="M101 127 Q99 146 108 147 Q116 147 113 127 Z" fill="#ff7a8a" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/><path d="M107 130 v9" stroke="#d9546a" stroke-width="1.8" stroke-linecap="round"/>`;
}
// ---------- end Trash-Can Drop Puppy faces ----------
/** Puppy's own part painters + palette, shared read-only with art/pupHang.ts (Lasso hang poses reuse the exact same body/head/leg/ear/face code). */
export const PUP_PARTS = { OUT, SW, DEFS, head, topTuft, ear, leg, body, eyes, brows, mouth };

// ---------- Penalty Pup keeper (Glassia, Football scene): Puppy split into two layers that overlay exactly (same viewBox), so the
// scene can draw his goalie arms BETWEEN them: in front of the body, behind the face. No baked arm, no tail (the scene wags its own),
// no arm-crease line. part 'body' = legs + body, part 'head' = top tuft + head + face + ears. ----------
export function keeperSVG(pose: Partial<PupPose>, part: 'body' | 'head', pxPerUnit: number): string {
  const p: PupPose = { ...POSE_DEFAULT, ...pose }, b = p.bob, f = p.face;
  let s = `<g transform="rotate(${p.lean} 100 200)">`;
  if (part === 'body') s += leg(84, p.legBack, p.legLift, '#a85d24') + body(b, false) + leg(113, p.legFront, p.legLift, '#c27230');
  else {
    s += topTuft(b) + head(b) + `<g transform="translate(0 ${b})">` + `<ellipse cx="100" cy="118" rx="30" ry="20" fill="url(#glow)"/>` +
      `<ellipse cx="58" cy="122" rx="13" ry="8" fill="url(#blush)" opacity="0.8"/><ellipse cx="142" cy="122" rx="13" ry="8" fill="url(#blush)" opacity="0.8"/>` +
      brows(f) + eyes(f) + `<path d="M91 112 Q100 106 109 112 Q108 120 100 121 Q92 120 91 112 Z" fill="#24130b"/><ellipse cx="97" cy="112" rx="2.6" ry="1.5" fill="#fff" opacity="0.7"/>` + mouth(f);
    if (f === 'panic') s += `<path d="M34 60 q-7 12 0 16 q7 -4 0 -16 Z" fill="#7fd4ff" stroke="${OUT}" stroke-width="2.6"/><path d="M166 52 q-7 12 0 16 q7 -4 0 -16 Z" fill="#7fd4ff" stroke="${OUT}" stroke-width="2.6"/>`;
    if (f === 'dizzy') s += star(46, 30, 12) + star(156, 26, 10) + star(102, 8, 8);
    s += `</g>` + ear('L', p.earL, b) + ear('R', p.earR, b);
  }
  s += `</g>`;
  return svgDoc(PUP_VB.w, PUP_VB.h, PUP_VB.w * pxPerUnit, PUP_VB.h * pxPerUnit, s, DEFS);
}
// ---------- end Penalty Pup keeper ----------
