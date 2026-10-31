// All data lives in one JSON document in localStorage. The same document is the backup file.

import { useSyncExternalStore } from 'react';
import type { Block, Day } from './data/program';

export interface SetLog {
  w: number;
  r: number;
  rir: number;
  t: number;
}

export interface ExLog {
  exId: string;
  sets: SetLog[];
  note?: string;
  skipped?: boolean;
}

export interface Session {
  id: string;
  date: string;
  week: number;
  block: Block;
  day: Day;
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
  protein: Record<string, number>;
  settings: Settings;
  activeId?: string;
  lastBackup?: number;
}

const KEY = 'sistema.v1';
export const DEFAULT_SETTINGS: Settings = { restMain: 150, restOther: 90, sound: true };

function empty(): AppData {
  return { v: 1, sessions: [], cardio: [], weeks: {}, protein: {}, settings: { ...DEFAULT_SETTINGS } };
}

/** Accepts parsed JSON from storage or a backup file; returns null when it is not our data. */
export function normalize(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<AppData>;
  if (r.v !== 1 || !Array.isArray(r.sessions) || !Array.isArray(r.cardio)) return null;
  return {
    ...empty(),
    ...r,
    v: 1,
    weeks: r.weeks ?? {},
    protein: r.protein ?? {},
    settings: { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) },
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
const listeners = new Set<() => void>();

function persist() {
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
