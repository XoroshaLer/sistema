import { blockOf, planFor, type Day } from './data/program';
import { programWeek, today } from './lib/dates';
import { getData, normalize, replaceData, uid, update, type CardioKind, type Profile, type Session, type Settings, type WeekCheck } from './store';

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

export function startSession(day: Day): string {
  const id = uid();
  const date = today();
  const week = weekFor(date);
  const block = blockOf(week);
  update((d) => {
    d.sessions.push({
      id,
      date,
      week,
      block,
      day,
      startedAt: Date.now(),
      cursor: 0,
      exercises: planFor(block, day).map((e) => ({ exId: e.id, sets: [] })),
    });
    d.activeId = id;
  });
  return id;
}

export function logSet(id: string, exIndex: number, set: { w: number; r: number; rir: number }, restSec: number) {
  withSession(id, (s) => {
    const e = s.exercises[exIndex];
    e.sets.push({ ...set, t: Date.now() });
    e.skipped = false;
    s.restEndsAt = Date.now() + restSec * 1000;
  });
}

export function deleteSet(id: string, exIndex: number, setIndex: number) {
  withSession(id, (s) => {
    s.exercises[exIndex].sets.splice(setIndex, 1);
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

export function setProtein(date: string, n: number) {
  update((d) => {
    d.protein[date] = n;
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
