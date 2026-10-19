import Phaser from 'phaser';
import { RES } from './resolution';

/**
 * Auto-bake for static vector drawings. Phaser's WebGL renderer re-tessellates every Graphics object every frame,
 * even if it never changes (the Hall's 28 door cards cost ~50 ms JS per frame at 4x CPU throttle). This wraps
 * Graphics.renderWebGL: once a Graphics on the display list has had an unchanged command buffer for STABLE frames,
 * its drawing is rendered ONCE into a cached texture and from then on drawn as a single textured quad (same
 * transform, alpha, blend, depth, visibility, container). It is fully reversible: clear() or any new drawing command
 * (buffer change) drops back to live vector rendering, so code that redraws later keeps working.
 * Textures are keyed by a hash of the command buffer (identical drawings share one) and freed when unused.
 */
const ARGS: Record<number, number> = { 0: 7, 1: 0, 2: 0, 3: 4, 4: 2, 5: 2, 6: 3, 7: 2, 8: 0, 9: 0, 10: 6, 11: 6, 21: 8, 22: 6 };
const STABLE = 20, MIN_CMDS = 40, MAX_SIDE = 2048, BUDGET_PX = 9e6; // ~36 MB of RGBA at most
const cache = new Map<string, { refs: number; px: number }>(); let usedPx = 0;
const W = window as any; W.__autobake = { baked: 0, live: 0, cache, get mb() { return +(usedPx * 4 / 1048576).toFixed(1); } };

function bounds(c: number[]): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, lw = 0;
  const pt = (x: number, y: number) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
  for (let i = 0; i < c.length;) {
    const cmd = c[i], n = ARGS[cmd]; if (n === undefined) return null; // save/restore/translate/scale/rotate: not supported -> stay live
    const a = i + 1;
    if (cmd === 6 || cmd === 22) lw = Math.max(lw, c[a]);
    else if (cmd === 0) { pt(c[a] - c[a + 2], c[a + 1] - c[a + 2]); pt(c[a] + c[a + 2], c[a + 1] + c[a + 2]); }
    else if (cmd === 3) { pt(c[a], c[a + 1]); pt(c[a] + c[a + 2], c[a + 1] + c[a + 3]); }
    else if (cmd === 4 || cmd === 5) pt(c[a], c[a + 1]);
    else if (cmd === 10 || cmd === 11) { pt(c[a], c[a + 1]); pt(c[a + 2], c[a + 3]); pt(c[a + 4], c[a + 5]); }
    i = a + n;
  }
  if (!isFinite(x0)) return null;
  // box snapped to whole texels at RES, so the texture lines up exactly with the live drawing
  const pad = lw + 2; return [Math.floor((x0 - pad) * RES), Math.floor((y0 - pad) * RES), Math.ceil((x1 + pad) * RES), Math.ceil((y1 + pad) * RES)];
}
function hash(c: number[]): string { let h1 = 0x811c9dc5 | 0, h2 = 0; for (let i = 0; i < c.length; i++) { const v = Math.round(c[i] * 1000) | 0; h1 = Math.imul(h1 ^ v, 16777619); h2 = (h2 * 31 + v) | 0; } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + c.length; }

type St = { len: number; stable: number; img?: Phaser.GameObjects.Image; key?: string; ox: number; oy: number; no?: boolean };
function unbake(g: any) {
  const s: St = g.__ab; if (!s || !s.img) return;
  s.img.destroy(); s.img = undefined; W.__autobake.baked--;
  const e = s.key ? cache.get(s.key) : undefined;
  if (e && --e.refs <= 0) { cache.delete(s.key!); usedPx -= e.px; try { g.scene?.sys.textures.remove(s.key!); } catch { /* ignore */ } }
  s.key = undefined; s.stable = 0;
}
function tryBake(g: any, s: St): void {
  const scene: Phaser.Scene = g.scene; if (!scene || g.mask || !(g.displayList || g.parentContainer)) { s.no = true; return; }
  const c = g.commandBuffer as number[]; const b = bounds(c); if (!b) { s.no = true; return; }
  const tw = b[2] - b[0], th = b[3] - b[1]; // texels
  if (tw <= 0 || th <= 0 || tw > MAX_SIDE || th > MAX_SIDE) { s.no = true; return; }
  const key = 'ab_' + hash(c);
  let e = cache.get(key);
  if (!e) {
    if (usedPx + tw * th > BUDGET_PX) { s.no = true; return; }
    const dt = scene.sys.textures.addDynamicTexture(key, tw, th); if (!dt) { s.no = true; return; }
    const ox = g.x, oy = g.y, sx = g.scaleX, sy = g.scaleY, rot = g.rotation, al = g.alpha, vis = g.visible, sfx = g.scrollFactorX, sfy = g.scrollFactorY, par = g.parentContainer;
    g.parentContainer = null; // draw in plain local space
    g.setPosition(-b[0], -b[1]).setScale(RES).setRotation(0).setAlpha(1).setVisible(true).setScrollFactor(1); g.__abDrawing = true;
    try { dt.draw(g); } finally { g.__abDrawing = false; g.parentContainer = par; g.setPosition(ox, oy).setScale(sx, sy).setRotation(rot).setAlpha(al).setVisible(vis).setScrollFactor(sfx, sfy); }
    e = { refs: 0, px: tw * th }; cache.set(key, e); usedPx += e.px;
  }
  e.refs++; s.key = key; s.ox = -b[0] / tw; s.oy = -b[1] / th;
  // origin in texels (not a fraction): the texture frame can come back a texel larger than requested
  s.img = new Phaser.GameObjects.Image(scene, 0, 0, key).setDisplayOrigin(-b[0], -b[1]);
  W.__autobake.baked++;
}
const queue = new Set<any>();
export function installAutoBake(game: Phaser.Game): void {
  const P: any = Phaser.GameObjects.Graphics.prototype; if (P.__abInstalled) return; P.__abInstalled = true;
  // bake between frames (never inside the render pass): after scene updates, before rendering
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    if (!queue.size) return;
    for (const g of queue) { const s: St = g.__ab; if (g.active !== false && g.scene && s && !s.img && !s.no && g.commandBuffer.length === s.len) { try { tryBake(g, s); } catch { s.no = true; } } }
    queue.clear();
  });
  const live = P.renderWebGL, oclear = P.clear, odestroy = P.preDestroy;
  P.clear = function () { if (this.__ab) { unbake(this); this.__ab.no = false; this.__ab.stable = 0; } return oclear.apply(this, arguments); };
  P.preDestroy = function () { queue.delete(this); unbake(this); return odestroy ? odestroy.apply(this, arguments) : undefined; };
  P.renderWebGL = function (renderer: any, src: any, camera: any, parentMatrix: any) {
    if (src !== this || this.__abDrawing) return live.call(this, renderer, src, camera, parentMatrix);
    const s: St = this.__ab || (this.__ab = { len: -1, stable: 0, ox: 0, oy: 0 });
    const len = this.commandBuffer.length;
    if (len !== s.len) { if (s.img) unbake(this); s.len = len; s.stable = 0; s.no = false; }
    else if (!s.img && !s.no && len >= MIN_CMDS && ++s.stable >= STABLE) queue.add(this);
    const img = s.img;
    if (!img || W.__abOff) return live.call(this, renderer, src, camera, parentMatrix);
    img.x = this.x; img.y = this.y; img.rotation = this.rotation; img.scaleX = this.scaleX / RES; img.scaleY = this.scaleY / RES;
    img.alpha = this.alpha; img.blendMode = this.blendMode; img.scrollFactorX = this.scrollFactorX; img.scrollFactorY = this.scrollFactorY;
    (img as any).renderWebGL(renderer, img, camera, parentMatrix);
  };
}
