// KO'd Puppy for the end cards (Marc, 27 Oct: "make the KO'd Puppy cuter"). VISUAL ONLY.
// Uses the Tail Catch Puppy rig (TailPup, like Nana's Acorn Puppy in acornPups.ts) with the 'pa_ko' frame: lying on his side,
// comfy closed eyes, tongue out a little, ears splayed, tail flopped on the floor, dizzy stars circling his head. Not hurt: cartoon dizzy.
// koPupFor(scene, img) shadows an existing 'pup_dizzy' image: whenever that image shows 'pup_dizzy' (and the rig art is ready) the image is
// hidden and the rig is drawn in its place with the image's position / angle / scale, so every scene's own tweens keep driving him.
import Phaser from 'phaser';
import { artScale, ensureArt, PUP_SCALE } from '../art/registry';
import { txt } from './fx';
import { TailPup, TAIL_FLAT } from './tailRigs';

export const KO_PUP_KEYS = ['pt_run0', 'pa_ko', 'su_shadow'];

export function koPupFor(scene: Phaser.Scene, img: Phaser.GameObjects.Image, opts: { stars?: boolean } = {}) {
  let rig: TailPup | null = null, stars: Phaser.GameObjects.Text[] = [], t = 0, dead = false;
  const build = () => {
    if (dead || !img.active || rig) return;
    const m = Math.abs(img.scaleX) / artScale('pup_dizzy', 1);
    rig = new TailPup(scene, img.x, img.y, m); rig.body.setTexture(scene.textures.exists('pa_ko') ? 'pa_ko' : 'pt_dizzy'); rig.wagSpd = 2.2; rig.wagAmp = 10; rig.tailStretch = 0.9;
    (rig.root.list[0] as Phaser.GameObjects.Image).setVisible(false); // no floor shadow under a lying pup's old feet spot; we add a long one
    const sh = scene.add.image(0, 0, 'su_shadow').setScale(artScale('su_shadow', 2.0 * m), artScale('su_shadow', 0.5 * m)).setAlpha(0.7);
    rig.root.addAt(sh, 0); rig.root.setData('sh', sh);
    if (opts.stars !== false) for (let i = 0; i < 3; i++) stars.push(txt(scene, 0, 0, '★', Math.round(30 * m / 1.2), '#ffdf6b', '#22252b', 4));
    const pc = img.parentContainer;
    if (pc) { pc.addAt(rig.root, pc.getIndex(img)); stars.forEach(s => pc.add(s)); }
    else { rig.root.setDepth(img.depth); stars.forEach(s => s.setDepth(img.depth + 0.1)); }
  };
  const upd = (_t: number, dms: number) => {
    if (dead) return; if (!img.active) return stop();
    if (!rig) return; const dt = Math.min(dms, 50) / 1000; t += dt;
    const on = img.texture.key === 'pup_dizzy';
    img.setVisible(!on); rig.root.setVisible(on && img.alpha > 0); stars.forEach(s => s.setVisible(on));
    if (!on) return;
    const m = Math.abs(img.scaleX) / artScale('pup_dizzy', 1), u = PUP_SCALE * m, br = Math.sin(t * 2.6);
    // he lies on his side (head toward the hero, belly to the viewer); the scene's tweens give the angle (about -80..-95 on the cards)
    const a = img.angle;
    rig.root.setPosition(img.x, img.y).setAlpha(img.alpha);
    rig.inner.setAngle(a).setY(0); rig.squash(1 + br * 0.02, Math.abs(img.scaleY / img.scaleX) * (1 - br * 0.025)); // slow sleepy breathing
    rig.update(dt, 0, 0.5); const lie = Phaser.Math.Clamp(Math.abs(a) / 80, 0, 1); rig.tail.setAngle(Phaser.Math.Linear(TAIL_FLAT + 16, TAIL_FLAT - 64, lie)); rig.tail.cap.setAngle(rig.tail.angle); // tail flopped out along the floor, a lazy little wag
    const sh = rig.root.getData('sh') as Phaser.GameObjects.Image; sh.setPosition(Math.sin(Phaser.Math.DegToRad(a)) * 95 * u, 4);
    // dizzy stars orbit just above his head (head centre ~144 u up his body axis)
    const r = Phaser.Math.DegToRad(a), hx = Math.sin(r) * 150 * u, hy = -Math.cos(r) * 150 * u - 105 * u;
    stars.forEach((s, i) => { const q = t * 4 + i * 2.09; s.setPosition(img.x + hx + Math.cos(q) * 70 * u, img.y + hy + Math.sin(q) * 16 * u).setScale(0.8 + 0.25 * Math.sin(q)).setAngle(Math.sin(q * 1.3) * 20); });
  };
  const stop = () => { dead = true; scene.events.off('update', upd); };
  scene.events.on('update', upd); scene.events.once('shutdown', stop);
  if (KO_PUP_KEYS.every(k => scene.textures.exists(k))) build(); else ensureArt(scene, KO_PUP_KEYS).then(build).catch(() => { /* keep the old image */ });
  return stop;
}
