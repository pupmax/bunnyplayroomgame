import Phaser from 'phaser';
import { leaveOnce } from '../../systems/leave';
import { GAME_W as W, GAME_H as H, COLORS } from '../../config';
import { setupCamera } from '../../systems/resolution';
import { art } from '../../art/registry';
import { makeButton, makeMuteButton } from '../../systems/ui';
import { txt, comic } from '../../systems/fx';
import { say, setPageBg } from '../../systems/kit';
import { BUILD, diagHotspot } from '../../systems/diag';
import { STANDALONE } from '../../standalone';

/** Standalone title card: 'Ruby vs Puppy: Punching Bag Boxing' or 'Linye vs Puppy: Shadow Tag' + PLAY (always shows the level's tutorial from here). */
export class SoloTitleScene extends Phaser.Scene {
  private going = false;
  constructor() { super('SoloTitle'); }
  create(): void {
    setupCamera(this); this.cameras.main.fadeIn(250); this.going = false;
    (window as any).__pr = { scene: 'SoloTitle' };
    if (STANDALONE === 'linye') { this.linye(); this.footer(); return; }
    setPageBg(0x0d0618, 0x1f4fb8);
    art(this, 0, 0, 'bg_arena'); this.add.rectangle(0, 0, W, H, 0x0d0618, 0.45).setOrigin(0);
    const t1 = comic(this, W / 2, 230, 'RUBY vs PUPPY', 92, '#fff6c0', '#ffb21f', '#3a0610');
    const t2 = comic(this, W / 2, 340, 'PUNCHING BAG', 70, '#ffd0e0', '#ff3b6b', '#3a0610');
    const t3 = comic(this, W / 2, 425, 'BOXING', 70, '#ffd0e0', '#ff3b6b', '#3a0610');
    [t1, t2, t3].forEach((t, i) => { t.setAngle(i % 2 ? 2 : -2); this.tweens.add({ targets: t, angle: i % 2 ? -2 : 2, yoyo: true, repeat: -1, duration: 1200 + i * 100, ease: 'Sine.InOut' }); });
    const ruby = art(this, 220, 1000, 'full_Ruby_happy', 1.2);
    this.tweens.add({ targets: ruby, y: ruby.y - 18, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
    const pup = art(this, 520, 960, 'pup_panic', 1.25);
    this.tweens.add({ targets: pup, x: pup.x + 7, yoyo: true, repeat: -1, duration: 70 });
    txt(this, W / 2, 545, 'Puppy hid in the punching bag.\nTime it right and BONK him out!', 32, '#ffffff', '#3a1408', 8).setLineSpacing(4);
    this.time.delayedCall(500, () => say(this, 250, 700, 'Ruby: Gloves on, Puppy!', 26, 2400));
    this.time.delayedCall(1400, () => say(this, 500, 760, 'Puppy: eep!', 24, 1800));
    makeButton(this, W / 2, 1150, 380, 120, 'PLAY', () => {
      if (this.going || !leaveOnce(this)) return; this.going = true;
      try { localStorage.removeItem('playroom-ruby.tut.rubybag'); } catch { /* private mode */ } // Ruby's tutorial every time you start from the card
      this.cameras.main.fadeOut(200); this.time.delayedCall(220, () => this.scene.start('Boxing'));
    }, COLORS.BUTTON, 60);
    this.footer();
  }
  private footer() {
    makeMuteButton(this);
    this.add.text(W - 12, H - 10, 'build ' + BUILD, { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' }).setOrigin(1, 1).setAlpha(0.5).setDepth(1000);
    diagHotspot(this);
  }
  /** Linye standalone: 'LINYE vs PUPPY / SHADOW TAG' in the moonlit dojo. */
  private linye() {
    setPageBg(0x120a26, 0x1e1438);
    art(this, 0, 0, 'bg_dojo'); this.add.rectangle(0, 0, W, H, 0x0d0618, 0.5).setOrigin(0);
    const t1 = comic(this, W / 2, 240, 'LINYE vs PUPPY', 88, '#f1e8ff', '#b78cff', '#1a0a33');
    const t2 = comic(this, W / 2, 365, 'SHADOW TAG', 96, '#ffe9a8', '#8a5cff', '#1a0a33');
    [t1, t2].forEach((t, i) => { t.setAngle(i % 2 ? 2 : -2); this.tweens.add({ targets: t, angle: i % 2 ? -2 : 2, yoyo: true, repeat: -1, duration: 1200 + i * 100, ease: 'Sine.InOut' }); });
    const glow = this.add.ellipse(230, 900, 300, 380, 0xb78cff, 0.22).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.12, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.InOut' });
    const lin = art(this, 230, 1030, 'full_Linye_happy', 1.15);
    this.tweens.add({ targets: lin, y: lin.y - 16, yoyo: true, repeat: -1, duration: 480, ease: 'Sine.InOut' });
    this.add.ellipse(520, 985, 170, 34, 0x000000, 0.35);
    const pup = art(this, 520, 985, 'pup_panic', 1.1);
    this.tweens.add({ targets: pup, x: pup.x + 7, yoyo: true, repeat: -1, duration: 70 });
    txt(this, W / 2, 500, 'Puppy is hiding in the shadows.\nTeleport through the pools and TAG him!', 32, '#ffffff', '#1a0a33', 8).setLineSpacing(4);
    this.time.delayedCall(500, () => say(this, 250, 650, 'Linye: ...you are not ready.', 26, 2400));
    this.time.delayedCall(1400, () => say(this, 500, 730, 'Puppy: eep!', 24, 1800));
    makeButton(this, W / 2, 1150, 380, 120, 'PLAY', () => {
      if (this.going || !leaveOnce(this)) return; this.going = true;
      try { localStorage.removeItem('playroom-linye.tut.linye1'); } catch { /* private mode */ } // Linye's tutorial every time you start from the card
      this.cameras.main.fadeOut(200); this.time.delayedCall(220, () => this.scene.start('Shadow'));
    }, COLORS.BUTTON, 60);
  }
}
