// Hero photos per workout day (Unsplash, processed by scripts/process-photos.mjs).
import type { Day } from './data/program';
import dayA from './assets/photos/day-a.webp';
import dayB from './assets/photos/day-b.webp';
import dayC from './assets/photos/day-c.webp';
import dayD from './assets/photos/day-d.webp';

export const DAY_PHOTO: Record<Day, string> = { A: dayA, B: dayB, C: dayC, D: dayD };
