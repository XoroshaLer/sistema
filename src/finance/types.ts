// Finance data shapes and defaults; kept free of store imports so store.ts can use them.

export type Strategy = 'debt' | 'balance' | 'save';
export type DebtOrder = 'avalanche' | 'snowball';

export interface IncomeSource {
  id: string;
  name: string;
  /** Expected per month, before tax. */
  amount: number;
  /** Share of income paid as tax: 0.04, 0.06, or 0 when it already arrives after tax. */
  taxRate: number;
  day?: number;
}

export interface Obligation {
  id: string;
  name: string;
  amount: number;
  /** When set, the amount is this % of the month's income after tax. */
  percent?: number;
  day?: number;
  /** Show as a task of the month. */
  remind: boolean;
}

export interface Debt {
  id: string;
  name: string;
  kind: 'loan' | 'card';
  balance: number;
  startBalance: number;
  /** % per year. */
  rate: number;
  /** Monthly payment (annuity) or the card's minimum. */
  payment: number;
  day: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  /** 'YYYY-MM'. */
  deadline?: string;
}

export interface Income {
  id: string;
  date: string;
  name: string;
  amount: number;
  taxRate: number;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  note?: string;
}

export interface MonthPlan {
  month: string;
  /** Expected main income this month, before tax. */
  baseIncome: number;
  strategy: Strategy;
  appliedAt: number;
}

export type TaskKind = 'debt' | 'goal' | 'tax' | 'obligation' | 'check' | 'custom';

export interface FinTask {
  id: string;
  /** Identifies a generated task so re-planning updates it instead of duplicating it. */
  key: string;
  month: string;
  kind: TaskKind;
  refId?: string;
  title: string;
  amount?: number;
  due?: string;
  doneAt?: number;
  /** What ticking it changed (debt principal or goal deposit), so unticking can undo it. */
  applied?: number;
  xp: number;
}

export interface Finance {
  setupDone: boolean;
  strategy: Strategy;
  order: DebtOrder;
  taxMode: 'monthly' | 'quarterly';
  sources: IncomeSource[];
  obligations: Obligation[];
  debts: Debt[];
  goals: Goal[];
  incomes: Income[];
  expenses: Expense[];
  months: Record<string, MonthPlan>;
  tasks: FinTask[];
}

export const EXPENSE_CATEGORIES = ['Продукты', 'Кафе', 'Транспорт', 'Дом', 'Здоровье', 'Красота', 'Одежда', 'Отдых', 'Подарки', 'Другое'];

export const FIN_XP = { debt: 40, goal: 20, tax: 20, obligation: 10, check: 10, custom: 10, plan: 20, keptBudget: 30 };

export function emptyFinance(): Finance {
  return {
    setupDone: false,
    strategy: 'balance',
    order: 'avalanche',
    taxMode: 'monthly',
    sources: [],
    obligations: [],
    debts: [],
    goals: [],
    incomes: [],
    expenses: [],
    months: {},
    tasks: [],
  };
}

export function normalizeFinance(raw: Partial<Finance>): Finance {
  return { ...emptyFinance(), ...raw };
}
