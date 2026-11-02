import { useMemo } from 'react';
import { exportData } from './actions';
import { currentMonth, monthPlan, rub, spentIn, tasksOf } from './finance/model';
import { programWeek, today } from './lib/dates';
import { analyze, nextDay, weekWorkouts } from './lib/logic';
import type { Module, Nav } from './nav';
import type { AppData } from './store';
import { Bar, Icon, Label, type IconName } from './ui';

/** Side menu: the player and the modules of the System. */
export function Drawer({ data, module, nav, close }: { data: AppData; module: Module; nav: Nav; close: () => void }) {
  const a = useMemo(() => analyze(data), [data]);
  const week = programWeek(data.profile!.startDate, today());
  const f = data.finance;
  const month = currentMonth();
  let finLine = 'Бюджет, долги и цели';
  if (f?.setupDone) {
    const open = tasksOf(f, month).filter((t) => !t.doneAt).length;
    finLine = f.months[month] ? `Свободно ${rub(Math.max(0, monthPlan(f, month).life - spentIn(f, month)))}${open ? ` · задач ${open}` : ''}` : 'Распредели бюджет месяца';
  } else if (f) finLine = 'Настройка не закончена';

  const modules: { id: Module; title: string; line: string; icon: IconName }[] = [
    { id: 'training', title: 'Тренировки', line: `Неделя ${week} · ${weekWorkouts(data, week)} из ${data.settings.weeklyTarget} · следующая ${nextDay(data)}`, icon: 'dumbbell' },
    { id: 'finance', title: 'Финансы', line: finLine, icon: 'wallet' },
  ];

  return (
    <div className="drawer-backdrop" onClick={close}>
      <nav className="drawer" aria-label="Модули Системы" onClick={(e) => e.stopPropagation()}>
        <div className="between" style={{ alignItems: 'center', minHeight: 40 }}>
          <Label>Система</Label>
          <button type="button" className="icon-btn" style={{ color: 'var(--text-2)' }} aria-label="Закрыть меню" onClick={close}>
            <Icon name="x" />
          </button>
        </div>

        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <span className="sq lg" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 20 }}>{a.level}</span>
          <span className="grow stack" style={{ gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{data.profile!.name} · уровень {a.level}</span>
            <Bar value={a.inLevel / a.need} />
            <span className="sub" style={{ fontSize: 12 }}>
              {a.inLevel} / {a.need} XP · капитал {a.stats.cap}
            </span>
          </span>
        </div>

        <Label style={{ marginTop: 4 }}>Модули</Label>
        <div className="stack">
          {modules.map((m) => (
            <button key={m.id} type="button" className={`drawer-item${m.id === module ? ' on' : ''}`} aria-current={m.id === module ? 'page' : undefined} onClick={() => nav.switchModule(m.id)}>
              <span className="sq"><Icon name={m.icon} size={22} /></span>
              <span className="grow stack" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{m.title}</span>
                <span className="drawer-line">{m.line}</span>
              </span>
            </button>
          ))}
          {[
            { title: 'Работа', line: 'Скоро', icon: 'briefcase' as const },
            { title: 'Обучение', line: 'Скоро · откроет Интеллект', icon: 'book' as const },
          ].map((m) => (
            <div key={m.title} className="drawer-item locked">
              <span className="sq"><Icon name={m.icon} size={20} /></span>
              <span className="grow stack" style={{ gap: 2 }}>
                <span style={{ fontWeight: 500, fontSize: 15 }}>{m.title}</span>
                <span style={{ fontSize: 12 }}>{m.line}</span>
              </span>
              <Icon name="lock" size={16} />
            </div>
          ))}
        </div>

        <div className="stack" style={{ marginTop: 'auto', gap: 0, borderTop: '1px solid var(--line-2)', paddingTop: 8 }}>
          <button type="button" className="drawer-link" onClick={() => nav.open({ type: 'settings' })}>
            <Icon name="gear" /> Настройки
          </button>
          <button
            type="button"
            className="drawer-link"
            onClick={async () => {
              if ((await exportData()) === 'saved') nav.toast('Копия сохранена');
            }}
          >
            <Icon name="download" /> Резервная копия
          </button>
        </div>
      </nav>
    </div>
  );
}
