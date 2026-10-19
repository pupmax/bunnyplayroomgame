// High-DPI support: the canvas is rendered at RES x the 720x1280 base, and every
// scene's main camera zooms by RES so all game code keeps using base coordinates.
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';

/**
 * Adaptive quality: set when a scene measured sustained slow frames; the next loads render at 1x without extras.
 * The flag EXPIRES: it is only honoured while fresh (under 24 h old and for at most 3 loads), then the game starts at
 * normal quality again and re-tests during play. Stored as {"t": setAt, "loads": n}; the old bare '1' counts as expired.
 */
export const LOWQ_KEY = 'playroom.lowq';
export const LOWQ_TTL_MS = 24 * 3600e3, LOWQ_MAX_LOADS = 3;
export const LOWQ = (() => {
  try {
    const raw = localStorage.getItem(LOWQ_KEY); if (!raw || raw === '0') return false;
    const v = raw.startsWith('{') ? JSON.parse(raw) as { t: number; loads: number } : null;
    if (!v || !(Date.now() - v.t < LOWQ_TTL_MS) || !(v.loads < LOWQ_MAX_LOADS)) { localStorage.removeItem(LOWQ_KEY); return false; }
    localStorage.setItem(LOWQ_KEY, JSON.stringify({ t: v.t, loads: v.loads + 1 })); return true;
  } catch { return false; }
})();
/** Low quality proved unnecessary (sustained good frames): forget the flag so the next load is normal quality. */
export function clearLowQ(): void { try { if (localStorage.getItem(LOWQ_KEY) !== '0') localStorage.removeItem(LOWQ_KEY); } catch { /* ignore */ } }
/** '0' pins normal quality (never auto-switch); used by profiling and testing. */
export const LOWQ_PINNED = (() => { try { return localStorage.getItem(LOWQ_KEY) === '0'; } catch { return false; } })();
export function rememberLowQ(): void { try { localStorage.setItem(LOWQ_KEY, JSON.stringify({ t: Date.now(), loads: 0 })); } catch { /* ignore */ } }
function computeRes(): number {
  if (LOWQ) return 1;
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  const r = Math.round(fit * dpr * 4) / 4; // quarter steps
  // iOS Safari: cap the canvas backing (about 1080x1920) - a bigger backbuffer plus our textures can push it over its GPU/canvas memory limit at boot
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return Math.min(ios ? 1.25 : 2, Math.max(1, r)); // iOS: 1.25x (900x1600 backing) is the safe default
}

export const RES = computeRes();

/** Call first thing in every scene's create(). */
export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(RES).centerOn(GAME_W / 2, GAME_H / 2);
}

/** Pointer position in base (720x1280) coordinates. */
export function worldPoint(scene: Phaser.Scene, p: Phaser.Input.Pointer): { x: number; y: number } {
  const v = scene.cameras.main.getWorldPoint(p.x, p.y);
  return { x: v.x, y: v.y };
}

/** Make every Text object render at RES so it stays sharp under camera zoom. */
export function patchTextResolution(): void {
  // Text.setColor re-renders the text canvas and re-uploads its texture on EVERY call; HUDs call it every frame. Skip no-op calls.
  const tp = Phaser.GameObjects.Text.prototype as any, origColor = tp.setColor;
  if (!tp.__colorPatched) { tp.__colorPatched = true; tp.setColor = function (this: Phaser.GameObjects.Text, c: any) { if (typeof c === 'string' && this.style && this.style.color === c) return this; return origColor.call(this, c); }; }
  const proto = Phaser.GameObjects.GameObjectFactory.prototype as any;
  const orig = proto.text;
  proto.text = function (...args: any[]) {
    const t = orig.apply(this, args) as Phaser.GameObjects.Text;
    t.setResolution(RES);
    return t;
  };
}
