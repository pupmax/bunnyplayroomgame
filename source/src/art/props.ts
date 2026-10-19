// Props for Zoe's Hive Bonk and Nana's Acorn Barrage. SVG strings, rasterised at boot.
import { svgDoc, radial, linear, INK } from './svg';
const S = `stroke="${INK}" stroke-width="6"`;
export const PROPS: Record<string, { w: number; h: number; ox?: number; oy?: number; body: () => string; defs?: string }> = {
  // honey hive, 220x200, hole centre at (110,120)
  hive: { w: 220, h: 200, oy: 0.6, defs: linear('hv', [[0, '#ffe07a'], [0.5, '#ffbf2a'], [1, '#d98a10']]) + radial('hole', [[0, '#1a0c04'], [1, '#3a1e08']]),
    body: () => `<ellipse cx="110" cy="188" rx="96" ry="12" fill="#000" opacity="0.22"/>`
      + `<path d="M110 8 Q190 20 204 110 Q212 176 110 184 Q8 176 16 110 Q30 20 110 8Z" fill="url(#hv)" ${S}/>`
      + [52, 86, 120, 152].map((y, i) => `<path d="M${30 - i * 3} ${y} Q110 ${y + 14} ${190 + i * 3} ${y}" stroke="#b86e08" stroke-width="5" fill="none"/>`).join('')
      + `<path d="M50 40 Q70 22 100 20" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.6"/>`
      + `<ellipse cx="110" cy="122" rx="54" ry="30" fill="url(#hole)" ${S}/>`
      + `<path d="M150 170 q6 18 0 26 q-8 -6 0 -26z" fill="#ffbf2a" stroke="#b86e08" stroke-width="3"/>` },
  // front lip of the hive (drawn over Puppy so he pops out of it)
  hivelip: { w: 220, h: 200, oy: 0.6, defs: linear('hv2', [[0, '#ffcf4a'], [1, '#d98a10']]),
    body: () => `<path d="M56 122 Q110 160 164 122 Q206 128 204 150 Q196 182 110 184 Q24 182 16 150 Q14 128 56 122Z" fill="url(#hv2)" ${S}/>`
      + `<path d="M30 158 Q110 176 190 158" stroke="#b86e08" stroke-width="5" fill="none"/>` },
  pan: { w: 120, h: 220, oy: 0.85, defs: radial('pn', [[0, '#7a808c'], [1, '#2e323a']]),
    body: () => `<rect x="50" y="110" width="20" height="104" rx="9" fill="#8a5a2a" ${S}/><circle cx="60" cy="60" r="54" fill="url(#pn)" ${S}/><circle cx="60" cy="60" r="40" fill="#20232a" opacity="0.5"/><path d="M28 40 Q40 18 64 14" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.55"/>` },
  bees: { w: 160, h: 120, body: () => [[40, 40], [100, 30], [70, 80], [125, 80]].map(([x, y]) =>
      `<g><ellipse cx="${x - 6}" cy="${y - 16}" rx="12" ry="8" fill="#e8f6ff" opacity="0.85" stroke="${INK}" stroke-width="3"/><ellipse cx="${x + 8}" cy="${y - 16}" rx="12" ry="8" fill="#e8f6ff" opacity="0.85" stroke="${INK}" stroke-width="3"/>`
      + `<ellipse cx="${x}" cy="${y}" rx="20" ry="15" fill="#ffd21f" stroke="${INK}" stroke-width="4"/><path d="M${x - 6} ${y - 14} v28 M${x + 6} ${y - 14} v28" stroke="${INK}" stroke-width="5"/>`
      + `<circle cx="${x - 12}" cy="${y - 3}" r="3" fill="${INK}"/><path d="M${x - 18} ${y - 10} l8 3" stroke="${INK}" stroke-width="3"/><path d="M${x + 20} ${y} l8 0" stroke="${INK}" stroke-width="4"/></g>`).join('')
      + `<text x="80" y="118" font-family="Arial Black" font-size="22" text-anchor="middle" fill="#ff3b5a" stroke="${INK}" stroke-width="1.5">BZZ!</text>` },
  acorn: { w: 60, h: 76, defs: radial('ac', [[0, '#d98a4a'], [1, '#8a4a1a']]),
    body: () => `<path d="M10 30 Q8 70 30 72 Q52 70 50 30Z" fill="url(#ac)" ${S}/><path d="M4 30 Q4 8 30 8 Q56 8 56 30Z" fill="#6a4020" ${S}/><path d="M30 8 v-6" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M16 22 h28" stroke="#4a2a10" stroke-width="3"/><ellipse cx="20" cy="44" rx="5" ry="10" fill="#fff" opacity="0.45"/>` },
  gacorn: { w: 60, h: 76, defs: radial('gac', [[0, '#fff2b0'], [0.6, '#ffc21f'], [1, '#c07a08']]),
    body: () => `<path d="M10 30 Q8 70 30 72 Q52 70 50 30Z" fill="url(#gac)" ${S}/><path d="M4 30 Q4 8 30 8 Q56 8 56 30Z" fill="#e0a82e" ${S}/><path d="M30 8 v-6" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><ellipse cx="20" cy="44" rx="5" ry="10" fill="#fff" opacity="0.8"/>` },
  umbrella: { w: 200, h: 200, oy: 0.95, body: () => `<path d="M100 60 V180 q0 14 -14 14 q-12 0 -12 -12" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>`
      + `<path d="M10 80 Q100 -20 190 80 Q168 66 145 80 Q122 64 100 80 Q78 64 55 80 Q32 66 10 80Z" fill="#3a86ff" ${S}/>`
      + `<path d="M55 80 Q70 20 100 12 Q130 20 145 80 Q122 64 100 80 Q78 64 55 80Z" fill="#fff" opacity="0.9"/><path d="M100 12 v-10" stroke="${INK}" stroke-width="6"/>` },
  leaf: { w: 200, h: 150, oy: 0.9, body: () => `<path d="M100 146 Q10 140 8 70 Q60 4 100 6 Q150 4 192 70 Q190 140 100 146Z" fill="#4fbf3a" ${S}/><path d="M100 146 V20 M100 60 L50 40 M100 60 L150 40 M100 100 L40 84 M100 100 L160 84" stroke="#2f8f2a" stroke-width="5" fill="none"/><path d="M40 60 Q60 28 90 20" stroke="#fff" stroke-width="6" opacity="0.4" fill="none"/>` },
};
export function propSVG(key: string, k: number): string { const p = PROPS[key]; return svgDoc(p.w, p.h, p.w * k, p.h * k, p.body(), p.defs || ''); }
