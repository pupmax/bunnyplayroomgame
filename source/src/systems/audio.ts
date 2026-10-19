// Tiny WebAudio synth for greybox SFX. No asset files.
// Handles the iOS/Safari "unlock on first user gesture" rule.
import { Storage } from './storage';

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let master: GainNode | null = null;
let muted = Storage.getMuted();
let unlocked = false;

function ensureCtx(): Ctx | null {
  if (ctx) return ctx;
  const AC: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}

function unlock(): void {
  const c = ensureCtx();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  if (!unlocked) {
    // Play a 1-sample silent buffer inside the gesture (old iOS needs this).
    try {
      const buf = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = buf; src.connect(c.destination); src.start(0);
      unlocked = true;
    } catch { /* ignore */ }
  }
}

/** Call once at boot: listens for the first gestures to unlock audio. */
export function installAudioUnlock(): void {
  const evs = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'click', 'keydown'];
  const handler = () => {
    unlock();
    if (unlocked && ctx && ctx.state === 'running') evs.forEach(e => document.removeEventListener(e, handler, true));
  };
  evs.forEach(e => document.addEventListener(e, handler, { capture: true, passive: true }));
  // iOS suspends the context when the app is backgrounded.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  });
}

export function isMuted(): boolean { return muted; }
export function setMuted(m: boolean): void {
  muted = m;
  Storage.setMuted(m);
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.01);
}
export function toggleMute(): boolean { setMuted(!muted); return muted; }

function tone(opts: {
  type?: OscillatorType; from: number; to?: number; dur: number; vol?: number; delay?: number;
}): void {
  if (muted) return;
  const c = ensureCtx();
  if (!c || !master || c.state !== 'running') return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'square';
  osc.frequency.setValueAtTime(opts.from, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
  const v = opts.vol ?? 0.25;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + opts.dur + 0.02);
}

function noise(dur: number, vol = 0.3, filterFreq = 800, delay = 0): void {
  if (muted) return;
  const c = ensureCtx();
  if (!c || !master || c.state !== 'running') return;
  const t0 = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
}

export const Sfx = {
  jump: () => tone({ type: 'square', from: 320, to: 720, dur: 0.12, vol: 0.12 }),
  pickup: () => { tone({ type: 'sine', from: 1046, dur: 0.09, vol: 0.22 }); tone({ type: 'sine', from: 1568, dur: 0.14, vol: 0.2, delay: 0.06 }); },
  ice: () => { tone({ type: 'triangle', from: 1760, to: 2400, dur: 0.08, vol: 0.2 }); tone({ type: 'triangle', from: 2200, dur: 0.1, vol: 0.15, delay: 0.05 }); },
  hit: () => { tone({ type: 'sine', from: 160, to: 50, dur: 0.25, vol: 0.5 }); noise(0.15, 0.25, 600); },
  slip: () => { tone({ type: 'sawtooth', from: 900, to: 200, dur: 0.3, vol: 0.12 }); },
  powerup: () => { noise(0.45, 0.25, 2500); tone({ type: 'sawtooth', from: 200, to: 1200, dur: 0.4, vol: 0.12 }); },
  click: () => tone({ type: 'square', from: 600, dur: 0.05, vol: 0.1 }),
  sting: (good: boolean) => {
    const notes = good ? [523, 659, 784, 1046] : [392, 370, 349, 262];
    notes.forEach((n, i) => tone({ type: 'triangle', from: n, dur: i === 3 ? 0.5 : 0.16, vol: 0.22, delay: i * 0.13 }));
  },
  van: () => { noise(0.6, 0.2, 300); tone({ type: 'sawtooth', from: 90, to: 140, dur: 0.6, vol: 0.12 }); },
};

export const Sushi = {
  slice: () => { noise(0.08, 0.35, 5000); tone({ type: 'triangle', from: 1400, to: 2600, dur: 0.07, vol: 0.12 }); },
  good: (n = 0) => tone({ type: 'sine', from: 660 * Math.pow(1.06, Math.min(n, 12)), dur: 0.12, vol: 0.2 }),
  wrong: () => tone({ type: 'square', from: 220, to: 140, dur: 0.22, vol: 0.14 }),
  order: () => [784, 988, 1175, 1568].forEach((n, i) => tone({ type: 'triangle', from: n, dur: 0.14, vol: 0.2, delay: i * 0.07 })),
  fire: () => { noise(0.7, 0.4, 900); tone({ type: 'sawtooth', from: 120, to: 60, dur: 0.6, vol: 0.18 }); },
  gag: () => { tone({ type: 'sawtooth', from: 180, to: 90, dur: 0.35, vol: 0.18 }); tone({ type: 'sawtooth', from: 140, to: 70, dur: 0.3, vol: 0.14, delay: 0.25 }); },
  golden: () => [1046, 1318, 1568, 2093, 2637].forEach((n, i) => tone({ type: 'sine', from: n, dur: 0.18, vol: 0.18, delay: i * 0.05 })),
  toss: () => tone({ type: 'sine', from: 300, to: 520, dur: 0.1, vol: 0.06 }),
  star: (i: number) => tone({ type: 'triangle', from: 700 + i * 120, dur: 0.15, vol: 0.2 }),
  sting: (good: boolean) => Sfx.sting(good),
};

export const Fx = {
  punch: () => { noise(0.12, 0.45, 900); tone({ type: 'sine', from: 180, to: 60, dur: 0.18, vol: 0.4 }); },
  block: () => tone({ type: 'square', from: 300, to: 260, dur: 0.08, vol: 0.12 }),
  whoosh: () => noise(0.18, 0.25, 3000),
  boing: () => tone({ type: 'sine', from: 200, to: 700, dur: 0.25, vol: 0.25 }),
  ouch: () => { tone({ type: 'sawtooth', from: 500, to: 160, dur: 0.3, vol: 0.15 }); noise(0.1, 0.3, 700); },
  kick: () => { noise(0.08, 0.5, 1200); tone({ type: 'sine', from: 140, to: 70, dur: 0.12, vol: 0.4 }); },
  goal: () => { noise(0.9, 0.18, 1800); [523, 659, 784, 1046, 1318].forEach((n, i) => tone({ type: 'triangle', from: n, dur: 0.16, vol: 0.2, delay: i * 0.07 })); },
  save: () => { tone({ type: 'square', from: 400, to: 200, dur: 0.25, vol: 0.14 }); noise(0.15, 0.3, 500); },
  combo: (n: number) => tone({ type: 'sine', from: 600 * Math.pow(1.07, Math.min(n, 12)), dur: 0.1, vol: 0.2 }),
  special: () => { noise(0.4, 0.3, 2500); tone({ type: 'sawtooth', from: 150, to: 900, dur: 0.35, vol: 0.15 }); },
  creak: () => { tone({ type: 'sawtooth', from: 150, to: 105, dur: 0.24, vol: 0.05 }); tone({ type: 'sawtooth', from: 120, to: 160, dur: 0.16, vol: 0.035, delay: 0.12 }); }, // chain creak at the swing ends
  alert: () => tone({ type: 'triangle', from: 1200, dur: 0.07, vol: 0.18 }),
  step: () => tone({ type: 'sine', from: 260, to: 200, dur: 0.06, vol: 0.08 }),
  sting: (good: boolean) => Sfx.sting(good),
};
