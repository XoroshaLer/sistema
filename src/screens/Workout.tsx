import { useEffect, useMemo, useRef, useState } from 'react';
import { addCardio, deleteSession, deleteSet, finishSession, logSet, setCursor, skipExercise, startSession } from '../actions';
import { DAYS, DAY_SHORT, DAY_TITLE, DAY_WEEKDAY, EX, blockOf, planFor, type Exercise } from '../data/program';
import { WD_FULL, programWeek, today } from '../lib/dates';
import { clock, num, plural, repsText, rirText, setText, setsText } from '../lib/format';
import { beep, unlockAudio, useNow } from '../lib/hooks';
import { analyze, bestOf, better, doneDays, previousFor, recordBefore, sessionXp, XP } from '../lib/logic';
import type { Nav } from '../nav';
import type { AppData, Session, SetLog } from '../store';
import { Check, Chips, Hero, Icon, Label, Stepper, TopBar, weightStep } from '../ui';

const RIR_OPTIONS = [0, 1, 2, 3, 4].map((v) => ({ value: v, label: rirText(v) }));

/** Tab content when no workout is running: pick one of this week's four days. */
export function WorkoutPick({ data }: { data: AppData }) {
  const week = programWeek(data.profile!.startDate, today());
  const block = blockOf(week);
  const done = doneDays(data, week);
  return (
    <>
      <TopBar left="Тренировка" mid={`Неделя ${week} · блок ${block}`} />
      <Label>Тренировки недели</Label>
      <div className="stack">
        {DAYS.map((d) => {
          const plan = planFor(block, d);
          return (
            <button
              key={d}
              type="button"
              className="row with-check"
              onClick={() => {
                startSession(d);
              }}
            >
              <span className="sq lg">{d}</span>
              <span className="grow stack" style={{ gap: 2 }}>
                <span className="title strong">Тренировка {d} · {DAY_TITLE[d].toLowerCase()}</span>
                <span className="sub">
                  {plan.length} {plural(plan.length, 'упражнение', 'упражнения', 'упражнений')} · по плану {WD_FULL[DAY_WEEKDAY[d]]}
                </span>
              </span>
              {done.has(d) ? <Check on /> : <span className="check" style={{ background: 'none', border: 0, color: 'var(--text-2)' }}><Icon name="right" /></span>}
            </button>
          );
        })}
      </div>
      <div className="note-box">
        <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent)' }} />
        <span>Усилие 2–3 RIR, отдых 2–3 минуты в основных упражнениях. Новые упражнения первые 1–2 недели осваивай без погони за весом.</span>
      </div>
    </>
  );
}

function SetInput({ ex, seed, setNo, hud, onLog }: { ex: Exercise; seed: { w: number; r: number; rir: number }; setNo: number; hud: { text: string; on: boolean }; onLog: (s: { w: number; r: number; rir: number }) => void }) {
  const [w, setW] = useState(seed.w);
  const [r, setR] = useState(seed.r);
  const [rir, setRir] = useState(seed.rir);
  const [info, setInfo] = useState(false);
  return (
    <>
      <section className="card" style={{ padding: 12, gap: 10 }}>
        <div className="set-head">
          <span className="set-title">Подход {setNo}</span>
          <span className={`hud${hud.on ? ' on' : ''}`}>
            {hud.text}
            <Icon name={hud.on ? 'clock' : 'target'} size={18} stroke={1.5} />
          </span>
        </div>
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
        Записать подход <Icon name="right" />
      </button>
    </>
  );
}

function SetValue({ s, ex }: { s: SetLog; ex: Exercise }) {
  if (ex.assisted) return <span className="set-val">{num(s.w)} <small>кг помощи</small> × {s.r}</span>;
  if (ex.bodyweight && s.w === 0) return <span className="set-val">{s.r} <small>повторов</small></span>;
  return <span className="set-val">{num(s.w)} <small>кг</small> × {s.r}</span>;
}

export function WorkoutActive({ data, session, nav }: { data: AppData; session: Session; nav: Nav }) {
  const now = useNow(500);
  const i = Math.min(session.cursor, session.exercises.length - 1);
  const log = session.exercises[i];
  const ex = EX(log.exId)!;
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

  const done = log.sets;
  const extraKey = `${session.id}:${i}`;
  const showInput = done.length < ex.sets || extra === extraKey;
  const prevSets = prev?.sets ?? [];
  const last = done[done.length - 1];
  const seedSet = last ?? prevSets[0];
  const seed = seedSet ? { w: seedSet.w, r: seedSet.r, rir: seedSet.rir } : { w: 0, r: ex.repMin, rir: ex.rir };
  const hud = restLeft > 0
    ? { text: `Отдых ${clock(restLeft)}`, on: true }
    : { text: last ? `Как в подходе ${done.length}` : prevSets.length ? 'Как в прошлый раз' : 'Первый раз', on: false };
  const prevTop = prev ? bestOf(prevSets, ex) : undefined;
  const readyForMore = prevTop && prevTop.r >= ex.repMax;
  const isLast = i === total - 1;
  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);

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

  const top = bestOf(done, ex);
  const isPr = !!(top && record && better(top, record, ex));
  const exXp = done.length * XP.set + (done.length >= ex.sets ? XP.exercise : 0) + (isPr ? XP.pr : 0);
  const next = session.exercises[i + 1];
  const nextEx = next && EX(next.exId);

  return (
    <>
      <TopBar
        left={
          <button type="button" className="t-left" onClick={() => nav.go('status')}>
            <Icon name="left" size={18} stroke={2} /> Статус
          </button>
        }
        mid={`День ${session.day} · ${DAY_SHORT[session.day]}`}
        right={clock((now - session.startedAt) / 1000)}
      />

      <div className="stack">
        <div className="caps">
          <span>Упражнение {i + 1} / {total}</span>
          <span>Неделя {session.week}</span>
        </div>
        <div className="segbar" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))`, marginTop: -8, marginBottom: -8 }}>
          {session.exercises.map((e, k) => {
            const kEx = EX(e.exId);
            const state = k === i ? 'on' : kEx && e.sets.length >= kEx.sets ? 'done' : '';
            return <button key={k} type="button" className={state} aria-label={`Упражнение ${k + 1}: ${kEx?.name}`} onClick={() => setCursor(session.id, k)} />;
          })}
        </div>
      </div>

      <Hero>
        <Label>{ex.optional ? `Опционально · ${ex.goal}` : ex.goal}</Label>
        <div className="h1">{ex.name}</div>
        <div className="meta">
          {ex.sets} × {repsText(ex)} · RIR {ex.rir} · отдых {ex.sets >= 3 ? '2–3' : '1–2'} мин
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

      {done.length > 0 && (
        <div className="stack">
          {done.map((s, k) =>
            confirmSet === k ? (
              <div key={k} className="row" style={{ paddingRight: 3 }}>
                <span className="sq">{k + 1}</span>
                <span className="grow title">Удалить подход?</span>
                <button type="button" className="btn small danger" onClick={() => { deleteSet(session.id, i, k); setConfirmSet(null); }}>Удалить</button>
                <button type="button" className="btn small" onClick={() => setConfirmSet(null)}>Нет</button>
              </div>
            ) : (
              <button key={k} type="button" className="row with-check" onClick={() => setConfirmSet(k)} aria-label={`Подход ${k + 1}: ${setText(s, ex)}, RIR ${rirText(s.rir)}. Нажми, чтобы удалить`}>
                <span className="sq">{k + 1}</span>
                <SetValue s={s} ex={ex} />
                <span className="set-rir">RIR {rirText(s.rir)}</span>
                <Check on />
              </button>
            ),
          )}
        </div>
      )}

      {showInput ? (
        <SetInput
          key={`${session.id}:${i}:${done.length}`}
          ex={ex}
          seed={seed}
          setNo={done.length + 1}
          hud={hud}
          onLog={(s) => {
            unlockAudio();
            logSet(session.id, i, s, ex.sets >= 3 ? data.settings.restMain : data.settings.restOther);
            setExtra(null);
          }}
        />
      ) : (
        <section className="card active">
          <Label>Упражнение выполнено</Label>
          <div className="between">
            <span className="h2">{isPr ? 'Новый рекорд' : record ? 'Готово' : 'Первая отметка'}</span>
            <span className="meta" style={{ fontSize: 15 }}>+{exXp} XP</span>
          </div>
          <div className="sub">
            {top && (isPr
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

      <div className="grid2">
        <button type="button" className="btn" onClick={() => nav.open({ type: 'note', sessionId: session.id, exIndex: i })}>
          <Icon name="pen" size={16} /> Заметка
        </button>
        <button type="button" className="btn" onClick={() => skipExercise(session.id, i)} disabled={isLast}>
          <Icon name="skip" size={16} /> Пропустить
        </button>
      </div>

      {nextEx ? (
        <button type="button" className="row" style={{ background: 'none', border: 0, borderTop: '1px solid var(--line-2)', borderRadius: 0, padding: '10px 4px 4px' }} onClick={() => setCursor(session.id, i + 1)}>
          <span className="grow stack" style={{ gap: 4 }}>
            <span className="caps" style={{ fontSize: 11, color: 'var(--muted)' }}>Далее</span>
            <span style={{ fontSize: 15 }}>{nextEx.name} · {nextEx.sets} × {repsText(nextEx)}</span>
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
  const sets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const exDone = session.exercises.filter((e) => e.sets.length).length;
  const minutes = Math.round(((session.finishedAt ?? Date.now()) - session.startedAt) / 60000);
  const prs = session.exercises.filter((e) => a.prs.has(`${session.id}:${e.exId}`));
  const upperDay = session.day === 'B' || session.day === 'D';
  return (
    <>
      <TopBar left="Тренировка" mid={`День ${session.day} · ${DAY_SHORT[session.day]}`} />
      <Hero>
        <Label>Тренировка завершена</Label>
        <div className="h1">День {session.day}<br />{DAY_TITLE[session.day]}</div>
        <div className="meta">+{sessionXp(session, a.prs)} XP · уровень {a.level}</div>
        <div className="divider" style={{ width: '62%' }} />
        <div className="sub">{minutes} мин · {exDone} из {session.exercises.length} упражнений · {sets} {plural(sets, 'подход', 'подхода', 'подходов')}</div>
      </Hero>

      {prs.length > 0 && (
        <div className="stack">
          <Label>Новые рекорды</Label>
          {prs.map((e) => {
            const ex = EX(e.exId)!;
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
              addCardio(session.day === 'B' ? 'afterB' : 'afterD', 15, session.date);
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
