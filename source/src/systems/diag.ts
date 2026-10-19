import Phaser from 'phaser';
import { RES, LOWQ } from './resolution';

declare const __BUILD__: string;
export const BUILD: string = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';
const W = window as any;
W.__build = BUILD; W.__lowq = LOWQ;
export function bootStage(s: string): void { W.__bootStage = s; }

/**
 * 1) Loop guard: an exception inside one frame (e.g. a tween callback touching a destroyed object) must not stop
 *    Phaser's requestAnimationFrame loop — that froze the game ("hang"). We catch, record and keep running.
 * 2) Error capture (window.onerror / unhandledrejection) into W.__lastErr.
 * 3) Diagnostics overlay (plain DOM so it still works if the canvas stalls): ?debug=1, or 5 quick taps on the
 *    top-left corner of the title card (see toggleDiag).
 */
export function installDiag(game: Phaser.Game): void {
  const errs: string[] = []; W.__errs = errs;
  const note = (m: string) => { W.__lastErr = m.slice(0, 300); errs.push(W.__lastErr); if (errs.length > 20) errs.shift(); };
  window.addEventListener('error', (e) => note(`${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => note('promise: ' + String((e.reason && (e.reason.stack || e.reason.message)) || e.reason)));
  const samples: number[] = []; let last = 0;
  // Phaser hands its frame callback to loop.start() after READY, so wrap whatever callback start() receives.
  const guard = (cb: (t: number, d: number) => void) => function (this: unknown, time: number, delta: number) {
    if (last) { samples.push(time - last); if (samples.length > 120) samples.shift(); } last = time;
    try { cb.call(this, time, delta); } catch (e: any) { note('frame: ' + String((e && (e.stack || e.message)) || e)); console.error(e); }
  };
  const loop: any = game.loop;
  if (loop && !loop.__guarded) {
    const start = loop.start;
    loop.start = function (cb: (t: number, d: number) => void) { return start.call(this, guard(cb)); };
    if (loop.started && typeof loop.callback === 'function') loop.callback = guard(loop.callback);
    loop.__guarded = true;
  }

  let box: HTMLDivElement | null = null, timer = 0;
  const render = () => {
    if (!box) return;
    const n = samples.length, avg = n ? samples.reduce((a, b) => a + b, 0) / n : 0, max = n ? Math.max(...samples) : 0;
    const tex = Object.keys((game.textures as any).list || {}).length;
    const cv = game.canvas;
    const scenes = game.scene.getScenes(true).map(s => s.sys.settings.key).join(',');
    box.textContent = [
      `build ${BUILD}`,
      `fps ${avg ? (1000 / avg).toFixed(0) : '-'}  frame avg ${avg.toFixed(1)}ms max ${max.toFixed(0)}ms`,
      `boot ${W.__bootStage || '-'}  scenes ${scenes || '-'}`,
      `textures ${tex}  quality ${LOWQ ? 'LOW' : 'normal'}${W.__lowQNow ? ' (dropped this run)' : ''}${W.__lowQRecovered ? ' (frames good: normal next load)' : ''}`,
      `res ${RES}x  canvas ${cv ? cv.width + 'x' + cv.height : '-'}  dpr ${window.devicePixelRatio}  css ${innerWidth}x${innerHeight}`,
      `renderer ${game.renderer && game.renderer.type === Phaser.WEBGL ? 'webgl' : 'canvas'}  tutorial ${W.__tutorialOpen ? 'open' : '-'}  errors ${errs.length}`,
      `ua ${navigator.userAgent}`,
      `last error: ${W.__lastErr || 'none'}`,
    ].join('\n');
  };
  const show = (on: boolean) => {
    if (on && !box) {
      box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:4px;top:max(4px,env(safe-area-inset-top));right:4px;z-index:10000;pointer-events:none;white-space:pre-wrap;word-break:break-all;font:11px/1.35 ui-monospace,Menlo,monospace;color:#9f9;background:rgba(0,0,0,.72);padding:6px 8px;border-radius:6px';
      document.body.appendChild(box); timer = window.setInterval(render, 500); render();
    } else if (!on && box) { box.remove(); box = null; clearInterval(timer); }
  };
  W.__toggleDiag = () => show(!box);
  if (/[?&]debug=1/.test(location.search)) show(true);
}

/** Hidden 5-tap hotspot (top-left 140x140) that toggles the diagnostics overlay; returns nothing. */
export function diagHotspot(scene: Phaser.Scene): void {
  let taps: number[] = [];
  scene.add.zone(0, 0, 140, 140).setOrigin(0).setDepth(2000).setInteractive().on('pointerdown', () => {
    const now = Date.now(); taps = taps.filter(t => now - t < 2000); taps.push(now);
    if (taps.length >= 5) { taps = []; W.__toggleDiag?.(); }
  });
}

/**
 * GitHub Pages serves index.html with max-age=600, so a returning phone can get a stale page for 10 minutes.
 * At boot: fetch version.json (no-store); if the server has a NEWER build, navigate once to ?v=<build> (a new URL,
 * so the cached index.html is bypassed). Loop-safe: at most one hop per target build per tab session, never on errors.
 */
export function checkForUpdate(game: Phaser.Game): void {
  if (BUILD === 'dev' || !window.fetch) return;
  fetch('./version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then((v: { build?: string } | null) => {
    const nb = v && typeof v.build === 'string' ? v.build : '';
    if (!/^[0-9]{10}$/.test(nb) || !(nb > BUILD)) return;
    const KEY = 'playroom.updhop';
    try { if (sessionStorage.getItem(KEY) === nb) return; } catch { return; }
    W.__updatePending = nb;
    // never mid-level and never on a result card (the player may be about to tap Retry): only the title, the Hall or the champion screen
    const safe = () => {
      const act = game.scene.getScenes(true).map(s => s.sys.settings.key);
      if (act.includes('Pause') || act.includes('Boot')) return false;
      return act.some(k => k === 'Title' || k === 'SoloTitle' || k === 'Hub' || k === 'Champion');
    };
    const t = window.setInterval(() => {
      if (!safe()) return;
      window.clearInterval(t);
      try { sessionStorage.setItem(KEY, nb); } catch { return; }
      const u = new URL(location.href); u.searchParams.set('v', nb); location.replace(u.toString());
    }, 500);
  }).catch(() => { /* offline etc: keep playing */ });
}
