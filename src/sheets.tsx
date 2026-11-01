import { useRef, useState } from 'react';
import {
  addCardio,
  createExercise,
  exportData,
  importData,
  itemsFor,
  replaceInSession,
  saveWeek,
  setExNote,
  setItems,
  setProfile,
  setSettings,
  type PlanTarget,
} from './actions';
import { EX, EXERCISE_ORDER, dayOf, type PlanItem } from './data/program';
import { FoodSheet } from './food';
import { addDays, fmtDay, iso, mondayOf, programWeek, today } from './lib/dates';
import { num, parseNum, repsText, setText } from './lib/format';
import { XP, analyze } from './lib/logic';
import type { Nav, SheetState } from './nav';
import { CARDIO_LABEL } from './screens/Progress';
import { getData, resetData, type AppData, type CardioKind, type WeekCheck } from './store';
import { checkForUpdate } from './sw-register';
import { Chips, Icon, Label, Sheet, Stepper } from './ui';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();

/** All exercises: the user's own first, then the program; typing a new name creates one. */
function LibrarySheet({ data, title, onPick, close }: { data: AppData; title: string; onPick: (id: string) => void; close: () => void }) {
  const [q, setQ] = useState('');
  const ids = [...data.customExercises.map((c) => c.id).reverse(), ...EXERCISE_ORDER];
  const query = norm(q);
  const list = ids.filter((id) => norm(EX(id)?.name ?? '').includes(query));
  const exact = ids.some((id) => norm(EX(id)?.name ?? '') === query);
  const choose = (id: string) => {
    close();
    onPick(id);
  };
  return (
    <Sheet title={title} onClose={close}>
      <div className="search">
        <Icon name="search" size={18} />
        <input className="input" placeholder="Найти или вписать своё" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Название упражнения" />
      </div>
      {query && !exact && (
        <button type="button" className="row open" onClick={() => choose(createExercise(q))}>
          <span className="sq"><Icon name="plus" size={18} /></span>
          <span className="grow stack" style={{ gap: 0 }}>
            <span className="title strong ellipsis">Создать «{q.trim()}»</span>
            <span className="sub">Своё упражнение — рекорды будут считаться отдельно</span>
          </span>
        </button>
      )}
      <div className="stack">
        {list.map((id) => (
          <button key={id} type="button" className="row" onClick={() => choose(id)}>
            <span className="sq">{dayOf(id) ?? <Icon name="user" size={16} />}</span>
            <span className="grow title ellipsis" style={{ fontSize: 14 }}>{EX(id)?.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function ItemSheet({ data, target, index, nav, close }: { data: AppData; target: PlanTarget; index: number; nav: Nav; close: () => void }) {
  const items = itemsFor(data, target);
  const item = items[index];
  if (!item) return null;
  const ex = EX(item.exId);
  const patch = (p: Partial<PlanItem>) => setItems(target, items.map((it, k) => (k === index ? { ...it, ...p } : it)));
  const move = (dir: 1 | -1) => {
    const j = index + dir;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    setItems(target, next);
    nav.open({ type: 'item', target, index: j });
  };
  return (
    <Sheet title={`Упражнение ${index + 1}`} onClose={close}>
      <div className="stack" style={{ gap: 2 }}>
        <span className="h2" style={{ fontSize: 18 }}>{ex?.name ?? 'Удалённое упражнение'}</span>
        <span className="meta">{item.sets} × {repsText(item, ex)}</span>
      </div>
      <button
        type="button"
        className="btn"
        onClick={() =>
          nav.open({
            type: 'library',
            title: 'Заменить на',
            onPick: (id) => {
              setItems(target, itemsFor(getData(), target).map((it, k) => (k === index ? { ...it, exId: id, perSide: !!EX(id)?.per } : it)));
              nav.open({ type: 'item', target, index });
            },
          })
        }
      >
        <Icon name="swap" size={16} /> Заменить упражнение
      </button>
      <Stepper label="Подходы" value={item.sets} onChange={(v) => patch({ sets: Math.min(10, Math.max(1, v)) })} step={() => 1} min={1} />
      <div className="grid2">
        <Stepper label="Повторы от" value={item.repMin} onChange={(v) => patch({ repMin: v, repMax: Math.max(v, item.repMax) })} step={() => 1} min={1} />
        <Stepper label="Повторы до" value={item.repMax} onChange={(v) => patch({ repMax: Math.max(v, item.repMin) })} step={() => 1} min={1} />
      </div>
      <div className="field">
        <span>Как записывать подход</span>
        <Chips
          text
          value={item.perSide ? 'side' : 'both'}
          onChange={(v) => patch({ perSide: v === 'side' })}
          options={[
            { value: 'both', label: 'Целиком' },
            { value: 'side', label: 'Л и П отдельно' },
          ]}
        />
      </div>
      <div className="grid2">
        <button type="button" className="btn" disabled={index === 0} onClick={() => move(-1)}>
          <Icon name="up" size={16} /> Выше
        </button>
        <button type="button" className="btn" disabled={index === items.length - 1} onClick={() => move(1)}>
          <Icon name="down" size={16} /> Ниже
        </button>
      </div>
      <button
        type="button"
        className="btn danger"
        onClick={() => {
          setItems(target, items.filter((_, k) => k !== index));
          close();
        }}
      >
        <Icon name="trash" size={16} /> Убрать из тренировки
      </button>
    </Sheet>
  );
}

export function SheetHost({ sheet, data, nav, close }: { sheet: SheetState; data: AppData; nav: Nav; close: () => void }) {
  switch (sheet.type) {
    case 'settings':
      return <SettingsSheet data={data} nav={nav} close={close} />;
    case 'add':
      return (
        <Sheet title="Новая запись" onClose={close}>
          <button type="button" className="row" onClick={() => nav.open({ type: 'cardio' })}>
            <span className="sq lg"><Icon name="pulse" size={18} /></span>
            <span className="grow title">Кардио</span>
            <Icon name="right" style={{ color: 'var(--text-2)' }} />
          </button>
          <button type="button" className="row" onClick={() => nav.open({ type: 'week', week: programWeek(data.profile!.startDate, today()) })}>
            <span className="sq lg"><Icon name="calendar" size={18} /></span>
            <span className="grow title">Итоги недели</span>
            <Icon name="right" style={{ color: 'var(--text-2)' }} />
          </button>
        </Sheet>
      );
    case 'cardio':
      return <CardioSheet initialKind={sheet.kind} nav={nav} close={close} />;
    case 'week':
      return <WeekSheet week={sheet.week} data={data} nav={nav} close={close} />;
    case 'note': {
      const s = data.sessions.find((x) => x.id === sheet.sessionId);
      const e = s?.exercises[sheet.exIndex];
      if (!s || !e) return null;
      return <NoteSheet title={EX(e.exId)?.name ?? 'Заметка'} initial={e.note ?? ''} onSave={(v) => setExNote(s.id, sheet.exIndex, v)} close={close} />;
    }
    case 'picker':
      return <PickerSheet data={data} ids={sheet.ids} onPick={sheet.onPick} close={close} />;
    case 'library':
      return <LibrarySheet data={data} title={sheet.title} onPick={sheet.onPick} close={close} />;
    case 'item':
      return <ItemSheet data={data} target={sheet.target} index={sheet.index} nav={nav} close={close} />;
    case 'replace': {
      const s = data.sessions.find((x) => x.id === sheet.sessionId);
      const from = s && EX(s.exercises[sheet.exIndex]?.exId ?? '');
      const to = EX(sheet.exId);
      if (!s || !from || !to) return null;
      const scope = s.routineId ? `в «${s.title}»` : `в тренировках ${s.day} блока ${s.block}`;
      return (
        <Sheet title="Заменить упражнение" onClose={close}>
          <div className="stack" style={{ gap: 4 }}>
            <span className="sub">{from.name}</span>
            <span className="h2" style={{ fontSize: 18 }}>→ {to.name}</span>
          </div>
          <button
            type="button"
            className="cta"
            onClick={() => {
              replaceInSession(s.id, sheet.exIndex, to.id, true);
              close();
              nav.toast('Заменено', `Дальше ${scope} тоже будет «${to.name}»`);
            }}
          >
            Сегодня и дальше
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              replaceInSession(s.id, sheet.exIndex, to.id, false);
              close();
            }}
          >
            Только сегодня
          </button>
        </Sheet>
      );
    }
    case 'food':
      return <FoodSheet data={data} close={close} toast={nav.toast} />;
    case 'confirm':
      return (
        <Sheet title={sheet.title} onClose={close}>
          <p className="sub" style={{ fontSize: 15, margin: 0 }}>{sheet.text}</p>
          <div className="grid2">
            <button type="button" className="btn" onClick={close}>Отмена</button>
            <button
              type="button"
              className={`btn${sheet.danger ? ' danger' : ''}`}
              onClick={() => {
                sheet.onConfirm();
                close();
              }}
            >
              {sheet.action}
            </button>
          </div>
        </Sheet>
      );
  }
}

function CardioSheet({ initialKind, nav, close }: { initialKind?: CardioKind; nav: Nav; close: () => void }) {
  const [kind, setKind] = useState<CardioKind>(initialKind ?? 'walk');
  const [minutes, setMinutes] = useState(initialKind === 'walk' || !initialKind ? 30 : 15);
  const [yesterday, setYesterday] = useState(false);
  return (
    <Sheet title="Кардио" onClose={close}>
      <div className="grid2">
        {(Object.keys(CARDIO_LABEL) as CardioKind[]).map((k) => (
          <button key={k} type="button" className={`chip text${k === kind ? ' on' : ''}`} aria-pressed={k === kind} onClick={() => setKind(k)}>
            {CARDIO_LABEL[k]}
          </button>
        ))}
      </div>
      <Stepper label="Минуты" value={minutes} onChange={setMinutes} step={() => 5} min={0} />
      <Chips
        text
        value={yesterday ? 'y' : 't'}
        onChange={(v) => setYesterday(v === 'y')}
        options={[
          { value: 't', label: 'Сегодня' },
          { value: 'y', label: 'Вчера' },
        ]}
      />
      <button
        type="button"
        className="cta"
        onClick={() => {
          if (minutes <= 0) return;
          addCardio(kind, minutes, yesterday ? addDays(today(), -1) : today());
          close();
          nav.toast('Кардио записано', `${minutes} мин · +${Math.min(XP.cardioCap, minutes)} XP`);
        }}
      >
        Записать <Icon name="check" />
      </button>
    </Sheet>
  );
}

function NumField({ label, value, onChange, unit }: { label: string; value: string; onChange: (v: string) => void; unit: string }) {
  return (
    <label className="field">
      <span>{label}, {unit}</span>
      <input className="input" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder="—" />
    </label>
  );
}

function WeekSheet({ week, data, nav, close }: { week: number; data: AppData; nav: Nav; close: () => void }) {
  const existing = data.weeks[String(week)];
  const str = (n?: number) => (n === undefined ? '' : num(n));
  const [weight, setWeight] = useState(str(existing?.weight));
  const [sleep, setSleep] = useState(existing?.sleep);
  const [energy, setEnergy] = useState(existing?.energy);
  const [edema, setEdema] = useState(existing?.edema);
  const [waist, setWaist] = useState(str(existing?.waist));
  const [hips, setHips] = useState(str(existing?.hips));
  const [thigh, setThigh] = useState(str(existing?.thigh));
  const [note, setNote] = useState(existing?.note ?? '');
  const [showMeasure, setShowMeasure] = useState([1, 8, 16].includes(week) || !!(existing?.waist || existing?.hips || existing?.thigh));
  const workouts = data.sessions.filter((s) => s.week === week && s.finishedAt).length;
  const scale = (n: number, from: number) => Array.from({ length: n }, (_, k) => ({ value: k + from, label: String(k + from) }));

  return (
    <Sheet title={`Итоги недели ${week}`} onClose={close}>
      <div className="sub">Тренировок на этой неделе: {workouts} из 4 — посчитано само.</div>
      <NumField label="Средний вес" unit="кг" value={weight} onChange={setWeight} />
      <span className="sub" style={{ marginTop: -8 }}>Среднее из 2–3 утренних взвешиваний. Смотрим на тренд, а не на один день.</span>
      <div className="field"><span>Сон, 1–5</span><Chips options={scale(5, 1)} value={sleep} onChange={setSleep} /></div>
      <div className="field"><span>Энергия, 1–5</span><Chips options={scale(5, 1)} value={energy} onChange={setEnergy} /></div>
      <div className="field"><span>Отёк, 0–3</span><Chips options={scale(4, 0)} value={edema} onChange={setEdema} /></div>
      {showMeasure ? (
        <>
          <div className="grid3">
            <NumField label="Талия" unit="см" value={waist} onChange={setWaist} />
            <NumField label="Бёдра" unit="см" value={hips} onChange={setHips} />
            <NumField label="Бедро" unit="см" value={thigh} onChange={setThigh} />
          </div>
          <span className="sub" style={{ marginTop: -8 }}>Замеры по желанию в неделях 1, 8 и 16 — в одинаковых условиях.</span>
        </>
      ) : (
        <button type="button" className="btn" onClick={() => setShowMeasure(true)}>
          <Icon name="ruler" size={16} /> Добавить замеры
        </button>
      )}
      <label className="field">
        <span>Заметки</span>
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Как прошла неделя" />
      </label>
      <button
        type="button"
        className="cta"
        onClick={() => {
          const check: WeekCheck = {
            week,
            date: existing?.date ?? today(),
            weight: parseNum(weight),
            sleep,
            energy,
            edema,
            waist: parseNum(waist),
            hips: parseNum(hips),
            thigh: parseNum(thigh),
            note: note.trim() || undefined,
          };
          saveWeek(check);
          close();
          nav.toast(`Итоги недели ${week} сохранены`, existing ? undefined : `+${XP.week} XP`);
        }}
      >
        Сохранить <Icon name="check" />
      </button>
    </Sheet>
  );
}

function NoteSheet({ title, initial, onSave, close }: { title: string; initial: string; onSave: (v: string) => void; close: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <Sheet title="Заметка" onClose={close}>
      <div className="h2" style={{ fontSize: 17 }}>{title}</div>
      <textarea className="input" autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="Техника, ощущения, что поменять в следующий раз" />
      <button
        type="button"
        className="cta"
        onClick={() => {
          onSave(v);
          close();
        }}
      >
        Сохранить <Icon name="check" />
      </button>
    </Sheet>
  );
}

function PickerSheet({ data, ids, onPick, close }: { data: AppData; ids: string[]; onPick: (id: string) => void; close: () => void }) {
  const a = analyze(data);
  return (
    <Sheet title="Упражнение" onClose={close}>
      <div className="stack">
        {ids.map((id) => {
          const ex = EX(id)!;
          return (
            <button
              key={id}
              type="button"
              className="row"
              onClick={() => {
                onPick(id);
                close();
              }}
            >
              <span className="sq">{dayOf(id) ?? <Icon name="user" size={16} />}</span>
              <span className="grow stack" style={{ gap: 0 }}>
                <span className="title ellipsis" style={{ fontSize: 14 }}>{ex.name}</span>
                <span className="sub">{setText(a.best.get(id)!, ex)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function SettingsSheet({ data, nav, close }: { data: AppData; nav: Nav; close: () => void }) {
  const profile = data.profile!;
  const [name, setName] = useState(profile.name);
  const [start, setStart] = useState(profile.startDate);
  const fileRef = useRef<HTMLInputElement>(null);
  const backup = data.lastBackup ? fmtDay(iso(new Date(data.lastBackup))).toLowerCase() : 'ещё не было';
  const restLabel = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const saveProfile = () => {
    const startDate = start ? mondayOf(start) : profile.startDate;
    setProfile({ name: name.trim() || 'Игрок', startDate });
  };

  return (
    <Sheet
      title="Настройки"
      onClose={() => {
        saveProfile();
        close();
      }}
    >
      <Label>Профиль</Label>
      <label className="field">
        <span>Имя в приложении</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveProfile} />
      </label>
      <label className="field">
        <span>Неделя 1 начинается</span>
        <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} onBlur={saveProfile} />
      </label>
      <span className="sub" style={{ marginTop: -8 }}>Неделя считается с понедельника. Сейчас старт: {fmtDay(profile.startDate).toLowerCase()}.</span>

      <Label>Отдых между подходами</Label>
      <div className="field">
        <span>Основные упражнения (3 подхода)</span>
        <Chips value={data.settings.restMain} onChange={(v) => setSettings({ restMain: v })} options={[90, 120, 150, 180].map((v) => ({ value: v, label: restLabel(v) }))} />
      </div>
      <div className="field">
        <span>Остальные</span>
        <Chips value={data.settings.restOther} onChange={(v) => setSettings({ restOther: v })} options={[60, 90, 120].map((v) => ({ value: v, label: restLabel(v) }))} />
      </div>
      <div className="field">
        <span>Сигнал в конце отдыха</span>
        <Chips text value={data.settings.sound ? 'on' : 'off'} onChange={(v) => setSettings({ sound: v === 'on' })} options={[{ value: 'on', label: 'Звук' }, { value: 'off', label: 'Без звука' }]} />
      </div>

      <Label>Данные</Label>
      <span className="sub">Все записи хранятся только на этом телефоне. Последняя копия: {backup}.</span>
      <div className="grid2">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            if ((await exportData()) === 'saved') nav.toast('Копия сохранена');
          }}
        >
          <Icon name="download" size={16} /> Выгрузить
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={16} /> Загрузить
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          nav.open({
            type: 'confirm',
            title: 'Загрузить копию',
            text: `Данные из файла «${f.name}» заменят всё, что сейчас записано в приложении.`,
            action: 'Заменить',
            danger: true,
            onConfirm: async () => {
              nav.toast((await importData(f)) ? 'Данные загружены' : 'Не получилось прочитать файл');
            },
          });
        }}
      />

      <Label>Как растёт уровень</Label>
      <div className="note-box" style={{ flexDirection: 'column', gap: 4 }}>
        <span>Подход +{XP.set} · упражнение целиком +{XP.exercise} · рекорд +{XP.pr} · тренировка +{XP.workout}</span>
        <span>Кардио +1 за минуту · белок по норме за день +{XP.protein} · итоги недели +{XP.week}</span>
        <span>Сила — рекорды, выносливость — минуты кардио, дисциплина — завершённые тренировки.</span>
      </div>

      <Label>Приложение</Label>
      <span className="sub">
        Версия от {fmtDay(iso(new Date(__BUILD_TIME__))).toLowerCase()}, {new Date(__BUILD_TIME__).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}. Обновления подтягиваются сами, когда открываешь приложение с интернетом.
      </span>
      <button
        type="button"
        className="btn"
        onClick={async () => {
          const r = await checkForUpdate();
          if (r === 'updating') nav.toast('Нашлась новая версия', 'Приложение перезапустится через пару секунд');
          else if (r === 'offline') nav.toast('Нет связи', 'Проверь интернет и попробуй ещё раз');
          else nav.toast('Это последняя версия');
        }}
      >
        <Icon name="download" size={16} /> Проверить обновления
      </button>
      <span className="sub">Установка: открой приложение в Safari → «Поделиться» → «На экран „Домой“». После этого оно работает и без интернета.</span>
      <span className="sub muted">Фото в карточках тренировок — Unsplash.</span>

      <button
        type="button"
        className="btn danger"
        style={{ marginTop: 8 }}
        onClick={() =>
          nav.open({
            type: 'confirm',
            title: 'Стереть все данные',
            text: 'Удалятся все тренировки, кардио, итоги недель и настройки. Сначала лучше выгрузить копию.',
            action: 'Стереть',
            danger: true,
            onConfirm: resetData,
          })
        }
      >
        <Icon name="trash" size={16} /> Стереть все данные
      </button>
    </Sheet>
  );
}
