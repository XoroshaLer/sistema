// Dates are stored as local 'YYYY-MM-DD' strings so a workout logged at 23:30 stays on that day.

import { TOTAL_WEEKS } from '../data/program';

const pad = (n: number) => String(n).padStart(2, '0');

export function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return iso(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function mondayOf(s: string): string {
  const d = parse(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}

/** Week number from the start date; can be < 1 before the start or > 16 after the end. */
export function rawWeek(start: string, date: string): number {
  return Math.floor(daysBetween(start, date) / 7) + 1;
}

export function programWeek(start: string, date: string): number {
  return Math.min(TOTAL_WEEKS, Math.max(1, rawWeek(start, date)));
}

export function weekday(s: string): number {
  return parse(s).getDay();
}

export const WD_SHORT = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
export const WD_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTH_SHORT = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЯ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
const MONTH_NAME = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/** 'СБ · 31 ОКТ' */
export function fmtDay(s: string): string {
  const d = parse(s);
  return `${WD_SHORT[d.getDay()]} · ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

/** '31 ОКТ' */
export function fmtShort(s: string): string {
  const d = parse(s);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function fmtMonth(s: string): string {
  const d = parse(s);
  return `${MONTH_NAME[d.getMonth()]} ${d.getFullYear()}`;
}

export function dayOfMonth(s: string): number {
  return parse(s).getDate();
}
