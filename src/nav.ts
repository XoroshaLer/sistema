import type { CardioKind } from './store';

export type Tab = 'status' | 'workout' | 'progress' | 'journal';

export type SheetState =
  | { type: 'settings' }
  | { type: 'add' }
  | { type: 'cardio'; kind?: CardioKind }
  | { type: 'week'; week: number }
  | { type: 'note'; sessionId: string; exIndex: number }
  | { type: 'picker'; ids: string[]; onPick: (id: string) => void }
  | { type: 'confirm'; title: string; text: string; action: string; danger?: boolean; onConfirm: () => void };

export interface Nav {
  go: (tab: Tab) => void;
  open: (sheet: SheetState) => void;
  toast: (title: string, text?: string) => void;
  /** Shows the summary of a workout that was just finished. */
  finished: (sessionId: string) => void;
}
