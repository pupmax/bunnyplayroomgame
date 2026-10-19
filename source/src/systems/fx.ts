import Phaser from 'phaser';
import { FONT } from '../config';
import { art, artScale } from '../art/registry';

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 32, color = '#ffffff', stroke = '#22252b', sw = 7) {
  return scene.add.text(x, y, s, { fontFamily: FONT, fontStyle: 'bold', fontSize: `${size}px`, color, stroke, strokeThickness: sw, align: 'center' }).setOrigin(0.5);
}
/** Puppy as chef: puppy texture + chef hat. Returns container with setFrame(). */
export function makeChef(scene: Phaser.Scene, x: number, y: number, mult = 1) {
  const c = scene.add.container(x, y);
  const sh = scene.add.image(0, 4, 'su_shadow').setScale(artScale('su_shadow', 1.6 * mult), artScale('su_shadow', 1.2 * mult));
  const body = art(scene, 0, 0, 'pup_chef_normal', mult);
  const hat = art(scene, -4 * mult, -188 * mult, 'su_chefhat', 0.95 * mult);
  const arm = art(scene, -50 * mult, -96 * mult, 'su_paw', 0.85 * mult).setAngle(25);
  c.add([sh, body, hat, arm]);
  const L = 118 * 0.85 * mult; // shoulder -> paw centre
  return Object.assign(c, { body, hat, arm,
    setPose(p: string) { body.setTexture('pup_chef_' + p); },
    /** world position of the paw */
    paw() { const a = Phaser.Math.DegToRad(arm.angle); return { x: c.x + arm.x - Math.sin(a) * L, y: c.y + arm.y + Math.cos(a) * L }; } });
}
export function bubble(scene: Phaser.Scene, x: number, y: number, s: string, size = 28) {
  const t = txt(scene, 0, 0, s, size, '#22252b', '#ffffff', 0);
  t.setWordWrapWidth(380);
  const w = t.width + 40, h = t.height + 28;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, 24);
  g.fillStyle(0xffffff, 1).lineStyle(5, 0x22252b, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 24).strokeRoundedRect(-w / 2, -h / 2, w, h, 24);
  g.fillStyle(0xfff0f6, 1).fillRoundedRect(-w / 2 + 6, h / 2 - 16, w - 12, 10, 5);
  g.fillStyle(0xffffff, 1).lineStyle(5, 0x22252b, 1).fillTriangle(-20, h / 2 - 3, 12, h / 2 - 3, -32, h / 2 + 26);
  g.lineBetween(-20, h / 2 - 1, -32, h / 2 + 26); g.lineBetween(12, h / 2 - 1, -32, h / 2 + 26);
  const cx = Math.max(w / 2 + 8, Math.min(720 - w / 2 - 8, x)); // keep the whole bubble on-screen
  return scene.add.container(cx, y, [g, t]);
}

/** Comic text: thick outline, vertical gradient fill, drop shadow. */
export function comic(scene: Phaser.Scene, x: number, y: number, s: string, size = 64, top = '#fff6a8', bot = '#ff9a1f', stroke = '#5a0f1c') {
  const t = txt(scene, x, y, s, size, '#ffffff', stroke, Math.max(8, size * 0.16));
  const grd = t.context.createLinearGradient(0, 0, 0, t.canvas.height / ((t.style as any).resolution || 1));
  grd.addColorStop(0, top); grd.addColorStop(0.55, top); grd.addColorStop(1, bot);
  t.setFill(grd); t.setShadow(0, Math.round(size * 0.08), '#00000088', 0, true, true);
  return t;
}
