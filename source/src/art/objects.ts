// Pickups, power-ups, obstacles and the van, in the same thick-outline flat style.
import { INK as OUT, SW, svgDoc, heart, heartPath, bunnycano, radial, linear } from './svg';

export interface ArtDef { vbW: number; vbH: number; body: string; defs?: string; }

/** Mini Bunny head (used for the van emblem and the Motivation badge). */
export function bunnyHead(cx: number, cy: number, s: number, fill = '#fbf6f4', stroke = OUT, face = true): string {
  const T = (x: number) => (x * s).toFixed(1);
  let o = `<g transform="translate(${cx} ${cy})">` +
    `<rect x="${T(-22)}" y="${T(-62)}" width="${T(16)}" height="${T(46)}" rx="${T(8)}" fill="${fill}" stroke="${stroke}" stroke-width="${T(4)}" transform="rotate(-8)"/>` +
    `<rect x="${T(6)}" y="${T(-62)}" width="${T(16)}" height="${T(46)}" rx="${T(8)}" fill="${fill}" stroke="${stroke}" stroke-width="${T(4)}" transform="rotate(8)"/>` +
    `<ellipse cx="0" cy="0" rx="${T(30)}" ry="${T(24)}" fill="${fill}" stroke="${stroke}" stroke-width="${T(4)}"/>`;
  if (face) o += `<rect x="${T(-12)}" y="${T(-50)}" width="${T(6)}" height="${T(28)}" rx="${T(3)}" fill="#f5b3c0" transform="rotate(-8)"/>` +
    `<rect x="${T(6)}" y="${T(-50)}" width="${T(6)}" height="${T(28)}" rx="${T(3)}" fill="#f5b3c0" transform="rotate(8)"/>` +
    `<circle cx="${T(-11)}" cy="${T(-2)}" r="${T(3.2)}" fill="#1a1416"/><circle cx="${T(11)}" cy="${T(-2)}" r="${T(3.2)}" fill="#1a1416"/>` +
    `<path d="M${T(-5)} ${T(8)} q${T(2.5)} ${T(4)} ${T(5)} 0 q${T(2.5)} ${T(4)} ${T(5)} 0" fill="none" stroke="#1a1416" stroke-width="${T(2)}" stroke-linecap="round"/>` +
    `<ellipse cx="${T(-18)}" cy="${T(8)}" rx="${T(5)}" ry="${T(3)}" fill="#f5b3c0"/><ellipse cx="${T(18)}" cy="${T(8)}" rx="${T(5)}" ry="${T(3)}" fill="#f5b3c0"/>`;
  return o + `</g>`;
}

const GLOSS = (id: string) => linear(id, [[0, 'rgba(255,255,255,0.75)'], [0.5, 'rgba(255,255,255,0.08)'], [1, 'rgba(255,255,255,0)']]);

/** Van logo slot relative to the van's bottom-centre origin (art units = game px at nominal 1). */
export const VAN_LOGO = { x: 292 - 190, y: 104 - 210, r: 46 };

export const OBJECTS: Record<string, ArtDef> = {
  ice: {
    vbW: 70, vbH: 70,
    defs: radial('iceB', [[0, '#e9fbff'], [0.55, '#a8ecff'], [1, '#5cc3e6']], 0.32, 0.28, 0.85) + GLOSS('iceG'),
    body:
      `<rect x="7" y="7" width="56" height="56" rx="13" fill="url(#iceB)" stroke="${OUT}" stroke-width="${SW - 1.5}"/>` +
      // inner refraction block + caustic
      `<rect x="17" y="17" width="36" height="36" rx="8" fill="#ffffff" opacity="0.28"/>` +
      `<path d="M22 46 Q36 40 50 47" stroke="#4ab4dc" stroke-width="3" fill="none" opacity="0.6" stroke-linecap="round"/>` +
      `<rect x="9" y="9" width="52" height="24" rx="11" fill="url(#iceG)"/>` +
      `<path d="M15 44 L15 20 Q15 15 20 15 L42 15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.9"/>` +
      `<circle cx="51" cy="50" r="3.5" fill="#fff" opacity="0.9"/>`,
  },
  cherry: {
    vbW: 70, vbH: 70,
    defs: radial('ch', [[0, '#ff8a8a'], [0.45, '#e3203a'], [1, '#8f0c1f']], 0.33, 0.3, 0.75) + radial('lf', [[0, '#9be27a'], [1, '#3f9a36']], 0.3, 0.3, 0.8),
    body:
      `<path d="M22 44 Q26 22 40 10 M48 46 Q46 26 40 10" fill="none" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M22 44 Q26 22 40 10 M48 46 Q46 26 40 10" fill="none" stroke="#5aa83f" stroke-width="3.5" stroke-linecap="round"/>` +
      `<path d="M40 10 Q54 2 62 12 Q50 18 40 10 Z" fill="url(#lf)" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>` +
      `<circle cx="21" cy="50" r="14" fill="url(#ch)" stroke="${OUT}" stroke-width="${SW - 2}"/>` +
      `<circle cx="48" cy="52" r="14" fill="url(#ch)" stroke="${OUT}" stroke-width="${SW - 2}"/>` +
      `<ellipse cx="16" cy="44" rx="5" ry="3.4" fill="#fff" opacity="0.95" transform="rotate(-30 16 44)"/><circle cx="27" cy="57" r="1.8" fill="#fff" opacity="0.6"/>` +
      `<ellipse cx="43" cy="46" rx="5" ry="3.4" fill="#fff" opacity="0.95" transform="rotate(-30 43 46)"/><circle cx="54" cy="59" r="1.8" fill="#fff" opacity="0.6"/>`,
  },
  heart: {
    vbW: 72, vbH: 66,
    defs: radial('hp', [[0, '#ff9ab8'], [0.5, '#ff3b6b'], [1, '#b8123f']], 0.35, 0.3, 0.8),
    body: `<path d="${heartPath(36, 36, 64)}" fill="url(#hp)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>` +
      `<ellipse cx="22" cy="22" rx="8" ry="5" fill="#fff" opacity="0.9" transform="rotate(-35 22 22)"/>` +
      `<circle cx="31" cy="17" r="2.5" fill="#fff" opacity="0.8"/>` +
      `<path d="M50 44 Q44 54 36 58" stroke="#fff" stroke-width="3" fill="none" opacity="0.35" stroke-linecap="round"/>`,
  },
  boost: {
    vbW: 110, vbH: 110,
    defs: radial('bb', [[0, '#fff6c4'], [0.6, '#ffe36b'], [1, '#e6a520']], 0.35, 0.3, 0.8) + GLOSS('bg1'),
    body:
      `<circle cx="55" cy="55" r="50" fill="url(#bb)" stroke="${OUT}" stroke-width="5"/>` +
      `<g transform="translate(30 30) scale(1.25)">` + bunnycano(0, 0, 1, OUT) + `</g>` +
      `<ellipse cx="55" cy="30" rx="38" ry="20" fill="url(#bg1)"/>`,
  },
  motivation: {
    vbW: 110, vbH: 110,
    defs: radial('mb', [[0, '#ffe0ee'], [0.6, '#ff9fca'], [1, '#e0588f']], 0.35, 0.3, 0.8) + GLOSS('mg1'),
    body:
      `<circle cx="55" cy="55" r="50" fill="url(#mb)" stroke="${OUT}" stroke-width="5"/>` +
      bunnyHead(55, 72, 1.05) + heart(24, 30, 22) + heart(88, 28, 20) +
      `<ellipse cx="55" cy="28" rx="38" ry="18" fill="url(#mg1)"/>`,
  },
  scooter: {
    vbW: 150, vbH: 110,
    defs: linear('sb', [[0, '#7fb3ff'], [0.45, '#3b82e8'], [1, '#1f4fa8']]) + linear('chrome', [[0, '#eef2f6'], [0.5, '#9aa3ad'], [1, '#5d6670']], 0, 0, 1, 0) +
      linear('crate', [[0, '#c98a4e'], [1, '#8a5a2b']]) + radial('tyre', [[0, '#555'], [0.7, '#2a2a2e'], [1, '#111']], 0.4, 0.35, 0.7),
    body:
      `<path d="M28 78 L110 78 Q130 78 130 60 L130 40 L118 40 L116 62 L40 62 Q28 62 24 72 Z" fill="url(#sb)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
      `<path d="M118 40 L112 14" stroke="${OUT}" stroke-width="13" stroke-linecap="round"/>` +
      `<path d="M118 40 L112 14" stroke="url(#chrome)" stroke-width="6" stroke-linecap="round"/>` +
      `<rect x="98" y="6" width="34" height="11" rx="5.5" fill="url(#sb)" stroke="${OUT}" stroke-width="5"/>` +
      `<path d="M40 67 L110 67" stroke="#cfe2ff" stroke-width="4" stroke-linecap="round"/>` +
      `<circle cx="132" cy="48" r="6" fill="#fff6c2" stroke="${OUT}" stroke-width="3"/>` +
      `<rect x="28" y="30" width="54" height="34" rx="4" fill="url(#crate)" stroke="${OUT}" stroke-width="${SW - 1}"/>` +
      `<path d="M34 41 H76 M34 52 H76" stroke="#6f4520" stroke-width="3"/><path d="M31 33 H79" stroke="#fff" stroke-width="2" opacity="0.4"/>` +
      `<circle cx="55" cy="22" r="8" fill="#5b2f14" stroke="${OUT}" stroke-width="4"/><circle cx="52" cy="19" r="2.5" fill="#fff" opacity="0.6"/>` +
      `<circle cx="34" cy="88" r="16" fill="url(#tyre)" stroke="${OUT}" stroke-width="5"/><circle cx="34" cy="88" r="6.5" fill="url(#chrome)"/>` +
      `<circle cx="122" cy="88" r="16" fill="url(#tyre)" stroke="${OUT}" stroke-width="5"/><circle cx="122" cy="88" r="6.5" fill="url(#chrome)"/>`,
  },
  paperwork: {
    vbW: 120, vbH: 210,
    defs: linear('sheet', [[0, '#ffffff'], [1, '#e8e2d2']], 0, 0, 1, 0),
    body: (() => {
      let o = '';
      const cols = ['url(#sheet)', '#f6e7b5', 'url(#sheet)', '#d8ecff', 'url(#sheet)', '#f6e7b5', 'url(#sheet)', '#ffd9d9', 'url(#sheet)'];
      for (let i = 0; i < 9; i++) {
        const y = 206 - (i + 1) * 21, off = ((i * 37) % 13) - 6;
        o += `<rect x="${12 + off}" y="${y}" width="96" height="21" rx="3" fill="${cols[i]}" stroke="${OUT}" stroke-width="4.5"/>` +
          `<rect x="${14 + off}" y="${y + 15}" width="92" height="5" fill="#000" opacity="0.08"/>` +
          `<path d="M${22 + off} ${y + 10} H${70 + off}" stroke="#b8b2a0" stroke-width="2.5"/>` +
          `<path d="M${84 + off} ${y + 3} V${y + 18}" stroke="#000" stroke-width="10" opacity="0.06"/>`;
      }
      o += `<rect x="50" y="8" width="20" height="14" rx="3" fill="#c0c6cf" stroke="${OUT}" stroke-width="3.5"/>` +
        `<text x="60" y="120" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="15" fill="#e3203a" text-anchor="middle" transform="rotate(-8 60 120)">URGENT</text>`;
      return o;
    })(),
  },
  puddle: {
    vbW: 170, vbH: 54,
    defs: radial('cream', [[0, '#ffffff'], [0.7, '#fff6e6'], [1, '#e6d9bf']], 0.4, 0.3, 0.8) + radial('ch2', [[0, '#ff8a8a'], [1, '#b0102a']], 0.35, 0.3, 0.8),
    body:
      `<path d="M8 44 Q4 30 26 30 Q36 16 56 24 Q72 10 92 22 Q114 12 128 26 Q160 24 162 42 Q164 52 140 50 L28 50 Q8 52 8 44 Z" fill="url(#cream)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="M60 26 Q76 2 90 22 Q80 16 74 26" fill="url(#cream)" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="M26 42 Q60 36 96 42" fill="none" stroke="#e4d8bd" stroke-width="4" stroke-linecap="round"/>` +
      `<ellipse cx="44" cy="30" rx="10" ry="4" fill="#fff"/><ellipse cx="118" cy="32" rx="8" ry="3.5" fill="#fff"/>` +
      `<circle cx="78" cy="10" r="6" fill="url(#ch2)" stroke="${OUT}" stroke-width="3"/><circle cx="76" cy="8" r="1.8" fill="#fff"/>`,
  },
  van: {
    vbW: 380, vbH: 210,
    defs: linear('vb', [[0, '#3a3742'], [0.35, '#16141a'], [1, '#050506']]) + linear('vg', [[0, '#9fb6d6'], [1, '#4f6487']]) +
      radial('tyre2', [[0, '#444'], [1, '#050505']], 0.4, 0.35, 0.7) + linear('chrome2', [[0, '#eef2f6'], [1, '#6d7680']], 0, 0, 1, 0),
    body:
      `<path d="M22 168 L22 104 Q24 76 54 64 L96 40 Q104 34 116 34 L352 34 Q366 34 366 48 L366 168 Z" fill="url(#vb)" stroke="#000" stroke-width="${SW}" stroke-linejoin="round"/>` +
      `<path d="M58 72 L100 48 L132 48 L132 98 L46 98 Q46 82 58 72 Z" fill="url(#vg)" stroke="#000" stroke-width="4"/>` +
      `<path d="M70 72 L98 56 M84 80 L106 66" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.6"/>` +
      `<path d="M150 46 V160 M268 46 V160" stroke="#2b2832" stroke-width="4"/>` +
      `<path d="M120 42 L356 42" stroke="#fff" stroke-width="6" opacity="0.35" stroke-linecap="round"/>` +
      `<path d="M40 120 Q200 108 360 120" stroke="#fff" stroke-width="3" opacity="0.15" fill="none"/>` +
      `<rect x="14" y="140" width="30" height="16" rx="5" fill="#ffe36b" stroke="#000" stroke-width="3"/><rect x="18" y="143" width="10" height="5" rx="2" fill="#fff"/>` +
      `<rect x="10" y="160" width="362" height="16" rx="8" fill="url(#chrome2)" stroke="#000" stroke-width="4"/>` +
      // logo slot: the real Bunny Play Room logo image is laid on top in-game (VAN_LOGO)
      `<circle cx="292" cy="104" r="48" fill="#000" stroke="#2b2832" stroke-width="3"/>` +
      `<circle cx="92" cy="176" r="28" fill="url(#tyre2)" stroke="#000" stroke-width="5"/><circle cx="92" cy="176" r="11" fill="url(#chrome2)"/>` +
      `<circle cx="306" cy="176" r="28" fill="url(#tyre2)" stroke="#000" stroke-width="5"/><circle cx="306" cy="176" r="11" fill="url(#chrome2)"/>`,
  },
};

export function objectSVG(key: string, pxPerUnit: number): string {
  const d = OBJECTS[key];
  return svgDoc(d.vbW, d.vbH, d.vbW * pxPerUnit, d.vbH * pxPerUnit, d.body, d.defs);
}
