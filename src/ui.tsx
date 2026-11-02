import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Day } from './data/program';
import { num, parseNum } from './lib/format';
import { DAY_PHOTO } from './photos';

export type IconName =
  | 'user' | 'dumbbell' | 'chart' | 'book' | 'gear' | 'check' | 'left' | 'right' | 'down'
  | 'plus' | 'download' | 'upload' | 'lock' | 'pulse' | 'bowl' | 'calendar' | 'ruler'
  | 'pen' | 'trash' | 'clock' | 'target' | 'info' | 'trend' | 'walk' | 'x' | 'skip' | 'swap' | 'up' | 'search' | 'home'
  | 'menu' | 'wallet' | 'briefcase' | 'shield' | 'receipt' | 'pie' | 'coins' | 'percent'
  | 'code' | 'bookOpen' | 'shelf' | 'quote' | 'link' | 'today';

const PATHS: Record<IconName, ReactNode> = {
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  dumbbell: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  chart: <path d="M4 19V11M10 19V5M16 19v-6M3 21h18" />,
  book: (<><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></>),
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  check: <path d="M5 12l5 5 9-10" />,
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />,
  upload: <path d="M12 15V3M7 8l5-5 5 5M4 19h16" />,
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  bowl: (<><path d="M5 11h14a7 7 0 0 1-14 0z" /><path d="M9 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4" /></>),
  calendar: (<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>),
  ruler: (<><rect x="2" y="8" width="20" height="8" rx="1" /><path d="M6 8v3M10 8v4M14 8v3M18 8v4" /></>),
  pen: (<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  clock: (<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></>),
  target: (<><circle cx="12" cy="12" r="6" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>),
  trend: (<><path d="M4 17l6-6 4 4 6-8" /><path d="M14 7h6v6" /></>),
  walk: (<><circle cx="13" cy="4" r="2" /><path d="M9 21l2-6 3 3v3M7 12l3-4 4 1 2 4 3 1" /></>),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  skip: <path d="M6 6l8 6-8 6zM17 6v12" />,
  swap: <path d="M4 8h14l-3-3M20 16H6l3 3" />,
  up: <path d="M6 15l6-6 6 6" />,
  search: (<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>),
  home: <path d="M4 11l8-6 8 6v9h-5v-6H9v6H4z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  wallet: (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M15 12.5h3M6 6V5a2 2 0 0 1 2-2h9" /></>),
  briefcase: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2" /></>),
  shield: <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />,
  receipt: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>),
  pie: (<><circle cx="12" cy="12" r="9" /><path d="M12 3v9h9" /></>),
  coins: (<><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.7-2.7-3-6-3" /></>),
  percent: <path d="M19 5L5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
  code: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />,
  bookOpen: (<><path d="M12 7c-2-1.6-5-2-8-1.5V19c3-.5 6-.1 8 1.5 2-1.6 5-2 8-1.5V5.5c-3-.5-6-.1-8 1.5z" /><path d="M12 7v13.5" /></>),
  shelf: (<><rect x="3" y="4" width="4" height="16" /><rect x="9" y="4" width="4" height="16" /><path d="M15 5.5l3.4-1 3.2 14.8-3.4 1z" /></>),
  quote: <path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6" />,
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  today: (<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><rect x="8" y="13" width="3" height="3" /></>),
};

/** «≡ МОДУЛЬ» in the top bar of a module's main screens; opens the side menu. */
export function MenuButton({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button type="button" className="t-left" onClick={onOpen} aria-label={`Меню модулей. Сейчас: ${label}`}>
      <Icon name="menu" size={22} />
      {label}
    </button>
  );
}

export function Icon({ name, size = 20, stroke = 1.8, style }: { name: IconName; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      {PATHS[name]}
    </svg>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="label" style={style}>{children}</div>;
}

export function TopBar({ left, mid, right }: { left: ReactNode; mid?: ReactNode; right?: ReactNode }) {
  return (
    <div className="topbar">
      {typeof left === 'string' ? <span className="t-left">{left}</span> : left}
      <span className="t-mid">{mid}</span>
      <span className="t-right">{right}</span>
    </div>
  );
}

export function Bar({ value, tone }: { value: number; tone?: 'warn' }) {
  return (
    <div className={`bar${tone ? ` ${tone}` : ''}`}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function SegBar({ states }: { states: ('on' | 'done' | 'future' | '')[] }) {
  return (
    <div className="segbar" style={{ gridTemplateColumns: `repeat(${states.length}, minmax(0, 1fr))` }}>
      {states.map((s, i) => <i key={i} className={s} />)}
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="tablist" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string | number>({ options, value, onChange, text }: { options: { value: T; label: string }[]; value: T | undefined; onChange: (v: T) => void; text?: boolean }) {
  return (
    <div className="chips" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} className={`chip${text ? ' text' : ''}${o.value === value ? ' on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** − value + with the value typeable from the iPhone number pad. */
export function Stepper({ label, value, onChange, step, min = 0, decimal }: { label: string; value: number; onChange: (v: number) => void; step: (value: number, dir: 1 | -1) => number; min?: number; decimal?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (decimal ? num(value) : String(value));
  const round = (n: number) => Math.max(min, Math.round(n * 100) / 100);
  const commit = () => {
    const n = draft === null ? undefined : parseNum(draft);
    if (n !== undefined) onChange(round(decimal ? n : Math.round(n)));
    setDraft(null);
  };
  return (
    <div className="stepbox">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" aria-label={`${label}: меньше`} onClick={() => onChange(round(value - step(value, -1)))}>−</button>
        <input
          inputMode={decimal ? 'decimal' : 'numeric'}
          aria-label={label}
          value={shown}
          onFocus={(e) => {
            setDraft(shown);
            e.currentTarget.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <button type="button" aria-label={`${label}: больше`} onClick={() => onChange(round(value + step(value, 1)))}>+</button>
      </div>
    </div>
  );
}

export function weightStep(w: number, dir: 1 | -1): number {
  return (dir > 0 ? w >= 20 : w > 20) ? 2.5 : 0.5;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <Label>{title}</Label>
          <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Topo() {
  return (
    <svg className="topo" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <path id="topo-blob" d="M-40 0C-40-30-20-48 5-46C30-44 40-18 35 5C30 30 10 40-10 35C-30 30-40 20-40 0Z" vectorEffect="non-scaling-stroke" />
      </defs>
      <g fill="none" stroke="#8FC2F0" strokeOpacity="0.065" strokeWidth="1">
        <g transform="translate(385 64) rotate(-14)">
          {[0.5, 0.9, 1.3, 1.7, 2.1, 2.5, 2.9].map((s, i) => (
            <use key={s} href="#topo-blob" transform={`rotate(${i * 4}) scale(${s})`} />
          ))}
        </g>
        <g transform="translate(6 800) rotate(150)">
          {[0.6, 1, 1.4, 1.8, 2.2, 2.6].map((s, i) => (
            <use key={s} href="#topo-blob" transform={`rotate(${i * 5}) scale(${s})`} />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** Card with a photo on the right fading into the card background. */
export function Hero({ day, children }: { day: Day; children: ReactNode }) {
  return (
    <section className="hero">
      <img className="photo" src={DAY_PHOTO[day]} alt="" />
      <div className="tint" />
      <div className="fade" />
      <div className="body">{children}</div>
    </section>
  );
}

export function Check({ on }: { on: boolean }) {
  return <span className={`check${on ? ' on' : ''}`}>{on && <Icon name="check" size={20} stroke={2} />}</span>;
}
