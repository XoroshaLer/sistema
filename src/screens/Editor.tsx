import { useEffect } from 'react';
import { deleteRoutine, itemsFor, resetDay, setItems, startPlan, updateRoutine, type PlanTarget } from '../actions';
import { DAYS, DAY_TITLE, EX, itemOf } from '../data/program';
import { plural, repsText } from '../lib/format';
import { planKey } from '../lib/logic';
import type { Nav } from '../nav';
import { DAY_PHOTO } from '../photos';
import { getData, type AppData } from '../store';
import { Icon, Label, TopBar } from '../ui';

/** Edits a program day (from the next workout on) or one of the user's own workouts. */
export function WorkoutEditor({ data, target, nav }: { data: AppData; target: PlanTarget; nav: Nav }) {
  const routine = target.type === 'routine' ? data.routines.find((r) => r.id === target.id) : undefined;
  const missing = target.type === 'routine' && !routine;
  useEffect(() => {
    if (missing) nav.edit(null);
  }, [missing, nav]);
  if (missing) return null;

  const items = itemsFor(data, target);
  const edited = target.type === 'day' && !!data.plans[planKey(target.block, target.day)];

  const add = () =>
    nav.open({
      type: 'library',
      title: 'Добавить упражнение',
      onPick: (id) => {
        const ex = EX(id);
        if (!ex) return;
        setItems(target, [...itemsFor(getData(), target), itemOf(ex)]);
      },
    });

  return (
    <>
      <TopBar
        left={
          <button type="button" className="t-left" onClick={() => nav.edit(null)}>
            <Icon name="left" size={18} stroke={2} /> Назад
          </button>
        }
        mid={target.type === 'day' ? `День ${target.day} · блок ${target.block}` : 'Своя тренировка'}
      />

      {target.type === 'day' ? (
        <section className="card">
          <Label>Редактор тренировки</Label>
          <span className="h2">Тренировка {target.day} · {DAY_TITLE[target.day].toLowerCase()}</span>
          <span className="sub">
            Изменения действуют со следующей тренировки {target.day} в блоке {target.block}. Уже записанные тренировки и рекорды не меняются.
          </span>
        </section>
      ) : (
        routine && (
          <>
            <label className="field">
              <span>Название</span>
              <input className="input" value={routine.name} onChange={(e) => updateRoutine(routine.id, { name: e.target.value })} />
            </label>
            <div className="field">
              <span>Обложка</span>
              <div className="grid4">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`cover${routine.photo === d ? ' on' : ''}`}
                    aria-label={`Обложка ${d}`}
                    aria-pressed={routine.photo === d}
                    style={{ backgroundImage: `url(${DAY_PHOTO[d]})` }}
                    onClick={() => updateRoutine(routine.id, { photo: d })}
                  />
                ))}
              </div>
            </div>
            <span className="sub">Свои тренировки не входят в 4 тренировки недели, но дают опыт и попадают в журнал.</span>
          </>
        )
      )}

      <Label>
        {items.length} {plural(items.length, 'упражнение', 'упражнения', 'упражнений')}
      </Label>
      <div className="stack">
        {items.map((it, k) => {
          const ex = EX(it.exId);
          return (
            <button key={`${it.exId}-${k}`} type="button" className="row" onClick={() => nav.open({ type: 'item', target, index: k })}>
              <span className="sq">{k + 1}</span>
              <span className="grow stack" style={{ gap: 1 }}>
                <span className="title ellipsis" style={{ fontSize: 14 }}>{ex?.name ?? 'Удалённое упражнение'}</span>
                <span className="sub">
                  {it.sets} × {repsText(it, ex)}
                  {it.perSide ? ' · левая и правая отдельно' : ''}
                </span>
              </span>
              <Icon name="right" style={{ color: 'var(--text-2)', flexShrink: 0 }} />
            </button>
          );
        })}
        <button type="button" className="btn" onClick={add}>
          <Icon name="plus" size={16} /> Добавить упражнение
        </button>
      </div>

      {routine && items.length > 0 && (
        <button
          type="button"
          className="cta"
          onClick={() => {
            startPlan({ type: 'routine', id: routine.id });
            nav.edit(null);
          }}
        >
          Начать тренировку <Icon name="right" />
        </button>
      )}

      {target.type === 'day' && edited && (
        <button
          type="button"
          className="link-btn"
          onClick={() =>
            nav.open({
              type: 'confirm',
              title: 'Вернуть как в программе',
              text: `Тренировка ${target.day} снова будет такой, как в таблице программы. Твои изменения этого дня удалятся.`,
              action: 'Вернуть',
              onConfirm: () => resetDay(target.block, target.day),
            })
          }
        >
          Вернуть как в программе
        </button>
      )}

      {routine && (
        <button
          type="button"
          className="btn danger"
          onClick={() =>
            nav.open({
              type: 'confirm',
              title: 'Удалить тренировку',
              text: `«${routine.name}» исчезнет из списка. Уже записанные тренировки останутся в журнале.`,
              action: 'Удалить',
              danger: true,
              onConfirm: () => {
                deleteRoutine(routine.id);
                nav.edit(null);
              },
            })
          }
        >
          <Icon name="trash" size={16} /> Удалить тренировку
        </button>
      )}
    </>
  );
}
