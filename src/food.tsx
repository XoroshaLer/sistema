import { useState } from 'react';
import { addFood, addFoodPreset, deleteFood, deleteFoodPreset, setSettings } from './actions';
import { today } from './lib/dates';
import { num, parseNum } from './lib/format';
import { kcalOn, kcalTarget, proteinOn, proteinTarget } from './lib/logic';
import type { AppData, FoodPreset, Meal } from './store';
import { Bar, Chips, Icon, Label, Seg, Sheet, Stepper } from './ui';

/** Approximate values per piece or per 100 g, from common nutrition tables. */
const BUILTIN: FoodPreset[] = [
  { id: 'egg', name: 'Яйцо', unit: 'шт', per: 6, kcal: 75, portion: 2 },
  { id: 'chicken', name: 'Курица, готовая', unit: 'г', per: 27, kcal: 165, portion: 150 },
  { id: 'fish', name: 'Рыба', unit: 'г', per: 22, kcal: 130, portion: 150 },
  { id: 'curd', name: 'Творог 5%', unit: 'г', per: 17, kcal: 121, portion: 150 },
  { id: 'yogurt', name: 'Греческий йогурт', unit: 'г', per: 9, kcal: 75, portion: 150 },
  { id: 'cheese', name: 'Сыр', unit: 'г', per: 25, kcal: 350, portion: 30 },
  { id: 'oats', name: 'Овсянка, сухая', unit: 'г', per: 12, kcal: 370, portion: 50 },
  { id: 'grain', name: 'Крупа, готовая', unit: 'г', per: 3.5, kcal: 120, portion: 150 },
  { id: 'pasta', name: 'Макароны, готовые', unit: 'г', per: 5, kcal: 150, portion: 150 },
  { id: 'potato', name: 'Картофель, готовый', unit: 'г', per: 2, kcal: 85, portion: 200 },
  { id: 'bread', name: 'Хлеб', unit: 'г', per: 8, kcal: 250, portion: 30 },
  { id: 'beans', name: 'Бобовые, готовые', unit: 'г', per: 8, kcal: 120, portion: 150 },
  { id: 'tofu', name: 'Тофу', unit: 'г', per: 12, kcal: 120, portion: 100 },
  { id: 'veg', name: 'Овощи', unit: 'г', per: 1.5, kcal: 30, portion: 200 },
  { id: 'fruit', name: 'Фрукт', unit: 'шт', per: 0.5, kcal: 90, portion: 1 },
  { id: 'nuts', name: 'Орехи', unit: 'г', per: 20, kcal: 600, portion: 30 },
  { id: 'oil', name: 'Масло растительное', unit: 'г', per: 0, kcal: 900, portion: 10 },
  { id: 'shake', name: 'Протеин, порция', unit: 'шт', per: 24, kcal: 120, portion: 1 },
  { id: 'milk', name: 'Молоко 2,5%', unit: 'г', per: 3, kcal: 52, portion: 250 },
];

export const MEALS: { value: Meal; label: string }[] = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' },
];

const ACTIVITY = [
  { value: 1.375, label: 'Низкая' },
  { value: 1.55, label: 'Средняя' },
  { value: 1.725, label: 'Высокая' },
];

function mealNow(): Meal {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

function amountOf(p: FoodPreset, amount: number, value: number): number {
  return p.unit === 'шт' ? value * amount : (value * amount) / 100;
}

function perLabel(p: FoodPreset): string {
  const per = p.unit === 'шт' ? 'шт' : '100 г';
  return `${num(p.per)} г белка${p.kcal !== undefined ? ` · ${p.kcal} ккал` : ''} / ${per}`;
}

function NumInput({ label, value, onCommit, placeholder }: { label: string; value?: number; onCommit: (v?: number) => void; placeholder: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="input"
        inputMode="decimal"
        defaultValue={value ? num(value) : ''}
        placeholder={placeholder}
        onBlur={(e) => {
          const v = parseNum(e.target.value);
          onCommit(v && v > 0 ? v : undefined);
        }}
      />
    </label>
  );
}

export function FoodSheet({ data, close, toast }: { data: AppData; close: () => void; toast: (title: string, text?: string) => void }) {
  const t = today();
  const entries = data.food[t] ?? [];
  const protein = proteinOn(data, t);
  const kcal = kcalOn(data, t);
  const pGoal = proteinTarget(data);
  const kGoal = kcalTarget(data);
  const s = data.settings;
  const [meal, setMeal] = useState<Meal>(mealNow);
  const [sel, setSel] = useState<FoodPreset | null>(null);
  const [amount, setAmount] = useState(0);
  const [own, setOwn] = useState({ name: '', protein: '', kcal: '' });
  const [saveOwn, setSaveOwn] = useState(false);
  const [error, setError] = useState('');
  const presets = [...data.foodPresets, ...BUILTIN];
  const custom = new Set(data.foodPresets.map((p) => p.id));
  const hasWeekWeight = Object.values(data.weeks).some((w) => w.weight);

  const kcalLeft = kGoal.target ? kGoal.target - kcal : undefined;

  return (
    <Sheet title="Питание за день" onClose={close}>
      <div className="grid2">
        <div className="mini-stat" style={{ gap: 8 }}>
          <span className="caps" style={{ fontSize: 11 }}>Белок</span>
          <span className="v">{protein} <small>/ {pGoal.target} г</small></span>
          <Bar value={protein / pGoal.target} />
        </div>
        <div className="mini-stat" style={{ gap: 8 }}>
          <span className="caps" style={{ fontSize: 11 }}>Калории</span>
          <span className="v">{kcal} <small>/ {kGoal.target ?? '—'}</small></span>
          <Bar value={kGoal.target ? kcal / kGoal.target : 0} tone={kGoal.target && kcal > kGoal.target * 1.05 ? 'warn' : undefined} />
        </div>
      </div>
      <span className="sub" style={{ marginTop: -4 }}>
        {protein >= pGoal.target ? 'Белок добран' : `Добрать ${pGoal.target - protein} г белка`}
        {kcalLeft === undefined ? ' · норма калорий — внизу, в «Норме»' : kcalLeft >= 0 ? ` · осталось ${kcalLeft} ккал` : ` · сверх нормы ${-kcalLeft} ккал`}
      </span>

      <Seg label="Приём пищи" value={meal} onChange={setMeal} options={MEALS} />

      {sel ? (
        <section className="card active" style={{ gap: 10 }}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="h2" style={{ fontSize: 18 }}>{sel.name}</span>
            <span className="meta">
              ≈ {num(Math.round(amountOf(sel, amount, sel.per) * 10) / 10)} г белка
              {sel.kcal !== undefined && ` · ${Math.round(amountOf(sel, amount, sel.kcal))} ккал`}
            </span>
          </div>
          <Stepper label={sel.unit === 'шт' ? 'Штук' : 'Граммов'} value={amount} onChange={setAmount} step={() => (sel.unit === 'шт' ? 1 : sel.portion <= 30 ? 5 : 10)} min={sel.unit === 'шт' ? 1 : 5} />
          <div className="grid2">
            <button type="button" className="btn" onClick={() => setSel(null)}>Отмена</button>
            <button
              type="button"
              className="btn"
              style={{ borderColor: 'var(--accent-line)', background: 'var(--sel)' }}
              onClick={() => {
                addFood(t, meal, sel.unit === 'шт' ? `${sel.name} × ${amount}` : `${sel.name}, ${amount} г`, amountOf(sel, amount, sel.per), amountOf(sel, amount, sel.kcal ?? 0));
                setSel(null);
              }}
            >
              <Icon name="plus" size={16} /> Добавить
            </button>
          </div>
          {custom.has(sel.id) && (
            <button
              type="button"
              className="link-btn"
              style={{ minHeight: 32 }}
              onClick={() => {
                deleteFoodPreset(sel.id);
                setSel(null);
              }}
            >
              Убрать из быстрых
            </button>
          )}
        </section>
      ) : (
        <div className="food-grid">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSel(p);
                setAmount(p.portion);
              }}
            >
              <span>{p.name}</span>
              <span>{perLabel(p)}</span>
            </button>
          ))}
        </div>
      )}

      <Label>Своё блюдо</Label>
      <input className="input" placeholder="Плов с курицей" value={own.name} onChange={(e) => { setOwn({ ...own, name: e.target.value }); setError(''); }} aria-label="Название блюда" />
      <div className="grid2">
        <input className="input" inputMode="decimal" placeholder="Белок, г" value={own.protein} onChange={(e) => { setOwn({ ...own, protein: e.target.value }); setError(''); }} aria-label="Граммов белка" />
        <input className="input" inputMode="decimal" placeholder="Калории, ккал" value={own.kcal} onChange={(e) => { setOwn({ ...own, kcal: e.target.value }); setError(''); }} aria-label="Калорий" />
      </div>
      <Chips text value={saveOwn ? 'save' : 'once'} onChange={(v) => setSaveOwn(v === 'save')} options={[{ value: 'once', label: 'Один раз' }, { value: 'save', label: 'И в быстрые' }]} />
      {error && <span className="sub" style={{ color: '#f0a8a8' }}>{error}</span>}
      <button
        type="button"
        className="btn"
        onClick={() => {
          const p = parseNum(own.protein) ?? 0;
          const k = parseNum(own.kcal) ?? 0;
          if (!own.name.trim() || (p <= 0 && k <= 0)) {
            setError('Впиши название и хотя бы белок или калории.');
            return;
          }
          addFood(t, meal, own.name.trim(), p, k);
          if (saveOwn) addFoodPreset({ name: own.name.trim(), unit: 'шт', per: p, kcal: k, portion: 1 });
          setOwn({ name: '', protein: '', kcal: '' });
          toast('Добавлено', `${own.name.trim()} — ${num(p)} г белка · ${Math.round(k)} ккал`);
        }}
      >
        <Icon name="plus" size={16} /> Добавить блюдо
      </button>

      {MEALS.map(({ value, label }) => {
        const list = entries.filter((e) => e.meal === value);
        if (!list.length) return null;
        const p = Math.round(list.reduce((n, e) => n + e.protein, 0));
        const k = Math.round(list.reduce((n, e) => n + (e.kcal ?? 0), 0));
        return (
          <div key={value} className="stack">
            <div className="caps" style={{ fontSize: 11 }}>
              <span>{label}</span>
              <span className="accent">{p} г · {k} ккал</span>
            </div>
            {list.map((e) => (
              <div key={e.id} className="row" style={{ minHeight: 44, paddingLeft: 12 }}>
                <span className="grow ellipsis" style={{ fontSize: 14 }}>{e.name}</span>
                <span className="val" style={{ textTransform: 'none' }}>
                  {num(e.protein)} г{e.kcal !== undefined ? ` · ${e.kcal}` : ''}
                </span>
                <button type="button" className="icon-btn" style={{ color: 'var(--muted)', marginRight: -6 }} aria-label={`Удалить: ${e.name}`} onClick={() => deleteFood(t, e.id)}>
                  <Icon name="x" size={18} />
                </button>
              </div>
            ))}
          </div>
        );
      })}

      <Label>Норма</Label>
      <span className="sub" style={{ marginTop: -6 }}>
        {pGoal.weight
          ? `Белок: ${num(s.proteinPerKg)} г × ${num(pGoal.weight)} кг = ${pGoal.target} г (ориентир программы ${pGoal.lo}–${pGoal.hi} г).`
          : 'Белок считается от веса — укажи его ниже. Пока цель 100 г.'}
      </span>
      <div className="field">
        <span>Грамм белка на кг веса</span>
        <Chips value={s.proteinPerKg} onChange={(v) => setSettings({ proteinPerKg: v })} options={[1.4, 1.6, 1.8, 2].map((v) => ({ value: v, label: num(v) }))} />
      </div>

      <div className="note-box" style={{ flexDirection: 'column', gap: 4 }}>
        {kGoal.manual ? (
          <span>Калории: своя норма {kGoal.target} ккал.</span>
        ) : kGoal.maintenance ? (
          <span>
            Калории: поддержание ≈ {kGoal.maintenance} ккал{s.deficitPct ? ` → цель ${kGoal.target} ккал (−${s.deficitPct}%)` : ''}.
          </span>
        ) : (
          <span>Чтобы посчитать калории, укажи рост и возраст{hasWeekWeight ? '' : ' и вес'}.</span>
        )}
        <span>Это оценка по формуле. Сверяйся с весом за 2–3 недели: если уходит быстрее 0,5 кг в неделю — дефицит великоват.</span>
      </div>
      <div className="grid2">
        <NumInput label="Рост, см" value={s.heightCm} placeholder="165" onCommit={(v) => setSettings({ heightCm: v })} />
        <NumInput label="Возраст" value={s.age} placeholder="30" onCommit={(v) => setSettings({ age: v && Math.round(v) })} />
      </div>
      {!hasWeekWeight && <NumInput label="Вес, кг — пока нет итогов недели" value={s.bodyWeight} placeholder="60" onCommit={(v) => setSettings({ bodyWeight: v })} />}
      <div className="field">
        <span>Пол — для формулы</span>
        <Chips text value={s.sex} onChange={(v) => setSettings({ sex: v })} options={[{ value: 'f', label: 'Женский' }, { value: 'm', label: 'Мужской' }]} />
      </div>
      <div className="field">
        <span>Активность</span>
        <Chips text value={s.activity} onChange={(v) => setSettings({ activity: v })} options={ACTIVITY} />
        <span className="sub">Средняя — 3–5 тренировок в неделю, как в программе.</span>
      </div>
      <div className="field">
        <span>Дефицит</span>
        <Chips value={s.deficitPct} onChange={(v) => setSettings({ deficitPct: v })} options={[0, 5, 10, 15].map((v) => ({ value: v, label: v ? `−${v}%` : '0' }))} />
      </div>
      <NumInput label="Своя норма, ккал — если знаешь точнее" value={s.kcalManual} placeholder="по формуле" onCommit={(v) => setSettings({ kcalManual: v && Math.round(v) })} />
    </Sheet>
  );
}
