import { useState, type CSSProperties, type ReactNode } from 'react';
import { num, parseNum } from './lib/format';

export type IconName =
  | 'user' | 'dumbbell' | 'chart' | 'book' | 'gear' | 'check' | 'left' | 'right' | 'down'
  | 'plus' | 'download' | 'upload' | 'lock' | 'pulse' | 'bowl' | 'calendar' | 'ruler'
  | 'pen' | 'trash' | 'clock' | 'target' | 'info' | 'trend' | 'walk' | 'x' | 'skip';

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
};

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

export function Bar({ value }: { value: number }) {
  return (
    <div className="bar">
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

/** Placeholder art for the hero cards until there is a real photo. */
export function DumbbellArt() {
  return (
    <svg className="art" viewBox="0 0 190 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="db-face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#525B64" /><stop offset="1" stopColor="#181D22" /></linearGradient>
        <linearGradient id="db-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6C757E" /><stop offset="1" stopColor="#262C32" /></linearGradient>
        <linearGradient id="db-bench" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#232930" /><stop offset="1" stopColor="#0D1014" /></linearGradient>
      </defs>
      <polygon points="0,170 190,40 190,170" fill="url(#db-bench)" />
      <polyline points="0,170 190,40" fill="none" stroke="#39424B" strokeWidth="1" />
      <polygon points="105,69 88,98.4 54,98.4 37,69 54,39.6 88,39.6" fill="#0F1215" />
      <polygon points="96,62 79,91.4 45,91.4 28,62 45,32.6 79,32.6" fill="url(#db-face)" stroke="#59626B" strokeWidth="1" />
      <polygon points="82,62 72,79.6 52,79.6 42,62 52,44.4 72,44.4" fill="none" stroke="#2B3238" strokeWidth="1.2" />
      <line x1="84" y1="80" x2="124" y2="112" stroke="url(#db-bar)" strokeWidth="13" />
      <line x1="88" y1="83" x2="120" y2="109" stroke="#8A939C" strokeWidth="8" strokeDasharray="1.2 2.4" opacity="0.35" />
      <polygon points="174,116 152,154.1 108,154.1 86,116 108,77.9 152,77.9" fill="#0F1215" />
      <polygon points="184,124 162,162.1 118,162.1 96,124 118,85.9 162,85.9" fill="url(#db-face)" stroke="#59626B" strokeWidth="1" />
      <polygon points="166.4,124 153.2,146.9 126.8,146.9 113.6,124 126.8,101.1 153.2,101.1" fill="none" stroke="#2B3238" strokeWidth="1.2" />
      <circle cx="140" cy="124" r="6" fill="#2B3238" />
    </svg>
  );
}

export function Hero({ children }: { children: ReactNode }) {
  return (
    <section className="hero">
      <DumbbellArt />
      <div className="fade" />
      <div className="body">{children}</div>
    </section>
  );
}

export function Check({ on }: { on: boolean }) {
  return <span className={`check${on ? ' on' : ''}`}>{on && <Icon name="check" size={20} stroke={2} />}</span>;
}
