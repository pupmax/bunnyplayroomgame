// Trash-Can Drop "Comic Rooftop Heist" art (Marc's pick, option C of the Pups 3 mockup). Static SVG only: the dusk halftone
// backdrop, drawn junk items (instead of emoji), the red/black halftone umbrella, trash cans (body + separate lid so the lid can
// hop/fly), the comic BONK burst and the bobble-head Puppy (body frames + head faces on a spring neck). Rasterised on demand.
import { radial, linear, INK, star, svgDoc } from './svg';
import { PUP_PARTS, PUP_VB, POSE_DEFAULT, PupPose, keeperSVG, puppyFrames } from './puppy';

const W = 720, H = 1280, S = `stroke="${INK}" stroke-width="6" stroke-linejoin="round"`;
function rnd(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const vg = (o = 0.55) => radial('vg', [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${o})`]], 0.5, 0.5, 0.78);
const bricks = (y0: number, y1: number, col: string, op: number, seed: number) => { const r = rnd(seed); let o = ''; for (let y = y0; y < y1; y += 36) for (let x = (Math.floor(y / 36) % 2) ? -36 : 0; x < W; x += 72) { const c = r() < 0.12 ? 0.55 : 1; o += `<rect x="${x + 3}" y="${y + 3}" width="66" height="30" rx="5" fill="${col}" opacity="${op * c}"/>`; } return o; };
const skyline = (y: number, col: string, win: string, seed: number, winOp = 0.8) => { const r = rnd(seed); let o = '', x = -10;
  while (x < W) { const w = 50 + r() * 70, h = 60 + r() * 150; o += `<rect x="${x}" y="${y - h}" width="${w}" height="${h + 4}" fill="${col}"/>`;
    for (let wy = y - h + 14; wy < y - 10; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 16) if (r() < 0.3) o += `<rect x="${wx}" y="${wy}" width="8" height="10" fill="${win}" opacity="${winOp}"/>`;
    if (r() < 0.3) o += `<path d="M${x + w / 2} ${y - h} v-26" stroke="${col}" stroke-width="4"/>`; x += w + 4; } return o; };
const halftone = (x0: number, y0: number, w: number, h: number, col: string, op: number, step = 16) => { let o = `<g fill="${col}" opacity="${op}">`; for (let y = y0; y < y0 + h; y += step) for (let x = x0 + ((y / step) % 2) * step / 2; x < x0 + w; x += step) o += `<circle cx="${x}" cy="${y}" r="${2 + 3.5 * (y - y0) / h}"/>`; return o + '</g>'; };
const win = (x: number, y: number, w: number, h: number, glass: string, frame: string, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${glass}" ${S}/>${extra}<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.48} H${x + w}" stroke="${frame}" stroke-width="6"/><rect x="${x - 8}" y="${y + h - 4}" width="${w + 16}" height="14" rx="4" fill="${frame}" ${S}/>`;

/* ---------------- backdrops: roof edge stays at y 300-350 (Iris walks at 334), ground line 1000-1080 (Puppy at 1080), HUD below 1150 ---------------- */
const BG: Record<string, () => { defs: string; body: string }> = {
  // C: comic-book rooftop heist at dusk (halftone, bold ink, WANTED poster)
  C: () => {
    const defs = linear('sky', [[0, '#2a1a5e'], [0.45, '#c0396b'], [1, '#ff9a3a']]) + linear('wall', [[0, '#2a6a7a'], [1, '#143a4a']]) + linear('gnd', [[0, '#3a3a5a'], [1, '#22223a']]) + radial('moon', [[0, '#fff3c0'], [1, '#ffd36b']]) + vg(0.5);
    const body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + halftone(0, 120, W, 190, '#ff6b3a', 0.35)
      + `<circle cx="520" cy="150" r="90" fill="url(#moon)" stroke="${INK}" stroke-width="8"/>` + halftone(440, 70, 160, 160, '#e8b040', 0.4, 14).replace('<g ', `<g clip-path="url(#mc)" `) + `<clipPath id="mc"><circle cx="520" cy="150" r="86"/></clipPath>`
      + skyline(300, '#1a1236', '#ffdf6b', 21, 0.9)
      + `<g transform="translate(620,300)"><rect x="-26" y="-80" width="52" height="80" fill="#1a1236" ${S}/><path d="M-20 -86 h40 v-10 h-40z" fill="#1a1236" ${S}/></g>`
      + `<rect y="300" width="${W}" height="52" fill="#1a3a4a"/><rect y="294" width="${W}" height="18" fill="#2a6a7a" stroke="${INK}" stroke-width="8"/>`
      + `<rect y="352" width="${W}" height="648" fill="url(#wall)"/>` + bricks(356, 1000, '#3a8a9a', 0.5, 17) + halftone(0, 700, W, 300, '#0a1a24', 0.35, 18)
      + `<rect y="380" width="${W}" height="46" fill="#1a3a4a" stroke="${INK}" stroke-width="8"/>`
      // WANTED poster: Puppy silhouette (comic gag)
      + `<g transform="translate(150,610) rotate(-5)"><rect x="-90" y="-110" width="180" height="230" fill="#f4e4b8" stroke="${INK}" stroke-width="8"/><text x="0" y="-70" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="34" text-anchor="middle" fill="#c0303a">WANTED</text>`
      + `<circle cx="0" cy="10" r="46" fill="#c97830" stroke="${INK}" stroke-width="6"/><ellipse cx="-42" cy="2" rx="16" ry="30" fill="#8a4a1a" stroke="${INK}" stroke-width="5"/><ellipse cx="42" cy="2" rx="16" ry="30" fill="#8a4a1a" stroke="${INK}" stroke-width="5"/><circle cx="-14" cy="4" r="6" fill="${INK}"/><circle cx="14" cy="4" r="6" fill="${INK}"/><ellipse cx="0" cy="20" rx="8" ry="6" fill="${INK}"/>`
      + `<text x="0" y="100" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="${INK}">1 BONE REWARD</text></g>`
      + win(470, 500, 150, 180, '#ffdf6b', '#1a3a4a', `<rect x="476" y="506" width="138" height="168" fill="#ff9a3a" opacity="0.35"/><circle cx="545" cy="600" r="30" fill="${INK}" opacity="0.85"/><rect x="520" y="626" width="50" height="50" rx="16" fill="${INK}" opacity="0.85"/>`)
      // dumpster
      + `<g transform="translate(360,1000)"><rect x="-130" y="-120" width="260" height="120" rx="6" fill="#2f8a5a" stroke="${INK}" stroke-width="8"/><path d="M-140 -124 L140 -124 L120 -150 L-120 -150Z" fill="#256e48" stroke="${INK}" stroke-width="8"/><text x="0" y="-48" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="40" text-anchor="middle" fill="#bff0d0" opacity="0.8">BIN</text>` + halftone(-126, -110, 252, 100, '#0a2a1a', 0.35, 14) + `</g>`
      + `<rect y="1000" width="${W}" height="${H - 1000}" fill="url(#gnd)"/><rect y="994" width="${W}" height="14" fill="#5a5a8a" stroke="${INK}" stroke-width="6"/>` + halftone(0, 1100, W, 180, '#0a0a1a', 0.3, 18)
      + `<rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="${INK}" stroke-width="10"/>`
      + `<rect width="${W}" height="${H}" fill="url(#vg)"/>`;
    return { defs, body };
  },
};

/* ---------------- props ---------------- */
const P = (w: number, h: number, body: string, defs = '', ox = 0.5, oy = 0.5) => ({ w, h, body, defs, ox, oy });
export const TRASH_PROPS: Record<string, { w: number; h: number; body: string; defs: string; ox: number; oy: number }> = {
  ti_can: P(90, 110, `<path d="M18 22 V92 Q45 104 72 92 V22Z" fill="#c8ccd6" ${S}/><path d="M18 40 Q45 50 72 40 V78 Q45 88 18 78Z" fill="#e0443a" ${S}/><text x="45" y="70" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="16" text-anchor="middle" fill="#fff">SOUP</text><ellipse cx="45" cy="22" rx="27" ry="9" fill="#e8ecf2" ${S}/><path d="M30 20 L44 26 L60 18" stroke="#8a8e98" stroke-width="3" fill="none"/><rect x="24" y="44" width="6" height="40" rx="3" fill="#fff" opacity="0.6"/>`),
  ti_banana: P(110, 90, `<path d="M12 30 Q30 82 92 70 Q100 66 98 60 Q44 66 26 22Z" fill="#ffdf3a" ${S}/><path d="M30 34 Q46 62 86 64" stroke="#e0b020" stroke-width="5" fill="none"/><path d="M12 30 l-6 -12 l16 -2 l4 6Z" fill="#6a4a1a" ${S}/><circle cx="92" cy="66" r="4" fill="#6a4a1a"/>`),
  ti_peel: P(120, 70, `<path d="M60 46 Q30 10 8 40 Q30 34 46 54Z" fill="#ffdf3a" ${S}/><path d="M60 46 Q90 10 112 40 Q90 34 74 54Z" fill="#ffdf3a" ${S}/><path d="M60 46 Q58 20 66 6 Q74 30 70 52Z" fill="#ffd020" ${S}/><path d="M44 62 Q60 40 76 62Z" fill="#f2c010" ${S}/><circle cx="60" cy="58" r="5" fill="#6a4a1a"/>`, '', 0.5, 0.8),
  ti_shoe: P(120, 90, `<path d="M14 50 Q14 20 40 18 L58 22 Q70 44 96 48 Q114 52 112 70 L14 70Z" fill="#ff7a3a" ${S}/><path d="M12 68 H114 Q116 80 104 82 H18 Q8 80 12 68Z" fill="#fff" ${S}/><path d="M44 26 L58 38 M40 34 L56 44 M36 42 L52 50" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M70 10 q6 -10 0 -18 M84 16 q6 -10 0 -18" stroke="#7ac84a" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  ti_fish: P(130, 80, `<path d="M22 40 Q50 6 92 30 L118 12 Q112 40 118 68 L92 50 Q50 74 22 40Z" fill="#6ab0e0" ${S}/><path d="M50 22 Q56 40 50 58" stroke="#3a7ab0" stroke-width="4" fill="none"/><path d="M64 26 Q70 40 64 54" stroke="#3a7ab0" stroke-width="4" fill="none"/><path d="M28 32 l10 10 M38 32 l-10 10" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M24 48 q6 4 12 0" stroke="${INK}" stroke-width="3" fill="none"/>`),
  ti_box: P(140, 130, `<path d="M14 40 L70 20 L126 40 L126 110 L70 126 L14 110Z" fill="#d8a060" ${S}/><path d="M14 40 L70 58 L126 40 M70 58 V126" stroke="${INK}" stroke-width="5" fill="none"/><path d="M14 40 L70 58 L126 40 L70 20Z" fill="#e8b878" ${S}/><path d="M42 30 L98 48" stroke="#c0a070" stroke-width="10"/><text x="40" y="96" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="13" fill="#c0303a" transform="rotate(14 40 96)">FRAGILE</text><path d="M96 70 v22 m-6 -14 l6 -8 l6 8" stroke="${INK}" stroke-width="3" fill="none"/>`),
  // umbrellas: canopy top-centre handle at bottom; origin = handle tip like the old 'umbrella' (oy 0.95)
  tu_heist: P(220, 210, `<path d="M110 70 V184 q0 16 -16 16 q-14 0 -14 -14" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>`
    + `<path d="M8 90 Q110 -24 212 90 Q186 72 161 90 Q136 72 110 90 Q84 72 59 90 Q34 72 8 90Z" fill="#e0243a" stroke="${INK}" stroke-width="9"/><path d="M59 90 Q72 22 110 10 Q148 22 161 90 Q136 72 110 90 Q84 72 59 90Z" fill="#1a1236" stroke="${INK}" stroke-width="6"/>`
    + halftone(60, 20, 100, 60, '#ffffff', 0.25, 10).replace('<g ', '<g clip-path="url(#uc)" ') + `<clipPath id="uc"><path d="M59 90 Q72 22 110 10 Q148 22 161 90Z"/></clipPath><path d="M28 70 Q48 32 82 20" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/>`, '', 0.5, 0.95),
  // trash cans: body origin at its feet; lid origin at its centre
  tc_heist: P(130, 170, `<path d="M14 30 L24 160 H106 L116 30Z" fill="#c0c4d0" stroke="${INK}" stroke-width="8"/>` + [55, 95, 135].map(y => `<path d="M${16 + y / 16} ${y} H${114 - y / 16}" stroke="${INK}" stroke-width="4"/>`).join('') + halftone(60, 36, 52, 120, '#22223a', 0.4, 10) + `<path d="M40 10 q-8 -12 0 -22 M64 6 q-8 -12 0 -22 M88 10 q-8 -12 0 -22" stroke="#9ae05a" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="6" y="22" width="118" height="16" rx="6" fill="#d8dce8" stroke="${INK}" stroke-width="8"/>`, '', 0.5, 0.96),
  tl_heist: P(140, 50, `<path d="M8 38 Q70 -2 132 38Z" fill="#d8dce8" stroke="${INK}" stroke-width="8"/><rect x="56" y="6" width="28" height="12" rx="6" fill="#9aa0b4" stroke="${INK}" stroke-width="6"/>`),
  // comic burst behind impact words (C)
  tx_burst: P(300, 240, `<path d="${(() => { let d = ''; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, rr = i % 2 ? 70 : 140 - (i % 4) * 14; d += (i ? 'L' : 'M') + (150 + Math.cos(a) * rr).toFixed(1) + ' ' + (120 + Math.sin(a) * rr * 0.78).toFixed(1); } return d + 'Z'; })()}" fill="#ffdf3a" stroke="${INK}" stroke-width="8"/>` + halftone(60, 40, 180, 160, '#ff8a1f', 0.5, 12).replace('<g ', '<g clip-path="url(#bc)" ') + `<clipPath id="bc"><circle cx="150" cy="120" r="70"/></clipPath>`),
  tx_star: P(60, 60, star(30, 30, 26, '#ffdf3a', INK, 4)),
};
export function trashBgSVG(k: number) { const { defs, body } = BG.C(); return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * k}" height="${H * k}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`; }
export function trashPropSVG(key: string, k: number) { const p = TRASH_PROPS[key]; return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(p.w * k)}" height="${Math.round(p.h * k)}" viewBox="0 0 ${p.w} ${p.h}">${p.defs ? `<defs>${p.defs}</defs>` : ''}${p.body}</svg>`; }


/* ---------------- bobble-head Puppy (systems/trashPups.ts): body-only frames + head-only faces that ride a spring neck ---------------- */
// Built from Puppy's own part painters (PUP_PARTS / keeperSVG), so he keeps his natural proportions; the limbs are part of each body
// frame, so they stay attached. Body origin = his feet; head origin = the neck pivot (NECK), where it sits on the body.
export const NECK = { x: 100, y: 146 };
export function bobbleBodySVG(pose: Partial<PupPose>, k: number): string {
  const p: PupPose = { ...POSE_DEFAULT, ...pose }, b = p.bob, { OUT, SW, DEFS, leg, body } = PUP_PARTS;
  const s = `<g transform="rotate(${p.lean} 100 200)"><g transform="translate(0 ${b}) rotate(${p.armBack} 62 156)"><rect x="50" y="150" width="23" height="34" rx="11.5" fill="url(#furDark)" stroke="${OUT}" stroke-width="${SW}"/></g>`
    + leg(84, p.legBack, p.legLift, '#a85d24') + body(b) + leg(113, p.legFront, p.legLift, '#c27230') + `</g>`;
  return svgDoc(PUP_VB.w, PUP_VB.h, PUP_VB.w * k, PUP_VB.h * k, s, DEFS);
}
export function bobbleHeadSVG(pose: Partial<PupPose>, k: number): string { return keeperSVG({ ...pose, bob: 0, lean: 0 }, 'head', k); }
/** body frames (tp_b_*) */
export function bobbleBodies(): Record<string, Partial<PupPose>> {
  const pf = puppyFrames(), cb: Record<string, Partial<PupPose>> = { stand: {}, jump: { legBack: -35, legFront: 40, legLift: 8, armBack: -140 }, kick: { legBack: -45, legFront: 50, legLift: 6, armBack: -160 },
    sit: { legBack: -15, legFront: 20, armBack: 40 }, splay: { legBack: 58, legFront: -58, legLift: 4, armBack: -60 }, flop: { legBack: -34, legFront: 38, legLift: 2, armBack: -120 } };
  for (let i = 0; i < 6; i++) { const r = pf[`run${i}_normal`]; cb['run' + i] = { legBack: r.legBack, legFront: r.legFront, legLift: r.legLift, armBack: r.armBack }; }
  return cb;
}
/** head faces (tp_h_*). 'lovey' heart eyes are ONLY for the Bunny-photo daydream; everywhere else hearts pop from his head. */
export function bobbleHeads(): Record<string, Partial<PupPose>> {
  return { normal: { face: 'normal' }, blink: { face: 'blink' }, worry: { face: 'worry', earL: 8, earR: 8 }, panic: { face: 'panic', earL: 26, earR: 26 },
    ouch: { face: 'ouch', earL: 34, earR: 34 }, stun: { face: 'hearts', earL: 12, earR: 12 }, dizzy: { face: 'dizzy', earL: -10, earR: 20 }, taunt: { face: 'taunt', earL: 4, earR: 14 },
    happy: { face: 'happy', earL: 6, earR: 6 }, flap: { face: 'normal', earL: 22, earR: 22 }, lovey: { face: 'lovey', earL: 16, earR: 16 }, xeyes: { face: 'xeyes', earL: 34, earR: -12 } };
}
