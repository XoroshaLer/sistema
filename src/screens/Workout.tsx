import { useEffect, useMemo, useRef, useState } from 'react';
import { addCardio, createRoutine, deleteSession, deleteSets, finishSession, logSet, setCursor, setSessionPlan, skipExercise, startPlan, startSession } from '../actions';
import { DAYS, DAY_SHORT, DAY_TITLE, DAY_WEEKDAY, EX, blockOf, type Exercise } from '../data/program';
import { WD_FULL, programWeek, today } from '../lib/dates';
import { clock, num, plural, repsText, rirText, setText, setsText } from '../lib/format';
import { beep, unlockAudio, useNow } from '../lib/hooks';
import {
  XP,
  analyze,
  bestOf,
  better,
  dayPlan,
  doneDays,
  groupSets,
  isComplete,
  planKey,
  planOf,
  previousFor,
  recordBefore,
  sessionPhoto,
  sessionXp,
  setCount,
  type SetGroup,
} from '../lib/logic';
import type { Nav } from '../nav';
import type { AppData, Session, SetLog } from '../store';
import { Check, Chips, Hero, Icon, Label, Stepper, TopBar, weightStep, MenuButton } from '../ui';

const RIR_OPTIONS = [0, 1, 2, 3, 4].map((v) => ({ value: v, label: rirText(v) }));
const SIDE_NAME = { L: 'левая', R: 'правая' } as const;

function exerciseOf(id: string): Exercise {
  return EX(id) ?? { id, name: 'Удалённое упражнение', sets: 2, repMin: 10, repMax: 12, rir: 2, goal: '' };
}

/** Tab content when no workout is running: this week's program days and the user's own workouts. */
export function WorkoutPick({ data, nav }: { data: AppData; nav: Nav }) {
  const week = programWeek(data.profile!.startDate, today());
  const block = blockOf(week);
  const done = doneDays(data, week);
  return (
    <>
      <TopBar left={<MenuButton label="Тренировки" onOpen={nav.menu} />} mid={`Неделя ${week} · блок ${block}`} />
      <Label>Программа</Label>
      <div className="stack">
        {DAYS.map((d) => {
          const plan = dayPlan(data, block, d);
          const edited = !!data.plans[planKey(block, d)];
          return (
            <div key={d} className="row-pair">
              <button type="button" className="row with-check" onClick={() => startSession(d)}>
                <span className="sq lg">{d}</span>
                <span className="grow stack" style={{ gap: 2 }}>
                  <span className="title strong">Тренировка {d} · {DAY_TITLE[d].toLowerCase()}</span>
                  <span className="sub">
                    {plan.length} {plural(plan.length, 'упражнение', 'упражнения', 'упражнений')} · {edited ? 'твой вариант' : `по плану ${WD_FULL[DAY_WEEKDAY[d]]}`}
                  </span>
                </span>
                {done.has(d) && <Check on />}
              </button>
              <button type="button" className="sq lg edit-btn" aria-label={`Изменить тренировку ${d}`} onClick={() => nav.edit({ type: 'day', block, day: d })}>
                <Icon name="pen" size={18} />
              </button>
            </div>
          );
        })}
      </div>

      <Label>Свои тренировки</Label>
      <div className="stack">
        {data.routines.map((r) => (
          <div key={r.id} className="row-pair">
            <button type="button" className="row" onClick={() => (r.items.length ? startPlan({ type: 'routine', id: r.id }) : nav.edit({ type: 'routine', id: r.id }))}>
              <span className="sq lg">{r.name.charAt(0).toUpperCase() || '+'}</span>
              <span className="grow stack" style={{ gap: 2 }}>
                <span className="title strong ellipsis">{r.name}</span>
                <span className="sub">{r.items.length ? `${r.items.length} ${plural(r.items.length, 'упражнение', 'упражнения', 'упражнений')} · по желанию` : 'Добавь упражнения'}</span>
              </span>
            </button>
            <button type="button" className="sq lg edit-btn" aria-label={`Изменить: ${r.name}`} onClick={() => nav.edit({ type: 'routine', id: r.id })}>
              <Icon name="pen" size={18} />
            </button>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => nav.edit({ type: 'routine', id: createRoutine() })}>
          <Icon name="plus" size={16} /> Создать тренировку
        </button>
      </div>

      <div className="note-box">
        <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent)' }} />
        <span>Усилие 2–3 RIR, отдых 2–3 минуты в основных упражнениях. Новые упражнения первые 1–2 недели осваивай без погони за весом.</span>
      </div>
    </>
  );
}

interface Seed {
  w: number;
  r: number;
  rir: number;
}

function SetInput({ ex, seed, setNo, side, hud, onLog }: { ex: Exercise; seed: Seed; setNo: number; side?: 'L' | 'R'; hud: { text: string; on: boolean }; onLog: (s: Seed) => void }) {
  const [w, setW] = useState(seed.w);
  const [r, setR] = useState(seed.r);
  const [rir, setRir] = useState(seed.rir);
  const [info, setInfo] = useState(false);
  return (
    <>
      <section className="card" style={{ padding: 12, gap: 10 }}>
        <div className="set-head">
          <span className="set-title">
            Подход {setNo}
            {side && <span className="accent"> · {SIDE_NAME[side]}</span>}
          </span>
          <span className={`hud${hud.on ? ' on' : ''}`}>
            {hud.text}
            <Icon name={hud.on ? 'clock' : 'target'} size={18} stroke={1.5} />
          </span>
        </div>
        {side && (
          <div className="sides" aria-hidden="true">
            <span className={side === 'L' ? 'on' : 'done'}>Левая</span>
            <span className={side === 'R' ? 'on' : ''}>Правая</span>
          </div>
        )}
        <div className="grid2" style={{ gap: 10 }}>
          <Stepper label={ex.assisted ? 'Помощь, кг' : ex.bodyweight ? 'Доп. вес, кг' : 'Вес, кг'} value={w} onChange={setW} step={weightStep} decimal />
          <Stepper label="Повторы" value={r} onChange={setR} step={() => 1} min={1} />
        </div>
      </section>
      <div className="stack">
        <div className="between" style={{ alignItems: 'center', padding: '0 4px' }}>
          <span className="sub" style={{ fontSize: 14 }}>RIR — сколько повторов осталось в запасе</span>
          <button type="button" className="icon-btn" style={{ color: 'var(--text-2)', width: 36, height: 36 }} aria-label="Что такое RIR" aria-expanded={info} onClick={() => setInfo(!info)}>
            <Icon name="info" />
          </button>
        </div>
        {info && <div className="note-box">RIR 2 означает: могла бы сделать ещё примерно 2 чистых повтора. По программе держим 2–3.</div>}
        <Chips options={RIR_OPTIONS} value={rir} onChange={setRir} />
      </div>
      <button type="button" className="cta" onClick={() => onLog({ w, r, rir })}>
        {side ? `Записать ${side === 'L' ? 'левую' : 'правую'}` : 'Записать подход'} <Icon name="right" />
      </button>
    </>
  );
}

function SetValue({ s, ex }: { s: SetLog; ex: Exercise }) {
  if (ex.assisted) return <>{num(s.w)} <small>кг помощи</small> × {s.r}</>;
  if (s.w === 0) return <>{s.r} <small>повторов</small></>;
  return <>{num(s.w)} <small>кг</small> × {s.r}</>;
}

function GroupRow({ g, n, ex, onTap }: { g: SetGroup; n: number; ex: Exercise; onTap: () => void }) {
  if (g.both) {
    return (
      <button type="button" className="row with-check" onClick={onTap} aria-label={`Подход ${n}: ${setText(g.both, ex)}, RIR ${rirText(g.both.rir)}. Нажми, чтобы удалить`}>
        <span className="sq">{n}</span>
        <span className="set-val"><SetValue s={g.both} ex={ex} /></span>
        <span className="set-rir">RIR {rirText(g.both.rir)}</span>
        <Check on />
      </button>
    );
  }
  return (
    <button type="button" className="row with-check" onClick={onTap} aria-label={`Подход ${n} по сторонам. Нажми, чтобы удалить`}>
      <span className="sq">{n}</span>
      <span className="grow stack" style={{ gap: 2, padding: '4px 0' }}>
        {(['L', 'R'] as const).map((side) => {
          const s = g[side];
          return (
            <span key={side} className="side-line">
              <span className="side-tag">{side === 'L' ? 'Л' : 'П'}</span>
              <span className="set-val small">{s ? <SetValue s={s} ex={ex} /> : '—'}</span>
              {s && <span className="set-rir" style={{ border: 0, padding: 0 }}>RIR {rirText(s.rir)}</span>}
            </span>
          );
        })}
      </span>
      <Check on={isComplete(g)} />
    </button>
  );
}

export function WorkoutActive({ data, session, nav }: { data: AppData; session: Session; nav: Nav }) {
  const now = useNow(500);
  const i = Math.min(session.cursor, session.exercises.length - 1);
  const log = session.exercises[i];
  const ex = exerciseOf(log.exId);
  const plan = planOf(log);
  const total = session.exercises.length;
  const prev = useMemo(() => previousFor(data, ex.id, session.startedAt), [data, ex.id, session.startedAt]);
  const record = useMemo(() => recordBefore(data, ex.id, session.startedAt), [data, ex.id, session.startedAt]);
  const [extra, setExtra] = useState<string | null>(null);
  const [confirmSet, setConfirmSet] = useState<number | null>(null);
  const restLeft = session.restEndsAt ? Math.ceil((session.restEndsAt - now) / 1000) : 0;

  const lastRest = useRef(restLeft);
  useEffect(() => {
    if (lastRest.current > 0 && restLeft <= 0) {
      if (data.settings.sound) beep();
      navigator.vibrate?.(300);
    }
    lastRest.current = restLeft;
  }, [restLeft, data.settings.sound]);

  const groups = groupSets(log.sets);
  const lastGroup = groups[groups.length - 1];
  const pendingRight = !!(lastGroup?.L && !lastGroup.R);
  const side: 'L' | 'R' | undefined = pendingRight ? 'R' : plan.perSide ? 'L' : undefined;
  const extraKey = `${session.id}:${i}`;
  const showInput = pendingRight || groups.length < plan.sets || extra === extraKey;
  const prevSets = prev?.sets ?? [];

  let seedSet: SetLog | undefined;
  if (side === 'R') seedSet = lastGroup?.L;
  else if (side === 'L') seedSet = [...groups].reverse().find((g) => g.L)?.L ?? prevSets.find((s) => s.side === 'L') ?? prevSets[0];
  else seedSet = (lastGroup && (lastGroup.both ?? lastGroup.R ?? lastGroup.L)) ?? prevSets[0];
  const seed: Seed = seedSet ? { w: seedSet.w, r: seedSet.r, rir: seedSet.rir } : { w: 0, r: plan.repMin, rir: ex.rir };

  const hud =
    restLeft > 0
      ? { text: `Отдых ${clock(restLeft)}`, on: true }
      : { text: side === 'R' ? 'Как левая' : groups.length ? `Как в подходе ${groups.length}` : prevSets.length ? 'Как в прошлый раз' : 'Первый раз', on: false };
  const prevTop = prev ? bestOf(prevSets, ex) : undefined;
  const readyForMore = prevTop && prevTop.r >= plan.repMax;
  const isLast = i === total - 1;
  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const restSec = plan.sets >= 3 ? data.settings.restMain : data.settings.restOther;

  const finish = () => {
    if (totalSets === 0) {
      nav.open({
        type: 'confirm',
        title: 'Отменить тренировку',
        text: 'Ни одного подхода ещё не записано. Тренировка не сохранится.',
        action: 'Отменить тренировку',
        danger: true,
        onConfirm: () => {
          deleteSession(session.id);
          nav.go('status');
        },
      });
      return;
    }
    finishSession(session.id);
    nav.finished(session.id);
  };

  const top = bestOf(log.sets, ex);
  const isPr = !!(top && record && better(top, record, ex));
  const doneCount = setCount(log.sets);
  const exXp = doneCount * XP.set + (doneCount >= plan.sets ? XP.exercise : 0) + (isPr ? XP.pr : 0);
  const next = session.exercises[i + 1];
  const nextEx = next && exerciseOf(next.exId);

  return (
    <>
      <TopBar
        left={
          <button type="button" className="t-left" onClick={() => nav.go('status')}>
            <Icon name="left" size={18} stroke={2} /> Статус
          </button>
        }
        mid={<span className="ellipsis" style={{ display: 'block', maxWidth: 190 }}>{session.day && !session.routineId ? `День ${session.day} · ${DAY_SHORT[session.day]}` : session.title}</span>}
        right={clock((now - session.startedAt) / 1000)}
      />

      <div className="stack">
        <div className="caps">
          <span>Упражнение {i + 1} / {total}</span>
          <span>Неделя {session.week}</span>
        </div>
        <div className="segbar" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))`, marginTop: -8, marginBottom: -8 }}>
          {session.exercises.map((e, k) => {
            const state = k === i ? 'on' : setCount(e.sets) >= planOf(e).sets ? 'done' : '';
            return <button key={k} type="button" className={state} aria-label={`Упражнение ${k + 1}: ${exerciseOf(e.exId).name}`} onClick={() => setCursor(session.id, k)} />;
          })}
        </div>
      </div>

      <Hero day={sessionPhoto(session)}>
        <Label>{ex.optional ? `Опционально · ${ex.goal}` : ex.goal || 'Своё упражнение'}</Label>
        <div className="h1">{ex.name}</div>
        <div className="meta">
          {plan.sets} × {repsText(plan, ex)} · RIR {ex.rir} · отдых {plan.sets >= 3 ? '2–3' : '1–2'} мин
        </div>
        <div className="divider" style={{ width: '66%', margin: '2px 0' }} />
        <div className="sub">
          {prev ? `Прошлый раз (нед. ${prev.session.week}): ${setsText(prevSets, ex)}` : 'Первый раз — подбери рабочий вес, без погони за цифрой'}
        </div>
        {readyForMore && (
          <div className="sub accent" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Icon name="trend" size={16} /> Все повторы на верхней границе — можно добавить вес
          </div>
        )}
      </Hero>

      {groups.length > 0 && (
        <div className="stack">
          {groups.map((g, k) =>
            confirmSet === k ? (
              <div key={k} className="row" style={{ paddingRight: 3 }}>
                <span className="sq">{k + 1}</span>
                <span className="grow title">Удалить подход?</span>
                <button type="button" className="btn small danger" onClick={() => { deleteSets(session.id, i, g.idx); setConfirmSet(null); }}>Удалить</button>
                <button type="button" className="btn small" onClick={() => setConfirmSet(null)}>Нет</button>
              </div>
            ) : (
              <GroupRow key={k} g={g} n={k + 1} ex={ex} onTap={() => setConfirmSet(k)} />
            ),
          )}
        </div>
      )}

      {showInput ? (
        <>
          <SetInput
            key={`${session.id}:${i}:${log.sets.length}:${side ?? ''}`}
            ex={ex}
            seed={seed}
            setNo={pendingRight ? groups.length : groups.length + 1}
            side={side}
            hud={hud}
            onLog={(s) => {
              unlockAudio();
              logSet(session.id, i, { ...s, side }, restSec);
              if (side !== 'L') setExtra(null);
            }}
          />
          {!pendingRight && (
            <button type="button" className="link-btn" style={{ minHeight: 36, marginTop: -4 }} onClick={() => setSessionPlan(session.id, i, { perSide: !plan.perSide })}>
              {plan.perSide ? 'Записывать обе стороны одним подходом' : 'Записывать левую и правую отдельно'}
            </button>
          )}
        </>
      ) : (
        <section className="card active">
          <Label>Упражнение выполнено</Label>
          <div className="between">
            <span className="h2">{isPr ? 'Новый рекорд' : record ? 'Готово' : 'Первая отметка'}</span>
            <span className="meta" style={{ fontSize: 15 }}>+{exXp} XP</span>
          </div>
          <div className="sub">
            {top &&
              (isPr
                ? `${setText(top, ex)} — прошлый рекорд ${setText(record!, ex)}`
                : record
                  ? `Лучший подход: ${setText(top, ex)} · рекорд ${setText(record, ex)}`
                  : `Лучший подход: ${setText(top, ex)} — от него будем расти`)}
          </div>
          {restLeft > 0 && <div className="hud on">Отдых {clock(restLeft)}</div>}
          <button type="button" className="cta" style={{ marginTop: 6 }} onClick={() => (isLast ? finish() : setCursor(session.id, i + 1))}>
            {isLast ? 'Завершить тренировку' : 'Следующее упражнение'} <Icon name="right" />
          </button>
          <button type="button" className="btn" onClick={() => setExtra(extraKey)}>
            <Icon name="plus" size={16} /> Ещё подход
          </button>
        </section>
      )}

      {log.note && (
        <div className="note-box">
          <Icon name="pen" size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent)' }} />
          <span>{log.note}</span>
        </div>
      )}

      <div className="grid3">
        <button type="button" className="btn" onClick={() => nav.open({ type: 'note', sessionId: session.id, exIndex: i })}>
          <Icon name="pen" size={16} /> Заметка
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            nav.open({
              type: 'library',
              title: 'Заменить упражнение',
              onPick: (id) => nav.open({ type: 'replace', sessionId: session.id, exIndex: i, exId: id }),
            })
          }
        >
          <Icon name="swap" size={16} /> Заменить
        </button>
        <button type="button" className="btn" onClick={() => skipExercise(session.id, i)} disabled={isLast}>
          <Icon name="skip" size={16} /> Мимо
        </button>
      </div>

      {nextEx ? (
        <button type="button" className="row" style={{ background: 'none', border: 0, borderTop: '1px solid var(--line-2)', borderRadius: 0, padding: '10px 4px 4px' }} onClick={() => setCursor(session.id, i + 1)}>
          <span className="grow stack" style={{ gap: 4 }}>
            <span className="caps" style={{ fontSize: 11, color: 'var(--muted)' }}>Далее</span>
            <span style={{ fontSize: 15 }}>{nextEx.name} · {planOf(next).sets} × {repsText(planOf(next), nextEx)}</span>
          </span>
          <Icon name="right" style={{ color: 'var(--text-2)' }} />
        </button>
      ) : (
        <div className="caps" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 10, fontSize: 11, color: 'var(--muted)' }}>
          <span>Последнее упражнение</span>
        </div>
      )}

      <button type="button" className="link-btn" onClick={finish}>
        {totalSets ? 'Завершить тренировку' : 'Отменить тренировку'}
      </button>
    </>
  );
}

export function WorkoutSummary({ data, sessionId, nav, onClose }: { data: AppData; sessionId: string; nav: Nav; onClose: () => void }) {
  const session = data.sessions.find((s) => s.id === sessionId);
  const a = useMemo(() => analyze(data), [data]);
  const [cardioSaved, setCardioSaved] = useState(false);
  if (!session) return null;
  const sets = session.exercises.reduce((n, e) => n + setCount(e.sets), 0);
  const exDone = session.exercises.filter((e) => e.sets.length).length;
  const minutes = Math.round(((session.finishedAt ?? Date.now()) - session.startedAt) / 60000);
  const prs = session.exercises.filter((e) => a.prs.has(`${session.id}:${e.exId}`));
  const program = session.day && !session.routineId ? session.day : undefined;
  const upperDay = program === 'B' || program === 'D';
  return (
    <>
      <TopBar left="Тренировка" mid={program ? `День ${program} · ${DAY_SHORT[program]}` : session.title} />
      <Hero day={sessionPhoto(session)}>
        <Label>Тренировка завершена</Label>
        <div className="h1">
          {program ? (
            <>
              День {program}
              <br />
              {DAY_TITLE[program]}
            </>
          ) : (
            session.title
          )}
        </div>
        <div className="meta">+{sessionXp(session, a.prs)} XP · уровень {a.level}</div>
        <div className="divider" style={{ width: '62%' }} />
        <div className="sub">{minutes} мин · {exDone} из {session.exercises.length} упражнений · {sets} {plural(sets, 'подход', 'подхода', 'подходов')}</div>
      </Hero>

      {prs.length > 0 && (
        <div className="stack">
          <Label>Новые рекорды</Label>
          {prs.map((e) => {
            const ex = exerciseOf(e.exId);
            const top = bestOf(e.sets, ex)!;
            return (
              <div key={e.exId} className="row">
                <span className="sq"><Icon name="trend" size={18} /></span>
                <span className="grow stack" style={{ gap: 0 }}>
                  <span className="title ellipsis">{ex.name}</span>
                  <span className="sub">{setText(top, ex)}</span>
                </span>
                <span className="val accent">+{XP.pr} XP</span>
              </div>
            );
          })}
        </div>
      )}

      {upperDay && (
        <div className="stack">
          <Label>Кардио после силовой</Label>
          <button
            type="button"
            className="row with-check"
            onClick={() => {
              if (cardioSaved) return;
              addCardio(program === 'B' ? 'afterB' : 'afterD', 15, session.date);
              setCardioSaved(true);
              nav.toast('Кардио записано', '15 минут после тренировки');
            }}
          >
            <span className="sq"><Icon name="pulse" size={18} /></span>
            <span className="grow title">{cardioSaved ? 'Записано: 15 минут' : 'Отметить 15 минут'}</span>
            <Check on={cardioSaved} />
          </button>
        </div>
      )}

      <button type="button" className="cta" onClick={() => { onClose(); nav.go('status'); }}>
        На главный <Icon name="right" />
      </button>
    </>
  );
}
