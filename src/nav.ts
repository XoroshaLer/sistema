import type { PlanTarget } from './actions';
import type { CardioKind } from './store';

export type Tab = 'status' | 'workout' | 'progress' | 'journal';
export type Module = 'training' | 'finance';
export type FinTab = 'overview' | 'budget' | 'goals' | 'spend';
export type FinForm = 'source' | 'obligation' | 'debt' | 'goal' | 'income' | 'task' | 'settings';

export type SheetState =
  | { type: 'settings' }
  | { type: 'add' }
  /** Food log of a day; today when no date. */
  | { type: 'food'; date?: string }
  | { type: 'cardio'; kind?: CardioKind }
  | { type: 'week'; week: number }
  | { type: 'note'; sessionId: string; exIndex: number }
  | { type: 'picker'; ids: string[]; onPick: (id: string) => void }
  /** The whole exercise library with search and «create your own». */
  | { type: 'library'; title: string; onPick: (id: string) => void }
  /** One exercise slot in the workout editor. */
  | { type: 'item'; target: PlanTarget; index: number }
  /** Swapping an exercise during a workout: just today, or from now on. */
  | { type: 'replace'; sessionId: string; exIndex: number; exId: string }
  | { type: 'confirm'; title: string; text: string; action: string; danger?: boolean; onConfirm: () => void }
  /** Finance forms; `id` edits an existing item, `name` pre-fills a new one. */
  | { type: 'fin'; form: FinForm; id?: string; name?: string };

export interface Nav {
  go: (tab: Tab) => void;
  open: (sheet: SheetState) => void;
  toast: (title: string, text?: string) => void;
  /** Shows the summary of a workout that was just finished. */
  finished: (sessionId: string) => void;
  /** Opens the workout editor; null closes it. */
  edit: (target: PlanTarget | null) => void;
  /** Opens the side menu with the modules. */
  menu: () => void;
  switchModule: (m: Module) => void;
  goFin: (tab: FinTab) => void;
}
