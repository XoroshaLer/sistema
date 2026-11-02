// Self-education data shapes and defaults; kept free of store imports so store.ts can use them.

/** One «что нового узнала» entry about programming. */
export interface Note {
  id: string;
  date: string;
  text: string;
  topic?: string;
  /** Link or book the knowledge came from. */
  source?: string;
  minutes?: number;
  t: number;
}

export type BookStatus = 'reading' | 'done' | 'want';

export interface Book {
  id: string;
  title: string;
  author?: string;
  /** Pages in the book. */
  pages: number;
  /** Only fiction counts towards the daily page norm. */
  fiction: boolean;
  status: BookStatus;
  /** Page she stopped at. */
  page: number;
  addedAt: number;
  finishedOn?: string;
  rating?: number;
  review?: string;
}

/** Pages read in one sitting: the book moved from `to - pages` to `to`. */
export interface ReadLog {
  id: string;
  bookId: string;
  date: string;
  pages: number;
  to: number;
  t: number;
}

/** A thought or a quote about a book. */
export interface Thought {
  id: string;
  bookId: string;
  date: string;
  page?: number;
  text: string;
}

export interface Learning {
  notes: Note[];
  books: Book[];
  reads: ReadLog[];
  thoughts: Thought[];
  /** Daily minimum of fiction pages. */
  pagesGoal: number;
}

export const LEARN_XP = { note: 15, pages: 15, book: 50 };

export function emptyLearning(): Learning {
  return { notes: [], books: [], reads: [], thoughts: [], pagesGoal: 30 };
}

export function normalizeLearning(raw: Partial<Learning>): Learning {
  return { ...emptyLearning(), ...raw };
}
