// Derived numbers: records, XP, levels and stats are always recomputed from the log,
// so editing or deleting an entry never leaves the score out of sync.

import { DAYS, DAY_TITLE, EX, defaultPlan, type Block, type Day, type Exercise, type PlanItem } from '../data/program';
import type { AppData, ExLog, Session, SetLog } from '../store';

interface WR {
  w: number;
  r: number;
}

export function better(a: WR, b: WR, ex: Exercise): boolean {
  if (a.w !== b.w) return ex.assisted ? a.w < b.w : a.w > b.w;
  return a.r > b.r;
}

export function bestOf<T extends WR>(sets: T[], ex: Exercise): T | undefined {
  let best: T | undefined;
  for (const s of sets) if (!best || better(s, best, ex)) best = s;
  return best;
}

export type Plan = Omit<PlanItem, 'exId'>;

export function planOf(e: ExLog): Plan {
  if (e.plan) return e.plan;
  const ex = EX(e.exId);
  return ex ? { sets: ex.sets, repMin: ex.repMin, repMax: ex.repMax } : { sets: 2, repMin: 10, repMax: 12 };
}

/** Sets as the user sees them: a one-side left entry and the right entry after it form one set. */
export interface SetGroup {
  both?: SetLog;
  L?: SetLog;
  R?: SetLog;
  /** Positions in ExLog.sets, for deleting the whole set. */
  idx: number[];
}

export function groupSets(sets: SetLog[]): SetGroup[] {
  const out: SetGroup[] = [];
  sets.forEach((s, i) => {
    const last = out[out.length - 1];
    if (!s.side) out.push({ both: s, idx: [i] });
    else if (s.side === 'R' && last && last.L && !last.R) {
      last.R = s;
      last.idx.push(i);
    } else out.push({ [s.side]: s, idx: [i] });
  });
  return out;
}

export function isComplete(g: SetGroup): boolean {
  return !!(g.both || (g.L && g.R));
}

export function setCount(sets: SetLog[]): number {
  return groupSets(sets).length;
}

export function sortedSessions(data: AppData): Session[] {
  return [...data.sessions].sort((a, b) => a.startedAt - b.startedAt);
}

/** The latest earlier session that has sets for this exercise. */
export function previousFor(data: AppData, exId: string, before: number): { session: Session; sets: SetLog[] } | undefined {
  let found: { session: Session; sets: SetLog[] } | undefined;
  for (const s of sortedSessions(data)) {
    if (s.startedAt >= before) break;
    const e = s.exercises.find((x) => x.exId === exId && x.sets.length);
    if (e) found = { session: s, sets: e.sets };
  }
  return found;
}

/** Best set for this exercise across all sessions that started before `before`. */
export function recordBefore(data: AppData, exId: string, before: number): SetLog | undefined {
  const ex = EX(exId);
  if (!ex) return undefined;
  let best: SetLog | undefined;
  for (const s of data.sessions) {
    if (s.startedAt >= before) continue;
    const e = s.exercises.find((x) => x.exId === exId);
    const top = e && bestOf(e.sets, ex);
    if (top && (!best || better(top, best, ex))) best = top;
  }
  return best;
}

export const needFor = (level: number) => 150 + 50 * level;

export const XP = { set: 3, exercise: 10, pr: 20, workout: 50, cardioCap: 60, protein: 10, kcal: 10, week: 30 };

export interface Analysis {
  /** `${sessionId}:${exId}` for every session where the exercise beat its earlier record. */
  prs: Set<string>;
  best: Map<string, SetLog>;
  first: Map<string, { set: SetLog; week: number }>;
  xp: number;
  level: number;
  inLevel: number;
  need: number;
  prCount: number;
  cardioMin: number;
  finished: number;
  stats: { str: number; end: number; dis: number };
}

export function sessionXp(s: Session, prs: Set<string>): number {
  let xp = 0;
  for (const e of s.exercises) {
    if (!EX(e.exId) || !e.sets.length) continue;
    const n = setCount(e.sets);
    xp += n * XP.set;
    if (n >= planOf(e).sets) xp += XP.exercise;
    if (prs.has(`${s.id}:${e.exId}`)) xp += XP.pr;
  }
  if (s.finishedAt) xp += XP.workout;
  return xp;
}

export function analyze(data: AppData): Analysis {
  const prs = new Set<string>();
  const best = new Map<string, SetLog>();
  const first = new Map<string, { set: SetLog; week: number }>();
  let xp = 0;
  let finished = 0;

  for (const s of sortedSessions(data)) {
    for (const e of s.exercises) {
      const ex = EX(e.exId);
      const top = ex && bestOf(e.sets, ex);
      if (!ex || !top) continue;
      const prev = best.get(e.exId);
      if (!first.has(e.exId)) first.set(e.exId, { set: top, week: s.week });
      if (prev && better(top, prev, ex)) prs.add(`${s.id}:${e.exId}`);
      if (!prev || better(top, prev, ex)) best.set(e.exId, top);
    }
    xp += sessionXp(s, prs);
    if (s.finishedAt) finished++;
  }

  let cardioMin = 0;
  for (const c of data.cardio) {
    cardioMin += c.minutes;
    xp += Math.min(XP.cardioCap, c.minutes);
  }

  const target = proteinTarget(data).target;
  const kcalGoal = kcalTarget(data).target;
  for (const [date, list] of Object.entries(data.food)) {
    if (list.reduce((n, f) => n + f.protein, 0) >= target) xp += XP.protein;
    else if ((data.protein[date] ?? 0) >= 3) xp += XP.protein;
    if (kcalGoal && kcalOnTarget(list.reduce((n, f) => n + (f.kcal ?? 0), 0), kcalGoal)) xp += XP.kcal;
  }
  for (const [date, n] of Object.entries(data.protein)) if (n >= 3 && !data.food[date]) xp += XP.protein;
  xp += Object.keys(data.weeks).length * XP.week;

  let level = 1;
  let rest = xp;
  while (rest >= needFor(level)) {
    rest -= needFor(level);
    level++;
  }

  return {
    prs,
    best,
    first,
    xp,
    level,
    inLevel: rest,
    need: needFor(level),
    prCount: prs.size,
    cardioMin,
    finished,
    stats: { str: 10 + prs.size, end: 10 + Math.floor(cardioMin / 30), dis: 10 + finished },
  };
}

/** Program days finished this week; the user's own workouts do not count here. */
export function doneDays(data: AppData, week: number): Set<Day> {
  const out = new Set<Day>();
  for (const s of data.sessions) if (s.week === week && s.finishedAt && s.day && !s.routineId) out.add(s.day);
  return out;
}

export function nextDay(data: AppData, week: number): Day | undefined {
  const done = doneDays(data, week);
  return DAYS.find((d) => !done.has(d));
}

export function planKey(block: Block, day: Day): string {
  return `${block}${day}`;
}

/** The day's exercises as the user edited them, or as in the program. */
export function dayPlan(data: AppData, block: Block, day: Day): PlanItem[] {
  return data.plans[planKey(block, day)] ?? defaultPlan(block, day);
}

export function sessionTitle(s: Session): string {
  return s.day && !s.routineId ? `Тренировка ${s.day} · ${DAY_TITLE[s.day].toLowerCase()}` : s.title ?? 'Своя тренировка';
}

export function sessionLetter(s: Session): string {
  return s.day && !s.routineId ? s.day : (s.title ?? '+').charAt(0).toUpperCase();
}

export function sessionPhoto(s: Session): Day {
  return s.photo ?? s.day ?? 'C';
}

export function cardioWeek(data: AppData, week: number): number {
  return data.cardio.filter((c) => c.week === week).reduce((n, c) => n + c.minutes, 0);
}

/** 60 min in week 1, growing evenly to 150 min in week 16. */
export function cardioTarget(week: number): number {
  return 60 + Math.round((week - 1) * 6);
}

export function estimateMinutes(items: PlanItem[]): number {
  const sets = items.reduce((n, e) => n + e.sets * (e.perSide ? 1.6 : 1), 0);
  return Math.round((sets * 3.5 + 5) / 5) * 5;
}

export function estimateXp(items: PlanItem[]): number {
  return items.reduce((n, e) => n + e.sets * XP.set + XP.exercise, 0) + XP.workout;
}

/** Best set per program week for one exercise. */
export function weeklyBest(data: AppData, exId: string): { week: number; set: SetLog }[] {
  const ex = EX(exId);
  if (!ex) return [];
  const byWeek = new Map<number, SetLog>();
  for (const s of data.sessions) {
    const e = s.exercises.find((x) => x.exId === exId);
    const top = e && bestOf(e.sets, ex);
    if (!top) continue;
    const cur = byWeek.get(s.week);
    if (!cur || better(top, cur, ex)) byWeek.set(s.week, top);
  }
  return [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([week, set]) => ({ week, set }));
}

export function latestWeight(data: AppData): number | undefined {
  const withWeight = Object.values(data.weeks).filter((w) => w.weight).sort((a, b) => b.week - a.week);
  return withWeight[0]?.weight ?? data.settings.bodyWeight;
}

/** Daily protein goal: the chosen g/kg × body weight; 1.4–2.0 g/kg is the range from the program. */
export function proteinTarget(data: AppData): { target: number; lo?: number; hi?: number; weight?: number } {
  const weight = latestWeight(data);
  if (!weight) return { target: 100 };
  return {
    target: Math.round(weight * data.settings.proteinPerKg),
    lo: Math.round(weight * 1.4),
    hi: Math.round(weight * 2),
    weight,
  };
}

export function proteinOn(data: AppData, date: string): number {
  return Math.round((data.food[date] ?? []).reduce((n, f) => n + f.protein, 0));
}

export function kcalOn(data: AppData, date: string): number {
  return Math.round((data.food[date] ?? []).reduce((n, f) => n + (f.kcal ?? 0), 0));
}

const round10 = (n: number) => Math.round(n / 10) * 10;

/**
 * Daily calories: maintenance by Mifflin–St Jeor × activity, minus the chosen deficit.
 * Undefined until weight, height and age are known (or an own goal is set).
 */
export function kcalTarget(data: AppData): { target?: number; maintenance?: number; manual?: boolean } {
  const s = data.settings;
  if (s.kcalManual) return { target: s.kcalManual, manual: true };
  const weight = latestWeight(data);
  if (!weight || !s.heightCm || !s.age) return {};
  const bmr = 10 * weight + 6.25 * s.heightCm - 5 * s.age + (s.sex === 'm' ? 5 : -161);
  const maintenance = round10(bmr * s.activity);
  return { maintenance, target: round10(maintenance * (1 - s.deficitPct / 100)) };
}

/** A logged day counts as on target within 90–105% of the calorie goal. */
export function kcalOnTarget(kcal: number, target: number): boolean {
  return kcal >= target * 0.9 && kcal <= target * 1.05;
}
