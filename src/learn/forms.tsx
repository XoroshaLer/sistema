import { useState, type ReactNode } from 'react';
import { fmtDay, today } from '../lib/dates';
import { parseNum, plural } from '../lib/format';
import type { LearnForm, Nav } from '../nav';
import type { AppData } from '../store';
import { Chips, Icon, Sheet, Stepper } from '../ui';
import {
  LEARN_XP,
  addThought,
  daysToRead,
  deleteBook,
  deleteNote,
  finishBook,
  firstNoteToday,
  learningOf,
  logPages,
  pagesOn,
  saveBook,
  saveNote,
  topicCounts,
  type Book,
  type BookStatus,
  type Learning,
  type Note,
} from './model';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <span className="sub" style={{ fontSize: 12 }}>{hint}</span>}
    </label>
  );
}

/** A field with buttons inside; a <label> would click the first of them. */
function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span>{label}</span>
      {children}
      {hint && <span className="sub" style={{ fontSize: 12 }}>{hint}</span>}
    </div>
  );
}

function ErrorText({ text }: { text: string }) {
  return text ? <span className="sub" style={{ color: '#f0a8a8' }}>{text}</span> : null;
}

const isUrl = (s: string) => /^(https?:\/\/|www\.)\S+$|^[\w-]+(\.[\w-]+)+\/\S*$/i.test(s.trim());
const toUrl = (s: string) => (/^https?:\/\//i.test(s.trim()) ? s.trim() : `https://${s.trim()}`);

const MINUTES = [15, 30, 45, 60, 90].map((v) => ({ value: v, label: v === 90 ? '90+' : String(v) }));

function NoteForm({ l, note, draft, nav, close }: { l: Learning; note?: Note; draft?: string; nav: Nav; close: () => void }) {
  const [text, setText] = useState(note?.text ?? draft ?? '');
  const [topic, setTopic] = useState(note?.topic ?? '');
  const [source, setSource] = useState(note?.source ?? '');
  const [minutes, setMinutes] = useState(note?.minutes);
  const [error, setError] = useState('');
  const topics = topicCounts(l).map((x) => x.topic);
  const [typing, setTyping] = useState(!!topic && !topics.includes(topic));

  return (
    <>
      <span className="meta" style={{ fontSize: 11, marginTop: -6 }}>{fmtDay(note?.date ?? today())} · программирование</span>
      <Field label="Своими словами">
        <textarea className="input" style={{ height: 150 }} autoFocus={!note} value={text} onChange={(e) => setText(e.target.value)} placeholder="Что поняла, как это работает, где пригодится" />
      </Field>
      <Group label="Тема">
        <div className="chip-wrap">
          {topics.map((x) => (
            <button
              key={x}
              type="button"
              className={`chip text${topic === x && !typing ? ' on' : ''}`}
              aria-pressed={topic === x && !typing}
              onClick={() => {
                setTyping(false);
                setTopic(topic === x ? '' : x);
              }}
            >
              {x}
            </button>
          ))}
          <button
            type="button"
            className={`chip text dashed${typing ? ' on' : ''}`}
            aria-pressed={typing}
            onClick={() => {
              setTyping(!typing);
              setTopic('');
            }}
          >
            + Новая
          </button>
        </div>
        {typing && <input className="input" autoFocus aria-label="Новая тема" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Например, React или SQL" />}
      </Group>
      <Field label="Источник · необязательно">
        <input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ссылка, курс или книга" />
      </Field>
      {isUrl(source) && (
        <a className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -6 }} href={toUrl(source)} target="_blank" rel="noreferrer">
          <Icon name="link" size={16} /> Открыть ссылку
        </a>
      )}
      <Group label="Сколько занималась, мин · необязательно">
        <Chips value={minutes} onChange={(v) => setMinutes(minutes === v ? undefined : v)} options={MINUTES} />
      </Group>
      <ErrorText text={error} />
      <button
        type="button"
        className="cta"
        onClick={() => {
          if (!text.trim()) return setError('Напиши хотя бы пару слов.');
          const first = !note && firstNoteToday();
          saveNote({ id: note?.id, date: note?.date ?? today(), text: text.trim(), topic: topic.trim() || undefined, source: source.trim() || undefined, minutes });
          close();
          nav.toast(first ? 'Задание выполнено' : 'Запись сохранена', first ? `+${LEARN_XP.note} XP · Интеллект` : undefined);
        }}
      >
        Сохранить <Icon name="check" />
      </button>
      {note && (
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            deleteNote(note.id);
            close();
            nav.toast('Запись удалена');
          }}
        >
          <Icon name="trash" size={16} /> Удалить
        </button>
      )}
    </>
  );
}

function PagesForm({ l, book, nav, close }: { l: Learning; book: Book; nav: Nav; close: () => void }) {
  const [page, setPage] = useState(book.page);
  const [thought, setThought] = useState('');
  const goal = l.pagesGoal;
  const before = pagesOn(l, today());
  const diff = page - book.page;
  const after = book.fiction ? Math.max(0, before + diff) : before;
  const finished = page >= book.pages;

  return (
    <>
      <span className="sub" style={{ marginTop: -6 }}>«{book.title}» · была стр. {book.page} из {book.pages}</span>
      <Stepper label="Остановилась на странице" value={page} onChange={(v) => setPage(Math.min(book.pages, v))} step={() => 1} />
      {diff !== 0 && (
        <div className="note-box" style={after >= goal && book.fiction ? { borderColor: 'var(--check-line)', background: '#15263a', color: '#d3e4f4' } : undefined}>
          {diff > 0 ? `+${diff} стр.` : `${diff} стр. — поправлю сегодняшнюю запись`}
          {book.fiction ? ` · за сегодня ${after} из ${goal}` : ' · нон-фикшн, в норму не идёт'}
          {book.fiction && after >= goal && before < goal ? ` · норма выполнена, +${LEARN_XP.pages} XP` : ''}
        </div>
      )}
      <Group label="Или прибавь">
        <div className="grid3">
          {[10, 20, 30].map((n) => (
            <button key={n} type="button" className="btn" onClick={() => setPage(Math.min(book.pages, page + n))}>
              +{n} стр.
            </button>
          ))}
        </div>
      </Group>
      <label className="check-line">
        <input type="checkbox" checked={finished} onChange={(e) => setPage(e.target.checked ? book.pages : book.page)} />
        <span className="stack" style={{ gap: 2 }}>
          <span>Дочитала книгу</span>
          <span className="sub" style={{ fontSize: 12 }}>Потом попрошу оценку и пару слов о книге</span>
        </span>
      </label>
      <Field label="Мысль или цитата · необязательно">
        <textarea className="input" style={{ height: 72 }} value={thought} onChange={(e) => setThought(e.target.value)} placeholder="Что зацепило в этих страницах?" />
      </Field>
      <button
        type="button"
        className="cta"
        onClick={() => {
          logPages(book.id, page);
          if (thought.trim()) addThought(book.id, thought.trim(), page || undefined);
          if (finished) {
            finishBook(book.id);
            nav.open({ type: 'learn', form: 'finish', id: book.id });
            nav.toast('Книга прочитана', `+${LEARN_XP.book} XP · Интеллект`);
            return;
          }
          close();
          if (book.fiction && after >= goal && before < goal) nav.toast('Норма страниц выполнена', `+${LEARN_XP.pages} XP`);
        }}
      >
        Сохранить <Icon name="check" />
      </button>
    </>
  );
}

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'reading', label: 'Читаю' },
  { value: 'want', label: 'Хочу' },
  { value: 'done', label: 'Прочитала' },
];

const RATING = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }));

function BookForm({ book, status, nav, close }: { book?: Book; status?: BookStatus; nav: Nav; close: () => void }) {
  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [pages, setPages] = useState(book ? String(book.pages) : '');
  const [page, setPage] = useState(book?.page ? String(book.page) : '');
  const [fiction, setFiction] = useState(book?.fiction ?? true);
  const [st, setSt] = useState<BookStatus>(book?.status ?? status ?? 'reading');
  const [rating, setRating] = useState(book?.rating);
  const [review, setReview] = useState(book?.review ?? '');
  const [error, setError] = useState('');

  return (
    <>
      <Field label="Название">
        <input className="input" autoFocus={!book} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Пикник на обочине" />
      </Field>
      <Field label="Автор · необязательно">
        <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Аркадий и Борис Стругацкие" />
      </Field>
      <Field label="Страниц в книге">
        <input className="input" inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="248" />
      </Field>
      <Group label="Жанр" hint="В дневную норму идёт только художественная литература.">
        <Chips text value={fiction ? 'f' : 'n'} onChange={(v) => setFiction(v === 'f')} options={[{ value: 'f', label: 'Художественная' }, { value: 'n', label: 'Нон-фикшн' }]} />
      </Group>
      <Group label="Статус">
        <Chips text value={st} onChange={setSt} options={STATUS_OPTIONS} />
      </Group>
      {st === 'reading' && (
        <Field label="На какой странице сейчас" hint="Эти страницы не войдут в сегодняшнюю норму — дальше отмечай через «Записать страницы».">
          <input className="input" inputMode="numeric" value={page} onChange={(e) => setPage(e.target.value)} placeholder="0" />
        </Field>
      )}
      {st === 'done' && (
        <>
          <Group label="Оценка">
            <Chips value={rating} onChange={setRating} options={RATING} />
          </Group>
          <Field label="Пара слов о книге · необязательно">
            <textarea className="input" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Что запомнилось, кому посоветовать" />
          </Field>
        </>
      )}
      <ErrorText text={error} />
      <button
        type="button"
        className="cta"
        onClick={() => {
          const total = parseNum(pages);
          if (!title.trim() || !total || total < 1) return setError('Впиши название и сколько страниц в книге.');
          const n = Math.round(total);
          const at = st === 'done' ? n : st === 'reading' ? Math.min(n, Math.max(0, Math.round(parseNum(page) ?? 0))) : book?.page ?? 0;
          saveBook({
            id: book?.id,
            title: title.trim(),
            author: author.trim() || undefined,
            pages: n,
            fiction,
            status: st,
            page: Math.min(n, at),
            finishedOn: st === 'done' ? book?.finishedOn ?? today() : undefined,
            rating: st === 'done' ? rating : undefined,
            review: st === 'done' ? review.trim() || undefined : undefined,
          });
          close();
          if (st === 'done' && book?.status !== 'done') nav.toast('Книга прочитана', `+${LEARN_XP.book} XP · Интеллект`);
        }}
      >
        Сохранить <Icon name="check" />
      </button>
      {book && (
        <button
          type="button"
          className="btn danger"
          onClick={() =>
            nav.open({
              type: 'confirm',
              title: 'Удалить книгу?',
              text: `«${book.title}» исчезнет вместе с записанными страницами и мыслями.`,
              action: 'Удалить',
              danger: true,
              onConfirm: () => deleteBook(book.id),
            })
          }
        >
          <Icon name="trash" size={16} /> Удалить
        </button>
      )}
    </>
  );
}

function FinishForm({ l, book, close }: { l: Learning; book: Book; close: () => void }) {
  const [rating, setRating] = useState(book.rating);
  const [review, setReview] = useState(book.review ?? '');
  const days = daysToRead(l, book);
  return (
    <>
      <span className="sub" style={{ marginTop: -6 }}>
        «{book.title}» · {book.pages} стр.{days ? ` за ${days} ${plural(days, 'день', 'дня', 'дней')}` : ''}
      </span>
      <Group label="Оценка">
        <Chips value={rating} onChange={setRating} options={RATING} />
      </Group>
      <Field label="Пара слов о книге · необязательно">
        <textarea className="input" autoFocus value={review} onChange={(e) => setReview(e.target.value)} placeholder="Что запомнилось, кому посоветовать" />
      </Field>
      <button
        type="button"
        className="cta"
        onClick={() => {
          saveBook({ ...book, rating, review: review.trim() || undefined });
          close();
        }}
      >
        На полку <Icon name="check" />
      </button>
    </>
  );
}

const TITLES: Record<LearnForm, string> = { note: 'Что нового узнала', pages: 'Где остановилась?', book: 'Книга', finish: 'Книга прочитана' };

export function LearnSheet({ data, form, id, draft, status, nav, close }: { data: AppData; form: LearnForm; id?: string; draft?: string; status?: BookStatus; nav: Nav; close: () => void }) {
  const l = learningOf(data);
  const book = id ? l.books.find((b) => b.id === id) : undefined;
  let body: ReactNode = null;
  let title = TITLES[form];
  if (form === 'note') {
    const note = id ? l.notes.find((n) => n.id === id) : undefined;
    if (note) title = 'Запись';
    body = <NoteForm l={l} note={note} draft={draft} nav={nav} close={close} />;
  }
  if (form === 'pages' && book) body = <PagesForm l={l} book={book} nav={nav} close={close} />;
  if (form === 'book') {
    if (!book) title = 'Новая книга';
    body = <BookForm book={book} status={status} nav={nav} close={close} />;
  }
  if (form === 'finish' && book) body = <FinishForm l={l} book={book} close={close} />;
  return (
    <Sheet title={title} onClose={close}>
      {body}
    </Sheet>
  );
}
