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
import { TailPup } from '../../systems/tailRigs';

/** Standalone title card: 'Ruby vs Puppy: Punching Bag Boxing' or 'Linye vs Puppy: Shadow Tag' + PLAY (always shows the level's tutorial from here). */
export class SoloTitleScene extends Phaser.Scene {
  private going = false;
  constructor() { super('SoloTitle'); }
  create(): void {
    setupCamera(this); this.cameras.main.fadeIn(250); this.going = false;
    (window as any).__pr = { scene: 'SoloTitle' };
    if (STANDALONE === 'linye') { this.linye(); this.footer(); return; }
    if (STANDALONE === 'tail') { this.tail(); this.footer(); return; }
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
  /** Tail Catch standalone: 'BUNNY vs PUPPY / CATCH PUPPY BY THE TAIL' in the playroom. */
  private tail() {
    setPageBg(0x2a1840, 0x7a4a2a);
    art(this, 0, 0, 'bg_room'); this.add.rectangle(0, 0, W, H, 0x0d0618, 0.25).setOrigin(0);
    // title panel: a dark band that also hides the room's window, so nothing shows through the title block
    const pg = this.add.graphics();
    pg.fillStyle(0x000000, 0.3).fillRoundedRect(30, 132, W - 60, 488, 34);
    pg.fillStyle(0x1b0e30, 0.97).lineStyle(6, 0xffd36b, 0.9).fillRoundedRect(24, 122, W - 48, 488, 34).strokeRoundedRect(24, 122, W - 48, 488, 34);
    // one crisp outline + ONE drop shadow (a dark copy underneath); comic()'s own canvas shadow is switched off (it ghosted on iPhone)
    const title = (y: number, str: string, size: number, top: string, bot: string, ink: string) => {
      const sw = Math.max(8, size * 0.16);
      txt(this, W / 2, y + Math.round(size * 0.09), str, size, '#0a0414', '#0a0414', sw).setAlpha(0.55);
      const t = comic(this, W / 2, y, str, size, top, bot, ink); t.setShadow(0, 0, '#000000', 0, false, false); return t;
    };
    title(205, 'BUNNY vs PUPPY', 80, '#fff6c0', '#ffb21f', '#3a0610');
    title(318, 'CATCH PUPPY', 74, '#ffd0e0', '#ff3b6b', '#3a0610');
    title(408, 'BY THE TAIL', 74, '#d8ffe0', '#2fbf5a', '#0a2a12');
    txt(this, W / 2, 530, 'Chase Puppy. When his tail glows,\ntap it once to grab, then tap fast\nto pull him in!', 28, '#ffffff', '#1b0e30', 7).setLineSpacing(4);
    this.add.ellipse(220, 1005, 220, 40, 0x000000, 0.3);
    const bun = art(this, 220, 1005, 'bun_full_wink', 1.05);
    this.tweens.add({ targets: bun, y: bun.y - 14, yoyo: true, repeat: -1, duration: 460, ease: 'Sine.InOut' });
    // the real Tail Catch rig: tail attached at his rear and wagging (he faces Bunny, tail out on the far side)
    const pup = new TailPup(this, 520, 990, 1.15).flip(true).setFrame('panic'); pup.wagAmp = 26; pup.wagSpd = 13;
    this.events.on('update', (_t: number, dms: number) => { pup.update(Math.min(dms, 50) / 1000, 0, 1); pup.root.x = 520 + Math.sin(this.time.now / 70) * 3; });
    this.time.delayedCall(500, () => say(this, 230, 700, 'Bunny: Here, Puppy Puppy!', 26, 2400));
    this.time.delayedCall(1400, () => say(this, 500, 760, 'Puppy: Not the tail!', 24, 1800));
    makeButton(this, W / 2, 1150, 380, 120, 'PLAY', () => {
      if (this.going || !leaveOnce(this)) return; this.going = true;
      try { localStorage.removeItem('playroom-tail.tut.tail1'); } catch { /* private mode */ } // tutorial every time you start from the card
      this.cameras.main.fadeOut(200); this.time.delayedCall(220, () => this.scene.start('Tail'));
    }, COLORS.BUTTON, 60);
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
