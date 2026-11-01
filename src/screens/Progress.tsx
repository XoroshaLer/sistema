import { useMemo, useRef, useState } from 'react';
import { deleteCardio, exportData } from '../actions';
import { BarChart, LineChart, MiniBars } from '../charts';
import { EX, EXERCISE_ORDER, blockOf, customIds, dayOf } from '../data/program';
import { fmtDay, programWeek, today } from '../lib/dates';
import { num, setText } from '../lib/format';
import { analyze, cardioTarget, cardioWeek, weeklyBest } from '../lib/logic';
import type { Nav } from '../nav';
import type { AppData, CardioKind, WeekCheck } from '../store';
import { Bar, Check, Icon, Label, Seg, TopBar } from '../ui';

type Tab = 'str' | 'body' | 'cardio';

export const CARDIO_LABEL: Record<CardioKind, string> = {
  afterB: 'После тренировки B',
  afterD: 'После тренировки D',
  walk: 'Прогулка или плавание',
  other: 'Другая активность',
};

export function ProgressScreen({ data, nav }: { data: AppData; nav: Nav }) {
  const [tab, setTab] = useState<Tab>('str');
  const week = programWeek(data.profile!.startDate, today());
  const states = Array.from({ length: 16 }, (_, k) => (k + 1 <= week ? 'on' : 'future') as 'on' | 'future');
  return (
    <>
      <TopBar
        left="Прогресс"
        mid={`Блок ${blockOf(week)} · нед. ${week}`}
        right={
          <button
            type="button"
            className="icon-btn"
            aria-label="Выгрузить данные"
            onClick={async () => {
              if ((await exportData()) === 'saved') nav.toast('Копия сохранена', 'Файл с данными можно хранить в «Файлах» или iCloud Drive');
            }}
          >
            <Icon name="download" />
          </button>
        }
      />
      <div className="stack">
        <div className="caps">
          <span>Программа · 16 недель</span>
          <span>{week} / 16</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[0, 8].map((from) => (
            <div key={from} className="segbar" style={{ flex: 1, gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 3 }}>
              {states.slice(from, from + 8).map((s, k) => <i key={k} className={s} />)}
            </div>
          ))}
        </div>
      </div>
      <Seg
        label="Раздел прогресса"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'str', label: 'Сила' },
          { value: 'body', label: 'Тело' },
          { value: 'cardio', label: 'Кардио' },
        ]}
      />
      {tab === 'str' && <Strength data={data} week={week} nav={nav} />}
      {tab === 'body' && <Body data={data} week={week} nav={nav} />}
      {tab === 'cardio' && <CardioTab data={data} week={week} nav={nav} />}
    </>
  );
}

function deltaText(exId: string, a: ReturnType<typeof analyze>): string {
  const ex = EX(exId)!;
  const first = a.first.get(exId);
  const best = a.best.get(exId);
  if (!first || !best) return '';
  if (best.w !== first.set.w) {
    const d = best.w - first.set.w;
    return ex.assisted ? `−${num(Math.abs(d))} кг помощи` : `${d > 0 ? '+' : '−'}${num(Math.abs(d))} кг`;
  }
  if (best.r !== first.set.r) return `+${best.r - first.set.r} повт.`;
  return 'старт';
}

function Strength({ data, week, nav }: { data: AppData; week: number; nav: Nav }) {
  const a = useMemo(() => analyze(data), [data]);
  const ids = [...EXERCISE_ORDER, ...customIds()].filter((id) => a.best.has(id));
  const latest = useMemo(() => {
    const s = [...data.sessions].sort((x, y) => y.startedAt - x.startedAt).find((x) => x.exercises.some((e) => e.sets.length));
    return s?.exercises.find((e) => e.sets.length)?.exId;
  }, [data]);
  const [picked, setPicked] = useState<string | undefined>();
  const heroRef = useRef<HTMLElement>(null);
  const sel = picked && a.best.has(picked) ? picked : latest;

  if (!sel) {
    return <div className="empty">Запиши первую тренировку —<br />здесь появятся рекорды и графики силы.</div>;
  }
  const ex = EX(sel)!;
  const best = a.best.get(sel)!;
  const first = a.first.get(sel)!;
  // Bodyweight exercises without extra load are charted by reps.
  const points = weeklyBest(data, sel).map((p) => ({ week: p.week, value: ex.bodyweight && p.set.w === 0 ? p.set.r : p.set.w }));

  return (
    <>
      <section className="card" ref={heroRef} style={{ gap: 6 }}>
        <div className="between" style={{ alignItems: 'center' }}>
          <Label>Лучший подход</Label>
          <button type="button" className="t-left" style={{ fontSize: 13, letterSpacing: 0, textTransform: 'none', background: 'none', border: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, minHeight: 36 }} onClick={() => nav.open({ type: 'picker', ids, onPick: setPicked })}>
            Сменить <Icon name="down" size={14} stroke={2} />
          </button>
        </div>
        <span className="h2">{ex.name}</span>
        <div className="between">
          <span className="big">{setText(best, ex)}</span>
          <span className="meta">{deltaText(sel, a)}{first.week !== week ? ` с нед. ${first.week}` : ''}</span>
        </div>
        {points.length > 0 && <LineChart points={points} current={week} label={`${ex.name}: лучший подход по неделям`} />}
        {ex.assisted && <span className="sub">В гравитроне меньше помощь — сильнее ты.</span>}
      </section>

      <Label>Рекорды</Label>
      <div className="stack">
        {ids.map((id) => {
          const e = EX(id)!;
          return (
            <button
              key={id}
              type="button"
              className={`row${id === sel ? ' open' : ''}`}
              onClick={() => {
                setPicked(id);
                heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className="sq">{dayOf(id) ?? <Icon name="user" size={16} />}</span>
              <span className="grow stack" style={{ gap: 0 }}>
                <span className="title ellipsis" style={{ fontSize: 14 }}>{e.name}</span>
                <span className="sub">{setText(a.best.get(id)!, e)}</span>
              </span>
              <span className="val accent">{deltaText(id, a)}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function weekValues(data: AppData, pick: (w: WeekCheck) => number | undefined): Map<number, number> {
  const m = new Map<number, number>();
  for (const w of Object.values(data.weeks)) {
    const v = pick(w);
    if (v !== undefined) m.set(w.week, v);
  }
  return m;
}

function Body({ data, week, nav }: { data: AppData; week: number; nav: Nav }) {
  const weights = [...weekValues(data, (w) => w.weight).entries()].sort((x, y) => x[0] - y[0]);
  const base = weights[0]?.[1];
  const latest = weights[weights.length - 1];
  const prev = weights[weights.length - 2];
  const inBand = latest && base !== undefined && Math.abs(latest[1] - base) <= 1;
  const sleep = weekValues(data, (w) => w.sleep);
  const energy = weekValues(data, (w) => w.energy);
  const edema = weekValues(data, (w) => w.edema);
  const lastOf = (m: Map<number, number>) => {
    const k = Math.max(...m.keys());
    return Number.isFinite(k) ? m.get(k) : undefined;
  };
  const edemaWeeks = [...edema.entries()].sort((x, y) => x[0] - y[0]).slice(-2);
  const edemaPersists = edemaWeeks.length === 2 && edemaWeeks.every(([, v]) => v >= 2);
  const measured = Object.values(data.weeks).filter((w) => w.waist || w.hips || w.thigh).sort((x, y) => x.week - y.week);
  const lastMeasure = measured[measured.length - 1];
  const nextMeasure = [1, 8, 16].find((w) => w >= week && !measured.some((m) => m.week === w));
  const thisWeek = data.weeks[String(week)];

  return (
    <>
      <section className="card" style={{ gap: 6 }}>
        <div className="between" style={{ alignItems: 'center' }}>
          <Label>Средний вес</Label>
          {latest && (
            <span className="badge">
              {inBand && <Icon name="check" size={12} stroke={3} />}
              {inBand ? 'Стабильно' : 'Вне коридора'}
            </span>
          )}
        </div>
        {latest && base !== undefined ? (
          <>
            <span className="big">{num(latest[1])} <small>кг</small></span>
            <span className="sub">
              {prev ? `${latest[1] - prev[1] >= 0 ? '+' : '−'}${num(Math.abs(latest[1] - prev[1]))} кг к неделе ${prev[0]} · ` : ''}
              коридор ±1 кг от {num(base)} кг
            </span>
            <LineChart points={weights.map(([w, v]) => ({ week: w, value: v }))} current={week} band={[base - 1, base + 1]} label="Средний вес по неделям внутри коридора плюс-минус 1 кг" />
          </>
        ) : (
          <span className="sub">Заполни итоги недели — здесь появится вес и коридор ±1 кг. Цель программы — сохранить вес, стабильность = успех.</span>
        )}
      </section>

      <div className="grid3">
        {[
          { name: 'Сон', m: sleep, max: 5 },
          { name: 'Энергия', m: energy, max: 5 },
          { name: 'Отёк', m: edema, max: 3 },
        ].map(({ name, m, max }) => (
          <div key={name} className="mini-stat">
            <span className="caps" style={{ fontSize: 11 }}>{name}</span>
            <span className="v">{lastOf(m) ?? '—'} <small>/ {max}</small></span>
            <MiniBars values={m} current={week} max={max} />
          </div>
        ))}
      </div>

      {edemaPersists && (
        <div className="note-box warn">
          <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Отёк держится вторую неделю. В твоей программе это повод для очной оценки у врача — тренировки не заменяют диагностику.</span>
        </div>
      )}

      <button type="button" className="row with-check" onClick={() => nav.open({ type: 'week', week })}>
        <span className="sq lg"><Icon name="calendar" size={20} stroke={1.6} /></span>
        <span className="grow stack" style={{ gap: 0 }}>
          <span className="title">Итоги недели {week}</span>
          <span className="sub">Вес, сон, энергия, отёк — 1 минута</span>
        </span>
        <Check on={!!thisWeek} />
      </button>

      <div className="row">
        <span className="sq lg"><Icon name="ruler" size={20} stroke={1.6} /></span>
        <span className="grow stack" style={{ gap: 0 }}>
          <span className="title">Замеры: талия, бёдра, бедро</span>
          <span className="sub">
            {lastMeasure
              ? `Нед. ${lastMeasure.week}: ${[lastMeasure.waist, lastMeasure.hips, lastMeasure.thigh].map((v) => (v ? num(v) : '—')).join(' · ')} см`
              : 'По желанию в неделях 1, 8 и 16'}
          </span>
        </span>
        {nextMeasure && <span className="val accent">{nextMeasure === week ? 'сейчас' : `нед. ${nextMeasure}`}</span>}
      </div>
    </>
  );
}

function CardioTab({ data, week, nav }: { data: AppData; week: number; nav: Nav }) {
  const minutes = cardioWeek(data, week);
  const target = cardioTarget(week);
  const perWeek = new Map<number, number>();
  for (const c of data.cardio) perWeek.set(c.week, (perWeek.get(c.week) ?? 0) + c.minutes);
  const entries = data.cardio.filter((c) => c.week === week).sort((x, y) => (x.date < y.date ? 1 : -1));
  return (
    <>
      <section className="card" style={{ gap: 6 }}>
        <Label>Кардио за неделю</Label>
        <div className="between">
          <span className="big" style={{ fontSize: 34 }}>{minutes} <small style={{ fontWeight: 400, color: 'var(--text-2)' }}>/ {target} мин</small></span>
          <span className="meta">{minutes >= target ? 'Цель недели' : `Осталось ${target - minutes}`}</span>
        </div>
        <Bar value={minutes / target} />
        <BarChart values={perWeek} target={cardioTarget} current={week} label={`Минуты кардио по неделям, на этой неделе ${minutes} из ${target}`} />
        <span className="sub">Цель растёт постепенно — от 60 до 150 минут к концу программы. Быстрая ходьба тоже считается. Кардио не ради дефицита.</span>
      </section>
      <button type="button" className="cta" onClick={() => nav.open({ type: 'cardio' })}>
        Записать кардио <Icon name="plus" />
      </button>
      {entries.length > 0 && (
        <div className="stack">
          <Label>Эта неделя</Label>
          {entries.map((c) => (
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
              <span className="sq">{c.kind === 'afterB' ? 'B' : c.kind === 'afterD' ? 'D' : <Icon name="walk" size={18} />}</span>
              <span className="grow stack" style={{ gap: 0 }}>
                <span className="title">{CARDIO_LABEL[c.kind]}</span>
                <span className="sub">{fmtDay(c.date)}</span>
              </span>
              <span className="val">{c.minutes} мин</span>
              <Check on />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
