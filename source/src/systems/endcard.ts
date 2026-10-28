import Phaser from 'phaser';
import { leaveOnce } from './leave';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { art } from '../art/registry';
import { ensureArt } from '../art/registry'; // cheeky pass
import { txt } from './fx';
import { makeButton } from './ui';
import { Fx } from './audio';
import { Storage } from './storage';
import { LINES, pick, CHEEKY, mix } from '../lines';
import { pupHearts, blush, bunTease, winkSparkle, headOf, ptOn, pupNeck } from './cheeky';
import { STANDALONE } from '../standalone';
import { koPupFor } from './koPup';

/** Win/lose card. idx = level index (0 Ruby, 1 Glassia). */
export function endCard(scene: Phaser.Scene, name: string, idx: number, win: boolean, score: number, detail: string, extra: object = {}) {
  Fx.sting(win);
  if ((window as any).__pr) (window as any).__pr.cardShown = true; // a pending update may reload now (not mid-level)
  const newBest = win ? Storage.submitLevel(name, score) : false;
  const firstWin = win && Storage.getBeaten() <= idx && !(!STANDALONE && name === 'Bunny');
  const bonus = !STANDALONE && name === 'Bunny'; // Tail Catch as the tester hall's bonus door: no hall progress, no Interlude
  if (win && !bonus) Storage.setBeaten(idx + 1);
  (window as any).__pr = { ...(window as any).__pr, ended: win ? 'win' : 'lose', score };
  const c = scene.add.container(0, 0).setDepth(960);
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
  const g = scene.add.graphics(); g.fillStyle(win ? 0xfff3e0 : 0xe9e0ff, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(60, 200, W - 120, 900, 36).strokeRoundedRect(60, 200, W - 120, 900, 36); void 0;
  const t = txt(scene, W / 2, 268, win ? `${name.toUpperCase()} WINS!` : 'PUPPY GOT LUCKY!', 56, win ? '#ff5c8a' : '#6b4cc9', '#22252b', 8);
  const hero = art(scene, 230, 770, name === 'Bunny' ? (win ? 'bun_full_sneaky' : 'bun_full_unimpressed') : `full_${name}_${win ? 'happy' : 'dizzy'}`, 1.05);
  const pup = art(scene, 500, 760, win ? 'pup_dizzy' : 'pup_hearts', 1.2);
  if (win) pup.setAngle(-80).setY(735).setX(510);
  scene.tweens.add({ targets: win ? hero : pup, y: '-=30', yoyo: true, repeat: -1, duration: 260, ease: 'Quad.Out' });
  const [qLine, sLine] = cardLines(name, win); // cheeky pass: Marc's pools + the cheeky Bunny & Puppy ones (some level-aware)
  const quote = txt(scene, W / 2, 830, qLine, 28, '#22252b', '#fff', 0).setWordWrapWidth(540);
  const sub = txt(scene, W / 2, 885, sLine, 24, '#7a3f8a', '#fff', 0).setWordWrapWidth(540);
  const sc = txt(scene, W / 2, 345, `${detail}\nScore ${score}${newBest ? '  ★ NEW BEST!' : ''}`, 30, '#22252b', '#fff', 0);
  c.add([dim, g, t, hero, pup, quote, sub, sc]);
  if (win && name !== 'Bunny') koPupFor(scene, pup); // cute KO'd Puppy (Tail Catch rig); Tail Catch's own card (Bunny) swaps this image itself
  // cheeky pass: two-line quotes never collide (y stays 830/885: Football's loss card finds them by y), plus the couple touches
  scene.time.delayedCall(0, () => stackQuotes(quote, sub));
  if (name !== 'Bunny') cheekyCouple(scene, c, pup, win); // the bonus Tail Catch card rebuilds its own Bunny + Puppy (Tail.ts)
  // buttons arm only after the 300 ms fade-in PLUS a 300 ms gap with no taps (a tap burst that ended the level can't fire them); armed stays armed
  const t0 = scene.time.now; let last = -1e9, armed = false, downOk = false;
  // the quiet gap is measured up to each pointerdown (never across the press itself), so a deliberate press after arming fires however long it is held
  const quiet = (n: number) => n - t0 >= 600 && n - last >= 300;
  const isArmed = () => { if (!armed && quiet(scene.time.now)) armed = true; return armed; };
  const onDown = () => { const n = scene.time.now; if (!armed && quiet(n)) armed = true; downOk = armed; last = n; }; // this press counts iff the card was armed when it STARTED
  scene.input.on('pointerdown', onDown); scene.events.once('shutdown', () => scene.input.off('pointerdown', onDown));
  (window as any).__cardArmed = () => isArmed();
  const go = (k: string, data?: object) => { if (!downOk || !leaveOnce(scene)) return; scene.cameras.main.fadeOut(200); scene.time.delayedCall(220, () => scene.scene.start(k, data)); };
  if (bonus) {
    c.add(makeButton(scene, W / 2 - 145, 1010, 260, 110, 'PLAY AGAIN', () => go(scene.scene.key), COLORS.BUTTON, 38));
    c.add(makeButton(scene, W / 2 + 145, 1010, 260, 110, 'HALL', () => go('Hub'), COLORS.BUTTON_ALT, 44));
  } else if (STANDALONE) {
    c.add(makeButton(scene, W / 2 - 145, 1010, 260, 110, 'PLAY AGAIN', () => go(scene.scene.key), COLORS.BUTTON, 38));
    c.add(makeButton(scene, W / 2 + 145, 1010, 260, 110, 'MENU', () => go('SoloTitle'), COLORS.BUTTON_ALT, 44));
  } else if (win) {
    c.add(makeButton(scene, W / 2, 1010, 400, 110, 'CONTINUE', () => go('Interlude', { name, idx, first: firstWin, ...extra }), COLORS.BUTTON, 46));
  } else {
    c.add(makeButton(scene, W / 2 - 145, 1010, 260, 110, 'RETRY', () => go(scene.scene.key), COLORS.BUTTON, 44));
    c.add(makeButton(scene, W / 2 + 145, 1010, 260, 110, 'HALL', () => go('Hub'), COLORS.BUTTON_ALT, 44));
  }
  c.setAlpha(0); scene.tweens.add({ targets: c, alpha: 1, duration: 300 });
}

// ================= cheeky pass (27 Oct): couple touches on the level end card =================
/** quote (Bunny's slot) + sub (Puppy's slot). About half of the wins use a level-aware line; a "Puppy:" one goes in his slot. */
function cardLines(name: string, win: boolean): [string, string] {
  const q = win ? mix(LINES.win, CHEEKY.cardWin) : mix(LINES.lose, CHEEKY.cardLose);
  const s = win ? mix(LINES.puppyLose, CHEEKY.cardWinPup) : mix(LINES.puppyWin, CHEEKY.cardLosePup);
  const by = win ? (name === 'Noir' ? CHEEKY.laserCardWinBy /* Laser Lure replaced Box Bandit */ : CHEEKY.cardWinBy[name]) : undefined;
  if (by?.length && Math.random() < 0.5) { const l = pick(by); return /^Puppy:/.test(l) ? [pick(q), l] : [l, pick(s)]; }
  return [pick(q), pick(s)];
}
/** keep both lines' y (other code finds them by it) but move their origins so a wrapped quote pushes the sub line down */
function stackQuotes(quote: Phaser.GameObjects.Text, sub: Phaser.GameObjects.Text) {
  if (!quote.active || !sub.active) return; const top = 812, gap = 6;
  quote.setOrigin(0.5, (quote.y - top) / Math.max(1, quote.height));
  const subTop = Math.max(sub.y - sub.height / 2, top + quote.height + gap);
  sub.setOrigin(0.5, (sub.y - subTop) / Math.max(1, sub.height));
}
/** Bunny peeks in from the corner of the card with an evil little grin, winks and tugs her captive on a leash (now and then she sneaks him
 *  a smug kiss instead): he blushes, hearts float up from HIS head, his tail wags */
function cheekyCouple(scene: Phaser.Scene, c: Phaser.GameObjects.Container, pup: Phaser.GameObjects.Image, win: boolean) {
  const bx = win ? 598 : 610, by = win ? 568 : 540, bun = art(scene, bx, by, 'bun_bust_smile', 0.95); c.addAt(bun, c.getIndex(pup)); bun.setAngle(-6); // top-right, above Puppy: her leash never crosses the girl (left)
  let grin = 'bun_bust_smile'; // her evil little grin ('sneaky' is drawn on demand, not at boot)
  ensureArt(scene, ['bun_bust_sneaky']).then(() => { grin = 'bun_bust_sneaky'; if (bun.active && bun.texture.key === 'bun_bust_smile') bun.setTexture(grin); }).catch(() => { /* keep the smile */ });
  scene.tweens.add({ targets: bun, angle: 6, y: by - 8, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
  const eye = () => { const b = bun.getBounds(); return { x: b.centerX + b.width * 0.16, y: b.top + b.height * 0.42 }; };
  const wink = () => { if (!bun.active) return; bun.setTexture('bun_bust_wink'); const e = eye(); winkSparkle(scene, e.x + 26, e.y - 10, 966, c, '');
    scene.time.delayedCall(650, () => bun.active && bun.setTexture(grin)); };
  // where his head/cheeks are (the win card's Puppy is flopped on his side, the loss card's one stands)
  const head = () => win ? headOf(pup, 0.42, -pup.getBounds().width * 0.18) : headOf(pup, 0.28);
  const cheeks = () => { const h = head(); return win ? { x: h.x + 4, y: h.y + 26 } : { x: h.x, y: h.y + 34 }; };
  scene.time.delayedCall(700, wink);
  scene.time.delayedCall(1300, () => { if (!bun.active) return; const b = bun.getBounds();
    let mode: 'kiss' | 'tug' | '' = ''; // the smug-kiss variant lands on his cheek; the rope goes to his neck
    mode = bunTease(scene, () => ({ ...ptOn(bun, 0.1, 1.06), r: 11, arm: ptOn(bun, 0.24, 0.9) }) /* the bust has no paws: her sleeve reaches out of its lower left to the paw holding the rope */,
      () => { if (mode === 'kiss') { const h = head(); return win ? { x: h.x, y: h.y + 4 } : { x: h.x, y: h.y + 72 }; } return pupNeck(pup); } /* tug: the collar sits on his neck (win card: the hidden pup_dizzy image carries the KO rig's exact position + angle) */, () => {
      scene.tweens.add({ targets: pup, x: pup.x - 18, duration: 90, yoyo: true, ease: 'Quad.Out' }); // the tug yanks him a bit toward her
      blush(scene, cheeks, 50, 966, c); pupHearts(scene, head().x - (win ? 0 : 30), head().y - 30, 3, 966, c); // (loss card: drift left, away from her)
      // tail wag: a quick happy wiggle (around his flop angle on the win card)
      const a0 = pup.angle; scene.tweens.add({ targets: pup, angle: { from: a0 - 5, to: a0 + 5 }, yoyo: true, repeat: -1, duration: 110 });
      scene.time.addEvent({ delay: 1500, repeat: 30, callback: () => { if (pup.active && c.active) pupHearts(scene, head().x - (win ? 0 : 30), head().y - 30, 2, 966, c); } });
    }, 966, c); });
  scene.time.addEvent({ delay: 2600, loop: true, callback: wink });
}
