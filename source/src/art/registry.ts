// Builds every SVG asset and rasterises it to a Phaser texture at boot.
// Textures are rendered at TEX_RES x their nominal game size so they stay crisp
// when the camera zooms for high-DPI screens (see systems/resolution.ts).
import Phaser from 'phaser';
import { puppySVG, PUP_VB } from './puppy';
import { bunnySVG, BUN_VB, BunExpr, BunPose } from './bunny';
import { sushiSVG, SUSHI } from './sushi';
import { CAST, chibiHeadSVG, chibiFullSVG, rubyBackSVG, lassoSVG, gloveSVG } from './chibi';
import { BACKGROUNDS, backgroundSVG } from './backgrounds';
import { PROPS, propSVG } from './props';
import { RES } from '../systems/resolution';
import playroomLogoUrl from '../assets/playroom_logo.png';

export const TEX_RES = 2;
/** Mobile memory guard: raster at most what the camera zoom needs (RES<=2), extra trim on iOS. */
const IOS = typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const LOWMEM = typeof navigator !== 'undefined' && ((navigator as any).deviceMemory ?? 8) <= 4;
const Q = Math.max(0.6, Math.min(1, RES / 2)) * (IOS || LOWMEM ? 0.85 : 1);
/** Sushi parts actually referenced by scenes (the rest were dead weight, e.g. the 1080px bar). */
const SU_USED = new Set(['bunFore', 'bunLeg', 'bunUpper', 'chefhat', 'dust', 'katana', 'particle', 'paw', 'pupFore', 'pupUpper', 'shadow']);
const EAGER_BG = new Set(['bg_hall', 'bg_vignette']);
/** Poses no scene references at boot time (checked against every art()/setTexture() key in src). They are NOT generated at boot to save
 *  phone memory (~20 MB); art() still generates any of them on demand. Bunny rig faces stay eager (rigs.ts sets 'bun_rig_' + expr). */
const BOOT_USED_FULL = new Set(['happy', 'dizzy']), BOOT_USED_FULL_KEYS = new Set(['full_Linye_smug', 'full_Ruby_smug']);
const BOOT_USED_BUN = new Set(['bun_full_wink', 'bun_full_laugh', 'bun_full_cool', 'bun_full_coolwink', 'bun_sip_wink', 'bun_sip_smile', 'bun_bust_wink', 'bun_bust_smile']);
function bootDeferred(key: string): boolean {
  if (key.startsWith('full_')) return !BOOT_USED_FULL.has(key.split('_')[2]) && !BOOT_USED_FULL_KEYS.has(key);
  if (key.startsWith('bun_rig_')) return false;
  if (/^bun_(full|wave|sip|bust)_/.test(key)) return !BOOT_USED_BUN.has(key);
  return false;
}
const BG_KEEP = 3;
const bgLru: string[] = [];
let assetIndex: Map<string, Asset> | null = null;

interface Asset {
  key: string;
  /** nominal game px per art unit */
  nominal: number;
  /** extra raster multiplier (for assets shown larger than nominal somewhere) */
  boost?: number;
  build: (pxPerUnit: number) => string;
  originX?: number; originY?: number;
  /** fixed raster px per game px (scenery); overrides nominal*TEX_RES */
  res?: number;
}

/** Nominal scales (game px per art unit). */
export const PUP_SCALE = 0.78;     // ~190 px tall
export const BUN_SCALE = 1.0;      // full body ~340 px tall

const raster = new Map<string, number>();
const origins = new Map<string, [number, number]>();

function assets(): Asset[] {
  const list: Asset[] = [];
  const frames: Record<string, any> = { idle: { face: 'normal', cup: false }, panic: { face: 'panic', cup: false, earL: 26, earR: 26 }, hearts: { face: 'hearts', cup: false }, box_idle: { face: 'normal', cup: false, noArm: true }, box_lean: { face: 'normal', cup: false, noArm: true, lean: 8, earL: 14, earR: 14 }, box_dizzy: { face: 'dizzy', cup: false, noArm: true, earL: -10, earR: 20 }, box_panic: { face: 'panic', cup: false, noArm: true, earL: 26, earR: 26 }, dizzy: { face: 'dizzy', cup: false, earL: -10, earR: 20 }, lean: { face: 'normal', cup: false, lean: 8, earL: 14, earR: 14 }, cano: { face: 'hearts', cup: true } };
  for (const name of Object.keys(frames)) {
    list.push({ key: `pup_${name}`, nominal: PUP_SCALE, boost: 1.35, build: (k) => puppySVG(frames[name], k),
      originX: 0.5, originY: PUP_VB.feetY / PUP_VB.h });
  }
  const exprs: BunExpr[] = ['cool', 'unimpressed', 'smile', 'wink', 'laugh', 'stern'];
  for (const e of exprs) {
    list.push({ key: `bun_bust_${e}`, nominal: BUN_SCALE * 0.6, boost: 1.4, build: (k) => bunnySVG('bust', e, k), originX: 0.5, originY: 1 });
    list.push({ key: `bun_sip_${e}`, nominal: BUN_SCALE, boost: 1.2, build: (k) => bunnySVG('sip', e, k), originX: 0.5, originY: BUN_VB.feetY / BUN_VB.h });
  }
  const fulls: [BunPose, BunExpr][] = [];
  for (const e of exprs) fulls.push(['full', e], ['wave', e], ['rig', e]);
  fulls.push(['full', 'coolwink']);
  for (const [p, e] of fulls) {
    list.push({ key: `bun_${p}_${e}`, nominal: BUN_SCALE, boost: 1.2, build: (k) => bunnySVG(p, e, k), originX: 0.5, originY: BUN_VB.feetY / BUN_VB.h });
  }
  const fullRes: Record<string, number> = { bar: 1.5, particle: 1, flame: 1.5, shadow: 1.5 };
  for (const key of Object.keys(SUSHI)) {
    if (!SU_USED.has(key)) continue;
    list.push({ key: `su_${key}`, nominal: 1, res: fullRes[key] ?? 2.5, build: (k) => sushiSVG(key, k), originX: 0.5, originY: key === 'bar' ? 0 : key === 'paw' ? 0.1 : ['pupUpper', 'pupFore', 'bunUpper', 'bunFore', 'bunLeg'].includes(key) ? 0.09 : key === 'katana' ? 0.85 : key === 'hand' ? 0.1 : 0.5 });
  }
  for (const c of CAST) for (const m of ['smug', 'happy', 'dizzy'] as const)
    list.push({ key: `head_${c.name}_${m}`, nominal: 1, res: 2.5, build: (k) => chibiHeadSVG(c, m, k) });
  const fullDefs: [string, any, any][] = [['Ruby', 'smug', 'box'], ['Ruby', 'windup', 'box'], ['Ruby', 'dizzy', 'box'], ['Ruby', 'angry', 'box'], ['Ruby', 'happy', 'box'], ['Glassia', 'smug', 'ball'], ['Glassia', 'windup', 'ball'], ['Glassia', 'happy', 'ball'], ['Glassia', 'dizzy', 'flop'], ['Zoe', 'smug', 'plain'], ['Zoe', 'windup', 'plain'], ['Zoe', 'happy', 'plain'], ['Zoe', 'dizzy', 'plain'], ['Nana', 'smug', 'plain'], ['Nana', 'windup', 'plain'], ['Nana', 'happy', 'plain'], ['Nana', 'dizzy', 'plain'], ...(['Midnight', 'Noir', 'Iris', 'Linye'].flatMap(n => (['smug', 'windup', 'happy', 'dizzy'] as const).map(m => [n, m, 'plain'] as [string, any, any])))];
  for (const key of Object.keys(PROPS)) list.push({ key, nominal: 1, res: 2.5, build: (k) => propSVG(key, k), originX: PROPS[key].ox ?? 0.5, originY: PROPS[key].oy ?? 0.5 });
  for (const [n, m, kit] of fullDefs) { const c = CAST.find(x => x.name === n)!;
    list.push({ key: `full_${n}_${m}`, nominal: 1, res: 2.5, build: (k) => chibiFullSVG(c, m, kit, k), originX: 0.5, originY: 334 / 340 }); }
  for (const key of Object.keys(BACKGROUNDS)) list.push({ key: `bg_${key}`, nominal: 1, res: key === 'vignette' ? 0.5 : 1.5, build: (k) => backgroundSVG(key, k), originX: 0, originY: 0 });
  list.push({ key: 'glove_pup', nominal: 1, res: 3, build: (k) => gloveSVG('#ffc021', '#a86a00', '#fff3b0', k) });
  list.push({ key: 'glove_ruby', nominal: 1, res: 3, build: (k) => gloveSVG('#e0243a', '#7a0614', '#ffb0b8', k) });
  list.push({ key: 'ruby_back', nominal: 1, res: 2, build: (k) => rubyBackSVG(k), originX: 0.5, originY: 1 });
  list.push({ key: 'lasso', nominal: 1, res: 2, build: (k) => lassoSVG(k), originX: 20 / 220, originY: 210 / 220 });
  return list;
}

/** iOS Safari caps total canvas memory (~384 MB). Once a canvas is on the GPU we shrink its backing store. */
function releaseCanvas(scene: Phaser.Scene, c: HTMLCanvasElement): void {
  if (scene.game.renderer.type === Phaser.WEBGL) { c.width = 1; c.height = 1; }
}

const inflight = new Map<string, Promise<void>>();
function loadOne(scene: Phaser.Scene, a: Asset): Promise<void> {
  const busy = inflight.get(a.key); if (busy) return busy; // never rasterise the same texture twice at once
  const k = (a.res ?? a.nominal * TEX_RES * (a.boost ?? 1)) * Q;
  raster.set(a.key, k / a.nominal);
  origins.set(a.key, [a.originX ?? 0.5, a.originY ?? 0.5]);
  const once = (attempt: number): Promise<boolean> => new Promise((resolve) => {
    let url: string | null = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(a.build(k));
    const img = new Image();
    const done = (ok: boolean) => { img.onload = img.onerror = null; img.src = ''; url = null; resolve(ok); }; // drop the decoded SVG right away
    const timer = setTimeout(() => done(false), 8000); // a decode that never finishes counts as a failure (retried below)
    img.onload = () => {
      clearTimeout(timer);
      try {
        let c: HTMLCanvasElement | null = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        if (scene.textures.exists(a.key)) scene.textures.remove(a.key);
        scene.textures.addCanvas(a.key, c);
        releaseCanvas(scene, c); c = null;
        done(true);
      } catch (e) { console.warn('art upload failed', a.key, attempt, e); done(false); }
    };
    img.onerror = () => { clearTimeout(timer); done(false); };
    img.src = url;
  });
  const p = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) { // iOS Safari occasionally fails an SVG decode under memory pressure: back off and retry instead of hanging
      if (await once(attempt)) return;
      await new Promise(r => setTimeout(r, 150 * (attempt + 1)));
    }
    console.warn('art failed', a.key); // give up quietly; art() falls back to an invisible placeholder
  })().finally(() => inflight.delete(a.key));
  inflight.set(a.key, p); return p;
}

/** Real Bunny Play Room logo (transparent disc PNG, 512 px) + a neon-red glow version, built once. */
function loadLogo(scene: Phaser.Scene): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const n = img.width; // 512
      const plain = document.createElement('canvas'); plain.width = n; plain.height = n;
      plain.getContext('2d')!.drawImage(img, 0, 0);
      const pad = Math.round(n * 0.22), g = document.createElement('canvas');
      g.width = g.height = n + pad * 2;
      const ctx = g.getContext('2d')!;
      const c = g.width / 2;
      ctx.shadowColor = 'rgba(255,30,60,1)';
      for (const [blur, alpha] of [[pad * 0.9, 0.9], [pad * 0.4, 1]] as const) {
        ctx.shadowBlur = blur; ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(c, c, n / 2 + n * 0.018, 0, Math.PI * 2); ctx.fillStyle = '#ff2a4a'; ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.drawImage(img, pad, pad);
      for (const [k, cv, r] of [['pr_logo', plain, n], ['pr_logo_glow', g, n]] as const) {
        if (scene.textures.exists(k)) scene.textures.remove(k);
        scene.textures.addCanvas(k, cv);
        releaseCanvas(scene, cv);
        raster.set(k, r / 100);            // nominal: 100 game px = logo disc diameter
        origins.set(k, [0.5, 0.5]);
      }
      resolve();
    };
    img.onerror = () => { console.warn('logo failed'); resolve(); };
    img.src = playroomLogoUrl;
  });
}

/** Keys the Title screen needs; everything else is generated in the background while Title is up. */
const TITLE_KEYS = new Set(['bun_sip_wink', 'pup_panic', 'head_Ruby_happy', 'head_Glassia_smug', 'su_dust', 'su_particle', 'su_shadow', 'bg_hall']);
let restDone = 0, restTotal = 1, restPromise: Promise<void> = Promise.resolve();
/** 0..1 progress of the background generation (1 = every texture ready). */
export function artProgress(): number { return restDone / restTotal; }
export function whenArtReady(): Promise<void> { return restPromise; }
const nextFrame = () => new Promise<void>(r => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => r()) : setTimeout(r, 16)));

/** Generates the Title's art (reporting progress), resolves, then keeps generating the rest one per frame. */
export async function loadAllArt(scene: Phaser.Scene, onProgress?: (f: number) => void): Promise<void> {
  const all = assets();
  assetIndex = new Map(all.map(a => [a.key, a]));
  // Backgrounds (1080x1920 each) are generated on demand by art(); only the hub's are eager.
  const list = all.filter(a => (!a.key.startsWith('bg_') || EAGER_BG.has(a.key)) && !bootDeferred(a.key));
  const first = list.filter(a => TITLE_KEYS.has(a.key)), rest = list.filter(a => !TITLE_KEYS.has(a.key));
  (window as any).__artReady = false;
  let done = 0; const total = first.length + 1;
  await loadLogo(scene); onProgress?.(++done / total);
  for (const a of first) { await loadOne(scene, a); onProgress?.(++done / total); await nextFrame(); }
  // Background pass: a small time budget per frame so the Title stays responsive on slow phones.
  restDone = 0; restTotal = rest.length;
  let idx = 0, frameT = performance.now();
  // one texture at a time, yielding a frame after each big one: keeps the transient (SVG string + decoded image + canvas) peak low on phones
  const worker = async () => { while (idx < rest.length) { const a = rest[idx++]; if (!scene.textures.exists(a.key)) await loadOne(scene, a); restDone++;
    if (performance.now() - frameT > 12) { await nextFrame(); frameT = performance.now(); } } };
  restPromise = Promise.all([worker(), worker()]).then(() => { (window as any).__artReady = true; });
}

/** Standalone builds: generate only `keys` (plus the logo), reporting progress; everything else is generated lazily by art(). */
export async function loadArtKeys(scene: Phaser.Scene, keys: string[], onProgress?: (f: number) => void): Promise<void> {
  const all = assets(); assetIndex = new Map(all.map(a => [a.key, a]));
  const want = new Set(keys), list = all.filter(a => want.has(a.key));
  (window as any).__artReady = false; let done = 0; const total = list.length + 1;
  await loadLogo(scene); onProgress?.(++done / total);
  for (const a of list) { await loadOne(scene, a); if (a.key.startsWith('bg_')) touchBg(scene, a.key); onProgress?.(++done / total); await nextFrame(); }
  restDone = restTotal = 1; restPromise = Promise.resolve(); (window as any).__artReady = true;
}

function touchBg(scene: Phaser.Scene, key: string): void {
  const i = bgLru.indexOf(key); if (i >= 0) bgLru.splice(i, 1); bgLru.push(key);
  while (bgLru.length > BG_KEEP) { const old = bgLru.shift()!; if (!EAGER_BG.has(old) && scene.textures.exists(old)) scene.textures.remove(old); }
}

/** Add an art image at its nominal game size (times `mult`), with its anchor origin. */
export function art(scene: Phaser.Scene, x: number, y: number, key: string, mult = 1): Phaser.GameObjects.Image {
  if (key.startsWith('bg_') && !scene.textures.exists(key) && assetIndex?.has(key)) {
    const img = scene.add.image(x, y, '__DEFAULT').setOrigin(0, 0);
    loadOne(scene, assetIndex.get(key)!).then(() => {
      touchBg(scene, key);
      if (img.scene) { img.setTexture(key); const o = origins.get(key) ?? [0, 0]; img.setOrigin(o[0], o[1]); img.setScale(mult / (raster.get(key) ?? TEX_RES)); }
    });
    return img;
  }
  if (key.startsWith('bg_')) touchBg(scene, key);
  if (!scene.textures.exists(key) && assetIndex?.has(key)) { // not generated yet (standalone builds): draw it now, swap in when ready
    const img = scene.add.image(x, y, '__DEFAULT').setVisible(false);
    loadOne(scene, assetIndex.get(key)!).then(() => { if (!img.scene) return; const o = origins.get(key) ?? [0.5, 0.5]; img.setTexture(key).setOrigin(o[0], o[1]).setScale(mult / (raster.get(key) ?? TEX_RES)).setVisible(true); });
    return img;
  }
  const img = scene.add.image(x, y, key);
  const o = origins.get(key) ?? [0.5, 0.5];
  img.setOrigin(o[0], o[1]);
  img.setScale(mult / (raster.get(key) ?? TEX_RES));
  return img;
}

/** Scale factor to apply to an image of `key` for a given size multiplier. */
export function artScale(key: string, mult = 1): number { return mult / (raster.get(key) ?? TEX_RES); }

/** Exposed for the preview page. */
export function allAssetSVGs(): { key: string; svg: string }[] {
  return assets().map(a => ({ key: a.key, svg: a.build(a.res ? Math.min(1, a.res) : a.nominal * 1.5) }));
}
