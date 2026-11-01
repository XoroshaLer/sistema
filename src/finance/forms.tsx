import { useState, type ReactNode } from 'react';
import { today } from '../lib/dates';
import { num, parseNum } from '../lib/format';
import type { FinForm, Nav } from '../nav';
import type { AppData } from '../store';
import { Chips, Icon, Label, Sheet } from '../ui';
import { addCustomTask, addIncome, deleteItem, saveItem, setFinance, type Debt, type Goal, type IncomeSource, type Obligation } from './model';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <span className="sub" style={{ fontSize: 12 }}>{hint}</span>}
    </label>
  );
}

function Text({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function Num({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="input" inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

const str = (n?: number) => (n === undefined ? '' : num(n));

function Actions({ onSave, onDelete, error }: { onSave: () => void; onDelete?: () => void; error?: string }) {
  return (
    <>
      {error && <span className="sub" style={{ color: '#f0a8a8' }}>{error}</span>}
      <button type="button" className="cta" onClick={onSave}>
        Сохранить <Icon name="check" />
      </button>
      {onDelete && (
        <button type="button" className="btn danger" onClick={onDelete}>
          <Icon name="trash" size={16} /> Удалить
        </button>
      )}
    </>
  );
}

const TAX_OPTIONS = [
  { value: 'none', label: 'Без налога' },
  { value: '4', label: '4%' },
  { value: '6', label: '6%' },
  { value: 'own', label: 'Своя' },
];

function TaxPicker({ rate, onChange }: { rate: string; onChange: (r: string) => void }) {
  const preset = rate === '0' ? 'none' : rate === '4' || rate === '6' ? rate : 'own';
  return (
    <Field label="Налог с этого дохода" hint="Самозанятые: 4% с оплат от людей, 6% — от компаний и ИП. «Без налога» — если приходит уже после налога.">
      <Chips text value={preset} onChange={(v) => onChange(v === 'none' ? '0' : v === 'own' ? '' : v)} options={TAX_OPTIONS} />
      {preset === 'own' && <Num value={rate} onChange={onChange} placeholder="Ставка, %" />}
    </Field>
  );
}

function SourceForm({ item, close }: { item?: IncomeSource; close: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [amount, setAmount] = useState(str(item?.amount));
  const [rate, setRate] = useState(item ? String(Math.round(item.taxRate * 1000) / 10) : '6');
  const [day, setDay] = useState(str(item?.day));
  const [error, setError] = useState('');
  return (
    <>
      <Field label="Название"><Text value={name} onChange={setName} placeholder="Основная работа" /></Field>
      <Field label="Сколько в месяц, ₽" hint="Сумма до налога. В бюджете месяца её можно поправить."><Num value={amount} onChange={setAmount} placeholder="90 000" /></Field>
      <TaxPicker rate={rate} onChange={setRate} />
      <Field label="День выплаты" hint="Необязательно. В этот день появятся взносы в цели."><Num value={day} onChange={setDay} placeholder="5" /></Field>
      <Actions
        error={error}
        onSave={() => {
          const a = parseNum(amount);
          const r = parseNum(rate) ?? 0;
          if (!name.trim() || !a || a <= 0) return setError('Впиши название и сумму.');
          const d = parseNum(day);
          saveItem('sources', { id: item?.id, name: name.trim(), amount: a, taxRate: r / 100, day: d ? Math.min(31, Math.max(1, Math.round(d))) : undefined });
          close();
        }}
        onDelete={item ? () => (deleteItem('sources', item.id), close()) : undefined}
      />
    </>
  );
}

function ObligationForm({ item, presetName, close }: { item?: Obligation; presetName?: string; close: () => void }) {
  const [name, setName] = useState(item?.name ?? presetName ?? '');
  const [mode, setMode] = useState<'sum' | 'pct'>(item?.percent ? 'pct' : 'sum');
  const [amount, setAmount] = useState(str(item?.amount || undefined));
  const [pct, setPct] = useState(str(item?.percent));
  const [day, setDay] = useState(str(item?.day));
  const [remind, setRemind] = useState(item?.remind ?? true);
  const [error, setError] = useState('');
  return (
    <>
      <Field label="Название"><Text value={name} onChange={setName} placeholder="Аренда" /></Field>
      <Field label="Сколько">
        <Chips text value={mode} onChange={setMode} options={[{ value: 'sum', label: 'Сумма' }, { value: 'pct', label: '% от дохода' }]} />
      </Field>
      {mode === 'sum' ? (
        <Field label="Сумма в месяц, ₽"><Num value={amount} onChange={setAmount} placeholder="30 000" /></Field>
      ) : (
        <Field label="Процент от дохода после налога" hint="Например, если отдаёшь маме часть заработка."><Num value={pct} onChange={setPct} placeholder="10" /></Field>
      )}
      <Field label="День платежа"><Num value={day} onChange={setDay} placeholder="10" /></Field>
      <Field label="Задание месяца">
        <Chips text value={remind ? 'y' : 'n'} onChange={(v) => setRemind(v === 'y')} options={[{ value: 'y', label: 'Напоминать' }, { value: 'n', label: 'Не нужно' }]} />
      </Field>
      <Actions
        error={error}
        onSave={() => {
          const a = mode === 'sum' ? parseNum(amount) : 0;
          const p = mode === 'pct' ? parseNum(pct) : undefined;
          if (!name.trim() || (mode === 'sum' ? !a || a <= 0 : !p || p <= 0)) return setError('Впиши название и сумму или процент.');
          const d = parseNum(day);
          saveItem('obligations', { id: item?.id, name: name.trim(), amount: a ?? 0, percent: p, day: d ? Math.min(31, Math.max(1, Math.round(d))) : undefined, remind });
          close();
        }}
        onDelete={item ? () => (deleteItem('obligations', item.id), close()) : undefined}
      />
    </>
  );
}

function DebtForm({ item, presetName, close }: { item?: Debt; presetName?: string; close: () => void }) {
  const [kind, setKind] = useState<Debt['kind']>(item?.kind ?? (presetName === 'card' ? 'card' : 'loan'));
  const [name, setName] = useState(item?.name ?? '');
  const [balance, setBalance] = useState(str(item?.balance));
  const [rate, setRate] = useState(str(item?.rate));
  const [payment, setPayment] = useState(str(item?.payment));
  const [day, setDay] = useState(str(item?.day));
  const [error, setError] = useState('');
  return (
    <>
      <span className="sub">Цифры — из договора или приложения банка. Раз в месяц будет задание сверить остаток.</span>
      <Field label="Тип">
        <Chips text value={kind} onChange={setKind} options={[{ value: 'loan', label: 'Кредит' }, { value: 'card', label: 'Кредитная карта' }]} />
      </Field>
      <Field label="Название"><Text value={name} onChange={setName} placeholder={kind === 'card' ? 'Кредитная карта' : 'Кредит наличными'} /></Field>
      <Field label="Осталось выплатить, ₽"><Num value={balance} onChange={setBalance} placeholder="118 000" /></Field>
      <Field label="Ставка, % годовых"><Num value={rate} onChange={setRate} placeholder="21" /></Field>
      <Field label={kind === 'card' ? 'Минимальный платёж, ₽' : 'Ежемесячный платёж по графику, ₽'}><Num value={payment} onChange={setPayment} placeholder="8 000" /></Field>
      <Field label="День платежа"><Num value={day} onChange={setDay} placeholder="15" /></Field>
      <Actions
        error={error}
        onSave={() => {
          const b = parseNum(balance);
          const r = parseNum(rate);
          const p = parseNum(payment);
          const d = parseNum(day);
          if (!b || b <= 0 || r === undefined || !p || p <= 0 || !d) return setError('Заполни остаток, ставку, платёж и день.');
          saveItem('debts', {
            id: item?.id,
            kind,
            name: name.trim() || (kind === 'card' ? 'Кредитная карта' : 'Кредит'),
            balance: b,
            startBalance: Math.max(b, item?.startBalance ?? 0),
            rate: r,
            payment: p,
            day: Math.min(31, Math.max(1, Math.round(d))),
          });
          close();
        }}
        onDelete={item ? () => (deleteItem('debts', item.id), close()) : undefined}
      />
    </>
  );
}

function GoalForm({ item, presetName, close }: { item?: Goal; presetName?: string; close: () => void }) {
  const [name, setName] = useState(item?.name ?? presetName ?? '');
  const [target, setTarget] = useState(str(item?.target));
  const [saved, setSaved] = useState(str(item?.saved));
  const [deadline, setDeadline] = useState(item?.deadline ?? '');
  const [error, setError] = useState('');
  return (
    <>
      <Field label="Название"><Text value={name} onChange={setName} placeholder="Подушка безопасности" /></Field>
      <Field label="Сколько нужно, ₽" hint={name.toLowerCase().includes('подушк') ? 'Обычно подушка — это 3–6 месяцев обязательных трат.' : undefined}><Num value={target} onChange={setTarget} placeholder="120 000" /></Field>
      <Field label="Уже есть, ₽"><Num value={saved} onChange={setSaved} placeholder="0" /></Field>
      <Field label="К какому сроку" hint="Необязательно. Со сроком Система посчитает взнос, чтобы успеть.">
        <input className="input" type="month" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <Actions
        error={error}
        onSave={() => {
          const t = parseNum(target);
          if (!name.trim() || !t || t <= 0) return setError('Впиши название и сумму цели.');
          saveItem('goals', { id: item?.id, name: name.trim(), target: t, saved: parseNum(saved) ?? 0, deadline: deadline || undefined });
          close();
        }}
        onDelete={item ? () => (deleteItem('goals', item.id), close()) : undefined}
      />
    </>
  );
}

function IncomeForm({ data, close, toast }: { data: AppData; close: () => void; toast: Nav['toast'] }) {
  const sources = data.finance?.sources ?? [];
  const [src, setSrc] = useState('other');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('4');
  const [date, setDate] = useState(today());
  const [error, setError] = useState('');
  return (
    <>
      <span className="sub">Разовый доход сверх плана — например, репетиторство. Он добавится к бюджету месяца и разойдётся по той же стратегии.</span>
      {sources.length > 0 && (
        <Field label="Откуда">
          <Chips
            text
            value={src}
            onChange={(v) => {
              setSrc(v);
              const s = sources.find((x) => x.id === v);
              if (s) setRate(String(Math.round(s.taxRate * 1000) / 10));
            }}
            options={[...sources.slice(0, 2).map((s) => ({ value: s.id, label: s.name })), { value: 'other', label: 'Другое' }]}
          />
        </Field>
      )}
      {src === 'other' && <Field label="Название"><Text value={name} onChange={setName} placeholder="Репетиторство" /></Field>}
      <Field label="Сумма, ₽"><Num value={amount} onChange={setAmount} placeholder="3 000" /></Field>
      <TaxPicker rate={rate} onChange={setRate} />
      <Field label="Дата"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Actions
        error={error}
        onSave={() => {
          const a = parseNum(amount);
          const title = src === 'other' ? name.trim() : sources.find((s) => s.id === src)?.name ?? '';
          if (!title || !a || a <= 0) return setError('Впиши, откуда доход, и сумму.');
          addIncome(title, a, (parseNum(rate) ?? 0) / 100, date || today());
          close();
          toast('Доход добавлен', `${title}: ${num(a)} ₽`);
        }}
      />
    </>
  );
}

function TaskForm({ close }: { close: () => void }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState('');
  return (
    <>
      <Field label="Что сделать"><Text value={title} onChange={setTitle} placeholder="Оплатить страховку" /></Field>
      <Field label="Сумма, ₽ — если есть"><Num value={amount} onChange={setAmount} placeholder="5 000" /></Field>
      <Field label="Срок"><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <Actions
        error={error}
        onSave={() => {
          if (!title.trim()) return setError('Впиши, что нужно сделать.');
          addCustomTask(title.trim(), parseNum(amount), due || undefined);
          close();
        }}
      />
    </>
  );
}

function FinSettings({ data, nav, close }: { data: AppData; nav: Nav; close: () => void }) {
  const f = data.finance;
  if (!f) return null;
  return (
    <>
      <Field label="Налог плачу">
        <Chips text value={f.taxMode} onChange={(v) => setFinance({ taxMode: v })} options={[{ value: 'monthly', label: 'Каждый месяц' }, { value: 'quarterly', label: 'Раз в квартал' }]} />
      </Field>
      <span className="sub" style={{ marginTop: -6 }}>
        {f.taxMode === 'monthly' ? 'Как у самозанятых: налог за месяц — до 28 числа следующего.' : 'Как у ИП на упрощёнке: каждый месяц откладываешь, платишь по итогам квартала.'}
      </span>
      <Label>Источники дохода</Label>
      <div className="stack">
        {f.sources.map((s) => (
          <button key={s.id} type="button" className="row" onClick={() => nav.open({ type: 'fin', form: 'source', id: s.id })}>
            <span className="sq"><Icon name="coins" size={18} /></span>
            <span className="grow stack" style={{ gap: 0 }}>
              <span className="title">{s.name}</span>
              <span className="sub">{num(s.amount)} ₽ в месяц · налог {num(Math.round(s.taxRate * 1000) / 10)}%</span>
            </span>
          </button>
        ))}
        <button type="button" className="btn" onClick={() => nav.open({ type: 'fin', form: 'source' })}>
          <Icon name="plus" size={16} /> Источник дохода
        </button>
      </div>
      <button
        type="button"
        className="link-btn"
        onClick={() => {
          setFinance({ setupDone: false });
          close();
        }}
      >
        Пройти настройку заново
      </button>
    </>
  );
}

const TITLES: Record<FinForm, string> = {
  source: 'Доход',
  obligation: 'Обязательный платёж',
  debt: 'Долг',
  goal: 'Цель накопления',
  income: 'Новый доход',
  task: 'Своё задание',
  settings: 'Настройки финансов',
};

export function FinSheet({ data, form, id, name, nav, close }: { data: AppData; form: FinForm; id?: string; name?: string; nav: Nav; close: () => void }) {
  const f = data.finance;
  let body: ReactNode = null;
  if (form === 'source') body = <SourceForm item={f?.sources.find((x) => x.id === id)} close={close} />;
  if (form === 'obligation') body = <ObligationForm item={f?.obligations.find((x) => x.id === id)} presetName={name} close={close} />;
  if (form === 'debt') body = <DebtForm item={f?.debts.find((x) => x.id === id)} presetName={name} close={close} />;
  if (form === 'goal') body = <GoalForm item={f?.goals.find((x) => x.id === id)} presetName={name} close={close} />;
  if (form === 'income') body = <IncomeForm data={data} close={close} toast={nav.toast} />;
  if (form === 'task') body = <TaskForm close={close} />;
  if (form === 'settings') body = <FinSettings data={data} nav={nav} close={close} />;
  return (
    <Sheet title={TITLES[form]} onClose={close}>
      {body}
    </Sheet>
  );
}
