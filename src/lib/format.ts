import type { Exercise } from '../data/program';

export function num(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

export function parseNum(s: string): number | undefined {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

interface WR {
  w: number;
  r: number;
}

export function setText(s: WR, ex: Exercise): string {
  if (ex.assisted) return `помощь ${num(s.w)} кг × ${s.r}`;
  if (s.w === 0) return `вес тела × ${s.r}`;
  return `${num(s.w)} кг × ${s.r}`;
}

/** '12 кг × 11 · 10 · 10' when the weight did not change, otherwise each set in full. */
export function setsText(sets: WR[], ex: Exercise): string {
  if (!sets.length) return '';
  if (sets.every((s) => s.w === sets[0].w)) {
    return [setText(sets[0], ex), ...sets.slice(1).map((s) => String(s.r))].join(' · ');
  }
  return sets.map((s) => `${num(s.w)} × ${s.r}`).join(' · ');
}

/** '8–12 / нога' from a plan slot, naming the side the program uses for one-side exercises. */
export function repsText(plan: { repMin: number; repMax: number; perSide?: boolean }, ex?: Exercise): string {
  const range = plan.repMin === plan.repMax ? String(plan.repMin) : `${plan.repMin}–${plan.repMax}`;
  const per = ex?.per ?? (plan.perSide ? 'сторона' : undefined);
  return `${range}${per ? ` / ${per}` : ''}`;
}

export function rirText(rir: number): string {
  return rir >= 4 ? '4+' : String(rir);
}

export function clock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
