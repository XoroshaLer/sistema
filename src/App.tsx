import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PlanTarget } from './actions';
import { analyze } from './lib/logic';
import { WorkoutEditor } from './screens/Editor';
import type { Nav, SheetState, Tab } from './nav';
import { JournalScreen } from './screens/Journal';
import { Onboarding } from './screens/Onboarding';
import { ProgressScreen } from './screens/Progress';
import { StatusScreen } from './screens/Status';
import { WorkoutActive, WorkoutPick, WorkoutSummary } from './screens/Workout';
import { SheetHost } from './sheets';
import { useData } from './store';
import { takeUpdatedFlag } from './sw-register';
import { Icon, Topo, type IconName } from './ui';

const TABS: { tab: Tab; label: string; icon: IconName }[] = [
  { tab: 'status', label: 'Статус', icon: 'user' },
  { tab: 'workout', label: 'Тренировка', icon: 'dumbbell' },
  { tab: 'progress', label: 'Прогресс', icon: 'chart' },
  { tab: 'journal', label: 'Журнал', icon: 'book' },
];

export function App() {
  const data = useData();
  const [tab, setTab] = useState<Tab>(data.activeId ? 'workout' : 'status');
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toast, setToast] = useState<{ title: string; text?: string; id: number } | null>(null);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlanTarget | null>(null);
  const contentRef = useRef<HTMLElement>(null);

  const nav: Nav = useMemo(
    () => ({
      go: (t) => {
        setTab(t);
        setSheet(null);
        if (t !== 'workout') {
          setSummaryId(null);
          setEditing(null);
        }
      },
      open: setSheet,
      toast: (title, text) => setToast({ title, text, id: Date.now() }),
      finished: setSummaryId,
      edit: (target) => {
        setEditing(target);
        if (target) setTab('workout');
      },
    }),
    [],
  );

  useEffect(() => {
    if (takeUpdatedFlag()) nav.toast('Приложение обновлено', 'Новая версия уже работает');
  }, [nav]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const level = useMemo(() => analyze(data).level, [data]);
  const lastLevel = useRef(level);
  useEffect(() => {
    if (level > lastLevel.current) nav.toast('Уровень повышен', `Уровень ${level}. Система фиксирует рост.`);
    lastLevel.current = level;
  }, [level, nav]);

  const active = data.activeId ? data.sessions.find((s) => s.id === data.activeId) : undefined;

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [tab, summaryId, editing, active?.id, active?.cursor]);

  if (!data.profile) {
    return (
      <div className="app">
        <Topo />
        <main className="content no-nav">
          <Onboarding />
        </main>
      </div>
    );
  }

  const inWorkout = tab === 'workout' && !!active;
  let body: ReactNode;
  if (tab === 'status') body = <StatusScreen data={data} nav={nav} />;
  else if (tab === 'progress') body = <ProgressScreen data={data} nav={nav} />;
  else if (tab === 'journal') body = <JournalScreen data={data} nav={nav} />;
  else if (active) body = <WorkoutActive key={active.id} data={data} session={active} nav={nav} />;
  else if (editing) body = <WorkoutEditor data={data} target={editing} nav={nav} />;
  else if (summaryId) body = <WorkoutSummary data={data} sessionId={summaryId} nav={nav} onClose={() => setSummaryId(null)} />;
  else body = <WorkoutPick data={data} nav={nav} />;

  return (
    <div className="app">
      <Topo />
      <main ref={contentRef} className={`content${inWorkout ? ' no-nav' : ''}`}>
        {body}
      </main>
      {!inWorkout && (
        <nav className="nav" aria-label="Разделы">
          {TABS.map((t) => (
            <button key={t.tab} type="button" className={tab === t.tab ? 'on' : ''} aria-current={tab === t.tab ? 'page' : undefined} onClick={() => nav.go(t.tab)}>
              <Icon name={t.icon} size={22} stroke={1.6} />
              {t.label.toUpperCase()}
            </button>
          ))}
        </nav>
      )}
      {sheet && <SheetHost sheet={sheet} data={data} nav={nav} close={() => setSheet(null)} />}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <div className="label">{toast.title}</div>
          {toast.text && <div className="sub">{toast.text}</div>}
        </div>
      )}
    </div>
  );
}
