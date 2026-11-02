import { useMemo, useState } from 'react';
import { deleteCardio, deleteSession } from '../actions';
import { EX } from '../data/program';
import { MEALS } from '../food';
import { WD_SHORT, addDays, dayOfMonth, fmtDay, fmtShort, iso, mondayOf, parse, rawWeek, today, weekday } from '../lib/dates';
import { num, plural, setText } from '../lib/format';
import { analyze, bestOf, sessionLetter, sessionTitle, sessionXp, setCount, type Analysis } from '../lib/logic';
import type { Nav } from '../nav';
import type { AppData, Session } from '../store';
import { Check, Icon, Label, MenuButton, Seg, TopBar } from '../ui';
import { CARDIO_LABEL } from './Progress';

type Mode = 'week' | 'month';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function addMonths(date: string, n: number): string {
  const d = parse(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return iso(d);
}

interface DayMark {
  letters: string;
  cardio: boolean;
  food: boolean;
}

export function JournalScreen({ data, nav }: { data: AppData; nav: Nav }) {
  const t = today();
  const [mode, setMode] = useState<Mode>('week');
  const [sel, setSel] = useState(t);
  const [open, setOpen] = useState<string | null>(null);
  const a = useMemo(() => analyze(data), [data]);

  const marks = useMemo(() => {
    const m = new Map<string, DayMark>();
    const get = (d: string) => m.get(d) ?? (m.set(d, { letters: '', cardio: false, food: false }), m.get(d)!);
    for (const s of data.sessions) if (s.finishedAt) get(s.date).letters += sessionLetter(s);
    for (const c of data.cardio) get(c.date).cardio = true;
    for (const [d, list] of Object.entries(data.food)) if (list.length) get(d).food = true;
    return m;
  }, [data]);

  const first = mode === 'week' ? mondayOf(sel) : mondayOf(`${sel.slice(0, 7)}-01`);
  const monthEnd = addDays(addMonths(`${sel.slice(0, 7)}-01`, 1), -1);
  const cells = mode === 'week' ? 7 : Math.ceil((parse(monthEnd).getTime() - parse(first).getTime()) / 86400000 / 7 + 1 / 7) * 7;
  const days = Array.from({ length: cells }, (_, k) => addDays(first, k));
  const inRange = mode === 'week' ? days : days.filter((d) => d.slice(0, 7) === sel.slice(0, 7));
  const [y, mo] = sel.split('-').map(Number);
  const rangeLabel = mode === 'week' ? `${fmtShort(days[0]).toLowerCase()} — ${fmtShort(days[6]).toLowerCase()}` : `${MONTHS[mo - 1]} ${y}`;
  const shift = (dir: 1 | -1) => setSel(mode === 'week' ? addDays(sel, dir * 7) : addMonths(sel, dir));

  const rangeSet = new Set(inRange);
  const workouts = data.sessions.filter((s) => s.finishedAt && rangeSet.has(s.date)).length;
  const cardioMin = data.cardio.filter((c) => rangeSet.has(c.date)).reduce((n, c) => n + c.minutes, 0);

  const daySessions = data.sessions.filter((s) => s.date === sel).sort((p, q) => p.startedAt - q.startedAt);
  const dayCardio = data.cardio.filter((c) => c.date === sel);
  const dayFood = data.food[sel] ?? [];
  const dayChecks = Object.values(data.weeks).filter((w) => w.date === sel);
  const empty = !daySessions.length && !dayCardio.length && !dayFood.length && !dayChecks.length;
  const raw = rawWeek(data.profile!.startDate, sel);
  const canCardio = sel === t || sel === addDays(t, -1);

  return (
    <>
      <TopBar
        left={<MenuButton label="Тренировки" onOpen={nav.menu} />}
        mid="Журнал"
        right={
          <button type="button" className="icon-btn" aria-label="Добавить запись" onClick={() => nav.open({ type: 'add' })}>
            <Icon name="plus" size={22} stroke={1.6} />
          </button>
        }
      />
      <Seg
        label="Период"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'week', label: 'Неделя' },
          { value: 'month', label: 'Месяц' },
        ]}
      />

      <div className="between" style={{ alignItems: 'center' }}>
        <button type="button" className="icon-btn" style={{ marginRight: 0, marginLeft: -8 }} aria-label={mode === 'week' ? 'Предыдущая неделя' : 'Предыдущий месяц'} onClick={() => shift(-1)}>
          <Icon name="left" />
        </button>
        <span className="stack" style={{ gap: 2, alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '0.08em' }}>{rangeLabel}</span>
          <span className="sub" style={{ fontSize: 12 }}>
            {workouts} {plural(workouts, 'тренировка', 'тренировки', 'тренировок')} · кардио {cardioMin} мин
          </span>
        </span>
        <button type="button" className="icon-btn" aria-label={mode === 'week' ? 'Следующая неделя' : 'Следующий месяц'} onClick={() => shift(1)}>
          <Icon name="right" />
        </button>
      </div>

      <div className="cal" role="grid" aria-label={rangeLabel}>
        {mode === 'month' && WD_SHORT.slice(1).concat(WD_SHORT[0]).map((w) => <span key={w} className="cal-head">{w}</span>)}
        {days.map((d) => {
          const m = marks.get(d);
          const outside = mode === 'month' && d.slice(0, 7) !== sel.slice(0, 7);
          const cls = ['cal-day', d === sel && 'sel', d === t && 'today', m && (m.letters || m.cardio) && 'active', outside && 'outside'].filter(Boolean).join(' ');
          return (
            <button key={d} type="button" className={cls} aria-pressed={d === sel} aria-label={fmtDay(d)} onClick={() => setSel(d)}>
              {mode === 'week' && <span className="cal-wd">{WD_SHORT[weekday(d)]}</span>}
              <span className="cal-num">{dayOfMonth(d)}</span>
              <span className="cal-mark">
                {m?.letters || (m?.cardio ? '·' : m?.food ? '◦' : '')}
                {m?.letters && m.cardio ? '·' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {sel !== t && (
        <button type="button" className="link-btn" style={{ minHeight: 32, marginTop: -6 }} onClick={() => setSel(t)}>
          Вернуться к сегодня
        </button>
      )}

      <Label style={{ paddingTop: 4 }}>
        {fmtDay(sel)}
        {sel === t ? ' · сегодня' : ''}
        {raw >= 1 && raw <= 16 ? ` · неделя ${raw}` : ''}
      </Label>

      {empty && (
        <div className="empty" style={{ padding: '18px 16px' }}>
          В этот день записей нет.
          <div className={canCardio ? 'grid2' : 'stack'} style={{ marginTop: 12 }}>
            <button type="button" className="btn small" onClick={() => nav.open({ type: 'food', date: sel })}>
              <Icon name="bowl" size={16} /> Питание
            </button>
            {canCardio && (
              <button type="button" className="btn small" onClick={() => nav.open({ type: 'cardio' })}>
                <Icon name="pulse" size={16} /> Кардио
              </button>
            )}
          </div>
        </div>
      )}

      {daySessions.map((s) => (
        <WorkoutCard key={s.id} s={s} a={a} isOpen={open === s.id} toggle={() => setOpen(open === s.id ? null : s.id)} nav={nav} />
      ))}

      {dayCardio.map((c) => (
        <button
          key={c.id}
          type="button"
          className="row with-check"
          onClick={() =>
            nav.open({
              type: 'confirm',
              title: 'Удалить запись',
              text: `${CARDIO_LABEL[c.kind]}, ${c.minutes} мин (${fmtDay(c.date).toLowerCase()}).`,
              action: 'Удалить',
              danger: true,
              onConfirm: () => deleteCardio(c.id),
            })
          }
        >
          <span className="sq lg"><Icon name="pulse" size={18} /></span>
          <span className="grow stack" style={{ gap: 1 }}>
            <span className="title strong">{CARDIO_LABEL[c.kind]}</span>
            <span className="meta-line">{c.minutes} мин</span>
          </span>
          <Check on />
        </button>
      ))}

      {dayFood.length > 0 && (
        <section className="card" style={{ gap: 8 }}>
          <div className="between" style={{ alignItems: 'center' }}>
            <Label>Питание</Label>
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, padding: 0, background: 'none', border: 0, color: 'var(--accent)', fontSize: 13 }} onClick={() => nav.open({ type: 'food', date: sel })}>
              Изменить <Icon name="pen" size={14} />
            </button>
          </div>
          <span className="sub" style={{ marginTop: -2 }}>
            Белок {Math.round(dayFood.reduce((n, f) => n + f.protein, 0))} г · {Math.round(dayFood.reduce((n, f) => n + (f.kcal ?? 0), 0))} ккал
          </span>
          {MEALS.map(({ value, label }) => {
            const list = dayFood.filter((f) => f.meal === value);
            if (!list.length) return null;
            return (
              <div key={value} className="stack" style={{ gap: 2 }}>
                <span className="caps" style={{ fontSize: 11 }}>{label}</span>
                {list.map((f) => (
                  <div key={f.id} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                    <span className="grow ellipsis">{f.name}</span>
                    <span style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {num(f.protein)} г{f.kcal !== undefined ? ` · ${f.kcal} ккал` : ''}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}
      {!empty && !dayFood.length && (
        <button type="button" className="btn" onClick={() => nav.open({ type: 'food', date: sel })}>
          <Icon name="bowl" size={16} /> Питание за этот день
        </button>
      )}

      {dayChecks.map((w) => {
        const chips = [
          { label: 'Вес', value: w.weight !== undefined ? num(w.weight) : '—' },
          { label: 'Сон', value: w.sleep ?? '—' },
          { label: 'Энергия', value: w.energy ?? '—' },
          { label: 'Отёк', value: w.edema ?? '—' },
        ];
        return (
          <button key={`w${w.week}`} type="button" className="card" style={{ padding: '3px 3px 10px', textAlign: 'left', color: 'inherit' }} onClick={() => nav.open({ type: 'week', week: w.week })}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="sq lg"><Icon name="calendar" size={20} stroke={1.6} /></span>
              <span className="grow stack" style={{ gap: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Итоги недели {w.week}</span>
                {w.note && <span className="sub ellipsis">{w.note}</span>}
              </span>
            </span>
            <span style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, padding: '0 7px' }}>
              {chips.map((ch) => (
                <span key={ch.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0', borderRadius: 8, background: 'var(--inner)', border: '1px solid var(--line-2)' }}>
                  <span style={{ fontWeight: 500, fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>{ch.label}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{ch.value}</span>
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </>
  );
}

function WorkoutCard({ s, a, isOpen, toggle, nav }: { s: Session; a: Analysis; isOpen: boolean; toggle: () => void; nav: Nav }) {
  const sets = s.exercises.reduce((n, x) => n + setCount(x.sets), 0);
  const minutes = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : null;
  return (
    <div className={`row${isOpen ? ' open' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', padding: 0, gap: 0 }}>
      <button type="button" aria-expanded={isOpen} onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '3px 12px 3px 3px', background: 'none', border: 0, textAlign: 'left', width: '100%' }}>
        <span className="sq lg">{sessionLetter(s)}</span>
        <span className="grow stack" style={{ gap: 1 }}>
          <span className="title strong ellipsis">{sessionTitle(s)}{s.finishedAt ? '' : ' · идёт'}</span>
          <span className="meta-line">
            {minutes !== null ? `${minutes} мин · ` : ''}
            {sets} {plural(sets, 'подход', 'подхода', 'подходов')} · +{sessionXp(s, a.prs)} XP
          </span>
        </span>
        <Icon name="down" size={18} stroke={2} style={{ color: 'var(--text-2)', transform: isOpen ? 'rotate(180deg)' : undefined, flexShrink: 0 }} />
      </button>
      {isOpen && (
        <div className="stack" style={{ margin: '4px 12px 12px', borderTop: '1px solid var(--line-3)', paddingTop: 6, gap: 0 }}>
          {s.exercises.map((x, k) => {
            const ex = EX(x.exId);
            if (!ex) return null;
            const top = bestOf(x.sets, ex);
            return (
              <div key={`${x.exId}-${k}`} style={{ display: 'flex', flexDirection: 'column', padding: '5px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="grow ellipsis" style={{ fontSize: 13, color: top ? 'var(--text-3)' : 'var(--muted)' }}>{ex.name}</span>
                  {a.prs.has(`${s.id}:${x.exId}`) && <span className="badge">Рекорд</span>}
                  <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', color: top ? 'var(--text)' : 'var(--muted)' }}>{top ? setText(top, ex) : x.skipped ? 'пропущено' : '—'}</span>
                </div>
                {x.note && (
                  <div className="note-box" style={{ marginTop: 6 }}>
                    <Icon name="pen" size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent)' }} />
                    <span>{x.note}</span>
                  </div>
                )}
              </div>
            );
          })}
          {s.finishedAt && (
            <button
              type="button"
              className="btn small danger"
              style={{ marginTop: 10 }}
              onClick={() =>
                nav.open({
                  type: 'confirm',
                  title: 'Удалить тренировку',
                  text: `${sessionTitle(s)}, ${fmtDay(s.date).toLowerCase()}: все подходы и заметки удалятся, опыт пересчитается.`,
                  action: 'Удалить',
                  danger: true,
                  onConfirm: () => deleteSession(s.id),
                })
              }
            >
              <Icon name="trash" size={16} /> Удалить тренировку
            </button>
          )}
        </div>
      )}
    </div>
  );
}
