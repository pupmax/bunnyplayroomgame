// Shared scene helpers: backgrounds, pop-up banners, speech bubbles, tutorial card, hub hall layout.
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { art } from '../art/registry';
import { txt, bubble, comic } from './fx';
import { makeButton } from './ui';
import { Storage } from './storage';
import { bakeG } from './bake';
export { bakeG };

export function hallBg(scene: Phaser.Scene, top = 0x3b1f5e, bot = 0xc76fb0, painted = true): Phaser.GameObjects.GameObject {
  if (painted) return art(scene, 0, 0, 'bg_hall');
  const g = scene.add.graphics();
  g.fillGradientStyle(top, top, bot, bot, 1); g.fillRect(0, 0, W, H);
  g.fillStyle(0xffffff, 0.06); for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, H * 0.62);
  g.fillStyle(0xc77a4a, 1); g.fillRect(0, H * 0.62, W, H); g.fillStyle(0xa85f36, 1);
  for (let y = H * 0.62; y < H; y += 46) g.fillRect(0, y, W, 4);
  return g;
}
/** Pop-up banner that slams in and fades. */
export function popBanner(scene: Phaser.Scene, s: string, y = 300, color = 0xff5c8a, hold = 1100) {
  const c = scene.add.container(W / 2, y).setDepth(800);
  const t = comic(scene, 0, -2, s, 38, '#ffffff', '#ffe27a', '#22252b'); t.setWordWrapWidth(560);
  const w = Math.min(680, t.width + 70), h = t.height + 34;
  const dark = Phaser.Display.Color.IntegerToColor(color).darken(25).color;
  const g = scene.add.graphics(); g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 4, -h / 2 + 10, w, h, 28);
  g.fillStyle(dark, 1).lineStyle(5, COLORS.INK, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 28).strokeRoundedRect(-w / 2, -h / 2, w, h, 28);
  g.fillStyle(color, 1).fillRoundedRect(-w / 2 + 5, -h / 2 + 4, w - 10, h - 12, 24); g.fillStyle(0xffffff, 0.25).fillRoundedRect(-w / 2 + 14, -h / 2 + 8, w - 28, h * 0.28, 12);
  c.add([g, t]); c.setScale(0).setAngle(Phaser.Math.Between(-4, 4));
  scene.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.Out' });
  scene.tweens.add({ targets: c, alpha: 0, y: y - 40, delay: hold, duration: 300, onComplete: () => c.destroy() });
  return c;
}
/** Speech bubble that pops at (x,y) and disappears. */
export function say(scene: Phaser.Scene, x: number, y: number, s: string, size = 26, hold = 1800) {
  const b = bubble(scene, x, y, s, size).setDepth(790);
  b.setScale(0); scene.tweens.add({ targets: b, scale: 1, duration: 250, ease: 'Back.Out' });
  scene.tweens.add({ targets: b, alpha: 0, delay: hold, duration: 250, onComplete: () => b.destroy() });
  return b;
}
/** Floating score/feedback text. */
export function floatText(scene: Phaser.Scene, x: number, y: number, s: string, color = '#ffdf6b', size = 40) {
  const t = txt(scene, x, y, s, size, color, '#22252b', 8).setDepth(780).setAngle(Phaser.Math.Between(-10, 10));
  scene.tweens.add({ targets: t, y: y - 90, alpha: 0, duration: 800, ease: 'Quad.Out', onComplete: () => t.destroy() });
}
/** How-to-play card shown on first play. Calls done() on dismiss. */
export function tutorialCard(scene: Phaser.Scene, id: string, title: string, lines: string[], done: () => void, demo?: 'boxing') {
  if (Storage.getTutorialSeen(id)) { done(); return; }
  (window as any).__tutorialOpen = true;
  const c = scene.add.container(0, 0).setDepth(950);
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
  const top = demo ? 230 : 300, bot = demo ? 1010 : 940;
  const g = scene.add.graphics(); g.fillStyle(0xfff3e0, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(60, top, W - 120, bot - top, 34).strokeRoundedRect(60, top, W - 120, bot - top, 34);
  const t = txt(scene, W / 2, top + 60, title, 48, '#ff5c8a', '#22252b', 7);
  const step = demo ? 56 : 90, size = demo ? 25 : 30;
  const body = lines.map((l, i) => txt(scene, W / 2, top + 150 + i * step, l, size, '#22252b', '#fff', 0).setWordWrapWidth(540));
  c.add([dim, g, t, ...body]);
  if (demo === 'boxing') c.add(boxingDemo(scene, W / 2, top + 150 + lines.length * step + 70));
  // No button (it sat in the way): "Tap anywhere to start". Taps in the first 0.6 s are ignored, then the first tap
  // closes the card ONCE and starts the level. The tap is swallowed (stopPropagation) so it can't also punch/dodge.
  const hint = txt(scene, W / 2, bot - (demo ? 45 : 70), 'Tap anywhere to start', demo ? 34 : 36, '#ff5c8a', '#22252b', 6).setAlpha(0.35); c.add(hint);
  // Lockout: 600 ms of REAL time since the card was first drawn (performance.now). Not the scene clock: it is stale in
  // create() and runs slow after heavy loads (Phaser's panic cooldown feeds fixed 16.7 ms deltas), which made it 2-3 s.
  let shownAt = 0, lit = false, closed = false; const W_ = window as any; W_.__tutorialShownAt = 0; W_.__tutorialClosedAt = 0;
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
    closed = true; W_.__tutorialClosedAt = performance.now(); Storage.setTutorialSeen(id); (window as any).__tutorialOpen = false;
    killTree(scene, c); c.destroy();
    // swallow the rest of this touch and any quick double-tap for 250 ms, so it can't count as a punch/dodge/throw
    const eat = (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => e?.stopPropagation?.();
    const shield = scene.add.zone(0, 0, W, H).setOrigin(0).setDepth(2000).setInteractive().on('pointerdown', eat).on('pointerup', eat);
    scene.time.delayedCall(250, () => shield.destroy());
    scene.time.delayedCall(0, done);
  });
}
/** Stop every tween/timer that targets anything inside a container tree (call before destroying it). */
function killTree(scene: Phaser.Scene, root: Phaser.GameObjects.GameObject) {
  const all: Phaser.GameObjects.GameObject[] = [];
  const walk = (o: any) => { all.push(o); if (o.list) o.list.forEach(walk); };
  walk(root); scene.tweens.killTweensOf(all);
}
/** Looping ghost-hand demo: '!' on the left -> hand taps RIGHT dodge -> Puppy wobbles -> hand taps PUNCH. */
function boxingDemo(scene: Phaser.Scene, x: number, y: number) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const btn = (bx: number, col: number, label: string) => { g.fillStyle(col, 1).lineStyle(4, COLORS.INK, 1).fillRoundedRect(bx - 70, 40, 140, 64, 18).strokeRoundedRect(bx - 70, 40, 140, 64, 18); c.add(txt(scene, bx, 72, label, 22, '#fff', '#22252b', 5)); };
  c.add(g); btn(-170, 0x3a86ff, '◀ DODGE'); btn(0, 0xff5c8a, 'PUNCH'); btn(170, 0x3a86ff, 'DODGE ▶');
  // Mini Puppy-in-the-bag (same layout as the Boxing rig, scaled down): head pokes out the top, bag swings on its chain
  const bag = scene.add.container(0, -150).setScale(0.3); c.add(bag);
  const chain = scene.add.graphics().lineStyle(10, 0x6b6b78, 1).lineBetween(0, 250, 0, 380); bag.add(chain);
  const swing = scene.add.container(0, 380); bag.add(swing);
  const pup = art(scene, 0, 130, 'pup_box_idle', 1.5); swing.add(pup);
  const bg = scene.add.graphics(); bg.fillStyle(0xe0243a, 1).lineStyle(14, COLORS.INK, 1).fillRoundedRect(-120, 0, 240, 400, { tl: 20, tr: 20, bl: 110, br: 110 }).strokeRoundedRect(-120, 0, 240, 400, { tl: 20, tr: 20, bl: 110, br: 110 });
  bg.fillStyle(0xffdf6b, 1).lineStyle(8, COLORS.INK, 1).fillRoundedRect(-80, 160, 160, 64, 14).strokeRoundedRect(-80, 160, 160, 64, 14); swing.add(bg);
  swing.add(txt(scene, 0, 190, 'BONK!', 40, '#e0243a', '#22252b', 4));
  scene.tweens.add({ targets: swing, angle: { from: -14, to: 14 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  const bang = txt(scene, -120, -60, '!', 64, '#ffdf6b', '#e0243a', 8); c.add(bang);
  const cap = txt(scene, 0, -100, '', 22, '#6b4cc9', '#fff', 0); c.add(cap);
  const hand = txt(scene, 0, 140, '👆', 60); c.add(hand);
  const loop = () => {
    if (!c.active) return;
    pup.setTexture('pup_box_idle'); bang.setVisible(true); cap.setText('Bag swings at you → DODGE the lit side'); hand.setPosition(0, 160).setAlpha(1);
    scene.tweens.chain({ targets: hand, tweens: [
      { x: 170, y: 90, duration: 500, delay: 300 },
      { scale: 0.8, duration: 90, yoyo: true, onComplete: () => { if (!c.active) return; bang.setVisible(false); pup.setTexture('pup_dizzy'); cap.setText('Bag wobbles → PUNCH!'); } },
      { x: 0, y: 90, duration: 400, delay: 200 },
      { scale: 0.8, duration: 80, yoyo: true, repeat: 2 },
      { alpha: 0, duration: 300, delay: 300, onComplete: () => { if (c.active) scene.time.delayedCall(200, loop); } },
    ] });
  };
  c.once('destroy', () => killTree(scene, c));
  loop();
  return c;
}
export const DOOR_POS: [number, number][] = [[90, 1080], [270, 1080], [450, 1080], [630, 1080], [630, 750], [450, 750], [270, 750], [90, 750], [W / 2, 300]];
/** Static hall with doors; returns door containers. state(i) => 'beaten' | 'open' | 'soon' | 'locked'. */
export function drawHall(scene: Phaser.Scene, cast: { name: string }[], state: (i: number) => string, best: (i: number) => number) {
  hallBg(scene); dungeonFx(scene);
  const doors: Phaser.GameObjects.Container[] = [];
  for (let i = 0; i < 9; i++) {
    const [x, y] = DOOR_POS[i]; const big = i === 8; const st = state(i);
    const w = big ? 300 : 150, h = big ? 300 : 196;
    const c = scene.add.container(x, y);
    const g = scene.add.graphics(); const r = { tl: w / 2, tr: w / 2, bl: 12, br: 12 };
    const lit = big || st === 'beaten' || st === 'open';
    if (lit) { const glow = scene.add.image(0, 0, 'su_dust').setScale(w / 40, h / 40).setTint(big ? 0xff3b5a : 0xffcf6b).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD); c.add(glow);
      scene.tweens.add({ targets: glow, alpha: 0.25, yoyo: true, repeat: -1, duration: 900 }); }
    g.fillStyle(0x000000, 0.45).fillRoundedRect(-w / 2 + 6, -h / 2 + 12, w, h, r);
    // gold frame
    g.fillStyle(0x8a5a10, 1).lineStyle(5, 0x2a0a0a, 1).fillRoundedRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 12, { tl: w / 2 + 8, tr: w / 2 + 8, bl: 14, br: 14 }).strokeRoundedRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 12, { tl: w / 2 + 8, tr: w / 2 + 8, bl: 14, br: 14 });
    g.fillStyle(0xe0a82e, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 5, w + 8, h + 4, { tl: w / 2 + 4, tr: w / 2 + 4, bl: 12, br: 12 });
    const door = big ? 0x9a0f22 : lit ? 0x5a0f1c : 0x2a1a2e, doorHi = big ? 0xd0243a : lit ? 0x8a1a2c : 0x40304a;
    g.fillStyle(door, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(doorHi, 1).fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h * 0.55, { tl: w / 2 - 8, tr: w / 2 - 8, bl: 8, br: 8 });
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(-w / 2 + 14, -h / 2 + 14, w * 0.3, h * 0.5, 10);
    g.fillStyle(0xffd76b, 1).fillCircle(w / 2 - 18, h * 0.18, 6);
    g.fillStyle(0xfff3e0, 1).lineStyle(6, 0x8a5a10, 1).fillCircle(0, -h * 0.12, w * 0.38).strokeCircle(0, -h * 0.12, w * 0.38);
    g.lineStyle(2, 0xffffff, 0.6).strokeCircle(0, -h * 0.12, w * 0.38 - 5);
    c.add(g); bakeG(scene, g, `door_${big ? 'big' : 'sm'}_${door.toString(16)}`, -w / 2 - 12, -h / 2 - 12, w + 24, h + 28);
    if (big) { const gg = scene.add.graphics();
      gg.fillStyle(0x2a1a10, 0.9).fillRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, { tl: w / 2 - 10, tr: w / 2 - 10, bl: 6, br: 6 });
      gg.fillStyle(0x9a0f22, 1).fillRoundedRect(-w / 2 + 18, -h / 2 + 18, w - 36, h - 36, { tl: w / 2 - 18, tr: w / 2 - 18, bl: 6, br: 6 });
      gg.lineStyle(4, 0x5a0814, 0.8); for (let x = -w / 2 + 50; x < w / 2 - 20; x += 50) gg.lineBetween(x, -h / 2 + 30 + Math.abs(x) * 0.25, x, h / 2 - 10);
      gg.fillStyle(0x5a5468, 1).lineStyle(3, 0x2a2030, 1); for (const yy of [-h * 0.02, h * 0.32]) { gg.fillRect(-w / 2 + 18, yy - 7, w - 36, 14).strokeRect(-w / 2 + 18, yy - 7, w - 36, 14); }
      gg.fillStyle(0xd8d4e0, 1); for (const yy of [-h * 0.02, h * 0.32]) for (let x = -w / 2 + 34; x < w / 2 - 20; x += 40) gg.fillCircle(x, yy, 3.5);
      gg.fillStyle(0xd8d4e0, 1).lineStyle(3, 0x2a2030, 1);
      for (let x = -w / 2 + 50; x < w / 2 - 20; x += 50) { gg.fillTriangle(x - 9, h / 2 - 8, x + 9, h / 2 - 8, x, h / 2 + 14); gg.strokeTriangle(x - 9, h / 2 - 8, x + 9, h / 2 - 8, x, h / 2 + 14); }
      for (let a = -60; a <= 60; a += 30) { const rr = w / 2 + 6, ax = Math.sin(a * Math.PI / 180) * rr, ay = -h / 2 + w / 2 - Math.cos(a * Math.PI / 180) * rr; gg.fillTriangle(ax - 10, ay + 8, ax + 10, ay + 8, ax * 1.12, ay - 24 + 8); gg.strokeTriangle(ax - 10, ay + 8, ax + 10, ay + 8, ax * 1.12, ay - 24 + 8); }
      c.add(gg); bakeG(scene, gg, 'door_bigbars', -166, -176, 332, 348);
      const sign = scene.add.container(0, -h / 2 - 34); const sg = scene.add.graphics();
      sg.lineStyle(4, 0x2a1420, 1).lineBetween(-40, -24, -30, 10).lineBetween(40, -24, 30, 10);
      sg.fillStyle(0x7a4a2a, 1).lineStyle(5, 0x2a1420, 1).fillRoundedRect(-70, 0, 140, 46, 10).strokeRoundedRect(-70, 0, 140, 46, 10);
      sign.add([sg, txt(scene, 0, 24, 'BOSS', 34, '#ffdf6b', '#22252b', 7)]); bakeG(scene, sg, 'door_sign', -76, -28, 152, 80); sign.setAngle(-4); c.add(sign);
      scene.tweens.add({ targets: sign, angle: 4, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.InOut' });
      c.add(art(scene, 0, 60, 'bun_bust_wink', 1.05)); c.add(txt(scene, 0, h / 2 - 20, 'BUNNY', 40, '#ffdf6b', '#22252b', 8)); c.add(txt(scene, 0, h / 2 + 22, st === 'open' ? 'FINALE • PLAY!' : st === 'beaten' ? 'CHAMPION ★' : 'FINALE', 24, '#fff', '#22252b', 6)); }
    else {
      const n = cast[i].name;
      const head = art(scene, 0, -h * 0.12, `head_${n}_${st === 'beaten' ? 'happy' : 'smug'}`, 0.52); c.add(head);
      
      c.add(txt(scene, 0, h / 2 - 28, n, 26, '#fff', '#22252b', 6));
      const b = best(i);
      const tag = st === 'beaten' ? (b > 0 ? `★ ${b}` : '★') : st === 'open' ? 'PLAY!' : st === 'soon' ? 'SOON' : (i > 0 ? `LOCKED\nbeat ${cast[i - 1].name}` : 'LOCKED');
      const ml = tag.includes('\n'); const tg = scene.add.graphics().fillStyle(0x1a1020, 0.88).lineStyle(3, 0xe0a82e, 0.9).fillRoundedRect(-76, h / 2 + 4, 152, ml ? 56 : 38, 12).strokeRoundedRect(-76, h / 2 + 4, 152, ml ? 56 : 38, 12); c.add(tg); bakeG(scene, tg, `door_tag${ml ? 2 : 1}`, -80, h / 2, 160, 66);
      const tt = txt(scene, 0, h / 2 + (tag.includes('\n') ? 32 : 22), tag, tag.includes('\n') ? 19 : 24, st === 'beaten' ? '#ffdf6b' : st === 'open' ? '#7dff9a' : '#fff', '#22252b', 6); c.add(tt);
      if (st === 'open') scene.tweens.add({ targets: tt, scale: 1.15, yoyo: true, repeat: -1, duration: 450 });
    }
    c.setSize(w, h + 40); doors.push(c);
  }
  return doors;
}

/** Cute-silly dungeon idle animations layered over bg_hall. */
export function dungeonFx(scene: Phaser.Scene) {
  // torch flames
  for (const [x, y] of [[40, 560], [680, 560], [200, 230], [520, 230]]) {
    const fg = scene.add.graphics({ x, y: y + 2 }); fg.fillStyle(0xff5a1f, 1).fillEllipse(0, -18, 30, 44); fg.fillStyle(0xffc23a, 1).fillEllipse(0, -12, 18, 28); fg.fillStyle(0xfff3b0, 1).fillEllipse(0, -6, 8, 14);
    const f = bakeG(scene, fg, 'flame', -17, -42, 34, 48);
    scene.tweens.add({ targets: f, scaleY: { from: 0.85, to: 1.15 }, scaleX: { from: 1.05, to: 0.9 }, yoyo: true, repeat: -1, duration: Phaser.Math.Between(140, 220) });
    scene.tweens.add({ targets: f, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: Phaser.Math.Between(300, 450) });
  }
  // dangling spider
  const sp = scene.add.container(150, 110); const sg = scene.add.graphics();
  sg.lineStyle(2, 0xe8e4f0, 0.9).lineBetween(0, -400, 0, 0);
  sg.lineStyle(3, 0x1a1420, 1); for (const k of [-1, 1]) for (let i = 0; i < 4; i++) sg.lineBetween(0, 14, k * (20 + i * 2), 4 + i * 8);
  sg.fillStyle(0x3a2a4a, 1).fillCircle(0, 14, 14); sg.fillStyle(0xffffff, 1).fillCircle(-5, 12, 4.5).fillCircle(5, 12, 4.5); sg.fillStyle(0x1a1420, 1).fillCircle(-5, 13, 2.2).fillCircle(5, 13, 2.2);
  sg.fillStyle(0xff7aa0, 0.8).fillCircle(-9, 19, 2.5).fillCircle(9, 19, 2.5);
  sp.add(sg); bakeG(scene, sg, 'spider', -32, -402, 64, 438); scene.tweens.add({ targets: sp, y: 180, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.InOut' });
  scene.tweens.add({ targets: sp, angle: { from: -5, to: 5 }, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.InOut' });
  // sleepy bat (upside down) with blinking eyes
  const bat = scene.add.container(600, 112); const bg = scene.add.graphics();
  bg.lineStyle(4, 0x1a1420, 1).lineBetween(-4, -16, -4, -8).lineBetween(4, -16, 4, -8);
  bg.fillStyle(0x4a3a5e, 1).lineStyle(4, 0x1a1420, 1).fillEllipse(0, 14, 34, 44).strokeEllipse(0, 14, 34, 44);
  bg.fillTriangle(-12, 32, -4, 32, -10, 44).fillTriangle(12, 32, 4, 32, 10, 44);
  bg.fillStyle(0x3a2c4c, 1).fillEllipse(-20, 10, 16, 40).fillEllipse(20, 10, 16, 40);
  const eyes = scene.add.graphics(); const eyeOpen = () => { eyes.clear(); eyes.fillStyle(0xffffff, 1).fillCircle(-7, 22, 5).fillCircle(7, 22, 5); eyes.fillStyle(0x1a1420, 1).fillCircle(-7, 23, 2.5).fillCircle(7, 23, 2.5); };
  const eyeShut = () => { eyes.clear(); eyes.lineStyle(3, 0x1a1420, 1).beginPath(); eyes.arc(-7, 21, 4, 0.2, Math.PI - 0.2); eyes.strokePath(); eyes.beginPath(); eyes.arc(7, 21, 4, 0.2, Math.PI - 0.2); eyes.strokePath(); };
  eyeShut(); bat.add([bg, eyes]); bakeG(scene, bg, 'bat', -32, -20, 64, 68);
  const zz = txt(scene, 640, 150, 'z', 22, '#cfc8ff', '#22252b', 4);
  scene.tweens.add({ targets: zz, y: 110, x: 660, alpha: { from: 1, to: 0 }, repeat: -1, duration: 1600 });
  scene.time.addEvent({ delay: 2600, loop: true, callback: () => { eyeOpen(); scene.time.delayedCall(450, eyeShut); } });
  scene.tweens.add({ targets: bat, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 1500, ease: 'Sine.InOut' });
  // slime bubbles
  scene.time.addEvent({ delay: 380, loop: true, callback: () => {
    const b = scene.add.circle(Phaser.Math.Between(240, 480), 1228, Phaser.Math.Between(5, 11), 0xc8ff7a).setStrokeStyle(2, 0x2a5a18);
    scene.tweens.add({ targets: b, y: 1190, scale: 1.4, alpha: 0, duration: 900, onComplete: () => b.destroy() }); } });
  // ceiling drips
  scene.time.addEvent({ delay: 700, loop: true, callback: () => {
    const x = Phaser.Math.Between(1, 17) * 40 - 20; const d = scene.add.ellipse(x, 116, 8, 12, 0x8ad0ff, 0.9);
    scene.tweens.add({ targets: d, y: Phaser.Math.Between(300, 520), alpha: 0, duration: 1100, ease: 'Quad.In', onComplete: () => d.destroy() }); } });
}
/** Most recent hit-word / damage-number objects (replaced on each hit to avoid pile-up). */
export const lastWord: Phaser.GameObjects.GameObject[] = [];

/** Paint the page behind the canvas so letterbox bars blend with the scene (top half / bottom half). */
export function setPageBg(top: number, bottom: number) {
  const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
  document.body.style.background = `linear-gradient(${hex(top)} 0%, ${hex(top)} 50%, ${hex(bottom)} 50%, ${hex(bottom)} 100%)`;
}

const PAUSE_X = W - 16 - 96 - 16 - 48, PAUSE_Y = 64;
export function pointerInPause(px: number, py: number) { return Math.abs(px - PAUSE_X) < 56 && Math.abs(py - PAUSE_Y) < 56; }
/** Pause button next to mute + auto-pause when the tab is hidden/blurred. canPause() gates it (e.g. only mid-round). */
export function makePauseButton(scene: Phaser.Scene, canPause: () => boolean) {
  const c = scene.add.container(PAUSE_X, PAUSE_Y).setDepth(905);
  const g = scene.add.graphics(); g.fillStyle(0xffffff, 0.85).lineStyle(4, COLORS.INK, 1).fillRoundedRect(-48, -48, 96, 96, 22).strokeRoundedRect(-48, -48, 96, 96, 22);
  g.fillStyle(COLORS.INK, 1).fillRoundedRect(-20, -24, 14, 48, 4).fillRoundedRect(6, -24, 14, 48, 4);
  c.add(g); bakeG(scene, g, 'pausebtn', -51, -51, 102, 102); c.setSize(96, 96).setInteractive({ useHandCursor: true });
  // once until resumed: a 2-finger burst delivers several pointerdowns in one frame, before the pause takes effect
  let pausing = false; scene.events.on(Phaser.Scenes.Events.RESUME, () => { pausing = false; });
  const doPause = () => { if (pausing || !scene.scene.isActive() || scene.scene.isActive('Pause') || !canPause()) return; pausing = true; scene.scene.pause(); scene.scene.launch('Pause', { from: scene.scene.key }); };
  c.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); doPause(); });
  const onHide = () => doPause();
  scene.game.events.on('hidden', onHide); scene.game.events.on('blur', onHide);
  scene.events.once('shutdown', () => { scene.game.events.off('hidden', onHide); scene.game.events.off('blur', onHide); scene.events.off(Phaser.Scenes.Events.RESUME); });
  return c;
}

/** Spark + dust burst particles (one-shot). */
export function sparks(scene: Phaser.Scene, x: number, y: number, n = 14, big = false) {
  const e = scene.add.particles(x, y, 'su_particle', {
    speed: { min: 220, max: big ? 900 : 560 }, angle: { min: 0, max: 360 }, lifespan: { min: 250, max: 520 },
    scale: { start: big ? 0.9 : 0.6, end: 0 }, tint: [0xffffff, 0xfff3a0, 0xffc021, 0xff8a1f], blendMode: 'ADD', gravityY: 600, emitting: false,
  }).setDepth(72);
  e.explode(n);
  const d = scene.add.particles(x, y + 40, 'su_dust', { speed: { min: 40, max: 160 }, angle: { min: 180, max: 360 }, lifespan: 500, alpha: { start: 0.7, end: 0 }, scale: { start: 0.4, end: 1.1 }, emitting: false }).setDepth(71);
  d.explode(big ? 10 : 5);
  scene.time.delayedCall(900, () => { e.destroy(); d.destroy(); });
}
/** Full-screen colour flash + vignette pulse. */
export function flashVignette(scene: Phaser.Scene, color = 0xffffff, alpha = 0.6) {
  const v = scene.add.image(0, 0, 'bg_vignette').setOrigin(0).setDepth(890).setScale(2).setTint(color === 0xffffff ? 0x000000 : color).setAlpha(alpha);
  scene.tweens.add({ targets: v, alpha: 0, duration: 380, onComplete: () => v.destroy() });
}
export { comic };
