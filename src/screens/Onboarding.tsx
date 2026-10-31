import { useRef, useState } from 'react';
import { importData, setProfile } from '../actions';
import { fmtDay, mondayOf, today } from '../lib/dates';
import { Hero, Icon, Label } from '../ui';

export function Onboarding() {
  const [name, setName] = useState('Игрок');
  const [start, setStart] = useState(mondayOf(today()));
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const monday = start ? mondayOf(start) : '';

  return (
    <>
      <div className="topbar">
        <span className="t-left">Система</span>
      </div>
      <Hero day="D">
        <Label>Пробуждение</Label>
        <div className="h1">Добро пожаловать<br />в Систему</div>
        <div className="sub">16 недель, 4 тренировки в неделю. Каждый подход — опыт, каждая неделя — шаг к новому уровню.</div>
      </Hero>
      <label className="field">
        <span>Как к тебе обращаться</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>Неделя 1 начинается</span>
        <input
          className="input"
          type="date"
          value={start}
          onChange={(e) => {
            setStart(e.target.value);
            setError('');
          }}
        />
      </label>
      <span className="sub" style={{ marginTop: -6 }}>
        {monday ? `Неделя считается с понедельника: ${fmtDay(monday).toLowerCase()}.` : 'Выбери дату старта.'}
      </span>
      {error && <span className="sub" style={{ color: '#f0a8a8' }}>{error}</span>}
      <button
        type="button"
        className="cta"
        style={{ marginTop: 8 }}
        onClick={() => {
          if (!monday) {
            setError('Выбери дату, с которой начинается неделя 1.');
            return;
          }
          setProfile({ name: name.trim() || 'Игрок', startDate: monday });
        }}
      >
        Начать <Icon name="right" />
      </button>
      <button type="button" className="link-btn" onClick={() => fileRef.current?.click()}>
        Восстановить из резервной копии
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f && !(await importData(f))) setError('Не получилось прочитать файл копии.');
        }}
      />
    </>
  );
}
