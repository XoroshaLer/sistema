import { useEffect, useMemo, useState } from 'react';
import { fmtDay, today } from '../lib/dates';
import { cap, num, parseNum, plural } from '../lib/format';
import type { FinTab, Nav } from '../nav';
import type { AppData } from '../store';
import { Bar, Chips, Icon, Label, MenuButton, Seg, TopBar } from '../ui';
import {
  EXPENSE_CATEGORIES,
  activeDebts,
  addExpense,
  applyMonth,
  currentMonth,
  daysLeftInMonth,
  debtForecast,
  debtFreeMonth,
  deleteItem,
  deleteTask,
  ensureFinance,
  fmtDue,
  goalDate,
  interestSaved,
  isOverdue,
  isSoon,
  monthName,
  monthOf,
  monthPlan,
  neededMonthly,
  payoffMonth,
  plannedBase,
  priorityOrder,
  rub,
  setFinance,
  spentIn,
  tasksOf,
  toggleTask,
  type Finance,
  type FinTask,
  type Plan,
  type Strategy,
} from './model';

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: 'debt', label: 'Гасить долг' },
  { value: 'balance', label: 'Баланс' },
  { value: 'save', label: 'Копить' },
];

function upper(s: string) {
  return s.toUpperCase();
}

function thousands(n: number) {
  return Math.round(n).toLocaleString('ru-RU');
}

/** Small rising-bars art for finance hero cards. */
function StepsArt() {
  return (
    <svg className="photo" viewBox="0 0 230 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="#5F92C2" fillOpacity="0.2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={60 + i * 28} y={124 - i * 18} width="18" height={46 + i * 18} />
        ))}
      </g>
      <polyline points="69,128 97,116 125,106 153,88 181,70 209,46" fill="none" stroke="#9CC8F0" strokeWidth="2" />
    </svg>
  );
}

function FinHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="hero">
      <StepsArt />
      <div className="fade" />
      <div className="body">{children}</div>
    </section>
  );
}

export function FinanceRoot({ data, tab, nav }: { data: AppData; tab: FinTab; nav: Nav }) {
  useEffect(() => ensureFinance(), []);
  const f = data.finance;
  if (!f) return null;
  if (!f.setupDone) return <FinanceSetup f={f} nav={nav} />;
  if (tab === 'budget') return <FinanceBudget f={f} nav={nav} />;
  if (tab === 'goals') return <FinanceGoals f={f} nav={nav} />;
  if (tab === 'spend') return <FinanceSpend f={f} nav={nav} />;
  return <FinanceOverview f={f} nav={nav} />;
}

// ---------- setup ----------

function ItemRow({ icon, title, sub, onClick }: { icon: Parameters<typeof Icon>[0]['name']; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" className="row" onClick={onClick}>
      <span className="sq"><Icon name={icon} size={18} /></span>
      <span className="grow stack" style={{ gap: 0 }}>
        <span className="title ellipsis">{title}</span>
        <span className="sub">{sub}</span>
      </span>
      <Icon name="right" style={{ color: 'var(--text-2)', flexShrink: 0 }} />
    </button>
  );
}

function Lists({ f, nav, show }: { f: Finance; nav: Nav; show: 'obligations' | 'debts' | 'goals' }) {
  if (show === 'obligations')
    return (
      <>
        {f.obligations.map((o) => (
          <ItemRow key={o.id} icon="receipt" title={o.name} sub={`${o.percent ? `${num(o.percent)}% от дохода` : rub(o.amount)}${o.day ? ` · ${o.day} числа` : ''}`} onClick={() => nav.open({ type: 'fin', form: 'obligation', id: o.id })} />
        ))}
      </>
    );
  if (show === 'debts')
    return (
      <>
        {f.debts.map((d) => (
          <ItemRow key={d.id} icon="percent" title={d.name} sub={`${rub(d.balance)} · ${num(d.rate)}% · платёж ${rub(d.payment)} ${d.day} числа`} onClick={() => nav.open({ type: 'fin', form: 'debt', id: d.id })} />
        ))}
      </>
    );
  return (
    <>
      {f.goals.map((g) => (
        <ItemRow key={g.id} icon="target" title={g.name} sub={`${rub(g.saved)} из ${rub(g.target)}${g.deadline ? ` · к ${monthName(g.deadline)}` : ''}`} onClick={() => nav.open({ type: 'fin', form: 'goal', id: g.id })} />
      ))}
    </>
  );
}

function FinanceSetup({ f, nav }: { f: Finance; nav: Nav }) {
  const [step, setStep] = useState(0);
  const [strategy, setStrategy] = useState<Strategy>(f.strategy);
  const month = currentMonth();
  const steps = ['Доход', 'Обязательное', 'Долги', 'Цели', 'Стратегия'];
  const canNext = step !== 0 || f.sources.length > 0;
  const plan = monthPlan(f, month, strategy);

  return (
    <>
      <TopBar left={<MenuButton label="Финансы" onOpen={nav.menu} />} mid="Настройка" />
      <div className="stack">
        <div className="caps">
          <span>Шаг {step + 1} из {steps.length}</span>
          <span>{steps[step]}</span>
        </div>
        <div className="segbar" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((s, i) => <i key={s} className={i < step ? 'done' : i === step ? 'on' : ''} />)}
        </div>
      </div>

      {step === 0 && (
        <>
          <FinHero>
            <Label>Финансы</Label>
            <div className="h1">Откуда<br />приходят деньги</div>
            <div className="sub">Пара минут настройки. Всё хранится только на телефоне.</div>
          </FinHero>
          <div className="stack">
            {f.sources.map((s) => (
              <ItemRow key={s.id} icon="coins" title={s.name} sub={`${rub(s.amount)} в месяц · налог ${num(Math.round(s.taxRate * 1000) / 10)}%`} onClick={() => nav.open({ type: 'fin', form: 'source', id: s.id })} />
            ))}
            <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'source' })}>
              <Icon name="plus" size={16} /> {f.sources.length ? 'Ещё источник' : 'Основной доход'}
            </button>
          </div>
          <div className="field">
            <span>Налог плачу</span>
            <Chips text value={f.taxMode} onChange={(v) => setFinance({ taxMode: v })} options={[{ value: 'monthly', label: 'Каждый месяц' }, { value: 'quarterly', label: 'Раз в квартал' }]} />
          </div>
          <span className="sub" style={{ marginTop: -6 }}>Разовые доходы, вроде репетиторства, добавишь потом в «Бюджете», когда придут.</span>
        </>
      )}

      {step === 1 && (
        <>
          <span className="sub">Что уходит каждый месяц, что бы ни было: аренда, коммуналка, связь, переводы маме. Кредиты — на следующем шаге.</span>
          <div className="stack"><Lists f={f} nav={nav} show="obligations" /></div>
          <div className="grid3">
            {['Аренда', 'Коммуналка', 'Связь', 'Маме', 'Подписки', 'Другое'].map((n) => (
              <button key={n} type="button" className="chip text" onClick={() => nav.open({ type: 'fin', form: 'obligation', name: n === 'Другое' ? '' : n })}>
                + {n}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <span className="sub">Кредиты и кредитные карты. Остаток, ставку и платёж возьми из договора или банковского приложения.</span>
          <div className="stack"><Lists f={f} nav={nav} show="debts" /></div>
          <div className="grid2">
            <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'debt', name: 'loan' })}><Icon name="plus" size={16} /> Кредит</button>
            <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'debt', name: 'card' })}><Icon name="plus" size={16} /> Карта</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <span className="sub">На что копишь. Подушка безопасности — хорошая первая цель.</span>
          <div className="stack"><Lists f={f} nav={nav} show="goals" /></div>
          <div className="grid2">
            {!f.goals.some((g) => g.name.toLowerCase().includes('подушк')) && (
              <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'goal', name: 'Подушка безопасности' })}><Icon name="shield" size={16} /> Подушка</button>
            )}
            <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'goal' })}><Icon name="plus" size={16} /> Своя цель</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <span className="sub">Как делить деньги, которые остаются после налога и обязательных платежей. Потом можно поменять в любом месяце.</span>
          <Seg label="Стратегия" value={strategy} onChange={setStrategy} options={STRATEGIES} />
          <Distribution plan={plan} />
          {activeDebts(f).length > 1 && <OrderPicker f={f} />}
        </>
      )}

      <div className="grid2" style={{ marginTop: 4 }}>
        <button type="button" className="btn" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <Icon name="left" size={16} /> Назад
        </button>
        {step < steps.length - 1 ? (
          <button type="button" className="btn" style={{ borderColor: 'var(--accent-line)', background: 'var(--sel)' }} onClick={() => canNext && setStep(step + 1)} disabled={!canNext}>
            Дальше <Icon name="right" size={16} />
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            style={{ borderColor: 'var(--accent-line)', background: 'var(--sel)' }}
            onClick={() => {
              setFinance({ setupDone: true, strategy });
              applyMonth(month, plannedBase(f, month), strategy);
              nav.goFin('overview');
              nav.toast('Финансы настроены', `Бюджет на ${monthName(month, false)} распределён`);
            }}
          >
            Готово <Icon name="check" size={16} />
          </button>
        )}
      </div>
    </>
  );
}

function OrderPicker({ f }: { f: Finance }) {
  return (
    <div className="field">
      <span>Какой долг гасить первым</span>
      <Chips text value={f.order} onChange={(v) => setFinance({ order: v })} options={[{ value: 'avalanche', label: 'Лавина' }, { value: 'snowball', label: 'Снежный ком' }]} />
      <span className="sub" style={{ fontSize: 12 }}>
        {f.order === 'avalanche' ? 'Сначала долг с самой высокой ставкой — так меньше переплата.' : 'Сначала самый маленький долг — быстрее первые закрытые долги.'}
      </span>
    </div>
  );
}

const PARTS = [
  { key: 'tax', label: 'Налог', color: '#3A4654' },
  { key: 'mandatory', label: 'Обязательные и минимальные платежи', color: '#4A5563' },
  { key: 'extra', label: 'Сверх по долгу', color: '#9CC8F0' },
  { key: 'save', label: 'В накопления', color: '#5F92C2' },
  { key: 'life', label: 'На жизнь', color: '#2E4155' },
] as const;

function Distribution({ plan }: { plan: Plan }) {
  const values = { tax: plan.tax, mandatory: plan.mandatory, extra: plan.extra, save: plan.save, life: Math.max(0, plan.life) };
  const total = Object.values(values).reduce((n, v) => n + v, 0) || 1;
  const parts = PARTS.filter((p) => values[p.key] > 0);
  return (
    <section className="card" style={{ gap: 10 }}>
      <Label>Как распределить {rub(plan.gross)}</Label>
      <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', gap: 2 }} role="img" aria-label={parts.map((p) => `${p.label} ${rub(values[p.key])}`).join(', ')}>
        {parts.map((p) => <span key={p.key} style={{ flex: `0 0 ${(values[p.key] / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className="stack" style={{ gap: 6 }}>
        {parts.map((p) => (
          <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, background: p.color, border: '1px solid #5A6878' }} />
            <span className="grow">{p.label}</span>
            <span style={{ fontWeight: 600 }}>{rub(values[p.key])}</span>
          </div>
        ))}
      </div>
      {plan.mandatory + plan.tax > plan.gross && <div className="note-box warn">Обязательные платежи и налог больше дохода — проверь суммы.</div>}
    </section>
  );
}

// ---------- overview ----------

function TaskRow({ t, nav }: { t: FinTask; nav: Nav }) {
  const overdue = isOverdue(t);
  const soon = isSoon(t);
  const when = t.due ? (overdue ? `просрочено · ${fmtDue(t.due)}` : `до ${fmtDue(t.due)}`) : '';
  return (
    <div className="row with-check" style={{ opacity: t.doneAt ? 0.75 : 1 }}>
      <span className="sq">
        <Icon name={t.kind === 'debt' ? 'percent' : t.kind === 'goal' ? 'shield' : t.kind === 'tax' ? 'receipt' : t.kind === 'check' ? 'search' : 'calendar'} size={18} />
      </span>
      <span className="grow stack" style={{ gap: 1 }}>
        <span className="title" style={{ textDecoration: t.doneAt ? 'line-through' : undefined }}>{t.title}</span>
        <span className="sub" style={{ fontSize: 12, color: overdue ? 'var(--warn)' : soon ? 'var(--accent)' : undefined }}>
          {[t.amount ? rub(t.amount) : '', when, `+${t.xp} XP`].filter(Boolean).join(' · ')}
        </span>
      </span>
      {t.kind === 'custom' && !t.doneAt && (
        <button type="button" className="icon-btn" style={{ color: 'var(--muted)', marginRight: 0 }} aria-label={`Удалить задание: ${t.title}`} onClick={() => deleteTask(t.id)}>
          <Icon name="x" size={18} />
        </button>
      )}
      <button
        type="button"
        className={`check${t.doneAt ? ' on' : ''}`}
        aria-pressed={!!t.doneAt}
        aria-label={t.doneAt ? `Снять отметку: ${t.title}` : `Отметить выполненным: ${t.title}`}
        onClick={() => {
          toggleTask(t.id);
          if (!t.doneAt) nav.toast('Задание выполнено', `+${t.xp} XP`);
        }}
      >
        {t.doneAt && <Icon name="check" size={20} stroke={2} />}
      </button>
    </div>
  );
}

function FinanceOverview({ f, nav }: { f: Finance; nav: Nav }) {
  const month = currentMonth();
  const applied = !!f.months[month];
  const plan = monthPlan(f, month);
  const spent = spentIn(f, month);
  const left = plan.life - spent;
  const days = daysLeftInMonth();
  const tasks = tasksOf(f, month);
  const open = tasks.filter((t) => !t.doneAt);
  const done = tasks.filter((t) => t.doneAt);
  const [showDone, setShowDone] = useState(false);

  return (
    <>
      <TopBar
        left={<MenuButton label="Финансы" onOpen={nav.menu} />}
        mid={upper(monthName(month))}
        right={
          <button type="button" className="icon-btn" aria-label="Своё задание" onClick={() => nav.open({ type: 'fin', form: 'task' })}>
            <Icon name="plus" size={22} stroke={1.6} />
          </button>
        }
      />

      {applied ? (
        <FinHero>
          <Label>Свободно до конца месяца</Label>
          <div className="h1" style={{ fontSize: 32 }}>{rub(Math.max(0, left))}</div>
          <div className="meta">из {rub(plan.life)} на жизнь · {days} {plural(days, 'день', 'дня', 'дней')}</div>
          <div className="divider" style={{ width: '60%' }} />
          <div className="sub">{left >= 0 ? `≈ ${rub(left / days)} в день, чтобы уложиться` : `Перерасход ${rub(-left)} — можно взять из «Копить» или ужаться`}</div>
        </FinHero>
      ) : (
        <FinHero>
          <Label>Новый месяц</Label>
          <div className="h1">Распредели бюджет<br />на {monthName(month, false)}</div>
          <div className="sub">Система разложит доход и создаст задания месяца.</div>
        </FinHero>
      )}
      {!applied && (
        <button type="button" className="cta" onClick={() => nav.goFin('budget')}>
          К бюджету <Icon name="right" />
        </button>
      )}

      {tasks.length > 0 && (
        <div className="stack">
          <Label>Задания месяца · {done.length} / {tasks.length}</Label>
          {open.map((t) => <TaskRow key={t.id} t={t} nav={nav} />)}
          {done.length > 0 && (
            <button type="button" className="link-btn" style={{ minHeight: 36 }} onClick={() => setShowDone(!showDone)}>
              {showDone ? 'Скрыть выполненные' : `Выполненные: ${done.length}`}
            </button>
          )}
          {showDone && done.map((t) => <TaskRow key={t.id} t={t} nav={nav} />)}
        </div>
      )}

      {(f.debts.length > 0 || f.goals.length > 0) && (
        <div className="stack">
          <Label>Цели</Label>
          {f.debts.map((d) => (
            <button key={d.id} type="button" className="card" style={{ textAlign: 'left', color: 'inherit', padding: '12px 14px' }} onClick={() => nav.goFin('goals')}>
              <span className="between"><span style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</span><span className="accent" style={{ fontSize: 13 }}>{Math.round((1 - d.balance / d.startBalance) * 100)}%</span></span>
              <Bar value={1 - d.balance / d.startBalance} />
              <span className="sub" style={{ fontSize: 12 }}>{d.balance > 0.5 ? `Осталось ${rub(d.balance)}` : 'Закрыт'}</span>
            </button>
          ))}
          {f.goals.map((g) => (
            <button key={g.id} type="button" className="card" style={{ textAlign: 'left', color: 'inherit', padding: '12px 14px' }} onClick={() => nav.goFin('goals')}>
              <span className="between"><span style={{ fontWeight: 600, fontSize: 15 }}>{g.name}</span><span className="accent" style={{ fontSize: 13 }}>{Math.round((g.saved / g.target) * 100)}%</span></span>
              <Bar value={g.saved / g.target} />
              <span className="sub" style={{ fontSize: 12 }}>{rub(g.saved)} из {rub(g.target)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ---------- budget ----------

function FinanceBudget({ f, nav }: { f: Finance; nav: Nav }) {
  const month = currentMonth();
  const saved = f.months[month];
  const [base, setBase] = useState(String(plannedBase(f, month)));
  const [strategy, setStrategy] = useState<Strategy>(saved?.strategy ?? f.strategy);
  const [showMandatory, setShowMandatory] = useState(false);
  const baseNum = parseNum(base) ?? 0;
  const draft: Finance = useMemo(() => ({ ...f, months: { ...f.months, [month]: { month, baseIncome: baseNum, strategy, appliedAt: saved?.appliedAt ?? 0 } } }), [f, month, baseNum, strategy, saved]);
  const plan = monthPlan(draft, month, strategy);
  const forecast = debtForecast(draft, plan);
  const freeAt = debtFreeMonth(draft, forecast, month);
  const saving = interestSaved(draft, plan);
  const changed = !saved || saved.baseIncome !== baseNum || saved.strategy !== strategy;

  return (
    <>
      <TopBar
        left={<MenuButton label="Финансы" onOpen={nav.menu} />}
        mid={`Бюджет · ${monthName(month, false)}`}
        right={
          <button type="button" className="icon-btn" aria-label="Настройки финансов" onClick={() => nav.open({ type: 'fin', form: 'settings' })}>
            <Icon name="gear" />
          </button>
        }
      />

      <section className="card" style={{ gap: 10 }}>
        <Label>Доход за месяц</Label>
        <label className="field">
          <span>Основной, до налога</span>
          <input className="input" inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} style={{ fontSize: 22, fontWeight: 700, height: 52 }} />
        </label>
        {plan.extras.map((i) => (
          <div key={i.id} className="row" style={{ minHeight: 44, paddingLeft: 12 }}>
            <span className="grow stack" style={{ gap: 0 }}>
              <span style={{ fontSize: 14 }}>{i.name}</span>
              <span className="sub" style={{ fontSize: 12 }}>{fmtDay(i.date).toLowerCase()} · налог {num(Math.round(i.taxRate * 1000) / 10)}%</span>
            </span>
            <span className="val">{rub(i.amount)}</span>
            <button type="button" className="icon-btn" style={{ color: 'var(--muted)', marginRight: -6 }} aria-label={`Удалить доход: ${i.name}`} onClick={() => deleteItem('incomes', i.id)}>
              <Icon name="x" size={18} />
            </button>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'income' })}>
          <Icon name="plus" size={16} /> Разовый доход
        </button>
        <button type="button" className="row" style={{ background: 'none', border: 0, padding: '0 2px', minHeight: 44 }} onClick={() => setShowMandatory(!showMandatory)} aria-expanded={showMandatory}>
          <span className="grow stack" style={{ gap: 1 }}>
            <span style={{ fontSize: 14 }}>Налог {rub(plan.tax)} · обязательное {rub(plan.mandatory)}</span>
            <span className="sub" style={{ fontSize: 12 }}>{f.obligations.map((o) => o.name).concat(activeDebts(f).length ? ['минимальные платежи по долгам'] : []).join(', ') || 'Нет обязательных платежей'}</span>
          </span>
          <Icon name="down" size={18} stroke={2} style={{ color: 'var(--text-2)', transform: showMandatory ? 'rotate(180deg)' : undefined }} />
        </button>
        {showMandatory && (
          <div className="stack">
            <Lists f={f} nav={nav} show="obligations" />
            <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'obligation' })}>
              <Icon name="plus" size={16} /> Обязательный платёж
            </button>
          </div>
        )}
      </section>

      <Seg label="Стратегия" value={strategy} onChange={setStrategy} options={STRATEGIES} />
      <Distribution plan={plan} />

      {(activeDebts(f).length > 0 || plan.goalShares.length > 0) && (
        <section className="card active" style={{ gap: 6 }}>
          <Label>Прогноз</Label>
          {activeDebts(f).length > 0 && (
            <>
              <span className="h2">{freeAt ? `Без долгов: ${monthName(freeAt)}` : 'Платежей не хватает, чтобы закрыть долг'}</span>
              {saving > 0 && <span className="sub accent">Переплата меньше на {rub(saving)}, чем при одних минимальных платежах</span>}
            </>
          )}
          {plan.goalShares.map(({ g, amount }) => {
            const when = goalDate(g, amount, month);
            const need = neededMonthly(g, month);
            return (
              <span key={g.id} className="sub">
                {g.name}: {rub(amount)} в месяц → {when ? monthName(when) : 'без взносов'}
                {need && amount < need ? ` · чтобы успеть к сроку, нужно ${rub(need)}` : ''}
              </span>
            );
          })}
        </section>
      )}

      <button type="button" className="cta" onClick={() => {
        applyMonth(month, baseNum, strategy);
        nav.toast(saved ? 'Бюджет пересчитан' : 'Бюджет распределён', 'Задания месяца обновлены');
      }}>
        {saved ? (changed ? 'Пересчитать месяц' : 'Бюджет применён') : `Применить на ${monthName(month, false)}`} <Icon name="check" />
      </button>
    </>
  );
}

// ---------- goals ----------

function FinanceGoals({ f, nav }: { f: Finance; nav: Nav }) {
  const month = currentMonth();
  const plan = monthPlan(f, month);
  const debts = activeDebts(f);
  const forecast = debtForecast(f, plan);
  const freeAt = debtFreeMonth(f, forecast, month);
  const priority = priorityOrder(debts, f.order)[0];
  const start = f.debts.reduce((n, d) => n + d.startBalance, 0);
  const left = f.debts.reduce((n, d) => n + d.balance, 0);

  return (
    <>
      <TopBar left={<MenuButton label="Финансы" onOpen={nav.menu} />} mid="Цели и долги" />

      {f.debts.length > 0 && (
        <section className="card active" style={{ gap: 6 }}>
          <Label>Свобода от долгов</Label>
          <span className="h1" style={{ fontSize: 26 }}>{debts.length === 0 ? 'Все долги закрыты' : freeAt ? cap(monthName(freeAt)) : 'Платежа не хватает'}</span>
          <span className="sub">
            {debts.length ? `Осталось ${rub(left)} по ${debts.length} ${plural(debts.length, 'долгу', 'долгам', 'долгам')} · в месяц ${rub(plan.minPayments + plan.extra)}` : 'Отличная работа'}
          </span>
          <Bar value={start ? 1 - left / start : 1} />
        </section>
      )}

      <div className="between" style={{ alignItems: 'center' }}>
        <Label>Долги</Label>
      </div>
      {debts.length > 1 && <OrderPicker f={f} />}
      <div className="stack">
        {f.debts.map((d) => {
          const closes = payoffMonth(f, forecast, d.id, month);
          return (
            <button key={d.id} type="button" className="card" style={{ textAlign: 'left', color: 'inherit', padding: '12px 14px', borderColor: d.id === priority?.id ? 'var(--accent-line)' : undefined }} onClick={() => nav.open({ type: 'fin', form: 'debt', id: d.id })}>
              <span className="between" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</span>
                {d.id === priority?.id && debts.length > 0 && <span className="badge">Гасим первым</span>}
              </span>
              <Bar value={1 - d.balance / d.startBalance} />
              <span className="sub" style={{ fontSize: 12 }}>
                {d.balance > 0.5 ? `Осталось ${rub(d.balance)} · ${num(d.rate)}% · ${closes ? `закроется: ${monthName(closes)}` : 'платежа не хватает'}` : 'Закрыт'}
              </span>
            </button>
          );
        })}
        <div className="grid2">
          <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'debt', name: 'loan' })}><Icon name="plus" size={16} /> Кредит</button>
          <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'debt', name: 'card' })}><Icon name="plus" size={16} /> Карта</button>
        </div>
      </div>

      <Label>Накопления</Label>
      <div className="grid2">
        {f.goals.map((g) => {
          const share = plan.goalShares.find((x) => x.g.id === g.id)?.amount ?? 0;
          const when = goalDate(g, share, month);
          const need = neededMonthly(g, month);
          const late = !!(need && share < need);
          return (
            <button key={g.id} type="button" className="card" style={{ textAlign: 'left', color: 'inherit', padding: 12, gap: 6 }} onClick={() => nav.open({ type: 'fin', form: 'goal', id: g.id })}>
              <span style={{ fontWeight: 600, fontSize: 14 }} className="ellipsis">{g.name}</span>
              <span style={{ fontWeight: 700, fontSize: 17 }}>{thousands(g.saved)} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>/ {thousands(g.target)}</span></span>
              <Bar value={g.saved / g.target} />
              <span className="sub" style={{ fontSize: 12 }}>{g.saved >= g.target ? 'Собрано' : share ? `${rub(share)}/мес → ${when ? monthName(when, false) : '—'}` : 'Нет взносов'}</span>
              {late && <span className="sub" style={{ fontSize: 12, color: 'var(--warn)' }}>Чтобы успеть к сроку: {rub(need!)}/мес</span>}
            </button>
          );
        })}
        <button type="button" className="btn" style={{ minHeight: 96 }} onClick={() => nav.open({ type: 'fin', form: 'goal' })}>
          <Icon name="plus" size={16} /> Цель
        </button>
      </div>
    </>
  );
}

// ---------- spending ----------

function FinanceSpend({ f, nav }: { f: Finance; nav: Nav }) {
  const month = currentMonth();
  const plan = monthPlan(f, month);
  const spent = spentIn(f, month);
  const left = plan.life - spent;
  const days = daysLeftInMonth();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const list = f.expenses.filter((e) => monthOf(e.date) === month).sort((a, b) => (a.date < b.date ? 1 : -1));
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ c, v: list.filter((e) => e.category === c).reduce((n, e) => n + e.amount, 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const maxCat = byCat[0]?.v ?? 1;

  return (
    <>
      <TopBar left={<MenuButton label="Финансы" onOpen={nav.menu} />} mid={`Траты · ${monthName(month, false)}`} />

      <section className="card" style={{ gap: 8 }}>
        <div className="between">
          <span style={{ fontWeight: 700, fontSize: 24 }}>{thousands(spent)} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-2)' }}>/ {rub(plan.life)}</span></span>
          <span className="meta" style={{ fontSize: 12 }}>{left >= 0 ? `Осталось ${thousands(left)}` : `Сверх ${thousands(-left)}`}</span>
        </div>
        <Bar value={plan.life ? spent / plan.life : 0} tone={left < 0 ? 'warn' : undefined} />
        <span className="sub" style={{ fontSize: 12 }}>
          {f.months[month] ? `Конверт «На жизнь» · ${days} ${plural(days, 'день', 'дня', 'дней')} до конца месяца${left > 0 ? ` · ≈ ${rub(left / days)} в день` : ''}` : 'Сначала распредели бюджет месяца — тогда появится лимит на жизнь.'}
        </span>
      </section>

      <Label>Записать трату</Label>
      <input className="input" inputMode="decimal" placeholder="Сумма, ₽" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} style={{ fontSize: 22, fontWeight: 700, height: 54 }} aria-label="Сумма траты" />
      <div className="chips" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {EXPENSE_CATEGORIES.map((c) => (
          <button key={c} type="button" className={`chip text${c === category ? ' on' : ''}`} aria-pressed={c === category} style={{ fontSize: 12, letterSpacing: 0, minHeight: 44 }} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <input className="input" placeholder="Заметка — необязательно" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Заметка к трате" />
      {error && <span className="sub" style={{ color: '#f0a8a8' }}>{error}</span>}
      <button
        type="button"
        className="cta"
        onClick={() => {
          const a = parseNum(amount);
          if (!a || a <= 0) return setError('Впиши сумму.');
          addExpense(a, category, note.trim() || undefined);
          setAmount('');
          setNote('');
        }}
      >
        Записать <Icon name="check" />
      </button>

      {byCat.length > 0 && (
        <div className="stack">
          <Label>По категориям</Label>
          {byCat.map(({ c, v }) => (
            <div key={c} style={{ display: 'grid', gridTemplateColumns: '90px minmax(0, 1fr) 80px', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span>{c}</span>
              <Bar value={v / maxCat} />
              <span style={{ textAlign: 'right', color: 'var(--text-2)' }}>{rub(v)}</span>
            </div>
          ))}
        </div>
      )}

      {list.length > 0 && (
        <div className="stack">
          <Label>Траты месяца</Label>
          {list.map((e) => (
            <div key={e.id} className="row" style={{ minHeight: 46, paddingLeft: 12 }}>
              <span className="grow stack" style={{ gap: 0 }}>
                <span style={{ fontSize: 14 }}>{e.category}{e.note ? ` · ${e.note}` : ''}</span>
                <span className="sub" style={{ fontSize: 12 }}>{e.date === today() ? 'сегодня' : fmtDay(e.date).toLowerCase()}</span>
              </span>
              <span className="val" style={{ textTransform: 'none' }}>{rub(e.amount)}</span>
              <button type="button" className="icon-btn" style={{ color: 'var(--muted)', marginRight: -6 }} aria-label={`Удалить трату ${rub(e.amount)}`} onClick={() => deleteItem('expenses', e.id)}>
                <Icon name="x" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
