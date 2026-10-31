import { useMemo } from 'react';
import { setProtein, startSession } from '../actions';
import { DAYS, DAY_TITLE, DAY_WEEKDAY, EX, blockOf, planFor } from '../data/program';
import { fmtDay, programWeek, rawWeek, today, weekday, WD_FULL } from '../lib/dates';
import { plural } from '../lib/format';
import { analyze, cardioTarget, cardioWeek, doneDays, estimateMinutes, estimateXp, nextDay } from '../lib/logic';
import type { Nav } from '../nav';
import type { AppData } from '../store';
import { Bar, Check, Hero, Icon, Label, SegBar, TopBar } from '../ui';

export function StatusScreen({ data, nav }: { data: AppData; nav: Nav }) {
  const profile = data.profile!;
  const t = today();
  const raw = rawWeek(profile.startDate, t);
  const week = programWeek(profile.startDate, t);
  const a = useMemo(() => analyze(data), [data]);
  const done = doneDays(data, week);
  const active = data.activeId ? data.sessions.find((s) => s.id === data.activeId) : undefined;
  const next = nextDay(data, week);
  const plan = next ? planFor(blockOf(week), next) : [];
  const cardio = cardioWeek(data, week);
  const target = cardioTarget(week);
  const protein = data.protein[t] ?? 0;
  const wd = weekday(t);
  const checkWeek = wd === 0 ? week : wd <= 2 && week > 1 && !data.weeks[String(week - 1)] ? week - 1 : null;

  const weekLine = raw < 1 ? `Старт через ${1 - raw} нед.` : raw > 16 ? 'Программа пройдена' : `Неделя ${week} / 16`;

  return (
    <>
      <TopBar
        left="Статус"
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
          <span>Тренировки {done.size} / 4</span>
        </div>
        <SegBar states={DAYS.map((d) => (done.has(d) ? 'on' : ''))} />
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
          <Hero>
            <Label>Тренировка идёт</Label>
            <div className="h1">День {active.day}<br />{DAY_TITLE[active.day]}</div>
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
      ) : next ? (
        <>
          <Hero>
            <Label>{DAY_WEEKDAY[next] === wd ? 'Задание дня' : 'Следующая тренировка'}</Label>
            <div className="h1">День {next}<br />{DAY_TITLE[next]}</div>
            <div className="meta">
              {plan.length} {plural(plan.length, 'упражнение', 'упражнения', 'упражнений')} · ~{estimateMinutes(plan)} мин · +{estimateXp(plan)} XP
            </div>
            <div className="divider" style={{ width: '62%' }} />
            <div className="sub">
              Первое: {plan[0]?.name}
              <br />
              По плану: {WD_FULL[DAY_WEEKDAY[next]]}
            </div>
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
      ) : (
        <Hero>
          <Label>Неделя закрыта</Label>
          <div className="h1">Все 4 тренировки<br />выполнены</div>
          <div className="sub">Отдых — тоже часть системы. Новая неделя начнётся в понедельник.</div>
        </Hero>
      )}

      <div className="stack">
        <Label>Ещё сегодня</Label>
        <button type="button" className="row with-check" onClick={() => nav.open({ type: 'cardio' })}>
          <span className="sq"><Icon name="pulse" size={18} /></span>
          <span className="title grow">Кардио за неделю</span>
          <span className="val">{cardio} / {target} мин</span>
          <Check on={cardio >= target} />
        </button>
        <button type="button" className="row with-check" onClick={() => setProtein(t, (protein + 1) % 4)} aria-label={`Белок в каждом приёме: ${protein} из 3. Нажми, чтобы отметить приём`}>
          <span className="sq"><Icon name="bowl" size={18} /></span>
          <span className={`title grow${protein >= 3 ? ' muted' : ''}`}>Белок в каждом приёме</span>
          <span className="val">{protein} / 3</span>
          <Check on={protein >= 3} />
        </button>
        {checkWeek !== null && (
          <button type="button" className="row with-check" onClick={() => nav.open({ type: 'week', week: checkWeek })}>
            <span className="sq"><Icon name="calendar" size={18} /></span>
            <span className="title grow">Итоги недели {checkWeek}</span>
            <span className="val">1 мин</span>
            <Check on={!!data.weeks[String(checkWeek)]} />
          </button>
        )}
      </div>
    </>
  );
}
