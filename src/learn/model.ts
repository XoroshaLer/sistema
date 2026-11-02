// Self-education: what she learned each day and the reading diary. Every number here is
// recomputed from the entries, like the rest of the System.

import { addDays, daysBetween, fmtShort, today } from '../lib/dates';
import { getData, uid, update, type AppData } from '../store';
import { LEARN_XP, emptyLearning, type Book, type Learning, type Note, type Thought } from './types';

export * from './types';

export function learningOf(data: AppData): Learning {
  return data.learning ?? emptyLearning();
}

function withLearning(fn: (l: Learning) => void) {
  update((d) => {
    if (!d.learning) d.learning = emptyLearning();
    fn(d.learning);
  });
}

const newest = <T extends { t: number }>(a: T, b: T) => b.t - a.t;

// ---------- notes ----------

export function saveNote(n: Omit<Note, 'id' | 't'> & { id?: string }) {
  withLearning((l) => {
    const i = n.id ? l.notes.findIndex((x) => x.id === n.id) : -1;
    if (i >= 0) l.notes[i] = { ...l.notes[i], ...n, id: l.notes[i].id };
    else l.notes.push({ ...n, id: uid(), t: Date.now() });
  });
}

export function deleteNote(id: string) {
  withLearning((l) => void (l.notes = l.notes.filter((x) => x.id !== id)));
}

export function notesOn(l: Learning, date: string): Note[] {
  return l.notes.filter((n) => n.date === date);
}

export function sortedNotes(l: Learning): Note[] {
  return [...l.notes].sort((a, b) => (a.date === b.date ? b.t - a.t : a.date < b.date ? 1 : -1));
}

/** Topics she used, the most frequent first. */
export function topicCounts(l: Learning): { topic: string; n: number }[] {
  const map = new Map<string, number>();
  for (const n of l.notes) if (n.topic) map.set(n.topic, (map.get(n.topic) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([topic, n]) => ({ topic, n }));
}

/** Days in a row with a note; today without a note yet does not break the series. */
export function streak(l: Learning): { current: number; best: number } {
  const days = new Set(l.notes.map((n) => n.date));
  const t = today();
  let current = 0;
  for (let d = days.has(t) ? t : addDays(t, -1); days.has(d); d = addDays(d, -1)) current++;
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of [...days].sort()) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best };
}

// ---------- books ----------

export function saveBook(b: Omit<Book, 'id' | 'addedAt'> & { id?: string }): string {
  const id = b.id ?? uid();
  withLearning((l) => {
    const i = l.books.findIndex((x) => x.id === id);
    if (i >= 0) l.books[i] = { ...l.books[i], ...b, id };
    else l.books.push({ ...b, id, addedAt: Date.now() });
  });
  return id;
}

export function deleteBook(id: string) {
  withLearning((l) => {
    l.books = l.books.filter((x) => x.id !== id);
    l.reads = l.reads.filter((x) => x.bookId !== id);
    l.thoughts = l.thoughts.filter((x) => x.bookId !== id);
  });
}

export function finishBook(id: string) {
  withLearning((l) => {
    const b = l.books.find((x) => x.id === id);
    if (!b) return;
    b.status = 'done';
    b.page = b.pages;
    b.finishedOn ??= today();
  });
}

/**
 * Moves the bookmark to `to`. Going forward logs the pages read today; going back
 * is a correction and takes pages back from today's entries of this book.
 */
export function logPages(bookId: string, to: number) {
  const date = today();
  withLearning((l) => {
    const b = l.books.find((x) => x.id === bookId);
    if (!b) return;
    const target = Math.max(0, Math.min(b.pages, Math.round(to)));
    const diff = target - b.page;
    if (diff > 0) l.reads.push({ id: uid(), bookId, date, pages: diff, to: target, t: Date.now() });
    else if (diff < 0) {
      let back = -diff;
      for (const r of [...l.reads].sort(newest)) {
        if (back <= 0) break;
        if (r.bookId !== bookId || r.date !== date) continue;
        const take = Math.min(back, r.pages);
        r.pages -= take;
        r.to = Math.min(r.to, target);
        back -= take;
      }
      l.reads = l.reads.filter((r) => r.pages > 0);
    }
    b.page = target;
    if (b.status === 'want' && target > 0) b.status = 'reading';
  });
}

export function addThought(bookId: string, text: string, page?: number) {
  withLearning((l) => void l.thoughts.push({ id: uid(), bookId, date: today(), page, text }));
}

export function deleteThought(id: string) {
  withLearning((l) => void (l.thoughts = l.thoughts.filter((x) => x.id !== id)));
}

export function thoughtsOf(l: Learning, bookId: string): Thought[] {
  return l.thoughts.filter((x) => x.bookId === bookId).reverse();
}

export function setPagesGoal(n: number) {
  withLearning((l) => void (l.pagesGoal = n));
}

/** Books she is reading, the one read most recently first. */
export function currentBooks(l: Learning): Book[] {
  const last = new Map<string, number>();
  for (const r of l.reads) last.set(r.bookId, Math.max(last.get(r.bookId) ?? 0, r.t));
  return l.books.filter((b) => b.status === 'reading').sort((a, b) => (last.get(b.id) ?? b.addedAt) - (last.get(a.id) ?? a.addedAt));
}

export function booksBy(l: Learning, status: Book['status']): Book[] {
  const list = l.books.filter((b) => b.status === status);
  if (status === 'done') return list.sort((a, b) => ((a.finishedOn ?? '') < (b.finishedOn ?? '') ? 1 : -1));
  if (status === 'reading') return currentBooks(l);
  return list.sort((a, b) => b.addedAt - a.addedAt);
}

/** Pages that count towards the norm (fiction) on a day. */
export function pagesOn(l: Learning, date: string): number {
  const fiction = new Set(l.books.filter((b) => b.fiction).map((b) => b.id));
  return l.reads.filter((r) => r.date === date && fiction.has(r.bookId)).reduce((n, r) => n + r.pages, 0);
}

/** Days between the first read of a book and the day she finished it. */
export function daysToRead(l: Learning, b: Book): number | undefined {
  const first = l.reads.filter((r) => r.bookId === b.id).map((r) => r.date).sort()[0];
  return first && b.finishedOn ? daysBetween(first, b.finishedOn) + 1 : undefined;
}

/**
 * Pages a day over the last week; a week that started with the first read counts
 * only from that day, so the first days are not divided by seven.
 */
export function pace(l: Learning, bookId?: string): number | undefined {
  const reads = l.reads.filter((r) => !bookId || r.bookId === bookId);
  const first = reads.map((r) => r.date).sort()[0];
  if (!first) return undefined;
  const t = today();
  const since = addDays(t, -6);
  const span = Math.min(7, daysBetween(first, t) + 1);
  return reads.filter((r) => r.date >= since).reduce((n, r) => n + r.pages, 0) / span;
}

/** '6 НОЯ' at this book's pace over the last week, or at the norm when there is none. */
export function finishForecast(l: Learning, b: Book): string | undefined {
  const left = b.pages - b.page;
  if (left <= 0) return undefined;
  const p = pace(l, b.id) || l.pagesGoal;
  return fmtShort(addDays(today(), Math.max(0, Math.ceil(left / p) - 1)));
}

export function readInYear(l: Learning, year: string): { books: number; pages: number } {
  const done = l.books.filter((b) => b.status === 'done' && b.finishedOn?.startsWith(year));
  return { books: done.length, pages: done.reduce((n, b) => n + b.pages, 0) };
}

// ---------- XP ----------

/** XP for days with a note and days with the page norm, plus finished books; `int` feeds the Интеллект stat. */
export function learnXp(l: Learning | undefined): { xp: number; int: number } {
  if (!l) return { xp: 0, int: 0 };
  const noteDays = new Set(l.notes.map((n) => n.date)).size;
  const normDays = [...new Set(l.reads.map((r) => r.date))].filter((d) => pagesOn(l, d) >= l.pagesGoal).length;
  const books = l.books.filter((b) => b.status === 'done').length;
  return {
    xp: noteDays * LEARN_XP.note + normDays * LEARN_XP.pages + books * LEARN_XP.book,
    int: Math.floor((noteDays + normDays) / 2) + books,
  };
}

/** Whether saving a note now completes today's quest (the first note of the day). */
export function firstNoteToday(): boolean {
  return !notesOn(learningOf(getData()), today()).length;
}
