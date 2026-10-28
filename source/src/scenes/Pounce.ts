// Noir: LASER LURE (replaces Box Bandit; scene key stays 'Pounce' so the Hall door, end card and Interlude are unchanged).
// One control: DRAG anywhere and the red dot moves with your thumb (relative drag, so the dot never hides under it). Puppy chases it
// with a little lag. The longer he chases without stopping, the faster he goes: TROT > RUN > ZOOMIES! One trap GLOWS: steer him into it.
// His speed at impact sets the crash: bump / CRASH / MEGA CRASH (more points). Drag too far ahead and he loses the dot, follows the
// beam back to Noir ("THERE you are!") = 1 strike; 3 strikes loses. 7 crashes wins.
// Ramp: crashes 1-2 a calm Puppy; 3-4 sniff-stops (wiggle the dot to re-hook him) + he overshoots at ZOOMIES; 5 the basket rides a
// Roomba, and from 5 on Bunny's tea table is a decoy (-3 s); 7 = finale: chain 3 traps in one run, ending in Bunny's pet carrier.
// Every trap is its own gag (sock hat, glass-door smush, rug burrito, piano belly-flop, bubble-wrap dance, hanging from Bunny's portrait),
// no repeats in a row. Lines: LINES.laser* in src/lines.ts (EDIT ME). Props + tutorial: ./laserArt.ts. Tuned with tests/laser-realtouch.mjs.
import Phaser from 'phaser';
import { GAME_W as W } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art, ensureArt } from '../art/registry';
import { pointerInMute, makeMuteButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, makePauseButton, pointerInPause, setPageBg, comic, flashVignette, sparks } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { Hud, impact } from '../systems/level';
import { HeroRig } from '../systems/rigs';
import { TailPup } from '../systems/tailRigs';
import { laserTextures, laserTutorial } from './laserArt';

export const K = {
  NEED: 7, TIME: 30, STRIKES: 3,
  V: [280, 400, 545], ACC: [1500, 1550, 1500], ARRIVE: 4.0,     // top speed / steering accel per tier (TROT, RUN, ZOOMIES)
  RUN_AT: 0.9, ZOOM_AT: 2.2, HEAT_MAX: 3.4, HEAT_DECAY: 1.4,    // seconds of chasing to reach RUN / ZOOMIES
  LOSE_D: [540, 520, 500, 480, 470, 460, 460], LOSE_T: 0.45, MIN_TIER: 1,    // dot this far ahead for LOSE_T s = he loses it (per crash count)
  WARN_K: 0.72, GAIN: 1.25,                                    // "?" warning from WARN_K * LOSE_D; thumb-to-dot drag gain
  SNIFF_FROM: 2, SNIFF_EVERY: [3.0, 4.6], SNIFF_T: [2.4, 1.9], WIGGLE: 140,
  ROOMBA_AT: 4, TEA_FROM: 4, TEA_SEC: 3, ROOMBA_W: 0.42,
  CHAIN_T: 5.5, PTS: [100, 250, 500], COMBO: 0.25,
};
export const KINDS = ['basket', 'door', 'rug', 'piano', 'bubble', 'frame'] as const;
type Kind = typeof KINDS[number] | 'carrier' | 'tea';
type Phase = 'wait' | 'chase' | 'sniff' | 'gag' | 'lost' | 'end';
type Trap = { kind: Kind; x: number; y: number; rx: number; ry: number; img: Phaser.GameObjects.Image; label: string };
const X0 = 70, X1 = 650, Y0 = 868, Y1 = 1205, PM = 0.8, HEAD = 96, NOIR = { x: 96, y: 846 };
const ART = ['pt_stand', 'pt_panic', 'pt_dizzy', 'pt_tail', 'su_shadow', 'head_Noir_smug', 'head_Noir_happy', 'head_Noir_dizzy', 'bun_bust_smile', 'bun_bust_wink',
  'bun_full_sneaky', 'bun_full_unimpressed', ...[0, 1, 2, 3, 4, 5].map(i => 'pt_run' + i), ...['blink', 'worry', 'ouch', 'taunt', 'happy', 'jump', 'fall', 'flop'].map(k => 'pa_' + k),
  ...['xeyes', 'smush', 'hang', 'sniff', 'cozy'].map(k => 'pl_' + k)];
const SIT = { ls: 15, le: 95, rs: -15, re: -20, lh: 8, lk: -4, rh: 26, rk: -10, lean: -3, tilt: -7, sq: 0.03, dy: 0 };
const TIERS = ['TROT', 'RUN', 'ZOOMIES!'];
const F = (r: number[]) => Phaser.Math.FloatBetween(r[0], r[1]);

export class PounceScene extends Phaser.Scene {
  st = this.fresh();
  private fresh() {
    return { time: K.TIME, catches: 0, boops: 0, score: 0, running: false, over: false, phase: 'wait' as Phase, tier: 0, heat: 0, strikes: 0, combo: 0,
      px: 500, py: 950, vx: 0, vy: 0, dx: 430, dy: 975, bumpCd: 0, bumps: 0, far: 0, kind: '' as Kind | '', plan: [] as Kind[], chainI: -1, chainT: 0, chain: [] as Kind[],
      sniffIn: 9, sniffT: 0, wiggle: 0, megas: 0, teas: 0, dragged: 0, t: 0, played: [] as string[] };
  }
  private rig!: HeroRig; private pup!: TailPup; private hud!: Hud; private traps = new Map<Kind, Trap>(); private ready = false;
  private dotG!: Phaser.GameObjects.Graphics; private glowG!: Phaser.GameObjects.Graphics; private fxg!: Phaser.GameObjects.Graphics; private pointer!: Phaser.GameObjects.Image;
  private chips: { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text; x: number; w: number }[] = []; private strikeT: Phaser.GameObjects.Text[] = [];
  private trapTag!: Phaser.GameObjects.Container; private q!: Phaser.GameObjects.Text; private chainTxt!: Phaser.GameObjects.Text; private hint?: Phaser.GameObjects.Container;
  private roomba?: Phaser.GameObjects.Image; private roombaA = 0; private hat?: Phaser.GameObjects.Image; private frameBun!: Phaser.GameObjects.Image; private frameC!: Phaser.GameObjects.Container;
  private cdoor?: Phaser.GameObjects.Image; private hitStop = 0; private lastTier = 0; private chatT = 4; private dragId = -1; private lastP = { x: 0, y: 0 }; private hudF = 0; private shownTier = -1;
  private gagFace = 1; private puffT = 0; private noirBusyT = 0;
  constructor() { super('Pounce'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x2a1a3e, 0x6a3e1e);
    this.st = this.fresh(); this.traps = new Map(); this.ready = false; this.chips = []; this.strikeT = []; this.hint = undefined; this.roomba = undefined; this.hat = undefined;
    this.cdoor = undefined; this.hitStop = 0; this.lastTier = 0; this.chatT = 4; this.dragId = -1; this.hudF = 0; this.shownTier = -1; this.noirBusyT = 0; this.tweens.timeScale = 1;
    laserTextures(this);
    art(this, 0, 0, 'bg_room');
    const rugG = this.add.graphics().setDepth(1.5); rugG.fillStyle(0x000000, 0.12).fillEllipse(360, 1040, 660, 330); // soft floor pool
    this.hud = new Hud(this, 'LASER LURE', 0xff3b3b);
    // SPEED chips + DOT LOST strikes (HUD rows under the bar)
    txt(this, 92, 318, 'SPEED', 24, '#ffdf6b', '#22252b', 6).setDepth(600);
    [['TROT', 210, 120], ['RUN', 350, 120], ['ZOOMIES!', 518, 176]].forEach(([s, x, w]) => {
      const g = this.add.graphics().setDepth(600), t = txt(this, x as number, 318, s as string, 24, '#fff', '#22252b', 5).setDepth(601); this.chips.push({ g, t, x: x as number, w: w as number }); });
    txt(this, 120, 366, 'DOT LOST', 22, '#ffb3c8', '#22252b', 5).setDepth(600);
    for (let i = 0; i < K.STRIKES; i++) this.strikeT.push(txt(this, 230 + i * 44, 366, '○', 30, '#ffffff', '#22252b', 5).setDepth(600));
    this.chainTxt = txt(this, 520, 366, '', 24, '#7dff9a', '#22252b', 6).setDepth(600);
    this.paintChips(0);
    this.buildRoom();
    this.glowG = this.add.graphics().setDepth(4); this.fxg = this.add.graphics().setDepth(30); this.dotG = this.add.graphics().setDepth(640);
    this.q = txt(this, 0, 0, '?', 64, '#ffdf6b', '#22252b', 8).setDepth(650).setVisible(false);
    this.trapTag = this.add.container(0, 0).setDepth(645).setVisible(false);
    { const g = this.add.graphics(); g.fillStyle(0x2fbf5a, 1).lineStyle(4, 0x22252b, 1).fillRoundedRect(-62, -26, 124, 46, 20).strokeRoundedRect(-62, -26, 124, 46, 20);
      g.fillStyle(0x2fbf5a, 1).fillTriangle(-12, 18, 12, 18, 0, 36).lineStyle(4, 0x22252b, 1).lineBetween(-12, 20, 0, 36).lineBetween(12, 20, 0, 36);
      this.trapTag.add([g, txt(this, 0, -3, 'TRAP!', 28, '#ffffff', '#22252b', 5)]); }
    makeMuteButton(this); makePauseButton(this, () => this.st.running && !this.st.over);
    this.input.addPointer(1);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.dragId = p.id; this.lastP = w; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.id !== this.dragId || !p.isDown) return; const w = worldPoint(this, p); this.nudge((w.x - this.lastP.x) * K.GAIN, (w.y - this.lastP.y) * K.GAIN); this.lastP = w; });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => { if (p.id === this.dragId) this.dragId = -1; });
    (window as any).__pr = { scene: 'Pounce', st: this.st, K, ready: false, force: (win: boolean) => this.finish(win), tap: (_x: number, _y: number) => {},
      move: (x: number, y: number) => this.setDot(x, y), nudge: (dx: number, dy: number) => this.nudge(dx, dy), dot: () => ({ x: this.st.dx, y: this.st.dy }),
      pup: () => ({ x: this.st.px, y: this.st.py, vx: this.st.vx, vy: this.st.vy }), trap: () => this.trapInfo(this.activeKind()), decoy: () => this.trapInfo('tea'),
      traps: () => [...this.traps.values()].map(t => this.trapInfo(t.kind)), demo: (k: Kind, tier = 2) => this.demoGag(k, tier) };
    ensureArt(this, ART).then(() => { if (!this.sys.isActive() && !this.sys.isPaused()) return; this.build(); });
  }
  // ------------------------------------------------------------------ room + props
  private buildRoom() {
    const add = (kind: Kind, x: number, y: number, rx: number, ry: number, img: Phaser.GameObjects.Image, label: string) => this.traps.set(kind, { kind, x, y, rx, ry, img, label });
    // Bunny's portrait on the wall (he can hang from it)
    this.frameC = this.add.container(330, 520).setDepth(3);
    this.frameBun = art(this, 0, 18, 'bun_bust_smile', 0.36); const fbg = this.add.image(0, 0, 'll_frame_bg').setScale(0.9);
    const msk = this.make.graphics({ x: 0, y: 0 }, false); msk.fillRect(330 - 55, 520 - 64, 110, 128); this.frameBun.setMask(msk.createGeometryMask());
    this.frameC.add([fbg, this.frameBun, this.add.image(0, 0, 'll_frame').setScale(0.9)]);
    add('frame', 330, 892, 86, 42, this.frameC as any, 'PORTRAIT');
    add('door', 612, 905, 72, 52, this.add.image(628, 868, 'll_door').setOrigin(0.5, 1).setScale(0.86).setDepth(3), 'DOOR');
    add('bubble', 196, 985, 104, 44, this.add.image(196, 985, 'll_bubble').setDepth(2.2), 'BUBBLES');
    add('rug', 392, 1068, 118, 46, this.add.image(392, 1068, 'll_rug').setDepth(2.1), 'RUG');
    add('basket', 140, 1150, 78, 46, this.add.image(140, 1168, 'll_basket').setOrigin(0.5, 1).setDepth(10 + 11.68), 'BASKET');
    add('piano', 578, 1152, 84, 44, this.add.image(578, 1172, 'll_piano').setOrigin(0.5, 1).setDepth(10 + 11.72), 'PIANO');
    add('tea', 540, 992, 70, 40, this.add.image(540, 1004, 'll_table').setOrigin(0.5, 1).setDepth(10 + 10.04).setScale(0.8).setVisible(false), 'TEA');
    add('carrier', 360, 1172, 92, 44, this.add.image(360, 1196, 'll_carrier').setOrigin(0.5, 1).setDepth(10 + 11.96).setScale(0.82).setVisible(false), 'CARRIER');
    this.add.image(NOIR.x, NOIR.y + 8, 'll_cushion').setDepth(8.4).setScale(0.9);
  }
  private build() {
    const s = this.st;
    this.rig = new HeroRig(this, 'Noir', NOIR.x, NOIR.y - 6, 0.5, { tail: true }).setDepth(8.5); this.rig.setPose(SIT);
    this.pointer = this.add.image(0, 0, 'll_pointer').setDepth(8.6).setScale(0.8); this.rig.held = this.pointer;
    this.pup = new TailPup(this, s.px, s.py, PM); this.pup.setDepth(20); this.pup.setFrame('stand');
    this.ready = true; (window as any).__pr.ready = true;
    laserTutorial(this, () => this.begin());
  }
  private begin() {
    const s = this.st; Fx.alert(); s.plan = this.makePlan();
    const c = this.add.container(360, 620).setDepth(810), g = this.add.graphics();
    g.fillStyle(0x22252b, 0.85).fillRoundedRect(-320, -90, 640, 180, 36).lineStyle(6, 0xff3b3b, 1).strokeRoundedRect(-320, -90, 640, 180, 36);
    c.add([g, comic(this, 0, 0, 'DRAG the red dot.\nCrash Puppy into the TRAP!', 46).setAlign('center')]).setScale(0.3);
    this.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, y: 580, delay: 1900, duration: 300, onComplete: () => c.destroy() });
    s.running = true; s.phase = 'chase'; this.lightNext();
    this.time.delayedCall(700, () => { if (!s.over) this.noirSay(pick(LINES.laserStart)); });
  }
  /** crash order: catch 1 is an easy floor trap, catch 5 is the basket on the Roomba, the rest shuffled; never the same twice in a row */
  private makePlan(): Kind[] {
    const first: Kind = Math.random() < 0.5 ? 'rug' : 'bubble';
    const rest = Phaser.Utils.Array.Shuffle(KINDS.filter(k => k !== first && k !== 'basket') as Kind[]);
    return [first, rest[0], rest[1], rest[2], 'basket', rest[3]];
  }
  private activeKind(): Kind | '' { const s = this.st; return s.chainI >= 0 ? s.chain[s.chainI] : s.kind; }
  private trapInfo(k: Kind | '') { const t = k ? this.traps.get(k) : undefined; return t ? { kind: t.kind, x: t.x, y: t.y, rx: t.rx, ry: t.ry, on: k === 'tea' ? this.teaOn() : k === this.activeKind() } : null; }
  private teaOn() { return this.st.catches >= K.TEA_FROM && !!this.traps.get('tea')?.img.visible; }
  private lightNext() {
    const s = this.st; s.kind = ''; s.chainI = -1;
    if (s.catches >= K.TEA_FROM) { const t = this.traps.get('tea')!; if (!t.img.visible) { t.img.setVisible(true).setScale(0.05); this.tweens.add({ targets: t.img, scale: 0.8, duration: 300, ease: 'Back.Out' });
      this.time.delayedCall(400, () => { if (!s.over) { this.bunnyPop('bun_full_sneaky', 'Bunny: My tea table. Do NOT, Noir.'); this.ft(540, 900, 'AVOID!', '#ff6b6b', 34); } }); } }
    if (s.catches >= K.NEED - 1) { // finale: chain 3 in one run
      const pool = (['bubble', 'rug', 'piano', 'basket'] as Kind[]).filter(k => k !== s.played[s.played.length - 1]);
      Phaser.Utils.Array.Shuffle(pool); s.chain = [pool[0], pool[1], 'carrier']; s.chainI = 0; s.chainT = 0;
      const c = this.traps.get('carrier')!; c.img.setVisible(true).setScale(0.05); this.tweens.add({ targets: c.img, scale: 0.82, duration: 320, ease: 'Back.Out' });
      this.cdoor?.destroy(); this.cdoor = undefined;
      popBanner(this, 'FINALE! Chain 3 traps in ONE run!', 640, 0xff3b3b, 1500); this.noirSay('Noir: Now the grand tour, darling.');
      this.unRoomba();
    } else {
      s.kind = s.plan[s.catches] ?? Phaser.Utils.Array.GetRandom(KINDS.filter(k => k !== s.played[s.played.length - 1]) as Kind[]);
      if (s.catches === K.ROOMBA_AT && s.kind === 'basket') this.onRoomba(); else this.unRoomba();
    }
    const t = this.traps.get(this.activeKind() as Kind)!; this.trapTag.setVisible(true).setScale(0.2); this.tweens.add({ targets: this.trapTag, scale: 1, duration: 220, ease: 'Back.Out' });
    s.sniffIn = F(K.SNIFF_EVERY); void t;
  }
  private onRoomba() {
    const t = this.traps.get('basket')!; if (this.roomba) return;
    this.roomba = this.add.image(t.x, t.y + 22, 'll_roomba').setDepth(t.img.depth - 0.01).setScale(0.9); this.roombaA = Math.PI * 0.9;
    this.ft(360, 900, 'It MOVES!', '#7dff9a', 36); this.noirSay('Noir: Moving target. Keep up, darling.');
  }
  private unRoomba() { const t = this.traps.get('basket')!; if (!this.roomba) return; this.roomba.destroy(); this.roomba = undefined; t.x = 140; t.y = 1150; t.img.setPosition(140, 1168).setDepth(10 + 11.68).setAngle(0); }
  // ------------------------------------------------------------------ input
  private nudge(dx: number, dy: number) { const s = this.st; if (!s.running || s.over) return; s.dragged += Math.hypot(dx, dy); this.setDot(s.dx + dx, s.dy + dy, Math.hypot(dx, dy)); }
  private setDot(x: number, y: number, moved = -1) {
    const s = this.st; const nx = Phaser.Math.Clamp(x, X0 - 20, X1 + 20), ny = Phaser.Math.Clamp(y, Y0 - 30, Y1 + 10);
    const d = moved >= 0 ? Math.hypot(nx - s.dx, ny - s.dy) : Math.hypot(nx - s.dx, ny - s.dy); s.dx = nx; s.dy = ny; if (s.phase === 'sniff') s.wiggle += d;
    if (moved < 0 && s.running) s.dragged += d;
  }
  // ------------------------------------------------------------------ helpers
  private ft(x: number, y: number, t: string, col?: string, size = 40) { const half = t.length * size * 0.3 + 16; floatText(this, Phaser.Math.Clamp(x, half, W - half), y, t, col, size); }
  private talk(x: number, y: number, text: string, size = 22, hold = 1500) {
    const b = say(this, x, y, text, size, hold) as Phaser.GameObjects.Container; const t = b.list.find(o => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
    const half = t ? t.width / 2 + 34 : 200; b.x = Phaser.Math.Clamp(b.x, half, W - half); return b; }
  private noirSay(text: string, hold = 1600) { this.talk(250, 690, text, 22, hold); }
  private pupSay(text: string, hold = 1300) { this.talk(this.pup.root.x, Math.max(470, this.pup.root.y - 210), text, 22, hold); }
  private at(ms: number, fn: () => void) { this.time.delayedCall(ms, () => { if (!this.st.over) fn(); }); }
  private head() { return { x: this.pup.root.x, y: this.pup.root.y - HEAD }; }
  private comicAt(x: number, y: number, s: string, size = 60, ang = -8) { const t = comic(this, Phaser.Math.Clamp(x, 160, 560), y, s, size).setDepth(760).setAngle(ang).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' }); this.tweens.add({ targets: t, alpha: 0, y: y - 40, delay: 700, duration: 260, onComplete: () => t.destroy() }); return t; }
  /** hearts (sweet) or stars (dizzy) pop from Puppy's HEAD only */
  private fromHead(ch: '♥' | '★', n = 4, at?: { x: number; y: number }) { const h = at ?? this.head();
    for (let i = 0; i < n; i++) { const o = txt(this, h.x + Phaser.Math.Between(-30, 30), h.y - 10, ch, Phaser.Math.Between(28, 40), ch === '♥' ? '#ff5c8a' : '#ffdf6b', '#3b1f10', 5).setDepth(770).setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, y: o.y - 70 - Math.random() * 40, x: o.x + Phaser.Math.Between(-30, 30), delay: i * 140, duration: 650, ease: 'Quad.Out', onComplete: () => this.tweens.add({ targets: o, alpha: 0, duration: 250, onComplete: () => o.destroy() }) }); } }
  private orbitStars(ms = 1200, at?: () => { x: number; y: number }) { for (let i = 0; i < 3; i++) { const o = txt(this, 0, 0, '★', 30, '#ffdf6b', '#22252b', 4).setDepth(770);
    this.tweens.addCounter({ from: 0, to: 720 * ms / 900, duration: ms, onUpdate: tw => { const a = Phaser.Math.DegToRad(tw.getValue()! + i * 120), h = at ? at() : this.head(); o.setPosition(h.x + Math.cos(a) * 48, h.y - 26 + Math.sin(a) * 12); }, onComplete: () => o.destroy() }); } }
  private puff(x: number, y: number, n = 1) { for (let k = 0; k < n; k++) { const d = this.add.circle(x + Phaser.Math.Between(-16, 16), y, Phaser.Math.Between(8, 14), 0xd9b080, 0.75).setDepth(this.pup.root.depth - 0.01);
    this.tweens.add({ targets: d, y: y - 26, x: d.x + Phaser.Math.Between(-30, 30), alpha: 0, scale: 2, duration: 420, onComplete: () => d.destroy() }); } }
  private bunnyPop(key: string, line: string) {
    const b = art(this, 790, 1290, key, 0.62).setDepth(700).setOrigin(0.5, 1); this.tweens.add({ targets: b, x: 640, duration: 260, ease: 'Back.Out' });
    this.tweens.add({ targets: b, x: 800, delay: 1700, duration: 260, onComplete: () => b.destroy() }); this.talk(500, 900, line, 22, 1500);
  }
  private paintChips(tier: number) {
    const cols = [0xffd166, 0xff9a3c, 0xff3b6b];
    this.chips.forEach((c, i) => { const on = i <= tier, cur = i === tier; c.g.clear().fillStyle(on ? cols[i] : 0x3a2a4a, on ? 1 : 0.8).lineStyle(cur ? 5 : 3, cur ? 0xffffff : 0x22252b, 1)
      .fillRoundedRect(c.x - c.w / 2, 296, c.w, 44, 18).strokeRoundedRect(c.x - c.w / 2, 296, c.w, 44, 18); c.t.setColor(on ? '#22252b' : '#9a8aa8').setStroke(on ? '#ffffff' : '#22252b', on ? 4 : 5); });
  }
  private paintStrikes() { this.strikeT.forEach((t, i) => { const on = i < this.st.strikes; t.setText(on ? '✕' : '○').setColor(on ? '#ff4d6d' : '#ffffff'); }); }
  // ------------------------------------------------------------------ loop
  update(_t: number, dms: number) {
    if (!this.ready) return;
    const s = this.st; let dt = Math.min(dms, 50) / 1000; s.t += dt;
    if (this.hitStop > 0) { this.hitStop -= dt; if (this.hitStop <= 0) { this.tweens.timeScale = 1; } this.drawDot(); return; }
    if (s.running && !s.over) {
      if (s.phase === 'chase' || s.phase === 'sniff') { s.time -= dt; if (s.time <= 0) { s.time = 0; this.finish(false); return; } }
      if (s.phase === 'chase') this.chase(dt); else if (s.phase === 'sniff') this.sniff(dt);
      if (this.roomba && s.phase !== 'gag') this.roombaTick(dt);
      if (s.chainI > 0 && s.phase === 'chase') { s.chainT -= dt; this.chainTxt.setText(`CHAIN ${s.chainI}/3  ${Math.max(0, s.chainT).toFixed(1)}s`).setColor(s.chainT < 1.5 ? '#ff6b6b' : '#7dff9a');
        if (s.chainT <= 0) this.chainBreak(); }
      else if (s.chainI === 0) this.chainTxt.setText('CHAIN 0/3'); else this.chainTxt.setText('');
      this.hudF += (s.catches / K.NEED - this.hudF) * Math.min(1, dt * 6); this.hud.set(`CATCHES ${s.catches}/${K.NEED}`, s.time, this.hudF);
      this.noirBusyT -= dt;
    }
    if (s.phase === 'chase' || s.phase === 'sniff' || s.phase === 'wait') this.posePup(dt);
    this.drawDot(); this.drawGlow(); this.aimNoir();
    if (s.tier !== this.shownTier) { this.shownTier = s.tier; this.paintChips(s.tier); }
  }
  private tierOf(h: number) { return h >= K.ZOOM_AT ? 2 : h >= K.RUN_AT ? 1 : 0; }
  private chase(dt: number) {
    const s = this.st, ddx = s.dx - s.px, ddy = s.dy - s.py, dist = Math.hypot(ddx, ddy), tier = this.tierOf(s.heat);
    const V = K.V[tier], A = K.ACC[tier] * (tier === 2 && s.catches >= K.SNIFF_FROM ? 0.8 : 1); // ZOOMIES from crash 3 on: he overshoots + skids
    const want = dist < 22 ? 0 : Math.min(V, dist * K.ARRIVE), ux = dist > 0 ? ddx / dist : 0, uy = dist > 0 ? ddy / dist : 0;
    let ax = ux * want - s.vx, ay = uy * want - s.vy; const al = Math.hypot(ax, ay), lim = A * dt; if (al > lim) { ax *= lim / al; ay *= lim / al; }
    const turning = (s.vx * ux + s.vy * uy) < 0 && Math.hypot(s.vx, s.vy) > 260;
    s.vx += ax; s.vy += ay; s.px += s.vx * dt; s.py += s.vy * dt;
    if (s.px < X0 || s.px > X1) { s.px = Phaser.Math.Clamp(s.px, X0, X1); s.vx *= -0.2; } if (s.py < Y0 || s.py > Y1) { s.py = Phaser.Math.Clamp(s.py, Y0, Y1); s.vy *= -0.2; }
    const sp = Math.hypot(s.vx, s.vy);
    if (sp > V * 0.55 && dist > 30) s.heat = Math.min(K.HEAT_MAX, s.heat + dt); else if (sp < 120) s.heat = Math.max(0, s.heat - K.HEAT_DECAY * dt);
    const nt = this.tierOf(s.heat); if (nt > s.tier) this.tierUp(nt); s.tier = nt;
    if (turning) { this.puffT -= dt; if (this.puffT <= 0) { this.puffT = 0.06; this.puff(s.px, s.py - 4); } if (Math.random() < dt * 2) this.ft(s.px, s.py - 190, 'SKRRT!', '#fff', 30); }
    else if (tier === 2 && sp > 300) { this.puffT -= dt; if (this.puffT <= 0) { this.puffT = 0.09; this.puff(s.px - Math.sign(s.vx) * 30, s.py - 4); } }
    // losing the dot: too far ahead for too long
    const lose = K.LOSE_D[Math.min(s.catches, K.LOSE_D.length - 1)];
    if (dist > lose) s.far += dt; else s.far = Math.max(0, s.far - dt * 2);
    this.q.setVisible(dist > lose * K.WARN_K).setPosition(s.px, s.py - 190).setScale(1 + (dist > lose ? 0.3 : 0) + Math.sin(s.t * 18) * 0.06);
    if (s.far >= K.LOSE_T) { this.lost('far'); return; }
    // sniff-stops (crash 3 on): he stops; wiggle the dot to re-hook him
    if (s.catches >= K.SNIFF_FROM && s.chainI < 0) { s.sniffIn -= dt; const tr = this.traps.get(this.activeKind() as Kind)!;
      if (s.sniffIn <= 0 && Math.hypot(s.px - tr.x, s.py - tr.y) > 200) { this.startSniff(); return; } }
    // traps
    const hit = (t: Trap) => { const ex = (s.px - t.x) / t.rx, ey = (s.py - t.y) / t.ry; return ex * ex + ey * ey <= 1; };
    const act = this.traps.get(this.activeKind() as Kind);
    s.bumpCd = Math.max(0, s.bumpCd - dt);
    if (act && hit(act)) {
      // from crash 2 on he needs a run-up: at TROT he just boops it and backs off
      if (tier < K.MIN_TIER && s.catches >= 1 && s.bumpCd <= 0) { this.boop(act); return; }
      if (tier >= K.MIN_TIER || s.catches < 1) { this.crash(act, tier, sp); return; }
    }
    const tea = this.traps.get('tea')!; if (this.teaOn() && hit(tea)) { this.teaCrash(tea); return; }
    this.chatT -= dt; if (this.chatT <= 0 && sp > 200) { this.chatT = F([5, 8]); this.pupSay(pick(LINES.laserChase), 1000); }
  }
  private boop(t: Trap) {
    const s = this.st; s.bumpCd = 0.7; s.bumps++; const a = Math.atan2(s.py - t.y, s.px - t.x);
    s.vx = Math.cos(a) * 260; s.vy = Math.sin(a) * 160; s.heat = 0; s.combo = 0; Fx.boing(); this.puff(s.px, s.py - 4, 2);
    this.ft(s.px, s.py - 200, 'boop.', '#ffffff', 34); this.tweens.add({ targets: t.img, scaleY: (t.img.scaleY || 1) * 0.92, duration: 70, yoyo: true });
    if (s.bumps === 1 || s.bumps % 4 === 0) this.tip('Too slow! Get him RUNNING first!');
    else if (Math.random() < 0.5) this.pupSay(pick(LINES.laserBoop), 900);
  }
  private tierUp(t: number) {
    const s = this.st; if (t === 2) { this.comicAt(s.px, s.py - 230, 'ZOOMIES!', 52); Fx.special(); if (Math.random() < 0.6) this.pupSay(pick(LINES.laserZoom), 900); }
    else { this.ft(s.px, s.py - 200, 'RUN!', '#ffb347', 34); Fx.whoosh(); }
    const c = this.chips[t]; this.tweens.add({ targets: c.t, scale: 1.4, yoyo: true, duration: 140 });
  }
  private posePup(dt: number) {
    const s = this.st, p = this.pup, sp = Math.hypot(s.vx, s.vy);
    p.root.setPosition(s.px, s.py).setDepth(10 + s.py * 0.01).setAngle(0);
    if (s.phase === 'sniff') { p.body.setTexture('pl_sniff'); p.update(dt, 0, 0.6); p.root.setAngle(Math.sin(s.t * 20) * 2); return; }
    if (Math.abs(s.vx) > 25) p.flip(s.vx < 0);
    const tier = this.tierOf(s.heat), turning = (s.vx * (s.dx - s.px) + s.vy * (s.dy - s.py)) < 0 && sp > 260;
    if (turning) { p.body.setTexture('pa_ouch'); p.update(dt, 0, 1.5); p.squash(1.08, 0.94); p.root.setAngle((s.vx > 0 ? -1 : 1) * 10); }
    else if (sp > 40) { p.update(dt, Math.min(2.2, 0.35 + sp / 230), 1.3); const k = tier === 2 ? 1.08 : 1; p.squash(k, 2 - k); p.root.setAngle((s.vx > 0 ? 1 : -1) * Math.min(8, sp / 60)); }
    else { p.body.setTexture(Math.hypot(s.dx - s.px, s.dy - s.py) < 40 ? 'pa_taunt' : 'pt_stand'); p.update(dt, 0, 2); p.squash(1, 1 + Math.sin(s.t * 10) * 0.02); }
    // speed lines at ZOOMIES
    this.fxg.clear(); if (tier === 2 && sp > 260) { const ux = -s.vx / sp, uy = -s.vy / sp; this.fxg.lineStyle(5, 0xffffff, 0.65);
      for (let i = 0; i < 3; i++) { const ox = -uy * (i - 1) * 34, oy = ux * (i - 1) * 34 - 70; const a = 60 + ((s.t * 900 + i * 40) % 50); this.fxg.lineBetween(s.px + ux * a + ox, s.py + uy * a + oy, s.px + ux * (a + 50) + ox, s.py + uy * (a + 50) + oy); } }
  }
  private drawDot() {
    const s = this.st, g = this.dotG; g.clear(); if (!this.ready || s.over || s.phase === 'end') return;
    const tip = this.rig ? this.pointer.getWorldTransformMatrix() : null;
    if (tip) { const a = Math.atan2(s.dy - tip.ty, s.dx - tip.tx), x0 = tip.tx + Math.cos(a) * 20, y0 = tip.ty + Math.sin(a) * 20;
      this.pointer.setRotation(a); g.lineStyle(6, 0xff3b3b, 0.12).lineBetween(x0, y0, s.dx, s.dy).lineStyle(2, 0xff6b6b, 0.45).lineBetween(x0, y0, s.dx, s.dy); }
    const pulse = 1 + Math.sin(s.t * 14) * 0.12, warn = this.q.visible;
    g.fillStyle(warn ? 0xffb347 : 0xff3b3b, 0.22).fillCircle(s.dx, s.dy, 30 * pulse).fillStyle(0xff3b3b, 0.35).fillCircle(s.dx, s.dy, 19 * pulse);
    g.fillStyle(0xff2a2a, 1).fillCircle(s.dx, s.dy, 11).fillStyle(0xffffff, 0.95).fillCircle(s.dx - 3, s.dy - 3, 4);
  }
  private drawGlow() {
    const s = this.st, g = this.glowG; g.clear(); if (!s.running || s.over) { this.trapTag.setVisible(false); return; }
    const pulse = 0.5 + 0.5 * Math.sin(s.t * 6);
    const ring = (t: Trap, col: number, a: number, w = 6) => { g.fillStyle(col, 0.16 + 0.12 * pulse * a).fillEllipse(t.x, t.y, t.rx * 2.1, t.ry * 2.1);
      g.lineStyle(w, col, (0.6 + 0.4 * pulse) * a); const n = 18; for (let i = 0; i < n; i += 2) { const a0 = (i / n) * Math.PI * 2 + s.t * 0.8, a1 = ((i + 1) / n) * Math.PI * 2 + s.t * 0.8;
        g.beginPath(); g.arc(t.x, t.y, 1, a0, a1); g.strokePath(); g.lineBetween(t.x + Math.cos(a0) * t.rx * 1.05, t.y + Math.sin(a0) * t.ry * 1.05, t.x + Math.cos(a1) * t.rx * 1.05, t.y + Math.sin(a1) * t.ry * 1.05); } };
    if (this.teaOn()) ring(this.traps.get('tea')!, 0xff4d6d, 0.5, 4);
    if (s.chainI >= 0) s.chain.forEach((k, i) => { if (i > s.chainI) ring(this.traps.get(k)!, 0x7dff9a, 0.35, 3); });
    const k = this.activeKind(); const t = k ? this.traps.get(k) : undefined;
    if (t && (s.phase === 'chase' || s.phase === 'sniff')) { ring(t, 0x7dff9a, 1); const tagY = k === 'door' ? 880 : k === 'frame' ? 650 : t.y - 120;
      this.trapTag.setVisible(true).setPosition(t.x, tagY + Math.sin(s.t * 7) * 6);
      (this.trapTag.list[1] as Phaser.GameObjects.Text).setText(s.chainI >= 0 ? `${s.chainI + 1} of 3` : 'TRAP!'); }
    else this.trapTag.setVisible(false);
  }
  private aimNoir() {
    if (!this.rig || this.noirBusyT > 0) return; const s = this.st, sh = { x: this.rig.x + 18, y: this.rig.y - 40 };
    const a = Phaser.Math.RadToDeg(Math.atan2(s.dx - sh.x, s.dy - sh.y)); this.rig.setPose({ rs: Phaser.Math.Clamp(a + 3, -10, 175), re: 0 });
  }
  private roombaTick(dt: number) {
    const t = this.traps.get('basket')!; this.roombaA += dt * K.ROOMBA_W; const x = 380 + Math.cos(this.roombaA) * 210, y = 1060 + Math.sin(this.roombaA) * 100;
    t.x = x; t.y = y; t.img.setPosition(x, y + 18).setDepth(10 + (y + 18) * 0.01).setAngle(Math.sin(this.st.t * 6) * 3); this.roomba!.setPosition(x, y + 26).setDepth(t.img.depth - 0.01);
  }
  // ------------------------------------------------------------------ sniff + lost
  private startSniff() {
    const s = this.st; s.phase = 'sniff'; s.sniffT = F(K.SNIFF_T); s.wiggle = 0; s.vx = s.vy = 0; this.q.setVisible(false);
    this.ft(s.px, s.py - 180, pick(LINES.laserSniff), '#ffffff', 30);
    if (!s.played.includes('sniffTip')) { s.played.push('sniffTip'); this.tip('WIGGLE the dot!'); }
  }
  private tip(t: string) { this.hint?.destroy(); const c = this.add.container(360, 470).setDepth(805), g = this.add.graphics(), x = comic(this, 0, 0, t, 44);
    g.fillStyle(0x22252b, 0.85).fillRoundedRect(-x.width / 2 - 26, -40, x.width + 52, 80, 30); c.add([g, x]); this.hint = c; this.tweens.add({ targets: c, alpha: 0, delay: 1500, duration: 300, onComplete: () => c.destroy() }); }
  private sniff(dt: number) {
    const s = this.st; s.sniffT -= dt;
    if (s.wiggle >= K.WIGGLE) { s.phase = 'chase'; s.sniffIn = F(K.SNIFF_EVERY); this.ft(s.px, s.py - 190, '!', '#ff6b6b', 52); Fx.alert(); return; }
    if (s.sniffT <= 0) this.lost('sniff');
  }
  private lost(_why: 'far' | 'sniff') {
    const s = this.st; s.phase = 'lost'; s.strikes++; s.combo = 0; s.heat = 0; s.tier = 0; s.vx = s.vy = 0; s.far = 0; this.q.setVisible(false); this.fxg.clear(); this.paintStrikes();
    if (s.chainI > 0) { s.chainI = 0; s.chainT = 0; }
    const p = this.pup; p.body.setTexture('pa_worry'); p.squash(1, 1); this.ft(s.px, s.py - 190, '?!', '#ffffff', 46); Fx.alert();
    this.cameras.main.shake(140, 0.006); flashVignette(this, 0xff3b6b, 0.35);
    const tx = NOIR.x + 120, ty = NOIR.y + 40;
    this.at(500, () => { p.flip(tx < s.px); this.pupSay(pick(LINES.laserLost), 1100);
      this.tweens.add({ targets: p.root, x: tx, y: ty, duration: 650, ease: 'Sine.InOut', onUpdate: () => { p.update(1 / 60, 1.6, 1.4); p.root.setDepth(10 + p.root.y * 0.01); } }); });
    this.at(1200, () => { p.body.setTexture('pa_taunt'); p.flip(true); this.tweens.add({ targets: p.root, y: ty - 40, duration: 120, yoyo: true, repeat: 2 });
      this.ft(NOIR.x + 40, NOIR.y - 140, 'WOOF!', '#ffffff', 36); this.rig.setMood('dizzy'); this.noirBusyT = 1; this.noirSay(pick(LINES.laserLostNoir), 1000); });
    this.at(2000, () => { this.rig.setMood('smug');
      if (s.strikes >= K.STRIKES) { this.finish(false); return; }
      s.px = p.root.x; s.py = p.root.y; this.setDot(s.px + 130, s.py + 60); s.phase = 'chase'; s.sniffIn = F(K.SNIFF_EVERY);
      this.tip(s.strikes === 1 ? 'Not so far ahead!' : 'LAST CHANCE: stay close!'); });
  }
  // ------------------------------------------------------------------ crashes
  private chainBreak() { const s = this.st; s.chainI = 0; s.chainT = 0; this.tip('Too slow! Chain from 1 again'); this.noirSay('Noir: Again, darling. From the top.'); Fx.save(); }
  private crash(t: Trap, tier: number, sp: number) {
    const s = this.st; void sp;
    const chainStep = s.chainI >= 0 && t.kind !== 'carrier';
    s.combo++; const pts = Math.round(K.PTS[tier] * (1 + K.COMBO * (s.combo - 1)) * (chainStep ? 0.5 : 1)); s.score += pts;
    if (tier === 2) s.megas++;
    this.hitStop = [0.06, 0.1, 0.16][tier]; this.tweens.timeScale = 0.02; Fx.punch(); if (tier === 2) Fx.special();
    const word = { basket: 'SPLOOSH!', door: 'SMUSH!', rug: 'FWOOMP!', piano: 'BLAAANG!', bubble: 'POP POP!', frame: 'BOING!', carrier: 'CLICK!', tea: 'CRASH!' }[t.kind];
    impact(this, t.x, t.y - 90, tier === 2 ? 'MEGA ' + word : tier === 1 ? word : 'bump!', pts, s.combo > 1 ? `x${s.combo}` : '', tier === 2);
    if (tier === 2) flashVignette(this, 0xffffff, 0.5);
    this.fxg.clear(); this.q.setVisible(false); s.far = 0;
    if (chainStep) { // finale: bounce off and keep going
      s.played.push(t.kind); s.chainI++; s.chainT = K.CHAIN_T; this.quickGag(t); s.vx *= -0.35; s.vy *= -0.35; s.heat = Math.max(s.heat, K.RUN_AT);
      this.ft(360, 470, `CHAIN ${s.chainI}/3! Keep going!`, '#7dff9a', 36); Fx.combo(s.chainI * 3); return;
    }
    s.phase = 'gag'; s.vx = s.vy = 0; s.played.push(t.kind); this.trapTag.setVisible(false);
    if (t.kind !== 'carrier') { s.catches++; s.boops = s.catches; } else { s.catches = K.NEED; s.boops = s.catches; }
    this.hud.pop(); this.noirHappy();
    const dur = this.gag(t, tier);
    if (t.kind === 'carrier') { this.at(dur, () => this.finish(true)); return; }
    this.at(dur, () => this.afterGag());
  }
  private noirHappy() { if (!this.rig) return; this.rig.setMood('happy'); this.noirBusyT = 0.8; this.rig.setPose({ rs: 170, re: 10, ls: -160 }); this.time.delayedCall(800, () => { if (this.rig) { this.rig.setMood('smug'); this.rig.setPose(SIT); } }); }
  private afterGag() {
    const s = this.st, p = this.pup; p.root.setVisible(true).setAngle(0).setScale(1); p.inner.setAngle(0); p.squash(1, 1);
    s.px = Phaser.Math.Clamp(p.root.x, X0, X1); s.py = Phaser.Math.Clamp(p.root.y, Y0, Y1); p.root.setPosition(s.px, s.py);
    s.heat = 0; s.tier = 0; s.vx = s.vy = 0; s.phase = 'chase';
    if (s.catches >= K.NEED) { this.finish(true); return; }
    this.lightNext();
    // drop the dot a short hop away from him, toward the next trap, so the next run starts readable
    const t = this.traps.get(this.activeKind() as Kind)!; const a = Math.atan2(t.y - s.py, t.x - s.px); this.setDot(s.px + Math.cos(a) * 110, s.py + Math.sin(a) * 110);
    if (Math.random() < 0.45) this.at(400, () => this.noirSay(pick(LINES.laserNoir), 1300));
  }
  private teaCrash(t: Trap) {
    const s = this.st; s.phase = 'gag'; s.vx = s.vy = 0; s.combo = 0; s.heat = 0; s.tier = 0; s.teas++; this.fxg.clear(); this.q.setVisible(false);
    s.time = Math.max(0.5, s.time - K.TEA_SEC); this.hitStop = 0.08; this.tweens.timeScale = 0.02; Fx.ouch(); this.cameras.main.shake(200, 0.012);
    this.comicAt(t.x, t.y - 170, 'CRASH!', 58); this.ft(360, 420, `-${K.TEA_SEC}s`, '#ff4d6d', 52);
    for (let i = 0; i < 4; i++) { const c = this.add.circle(t.x + Phaser.Math.Between(-30, 30), t.y - 60, 10, 0xffffff).setStrokeStyle(3, 0x22252b).setDepth(700);
      this.tweens.add({ targets: c, x: c.x + Phaser.Math.Between(-160, 160), y: c.y - Phaser.Math.Between(80, 160), duration: 300, ease: 'Quad.Out', yoyo: true, onComplete: () => c.destroy() }); }
    this.tweens.add({ targets: t.img, angle: 14, duration: 90, yoyo: true, repeat: 2 });
    const p = this.pup; p.body.setTexture('pt_dizzy'); p.squash(1, 1); this.orbitStars(900);
    this.at(250, () => this.bunnyPop('bun_full_unimpressed', pick(LINES.laserTea)));
    this.at(1500, () => { s.phase = 'chase'; s.px = Phaser.Math.Clamp(s.px + (s.px < t.x ? -90 : 90), X0, X1); this.setDot(s.px + (s.px < t.x ? -120 : 120), s.py + 40); });
  }
  /** finale chain step: a quick gag, he keeps running */
  private quickGag(t: Trap) {
    const n = t.kind === 'bubble' ? 'POP!' : t.kind === 'piano' ? '♪ BLANG' : t.kind === 'rug' ? 'FLOOMP' : 'SOCKS!';
    this.comicAt(t.x, t.y - 160, n, 44, 8); this.fromHead('★', 2); sparks(this, t.x, t.y - 30, 10);
    if (t.kind === 'basket') this.putHat(); this.tweens.add({ targets: t.img, scaleY: (t.img.scaleY || 1) * 0.85, duration: 80, yoyo: true });
  }
  private putHat() { if (this.hat) return; this.hat = this.add.image(-4, -HEAD - 28, 'll_sock').setScale(0.72).setAngle(-12); this.pup.inner.add(this.hat); }
  // ------------------------------------------------------------------ the gags (one per trap). Return the duration in ms.
  private gag(t: Trap, tier: number): number {
    const s = this.st, p = this.pup, big = tier === 2, k = 1 + tier * 0.15; this.gagFace = s.vx < 0 ? -1 : 1;
    const line = (noir: string[], pup: string[], d1 = 700, d2 = 1250) => { this.at(d1, () => this.noirSay(pick(noir), 1300)); this.at(d2, () => this.pupSay(pick(pup), 1300)); };
    const arc = (x: number, y: number, h: number, ms: number, done?: () => void) => { const x0 = p.root.x, y0 = p.root.y;
      return this.tweens.addCounter({ from: 0, to: 1, duration: ms, onUpdate: tw => { const q = tw.getValue()!; p.root.setPosition(x0 + (x - x0) * q, y0 + (y - y0) * q - Math.sin(q * Math.PI) * h); }, onComplete: () => done?.() }); };
    switch (t.kind) {
      case 'basket': { // dive in, socks fly, pops out wearing Bunny's frilly sock
        p.body.setTexture('pa_jump'); p.flip(t.x < p.root.x); p.root.setDepth(t.img.depth + 0.01);
        arc(t.x, t.y - 40, 120, 260, () => { p.root.setVisible(false); this.tweens.add({ targets: t.img, angle: 9, duration: 70, yoyo: true, repeat: big ? 5 : 3 }); if (this.roomba) this.tweens.add({ targets: [t.img], angle: 360, duration: 700 }); });
        const socks = big ? 7 : 3 + tier; for (let i = 0; i < socks; i++) this.at(300 + i * 60, () => { const o = this.add.image(t.x, t.y - 60, 'll_sock').setScale(0.5).setDepth(700).setAngle(Phaser.Math.Between(0, 360));
          this.tweens.add({ targets: o, x: o.x + Phaser.Math.Between(-220, 220), y: o.y - Phaser.Math.Between(120, 260), angle: o.angle + 300, duration: 450, ease: 'Quad.Out', yoyo: true, onComplete: () => o.destroy() }); });
        this.at(950, () => { this.hat?.destroy(); this.hat = undefined; p.root.setVisible(true).setPosition(t.x, t.y - 30); p.body.setTexture('pa_worry'); this.putHat(); p.root.setDepth(t.img.depth + 0.01);
          arc(Phaser.Math.Clamp(t.x + 120, X0, X1), Math.min(Y1, t.y + 10), 90, 380, () => p.root.setDepth(10 + p.root.y * 0.01)); Fx.boing(); });
        line(LINES.laserSockNoir, LINES.laserSockPup, 1300, 1500); return big ? 2600 : 2300;
      }
      case 'door': { // face-smush on the glass, then a slow squeeeak slide
        p.body.setTexture('pa_jump'); arc(t.x - 6, t.y - 70, 60, 160, () => {
          p.body.setTexture('pl_smush'); p.flip(false); p.squash(1.22 * k, 0.9); Fx.punch(); this.cameras.main.shake(160, 0.012);
          const door = t.img; this.tweens.add({ targets: door, scaleX: door.scaleX * 1.03, duration: 60, yoyo: true, repeat: 2 });
          const nose = this.add.ellipse(t.x - 6, t.y - 70 - HEAD + 14, 26, 16, 0xffffff, 0.35).setDepth(3.1); void nose;
          this.at(450, () => { const sq = comic(this, t.x - 120, t.y - 210, 'squeeeeak...', 34).setDepth(760).setAngle(-6); this.tweens.add({ targets: sq, alpha: 0, delay: 900, duration: 300, onComplete: () => sq.destroy() });
            Fx.creak(); this.tweens.add({ targets: p.root, y: t.y + 6, duration: big ? 1100 : 800, ease: 'Sine.In' }); this.tweens.add({ targets: p.inner, scaleY: 0.82, duration: 900 }); });
          this.orbitStars(big ? 1800 : 1300); });
        line(LINES.laserGlassNoir, LINES.laserGlassPup, 1200, 1600); this.at(1700, () => { p.squash(1, 1); p.body.setTexture('pt_dizzy'); }); return big ? 2500 : 2200;
      }
      case 'rug': { // rolls up into a Puppy burrito, only his head out. Sweet.
        const r = t.img; this.tweens.add({ targets: r, scaleX: 0.2, alpha: 0, duration: 260 });
        const roll = this.add.image(t.x - 20, t.y - 26, 'll_roll').setScale(0.1, 0.8).setDepth(10 + t.y * 0.01 + 0.02);
        p.body.setTexture('pl_cozy'); p.flip(false); p.root.setPosition(t.x - 20, t.y - 26).setDepth(10 + t.y * 0.01);
        this.tweens.add({ targets: p.root, angle: 90, duration: 260, ease: 'Back.Out' }); this.tweens.add({ targets: roll, scaleX: 0.8, duration: 300, ease: 'Back.Out' });
        this.at(320, () => { this.tweens.add({ targets: [roll, p.root], y: '-=8', duration: 160, yoyo: true, repeat: 3 }); });
        const headAt = () => ({ x: p.root.x + HEAD, y: p.root.y - 10 });
        this.at(700, () => this.fromHead('♥', big ? 6 : 4, headAt())); this.at(1300, () => this.fromHead('♥', 3, headAt()));
        line(LINES.laserRugNoir, LINES.laserRugPup, 1500, 700);
        this.at(big ? 2300 : 2000, () => { this.tweens.add({ targets: roll, scaleX: 0.05, alpha: 0, duration: 220, onComplete: () => roll.destroy() }); this.tweens.add({ targets: r, scaleX: 1, alpha: 1, duration: 300 });
          this.tweens.add({ targets: p.root, angle: 0, y: t.y, duration: 240 }); p.body.setTexture('pa_happy'); });
        return big ? 2700 : 2400;
      }
      case 'piano': { // belly-flop: BLAAANG, X-eyes, the tail plays one last note
        p.body.setTexture('pa_jump'); p.flip(t.x < p.root.x); p.root.setDepth(t.img.depth + 0.01);
        arc(t.x, t.y - 72, 150, 300, () => { p.body.setTexture('pl_xeyes'); p.root.setAngle(p.inner.scaleX < 0 ? -84 : 84); Fx.punch(); Fx.goal();
          this.tweens.add({ targets: t.img, scaleY: 0.82, duration: 80, yoyo: true }); this.cameras.main.shake(260, 0.016);
          for (let i = 0; i < (big ? 8 : 5); i++) { const n = txt(this, t.x + Phaser.Math.Between(-80, 80), t.y - 90, i % 2 ? '♪' : '♫', 40, '#ffffff', '#22252b', 6).setDepth(760);
            this.tweens.add({ targets: n, y: n.y - Phaser.Math.Between(90, 200), x: n.x + Phaser.Math.Between(-60, 60), alpha: 0, duration: 900, delay: i * 50, onComplete: () => n.destroy() }); }
          const headAt = () => { const a = Phaser.Math.DegToRad(p.root.angle); return { x: p.root.x + Math.sin(a) * HEAD, y: p.root.y - Math.cos(a) * HEAD }; };
          this.orbitStars(1400, headAt); });
        this.at(1500, () => { const tp = p.tipPos(); const n = txt(this, tp.x, tp.y - 10, '♪ plink', 30, '#ffdf6b', '#22252b', 5).setDepth(760); Fx.alert();
          this.tweens.add({ targets: n, y: n.y - 80, alpha: 0, duration: 900, onComplete: () => n.destroy() }); });
        line(LINES.laserPianoNoir, LINES.laserPianoPup, 900, 1800);
        this.at(big ? 2300 : 2050, () => { p.root.setAngle(0); p.body.setTexture('pt_dizzy'); arc(Phaser.Math.Clamp(t.x - 130, X0, X1), t.y - 10, 50, 260); });
        return big ? 2700 : 2400;
      }
      case 'bubble': { // POP POP: a bubble-wrap dance
        let f = 1; const pops = big ? 12 : 7 + tier * 2;
        for (let i = 0; i < pops; i++) this.at(i * 130, () => { const x = t.x + Phaser.Math.Between(-90, 90), y = t.y + Phaser.Math.Between(-30, 30);
          const o = comic(this, x, y - 40, 'POP!', 30).setDepth(760).setAngle(Phaser.Math.Between(-20, 20)); this.tweens.add({ targets: o, y: y - 110, alpha: 0, duration: 500, onComplete: () => o.destroy() });
          Fx.block(); f = -f; p.flip(f < 0); p.body.setTexture(i % 2 ? 'pa_jump' : 'pa_happy'); this.tweens.add({ targets: p.root, y: t.y - 50, duration: 60, yoyo: true }); });
        p.root.setPosition(t.x, t.y);
        line(LINES.laserBubbleNoir, LINES.laserBubblePup, 600, 1300); this.at(pops * 130 + 300, () => p.body.setTexture('pa_taunt'));
        return Math.max(2100, pops * 130 + 800);
      }
      case 'frame': { // leaps at the wall, hangs from Bunny's portrait by his paws, legs dangling, then THUD
        const fx = this.frameC.x, fy = this.frameC.y + 82 * 0.9 + HEAD + 26; p.body.setTexture('pa_jump'); p.flip(false);
        arc(fx, fy, 60, 320, () => { p.body.setTexture('pl_hang'); p.root.setDepth(3.5); Fx.boing(); this.frameBun.setTexture('bun_bust_wink');
          this.tweens.add({ targets: this.frameC, angle: 12, duration: 300, ease: 'Back.Out' });
          this.tweens.add({ targets: p.root, angle: { from: -10, to: 10 }, x: { from: fx - 8, to: fx + 8 }, duration: 380, yoyo: true, repeat: big ? 3 : 2, ease: 'Sine.InOut' }); });
        line(LINES.laserFrameNoir, LINES.laserFramePup, 1500, 600);
        const drop = big ? 2100 : 1800;
        this.at(drop, () => { p.root.setAngle(0); p.body.setTexture('pa_fall'); this.tweens.add({ targets: p.root, y: Y0 + 30, duration: 260, ease: 'Quad.In', onComplete: () => { p.body.setTexture('pt_dizzy'); p.root.setDepth(10 + (Y0 + 30) * 0.01);
          this.comicAt(fx, Y0 - 120, 'THUD!', 46); this.cameras.main.shake(140, 0.01); this.orbitStars(900); this.tweens.add({ targets: this.frameC, angle: 0, duration: 500, ease: 'Elastic.Out' }); this.frameBun.setTexture('bun_bust_smile'); } }); });
        return drop + 900;
      }
      case 'carrier': { // finale: into Bunny's pet carrier, door clicks shut
        p.body.setTexture('pa_jump'); arc(t.x, t.y - 40, 70, 240, () => { p.root.setVisible(false); this.tweens.add({ targets: t.img, angle: 6, duration: 80, yoyo: true, repeat: 5 }); });
        this.at(380, () => { this.cdoor = this.add.image(t.x - 4, t.y - 66, 'll_cdoor').setScale(0.05, 0.78).setDepth(t.img.depth + 0.02); this.tweens.add({ targets: this.cdoor, scaleX: 0.78, duration: 160, ease: 'Back.Out' });
          this.comicAt(t.x, t.y - 230, 'CLICK!', 60); Fx.block(); this.fromHead('♥', 3, { x: t.x, y: t.y - 110 }); });
        this.at(700, () => this.bunnyPop('bun_full_sneaky', pick(LINES.laserCarrier.filter(l => l.startsWith('Bunny'))) ?? 'Bunny: Signed, sealed, mine.'));
        this.at(500, () => this.noirSay('Noir: Delivered, darling.', 1800)); this.at(1400, () => this.pupSay(pick(LINES.laserWinPup), 1400));
        return 2600;
      }
      default: return 1200;
    }
  }
  /** test hook: play one trap's gag on demand (screenshots) */
  private demoGag(k: Kind, tier = 2) { const t = this.traps.get(k); if (!t || !this.ready) return; const s = this.st; s.running = true; if (s.phase === 'wait') s.phase = 'chase';
    if (k === 'carrier') t.img.setVisible(true).setScale(0.82); s.kind = k; s.chainI = -1; s.px = t.x + (k === 'frame' || k === 'door' ? 0 : -60); s.py = t.y; s.vx = 400; this.pup.root.setPosition(s.px, s.py); this.crash(t, tier, 400); }
  // ------------------------------------------------------------------ end
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; s.phase = 'end'; (window as any).__pr.ended = win ? 'win' : 'lose';
    this.trapTag.setVisible(false); this.q.setVisible(false); this.fxg?.clear(); this.dotG?.clear(); this.glowG?.clear(); this.tweens.timeScale = 1; this.hitStop = 0;
    if (!win && this.pup) { const p = this.pup; p.root.setVisible(true).setAngle(0); p.squash(1, 1); p.body.setTexture('pa_taunt'); this.tweens.add({ targets: p.root, y: p.root.y - 50, duration: 180, yoyo: true, repeat: 3, ease: 'Quad.Out' });
      this.pupSay(pick(LINES.laserLose), 1400); this.rig?.setMood('dizzy'); }
    popBanner(this, win ? 'DELIVERED, DARLING!' : s.strikes >= K.STRIKES ? 'DOT LOST!' : 'TIME!', 600, win ? 0x2fbf5a : 0x6b4cc9, 800);
    this.time.delayedCall(1100, () => endCard(this, 'Noir', 5, win, s.score + Math.round(s.time) * 20, `${s.catches} crashes • ${s.megas} MEGA`));
  }
}
