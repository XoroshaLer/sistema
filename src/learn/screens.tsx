import { useMemo, useState, type ReactNode } from 'react';
import { WD_SHORT, addDays, fmtDay, fmtMonth, today, weekday } from '../lib/dates';
import { plural } from '../lib/format';
import { analyze } from '../lib/logic';
import type { LearnTab, Nav } from '../nav';
import type { AppData } from '../store';
import { Bar, Check, Icon, Label, MenuButton, Seg, TopBar } from '../ui';
import {
  LEARN_XP,
  booksBy,
  currentBooks,
  daysToRead,
  deleteThought,
  finishForecast,
  learningOf,
  notesOn,
  pace,
  pagesOn,
  readInYear,
  saveNote,
  sortedNotes,
  streak,
  thoughtsOf,
  topicCounts,
  type Book,
  type BookStatus,
  type Learning,
  type Note,
} from './model';

const pagesWord = (n: number) => plural(n, 'страница', 'страницы', 'страниц');

export function LearnRoot({ data, tab, nav }: { data: AppData; tab: LearnTab; nav: Nav }) {
  const l = learningOf(data);
  if (tab === 'notes') return <Notes l={l} nav={nav} />;
  if (tab === 'reading') return <Reading l={l} nav={nav} />;
  return <Today data={data} l={l} nav={nav} />;
}

function Top({ nav, right }: { nav: Nav; right?: ReactNode }) {
  return <TopBar left={<MenuButton label="Самообразование" onOpen={nav.menu} />} right={right} />;
}

/** Faint </> for the hero card. */
function CodeArt() {
  return (
    <svg className="photo" viewBox="0 0 230 170" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <g fill="none" stroke="#8FC2F0" strokeOpacity="0.16" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M108 46L64 85l44 39" />
        <path d="M172 46l44 39-44 39" />
        <path d="M150 30l-26 110" />
      </g>
    </svg>
  );
}

// ---------- today ----------

function Today({ data, l, nav }: { data: AppData; l: Learning; nav: Nav }) {
  const t = today();
  const a = useMemo(() => analyze(data), [data]);
  const s = streak(l);
  const noted = notesOn(l, t).length > 0;
  const goal = l.pagesGoal;
  const pages = pagesOn(l, t);
  const book = currentBooks(l)[0];
  const recent = sortedNotes(l).slice(0, 3);

  return (
    <>
      <Top nav={nav} right={<span className="t-date">{fmtDay(t)}</span>} />

      <section className="hero">
        <CodeArt />
        <div className="fade" />
        <div className="body">
          {l.notes.length ? (
            <>
              <Label>Серия записей</Label>
              <div className="h1" style={{ fontSize: 32 }}>{s.current} {plural(s.current, 'день', 'дня', 'дней')}</div>
              <div className="meta">Рекорд {s.best} · интеллект {a.stats.int}</div>
            </>
          ) : (
            <>
              <Label>Самообразование</Label>
              <div className="h1">Что нового<br />ты узнала?</div>
              <div className="sub">Пара предложений своими словами каждый день — так знания не теряются.</div>
            </>
          )}
        </div>
      </section>

      <div className="stack">
        <Label>Задания дня</Label>
        <button type="button" className="row with-check" onClick={() => nav.open({ type: 'learn', form: 'note' })}>
          <span className="sq"><Icon name="code" size={18} /></span>
          <span className="grow stack" style={{ gap: 1 }}>
            <span className="title">Запиши, что узнала</span>
            <span className="sub accent" style={{ fontSize: 12 }}>{noted ? 'записано' : 'программирование'} · +{LEARN_XP.note} XP</span>
          </span>
          <Check on={noted} />
        </button>
        <button type="button" className="row with-check" onClick={() => nav.open(book ? { type: 'learn', form: 'pages', id: book.id } : { type: 'learn', form: 'book' })}>
          <span className="sq"><Icon name="bookOpen" size={18} /></span>
          <span className="grow stack" style={{ gap: 5, padding: '6px 4px 6px 0' }}>
            <span className="title">{goal} {pagesWord(goal)} художественной</span>
            <span className="sub accent ellipsis" style={{ fontSize: 12 }}>{book ? `${pages} из ${goal} · «${book.title}»` : 'Добавь книгу, которую читаешь'}</span>
            <Bar value={pages / goal} />
          </span>
          <Check on={pages >= goal} />
        </button>
      </div>

      <Composer l={l} nav={nav} noted={noted} />

      {recent.length > 0 && (
        <div className="stack">
          <Label>Недавно узнала</Label>
          {recent.map((n) => <NoteCard key={n.id} n={n} nav={nav} />)}
          {l.notes.length > recent.length && (
            <button type="button" className="link-btn" onClick={() => nav.goLearn('notes')}>
              Все записи · {l.notes.length}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function Composer({ l, nav, noted }: { l: Learning; nav: Nav; noted: boolean }) {
  const [text, setText] = useState('');
  const [topic, setTopic] = useState<string>();
  const topics = topicCounts(l).slice(0, 4).map((x) => x.topic);
  const save = () => {
    if (!text.trim()) return;
    saveNote({ date: today(), text: text.trim(), topic });
    setText('');
    setTopic(undefined);
    nav.toast(noted ? 'Запись сохранена' : 'Задание выполнено', noted ? topic : `+${LEARN_XP.note} XP · Интеллект`);
  };
  return (
    <section className="card">
      <Label>Что нового сегодня</Label>
      <textarea className="input" aria-label="Что нового сегодня" value={text} onChange={(e) => setText(e.target.value)} placeholder="Например: разобралась, как работают индексы в базе…" />
      <div className="chip-wrap">
        {topics.map((x) => (
          <button key={x} type="button" className={`chip text${topic === x ? ' on' : ''}`} aria-pressed={topic === x} onClick={() => setTopic(topic === x ? undefined : x)}>
            {x}
          </button>
        ))}
        <button type="button" className="chip text dashed" onClick={() => nav.open({ type: 'learn', form: 'note', draft: text })}>
          {topics.length ? 'Ещё…' : '+ Тема, ссылка, время'}
        </button>
      </div>
      <button type="button" className="cta" disabled={!text.trim()} onClick={save}>
        {noted ? 'Записать ещё' : `Записать · +${LEARN_XP.note} XP`}
      </button>
    </section>
  );
}

function NoteCard({ n, nav }: { n: Note; nav: Nav }) {
  return (
    <button type="button" className="card note-card" onClick={() => nav.open({ type: 'learn', form: 'note', id: n.id })}>
      <span className="note-head">
        <span>{fmtDay(n.date)}{n.minutes ? ` · ${n.minutes >= 90 ? '90+' : n.minutes} мин` : ''}</span>
        {n.topic && <span className="accent">{n.topic}</span>}
      </span>
      <span className="note-text">{n.text}</span>
      {n.source && (
        <span className="note-src ellipsis">
          <Icon name="link" size={14} /> {n.source}
        </span>
      )}
    </button>
  );
}

// ---------- notes ----------

function Notes({ l, nav }: { l: Learning; nav: Nav }) {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const topics = topicCounts(l);
  const query = q.trim().toLowerCase();
  const list = sortedNotes(l).filter((n) => (!topic || n.topic === topic) && (!query || `${n.text} ${n.topic ?? ''} ${n.source ?? ''}`.toLowerCase().includes(query)));
  const groups: [string, Note[]][] = [];
  for (const n of list) {
    const m = n.date.slice(0, 7);
    if (groups[groups.length - 1]?.[0] !== m) groups.push([m, []]);
    groups[groups.length - 1][1].push(n);
  }

  return (
    <>
      <Top
        nav={nav}
        right={
          <button type="button" className="icon-btn" aria-label="Новая запись" onClick={() => nav.open({ type: 'learn', form: 'note' })}>
            <Icon name="plus" size={22} stroke={1.6} />
          </button>
        }
      />
      {l.notes.length === 0 ? (
        <div className="empty">
          Здесь соберутся все твои записи о программировании — с поиском и темами. Это станет твоей базой знаний.
        </div>
      ) : (
        <>
          <div className="search">
            <Icon name="search" size={18} />
            <input className="input" type="search" placeholder="Поиск по записям" aria-label="Поиск по записям" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {topics.length > 0 && (
            <div className="chip-scroll">
              <button type="button" className={`chip text${topic === null ? ' on' : ''}`} aria-pressed={topic === null} onClick={() => setTopic(null)}>
                Все · {l.notes.length}
              </button>
              {topics.map((x) => (
                <button key={x.topic} type="button" className={`chip text${topic === x.topic ? ' on' : ''}`} aria-pressed={topic === x.topic} onClick={() => setTopic(topic === x.topic ? null : x.topic)}>
                  {x.topic} · {x.n}
                </button>
              ))}
            </div>
          )}
          {groups.map(([m, notes]) => (
            <div key={m} className="stack">
              <Label>{fmtMonth(`${m}-01`)} · {notes.length} {plural(notes.length, 'запись', 'записи', 'записей')}</Label>
              {notes.map((n) => <NoteCard key={n.id} n={n} nav={nav} />)}
            </div>
          ))}
          {list.length === 0 && <div className="empty">Ничего не нашлось.</div>}
        </>
      )}
    </>
  );
}

// ---------- reading ----------

const COVERS = [
  ['#3a3524', '#574f33', '#e3d7ae'],
  ['#2b3346', '#414c66', '#c8d2ea'],
  ['#2c3a30', '#43574a', '#cfe0c4'],
  ['#45292b', '#633d40', '#eac6c0'],
  ['#25252d', '#3e3e4a', '#d8c79a'],
  ['#263a44', '#3d5866', '#c4dde6'],
];

function Cover({ book, lg }: { book: Book; lg?: boolean }) {
  let h = 0;
  for (const ch of book.title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, line, ink] = COVERS[h % COVERS.length];
  return (
    <span className={`book-cover${lg ? ' lg' : ''}`} aria-hidden="true" style={{ background: bg, borderColor: line, color: ink }}>
      {lg && book.author && <small>{book.author.split(' ').pop()}</small>}
      <b>{book.title}</b>
    </span>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <svg className="stars" width="76" height="14" viewBox="0 0 76 14" role="img" aria-label={`Оценка ${n} из 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          transform={`translate(${i * 15.5} 0) scale(0.58)`}
          d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
          fill={i < n ? '#8FC2F0' : 'none'}
          stroke={i < n ? 'none' : '#4A5664'}
          strokeWidth="2.4"
        />
      ))}
    </svg>
  );
}

function PagesChart({ l }: { l: Learning }) {
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const values = days.map((d) => pagesOn(l, d));
  const goal = l.pagesGoal;
  const H = 96;
  const max = Math.max(goal * 1.3, ...values);
  const h = (v: number) => Math.round((v / max) * H);
  return (
    <div role="img" aria-label={`Страницы по дням: ${days.map((d, i) => `${WD_SHORT[weekday(d)].toLowerCase()} ${values[i]}`).join(', ')}. Норма ${goal}.`}>
      <div className="pchart" style={{ height: H + 18 }}>
        <span className="pchart-goal" style={{ bottom: h(goal) }}><b>{goal}</b></span>
        {values.map((v, i) => (
          <span key={days[i]} className="pchart-col">
            <span className={i === 6 ? 'now' : ''}>{v || ''}</span>
            <i className={v >= goal ? 'on' : v > 0 ? 'some' : 'none'} style={{ height: v ? Math.max(3, h(v)) : 2 }} />
          </span>
        ))}
      </div>
      <div className="pchart-days">
        {days.map((d, i) => <span key={d} className={i === 6 ? 'accent' : ''}>{WD_SHORT[weekday(d)]}</span>)}
      </div>
    </div>
  );
}

function bookMeta(l: Learning, b: Book): string {
  const parts: string[] = [];
  if (b.status === 'done') {
    if (b.finishedOn) parts.push(fmtMonth(b.finishedOn).toLowerCase());
    parts.push(`${b.pages} стр.`);
    const days = daysToRead(l, b);
    if (days) parts.push(`${days} ${plural(days, 'день', 'дня', 'дней')}`);
  } else if (b.status === 'reading') parts.push(`стр. ${b.page} из ${b.pages}`);
  else parts.push(`${b.pages} стр.`);
  if (!b.fiction) parts.push('нон-фикшн');
  return parts.join(' · ');
}

function BookRow({ l, b, onClick }: { l: Learning; b: Book; onClick: () => void }) {
  return (
    <button type="button" className="card book-row" onClick={onClick}>
      <Cover book={b} />
      <span className="grow stack" style={{ gap: 3 }}>
        <span className="book-title">{b.title}</span>
        {b.author && <span className="sub" style={{ fontSize: 12 }}>{b.author}</span>}
        <span className="accent" style={{ fontSize: 12 }}>{bookMeta(l, b)}</span>
        {b.status === 'reading' && <Bar value={b.page / b.pages} />}
        {b.status === 'done' && b.rating ? <Stars n={b.rating} /> : null}
        {b.review && <span className="sub book-review">{b.review}</span>}
      </span>
    </button>
  );
}

function Reading({ l, nav }: { l: Learning; nav: Nav }) {
  const [shelf, setShelf] = useState(false);
  if (shelf) return <Shelf l={l} nav={nav} back={() => setShelf(false)} />;

  const books = currentBooks(l);
  const book = books[0];
  const goal = l.pagesGoal;
  const pages = pagesOn(l, today());
  const thoughts = book ? thoughtsOf(l, book.id) : [];
  const done = booksBy(l, 'done').length;
  const perDay = pace(l);
  const forecast = book && finishForecast(l, book);

  return (
    <>
      <Top
        nav={nav}
        right={
          <button type="button" className="t-left" style={{ fontSize: 13, letterSpacing: '0.12em' }} onClick={() => setShelf(true)}>
            <Icon name="shelf" size={18} /> Полка
          </button>
        }
      />

      {book ? (
        <>
          <Label>Сейчас читаю</Label>
          <button type="button" className="card book-card" onClick={() => nav.open({ type: 'learn', form: 'book', id: book.id })}>
            <Cover book={book} lg />
            <span className="grow stack" style={{ gap: 4 }}>
              <span className="book-title lg">{book.title}</span>
              {book.author && <span className="sub">{book.author}</span>}
              <span className="grow" />
              <span style={{ fontSize: 13 }}>стр. {book.page} из {book.pages}</span>
              <Bar value={book.page / book.pages} />
              <span className="accent" style={{ fontSize: 12 }}>
                {Math.round((book.page / book.pages) * 100)}%{forecast ? ` · дочитаешь ≈ ${forecast.toLowerCase()}` : ''}
              </span>
            </span>
          </button>

          <section className="card">
            <div className="between">
              <span style={{ fontWeight: 600, fontSize: 15 }}>Сегодня</span>
              <span className="accent" style={{ fontWeight: 600, fontSize: 15 }}>{pages} / {goal} стр.</span>
            </div>
            <Bar value={pages / goal} />
            <span className="sub" style={{ fontSize: 12 }}>
              {pages >= goal ? `Норма выполнена · +${LEARN_XP.pages} XP` : `Ещё ${goal - pages} ${pagesWord(goal - pages)} до нормы · +${LEARN_XP.pages} XP`}
              {!book.fiction && ' · эта книга не художественная, в норму не идёт'}
            </span>
            <button type="button" className="cta" onClick={() => nav.open({ type: 'learn', form: 'pages', id: book.id })}>
              Записать страницы
            </button>
          </section>

          {books.length > 1 && (
            <div className="stack">
              <Label>Ещё читаю</Label>
              {books.slice(1).map((b) => <BookRow key={b.id} l={l} b={b} onClick={() => nav.open({ type: 'learn', form: 'pages', id: b.id })} />)}
            </div>
          )}
        </>
      ) : (
        <div className="empty stack" style={{ gap: 14 }}>
          <span>Добавь книгу, которую читаешь. Система будет считать страницы и норму — {goal} {pagesWord(goal)} художественной в день.</span>
          <button type="button" className="cta" onClick={() => nav.open({ type: 'learn', form: 'book' })}>
            Добавить книгу <Icon name="plus" />
          </button>
        </div>
      )}

      <div className="stack">
        <Label>Последние 7 дней{perDay !== undefined ? ` · ≈ ${Math.round(perDay)} стр. в день` : ''}</Label>
        <section className="card">
          <PagesChart l={l} />
        </section>
      </div>

      {thoughts.length > 0 && (
        <div className="stack">
          <Label>Мысли и цитаты · {thoughts.length}</Label>
          {thoughts.slice(0, 5).map((x) => (
            <div key={x.id} className="note-box thought">
              <Icon name="quote" size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              <span className="grow stack" style={{ gap: 4 }}>
                <span className="note-text">{x.text}</span>
                <span style={{ fontSize: 12 }}>{x.page ? `стр. ${x.page} · ` : ''}{fmtDay(x.date).toLowerCase()}</span>
              </span>
              <button
                type="button"
                className="icon-btn"
                style={{ color: 'var(--muted)', marginTop: -8 }}
                aria-label="Удалить мысль"
                onClick={() => nav.open({ type: 'confirm', title: 'Удалить мысль?', text: x.text, action: 'Удалить', danger: true, onConfirm: () => deleteThought(x.id) })}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="row" onClick={() => setShelf(true)}>
        <span className="sq"><Icon name="shelf" size={18} /></span>
        <span className="title grow">Полка</span>
        <span className="val">прочитано {done}</span>
        <Icon name="right" style={{ color: 'var(--text-2)', flexShrink: 0 }} />
      </button>
    </>
  );
}

const SHELF_TABS: { value: BookStatus; label: string }[] = [
  { value: 'reading', label: 'Читаю' },
  { value: 'done', label: 'Прочитано' },
  { value: 'want', label: 'Хочу' },
];

const EMPTY_SHELF: Record<BookStatus, string> = {
  reading: 'Сейчас ничего не читаешь.',
  done: 'Здесь будут прочитанные книги с оценкой и отзывом.',
  want: 'Запиши книги, которые хочешь прочитать, чтобы не потерять.',
};

function Shelf({ l, nav, back }: { l: Learning; nav: Nav; back: () => void }) {
  const [tab, setTab] = useState<BookStatus>('done');
  const year = today().slice(0, 4);
  const y = readInYear(l, year);
  const list = booksBy(l, tab);

  return (
    <>
      <TopBar
        left={
          <button type="button" className="t-left" onClick={back}>
            <Icon name="left" size={20} /> Чтение
          </button>
        }
        mid="Полка"
        right={
          <button type="button" className="icon-btn" aria-label="Добавить книгу" onClick={() => nav.open({ type: 'learn', form: 'book', status: tab })}>
            <Icon name="plus" size={22} stroke={1.6} />
          </button>
        }
      />
      <section className="card">
        <Label>Прочитано в {year}</Label>
        <div className="h1" style={{ fontSize: 30 }}>{y.books} {plural(y.books, 'книга', 'книги', 'книг')}</div>
        <div className="meta">{y.pages.toLocaleString('ru-RU')} {pagesWord(y.pages)}</div>
      </section>
      <Seg label="Книги" value={tab} onChange={setTab} options={SHELF_TABS} />
      {list.length ? (
        list.map((b) => <BookRow key={b.id} l={l} b={b} onClick={() => nav.open({ type: 'learn', form: 'book', id: b.id })} />)
      ) : (
        <div className="empty">{EMPTY_SHELF[tab]}</div>
      )}
      <button type="button" className="btn" onClick={() => nav.open({ type: 'learn', form: 'book', status: tab })}>
        <Icon name="plus" size={16} /> Добавить книгу
      </button>
    </>
  );
}
