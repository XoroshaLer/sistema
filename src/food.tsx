import { useState } from 'react';
import { addFood, addFoodPreset, deleteFood, deleteFoodPreset, setSettings } from './actions';
import { today } from './lib/dates';
import { num, parseNum } from './lib/format';
import { proteinOn, proteinTarget } from './lib/logic';
import type { AppData, FoodPreset, Meal } from './store';
import { Bar, Chips, Icon, Label, Seg, Sheet, Stepper } from './ui';

/** Approximate protein, from common nutrition tables. */
const BUILTIN: FoodPreset[] = [
  { id: 'egg', name: 'Яйцо', unit: 'шт', per: 6, portion: 2 },
  { id: 'chicken', name: 'Курица, готовая', unit: 'г', per: 27, portion: 150 },
  { id: 'fish', name: 'Рыба', unit: 'г', per: 22, portion: 150 },
  { id: 'curd', name: 'Творог 5%', unit: 'г', per: 17, portion: 150 },
  { id: 'yogurt', name: 'Греческий йогурт', unit: 'г', per: 9, portion: 150 },
  { id: 'cheese', name: 'Сыр', unit: 'г', per: 25, portion: 30 },
  { id: 'oats', name: 'Овсянка, сухая', unit: 'г', per: 12, portion: 50 },
  { id: 'grain', name: 'Крупа, готовая', unit: 'г', per: 3.5, portion: 150 },
  { id: 'beans', name: 'Бобовые, готовые', unit: 'г', per: 8, portion: 150 },
  { id: 'tofu', name: 'Тофу', unit: 'г', per: 12, portion: 100 },
  { id: 'shake', name: 'Протеин, порция', unit: 'шт', per: 24, portion: 1 },
  { id: 'milk', name: 'Молоко', unit: 'г', per: 3, portion: 250 },
];

export const MEALS: { value: Meal; label: string }[] = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' },
];

function mealNow(): Meal {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

function proteinFor(p: FoodPreset, amount: number): number {
  return p.unit === 'шт' ? p.per * amount : (p.per * amount) / 100;
}

function perLabel(p: FoodPreset): string {
  return p.unit === 'шт' ? `${num(p.per)} г белка / шт` : `${num(p.per)} г / 100 г`;
}

export function FoodSheet({ data, close, toast }: { data: AppData; close: () => void; toast: (title: string, text?: string) => void }) {
  const t = today();
  const entries = data.food[t] ?? [];
  const total = proteinOn(data, t);
  const goal = proteinTarget(data);
  const [meal, setMeal] = useState<Meal>(mealNow);
  const [sel, setSel] = useState<FoodPreset | null>(null);
  const [amount, setAmount] = useState(0);
  const [ownName, setOwnName] = useState('');
  const [ownGrams, setOwnGrams] = useState('');
  const [saveOwn, setSaveOwn] = useState(false);
  const [error, setError] = useState('');
  const presets = [...data.foodPresets, ...BUILTIN];
  const custom = new Set(data.foodPresets.map((p) => p.id));

  const pick = (p: FoodPreset) => {
    setSel(p);
    setAmount(p.portion);
  };

  return (
    <Sheet title="Белок за день" onClose={close}>
      <div className="between">
        <span className="big">{total} <small>/ {goal.target} г</small></span>
        <span className="meta">{total >= goal.target ? 'Норма есть' : `Добрать ${goal.target - total} г`}</span>
      </div>
      <Bar value={total / goal.target} />
      <span className="sub" style={{ marginTop: -6 }}>
        {goal.weight
          ? `Цель ${num(data.settings.proteinPerKg)} г × ${num(goal.weight)} кг. Ориентир программы — ${goal.lo}–${goal.hi} г в день (1,4–2,0 г на кг).`
          : 'Укажи вес ниже — норма посчитается от него. Пока цель 100 г.'}
      </span>

      <Seg label="Приём пищи" value={meal} onChange={setMeal} options={MEALS} />

      {sel ? (
        <section className="card active" style={{ gap: 10 }}>
          <div className="between">
            <span className="h2" style={{ fontSize: 18 }}>{sel.name}</span>
            <span className="meta">≈ {num(Math.round(proteinFor(sel, amount) * 10) / 10)} г</span>
          </div>
          <Stepper label={sel.unit === 'шт' ? 'Штук' : 'Граммов'} value={amount} onChange={setAmount} step={() => (sel.unit === 'шт' ? 1 : 10)} min={sel.unit === 'шт' ? 1 : 10} />
          <div className="grid2">
            <button type="button" className="btn" onClick={() => setSel(null)}>Отмена</button>
            <button
              type="button"
              className="btn"
              style={{ borderColor: 'var(--accent-line)', background: 'var(--sel)' }}
              onClick={() => {
                addFood(t, meal, sel.unit === 'шт' ? `${sel.name} × ${amount}` : `${sel.name}, ${amount} г`, proteinFor(sel, amount));
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
            <button key={p.id} type="button" onClick={() => pick(p)}>
              <span>{p.name}</span>
              <span>{perLabel(p)}</span>
            </button>
          ))}
        </div>
      )}

      <Label>Своё блюдо</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 96px', gap: 8 }}>
        <input className="input" placeholder="Плов с курицей" value={ownName} onChange={(e) => { setOwnName(e.target.value); setError(''); }} aria-label="Название блюда" />
        <input className="input" inputMode="decimal" placeholder="г белка" value={ownGrams} onChange={(e) => { setOwnGrams(e.target.value); setError(''); }} aria-label="Граммов белка" />
      </div>
      <Chips text value={saveOwn ? 'save' : 'once'} onChange={(v) => setSaveOwn(v === 'save')} options={[{ value: 'once', label: 'Один раз' }, { value: 'save', label: 'И в быстрые' }]} />
      {error && <span className="sub" style={{ color: '#f0a8a8' }}>{error}</span>}
      <button
        type="button"
        className="btn"
        onClick={() => {
          const grams = parseNum(ownGrams);
          if (!ownName.trim() || grams === undefined || grams <= 0) {
            setError('Впиши название и сколько в нём граммов белка.');
            return;
          }
          addFood(t, meal, ownName.trim(), grams);
          if (saveOwn) addFoodPreset({ name: ownName.trim(), unit: 'шт', per: grams, portion: 1 });
          setOwnName('');
          setOwnGrams('');
          toast('Добавлено', `${ownName.trim()} — ${num(grams)} г белка`);
        }}
      >
        <Icon name="plus" size={16} /> Добавить блюдо
      </button>

      {MEALS.map(({ value, label }) => {
        const list = entries.filter((e) => e.meal === value);
        if (!list.length) return null;
        const sum = Math.round(list.reduce((n, e) => n + e.protein, 0));
        return (
          <div key={value} className="stack">
            <div className="caps" style={{ fontSize: 11 }}>
              <span>{label}</span>
              <span className="accent">{sum} г</span>
            </div>
            {list.map((e) => (
              <div key={e.id} className="row" style={{ minHeight: 44, paddingLeft: 12 }}>
                <span className="grow ellipsis" style={{ fontSize: 14 }}>{e.name}</span>
                <span className="val">{num(e.protein)} г</span>
                <button type="button" className="icon-btn" style={{ color: 'var(--muted)', marginRight: -6 }} aria-label={`Удалить: ${e.name}`} onClick={() => deleteFood(t, e.id)}>
                  <Icon name="x" size={18} />
                </button>
              </div>
            ))}
          </div>
        );
      })}

      <Label>Норма</Label>
      <div className="field">
        <span>Грамм белка на кг веса</span>
        <Chips value={data.settings.proteinPerKg} onChange={(v) => setSettings({ proteinPerKg: v })} options={[1.4, 1.6, 1.8, 2].map((v) => ({ value: v, label: num(v) }))} />
      </div>
      {!Object.values(data.weeks).some((w) => w.weight) && (
        <label className="field">
          <span>Твой вес, кг — пока нет итогов недели</span>
          <input
            className="input"
            inputMode="decimal"
            defaultValue={data.settings.bodyWeight ? num(data.settings.bodyWeight) : ''}
            placeholder="60"
            onBlur={(e) => {
              const w = parseNum(e.target.value);
              if (w && w > 20) setSettings({ bodyWeight: w });
            }}
          />
        </label>
      )}
    </Sheet>
  );
}
