// The Playroom Hall background: Bunny's cute gothic boudoir lair (720x1280 SVG, rasterised as bg_hall via BACKGROUNDS.hall).
// Text/signage is NOT in the SVG (no web fonts inside SVG images): hallFx.ts adds it with txt().
import { radial, linear, heartPath, heart } from './svg';
const W = 720, H = 1280, FLOOR = H * 0.62;
const INK = '#1e1020';
const vignette = (a = 0.55) => radial('vg', [[0, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${a})`]], 0.5, 0.5, 0.75);
const PATH = 'M60 1180 H660 V850 H60 V560 L360 470';
/** heart-shaped padlock, body centred ~ (x,y), s = heart size */
function heartLock(x: number, y: number, s: number, fill = '#ff4fa3', metal = '#d9d4e4'): string {
  const sh = s * 0.22;
  return `<path d="M${x - sh} ${y - s * 0.22} V${y - s * 0.5} A${sh} ${sh} 0 0 1 ${x + sh} ${y - s * 0.5} V${y - s * 0.22}" fill="none" stroke="${INK}" stroke-width="${s * 0.13}"/>`
    + `<path d="M${x - sh} ${y - s * 0.22} V${y - s * 0.5} A${sh} ${sh} 0 0 1 ${x + sh} ${y - s * 0.5} V${y - s * 0.22}" fill="none" stroke="${metal}" stroke-width="${s * 0.07}"/>`
    + heart(x, y + s * 0.1, s, fill, INK, 4)
    + `<circle cx="${x}" cy="${y + s * 0.02}" r="${s * 0.06}" fill="${INK}"/><path d="M${x - s * 0.03} ${y + s * 0.04} h${s * 0.06} l${s * 0.02} ${s * 0.14} h-${s * 0.1}z" fill="${INK}"/>`;
}
/** cartoon bone */
function bone(x: number, y: number, s: number, rot = 0, fill = '#fff6e6'): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${fill}" stroke="${INK}" stroke-width="${4 / s}">`
    + `<circle cx="-22" cy="-7" r="9"/><circle cx="-22" cy="7" r="9"/><circle cx="22" cy="-7" r="9"/><circle cx="22" cy="7" r="9"/><rect x="-22" y="-6" width="44" height="12" stroke="none"/>`
    + `<path d="M-22 -6 H22 M-22 6 H22" fill="none"/></g>`;
}
/** candle with heart-shaped flame holder (flame itself is animated in hallFx) */
function heartCandle(x: number, y: number, s = 1, wax = '#ffe6f0', cup = '#e0a82e'): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-9" y="-34" width="18" height="38" rx="5" fill="${wax}" stroke="${INK}" stroke-width="4"/><path d="M-4 -34 q2 10 0 14" stroke="#fff" stroke-width="3" opacity="0.7" fill="none"/>`
    + `<path d="${heartPath(0, 6, 46)}" fill="${cup}" stroke="${INK}" stroke-width="4"/><line x1="0" y1="-34" x2="0" y2="-42" stroke="${INK}" stroke-width="3"/></g>`;
}
/** flame anchor points (hallFx animates flames here): the two heart candelabras */
export const HALL_FLAMES: [number, number, number][] = [[176, 196, 0.6], [200, 180, 0.6], [224, 196, 0.6], [496, 196, 0.6], [520, 180, 0.6], [544, 196, 0.6]];

export function hallLair(): { body: string; defs: string } {
  // Cute Gothic Boudoir Lair: softened lilac stone, pink ruffled drapes, heart candelabras, Puppy's cage-bed, hooks with leash + fluffy cuffs, Bunny's Rules plaque
    const defs = linear('gold', [[0, '#fff2b0'], [0.5, '#e0a82e'], [1, '#8a5a10']]) + linear('drapeC', [[0, '#d0508a'], [0.3, '#ff8ec0'], [0.5, '#ffb0d4'], [0.7, '#ff86ba'], [1, '#c8447e']], 0, 0, 1, 0)
      + linear('wallC', [[0, '#5a3a72'], [1, '#3a2048']]) + linear('rugC', [[0, '#ff7ab0'], [1, '#d03a7a']]) + linear('cush', [[0, '#ffd0e6'], [1, '#ff7ab0']])
      + radial('candle', [[0, 'rgba(255,190,150,0.55)'], [1, 'rgba(255,150,150,0)']]) + radial('rose', [[0, 'rgba(255,140,200,0.35)'], [1, 'rgba(255,140,200,0)']]) + vignette(0.5)
      + `<pattern id="cbrick" width="120" height="64" patternUnits="userSpaceOnUse"><rect width="120" height="64" fill="#8a5a8e"/>`
      + `<rect x="3" y="3" width="54" height="26" rx="10" fill="#a67aaa"/><rect x="63" y="3" width="54" height="26" rx="10" fill="#9e72a4"/><rect x="-27" y="35" width="54" height="26" rx="10" fill="#9a6ea0"/><rect x="33" y="35" width="54" height="26" rx="10" fill="#aa80ae"/><rect x="93" y="35" width="54" height="26" rx="10" fill="#9a6ea0"/>`
      + `<rect x="8" y="6" width="30" height="5" rx="2.5" fill="#fff" opacity="0.16"/><rect x="38" y="38" width="30" height="5" rx="2.5" fill="#fff" opacity="0.12"/></pattern>`
      + `<pattern id="flagC" width="90" height="90" patternUnits="userSpaceOnUse"><rect width="90" height="90" fill="#5a3058"/><rect x="3" y="3" width="84" height="84" rx="14" fill="#704068"/><rect x="10" y="9" width="40" height="7" rx="3.5" fill="#fff" opacity="0.08"/></pattern>`
      + `<pattern id="heartsC" width="40" height="40" patternUnits="userSpaceOnUse"><path d="${heartPath(20, 22, 16)}" fill="#fff" opacity="0.35"/></pattern>`;
    let val = `<path d="M0 0 H${W} V36 `; for (let x = W; x > 0; x -= 60) val += `Q${x - 30} 74 ${x - 60} 36 `; val += `Z" fill="url(#drapeC)" stroke="${INK}" stroke-width="5"/>`;
    let ruff = ''; for (let x = 0; x < W; x += 60) ruff += `<path d="M${x} 36 Q${x + 30} 74 ${x + 60} 36" fill="none" stroke="#fff" stroke-width="4" opacity="0.55" stroke-dasharray="6 6"/>`;
    const bow = (x: number, y: number) => `<path d="M${x} ${y} l-26 -16 v32z M${x} ${y} l26 -16 v32z" fill="#ff4f9a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M${x - 4} ${y + 6} l-10 30 M${x + 4} ${y + 6} l10 30" stroke="#ff4f9a" stroke-width="8"/><circle cx="${x}" cy="${y}" r="8" fill="#ff7ab8" stroke="${INK}" stroke-width="4"/>`;
    const drape = (flip: boolean) => `<g transform="${flip ? `translate(${W} 0) scale(-1 1)` : ''}"><path d="M0 0 H86 Q64 230 50 430 Q46 470 70 640 H0Z" fill="url(#drapeC)" stroke="${INK}" stroke-width="5"/>`
      + `<path d="M22 20 Q20 300 26 620 M48 20 Q40 260 40 430" stroke="#c03a78" stroke-width="4" fill="none" opacity="0.6"/>` + bow(50, 430) + `</g>`;
    const candelabra = (x: number, y: number) => `<circle cx="${x}" cy="${y - 30}" r="110" fill="url(#candle)"/>`
      + `<path d="M${x - 24} ${y - 4} Q${x - 24} ${y + 14} ${x} ${y + 14} Q${x + 24} ${y + 14} ${x + 24} ${y - 4}" fill="none" stroke="${INK}" stroke-width="9"/><path d="M${x - 24} ${y - 4} Q${x - 24} ${y + 14} ${x} ${y + 14} Q${x + 24} ${y + 14} ${x + 24} ${y - 4}" fill="none" stroke="url(#gold)" stroke-width="5"/>`
      + `<rect x="${x - 4}" y="${y - 6}" width="8" height="40" fill="url(#gold)" stroke="${INK}" stroke-width="3"/><path d="M${x - 16} ${y + 34} h32 l-6 -10 h-20z" fill="url(#gold)" stroke="${INK}" stroke-width="3"/>`
      + heartCandle(x - 24, y + 4, 0.6) + heartCandle(x, y - 12, 0.6) + heartCandle(x + 24, y + 4, 0.6);
    // Puppy's cage-bed (left): dome cage, pink bars, door swung open, cushion + bone inside
    const cx = 122, cy = 478, cw = 64, ch = 150; // half-width, height (dome included)
    const dome = `M${cx - cw} ${cy} V${cy - ch + cw} A${cw} ${cw} 0 0 1 ${cx + cw} ${cy - ch + cw} V${cy}Z`;
    let bars = ''; for (let k = -3; k <= 3; k++) { const bx = cx + k * (cw / 3.5); const top = cy - ch + cw - Math.sqrt(Math.max(0, cw * cw - (bx - cx) ** 2)); bars += `<line x1="${bx}" y1="${top}" x2="${bx}" y2="${cy}" stroke="${INK}" stroke-width="6"/><line x1="${bx}" y1="${top}" x2="${bx}" y2="${cy}" stroke="#ff8ec0" stroke-width="3"/>`; }
    const cage = `<ellipse cx="${cx}" cy="${cy + 12}" rx="${cw + 20}" ry="12" fill="#000" opacity="0.3"/><path d="${dome}" fill="#2a1030"/><path d="${dome}" fill="url(#rose)" opacity="0.25"/>`
      + `<path d="M${cx - cw + 6} ${cy} Q${cx - cw} ${cy - 40} ${cx - 30} ${cy - 40} H${cx + 30} Q${cx + cw} ${cy - 40} ${cx + cw - 6} ${cy}Z" fill="url(#cush)" stroke="${INK}" stroke-width="4"/>`
      + `<path d="M${cx - 34} ${cy - 30} Q${cx} ${cy - 38} ${cx + 34} ${cy - 30}" stroke="#fff" stroke-width="4" opacity="0.5" fill="none"/>` + bone(cx + 6, cy - 30, 0.62, -10)
      + bars + `<path d="M${cx - cw} ${cy} V${cy - ch + cw} A${cw} ${cw} 0 0 1 ${cx + cw} ${cy - ch + cw} V${cy}" fill="none" stroke="${INK}" stroke-width="10"/><path d="M${cx - cw} ${cy} V${cy - ch + cw} A${cw} ${cw} 0 0 1 ${cx + cw} ${cy - ch + cw} V${cy}" fill="none" stroke="#ff4f9a" stroke-width="5"/>`
      + `<path d="M${cx - cw} ${cy - 70} H${cx + cw}" stroke="${INK}" stroke-width="8"/><path d="M${cx - cw} ${cy - 70} H${cx + cw}" stroke="#ff4f9a" stroke-width="4"/>`
      + `<rect x="${cx - cw - 10}" y="${cy - 4}" width="${2 * cw + 20}" height="16" rx="7" fill="#ff4f9a" stroke="${INK}" stroke-width="4"/>` + heartLock(cx + cw, cy - 40, 30)
      + `<circle cx="${cx}" cy="${cy - ch - 8}" r="10" fill="none" stroke="${INK}" stroke-width="7"/><circle cx="${cx}" cy="${cy - ch - 8}" r="10" fill="none" stroke="url(#gold)" stroke-width="3.5"/>`;
    // hook rail (right): leash, fluffy cuffs, spiky-cute collar
    const rx0 = 548, ry = 372;
    const fluff = (x: number, y: number) => { let o = ''; for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; o += `<circle cx="${(x + Math.cos(t) * 17).toFixed(1)}" cy="${(y + Math.sin(t) * 17).toFixed(1)}" r="8" fill="#ffc6e0" stroke="${INK}" stroke-width="2.5"/>`; } return o + `<circle cx="${x}" cy="${y}" r="14" fill="#ffc6e0"/><circle cx="${x}" cy="${y}" r="9" fill="#a67aaa" stroke="${INK}" stroke-width="2.5"/>`; };
    const rail = `<rect x="${rx0 - 6}" y="${ry - 10}" width="172" height="20" rx="8" fill="#7a4a2a" stroke="${INK}" stroke-width="4"/>`
      + [rx0 + 22, rx0 + 82, rx0 + 142].map(x => `<path d="M${x} ${ry} v18 q0 12 -10 12" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x} ${ry} v18 q0 12 -10 12" fill="none" stroke="url(#gold)" stroke-width="4" stroke-linecap="round"/>`).join('')
      // leash
      + `<path d="M${rx0 + 14} ${ry + 30} q-16 46 6 86 q16 22 -4 44" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M${rx0 + 14} ${ry + 30} q-16 46 6 86 q16 22 -4 44" fill="none" stroke="#ff4f9a" stroke-width="6" stroke-linecap="round"/>`
      + `<ellipse cx="${rx0 + 16}" cy="${ry + 36}" rx="10" ry="14" fill="none" stroke="${INK}" stroke-width="8"/><ellipse cx="${rx0 + 16}" cy="${ry + 36}" rx="10" ry="14" fill="none" stroke="#ff4f9a" stroke-width="4"/><circle cx="${rx0 + 16}" cy="${ry + 160}" r="7" fill="url(#gold)" stroke="${INK}" stroke-width="3"/>`
      // fluffy cuffs linked by a short chain
      + `<path d="M${rx0 + 72} ${ry + 30} L${rx0 + 62} ${ry + 72} M${rx0 + 72} ${ry + 30} L${rx0 + 96} ${ry + 72}" stroke="#c9c4d6" stroke-width="4"/>` + fluff(rx0 + 60, ry + 92) + fluff(rx0 + 100, ry + 92)
      // collar with rounded studs + heart tag
      + `<circle cx="${rx0 + 132}" cy="${ry + 78}" r="30" fill="none" stroke="${INK}" stroke-width="16"/><circle cx="${rx0 + 132}" cy="${ry + 78}" r="30" fill="none" stroke="#2a1a34" stroke-width="11"/>`
      + Array.from({ length: 8 }, (_, a) => { const t = a / 8 * Math.PI * 2 + 0.4; return `<circle cx="${(rx0 + 132 + Math.cos(t) * 30).toFixed(1)}" cy="${(ry + 78 + Math.sin(t) * 30).toFixed(1)}" r="4.5" fill="#d9d4e4" stroke="${INK}" stroke-width="1.5"/>`; }).join('')
      + heart(rx0 + 132, ry + 118, 30, '#ffdf6b', INK, 3);
    // framed sampler, top-left above Puppy's corner (text in hallFx)
    const sampler = `<rect x="24" y="136" width="154" height="104" rx="10" fill="url(#gold)" stroke="${INK}" stroke-width="5"/><rect x="35" y="147" width="132" height="82" rx="6" fill="#fff4f8" stroke="#c08a30" stroke-width="2"/>`
      + `<rect x="41" y="153" width="120" height="70" rx="4" fill="none" stroke="#ff8ec0" stroke-width="2" stroke-dasharray="4 4"/>`;
    // Bunny's Rules plaque, top-right (gold frame, blush card; text in hallFx)
    const px0 = 514, py0 = 124, pw = 200, ph = 222;
    const plaque = `<rect x="${px0 + 6}" y="${py0 + 10}" width="${pw}" height="${ph}" rx="14" fill="#000" opacity="0.3"/><rect x="${px0}" y="${py0}" width="${pw}" height="${ph}" rx="14" fill="url(#gold)" stroke="${INK}" stroke-width="5"/>`
      + `<rect x="${px0 + 11}" y="${py0 + 11}" width="${pw - 22}" height="${ph - 22}" rx="8" fill="#fff0f6" stroke="#c08a30" stroke-width="3"/>`
      + `<path d="M${px0 + 30} ${py0 + 84} H${px0 + pw - 30}" stroke="#ff8ec0" stroke-width="3" stroke-dasharray="6 5"/>`
      + [[px0 + 14, py0 + 16], [px0 + pw - 14, py0 + 16], [px0 + 14, py0 + ph - 12], [px0 + pw - 14, py0 + ph - 12]].map(([x, y]) => heart(x, y, 24, '#ff4f9a', INK, 3, false)).join('');
    // heart-shaped fluffy rug (bottom centre)
    const rug = `<path d="${heartPath(360, 1238, 150)}" fill="#ff9cc8" stroke="${INK}" stroke-width="5" transform="translate(360 1238) scale(1 0.42) translate(-360 -1238)"/>`
      + `<path d="${heartPath(360, 1238, 120)}" fill="#ffc6e0" transform="translate(360 1238) scale(1 0.42) translate(-360 -1238)"/>` + bone(400, 1232, 0.6, 14);
    const body = `<rect width="${W}" height="${H}" fill="url(#cbrick)"/><rect width="${W}" height="${H}" fill="url(#wallC)" opacity="0.35"/>`
      + `<circle cx="360" cy="320" r="320" fill="url(#rose)"/>`
      + `<rect y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="url(#flagC)"/><rect y="${FLOOR}" width="${W}" height="16" fill="#000" opacity="0.35"/>`
      + `<rect y="${FLOOR - 12}" width="${W}" height="12" fill="url(#gold)" opacity="0.85"/>`
      + `<path d="${PATH}" stroke="${INK}" stroke-width="66" fill="none" stroke-linejoin="round"/><path d="${PATH}" stroke="url(#rugC)" stroke-width="54" fill="none" stroke-linejoin="round"/><path d="${PATH}" stroke="url(#heartsC)" stroke-width="54" fill="none" stroke-linejoin="round"/>`
      + `<path d="${PATH}" stroke="#fff" stroke-width="3" stroke-dasharray="12 10" fill="none" stroke-linejoin="round" opacity="0.6"/>`
      // wall shackles-as-decor: two chain swags between the drapes and the door
      + `<path d="M150 610 Q170 640 190 610" fill="none" stroke="#c9c4d6" stroke-width="5" stroke-dasharray="8 4"/><path d="M530 610 Q550 640 570 610" fill="none" stroke="#c9c4d6" stroke-width="5" stroke-dasharray="8 4"/>`
      + candelabra(200, 214) + candelabra(520, 214)
      + drape(false) + drape(true) + cage + rail + sampler + plaque + rug + val + ruff
      + `<rect width="${W}" height="${H}" fill="url(#vg)"/>`;
    return { body, defs };
}
/** Letterbox colours behind the canvas on the hall screens (top, bottom). */
export const HALL_PAGE_BG: [number, number] = [0x4a2a52, 0x3a1e3a];
