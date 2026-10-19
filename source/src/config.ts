// Tuning constants for Sushi Showdown (base 720x1280, seconds).
export const GAME_W = 720;
export const GAME_H = 1280;
export const ROUND_TIME = 60;
export const PATIENCE = { MAX: 100, WRONG: 12, ROTTEN: 20, MISS_ORDER: 0, REGEN_ON_ORDER: 10 };
export const GRAVITY = 1250;
export const SPAWN = { GAP_START: 1.0, GAP_END: 0.55, WASABI: 0.12, ROTTEN: 0.12, GOLDEN: 0.035 };
export const FIRE_LOCK = 0.9;       // seconds input is disabled after a wasabi bomb
export const FRENZY = { TIME: 5, SLOWMO: 0.45 };
export const SCORE = { CORRECT: 50, ORDER: 250, GOLDEN: 150, WASABI: -100 };
export const PIECES = ['salmon', 'tuna', 'ebi', 'tamago', 'maki'] as const;
export const COLORS = { INK: 0x22252b, BUTTON: 0xff5c8a, BUTTON_ALT: 0x3a86ff };
export const FONT = '"Fredoka", "Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif';
export const TOUCH_MIN = 88;
export const STORAGE_KEYS = { BEST: 'playroom.best', MUTE: 'playroom.mute' };
export const ROASTS: Record<number, string[]> = {
  1: ['I have tasted better sushi in a dream. A bad dream.', 'Puppy, the fish is judging you.', 'One star. For effort. Barely.'],
  2: ['Mediocre. Like your knife skills ...haha', 'I asked for sushi, not a crime scene.', 'Two stars. The rice did most of the work.'],
  3: ['Acceptable. Do not let it go to your head.', 'Average. Very... average.', 'Three stars. I am mildly not disappointed.'],
  4: ['Almost impressive...', 'Good Puppy. ...haha', 'Four stars. Do not get cocky.'],
  5: ['Fine. Five stars. Tell no one.', 'Excellent Puppy. ...haha', 'I will allow it. Five stars ❤️'],
};
