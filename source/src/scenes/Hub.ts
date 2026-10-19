import Phaser from 'phaser';
import { TESTER } from '../standalone';
import { leaveOnce } from '../systems/leave';
import { GAME_W as W } from '../config';
import { setupCamera } from '../systems/resolution';
import { art } from '../art/registry';
import { makeMuteButton, makeButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { Sfx } from '../systems/audio';
import { drawHall, say, DOOR_POS, setPageBg } from '../systems/kit';
import { CAST, BUNNY_INFO } from '../art/chibi';
import { LINES, pick } from '../lines';
import { Storage } from '../systems/storage';

export const PLAYABLE = ['Ruby', 'Glassia', 'Zoe', 'Nana', 'Midnight', 'Noir', 'Iris', 'Linye'];
export const LEVEL_SCENE: Record<string, string> = { Ruby: 'Boxing', Glassia: 'Football', Zoe: 'Hive', Nana: 'Acorn', Midnight: 'Dive', Noir: 'Pounce', Iris: 'Trash', Linye: 'Shadow' };
export function doorState(i: number): string {
  const beaten = Storage.getBeaten();
  if (i < beaten) return 'beaten';
  if (TESTER) return 'open'; // tester build: every door open, any order
  if (i === beaten) return 'open';
  return 'locked';
}

export class HubScene extends Phaser.Scene {
  private pressed = -1;
  constructor() { super('Hub'); }
  create(): void {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x2a070d, 0x1a0a0e);
    // Rolling input guard: a player hammering HALL/CONTINUE keeps tapping after the Hall appears. Stay deaf for 350 ms, and every
    // press during the guard pushes it out another 300 ms (cap 1.6 s), so input only comes back once the taps stop. Then a door
    // only opens on a FRESH press that started on that same door (see pressed), never on a release left over from the burst.
    this.input.enabled = false; const token = {}; (this as any).__inTok = token; this.pressed = -1;
    const t0 = performance.now(); let until = t0 + 350; const MAXG = t0 + 1600;
    const onDown = () => { until = Math.min(MAXG, Math.max(until, performance.now() + 300)); };
    const evs = ['pointerdown', 'touchstart', 'mousedown'] as const; const cv = this.game.canvas;
    evs.forEach(e => cv.addEventListener(e, onDown, { passive: true }));
    const unhook = () => evs.forEach(e => cv.removeEventListener(e, onDown));
    const poll = () => { if ((this as any).__inTok !== token || !this.sys.isActive()) return unhook();
      if (performance.now() >= until) { unhook(); this.input.enabled = true; } else window.setTimeout(poll, 50); };
    window.setTimeout(poll, 350);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { unhook(); this.input.enabled = true; (this as any).__inTok = null; });
    const doors = drawHall(this, CAST, doorState, (i) => Storage.getLevelBest(CAST[i].name));
    txt(this, W / 2, 70, 'THE PLAYROOM HALL', 44, '#ffdf6b', '#22252b', 8);
    const beaten = Storage.getBeaten();
    const at = DOOR_POS[Math.min(beaten, 7)];
    const pup = art(this, at[0] + 34, at[1] - 104, 'pup_idle', 0.42).setDepth(5);
    this.tweens.add({ targets: pup, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 300 });
    doors.forEach((d, i) => {
      d.setInteractive({ useHandCursor: true });
      d.on('pointerdown', () => { this.pressed = i; });
      d.on('pointerup', () => { if (this.pressed === i) this.tapDoor(i); this.pressed = -1; });
    });
    this.time.delayedCall(500, () => say(this, W / 2, 545, pick(LINES.hub), 19, 2000));
    makeButton(this, 64, 64, 96, 96, '⌂', () => leaveOnce(this) && this.scene.start('Title'), 0x3a86ff, 46).setDepth(905);
    makeMuteButton(this);
    (window as any).__pr = { scene: 'Hub', beaten };
  }
  tapDoor(i: number) {
    Sfx.click();
    const st = doorState(i); const [x, y] = DOOR_POS[i];
    const by = i === 8 ? y + 210 : y - 150;
    if (i === 8 && (st === 'open' || st === 'beaten')) { if (!leaveOnce(this)) return; this.cameras.main.fadeOut(200); this.time.delayedCall(220, () => this.scene.start('Lasso')); return; }
    if (i === 8) { say(this, x, by, `Bunny: "${st === 'locked' ? pick(LINES.finale) : BUNNY_INFO.quip}"`, 24); return; }
    const c = CAST[i];
    if (st === 'open' || st === 'beaten') {
      if (PLAYABLE.includes(c.name)) { if (!leaveOnce(this)) return; this.cameras.main.fadeOut(200); this.time.delayedCall(220, () => this.scene.start(LEVEL_SCENE[c.name])); return; }
    }
    const bx = Phaser.Math.Clamp(x, 200, W - 200);
    if (st === 'locked') say(this, bx, by, c.name === 'Linye' ? `Linye: Beat ${CAST[i - 1].name} first, then we play tag! 🦔` : `LOCKED! Beat ${CAST[i - 1].name} first.`, 24);
    else say(this, bx, by, `${c.name}: "${c.quip}" (Coming soon!)`, 24);
  }
}
