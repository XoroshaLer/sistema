import { EX, blockOf, type Block, type Day, type PlanItem } from './data/program';
import { programWeek, today } from './lib/dates';
import { dayPlan, planKey, planOf, type Plan } from './lib/logic';
import {
  getData,
  normalize,
  replaceData,
  uid,
  update,
  type AppData,
  type CardioKind,
  type FoodPreset,
  type Meal,
  type Profile,
  type Routine,
  type Session,
  type Settings,
  type WeekCheck,
} from './store';

/** What the workout editor edits: a program day or one of the user's own workouts. */
export type PlanTarget = { type: 'day'; block: Block; day: Day } | { type: 'routine'; id: string };

export function weekFor(date: string): number {
  const p = getData().profile;
  return p ? programWeek(p.startDate, date) : 1;
}

function withSession(id: string, fn: (s: Session) => void) {
  update((d) => {
    const s = d.sessions.find((x) => x.id === id);
    if (s) fn(s);
  });
}

function toLog({ exId, ...plan }: PlanItem) {
  return { exId, sets: [], plan };
}

/** Starts a program day this week, using the day's edited exercises if there are any. */
export function startSession(day: Day): string {
  const week = weekFor(today());
  return startPlan({ type: 'day', block: blockOf(week), day });
}

export function startPlan(target: PlanTarget): string {
  const id = uid();
  const date = today();
  const week = weekFor(date);
  const data = getData();
  const routine = target.type === 'routine' ? data.routines.find((r) => r.id === target.id) : undefined;
  const block = target.type === 'day' ? target.block : blockOf(week);
  const items = target.type === 'day' ? dayPlan(data, target.block, target.day) : routine?.items ?? [];
  const session: Session = {
    id,
    date,
    week,
    block,
    startedAt: Date.now(),
    cursor: 0,
    exercises: items.map(toLog),
    ...(target.type === 'day' ? { day: target.day } : { routineId: routine?.id, title: routine?.name, photo: routine?.photo }),
  };
  update((d) => {
    d.sessions.push(session);
    d.activeId = id;
  });
  return id;
}

/** Records one set, or one side of it; rest starts once the whole set is done. */
export function logSet(id: string, exIndex: number, set: { w: number; r: number; rir: number; side?: 'L' | 'R' }, restSec: number) {
  withSession(id, (s) => {
    const e = s.exercises[exIndex];
    e.sets.push({ ...set, t: Date.now() });
    e.skipped = false;
    if (set.side !== 'L') s.restEndsAt = Date.now() + restSec * 1000;
  });
}

export function deleteSets(id: string, exIndex: number, indexes: number[]) {
  withSession(id, (s) => {
    const sets = s.exercises[exIndex].sets;
    for (const i of [...indexes].sort((a, b) => b - a)) sets.splice(i, 1);
  });
}

export function setSessionPlan(id: string, exIndex: number, patch: Partial<Plan>) {
  withSession(id, (s) => {
    const e = s.exercises[exIndex];
    e.plan = { ...planOf(e), ...patch };
  });
}

/**
 * Swaps the exercise in a running workout. An exercise that already has sets stays in the log
 * and the new one is inserted after it. `everywhere` also updates the day or own workout it came from.
 */
export function replaceInSession(id: string, exIndex: number, exId: string, everywhere: boolean) {
  update((d) => {
    const s = d.sessions.find((x) => x.id === id);
    if (!s) return;
    const old = s.exercises[exIndex];
    const plan = { ...planOf(old), perSide: !!EX(exId)?.per };
    if (old.sets.length) {
      s.exercises.splice(exIndex + 1, 0, { exId, sets: [], plan: { ...plan } });
      s.cursor = exIndex + 1;
    } else {
      s.exercises[exIndex] = { exId, sets: [], plan: { ...plan } };
    }
    if (!everywhere) return;
    const items = s.routineId ? d.routines.find((r) => r.id === s.routineId)?.items : s.day ? (d.plans[planKey(s.block, s.day)] ??= dayPlan(d, s.block, s.day)) : undefined;
    const slot = items?.find((it) => it.exId === old.exId);
    if (slot) Object.assign(slot, { exId, perSide: plan.perSide });
  });
}

export function itemsFor(d: AppData, target: PlanTarget): PlanItem[] {
  if (target.type === 'day') return dayPlan(d, target.block, target.day);
  return d.routines.find((r) => r.id === target.id)?.items ?? [];
}

export function setItems(target: PlanTarget, items: PlanItem[]) {
  update((d) => {
    if (target.type === 'day') d.plans[planKey(target.block, target.day)] = items;
    else {
      const r = d.routines.find((x) => x.id === target.id);
      if (r) r.items = items;
    }
  });
}

export function resetDay(block: Block, day: Day) {
  update((d) => {
    delete d.plans[planKey(block, day)];
  });
}

export function createRoutine(): string {
  const id = uid();
  update((d) => {
    d.routines.push({ id, name: 'Домашний комплекс', photo: 'D', items: [] });
  });
  return id;
}

export function updateRoutine(id: string, patch: Partial<Omit<Routine, 'id'>>) {
  update((d) => {
    const r = d.routines.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
  });
}

export function deleteRoutine(id: string) {
  update((d) => {
    d.routines = d.routines.filter((r) => r.id !== id);
  });
}

/** Adds the user's own exercise to the library and returns its id. */
export function createExercise(name: string): string {
  const id = `my-${uid()}`;
  update((d) => {
    d.customExercises.push({ id, name: name.trim() });
  });
  return id;
}

export function addFood(date: string, meal: Meal, name: string, protein: number, kcal: number) {
  update((d) => {
    (d.food[date] ??= []).push({ id: uid(), meal, name, protein: Math.round(protein * 10) / 10, kcal: Math.round(kcal), t: Date.now() });
  });
}

export function deleteFood(date: string, id: string) {
  update((d) => {
    d.food[date] = (d.food[date] ?? []).filter((f) => f.id !== id);
  });
}

export function addFoodPreset(p: Omit<FoodPreset, 'id'>) {
  update((d) => {
    d.foodPresets.push({ ...p, id: uid() });
  });
}

export function deleteFoodPreset(id: string) {
  update((d) => {
    d.foodPresets = d.foodPresets.filter((p) => p.id !== id);
  });
}

export function setCursor(id: string, i: number) {
  withSession(id, (s) => {
    s.cursor = Math.max(0, Math.min(s.exercises.length - 1, i));
  });
}

export function setExNote(id: string, exIndex: number, note: string) {
  withSession(id, (s) => {
    s.exercises[exIndex].note = note.trim() || undefined;
  });
}

export function skipExercise(id: string, exIndex: number) {
  withSession(id, (s) => {
    s.exercises[exIndex].skipped = true;
    if (exIndex < s.exercises.length - 1) s.cursor = exIndex + 1;
  });
}

export function finishSession(id: string) {
  update((d) => {
    const s = d.sessions.find((x) => x.id === id);
    if (s) {
      s.finishedAt = Date.now();
      s.restEndsAt = undefined;
    }
    if (d.activeId === id) d.activeId = undefined;
  });
}

export function deleteSession(id: string) {
  update((d) => {
    d.sessions = d.sessions.filter((s) => s.id !== id);
    if (d.activeId === id) d.activeId = undefined;
  });
}

export function addCardio(kind: CardioKind, minutes: number, date = today()) {
  const week = weekFor(date);
  update((d) => {
    d.cardio.push({ id: uid(), date, week, kind, minutes });
  });
}

export function deleteCardio(id: string) {
  update((d) => {
    d.cardio = d.cardio.filter((c) => c.id !== id);
  });
}

export function saveWeek(check: WeekCheck) {
  update((d) => {
    d.weeks[String(check.week)] = check;
  });
}

export function setProfile(p: Profile) {
  update((d) => {
    d.profile = p;
  });
}

export function setSettings(patch: Partial<Settings>) {
  update((d) => {
    d.settings = { ...d.settings, ...patch };
  });
}

export function markBackup() {
  update((d) => {
    d.lastBackup = Date.now();
  });
}

/** Saves the backup through the iOS share sheet (→ «Сохранить в Файлы»), or as a download elsewhere. */
export async function exportData(): Promise<'saved' | 'cancelled'> {
  const name = `sistema-${today()}.json`;
  const file = new File([JSON.stringify(getData(), null, 2)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Система — резервная копия' });
      markBackup();
      return 'saved';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  markBackup();
  return 'saved';
}

export async function importData(file: File): Promise<boolean> {
  try {
    const d = normalize(JSON.parse(await file.text()));
    if (!d) return false;
    replaceData(d);
    return true;
  } catch {
    return false;
  }
}
