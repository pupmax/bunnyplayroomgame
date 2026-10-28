// Laser Lure (Noir) props: drawn once with Graphics and baked to textures (ll_*), plus the picture tutorial (id noir4).
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { txt, comic } from '../systems/fx';
import { Storage } from '../systems/storage';
import { art } from '../art/registry';

const INK = 0x22252b;
const bake = (scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
  if (scene.textures.exists(key)) return; const g = scene.make.graphics({ x: 0, y: 0 }, false); draw(g); g.generateTexture(key, w, h); g.destroy(); };

/** all ll_* textures (idempotent) */
export function laserTextures(scene: Phaser.Scene) {
  // laundry basket (origin bottom centre when placed): 170 x 140, pink + white socks peeking out
  bake(scene, 'll_basket', 170, 140, g => {
    g.fillStyle(0xff9fc0, 1).lineStyle(4, INK, 1).fillEllipse(55, 30, 60, 36).strokeEllipse(55, 30, 60, 36);
    g.fillStyle(0xffffff, 1).fillEllipse(110, 26, 56, 34).strokeEllipse(110, 26, 56, 34); g.fillStyle(0x8fd3ff, 1).fillEllipse(84, 22, 40, 26).strokeEllipse(84, 22, 40, 26);
    g.fillStyle(0xe9d2a6, 1).lineStyle(5, INK, 1);
    g.beginPath(); g.moveTo(10, 36); g.lineTo(160, 36); g.lineTo(146, 134); g.lineTo(24, 134); g.closePath(); g.fillPath(); g.strokePath();
    g.lineStyle(3, 0xa8875a, 1); for (let i = 1; i < 7; i++) { const x = 10 + i * 21.4; g.lineBetween(x, 40, x - (x - 85) * 0.1, 130); }
    for (let j = 0; j < 4; j++) g.lineBetween(16 + j * 2, 58 + j * 20, 154 - j * 2, 58 + j * 20);
    g.fillStyle(0xd9b98a, 1).lineStyle(5, INK, 1).fillRoundedRect(4, 30, 162, 18, 9).strokeRoundedRect(4, 30, 162, 18, 9);
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(14, 34, 60, 6, 3);
  });
  // glass patio door: 190 x 360
  bake(scene, 'll_door', 190, 360, g => {
    g.fillStyle(0xf4efe6, 1).lineStyle(6, INK, 1).fillRoundedRect(4, 4, 182, 352, 10).strokeRoundedRect(4, 4, 182, 352, 10);
    g.fillStyle(0x9fd8ff, 0.55).lineStyle(4, INK, 1).fillRect(20, 20, 150, 320).strokeRect(20, 20, 150, 320);
    g.fillStyle(0x2a3a6a, 0.45).fillRect(22, 22, 146, 150); // night outside
    g.fillStyle(0xffffff, 0.8); for (const [x, y] of [[50, 50], [120, 80], [80, 130], [140, 40]]) g.fillCircle(x, y, 2.5);
    g.fillStyle(0x6fcf6f, 0.5).fillEllipse(95, 300, 170, 60);
    g.fillStyle(0xffffff, 0.45); g.beginPath(); g.moveTo(40, 330); g.lineTo(70, 330); g.lineTo(150, 30); g.lineTo(120, 30); g.closePath(); g.fillPath();
    g.fillStyle(0xffffff, 0.25); g.beginPath(); g.moveTo(84, 330); g.lineTo(96, 330); g.lineTo(168, 60); g.lineTo(162, 40); g.closePath(); g.fillPath();
    g.fillStyle(0xc9c2b4, 1).lineStyle(3, INK, 1).fillRoundedRect(150, 170, 12, 40, 6).strokeRoundedRect(150, 170, 12, 40, 6);
  });
  // rug (flat oval) 260 x 96 and the rolled-up rug (burrito) 200 x 84
  bake(scene, 'll_rug', 260, 96, g => {
    g.fillStyle(0x7a2a4a, 1).lineStyle(4, INK, 0.8).fillEllipse(130, 48, 252, 88).strokeEllipse(130, 48, 252, 88);
    g.fillStyle(0xd0567a, 1).fillEllipse(130, 48, 222, 70); g.lineStyle(4, 0xffdf6b, 0.8).strokeEllipse(130, 48, 180, 52);
    g.fillStyle(0xffdf6b, 0.9); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.fillCircle(130 + Math.cos(a) * 60, 48 + Math.sin(a) * 16, 5); }
    g.fillStyle(0xffffff, 0.8); for (let i = 0; i < 14; i++) g.fillRect(8 + i * 0.4, 30 + i * 2.5, 6, 2); // fringe
  });
  bake(scene, 'll_roll', 200, 84, g => {
    g.fillStyle(0xd0567a, 1).lineStyle(5, INK, 1).fillRoundedRect(4, 6, 170, 72, 36).strokeRoundedRect(4, 6, 170, 72, 36);
    g.lineStyle(4, 0xffdf6b, 0.9); for (const x of [50, 90, 130]) g.lineBetween(x, 10, x - 6, 74);
    g.fillStyle(0x7a2a4a, 1).lineStyle(5, INK, 1).fillEllipse(170, 42, 44, 74).strokeEllipse(170, 42, 44, 74);
    g.lineStyle(3, 0xffdf6b, 1); g.beginPath(); g.arc(170, 42, 12, 0, Math.PI * 1.6); g.strokePath(); g.beginPath(); g.arc(170, 42, 24, 0.5, Math.PI * 1.9); g.strokePath();
  });
  // toy piano 190 x 130
  bake(scene, 'll_piano', 190, 130, g => {
    g.fillStyle(0xe8394f, 1).lineStyle(5, INK, 1).fillRoundedRect(6, 10, 178, 84, 16).strokeRoundedRect(6, 10, 178, 84, 16);
    g.fillStyle(0xffffff, 0.3).fillRoundedRect(16, 16, 80, 10, 5);
    g.fillStyle(0xffffff, 1).lineStyle(3, INK, 1).fillRect(18, 34, 154, 48).strokeRect(18, 34, 154, 48);
    for (let i = 1; i < 11; i++) g.lineBetween(18 + i * 14, 34, 18 + i * 14, 82);
    g.fillStyle(INK, 1); for (const i of [1, 2, 4, 5, 6, 8, 9]) g.fillRect(18 + i * 14 - 4, 34, 8, 28);
    g.fillStyle(0xb02236, 1).lineStyle(5, INK, 1); for (const x of [26, 164]) g.fillRoundedRect(x - 9, 90, 18, 36, 6).strokeRoundedRect(x - 9, 90, 18, 36, 6);
  });
  // bubble wrap sheet 230 x 90
  bake(scene, 'll_bubble', 230, 90, g => {
    g.fillStyle(0xcfefff, 0.85).lineStyle(4, 0x5aa7d6, 1); g.beginPath(); g.moveTo(30, 6); g.lineTo(226, 10); g.lineTo(200, 84); g.lineTo(4, 80); g.closePath(); g.fillPath(); g.strokePath();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) { const x = 34 + c * 20 - r * 6, y = 18 + r * 18; g.fillStyle(0xffffff, 0.9).fillCircle(x, y, 7); g.lineStyle(2, 0x5aa7d6, 0.8).strokeCircle(x, y, 7); }
  });
  // Bunny's portrait frame (transparent window; her bust sits behind it) 170 x 190
  bake(scene, 'll_frame', 170, 190, g => {
    g.fillStyle(0xd9a93a, 1).lineStyle(5, INK, 1); g.beginPath(); g.moveTo(4, 4); g.lineTo(166, 4); g.lineTo(166, 186); g.lineTo(4, 186); g.lineTo(4, 4); g.moveTo(24, 24); g.lineTo(24, 166); g.lineTo(146, 166); g.lineTo(146, 24); g.lineTo(24, 24); g.closePath(); g.fillPath();
    g.strokeRect(4, 4, 162, 182); g.strokeRect(24, 24, 122, 142);
    g.fillStyle(0xffeaa0, 0.8); for (const [x, y] of [[14, 14], [156, 14], [14, 176], [156, 176]]) g.fillCircle(x, y, 5);
    g.fillStyle(0xfff3c4, 0.6).fillRect(8, 8, 154, 5);
  });
  bake(scene, 'll_frame_bg', 122, 142, g => { g.fillStyle(0xffd6e6, 1).fillRect(0, 0, 122, 142); g.fillStyle(0xffffff, 0.35).fillCircle(61, 60, 50); });
  // tea table (Bunny's, the decoy) 170 x 150: round top, teapot + cups
  bake(scene, 'll_table', 170, 150, g => {
    g.fillStyle(0x8a5a2a, 1).lineStyle(5, INK, 1); for (const x of [36, 134]) g.fillRoundedRect(x - 7, 70, 14, 76, 6).strokeRoundedRect(x - 7, 70, 14, 76, 6);
    g.fillStyle(0xffffff, 1).fillEllipse(85, 70, 160, 40).strokeEllipse(85, 70, 160, 40); g.fillStyle(0xff9fc0, 1).fillEllipse(85, 70, 120, 26);
    g.fillStyle(0xffffff, 1).lineStyle(4, INK, 1).fillEllipse(80, 44, 54, 44).strokeEllipse(80, 44, 54, 44); g.fillCircle(80, 20, 7).strokeCircle(80, 20, 7);
    g.lineStyle(4, INK, 1); g.beginPath(); g.arc(108, 44, 12, -1.4, 1.4); g.strokePath(); g.lineBetween(54, 40, 40, 30);
    g.fillStyle(0xff5c8a, 1).fillCircle(80, 46, 6);
    g.fillStyle(0xffffff, 1).lineStyle(3, INK, 1).fillRoundedRect(120, 52, 22, 18, 5).strokeRoundedRect(120, 52, 22, 18, 5).fillRoundedRect(24, 54, 22, 18, 5).strokeRoundedRect(24, 54, 22, 18, 5);
  });
  // pet carrier (finale) 220 x 170, door separate (ll_cdoor 80 x 110)
  bake(scene, 'll_carrier', 220, 170, g => {
    g.fillStyle(0xb88cff, 1).lineStyle(6, INK, 1).fillRoundedRect(6, 30, 208, 134, 30).strokeRoundedRect(6, 30, 208, 134, 30);
    g.fillStyle(0x8a5ad8, 1).fillRoundedRect(6, 118, 208, 46, { tl: 0, tr: 0, bl: 30, br: 30 }); g.lineStyle(6, INK, 1).strokeRoundedRect(6, 30, 208, 134, 30);
    g.fillStyle(0x2a1a3e, 1).fillRoundedRect(60, 52, 100, 100, 18);
    g.lineStyle(8, INK, 1).beginPath(); g.arc(110, 34, 40, Math.PI, 0); g.strokePath(); g.lineStyle(4, 0xffdf6b, 1).beginPath(); g.arc(110, 34, 40, Math.PI, 0); g.strokePath();
    g.fillStyle(0xffffff, 1).fillCircle(32, 70, 6).fillCircle(188, 70, 6);
  });
  bake(scene, 'll_cdoor', 104, 104, g => { g.lineStyle(6, INK, 1).fillStyle(0xd8d8e0, 0.25).fillRoundedRect(3, 3, 98, 98, 16).strokeRoundedRect(3, 3, 98, 98, 16);
    g.lineStyle(5, 0xd8d8e0, 1); for (let i = 1; i < 5; i++) g.lineBetween(3 + i * 19.6, 6, 3 + i * 19.6, 98); g.lineBetween(6, 52, 98, 52); });
  // roomba 150 x 54
  bake(scene, 'll_roomba', 150, 54, g => { g.fillStyle(0x3a3f4a, 1).lineStyle(5, INK, 1).fillEllipse(75, 30, 144, 46).strokeEllipse(75, 30, 144, 46);
    g.fillStyle(0x5a6070, 1).fillEllipse(75, 24, 120, 30); g.fillStyle(0x7dff9a, 1).fillCircle(75, 22, 6); g.fillStyle(0xffffff, 0.3).fillEllipse(56, 18, 40, 8); });
  // frilly sock hat 90 x 70
  bake(scene, 'll_sock', 90, 70, g => {
    g.fillStyle(0xff7eb0, 1).lineStyle(4, INK, 1); g.beginPath(); g.moveTo(10, 50); g.lineTo(18, 14); g.lineTo(54, 6); g.lineTo(74, 26); g.lineTo(84, 40); g.lineTo(70, 54); g.lineTo(50, 44); g.lineTo(40, 54); g.closePath(); g.fillPath(); g.strokePath();
    g.fillStyle(0xffffff, 1); for (let i = 0; i < 6; i++) g.fillCircle(12 + i * 7, 54 - i * 1.2, 6); g.lineStyle(3, INK, 1); for (let i = 0; i < 6; i++) g.strokeCircle(12 + i * 7, 54 - i * 1.2, 6);
    g.fillStyle(0xffffff, 0.9); for (const [x, y] of [[30, 26], [48, 18], [60, 34]]) g.fillCircle(x, y, 4);
  });
  // Noir's velvet cushion 170 x 60
  bake(scene, 'll_cushion', 170, 60, g => { g.fillStyle(0x5a2a8a, 1).lineStyle(5, INK, 1).fillRoundedRect(5, 10, 160, 44, 22).strokeRoundedRect(5, 10, 160, 44, 22);
    g.fillStyle(0x7a4ab0, 1).fillRoundedRect(14, 14, 142, 16, 8); g.fillStyle(0xffdf6b, 1).fillCircle(8, 32, 7).fillCircle(162, 32, 7); });
  // laser pointer (in Noir's paw) 60 x 18
  bake(scene, 'll_pointer', 60, 18, g => { g.fillStyle(0x3a3f4a, 1).lineStyle(3, INK, 1).fillRoundedRect(2, 3, 52, 12, 6).strokeRoundedRect(2, 3, 52, 12, 6); g.fillStyle(0xff3b3b, 1).fillCircle(54, 9, 4); g.fillStyle(0xffdf6b, 1).fillRect(14, 5, 8, 3); });
  // soft round glow
  bake(scene, 'll_glow', 120, 120, g => { for (let i = 20; i > 0; i--) g.fillStyle(0xffffff, 0.05).fillCircle(60, 60, i * 3); });
}

// ------------------------------------------------------------ picture tutorial
export const LASER_TUT = 'noir4';
const STEPS = [
  { chip: 'DRAG', text: 'Drag anywhere to move\nthe red dot. Puppy\nCAN\'T resist it.', col: 0xff3b3b },
  { chip: 'ZOOMIES!', text: 'Give him a RUN-UP!\nTROT > RUN > ZOOMIES!\nFaster = bigger crash.', col: 0xff8a1f },
  { chip: 'CRASH!', text: 'Steer him into the\nGLOWING trap. 7 crashes!\nToo far = he loses it.', col: 0x2fbf5a },
];
function chip(scene: Phaser.Scene, x: number, y: number, s: string, col: number) {
  const c = scene.add.container(x, y), t = comic(scene, 0, 0, s, 34), w = t.width + 40, g = scene.add.graphics();
  g.fillStyle(col, 1).lineStyle(5, INK, 1).fillRoundedRect(-w / 2, -30, w, 60, 26).strokeRoundedRect(-w / 2, -30, w, 60, 26); c.add([g, t]); return c;
}
function pic(scene: Phaser.Scene, n: number): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0), g = scene.add.graphics(); c.add(g);
  g.fillStyle(0x6a3e1e, 1).fillRoundedRect(-120, -88, 240, 176, 18); g.fillStyle(0x7d4a24, 1); for (let i = 0; i < 4; i++) g.fillRect(-120, -80 + i * 44, 240, 3);
  const dot = (x: number, y: number) => { g.fillStyle(0xff3b3b, 0.3).fillCircle(x, y, 20); g.fillStyle(0xff3b3b, 1).fillCircle(x, y, 10); g.fillStyle(0xffffff, 1).fillCircle(x - 3, y - 3, 3); };
  if (n === 1) {
    const p = art(scene, -40, 70, 'pt_run2', 0.62); c.add(p); dot(70, 40);
    g.lineStyle(5, 0xffffff, 0.9); for (let i = 0; i < 4; i++) g.lineBetween(-10 + i * 16, 40, -2 + i * 16, 40);
    const hand = scene.add.container(80, 54); const hg = scene.add.graphics(); hg.fillStyle(0xffffff, 1).lineStyle(4, INK, 1).fillRoundedRect(-9, 0, 18, 46, 9).strokeRoundedRect(-9, 0, 18, 46, 9).fillRoundedRect(-22, 32, 46, 40, 16).strokeRoundedRect(-22, 32, 46, 40, 16); hand.add(hg); c.add(hand);
    scene.tweens.add({ targets: hand, x: 40, y: 30, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
  } else if (n === 2) {
    const p = art(scene, -10, 76, 'pt_run4', 0.62); c.add(p); dot(96, 30);
    g.lineStyle(6, 0xffffff, 0.85); for (let i = 0; i < 3; i++) g.lineBetween(-110, -10 + i * 22, -70 - i * 8, -10 + i * 22);
    const z = comic(scene, 0, -58, 'ZOOM!', 30); c.add(z); scene.tweens.add({ targets: p, x: 4, yoyo: true, repeat: -1, duration: 160 });
  } else {
    const b = art(scene, 40, 70, 'pt_dizzy', 0.62).setAngle(-70); const bs = scene.add.image(-30, 72, 'll_piano').setOrigin(0.5, 1).setScale(0.7);
    g.lineStyle(5, 0x7dff9a, 1).strokeEllipse(-30, 74, 170, 40); c.add([bs, b]); const w = comic(scene, 10, -50, 'BLAAANG!', 32); c.add(w);
    scene.tweens.add({ targets: w, scale: 1.12, yoyo: true, repeat: -1, duration: 300 });
  }
  return c;
}
/** 3 picture steps; done() when dismissed (or at once if already seen). */
export function laserTutorial(scene: Phaser.Scene, done: () => void) {
  if (Storage.getTutorialSeen(LASER_TUT)) { done(); return; }
  const W = GAME_W, H = GAME_H, W_ = window as any; W_.__tutorialOpen = true;
  const c = scene.add.container(0, 0).setDepth(950);
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
  const top = 170, bot = 1130, g = scene.add.graphics();
  g.fillStyle(0xfff3e0, 1).lineStyle(6, INK, 1).fillRoundedRect(40, top, W - 80, bot - top, 34).strokeRoundedRect(40, top, W - 80, bot - top, 34);
  const title = txt(scene, W / 2, top + 50, 'LASER LURE!', 52, '#ff3b3b', '#22252b', 7);
  const goal = txt(scene, W / 2, top + 116, 'One thumb. Drag the dot.\nCrash Puppy into the traps!', 30, '#6b4cc9', '#fff3e0', 0).setAlign('center');
  c.add([dim, g, title, goal]);
  STEPS.forEach((st, i) => {
    const y = top + 320 + i * 215, panel = scene.add.graphics();
    panel.fillStyle(0xf6e6cc, 1).lineStyle(3, 0xd8c2a0, 1).fillRoundedRect(62, y - 100, W - 124, 200, 26).strokeRoundedRect(62, y - 100, W - 124, 200, 26);
    const num = scene.add.container(86, y - 74, [scene.add.circle(0, 0, 24, INK), txt(scene, 0, 0, String(i + 1), 32, '#fff27a', '#22252b', 0)]);
    const p = pic(scene, i + 1); p.setPosition(210, y); p.setScale(0.98);
    const ch = chip(scene, 500, y - 52, st.chip, st.col);
    const tx = txt(scene, 500, y + 36, st.text, 23, '#22252b', '#f6e6cc', 0).setLineSpacing(3).setAlign('center');
    c.add([panel, p, num, ch, tx]);
  });
  const hint = txt(scene, W / 2, bot - 44, 'Tap anywhere to start', 36, '#ff5c8a', '#22252b', 6).setAlpha(0.35); c.add(hint);
  let shownAt = 0, lit = false, closed = false; W_.__tutorialShownAt = 0; W_.__tutorialClosedAt = 0;
  const onUpd = () => {
    if (!shownAt) { shownAt = performance.now(); W_.__tutorialShownAt = shownAt; return; }
    if (!lit && c.active && performance.now() - shownAt >= 600) { lit = true; hint.setAlpha(1); scene.tweens.add({ targets: hint, alpha: 0.55, scale: 0.96, yoyo: true, repeat: -1, duration: 600 }); }
    if (lit || !c.active) scene.events.off(Phaser.Scenes.Events.POST_UPDATE, onUpd);
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, onUpd);
  c.once('destroy', () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, onUpd));
  dim.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev?.stopPropagation?.();
    if (closed || !shownAt || performance.now() - shownAt < 600) return;
    closed = true; W_.__tutorialClosedAt = performance.now(); Storage.setTutorialSeen(LASER_TUT); W_.__tutorialOpen = false;
    const all: Phaser.GameObjects.GameObject[] = []; const walk = (o: any) => { all.push(o); if (o.list) o.list.forEach(walk); }; walk(c); scene.tweens.killTweensOf(all);
    c.destroy();
    const eat = (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => e?.stopPropagation?.();
    const shield = scene.add.zone(0, 0, W, H).setOrigin(0).setDepth(2000).setInteractive().on('pointerdown', eat).on('pointerup', eat);
    scene.time.delayedCall(250, () => shield.destroy());
    scene.time.delayedCall(0, done);
  });
}
