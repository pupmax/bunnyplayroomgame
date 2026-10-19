import Phaser from 'phaser';
import { leaveOnce } from '../systems/leave';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera } from '../systems/resolution';
import { makeButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { STANDALONE, homeScene } from '../standalone';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }
  create(d: { from: string }) {
    setupCamera(this);
    (window as any).__paused = true;
    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    const g = this.add.graphics(); g.fillStyle(0xfff3e0, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(110, 420, W - 220, 440, 34).strokeRoundedRect(110, 420, W - 220, 440, 34);
    txt(this, W / 2, 500, 'PAUSED', 64, '#ff5c8a', '#22252b', 8);
    txt(this, W / 2, 570, 'Puppy is catching his breath...', 24, '#22252b', '#fff', 0);
    const close = () => { (window as any).__paused = false; this.scene.stop(); };
    makeButton(this, W / 2, 670, 360, 100, 'RESUME', () => { close(); this.scene.resume(d.from); }, COLORS.BUTTON, 44);
    makeButton(this, W / 2, 790, 360, 100, STANDALONE ? 'MENU' : 'HALL', () => { if (!leaveOnce(this)) return; close(); this.scene.stop(d.from); this.scene.start(homeScene()); }, COLORS.BUTTON_ALT, 44);
  }
}
