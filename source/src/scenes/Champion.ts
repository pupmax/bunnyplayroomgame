// PLAYROOM CHAMPION ending: Bunny + all 8 heroines celebrate, confetti, Puppy gets a consolation medal.
import Phaser from 'phaser';
import { leaveOnce } from '../systems/leave';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera } from '../systems/resolution';
import { art } from '../art/registry';
import { makeButton, makeMuteButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { say, setPageBg, comic } from '../systems/kit';
import { LINES, pick } from '../lines';
import { koPupFor } from '../systems/koPup';
import { champHang } from '../art/pupHang';

export class ChampionScene extends Phaser.Scene {
  constructor() { super('Champion'); }
  create(d: { score?: number }) {
    setupCamera(this); this.cameras.main.fadeIn(400); setPageBg(0x3a1250, 0x8a4a1a);
    (window as any).__pr = { scene: 'Champion' };
    art(this, 0, 0, 'bg_stage');
    const rays = this.add.graphics({ x: W / 2, y: 560 }); rays.fillStyle(0xffffff, 0.18); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; rays.fillTriangle(0, 0, Math.cos(a) * 1000, Math.sin(a) * 1000, Math.cos(a + 0.18) * 1000, Math.sin(a + 0.18) * 1000); }
    this.tweens.add({ targets: rays, angle: 360, duration: 20000, repeat: -1 });
    const t = comic(this, W / 2, 190, 'PLAYROOM\nCHAMPION!', 92).setDepth(50); t.setScale(0); this.tweens.add({ targets: t, scale: 1, duration: 600, ease: 'Back.Out' });
    this.tweens.add({ targets: t, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 700, delay: 600 });
    const names = ['Ruby', 'Glassia', 'Zoe', 'Nana', 'Midnight', 'Noir', 'Iris', 'Linye'];
    names.forEach((n, i) => { const row = i < 4 ? 0 : 1; const x = 110 + (i % 4) * 167, y = row ? 1100 : 900;
      const h = art(this, x, y, `full_${n}_happy`, 0.62).setDepth(20 + row); this.tweens.add({ targets: h, y: y - 40, yoyo: true, repeat: -1, duration: 260 + i * 25, ease: 'Quad.Out', delay: i * 60 }); });
    const bun = art(this, W / 2, 760, 'bun_full_coolwink', 0.95).setDepth(19); this.tweens.add({ targets: bun, scale: bun.scale * 1.05, yoyo: true, repeat: -1, duration: 500 });
    const tro = txt(this, W / 2, 420, '🏆', 110).setDepth(30); this.tweens.add({ targets: tro, y: 400, yoyo: true, repeat: -1, duration: 400 });
    const pup = champHang(this, 560, 380, 1.2); /* Puppy hangs by one ankle (pupHang.ts); x 560 keeps his tail on screen at 390 wide and the rope clear of the mute button */ txt(this, 560, 650, '🥈 best loser', 22, '#fff', '#22252b', 5).setDepth(26);
    this.time.addEvent({ delay: 60, loop: true, callback: () => { const c = this.add.rectangle(Phaser.Math.Between(0, W), -20, 14, 22, Phaser.Utils.Array.GetRandom([0xff5c8a, 0xffdf6b, 0x7dff9a, 0x3a86ff, 0xb78cff])).setDepth(40);
      this.tweens.add({ targets: c, y: H + 40, x: c.x + Phaser.Math.Between(-120, 120), angle: 720, duration: Phaser.Math.Between(1800, 3000), onComplete: () => c.destroy() }); } });
    if (d?.score) txt(this, W / 2, 330, `Finale score ${d.score}`, 30, '#fff', '#22252b', 6).setDepth(50);
    this.time.delayedCall(800, () => say(this, W / 2, 560, pick(LINES.champion), 24, 2600));
    Fx.goal(); this.time.delayedCall(500, () => Fx.sting(true));
    makeMuteButton(this);
    makeButton(this, W / 2 - 180, 1180, 240, 90, 'HALL', () => leaveOnce(this) && this.scene.start('Hub'), COLORS.BUTTON_ALT, 40).setDepth(60);
    makeButton(this, W / 2 + 180, 1180, 240, 90, 'TITLE', () => leaveOnce(this) && this.scene.start('Title'), COLORS.BUTTON, 40).setDepth(60);
  }
}
