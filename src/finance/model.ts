// Finance module: data, monthly plan, debt payoff forecast and the month's tasks.
// Like the rest of the app, everything is derived from what the user entered — no bank connection.

import { addDays, today } from '../lib/dates';
import { getData, uid, update } from '../store';

export * from './types';
import { FIN_XP, emptyFinance, type Debt, type DebtOrder, type Finance, type FinTask, type Goal, type Income, type Obligation, type Strategy, type TaskKind } from './types';

// ---------- money and months ----------

export function rub(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

const r100 = (n: number) => Math.round(n / 100) * 100;
const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((n, x) => n + f(x), 0);

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function currentMonth(): string {
  return monthOf(today());
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function monthName(month: string, withYear = true): string {
  const [y, m] = month.split('-').map(Number);
  return withYear ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function dayIn(month: string, day: number): string {
  return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, '0')}`;
}

/** '15 ноября' */
export function fmtDue(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS_GEN[m - 1]}`;
}

export function daysLeftInMonth(date = today()): number {
  return daysInMonth(monthOf(date)) - Number(date.slice(8, 10)) + 1;
}

// ---------- monthly plan ----------

export interface Plan {
  month: string;
  base: number;
  extras: Income[];
  gross: number;
  tax: number;
  net: number;
  obligations: { o: Obligation; amount: number }[];
  minPayments: number;
  mandatory: number;
  free: number;
  extra: number;
  save: number;
  life: number;
  strategy: Strategy;
  /** Debt that gets the money above the minimums this month. */
  priority?: Debt;
  goalShares: { g: Goal; amount: number }[];
}

const SHARES: Record<Strategy, [number, number]> = { debt: [0.4, 0.1], balance: [0.25, 0.2], save: [0.1, 0.35] };

export function plannedBase(f: Finance, month: string): number {
  return f.months[month]?.baseIncome ?? sum(f.sources, (s) => s.amount);
}

function baseTaxRate(f: Finance): number {
  const total = sum(f.sources, (s) => s.amount);
  return total ? sum(f.sources, (s) => s.amount * s.taxRate) / total : f.sources[0]?.taxRate ?? 0;
}

export function activeDebts(f: Finance): Debt[] {
  return f.debts.filter((d) => d.balance > 0.5);
}

export function openGoals(f: Finance): Goal[] {
  return f.goals.filter((g) => g.saved < g.target);
}

export function priorityOrder(debts: Debt[], order: DebtOrder): Debt[] {
  return [...debts].sort((a, b) => (order === 'avalanche' ? b.rate - a.rate || a.balance - b.balance : a.balance - b.balance || b.rate - a.rate));
}

function monthsUntil(from: string, to: string): number {
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

/** Splits the month's savings between open goals: goals with a deadline get what keeps them on time. */
function splitSavings(goals: Goal[], amount: number, month: string): { g: Goal; amount: number }[] {
  if (!goals.length || amount <= 0) return [];
  const need = goals.map((g) => {
    const left = g.target - g.saved;
    const months = g.deadline ? Math.max(1, monthsUntil(month, g.deadline)) : 12;
    return Math.max(1, left / months);
  });
  const total = sum(need, (n) => n);
  let rest = amount;
  return goals.map((g, i) => {
    const share = i === goals.length - 1 ? rest : Math.min(rest, r100((amount * need[i]) / total));
    rest -= share;
    return { g, amount: Math.min(share, g.target - g.saved) };
  });
}

export function monthPlan(f: Finance, month: string, strategy: Strategy = f.months[month]?.strategy ?? f.strategy): Plan {
  const base = plannedBase(f, month);
  const extras = f.incomes.filter((i) => monthOf(i.date) === month);
  const gross = base + sum(extras, (i) => i.amount);
  const tax = Math.round(base * baseTaxRate(f) + sum(extras, (i) => i.amount * i.taxRate));
  const net = gross - tax;
  const obligations = f.obligations.map((o) => ({ o, amount: o.percent ? Math.round((net * o.percent) / 100) : o.amount }));
  const debts = activeDebts(f);
  const minPayments = sum(debts, (d) => Math.min(d.payment, d.balance));
  const mandatory = sum(obligations, (x) => x.amount) + minPayments;
  const free = Math.max(0, net - mandatory);
  const goals = openGoals(f);
  let [toDebt, toSave] = SHARES[strategy];
  if (!debts.length) [toDebt, toSave] = [0, toSave + toDebt];
  if (!goals.length) [toDebt, toSave] = debts.length ? [toDebt + toSave, 0] : [0, 0];
  const extra = r100(free * toDebt);
  const save = r100(free * toSave);
  return {
    month,
    base,
    extras,
    gross,
    tax,
    net,
    obligations,
    minPayments,
    mandatory,
    free,
    extra,
    save,
    life: free - extra - save,
    strategy,
    priority: priorityOrder(debts, f.order)[0],
    goalShares: splitSavings(goals, save, month),
  };
}

// ---------- forecasts ----------

export interface DebtForecast {
  /** Months from now until each debt is closed; missing = not within 50 years. */
  payoff: Record<string, number>;
  months?: number;
  interest: number;
}

/** Pays every minimum each month and sends the rest to the priority debt; a closed debt's payment rolls over. */
export function simulateDebts(debts: Debt[], monthly: number, order: DebtOrder): DebtForecast {
  const ds = debts.filter((d) => d.balance > 0.5).map((d) => ({ ...d, b: d.balance }));
  const payoff: Record<string, number> = {};
  let interest = 0;
  let m = 0;
  while (ds.some((d) => d.b > 0.5) && m < 600) {
    m++;
    let budget = monthly;
    for (const d of ds) {
      if (d.b <= 0.5) continue;
      const i = (d.b * d.rate) / 100 / 12;
      d.b += i;
      interest += i;
    }
    for (const d of ds) {
      if (d.b <= 0.5) continue;
      const p = Math.min(d.payment, d.b, budget);
      d.b -= p;
      budget -= p;
    }
    for (const d of priorityOrder(ds.filter((x) => x.b > 0.5), order) as typeof ds) {
      if (budget <= 0) break;
      const p = Math.min(budget, d.b);
      d.b -= p;
      budget -= p;
    }
    for (const d of ds) if (d.b <= 0.5 && payoff[d.id] === undefined) payoff[d.id] = m;
  }
  return { payoff, months: ds.every((d) => d.b <= 0.5) ? m : undefined, interest: Math.round(interest) };
}

export function debtForecast(f: Finance, plan: Plan): DebtForecast {
  return simulateDebts(activeDebts(f), plan.minPayments + plan.extra, f.order);
}

/** Month a debt closes; when this month's payment is already made, the forecast starts next month. */
export function payoffMonth(f: Finance, forecast: DebtForecast, debtId: string, month: string): string | undefined {
  const m = forecast.payoff[debtId];
  if (m === undefined) return undefined;
  const paid = f.tasks.some((t) => t.kind === 'debt' && t.refId === debtId && t.month === month && t.doneAt);
  return shiftMonth(month, m - 1 + (paid ? 1 : 0));
}

/** Month the last debt closes, or undefined when the payments never cover the debts. */
export function debtFreeMonth(f: Finance, forecast: DebtForecast, month: string): string | undefined {
  if (!forecast.months) return undefined;
  const months = activeDebts(f).map((d) => payoffMonth(f, forecast, d.id, month));
  if (months.some((m) => !m)) return undefined;
  return months.sort().pop();
}

/** Monthly deposit that reaches the goal by its deadline. */
export function neededMonthly(g: Goal, month: string): number | undefined {
  if (!g.deadline || g.saved >= g.target) return undefined;
  const [y1, m1] = month.split('-').map(Number);
  const [y2, m2] = g.deadline.split('-').map(Number);
  const months = Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
  return Math.ceil((g.target - g.saved) / months / 100) * 100;
}

/** Interest saved compared with paying only the minimums. */
export function interestSaved(f: Finance, plan: Plan): number {
  const debts = activeDebts(f);
  if (!debts.length) return 0;
  const base = simulateDebts(debts, plan.minPayments, f.order);
  const now = simulateDebts(debts, plan.minPayments + plan.extra, f.order);
  return Math.max(0, base.interest - now.interest);
}

export function goalDate(g: Goal, monthly: number, from: string): string | undefined {
  if (g.saved >= g.target) return from;
  if (monthly <= 0) return undefined;
  return shiftMonth(from, Math.ceil((g.target - g.saved) / monthly) - 1);
}

// ---------- tasks of the month ----------

interface PlannedTask {
  key: string;
  kind: TaskKind;
  refId?: string;
  title: string;
  amount?: number;
  due?: string;
  xp: number;
}

function plannedTasks(f: Finance, month: string): PlannedTask[] {
  const plan = monthPlan(f, month);
  const payday = f.sources[0]?.day ?? 1;
  const out: PlannedTask[] = [];
  for (const d of activeDebts(f)) {
    const amount = Math.min(d.balance, d.payment) + (plan.priority?.id === d.id ? plan.extra : 0);
    out.push({ key: `${month}:debt:${d.id}`, kind: 'debt', refId: d.id, title: `Платёж: ${d.name}`, amount, due: dayIn(month, d.day), xp: FIN_XP.debt });
  }
  for (const { g, amount } of plan.goalShares) {
    if (amount > 0) out.push({ key: `${month}:goal:${g.id}`, kind: 'goal', refId: g.id, title: `Отложить: ${g.name}`, amount, due: dayIn(month, payday), xp: FIN_XP.goal });
  }
  for (const { o, amount } of plan.obligations) {
    if (o.remind && amount > 0) out.push({ key: `${month}:ob:${o.id}`, kind: 'obligation', refId: o.id, title: o.name, amount, due: o.day ? dayIn(month, o.day) : undefined, xp: FIN_XP.obligation });
  }
  if (plan.tax > 0) {
    if (f.taxMode === 'monthly') {
      out.push({ key: `${month}:tax`, kind: 'tax', title: `Налог за ${monthName(month, false)}`, amount: plan.tax, due: dayIn(shiftMonth(month, 1), 28), xp: FIN_XP.tax });
    } else {
      out.push({ key: `${month}:tax`, kind: 'tax', title: `Отложить на налог за ${monthName(month, false)}`, amount: plan.tax, due: dayIn(month, payday), xp: FIN_XP.tax });
    }
  }
  if (activeDebts(f).length) out.push({ key: `${month}:check`, kind: 'check', title: 'Сверить остатки по долгам с банком', due: dayIn(month, daysInMonth(month)), xp: FIN_XP.check });
  return out;
}

/** Brings the month's generated tasks in line with the current plan; done tasks get a top-up task if the plan grew. */
function syncTasks(f: Finance, month: string) {
  const wanted = plannedTasks(f, month);
  const keys = new Set(wanted.map((w) => w.key));
  f.tasks = f.tasks.filter((t) => t.month !== month || t.kind === 'custom' || t.doneAt || keys.has(t.key.replace(/:more$/, '')));
  for (const w of wanted) {
    const t = f.tasks.find((x) => x.key === w.key);
    if (!t) {
      f.tasks.push({ id: uid(), month, ...w });
    } else if (!t.doneAt) {
      Object.assign(t, w);
    } else if (w.amount !== undefined && t.amount !== undefined && w.amount - t.amount >= 100) {
      const more = f.tasks.find((x) => x.key === `${w.key}:more`);
      const diff = w.amount - t.amount;
      if (!more) f.tasks.push({ id: uid(), month, ...w, key: `${w.key}:more`, title: `${w.title} (доплата)`, amount: diff, xp: 5 });
      else if (!more.doneAt) more.amount = diff;
    }
  }
}

// ---------- actions ----------

function withFinance(fn: (f: Finance) => void) {
  update((d) => {
    d.finance ??= emptyFinance();
    fn(d.finance);
    // Keep an applied month's tasks current whenever its inputs change.
    const m = currentMonth();
    if (d.finance.setupDone && d.finance.months[m]) syncTasks(d.finance, m);
  });
}

export function ensureFinance() {
  if (!getData().finance) update((d) => void (d.finance = emptyFinance()));
}

export function setFinance(patch: Partial<Pick<Finance, 'strategy' | 'order' | 'taxMode' | 'setupDone'>>) {
  withFinance((f) => Object.assign(f, patch));
}

type Coll = 'sources' | 'obligations' | 'debts' | 'goals' | 'incomes' | 'expenses';
type ItemOf<C extends Coll> = Finance[C][number];

export function saveItem<C extends Coll>(coll: C, item: Omit<ItemOf<C>, 'id'> & { id?: string }): string {
  const id = item.id ?? uid();
  withFinance((f) => {
    const list = f[coll] as ItemOf<C>[];
    const i = list.findIndex((x) => x.id === id);
    const next = { ...item, id } as ItemOf<C>;
    if (i >= 0) list[i] = next;
    else list.push(next);
  });
  return id;
}

export function deleteItem(coll: Coll, id: string) {
  withFinance((f) => {
    const list = f[coll] as { id: string }[];
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list.splice(i, 1);
    f.tasks = f.tasks.filter((t) => t.refId !== id || t.doneAt);
  });
}

/** Saves the month's plan and creates its tasks. */
export function applyMonth(month: string, baseIncome: number, strategy: Strategy) {
  withFinance((f) => {
    f.months[month] = { month, baseIncome, strategy, appliedAt: f.months[month]?.appliedAt ?? Date.now() };
    f.strategy = strategy;
    syncTasks(f, month);
  });
}

export function toggleTask(id: string) {
  withFinance((f) => {
    const t = f.tasks.find((x) => x.id === id);
    if (!t) return;
    const debt = t.kind === 'debt' ? f.debts.find((d) => d.id === t.refId) : undefined;
    const goal = t.kind === 'goal' ? f.goals.find((g) => g.id === t.refId) : undefined;
    if (t.doneAt) {
      if (debt && t.applied) debt.balance += t.applied;
      if (goal && t.applied) goal.saved = Math.max(0, goal.saved - t.applied);
      t.doneAt = undefined;
      t.applied = undefined;
      return;
    }
    if (debt && t.amount) {
      // The bank takes the month's interest first; only the rest lowers the debt.
      const interest = (debt.balance * debt.rate) / 100 / 12;
      const principal = Math.min(debt.balance, Math.max(0, t.amount - interest));
      debt.balance = Math.round(debt.balance - principal);
      t.applied = Math.round(principal);
    }
    if (goal && t.amount) {
      goal.saved += t.amount;
      t.applied = t.amount;
    }
    t.doneAt = Date.now();
  });
}

export function addCustomTask(title: string, amount: number | undefined, due: string | undefined) {
  withFinance((f) => {
    f.tasks.push({ id: uid(), key: `custom:${uid()}`, month: due ? monthOf(due) : currentMonth(), kind: 'custom', title, amount, due, xp: FIN_XP.custom });
  });
}

export function deleteTask(id: string) {
  withFinance((f) => {
    f.tasks = f.tasks.filter((t) => t.id !== id);
  });
}

export function addExpense(amount: number, category: string, note?: string, date = today()) {
  withFinance((f) => {
    f.expenses.push({ id: uid(), date, amount, category, note });
  });
}

export function addIncome(name: string, amount: number, taxRate: number, date = today()) {
  withFinance((f) => {
    f.incomes.push({ id: uid(), date, name, amount, taxRate });
  });
}

// ---------- derived for the screens ----------

export function spentIn(f: Finance, month: string): number {
  return sum(
    f.expenses.filter((e) => monthOf(e.date) === month),
    (e) => e.amount,
  );
}

export function tasksOf(f: Finance, month: string): FinTask[] {
  const prevOpen = f.tasks.filter((t) => t.month < month && !t.doneAt);
  const mine = f.tasks.filter((t) => t.month === month);
  return [...prevOpen, ...mine].sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt) || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
}

export function isOverdue(t: FinTask, date = today()): boolean {
  return !t.doneAt && !!t.due && t.due < date;
}

export function isSoon(t: FinTask, date = today()): boolean {
  return !t.doneAt && !!t.due && t.due >= date && t.due <= addDays(date, 3);
}

/** XP from finances: done tasks, planned months and months that stayed within the living budget. */
export function financeXp(f: Finance | undefined): { xp: number; done: number } {
  if (!f) return { xp: 0, done: 0 };
  const done = f.tasks.filter((t) => t.doneAt);
  let xp = sum(done, (t) => t.xp) + Object.keys(f.months).length * FIN_XP.plan;
  const now = currentMonth();
  for (const m of Object.keys(f.months)) {
    if (m >= now) continue;
    const spent = spentIn(f, m);
    if (spent > 0 && spent <= monthPlan(f, m).life) xp += FIN_XP.keptBudget;
  }
  return { xp, done: done.length };
}
