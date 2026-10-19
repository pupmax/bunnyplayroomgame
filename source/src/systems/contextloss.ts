import Phaser from 'phaser';

/**
 * Phones (iOS Safari especially) can drop the WebGL context under memory pressure or when the tab is backgrounded.
 * Phaser can't rebuild our generated canvas textures, so the game would freeze on a black/blank canvas.
 * Instead: show a short note and reload (progress lives in localStorage). Guarded so a device that keeps
 * losing the context doesn't reload forever.
 */
export function installContextLossGuard(game: Phaser.Game): void {
  const hook = () => {
    const canvas = game.canvas; if (!canvas) return;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      const now = Date.now(), KEY = 'playroom.ctxlost';
      let hist: number[] = [];
      try { hist = (JSON.parse(sessionStorage.getItem(KEY) || '[]') as number[]).filter(t => now - t < 120000); } catch { /* ignore */ }
      hist.push(now); try { sessionStorage.setItem(KEY, JSON.stringify(hist)); } catch { /* ignore */ }
      const note = document.createElement('div');
      note.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;background:#1a0f14;color:#ffdf6b;font:600 22px/1.4 Fredoka,system-ui,sans-serif;z-index:9999';
      const retry = hist.length <= 2;
      note.textContent = retry ? 'Reloading the game…' : 'The browser ran out of graphics memory. Close other tabs and tap to reload.';
      if (!retry) note.addEventListener('click', () => location.reload());
      document.body.appendChild(note);
      try { game.loop.sleep(); } catch { /* ignore */ }
      if (retry) setTimeout(() => location.reload(), 600);
    }, false);
  };
  if (game.canvas) hook(); else game.events.once(Phaser.Core.Events.READY, hook);
}
