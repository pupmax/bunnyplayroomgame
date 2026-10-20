import Phaser from 'phaser';
import { leaveOnce } from './leave';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { art } from '../art/registry';
import { txt } from './fx';
import { makeButton } from './ui';
import { Fx } from './audio';
import { Storage } from './storage';
import { LINES, pick } from '../lines';
import { STANDALONE } from '../standalone';

/** Win/lose card. idx = level index (0 Ruby, 1 Glassia). */
export function endCard(scene: Phaser.Scene, name: string, idx: number, win: boolean, score: number, detail: string, extra: object = {}) {
  Fx.sting(win);
  if ((window as any).__pr) (window as any).__pr.cardShown = true; // a pending update may reload now (not mid-level)
  const newBest = win ? Storage.submitLevel(name, score) : false;
  const firstWin = win && Storage.getBeaten() <= idx;
  if (win) Storage.setBeaten(idx + 1);
  (window as any).__pr = { ...(window as any).__pr, ended: win ? 'win' : 'lose', score };
  const c = scene.add.container(0, 0).setDepth(960);
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
  const g = scene.add.graphics(); g.fillStyle(win ? 0xfff3e0 : 0xe9e0ff, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(60, 200, W - 120, 900, 36).strokeRoundedRect(60, 200, W - 120, 900, 36); void 0;
  const t = txt(scene, W / 2, 268, win ? `${name.toUpperCase()} WINS!` : 'PUPPY GOT LUCKY!', 56, win ? '#ff5c8a' : '#6b4cc9', '#22252b', 8);
  const hero = art(scene, 230, 770, name === 'Bunny' ? (win ? 'bun_full_laugh' : 'bun_full_unimpressed') : `full_${name}_${win ? 'happy' : 'dizzy'}`, 1.05);
  const pup = art(scene, 500, 760, win ? 'pup_dizzy' : 'pup_hearts', 1.2);
  if (win) pup.setAngle(-80).setY(735).setX(510);
  scene.tweens.add({ targets: win ? hero : pup, y: '-=30', yoyo: true, repeat: -1, duration: 260, ease: 'Quad.Out' });
  const quote = txt(scene, W / 2, 830, win ? pick(LINES.win) : pick(LINES.lose), 28, '#22252b', '#fff', 0).setWordWrapWidth(540);
  const sub = txt(scene, W / 2, 885, win ? pick(LINES.puppyLose) : pick(LINES.puppyWin), 24, '#7a3f8a', '#fff', 0).setWordWrapWidth(540);
  const sc = txt(scene, W / 2, 345, `${detail}\nScore ${score}${newBest ? '  ★ NEW BEST!' : ''}`, 30, '#22252b', '#fff', 0);
  c.add([dim, g, t, hero, pup, quote, sub, sc]);
  const go = (k: string, data?: object) => { if (!leaveOnce(scene)) return; scene.cameras.main.fadeOut(200); scene.time.delayedCall(220, () => scene.scene.start(k, data)); };
  if (STANDALONE) {
    c.add(makeButton(scene, W / 2 - 145, 1010, 260, 110, 'PLAY AGAIN', () => go(scene.scene.key), COLORS.BUTTON, 38));
    c.add(makeButton(scene, W / 2 + 145, 1010, 260, 110, 'MENU', () => go('SoloTitle'), COLORS.BUTTON_ALT, 44));
  } else if (win) {
    c.add(makeButton(scene, W / 2, 1010, 400, 110, 'CONTINUE', () => go('Interlude', { name, idx, first: firstWin, ...extra }), COLORS.BUTTON, 46));
  } else {
    c.add(makeButton(scene, W / 2 - 145, 1010, 260, 110, 'RETRY', () => go(scene.scene.key), COLORS.BUTTON, 44));
    c.add(makeButton(scene, W / 2 + 145, 1010, 260, 110, 'HALL', () => go('Hub'), COLORS.BUTTON_ALT, 44));
  }
  c.setAlpha(0); scene.tweens.add({ targets: c, alpha: 1, duration: 300 });
}
