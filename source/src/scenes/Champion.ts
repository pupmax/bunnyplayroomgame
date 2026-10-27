// PLAYROOM CHAMPION ending: Bunny + all 8 heroines celebrate, confetti, Puppy gets a consolation medal.
import Phaser from 'phaser';
import { leaveOnce } from '../systems/leave';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera } from '../systems/resolution';
import { art, ensureArt } from '../art/registry';
import { makeButton, makeMuteButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { say, setPageBg, comic } from '../systems/kit';
import { LINES, pick, CHEEKY, mix } from '../lines';
import { pupHearts, blush, bunTease, winkSparkle, headOf, fan, pipe, eyeRoll, ptOn, type Neck } from '../systems/cheeky';
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
    const girls: Phaser.GameObjects.Image[] = [];
    names.forEach((n, i) => { const row = i < 4 ? 0 : 1; const x = 110 + (i % 4) * 167, y = row ? 1100 : 900;
      const h = art(this, x, y, `full_${n}_happy`, 0.62).setDepth(20 + row); this.tweens.add({ targets: h, y: y - 40, yoyo: true, repeat: -1, duration: 260 + i * 25, ease: 'Quad.Out', delay: i * 60 }); girls.push(h); });
    const bun = art(this, W / 2, 760, 'bun_full_coolwink', 0.95).setDepth(19); this.tweens.add({ targets: bun, scale: bun.scale * 1.05, yoyo: true, repeat: -1, duration: 500 });
    const tro = txt(this, W / 2, 420, '🏆', 110).setDepth(30); this.tweens.add({ targets: tro, y: 400, yoyo: true, repeat: -1, duration: 400 });
    const pup = champHang(this, 560, 330, 1.2); /* Puppy hangs by one ankle (pupHang.ts); x 560 keeps his tail on screen at 390 wide and the rope clear of the mute button */ txt(this, 560, 650, '🥈 best loser', 22, '#fff', '#22252b', 5).setDepth(26);
    this.time.addEvent({ delay: 60, loop: true, callback: () => { const c = this.add.rectangle(Phaser.Math.Between(0, W), -20, 14, 22, Phaser.Utils.Array.GetRandom([0xff5c8a, 0xffdf6b, 0x7dff9a, 0x3a86ff, 0xb78cff])).setDepth(40);
      this.tweens.add({ targets: c, y: H + 40, x: c.x + Phaser.Math.Between(-120, 120), angle: 720, duration: Phaser.Math.Between(1800, 3000), onComplete: () => c.destroy() }); } });
    if (d?.score) txt(this, W / 2, 330, `Finale score ${d.score}`, 30, '#fff', '#22252b', 6).setDepth(50);
    this.time.delayedCall(800, () => say(this, W / 2, 560, pick(mix(LINES.champion, CHEEKY.champion)), 24, 2600));
    this.cheeky(bun, pup, girls);
    Fx.goal(); this.time.delayedCall(500, () => Fx.sting(true));
    makeMuteButton(this);
    makeButton(this, W / 2 - 180, 1180, 240, 90, 'HALL', () => leaveOnce(this) && this.scene.start('Hub'), COLORS.BUTTON_ALT, 40).setDepth(60);
    makeButton(this, W / 2 + 180, 1180, 240, 90, 'TITLE', () => leaveOnce(this) && this.scene.start('Title'), COLORS.BUTTON, 40).setDepth(60);
  }
  // ================= cheeky pass (27 Oct) =================
  /** Bunny winks and yanks her captive's leash with an evil 'hehe~' (sometimes a sneaky smug kiss instead; he blushes, hearts from HIS head,
   *  wags harder), then a booty-bump; the couch girls fan
   *  themselves or roll their eyes. Repeats every few seconds. */
  private cheeky(bun: Phaser.GameObjects.Image, pup: Phaser.GameObjects.Image, girls: Phaser.GameObjects.Image[]) {
    const head = () => headOf(pup, 0.3); let blushed = false;
    const fans = [1, 4, 6], rolls = [0, 5, 3]; let k = 0;
    const couch = () => { const f = girls[fans[k % 3]], r = girls[rolls[k % 3]]; k++;
      if (f?.active) { const b = f.getBounds(); fan(this, b.centerX + 34, b.top + b.height * 0.42, 45, 2000); pipe(this, b.centerX, b.top - 8, pick(CHEEKY.couchFan), 46, '#ffd1e0'); }
      if (r?.active) { const b = r.getBounds(); eyeRoll(this, b.centerX, b.top + b.height * 0.28, 46); this.time.delayedCall(300, () => pipe(this, b.centerX, b.top - 8, pick(CHEEKY.couchRoll), 46)); } };
    ensureArt(this, ['bun_wave_cool']).catch(() => { /* she keeps the paw-at-side pose */ });
    // 28 Oct (Marc): the leash sits IN her paw: for the tug she raises her right paw (wave pose) so it is clear of the couch girls in front of her
    const raised = () => bun.texture.key === 'bun_wave_cool';
    const tease = () => { if (!bun.active) return; bun.setTexture(this.textures.exists('bun_wave_cool') ? 'bun_wave_cool' : 'bun_full_coolwink'); const b = bun.getBounds();
      this.time.delayedCall(2100, () => bun.active && raised() && bun.setTexture('bun_full_coolwink'));
      winkSparkle(this, b.centerX + b.width * 0.14, b.top + b.height * 0.28, 52, undefined, '');
      bunTease(this, () => ({ ...(raised() ? ptOn(bun, 0.845, 0.565) : ptOn(bun, 0.76, 0.84)), r: 11 }) /* her right paw, in the art */, () => (pup.getData('neck') as (() => Neck) | undefined)?.() ?? { x: pup.x, y: pup.y - 60 } /* his neck (he hangs upside-down, so it's above his face; pup = the hang anchor) */, () => {
        if (!blushed) { blushed = true; blush(this, () => { const h = head(); return { x: h.x, y: h.y + 18 }; }, 30, 27); }
        pupHearts(this, head().x, head().y - 10, 3, 27); this.tweens.add({ targets: pup, x: pup.x - 22, y: pup.y - 12, yoyo: true, repeat: 2, duration: 110, ease: 'Quad.Out' }); /* the tug jiggles his hang */
        couch(); }, 52, undefined, 0.2, 0.45); }; // a shallower sag: the rope stays above the girls' heads
    const bump = () => { if (!bun.active || !pup.active) return; const x0 = bun.x, px = pup.x;
      this.tweens.add({ targets: bun, x: x0 + 70, angle: 10, duration: 160, yoyo: true, ease: 'Quad.Out', onYoyo: () => {
        const w = comic(this, (x0 + px) / 2 + 40, 690, 'BUMP!', 40).setDepth(52).setAngle(8).setScale(0.3);
        this.tweens.add({ targets: w, scale: 1, duration: 140, ease: 'Back.Out' }); this.tweens.add({ targets: w, alpha: 0, y: 650, delay: 600, duration: 250, onComplete: () => w.destroy() });
        Fx.boing(); this.tweens.add({ targets: pup, x: px + 30, y: pup.y - 30, duration: 140, yoyo: true, ease: 'Quad.Out' }); pupHearts(this, head().x, head().y - 10, 2, 27); } }); };
    this.time.delayedCall(1700, tease); this.time.delayedCall(3800, bump);
    this.time.addEvent({ delay: 5000, loop: true, callback: () => { tease(); this.time.delayedCall(2100, bump); } });
    this.time.delayedCall(4600, () => bun.active && bun.setTexture('bun_full_coolwink'));
  }
}
