// Small helpers for hand-authored SVG art (rasterised to textures at boot).

export const INK_PUP = '#3a2013';   // Puppy outline (dark brown)
export const INK = '#231c1f';       // general outline
export const SW = 7;                // standard stroke width in art units

export function svgDoc(vbW: number, vbH: number, pxW: number, pxH: number, body: string, defs = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(pxW)}" height="${Math.round(pxH)}" viewBox="0 0 ${vbW} ${vbH}">` +
    (defs ? `<defs>${defs}</defs>` : '') + body + `</svg>`;
}

/** Heart path centred at (cx, cy), roughly s wide. */
export function heartPath(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number) => `${(cx + x * s).toFixed(1)} ${(cy + y * s).toFixed(1)}`;
  return `M${p(0, 0.38)} C${p(-0.35, 0.12)} ${p(-0.62, -0.08)} ${p(-0.5, -0.3)} C${p(-0.38, -0.52)} ${p(-0.08, -0.5)} ${p(0, -0.24)} ` +
    `C${p(0.08, -0.5)} ${p(0.38, -0.52)} ${p(0.5, -0.3)} C${p(0.62, -0.08)} ${p(0.35, 0.12)} ${p(0, 0.38)} Z`;
}

export function heart(cx: number, cy: number, s: number, fill = '#ff3b6b', stroke = INK, sw = 4, shine = true): string {
  let out = `<path d="${heartPath(cx, cy, s)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  if (shine) out += `<ellipse cx="${cx - s * 0.28}" cy="${cy - s * 0.24}" rx="${s * 0.09}" ry="${s * 0.06}" fill="#fff" opacity="0.85" transform="rotate(-35 ${cx - s * 0.28} ${cy - s * 0.24})"/>`;
  return out;
}

/** 5-point star polygon. */
export function star(cx: number, cy: number, r: number, fill = '#ffd84d', stroke = INK, sw = 3.5): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

/** Rounded capsule from (x1,y1) to (x2,y2) with radius r. */
export function capsule(x1: number, y1: number, x2: number, y2: number, r: number, fill: string, stroke: string, sw = SW): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${r * 2 + sw}" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fill}" stroke-width="${r * 2 - sw * 0.15}" stroke-linecap="round"/>`;
}

/** Bunnycano cup: clear cup, dark coffee, ice, red heart, straw. Origin top-left of a 40x56 box. */
export function bunnycano(x: number, y: number, s = 1, ink = INK, straw = true): string {
  const T = (px: number, py: number) => `${(x + px * s).toFixed(1)} ${(y + py * s).toFixed(1)}`;
  const sw = 4 * s;
  return `<g>` + (straw ?
    `<path d="M${T(26, 4)} L${T(36, -22)}" stroke="${ink}" stroke-width="${8 * s}" stroke-linecap="round"/>` +
    `<path d="M${T(26, 4)} L${T(36, -22)}" stroke="#ff5c8a" stroke-width="${4.5 * s}" stroke-linecap="round"/>` : '') +
    `<path d="M${T(2, 4)} L${T(38, 4)} L${T(34, 56)} L${T(6, 56)} Z" fill="#eaf8ff" fill-opacity="0.92"/>` +
    `<path d="M${T(4.5, 18)} L${T(35.5, 18)} L${T(34, 56)} L${T(6, 56)} Z" fill="#4a2410"/>` +
    `<rect x="${x + 8 * s}" y="${y + 10 * s}" width="${11 * s}" height="${11 * s}" rx="${2.5 * s}" fill="#bff0ff" fill-opacity="0.9" stroke="#7fcbe6" stroke-width="${1.5 * s}" transform="rotate(-12 ${x + 13 * s} ${y + 15 * s})"/>` +
    `<rect x="${x + 21 * s}" y="${y + 12 * s}" width="${10 * s}" height="${10 * s}" rx="${2.5 * s}" fill="#bff0ff" fill-opacity="0.9" stroke="#7fcbe6" stroke-width="${1.5 * s}" transform="rotate(14 ${x + 26 * s} ${y + 17 * s})"/>` +
    heart(x + 20 * s, y + 37 * s, 15 * s, '#e8243c', '#fff', 1.5 * s, false) +
    `<path d="M${T(2, 4)} L${T(38, 4)} L${T(34, 56)} L${T(6, 56)} Z" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<rect x="${x}" y="${y}" width="${40 * s}" height="${7 * s}" rx="${3 * s}" fill="#fff" stroke="${ink}" stroke-width="${3.5 * s}"/>` +
    `<path d="M${T(9, 24)} L${T(11, 50)}" stroke="#fff" stroke-width="${2.5 * s}" stroke-linecap="round" opacity="0.6"/>` +
    `</g>`;
}

export interface Tuft { a: number; s: number; w?: number; }

/**
 * Closed outline around a superellipse with optional fur tufts.
 * a = angle in degrees (0 = right, 90 = down), s = tuft length, w = half-width in degrees.
 * pear > 0 widens the bottom / narrows the top.
 */
export function blobPath(cx: number, cy: number, rx: number, ry: number,
  opts: { power?: number; tufts?: Tuft[]; pear?: number; n?: number } = {}): string {
  const p = opts.power ?? 2, n = opts.n ?? 144, pear = opts.pear ?? 0;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    let x = Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
    let y = Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
    const widen = 1 + pear * y;               // y in -1..1
    let r = 1;
    const deg = (t * 180) / Math.PI;
    for (const tf of opts.tufts ?? []) {
      let d = Math.abs(((deg - tf.a + 540) % 360) - 180);
      const w = tf.w ?? 5;
      if (d < w) r += (tf.s / Math.max(rx, ry)) * Math.pow(1 - d / w, 1.6);
    }
    pts.push(`${(cx + x * rx * widen * r).toFixed(1)} ${(cy + y * ry * r).toFixed(1)}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(' L')} Z`;
}

/** Radial gradient def (objectBoundingBox). stops: [offset 0..1, colour] */
export function radial(id: string, stops: [number, string][], cx = 0.45, cy = 0.4, r = 0.65, fx?: number, fy?: number): string {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fx !== undefined ? ` fx="${fx}" fy="${fy}"` : ''}>` +
    stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + `</radialGradient>`;
}
export function linear(id: string, stops: [number, string][], x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + `</linearGradient>`;
}

/** Open path along part of a superellipse outline (angles in degrees, 0 = right, 90 = down), inset towards the centre. */
export function arcOf(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number,
  opts: { power?: number; pear?: number; inset?: number } = {}): string {
  const p = opts.power ?? 2, pear = opts.pear ?? 0, inset = opts.inset ?? 4;
  const pts: string[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = ((a0 + (a1 - a0) * (i / steps)) * Math.PI) / 180;
    const c = Math.cos(t), s = Math.sin(t);
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
    const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
    const widen = 1 + pear * y;
    pts.push(`${(cx + x * (rx * widen - inset)).toFixed(1)} ${(cy + y * (ry - inset)).toFixed(1)}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(' L')}`;
}
