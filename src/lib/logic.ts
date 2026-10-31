// Derived numbers: records, XP, levels and stats are always recomputed from the log,
// so editing or deleting an entry never leaves the score out of sync.

import { DAYS, EX, type Day, type Exercise } from '../data/program';
import type { AppData, Session, SetLog } from '../store';

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

export const XP = { set: 3, exercise: 10, pr: 20, workout: 50, cardioCap: 60, protein: 10, week: 30 };

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
    const ex = EX(e.exId);
    if (!ex || !e.sets.length) continue;
    xp += e.sets.length * XP.set;
    if (e.sets.length >= ex.sets) xp += XP.exercise;
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
  for (const n of Object.values(data.protein)) if (n >= 3) xp += XP.protein;
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

export function doneDays(data: AppData, week: number): Set<Day> {
  return new Set(data.sessions.filter((s) => s.week === week && s.finishedAt).map((s) => s.day));
}

export function nextDay(data: AppData, week: number): Day | undefined {
  const done = doneDays(data, week);
  return DAYS.find((d) => !done.has(d));
}

export function cardioWeek(data: AppData, week: number): number {
  return data.cardio.filter((c) => c.week === week).reduce((n, c) => n + c.minutes, 0);
}

/** 60 min in week 1, growing evenly to 150 min in week 16. */
export function cardioTarget(week: number): number {
  return 60 + Math.round((week - 1) * 6);
}

export function estimateMinutes(exs: Exercise[]): number {
  const sets = exs.reduce((n, e) => n + e.sets, 0);
  return Math.round((sets * 3.5 + 5) / 5) * 5;
}

export function estimateXp(exs: Exercise[]): number {
  return exs.reduce((n, e) => n + e.sets * XP.set + XP.exercise, 0) + XP.workout;
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
