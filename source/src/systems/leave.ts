import Phaser from 'phaser';
/**
 * Once-per-scene-run guard for scene-transition buttons (PLAY, Hall doors, PLAY AGAIN / CONTINUE / MENU / HALL ...).
 * Returns true the first time; later taps are ignored until the scene shuts down (Phaser reuses scene objects, so
 * the flag is cleared on shutdown). Hammering a door no longer restarts the level several times.
 */
export function leaveOnce(scene: Phaser.Scene): boolean {
  const s = scene as any;
  if (s.__leaving) return false;
  s.__leaving = true; scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { s.__leaving = false; });
  (window as any).__leaves = ((window as any).__leaves || 0) + 1;
  return true;
}
