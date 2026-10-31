import { useMemo, useState } from 'react';
import { deleteCardio, deleteSession } from '../actions';
import { DAY_TITLE, EX } from '../data/program';
import { WD_SHORT, addDays, dayOfMonth, fmtDay, fmtMonth, programWeek, today, weekday } from '../lib/dates';
import { plural, setText } from '../lib/format';
import { analyze, bestOf, sessionXp } from '../lib/logic';
import type { Nav } from '../nav';
import type { AppData, Cardio, Session, WeekCheck } from '../store';
import { Check, Icon, Label, Seg, TopBar } from '../ui';
import { CARDIO_LABEL } from './Progress';

type Filter = 'all' | 'workout' | 'cardio' | 'summary';
type Entry =
  | { kind: 'workout'; date: string; at: number; s: Session }
  | { kind: 'cardio'; date: string; at: number; c: Cardio }
  | { kind: 'summary'; date: string; at: number; w: WeekCheck };

export function JournalScreen({ data, nav }: { data: AppData; nav: Nav }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const a = useMemo(() => analyze(data), [data]);
  const t = today();
  const start = data.profile!.startDate;
  const week = programWeek(start, t);
  const weekStart = addDays(start, (week - 1) * 7);

  const groups = useMemo(() => {
    const entries: Entry[] = [
      ...data.sessions.map((s) => ({ kind: 'workout' as const, date: s.date, at: s.startedAt, s })),
      ...data.cardio.map((c) => ({ kind: 'cardio' as const, date: c.date, at: 0, c })),
      ...Object.values(data.weeks).map((w) => ({ kind: 'summary' as const, date: w.date, at: Number.MAX_SAFE_INTEGER, w })),
    ];
    const byWeek = new Map<number, Entry[]>();
    for (const e of entries) {
      if (filter !== 'all' && e.kind !== filter) continue;
      const wk = e.kind === 'workout' ? e.s.week : e.kind === 'cardio' ? e.c.week : e.w.week;
      byWeek.set(wk, [...(byWeek.get(wk) ?? []), e]);
    }
    return [...byWeek.entries()]
      .sort((x, y) => y[0] - x[0])
      .map(([wk, list]) => ({ week: wk, list: list.sort((x, y) => (x.date === y.date ? y.at - x.at : x.date < y.date ? 1 : -1)) }));
  }, [data, filter]);

  const days = Array.from({ length: 7 }, (_, k) => addDays(weekStart, k));

  return (
    <>
      <TopBar
        left="Журнал"
        mid={fmtMonth(t)}
        right={
          <button type="button" className="icon-btn" aria-label="Добавить запись" onClick={() => nav.open({ type: 'add' })}>
            <Icon name="plus" size={22} stroke={1.6} />
          </button>
        }
      />
      <Seg
        label="Фильтр записей"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Все' },
          { value: 'workout', label: 'Сила' },
          { value: 'cardio', label: 'Кардио' },
          { value: 'summary', label: 'Итоги' },
        ]}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, textAlign: 'center' }}>
        {days.map((d) => {
          const letters = data.sessions.filter((s) => s.date === d && s.finishedAt).map((s) => s.day).join('');
          const hasCardio = data.cardio.some((c) => c.date === d);
          const isToday = d === t;
          const active = !!letters || hasCardio;
          return (
            <div
              key={d}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 0',
                borderRadius: 8,
                background: isToday ? 'var(--check-bg)' : active ? 'var(--card-2)' : 'none',
                border: `1px solid ${isToday ? 'var(--accent-line)' : active ? 'var(--line)' : '#1c232b'}`,
              }}
            >
              <span style={{ fontWeight: 500, fontSize: 11, letterSpacing: '0.08em', color: isToday ? 'var(--check-ink)' : 'var(--muted)' }}>{WD_SHORT[weekday(d)]}</span>
              <span style={{ fontWeight: active || isToday ? 600 : 500, fontSize: 16, color: active || isToday ? 'var(--text)' : 'var(--text-2)' }}>{dayOfMonth(d)}</span>
              <span style={{ fontWeight: 600, fontSize: 11, color: letters || hasCardio ? 'var(--accent)' : '#3a444f' }}>{letters ? letters + (hasCardio ? ' ·' : '') : hasCardio ? '·' : '—'}</span>
            </div>
          );
        })}
      </div>

      {groups.length === 0 && <div className="empty">Здесь появятся тренировки, кардио<br />и итоги недель.</div>}

      {groups.map((g) => (
        <div key={g.week} className="stack">
          <Label style={{ paddingTop: 4 }}>
            Неделя {g.week} · {fmtShortRange(addDays(start, (g.week - 1) * 7))}
          </Label>
          {g.list.map((e) => {
            if (e.kind === 'workout') {
              const s = e.s;
              const isOpen = open === s.id;
              const sets = s.exercises.reduce((n, x) => n + x.sets.length, 0);
              const minutes = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : null;
              return (
                <div key={s.id} className={`row${isOpen ? ' open' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', padding: 0, gap: 0 }}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '3px 12px 3px 3px', background: 'none', border: 0, textAlign: 'left', width: '100%' }}>
                    <span className="sq lg">{s.day}</span>
                    <span className="grow stack" style={{ gap: 1 }}>
                      <span className="date">{fmtDay(s.date)}{s.finishedAt ? '' : ' · идёт'}</span>
                      <span className="title strong">Тренировка {s.day} · {DAY_TITLE[s.day].toLowerCase()}</span>
                      <span className="meta-line">
                        {minutes !== null ? `${minutes} мин · ` : ''}{sets} {plural(sets, 'подход', 'подхода', 'подходов')} · +{sessionXp(s, a.prs)} XP
                      </span>
                    </span>
                    <Icon name="down" size={18} stroke={2} style={{ color: 'var(--text-2)', transform: isOpen ? 'rotate(180deg)' : undefined, flexShrink: 0 }} />
                  </button>
                  {isOpen && (
                    <div className="stack" style={{ margin: '4px 12px 12px', borderTop: '1px solid var(--line-3)', paddingTop: 6, gap: 0 }}>
                      {s.exercises.map((x) => {
                        const ex = EX(x.exId);
                        if (!ex) return null;
                        const top = bestOf(x.sets, ex);
                        return (
                          <div key={x.exId} style={{ display: 'flex', flexDirection: 'column', padding: '5px 0' }}>
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
                              text: `Тренировка ${s.day}, ${fmtDay(s.date).toLowerCase()}: все подходы и заметки удалятся, опыт пересчитается.`,
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
            if (e.kind === 'cardio') {
              const c = e.c;
              return (
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
                    <span className="date">{fmtDay(c.date)}</span>
                    <span className="title strong">{CARDIO_LABEL[c.kind]}</span>
                    <span className="meta-line">{c.minutes} мин</span>
                  </span>
                  <Check on />
                </button>
              );
            }
            const w = e.w;
            const chips = [
              { label: 'Вес', value: w.weight !== undefined ? String(w.weight).replace('.', ',') : '—' },
              { label: 'Сон', value: w.sleep ?? '—' },
              { label: 'Энергия', value: w.energy ?? '—' },
              { label: 'Отёк', value: w.edema ?? '—' },
            ];
            return (
              <button key={`w${w.week}`} type="button" className="card" style={{ padding: '3px 3px 10px', textAlign: 'left', color: 'inherit' }} onClick={() => nav.open({ type: 'week', week: w.week })}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="sq lg"><Icon name="calendar" size={20} stroke={1.6} /></span>
                  <span className="grow stack" style={{ gap: 1 }}>
                    <span className="date">{fmtDay(w.date)}</span>
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
        </div>
      ))}
    </>
  );
}

function fmtShortRange(monday: string): string {
  const end = addDays(monday, 6);
  return `${dayOfMonth(monday)} — ${dayOfMonth(end)} ${fmtDay(end).split(' ').pop()}`;
}
