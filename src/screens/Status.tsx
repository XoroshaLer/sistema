import { useMemo } from 'react';
import { startSession } from '../actions';
import { DAY_TITLE, EX, blockOf } from '../data/program';
import { fmtDay, programWeek, rawWeek, today } from '../lib/dates';
import { plural } from '../lib/format';
import {
  analyze,
  cardioTarget,
  cardioWeek,
  dayPlan,
  estimateMinutes,
  estimateXp,
  kcalOn,
  kcalOnTarget,
  kcalTarget,
  nextDay,
  proteinOn,
  proteinTarget,
  sessionPhoto,
  weekWorkouts,
} from '../lib/logic';
import type { Nav } from '../nav';
import type { AppData } from '../store';
import { Bar, Check, Hero, Icon, Label, SegBar, TopBar, MenuButton } from '../ui';

export function StatusScreen({ data, nav }: { data: AppData; nav: Nav }) {
  const profile = data.profile!;
  const t = today();
  const raw = rawWeek(profile.startDate, t);
  const week = programWeek(profile.startDate, t);
  const a = useMemo(() => analyze(data), [data]);
  const done = weekWorkouts(data, week);
  const goal = data.settings.weeklyTarget;
  const active = data.activeId ? data.sessions.find((s) => s.id === data.activeId) : undefined;
  const next = nextDay(data);
  const plan = dayPlan(data, blockOf(week), next);
  const cardio = cardioWeek(data, week);
  const target = cardioTarget(week);
  const protein = proteinOn(data, t);
  const proteinGoal = proteinTarget(data).target;
  const kcal = kcalOn(data, t);
  const kcalGoal = kcalTarget(data).target;

  const weekLine = raw < 1 ? `Старт через ${1 - raw} нед.` : raw > 16 ? 'Программа пройдена' : `Неделя ${week} / 16`;

  return (
    <>
      <TopBar
        left={<MenuButton label="Тренировки" onOpen={nav.menu} />}
        mid={fmtDay(t)}
        right={
          <button type="button" className="icon-btn" aria-label="Настройки" onClick={() => nav.open({ type: 'settings' })}>
            <Icon name="gear" />
          </button>
        }
      />

      <div className="stack">
        <div className="caps">
          <span>{weekLine}</span>
          <span>Тренировки {done} / {goal}</span>
        </div>
        <SegBar states={Array.from({ length: Math.max(goal, done) }, (_, i) => (i < done ? 'on' : ''))} />
      </div>

      <section className="card">
        <Label>{profile.name}</Label>
        <div className="between">
          <span style={{ fontWeight: 700, fontSize: 28, lineHeight: 1 }}>Уровень {a.level}</span>
          <span className="meta" style={{ fontSize: 14, letterSpacing: '0.08em' }}>{a.inLevel} / {a.need} XP</span>
        </div>
        <Bar value={a.inLevel / a.need} />
        <div className="grid2" style={{ marginTop: 4 }}>
          <div className="tile"><span className="sub">Сила</span><b>{a.stats.str}</b></div>
          <div className="tile"><span className="sub">Выносливость</span><b>{a.stats.end}</b></div>
          <div className="tile"><span className="sub">Дисциплина</span><b>{a.stats.dis}</b></div>
          <div className="tile locked"><span>Интеллект</span><Icon name="lock" size={16} /></div>
        </div>
      </section>

      {active ? (
        <>
          <Hero day={sessionPhoto(active)}>
            <Label>Тренировка идёт</Label>
            <div className="h1">
              {active.day && !active.routineId ? (
                <>
                  День {active.day}
                  <br />
                  {DAY_TITLE[active.day]}
                </>
              ) : (
                active.title
              )}
            </div>
            <div className="meta">
              {active.exercises.filter((e) => e.sets.length).length} / {active.exercises.length} упражнений
            </div>
            <div className="divider" style={{ width: '62%' }} />
            <div className="sub">Сейчас: {EX(active.exercises[active.cursor]?.exId ?? '')?.name}</div>
          </Hero>
          <button type="button" className="cta" onClick={() => nav.go('workout')}>
            Продолжить <Icon name="right" />
          </button>
        </>
      ) : (
        <>
          <Hero day={next}>
            <Label>{done >= goal ? 'Сверх плана недели' : 'Следующая тренировка'}</Label>
            <div className="h1">День {next}<br />{DAY_TITLE[next]}</div>
            <div className="meta">
              {plan.length} {plural(plan.length, 'упражнение', 'упражнения', 'упражнений')} · ~{estimateMinutes(plan)} мин · +{estimateXp(plan)} XP
            </div>
            <div className="divider" style={{ width: '62%' }} />
            <div className="sub">Первое: {EX(plan[0]?.exId ?? '')?.name ?? '—'}</div>
          </Hero>
          <button
            type="button"
            className="cta"
            onClick={() => {
              startSession(next);
              nav.go('workout');
            }}
          >
            Начать тренировку <Icon name="right" />
          </button>
        </>
      )}

      <div className="stack">
        <Label>Ещё сегодня</Label>
        <button type="button" className="row with-check" onClick={() => nav.open({ type: 'cardio' })}>
          <span className="sq"><Icon name="pulse" size={18} /></span>
          <span className="title grow">Кардио за неделю</span>
          <span className="val">{cardio} / {target} мин</span>
          <Check on={cardio >= target} />
        </button>
        <button type="button" className="row with-check" onClick={() => nav.open({ type: 'food' })}>
          <span className="sq"><Icon name="bowl" size={18} /></span>
          <span className="grow stack" style={{ gap: 5, padding: '6px 4px 6px 0' }}>
            <span className="title">Питание</span>
            <span className="food-line">
              <span>Белок</span>
              <Bar value={protein / proteinGoal} />
              <span>{protein} / {proteinGoal} г</span>
            </span>
            <span className="food-line">
              <span>Ккал</span>
              <Bar value={kcalGoal ? kcal / kcalGoal : 0} tone={kcalGoal && kcal > kcalGoal * 1.05 ? 'warn' : undefined} />
              <span>{kcalGoal ? `${kcal} / ${kcalGoal}` : `${kcal} · норма?`}</span>
            </span>
          </span>
          <Check on={protein >= proteinGoal && (!kcalGoal || kcalOnTarget(kcal, kcalGoal))} />
        </button>
      </div>
    </>
  );
}
