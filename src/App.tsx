import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { setSettings, type PlanTarget } from './actions';
import { Drawer } from './drawer';
import { FinanceRoot } from './finance/screens';
import { LearnRoot } from './learn/screens';
import { analyze } from './lib/logic';
import { WorkoutEditor } from './screens/Editor';
import type { FinTab, LearnTab, Module, Nav, SheetState, Tab } from './nav';
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

const FIN_TABS: { tab: FinTab; label: string; icon: IconName }[] = [
  { tab: 'overview', label: 'Обзор', icon: 'home' },
  { tab: 'budget', label: 'Бюджет', icon: 'pie' },
  { tab: 'goals', label: 'Цели', icon: 'target' },
  { tab: 'spend', label: 'Траты', icon: 'receipt' },
];

const LEARN_TABS: { tab: LearnTab; label: string; icon: IconName }[] = [
  { tab: 'today', label: 'Сегодня', icon: 'today' },
  { tab: 'notes', label: 'Знания', icon: 'code' },
  { tab: 'reading', label: 'Чтение', icon: 'bookOpen' },
];

export function App() {
  const data = useData();
  const [module, setModule] = useState<Module>(data.activeId ? 'training' : data.settings.module ?? 'training');
  const [tab, setTab] = useState<Tab>(data.activeId ? 'workout' : 'status');
  const [finTab, setFinTab] = useState<FinTab>('overview');
  const [learnTab, setLearnTab] = useState<LearnTab>('today');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toast, setToast] = useState<{ title: string; text?: string; id: number } | null>(null);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlanTarget | null>(null);
  const contentRef = useRef<HTMLElement>(null);

  const nav: Nav = useMemo(
    () => ({
      go: (t) => {
        setModule('training');
        setTab(t);
        setSheet(null);
        if (t !== 'workout') {
          setSummaryId(null);
          setEditing(null);
        }
      },
      open: (s) => {
        setMenuOpen(false);
        setSheet(s);
      },
      toast: (title, text) => setToast({ title, text, id: Date.now() }),
      finished: setSummaryId,
      edit: (target) => {
        setEditing(target);
        if (target) setTab('workout');
      },
      menu: () => setMenuOpen(true),
      switchModule: (m) => {
        setModule(m);
        setMenuOpen(false);
        setSheet(null);
        setSettings({ module: m });
      },
      goFin: (t) => {
        setModule('finance');
        setFinTab(t);
        setSheet(null);
      },
      goLearn: (t) => {
        setModule('learn');
        setLearnTab(t);
        setSheet(null);
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
  }, [module, tab, finTab, learnTab, summaryId, editing, active?.id, active?.cursor]);

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

  const inWorkout = module === 'training' && tab === 'workout' && !!active;
  const finSetup = module === 'finance' && !data.finance?.setupDone;
  let body: ReactNode;
  if (module === 'finance') body = <FinanceRoot data={data} tab={finTab} nav={nav} />;
  else if (module === 'learn') body = <LearnRoot data={data} tab={learnTab} nav={nav} />;
  else if (tab === 'status') body = <StatusScreen data={data} nav={nav} />;
  else if (tab === 'progress') body = <ProgressScreen data={data} nav={nav} />;
  else if (tab === 'journal') body = <JournalScreen data={data} nav={nav} />;
  else if (active) body = <WorkoutActive key={active.id} data={data} session={active} nav={nav} />;
  else if (editing) body = <WorkoutEditor data={data} target={editing} nav={nav} />;
  else if (summaryId) body = <WorkoutSummary data={data} sessionId={summaryId} nav={nav} onClose={() => setSummaryId(null)} />;
  else body = <WorkoutPick data={data} nav={nav} />;

  const hideNav = inWorkout || finSetup;

  return (
    <div className="app">
      <Topo />
      <main ref={contentRef} className={`content${hideNav ? ' no-nav' : ''}`}>
        {body}
      </main>
      {!hideNav && (
        <nav className="nav" aria-label="Разделы" style={module === 'learn' ? { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' } : undefined}>
          {module === 'learn'
            ? LEARN_TABS.map((t) => (
                <button key={t.tab} type="button" className={learnTab === t.tab ? 'on' : ''} aria-current={learnTab === t.tab ? 'page' : undefined} onClick={() => nav.goLearn(t.tab)}>
                  <Icon name={t.icon} size={22} stroke={1.6} />
                  {t.label.toUpperCase()}
                </button>
              ))
            : module === 'finance'
            ? FIN_TABS.map((t) => (
                <button key={t.tab} type="button" className={finTab === t.tab ? 'on' : ''} aria-current={finTab === t.tab ? 'page' : undefined} onClick={() => nav.goFin(t.tab)}>
                  <Icon name={t.icon} size={22} stroke={1.6} />
                  {t.label.toUpperCase()}
                </button>
              ))
            : TABS.map((t) => (
                <button key={t.tab} type="button" className={tab === t.tab ? 'on' : ''} aria-current={tab === t.tab ? 'page' : undefined} onClick={() => nav.go(t.tab)}>
                  <Icon name={t.icon} size={22} stroke={1.6} />
                  {t.label.toUpperCase()}
                </button>
              ))}
        </nav>
      )}
      {menuOpen && <Drawer data={data} module={module} nav={nav} close={() => setMenuOpen(false)} />}
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
