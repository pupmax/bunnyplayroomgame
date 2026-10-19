import { STORAGE_KEYS } from '../config';
import { STANDALONE, TESTER } from '../standalone';
const PFX = STANDALONE ? `playroom-${STANDALONE}.` : TESTER ? 'playroom-test.' : '';
const ns = (key: string) => (PFX ? key.replace(/^playroom\./, PFX) : key);

function get(key: string): string | null {
  try { return window.localStorage.getItem(ns(key)); } catch { return null; }
}
function set(key: string, value: string): void {
  try { window.localStorage.setItem(ns(key), value); } catch { /* private mode etc. */ }
}

export const Storage = {
  getBest(): number {
    const v = Number(get(STORAGE_KEYS.BEST));
    return Number.isFinite(v) ? v : 0;
  },
  /** Saves if higher; returns true if it was a new best. */
  submitScore(score: number): boolean {
    if (score > Storage.getBest()) { set(STORAGE_KEYS.BEST, String(Math.floor(score))); return true; }
    return false;
  },
  getTutorialSeen(id = ''): boolean { return get('playroom.tut.' + id) === '1'; },
  setTutorialSeen(id = ''): void { set('playroom.tut.' + id, '1'); },
  /** number of levels beaten (in order) */
  getBeaten(): number { const v = Number(get('playroom.beaten')); return Number.isFinite(v) ? v : 0; },
  setBeaten(n: number): void { if (n > Storage.getBeaten()) set('playroom.beaten', String(n)); },
  getLevelBest(id: string): number { const v = Number(get('playroom.best.' + id)); return Number.isFinite(v) ? v : 0; },
  submitLevel(id: string, score: number): boolean { if (score > Storage.getLevelBest(id)) { set('playroom.best.' + id, String(Math.floor(score))); return true; } return false; },
  getMuted(): boolean { return get(STORAGE_KEYS.MUTE) === '1'; },
  setMuted(m: boolean): void { set(STORAGE_KEYS.MUTE, m ? '1' : '0'); },
};
