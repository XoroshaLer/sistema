// All data lives in one JSON document in localStorage. The same document is the backup file.

import { useSyncExternalStore } from 'react';
import { setCustomExercises, type Block, type Day, type PlanItem } from './data/program';
import { normalizeFinance, type Finance } from './finance/types';

export interface SetLog {
  w: number;
  r: number;
  rir: number;
  t: number;
  /** Set on one-side sets; a left and the following right entry make one set. */
  side?: 'L' | 'R';
}

export interface ExLog {
  exId: string;
  sets: SetLog[];
  note?: string;
  skipped?: boolean;
  /** How this exercise was planned when the workout started. Missing on early sessions. */
  plan?: Omit<PlanItem, 'exId'>;
}

export interface Session {
  id: string;
  date: string;
  week: number;
  block: Block;
  /** Program day; missing for the user's own workouts. */
  day?: Day;
  routineId?: string;
  title?: string;
  photo?: Day;
  startedAt: number;
  finishedAt?: number;
  cursor: number;
  restEndsAt?: number;
  exercises: ExLog[];
}

export type CardioKind = 'afterB' | 'afterD' | 'walk' | 'other';

export interface Cardio {
  id: string;
  date: string;
  week: number;
  kind: CardioKind;
  minutes: number;
}

export interface WeekCheck {
  week: number;
  date: string;
  weight?: number;
  waist?: number;
  hips?: number;
  thigh?: number;
  sleep?: number;
  energy?: number;
  edema?: number;
  note?: string;
}

export interface Settings {
  restMain: number;
  restOther: number;
  sound: boolean;
  /** Daily protein goal in grams per kilogram of body weight. */
  proteinPerKg: number;
  /** Body weight for the protein goal until a weekly check-in has one. */
  bodyWeight?: number;
  /** For the calorie estimate (Mifflin–St Jeor). */
  heightCm?: number;
  age?: number;
  sex: 'f' | 'm';
  /** Activity multiplier for maintenance calories. */
  activity: number;
  /** Planned calorie deficit, % below maintenance. */
  deficitPct: number;
  /** Own calorie goal; replaces the estimate when set. */
  kcalManual?: number;
  /** Module opened last. */
  module?: 'training' | 'finance';
}

export interface CustomExercise {
  id: string;
  name: string;
}

export interface Routine {
  id: string;
  name: string;
  photo: Day;
  items: PlanItem[];
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  meal: Meal;
  name: string;
  protein: number;
  /** Missing on entries made before calories were tracked. */
  kcal?: number;
  t: number;
}

export interface FoodPreset {
  id: string;
  name: string;
  /** 'шт': `per` and `kcal` are per piece; 'г': per 100 g. */
  unit: 'шт' | 'г';
  per: number;
  kcal?: number;
  portion: number;
}

export interface Profile {
  name: string;
  startDate: string;
}

export interface AppData {
  v: 1;
  profile?: Profile;
  sessions: Session[];
  cardio: Cardio[];
  weeks: Record<string, WeekCheck>;
  /** Old «белок в каждом приёме» counter (0–3 meals); replaced by `food`. */
  protein: Record<string, number>;
  settings: Settings;
  activeId?: string;
  lastBackup?: number;
  /** Edited program days, keyed `${block}${day}` ('1D'); missing = as in the program. */
  plans: Record<string, PlanItem[]>;
  routines: Routine[];
  customExercises: CustomExercise[];
  food: Record<string, FoodEntry[]>;
  foodPresets: FoodPreset[];
  /** Created when the finance module is first opened. */
  finance?: Finance;
}

const KEY = 'sistema.v1';
export const DEFAULT_SETTINGS: Settings = {
  restMain: 150,
  restOther: 90,
  sound: true,
  proteinPerKg: 1.6,
  sex: 'f',
  activity: 1.55,
  deficitPct: 10,
};

function empty(): AppData {
  return {
    v: 1,
    sessions: [],
    cardio: [],
    weeks: {},
    protein: {},
    settings: { ...DEFAULT_SETTINGS },
    plans: {},
    routines: [],
    customExercises: [],
    food: {},
    foodPresets: [],
  };
}

/** Accepts parsed JSON from storage or a backup file; returns null when it is not our data. */
export function normalize(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<AppData>;
  if (r.v !== 1 || !Array.isArray(r.sessions) || !Array.isArray(r.cardio)) return null;
  // Fields added in later versions get their defaults, so older backups and phones keep working.
  const base = empty();
  return {
    ...base,
    ...r,
    v: 1,
    weeks: r.weeks ?? {},
    protein: r.protein ?? {},
    settings: { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) },
    plans: r.plans ?? {},
    routines: r.routines ?? [],
    customExercises: r.customExercises ?? [],
    food: r.food ?? {},
    foodPresets: r.foodPresets ?? [],
    finance: r.finance ? normalizeFinance(r.finance) : undefined,
  } as AppData;
}

function load(): AppData {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const d = normalize(JSON.parse(s));
      if (d) return d;
    }
  } catch {
    // Unreadable storage: start empty rather than crash.
  }
  return empty();
}

let state = load();
setCustomExercises(state.customExercises);
const listeners = new Set<() => void>();

function persist() {
  setCustomExercises(state.customExercises);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked; the in-memory state still works for this visit.
  }
}

function emit() {
  for (const l of listeners) l();
}

export function getData(): AppData {
  return state;
}

export function update(fn: (draft: AppData) => void) {
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  persist();
  emit();
}

export function replaceData(d: AppData) {
  state = d;
  persist();
  emit();
}

export function resetData() {
  state = empty();
  persist();
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData);
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Ask the browser not to evict our data under storage pressure.
navigator.storage?.persist?.().catch(() => undefined);
