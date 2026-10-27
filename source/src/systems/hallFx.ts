// Signage + idle animation for the Playroom Hall background (bg_hall = src/art/hallLair.ts).
import Phaser from 'phaser';
import { txt } from './fx';
import { bakeG } from './bake';
import { HALL_FLAMES } from '../art/hallLair';

/** Flames + signage that belong to bg_hall itself (Title and Hall both paint it): called by hallBg. */
export function hallDecor(scene: Phaser.Scene) {
  // heart-candle flames
  for (const [x, y, s] of HALL_FLAMES) {
    const fg = scene.add.graphics({ x, y });
    fg.fillStyle(0xff5aa0, 1).fillEllipse(0, -18, 30, 44); fg.fillStyle(0xffb0d0, 1).fillEllipse(0, -12, 18, 28); fg.fillStyle(0xfff3e0, 1).fillEllipse(0, -6, 8, 14);
    const f = bakeG(scene, fg, 'hflameP', -17, -42, 34, 48); f.setScale(f.scaleX * s, f.scaleY * s);
    const sx = f.scaleX, sy = f.scaleY;
    scene.tweens.add({ targets: f, scaleY: { from: sy * 0.85, to: sy * 1.15 }, scaleX: { from: sx * 1.05, to: sx * 0.9 }, yoyo: true, repeat: -1, duration: Phaser.Math.Between(140, 220) });
    scene.tweens.add({ targets: f, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: Phaser.Math.Between(300, 450) });
  }
  // signage (fonts only load for canvas text, not inside the SVG background)
  txt(scene, 101, 190, 'HOME SWEET\nDUNGEON ♥', 17, '#c0306a', '#fff4f8', 3).setLineSpacing(-2);
  txt(scene, 614, 172, "BUNNY'S\nRULES", 28, '#c0306a', '#ffffff', 5).setLineSpacing(-8);
  const rules = txt(scene, 614, 274, '1. Bunny wins\n2. Puppy obeys\n3. See rule 1', 23, '#5a2048', '#fff0f6', 3).setLineSpacing(2);
  if (rules.width > 176) rules.setScale(176 / rules.width); // safety: never spill past the card
  const sg = scene.add.graphics(); sg.lineStyle(3, 0x1e1020, 1).lineBetween(122, 320, 82, 300).lineBetween(122, 320, 162, 300);
  sg.fillStyle(0xff4f9a, 1).lineStyle(4, 0x1e1020, 1).fillRoundedRect(46, 272, 152, 32, 10).strokeRoundedRect(46, 272, 152, 32, 10);
  txt(scene, 122, 289, "PUPPY'S CORNER", 16, '#fff', '#22252b', 4);
}

/** Hall-only idle fx (drawHall): floating hearts + twinkles. */
export function hallFx(scene: Phaser.Scene) {
  // floating hearts by the side walls
  const zones: [number, number][] = [[20, 200], [520, 700]];
  scene.time.addEvent({ delay: 900, loop: true, callback: () => {
    const [a, b] = zones[Phaser.Math.Between(0, 1)];
    const h = txt(scene, Phaser.Math.Between(a, b), Phaser.Math.Between(560, 640), '♥', Phaser.Math.Between(16, 26), '#ff8ec0', '#22252b', 3).setAlpha(0.9);
    scene.tweens.add({ targets: h, y: h.y - 140, x: h.x + Phaser.Math.Between(-20, 20), alpha: 0, duration: 2400, onComplete: () => h.destroy() }); } });
  // twinkles on the cage lock, cuffs and rug
  ([[180, 440], [608, 464], [660, 456], [400, 1230]] as [number, number][]).forEach(([x, y], i) => {
    const s = scene.add.image(x, y, 'su_particle').setTint(0xffd0ea).setScale(0.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: s, alpha: { from: 0, to: 1 }, scale: { from: 0.3, to: 0.7 }, yoyo: true, repeat: -1, duration: 600, delay: i * 370, repeatDelay: 1400 }); });
}
