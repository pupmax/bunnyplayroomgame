import Phaser from 'phaser';
import { leaveOnce } from '../systems/leave';
import { BUILD, diagHotspot } from '../systems/diag';
import { TESTER } from '../standalone';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera } from '../systems/resolution';
import { art, artProgress, whenArtReady } from '../art/registry';
import { makeButton, makeMuteButton } from '../systems/ui';
import { txt, comic } from '../systems/fx';
import { hallBg, say, setPageBg } from '../systems/kit';

export class TitleScene extends Phaser.Scene {
  private going = false;
  constructor() { super('Title'); }
  create(): void {
    setupCamera(this); this.cameras.main.fadeIn(250);
    this.add.text(W - 12, H - 10, 'build ' + BUILD, { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' }).setOrigin(1, 1).setAlpha(0.5).setDepth(1000);
    diagHotspot(this);
    if (TESTER) { const tag = this.add.text(W / 2, 40, 'TEST – all unlocked', { fontFamily: 'monospace', fontSize: '26px', color: '#ffffff', backgroundColor: '#c0143c', padding: { x: 12, y: 6 } }).setOrigin(0.5, 0).setDepth(1000); tag.setAlpha(0.9); }
    hallBg(this, 0x5b2a6e, 0xff9fc0); setPageBg(0x2a070d, 0x1a0a0e);
    const logo = art(this, W / 2, 210, 'pr_logo_glow', 2.3);
    this.tweens.add({ targets: logo, scale: logo.scale * 1.05, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.InOut' });
    const t1 = comic(this, W / 2, 420, 'BUNNY', 112, '#fff6c0', '#ffb21f', '#3a0610');
    const t2 = comic(this, W / 2, 528, 'PLAYROOM GAMES', 74, '#ffd0e0', '#ff3b6b', '#3a0610');
    [t1, t2].forEach((t, i) => { t.setAngle(i ? 3 : -3);
      this.tweens.add({ targets: t, angle: i ? -3 : 3, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.InOut' }); });
    txt(this, W / 2, 650, 'Beat Puppy 9 times and become\nthe Playroom Champion!', 34, '#ffffff', '#3a1408', 8).setLineSpacing(4);
    art(this, 170, 1010, 'bun_sip_wink', 1.05);
    const pup = art(this, 540, 1000, 'pup_panic', 1.4);
    this.tweens.add({ targets: pup, x: 548, yoyo: true, repeat: -1, duration: 70 });
    const r = art(this, 640, 760, 'head_Ruby_happy', 0.55); const g = art(this, 80, 740, 'head_Glassia_smug', 0.55);
    [r, g].forEach((h, i) => this.tweens.add({ targets: h, y: h.y - 20, yoyo: true, repeat: -1, duration: 700 + i * 150, ease: 'Sine.InOut' }));
    this.time.delayedCall(400, () => say(this, 260, 760, "Ready to tease Puppy?", 28, 2600));
    this.time.delayedCall(1300, () => say(this, 520, 800, 'Puppy: gulp...', 24, 2000));
    makeButton(this, W / 2, 1120, 380, 120, 'PLAY', () => { if (this.going || !leaveOnce(this)) return; this.going = true; whenArtReady().then(() => { this.cameras.main.fadeOut(200); this.time.delayedCall(220, () => this.scene.start('Hub')); }); }, COLORS.BUTTON, 60);
    // Remaining art keeps generating in the background (one texture per frame); show a slim progress bar until done.
    this.going = false; const lb = this.add.graphics().setDepth(50), lt = txt(this, W / 2, 1215, '', 22, '#ffffff', '#22252b', 5).setDepth(50);
    const tick = () => { const f = artProgress(); lb.clear(); lt.setText('');
      if (f < 1) { lb.fillStyle(0x22252b, 0.8).fillRoundedRect(210, 1194, 300, 12, 6).fillStyle(0xffdf6b, 1).fillRoundedRect(212, 1196, Math.max(8, 296 * f), 8, 4); lt.setText(this.going ? `Getting the playroom ready… ${Math.round(f * 100)}%` : '').setY(1232); }
      else this.events.off('update', tick); };
    this.events.on('update', tick);
    txt(this, W / 2, 1215, '9 heroines. 1 very nervous Puppy.', 26, '#ffe9c9', '#3a1408', 6);
    makeMuteButton(this);
  }
}
