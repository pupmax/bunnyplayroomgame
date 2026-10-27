// Chibi animal-lady heads/bodies for the Playroom cast (SVG-in-code, house outline style).
import { svgDoc, radial, linear, star } from './svg';
const OUT = '#2a2120';
export interface Chibi { name: string; animal: string; fur: string; furD: string; inner: string; ears: 'pointy' | 'round' | 'long' | 'horse' | 'sheep' | 'tufted' | 'bunny';
  outfit: string; acc: string; quip: string; mask?: boolean; wool?: boolean; beak?: boolean; }
export const CAST: Chibi[] = [
  { name: 'Ruby', animal: 'sheep', fur: '#fff4f0', furD: '#e6cfc8', inner: '#ffc2cf', ears: 'sheep', outfit: '#e0243a', acc: 'bow', wool: true, quip: 'Baa-ttle time, sweetie!' },
  { name: 'Glassia', animal: 'horse', fur: '#f0c7a0', furD: '#c48a5c', inner: '#f6a5a5', ears: 'horse', outfit: '#2f9e5b', acc: 'mane', quip: 'Neigh chance you stop this!' },
  { name: 'Zoe', animal: 'bear', fur: '#b07a4a', furD: '#7c5030', inner: '#e8b48a', ears: 'round', outfit: '#ff8a1f', acc: 'band', quip: 'Bear hugs are mandatory.' },
  { name: 'Nana', animal: 'squirrel', fur: '#e08a3c', furD: '#a85a1e', inner: '#ffd2a8', ears: 'tufted', outfit: '#3a86ff', acc: 'acorn', quip: 'Nuts about winning!' },
  { name: 'Midnight', animal: 'raven', fur: '#3b3f5c', furD: '#1d1f33', inner: '#6b6fa0', ears: 'tufted', outfit: '#6b4cc9', acc: 'moon', beak: true, quip: 'Caw-ffee first. Then doom.' },
  { name: 'Noir', animal: 'black cat', fur: '#3a3438', furD: '#1b171a', inner: '#ff9db3', ears: 'pointy', outfit: '#222', acc: 'butterfly', quip: 'I nap. I judge. I win.' },
  { name: 'Iris', animal: 'raccoon', fur: '#a9a3ad', furD: '#6d6672', inner: '#efe6f2', ears: 'pointy', outfit: '#8a3ffc', acc: 'goggles', mask: true, quip: 'Your snacks are mine now.' },
  { name: 'Linye', animal: 'hedgehog', fur: '#b49cf0', furD: '#6a4cc0', inner: '#ffc2dc', ears: 'round', outfit: '#2a1a4a', acc: 'spines', quip: '...you are not ready.' },
];
export const BUNNY_INFO = { name: 'Bunny', quip: 'The grand finale is MINE. Yee-haw, Puppy!' };
export type Mood = 'smug' | 'happy' | 'dizzy' | 'angry' | 'windup';

// ---- Upgraded head art (v2): soft gradient shading, rim light, variable-weight ink, glossy eyes. ----
const EYE: Record<string, string> = { Ruby: '#b0476e', Glassia: '#3f8a4c', Midnight: '#7a5ce0', Noir: '#e2a91c', Zoe: '#7a4422', Nana: '#a8621c', Iris: '#9a55ff', Linye: '#6a3fd0' };
const RIM: Record<string, string> = { Ruby: '#ffd6e0', Glassia: '#ffe9c8', Midnight: '#a9b4ff', Noir: '#c9a6ff', Zoe: '#ffd29a', Nana: '#ffe08a', Iris: '#e6d6ff', Linye: '#b78cff' };
const isL = (_c: Chibi) => false; // Linye is now a regular cute hedgehog (no shadow styling)
const p1 = (n: number) => n.toFixed(1);
/** Open arc along an ellipse (degrees, 0 = right, 90 = down). */
function arcE(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): string {
  const pt = (a: number) => `${p1(cx + Math.cos(a * Math.PI / 180) * rx)} ${p1(cy + Math.sin(a * Math.PI / 180) * ry)}`;
  return `M${pt(a0)} A${rx} ${ry} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${pt(a1)}`;
}
/** Thicker ink on the shadow (lower-right) side for a hand-inked, variable-weight outline. */
function heavy(cx: number, cy: number, rx: number, ry: number, w = 4): string {
  return `<path d="${arcE(cx, cy, rx, ry, 10, 140)}" fill="none" stroke="${OUT}" stroke-width="${w + 5}" stroke-linecap="round"/>`;
}
function rim(c: Chibi, cx: number, cy: number, rx: number, ry: number): string {
  return `<path d="${arcE(cx, cy, rx - 6, ry - 6, -10, 70)}" fill="none" stroke="${RIM[c.name]}" stroke-opacity="${isL(c) ? 0.6 : 0.75}" stroke-width="3.5" stroke-linecap="round"/>`;
}

function ears(c: Chibi): string {
  const f = `fill="url(#ef_${c.name})" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"`, i = `fill="url(#ei_${c.name})"`;
  const r = `fill="none" stroke="${RIM[c.name]}" stroke-opacity="0.7" stroke-width="3" stroke-linecap="round"`;
  switch (c.ears) {
    case 'pointy': return `<path d="M40 70 Q44 30 52 8 Q74 26 92 50Z" ${f}/><path d="M160 70 Q156 30 148 8 Q126 26 108 50Z" ${f}/><path d="M55 52 Q56 34 59 24 Q70 34 78 46Z" ${i}/><path d="M145 52 Q144 34 141 24 Q130 34 122 46Z" ${i}/>`
      + `<path d="M154 58 Q152 34 148 18" ${r}/><g stroke="${OUT}" stroke-width="1.6" stroke-linecap="round" opacity="0.5"><path d="M62 44 l4 -10 M68 46 l2 -8 M138 44 l-4 -10 M132 46 l-2 -8"/></g>`;
    case 'round': return `<circle cx="46" cy="44" r="26" ${f}/><circle cx="154" cy="44" r="26" ${f}/><circle cx="47" cy="46" r="13" ${i}/><circle cx="153" cy="46" r="13" ${i}/>`
      + `<path d="${arcE(154, 44, 20, 20, -60, 20)}" ${r}/><path d="${arcE(46, 44, 20, 20, 200, 260)}" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round"/>`;
    case 'horse': return `<path d="M50 60 Q40 10 70 18 Q80 40 82 52Z" ${f}/><path d="M150 60 Q160 10 130 18 Q120 40 118 52Z" ${f}/><path d="M56 52 Q52 26 67 26 Q73 40 74 50Z" ${i}/><path d="M144 52 Q148 26 133 26 Q127 40 126 50Z" ${i}/><path d="M148 48 Q152 28 138 22" ${r}/>`;
    case 'sheep': return `<ellipse cx="22" cy="92" rx="26" ry="13" transform="rotate(-20 22 92)" ${f}/><ellipse cx="178" cy="92" rx="26" ry="13" transform="rotate(20 178 92)" ${f}/><ellipse cx="24" cy="93" rx="16" ry="6" transform="rotate(-20 24 93)" ${i}/><ellipse cx="176" cy="93" rx="16" ry="6" transform="rotate(20 176 93)" ${i}/>`;
    case 'tufted': return `<path d="M44 66 L44 4 L60 20 L66 0 L88 50Z" ${f}/><path d="M156 66 L156 4 L140 20 L134 0 L112 50Z" ${f}/>`
      + `<g fill="none" stroke="${c.furD}" stroke-width="2" stroke-linecap="round" opacity="0.8"><path d="M52 52 L50 16 M60 46 L62 22 M68 44 L66 10 M148 52 L150 16 M140 46 L138 22 M132 44 L134 10"/></g>`
      + `<path d="M152 54 L152 16" ${r}/><path d="M138 30 L135 10" ${r}/>`;
    case 'long': return `<path d="M62 60 Q46 -40 84 -10 Q92 30 88 56Z" ${f}/><path d="M138 60 Q154 -40 116 -10 Q108 30 112 56Z" ${f}/><path d="M134 52 Q140 0 120 -6" ${r}/><path d="M66 52 Q60 0 80 -6" ${r}/>`;
    default: return '';
  }
}
function eyes(mood: Mood, c: Chibi): string {
  const L = 72, R = 128, Y = 108;
  if (mood === 'dizzy') return [L, R].map(x => `<path d="M${x - 11} ${Y - 11} L${x + 11} ${Y + 11} M${x + 11} ${Y - 11} L${x - 11} ${Y + 11}" stroke="${isL(c) ? '#e9dcff' : OUT}" stroke-width="6.5" stroke-linecap="round"/>`).join('');
  if (mood === 'happy') return [L, R].map(x => `<path d="M${x - 14} ${Y + 4} Q${x} ${Y - 15} ${x + 14} ${Y + 4} Q${x} ${Y - 7} ${x - 14} ${Y + 4}Z" fill="${isL(c) ? '#e9dcff' : OUT}" stroke="${isL(c) ? '#e9dcff' : OUT}" stroke-width="3" stroke-linejoin="round"/>`).join('');
  const lidC = isL(c) ? c.fur : c.fur;
  const lid = mood === 'smug' ? [L, R].map(x => `<path d="M${x - 19} ${Y - 22} H${x + 19} V${Y - 9} Q${x} ${Y - 13} ${x - 19} ${Y - 9}Z" fill="${lidC}"/><path d="M${x - 17} ${Y - 9} Q${x} ${Y - 13} ${x + 17} ${Y - 9}" fill="none" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>`).join('') : '';
  const brow = mood === 'angry' || mood === 'windup' ? `<path d="M${L - 18} ${Y - 31} Q${L} ${Y - 28} ${L + 14} ${Y - 17} M${R + 18} ${Y - 31} Q${R} ${Y - 28} ${R - 14} ${Y - 17}" fill="none" stroke="${isL(c) ? '#e9dcff' : OUT}" stroke-width="6.5" stroke-linecap="round"/>` : '';
  if (isL(c)) return [L, R].map(x => `<ellipse cx="${x}" cy="${Y}" rx="22" ry="25" fill="url(#eg_Linye)"/><ellipse cx="${x}" cy="${Y}" rx="13" ry="17" fill="#f6efff"/><ellipse cx="${x + 4}" cy="${Y - 6}" rx="4" ry="5" fill="#fff"/>`).join('') + lid + brow;
  const one = (x: number, s: number) =>
    `<ellipse cx="${x}" cy="${Y}" rx="15.5" ry="19.5" fill="${OUT}"/>`
    + `<ellipse cx="${x}" cy="${Y + 1}" rx="12.5" ry="16.5" fill="url(#ir_${c.name})"/>`
    + `<ellipse cx="${x}" cy="${Y + 3}" rx="6.5" ry="9" fill="#120c0b"/>`
    + `<path d="M${x - 10} ${Y + 9} Q${x} ${Y + 16} ${x + 10} ${Y + 9}" fill="none" stroke="${EYE[c.name]}" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>`
    + `<path d="M${x - 12} ${Y - 6} Q${x} ${Y - 18} ${x + 12} ${Y - 6}" fill="${OUT}" opacity="0.35"/>`
    + `<ellipse cx="${x + 5 * s}" cy="${Y - 7}" rx="5.5" ry="6.5" fill="#fff"/>`
    + `<circle cx="${x - 5 * s}" cy="${Y + 7}" r="2.8" fill="#fff"/>`
    + `<circle cx="${x + 7 * s}" cy="${Y + 5}" r="1.5" fill="#fff" opacity="0.85"/>`;
  const lash = `<path d="M${L - 15} ${Y - 14} Q${L - 21} ${Y - 18} ${L - 25} ${Y - 23} Q${L - 20} ${Y - 19} ${L - 13} ${Y - 18}Z M${R + 15} ${Y - 14} Q${R + 21} ${Y - 18} ${R + 25} ${Y - 23} Q${R + 20} ${Y - 19} ${R + 13} ${Y - 18}Z" fill="${OUT}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>`;
  return one(L, 1) + one(R, 1) + lash + lid + brow;
}
function mouth(mood: Mood, c: Chibi): string {
  let snout = '';
  if (c.beak) snout = `<path d="M85 123 Q100 120 115 123 Q108 138 100 147 Q92 138 85 123Z" fill="url(#bk)" stroke="${OUT}" stroke-width="4.5" stroke-linejoin="round"/><path d="M90 126 Q98 124 104 125" stroke="#fff" stroke-opacity="0.75" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  else if (c.animal === 'horse') snout = `<path d="M58 136 Q56 196 100 198 Q144 196 142 136 Q100 120 58 136Z" fill="url(#mz)" stroke="${OUT}" stroke-width="5"/><path d="M140 140 Q144 190 104 198" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/><path d="M68 142 Q90 132 112 134" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="84" cy="168" rx="6" ry="8" fill="${OUT}"/><ellipse cx="116" cy="168" rx="6" ry="8" fill="${OUT}"/><circle cx="82" cy="165" r="1.8" fill="#fff" opacity="0.6"/><circle cx="114" cy="165" r="1.8" fill="#fff" opacity="0.6"/>`;
  else if (c.animal === 'hedgehog') snout = `<ellipse cx="100" cy="133" rx="21" ry="14" fill="#f3e6ff" stroke="${OUT}" stroke-width="3.5"/><path d="M84 128 Q92 122 102 123" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="100" cy="126" rx="8" ry="6" fill="#3a2224" stroke="${OUT}" stroke-width="1.5"/><ellipse cx="97.5" cy="124.5" rx="2.6" ry="1.5" fill="#fff" opacity="0.75"/>`;
  else snout = `<path d="M91 127 Q100 123 109 127 Q108 134 100 136 Q92 134 91 127Z" fill="#3a2224" stroke="${OUT}" stroke-width="1.5"/><ellipse cx="97" cy="127.5" rx="3" ry="1.6" fill="#fff" opacity="0.7"/>`;
  const my = c.animal === 'horse' ? 184 : c.animal === 'hedgehog' ? 157 : 146;
  const ink = isL(c) ? '#e9dcff' : OUT;
  const m = mood === 'happy' || mood === 'windup' ? `<path d="M84 ${my - 4} Q100 ${my + 17} 116 ${my - 4}Z" fill="#b8284a" stroke="${ink}" stroke-width="4.5" stroke-linejoin="round"/><path d="M92 ${my + 5} Q100 ${my + 1} 108 ${my + 5} Q100 ${my + 11} 92 ${my + 5}Z" fill="#ff8aa6"/>`
    : mood === 'dizzy' ? `<path d="M86 ${my} q7 -8 14 0 q7 8 14 0" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="112" cy="${my + 8}" rx="5" ry="8" fill="#ff7aa0" stroke="${OUT}" stroke-width="1.5"/>`
    : mood === 'angry' ? `<path d="M88 ${my + 4} Q100 ${my - 6} 112 ${my + 4}" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`
    : `<path d="M88 ${my - 2} Q104 ${my + 8} 116 ${my - 6}" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`;
  return snout + (c.beak || (isL(c) && mood !== 'happy' && mood !== 'windup') ? '' : m);
}
function acc(c: Chibi): string {
  const sh = (d: string, w = 3) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="${w}" stroke-linecap="round"/>`;
  switch (c.acc) {
    case 'bow': return `<path d="M100 40 Q82 22 70 24 Q64 42 72 58 Q86 52 100 40Z M100 40 Q118 22 130 24 Q136 42 128 58 Q114 52 100 40Z" fill="url(#ac_${c.name})" stroke="${OUT}" stroke-width="4.5" stroke-linejoin="round"/>`
      + `<path d="M76 32 Q86 32 94 40 M124 32 Q114 32 106 40" fill="none" stroke="#a0153a" stroke-width="2" opacity="0.6"/>` + sh('M74 30 Q72 38 74 46') + sh('M126 30 Q128 36 127 42', 2)
      + `<circle cx="100" cy="40" r="9" fill="#ff7aa0" stroke="${OUT}" stroke-width="4"/><circle cx="97" cy="37" r="2.5" fill="#fff" opacity="0.8"/>`;
    case 'mane': return `<g fill="url(#hr_${c.name})" stroke="${OUT}" stroke-width="4.5" stroke-linejoin="round"><path d="M150 50 Q178 70 172 110 Q186 140 166 170 Q170 130 152 120 Q166 92 140 78Z"/><path d="M56 60 Q60 14 104 10 Q150 8 160 50 Q140 40 128 62 Q118 42 100 64 Q90 44 76 70 Q68 56 56 60Z"/></g>`
      + `<g fill="none" stroke="#4e2a10" stroke-width="2" stroke-linecap="round" opacity="0.7"><path d="M70 50 Q80 30 100 22 M92 52 Q104 30 124 24 M120 50 Q132 32 150 38 M158 80 Q170 100 162 118 M160 132 Q172 148 166 164"/></g>`
      + `<path d="M78 30 Q104 14 134 24" fill="none" stroke="#e6a76a" stroke-width="5" stroke-linecap="round" opacity="0.9"/><path d="M90 24 Q102 19 112 19" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="2.5" stroke-linecap="round"/><path d="M164 92 Q172 104 168 114" fill="none" stroke="#e6a76a" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'moon': return `<path d="M120 18 a18 18 0 1 0 18 26 a14 14 0 1 1 -18 -26Z" fill="url(#ac_${c.name})" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>` + sh('M112 26 Q106 36 110 46', 2.5)
      + star(146, 16, 5, '#fff3b0', OUT, 2);
    case 'beret': return `<ellipse cx="88" cy="40" rx="48" ry="16" transform="rotate(-12 88 40)" fill="url(#ac_${c.name})" stroke="${OUT}" stroke-width="4.5"/>`
      + `<path d="M48 52 Q88 60 132 36" fill="none" stroke="#7a1428" stroke-width="3" opacity="0.6"/>` + sh('M58 38 Q74 28 96 26', 3.5)
      + `<path d="M84 26 Q86 18 90 16" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/><circle cx="84" cy="24" r="5" fill="#c2304a" stroke="${OUT}" stroke-width="3"/>`;
    case 'butterfly': {
      const w = (sx: number) => `<path d="M100 34 Q${100 + sx * 20} 10 ${100 + sx * 26} 22 Q${100 + sx * 28} 36 100 38Z" fill="url(#ac_${c.name})" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>`
        + `<path d="M100 38 Q${100 + sx * 22} 40 ${100 + sx * 18} 52 Q${100 + sx * 8} 54 100 40Z" fill="url(#ac_${c.name})" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>`
        + `<circle cx="${100 + sx * 17}" cy="24" r="3" fill="#e6f4ff"/><circle cx="${100 + sx * 12}" cy="47" r="2" fill="#e6f4ff"/>`;
      return `<g transform="translate(18 12) rotate(12 100 40)">${w(-1)}${w(1)}<ellipse cx="100" cy="40" rx="3.5" ry="11" fill="${OUT}"/>`
        + `<path d="M99 30 Q94 18 89 16 M101 30 Q106 18 111 16" fill="none" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/><circle cx="89" cy="16" r="2.4" fill="${OUT}"/><circle cx="111" cy="16" r="2.4" fill="${OUT}"/>`
        + sh('M88 22 Q84 26 85 30', 2) + `</g>`;
    }
    case 'band': return `<path d="M40 70 Q100 40 160 70 L160 84 Q100 54 40 84Z" fill="url(#ac_${c.name})" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>` + sh('M52 70 Q100 48 148 70', 2.5)
      + `<g fill="#fff" opacity="0.85"><circle cx="70" cy="66" r="2.5"/><circle cx="100" cy="58" r="2.5"/><circle cx="130" cy="66" r="2.5"/></g>`;
    case 'acorn': return `<ellipse cx="132" cy="44" rx="13" ry="16" fill="url(#ac_${c.name})" stroke="${OUT}" stroke-width="4"/>` + sh('M126 40 Q125 48 128 54', 2.5)
      + `<path d="M116 36 Q132 20 148 36 Q132 40 116 36Z" fill="#7a4520" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/><path d="M122 32 l4 2 M130 28 l2 4 M138 30 l-1 4" stroke="#a8652e" stroke-width="2" stroke-linecap="round"/><path d="M132 26 Q134 20 138 18" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'goggles': return `<path d="M44 64 H156" stroke="${OUT}" stroke-width="11" stroke-linecap="round"/><path d="M44 64 H156" stroke="#6a4c9c" stroke-width="7" stroke-linecap="round"/>`
      + [78, 122].map(x => `<circle cx="${x}" cy="62" r="13" fill="url(#gg)" stroke="${OUT}" stroke-width="4"/><circle cx="${x}" cy="62" r="9.5" fill="none" stroke="#c9b8e6" stroke-width="2"/><path d="M${x - 7} ${58} Q${x - 4} ${52} ${x + 2} ${52}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="${x + 6}" cy="${67}" r="1.6" fill="#fff"/>`).join('');
    default: return '';
  }
}
/** Small fur forelock with strand lines and a shine streak, sitting at the top of the face. */
function forelock(c: Chibi, fy: number, ry: number): string {
  if (c.wool || c.animal === 'horse' || c.animal === 'hedgehog' || isL(c)) return '';
  const t = fy - ry;
  return `<path d="M84 ${t + 4} Q92 ${t - 12} 104 ${t - 6} Q100 ${t + 2} 110 ${t + 4} Q104 ${t + 18} 96 ${t + 12} Q90 ${t + 20} 84 ${t + 4}Z" fill="url(#hr_${c.name})" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>`
    + `<path d="M92 ${t + 2} Q96 ${t - 4} 102 ${t - 3}" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"/>`
    + `<path d="M90 ${t + 10} Q94 ${t + 4} 98 ${t + 1}" fill="none" stroke="${c.furD}" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>`;
}
/** Head body markup in a 200x200 box. */
export function headBody(c: Chibi, mood: Mood = 'smug'): string {
  const g = `url(#hf_${c.name})`, L = isL(c);
  const [fx, fy, rx, ry] = c.wool ? [100, 116, 58, 56] : c.animal === 'horse' ? [100, 116, 62, 72] : [100, 110, 70, 64];
  let face = `${heavy(fx, fy, rx, ry)}<ellipse cx="${fx}" cy="${fy}" rx="${rx}" ry="${ry}" fill="${g}" stroke="${OUT}" stroke-width="5.5"/>`;
  if (c.wool) {
    const puffs = [[60, 60], [100, 46], [140, 60], [44, 100], [156, 100]];
    face = `<g stroke="${OUT}" stroke-width="5.5">${puffs.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="28" fill="url(#wl_${c.name})"/>`).join('')}</g>`
      + `<path d="${arcE(156, 100, 28, 28, 20, 120)}" fill="none" stroke="${OUT}" stroke-width="8" stroke-linecap="round"/>`
      + face.replace(g, `url(#hf_${c.name})`)
      + `<g>${[[66, 66], [100, 56], [134, 66]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24" fill="url(#wl_${c.name})"/>`).join('')}</g>`
      + `<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.85">${[[60, 60], [100, 46], [140, 60], [44, 100], [66, 66], [100, 56], [134, 66]].map(([x, y]) => `<path d="M${x - 12} ${y - 6} Q${x - 6} ${y - 14} ${x + 2} ${y - 13}"/>`).join('')}</g>`
      + `<g fill="none" stroke="${c.furD}" stroke-width="2" stroke-linecap="round">${[[66, 66], [100, 56], [134, 66], [156, 100]].map(([x, y]) => `<path d="M${x + 2} ${y + 6} a5 5 0 1 0 6 -6"/>`).join('')}</g>`;
  }
  const mask = c.mask ? `<path d="M40 108 Q72 82 100 104 Q128 82 160 108 Q130 128 100 116 Q70 128 40 108Z" fill="url(#mk)"/><path d="M48 104 Q72 88 96 102" fill="none" stroke="#8a8094" stroke-width="2" stroke-linecap="round" opacity="0.7"/>` : '';
  const blush = L || c.animal === 'horse' ? '' : [56, 144].map(x => `<ellipse cx="${x}" cy="134" rx="13" ry="8" fill="url(#bl)"/><path d="M${x - 6} 136 l3 -5 M${x} 136 l3 -5 M${x + 6} 136 l3 -5" stroke="#ff6f92" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>`).join('');
  const shade = L ? rim(c, fx, fy, rx, ry) :
    `<ellipse cx="${fx}" cy="${fy}" rx="${rx - 3}" ry="${ry - 3}" fill="url(#ao_${c.name})"/>`
    + rim(c, fx, fy, rx, ry)
    + `<path d="M${p1(fx - rx * 0.8)} ${p1(fy - ry * 0.3)} Q${p1(fx - rx * 0.6)} ${p1(fy - ry * 0.86)} ${fx} ${p1(fy - ry * 0.93)}" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="4" stroke-linecap="round"/>`
    + `<ellipse cx="${p1(fx - rx * 0.4)}" cy="${p1(fy - ry * 0.58)}" rx="${p1(rx * 0.2)}" ry="${p1(ry * 0.1)}" fill="#fff" opacity="0.4" transform="rotate(-25 ${p1(fx - rx * 0.4)} ${p1(fy - ry * 0.58)})"/>`
    + (c.wool ? '' : `<g stroke="${OUT}" stroke-width="2.5" stroke-linecap="round" opacity="0.55"><path d="M${fx - rx + 4} ${fy + 8} l-8 6 M${fx - rx + 6} ${fy + 20} l-9 3 M${fx + rx - 4} ${fy + 8} l8 6 M${fx + rx - 6} ${fy + 20} l9 3"/></g>`);
  const ao = `<ellipse cx="${fx}" cy="${fy + ry + 2}" rx="${rx * 0.7}" ry="8" fill="${L ? '#7a4cff' : '#000'}" opacity="${L ? 0.3 : 0.18}"/>`;
  const glow = L ? `<circle cx="100" cy="100" r="100" fill="url(#gl_Linye)"/>` : '';
  const spines = c.acc === 'spines' ? (() => {
    const row = (n: number, a0: number, a1: number, len: number, fill: string) => {
      const out: string[] = [], hi: string[] = [];
      for (let i = 0; i < n; i++) {
        const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180, b = 0.17;
        const P = (r: number, t: number) => `${p1(fx + Math.cos(a + t) * r)} ${p1(fy + Math.sin(a + t) * r)}`;
        out.push(`M${P(rx - 8, -b)} Q${P(rx + len * 0.5, -b * 0.5)} ${P(rx + len, 0.04)} Q${P(rx + len * 0.45, b * 0.7)} ${P(rx - 8, b)}Z`);
        hi.push(`M${P(rx + 2, -b * 0.35)} Q${P(rx + len * 0.45, -b * 0.25)} ${P(rx + len * 0.75, -0.02)}`);
      }
      return `<path d="${out.join(' ')}" fill="${fill}" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/><path d="${hi.join(' ')}" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round"/>`;
    };
    return row(16, 150, 390, 30, c.furD) + row(15, 158, 382, 20, `url(#hr_${c.name})`);
  })() : '';
  return glow + ao + spines + ears(c) + face + shade + mask + forelock(c, fy, ry) + blush + eyes(mood, c) + mouth(mood, c) + acc(c);
}
const mix = (a: string, b: string, t: number) => {
  const h = (s: string) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const A = h(a.length === 4 ? '#' + [...a.slice(1)].map(x => x + x).join('') : a), B = h(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
export function headDefs(c: Chibi): string {
  const L = isL(c), n = c.name;
  const hl = L ? '#2a2236' : mix(c.fur, '#ffffff', 0.55);
  let d = radial(`hf_${n}`, [[0, hl], [0.25, c.fur], [0.7, c.fur], [1, L ? '#05030a' : mix(c.fur, c.furD, 0.85)]], 0.38, 0.3, 0.8)
    + radial(`ao_${n}`, [[0, 'rgba(0,0,0,0)'], [0.68, 'rgba(0,0,0,0)'], [1, 'rgba(60,10,30,0.26)']], 0.4, 0.34, 0.72)
    + linear(`ef_${n}`, [[0, mix(c.fur, '#ffffff', L ? 0.06 : 0.3)], [0.55, c.fur], [1, mix(c.fur, c.furD, 0.7)]])
    + linear(`ei_${n}`, [[0, mix(c.inner, '#ffffff', 0.3)], [1, mix(c.inner, '#c0306a', L ? 0 : 0.25)]])
    + linear(`hr_${n}`, [[0, mix(c.acc === 'mane' ? '#7a4520' : c.fur, '#ffffff', 0.25)], [0.5, c.acc === 'mane' ? '#7a4520' : c.fur], [1, c.acc === 'mane' ? '#4e2a10' : c.furD]])
    + radial(`ir_${n}`, [[0, mix(EYE[n], '#ffffff', 0.35)], [0.55, EYE[n]], [1, mix(EYE[n], '#000000', 0.6)]], 0.5, 0.7, 0.75)
    + radial(`wl_${n}`, [[0, '#ffffff'], [0.6, c.fur], [1, c.furD]], 0.4, 0.35, 0.75)
    + radial('bl', [[0, 'rgba(255,120,150,0.75)'], [1, 'rgba(255,140,170,0)']], 0.5, 0.5, 0.5)
    + linear('bk', [[0, '#ffd27a'], [0.5, '#ffb02e'], [1, '#d8801a']])
    + linear('mz', [[0, '#fbe8d6'], [1, '#e6c3a2']])
    + linear('mk', [[0, '#4a4252'], [1, '#2a2430']])
    + radial('gg', [[0, '#d8f6ff'], [0.6, '#9be7ff'], [1, '#4fb6e0']], 0.4, 0.35, 0.7)
    + linear(`out_${n}`, [[0, '#ffffff'], [0.12, c.outfit], [1, '#000000']])
    + linear(`outB_${n}`, [[0, c.outfit], [1, c.outfit]]);
  const ac: Record<string, [string, string, string]> = { butterfly: ['#9fd8ff', '#3a9cf0', '#1a5cc0'], bow: ['#ff7a9a', '#ff3b6b', '#c41a48'], moon: ['#fff3b0', '#ffe27a', '#e8b23a'], beret: ['#e85a72', '#c2304a', '#8a1a30'], band: ['#ff9ab6', '#ff5c8a', '#d8366a'], acorn: ['#e8a060', '#c27230', '#8a4a18'] };
  if (ac[c.acc]) d += linear(`ac_${n}`, [[0, ac[c.acc][0]], [0.5, ac[c.acc][1]], [1, ac[c.acc][2]]]);
  if (L) d += radial('gl_Linye', [[0, 'rgba(150,100,255,0.55)'], [0.5, 'rgba(120,70,230,0.25)'], [1, 'rgba(90,40,200,0)']], 0.5, 0.5, 0.5)
    + radial('eg_Linye', [[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(200,170,255,0.55)'], [1, 'rgba(160,110,255,0)']], 0.5, 0.5, 0.5);
  return d;
}
export function chibiHeadSVG(c: Chibi, mood: Mood, k: number): string {
  return svgDoc(220, 220, 220 * k, 220 * k, `<g transform="translate(10 14)">${headBody(c, mood)}</g>`, headDefs(c));
}
/** Full chibi: big head on a small bean body. kit: 'box' (gloves+robe) | 'ball' (jersey) | 'plain'. 240x340 box, feet at 334. */
export function chibiFullSVG(c: Chibi, mood: Mood, kit: 'box' | 'ball' | 'plain' | 'flop', k: number): string {
  const o = c.outfit;
  // torso top tucks up under the head (y 222, was 240) so every girl's body joins her head on the end cards (no gap at the neck)
  let body = `<path d="M70 300 L82 250 Q120 236 158 250 L170 300Z" fill="${o}" stroke="${OUT}" stroke-width="6"/>`
    + `<ellipse cx="94" cy="318" rx="20" ry="14" fill="${c.furD}" stroke="${OUT}" stroke-width="6"/><ellipse cx="146" cy="318" rx="20" ry="14" fill="${c.furD}" stroke="${OUT}" stroke-width="6"/>`
    + `<rect x="82" y="222" width="76" height="84" rx="30" fill="${o}" stroke="${OUT}" stroke-width="6"/>`
    + `<rect x="85" y="225" width="70" height="78" rx="27" fill="url(#out_${c.name})" opacity="0.35"/>`
    + `<path d="M90 246 Q94 236 106 234" stroke="#fff" stroke-opacity="0.6" stroke-width="4" fill="none" stroke-linecap="round"/>`
    + `<ellipse cx="120" cy="330" rx="70" ry="8" fill="#000" opacity="0.2"/>`;
  if (kit === 'ball') body += `<text x="120" y="292" font-family="Arial Black" font-size="34" text-anchor="middle" fill="#fff" stroke="${OUT}" stroke-width="2">7</text>`;
  const glove = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="30" fill="#e0243a" stroke="${OUT}" stroke-width="6"/><circle cx="${x + 4}" cy="${y + 5}" r="22" fill="#9a0f22" opacity="0.45"/><ellipse cx="${x - 9}" cy="${y - 11}" rx="11" ry="7" fill="#fff" opacity="0.7"/><rect x="${x - 18}" y="${y + 22}" width="36" height="14" rx="5" fill="#fff" stroke="${OUT}" stroke-width="5"/>`;
  let arms = '';
  if (c.animal === 'raven' && kit === 'plain') { // Midnight: soft round body tucked up under her head, little wing-arms at her sides, cute bird feet
    const feet = [96, 144].map((x, i) => { const s = i ? 1 : -1; return `<g transform="translate(${x} 318)"><path d="M0 -14 L0 -2" stroke="${OUT}" stroke-width="11" stroke-linecap="round"/><path d="M0 -14 L0 -2" stroke="#ffb02e" stroke-width="5" stroke-linecap="round"/>`
      + `<path d="M${-17 + s * 2} 8 Q-10 -6 0 -4 Q10 -6 ${17 + s * 2} 8 Q9 4 6 10 Q0 3 -6 10 Q-9 4 ${-17 + s * 2} 8Z" fill="url(#bk)" stroke="${OUT}" stroke-width="4.5" stroke-linejoin="round"/>`
      + `<path d="M-9 0 Q-4 -3 1 -2" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="2.5" stroke-linecap="round"/></g>`; }).join('');
    body = `<ellipse cx="120" cy="332" rx="62" ry="8" fill="#000" opacity="0.2"/>` + feet
      + `<path d="M120 204 C170 204 184 246 180 274 C176 304 152 320 120 320 C88 320 64 304 60 274 C56 246 70 204 120 204Z" fill="url(#hf_${c.name})" stroke="${OUT}" stroke-width="6"/>`
      + `<path d="M120 236 C146 236 158 256 156 278 C154 298 140 310 120 310 C100 310 86 298 84 278 C82 256 94 236 120 236Z" fill="${c.inner}" opacity="0.85"/>`
      + `<path d="M120 232 C150 232 162 250 160 262 L80 262 C78 250 90 232 120 232Z" fill="${o}" stroke="${OUT}" stroke-width="4.5"/>` // little purple moon cape-collar
      + `<circle cx="120" cy="262" r="7" fill="url(#ac_${c.name})" stroke="${OUT}" stroke-width="3"/>`
      + `<path d="M98 284 q6 5 12 0 M120 292 q6 5 12 0" fill="none" stroke="${c.furD}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`
      + `<path d="M74 262 Q78 236 98 228" stroke="#fff" stroke-opacity="0.45" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    const up = mood === 'happy' || mood === 'windup', wing = (s: number) => { const x = 120 + s * 56, r = s * (up ? -38 : -10);
      return `<g transform="translate(${x} 250) rotate(${r})"><path d="M0 0 C${s * 26} 2 ${s * 34} 30 ${s * 30} 52 C${s * 26} 62 ${s * 20} 56 ${s * 16} 50 C${s * 14} 60 ${s * 6} 60 ${s * 4} 50 C${s * -2} 56 ${s * -8} 50 ${s * -6} 40 C${s * -10} 22 ${s * -8} 6 0 0Z" fill="${c.fur}" stroke="${OUT}" stroke-width="5.5" stroke-linejoin="round"/>`
        + `<path d="M${s * 4} 10 C${s * 16} 14 ${s * 22} 30 ${s * 22} 44" fill="none" stroke="${c.inner}" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/><path d="M${s * 2} 8 C${s * 10} 6 ${s * 16} 10 ${s * 20} 16" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/></g>`; };
    arms = wing(-1) + wing(1);
  } else if (kit === 'box') arms = mood === 'windup' ? glove(40, 150) + glove(200, 250) : glove(64, 236) + glove(176, 236);
  else arms = `<ellipse cx="72" cy="270" rx="14" ry="24" fill="${c.fur}" stroke="${OUT}" stroke-width="6"/><ellipse cx="168" cy="270" rx="14" ry="24" fill="${c.fur}" stroke="${OUT}" stroke-width="6"/>`;
  let stars = '';
  if (mood === 'dizzy') stars = [[60, 20], [120, 0], [180, 20]].map(([x, y]) => star(x, y + 20, 14)).join('');
  const head = `<g transform="translate(16 46) scale(1.04)">${headBody(c, mood)}</g>`;
  if (c.animal === 'raven' && kit === 'plain') return svgDoc(240, 340, 240 * k, 340 * k, body + arms + head + stars, headDefs(c)); // her wings sit at her sides, under the head
  const inner = kit === 'flop' ? `<g transform="rotate(-80 120 300) translate(0 40)">${body}${arms}${head}</g>` : body + head + arms;
  return svgDoc(240, 340, 240 * k, 340 * k, inner + stars, headDefs(c));
}

/** Ruby seen from behind (over-the-shoulder view). 260x240 box. */
export function rubyBackSVG(k: number): string {
  const f = `fill="#fff4f0" stroke="${OUT}" stroke-width="7"`;
  const body = `<path d="M20 240 Q30 170 130 160 Q230 170 240 240Z" fill="#e0243a" stroke="${OUT}" stroke-width="7"/>`
    + `<path d="M110 168 L130 200 L150 168" fill="none" stroke="#fff" stroke-width="6"/>`
    + `<ellipse cx="34" cy="96" rx="30" ry="14" transform="rotate(-25 34 96)" ${f}/><ellipse cx="226" cy="96" rx="30" ry="14" transform="rotate(25 226 96)" ${f}/>`
    + `<g ${f}>${[[80, 60], [130, 40], [180, 60], [62, 110], [198, 110], [96, 140], [164, 140], [130, 100]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="38"/>`).join('')}</g>`
    + `<g fill="#fff4f0">${[[90, 80], [130, 70], [170, 80], [110, 120], [150, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="34"/>`).join('')}</g>`
    + `<path d="M130 40 L98 20 L100 62Z M130 40 L162 20 L160 62Z" fill="#ff3b6b" stroke="${OUT}" stroke-width="5"/><circle cx="130" cy="40" r="10" fill="#ff7aa0" stroke="${OUT}" stroke-width="4"/>`;
  const shade = `<ellipse cx="130" cy="150" rx="110" ry="40" fill="#c9a8b0" opacity="0.35"/><ellipse cx="100" cy="50" rx="30" ry="14" fill="#fff" opacity="0.8"/><path d="M40 200 Q130 230 220 200" stroke="#000" stroke-opacity="0.25" stroke-width="10" fill="none"/>`;
  return svgDoc(260, 250, 260 * k, 250 * k, `<g transform="translate(0 4)">${body}${shade}</g>`);
}
/** Cartoon rope lasso: tilted braided loop + slack rope down to (0,0) hand anchor at bottom-left. 220x220 box. */
export function lassoSVG(k: number): string {
  const rope = (d: string) => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="13" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#c9925a" stroke-width="8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#8a5a2b" stroke-width="8" stroke-dasharray="4 9" stroke-linecap="round"/>`;
  return svgDoc(220, 220, 220 * k, 220 * k,
    rope('M20 210 Q40 150 90 140 Q120 136 128 116') +
    `<g transform="rotate(-24 140 70)">${rope('M128 116 C40 110 40 30 140 26 C230 24 230 112 132 114')}</g>` +
    `<circle cx="128" cy="114" r="9" fill="#a8652e" stroke="${OUT}" stroke-width="4"/>`);
}

/** Shaded boxing glove pointing up, cuff at the bottom. 100x120 box. */
export function gloveSVG(base: string, dark: string, light: string, k: number): string {
  return svgDoc(100, 120, 100 * k, 120 * k,
    `<path d="M22 86 Q8 60 14 36 Q22 6 52 6 Q86 6 90 40 Q94 70 78 90Z" fill="url(#gb)" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>`
    + `<path d="M20 58 Q4 54 8 38 Q12 26 26 32" fill="url(#gb)" stroke="${OUT}" stroke-width="5"/>`
    + `<path d="M30 30 Q40 18 58 16" stroke="#fff" stroke-opacity="0.8" stroke-width="7" fill="none" stroke-linecap="round"/>`
    + `<ellipse cx="66" cy="62" rx="14" ry="20" fill="${dark}" opacity="0.35"/>`
    + `<rect x="20" y="84" width="60" height="30" rx="8" fill="#ffffff" stroke="${OUT}" stroke-width="5"/>`
    + `<path d="M24 94 H76 M24 104 H76" stroke="#c9ced8" stroke-width="3"/>`,
    radial('gb', [[0, light], [0.45, base], [1, dark]], 0.35, 0.28, 0.85));
}
