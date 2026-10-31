// Small hand-drawn SVG charts over the 16 program weeks.

import { TOTAL_WEEKS } from './data/program';
import { num } from './lib/format';

const W = 326;
const PLOT_R = 292;
const PLOT_L = 12;
const xOf = (week: number) => PLOT_L + ((week - 1) * (PLOT_R - PLOT_L)) / (TOTAL_WEEKS - 1);
const WEEKS = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);

function WeekLabels({ y, current }: { y: number; current: number }) {
  return (
    <g textAnchor="middle">
      {WEEKS.map((w) => (
        <text key={w} x={xOf(w)} y={y} className={w === current ? 'now' : undefined}>{w}</text>
      ))}
    </g>
  );
}

export function LineChart({ points, current, label, band, unit = '' }: { points: { week: number; value: number }[]; current: number; label: string; band?: [number, number]; unit?: string }) {
  const H = 132;
  const top = 12;
  const bottom = H - 26;
  const values = points.map((p) => p.value).concat(band ?? []);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 1) {
    lo -= 0.5;
    hi += 0.5;
  }
  const pad = (hi - lo) * 0.15;
  lo -= pad;
  hi += pad;
  const yOf = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.week).toFixed(1)} ${yOf(p.value).toFixed(1)}`).join('');
  const last = points[points.length - 1];
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FC2F0" stopOpacity="0.26" />
          <stop offset="1" stopColor="#8FC2F0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {band && (
        <g>
          <rect x={0} y={yOf(band[1])} width={PLOT_R + 6} height={yOf(band[0]) - yOf(band[1])} fill="#8FC2F0" fillOpacity="0.06" />
          <line x1={0} x2={PLOT_R + 6} y1={yOf(band[1])} y2={yOf(band[1])} stroke="#3F5A75" strokeDasharray="4 4" />
          <line x1={0} x2={PLOT_R + 6} y1={yOf(band[0])} y2={yOf(band[0])} stroke="#3F5A75" strokeDasharray="4 4" />
        </g>
      )}
      <g stroke="#232C36">
        {ticks.map((t) => <line key={t} x1={0} x2={PLOT_R + 6} y1={yOf(t)} y2={yOf(t)} />)}
      </g>
      <g textAnchor="end">
        {ticks.map((t) => <text key={t} x={W} y={yOf(t) + 4}>{num(Math.round(t * 10) / 10)}{unit}</text>)}
      </g>
      {points.length > 1 && <path d={`${line}V${bottom}H${xOf(points[0].week)}Z`} fill="url(#chart-area)" />}
      <path d={line} fill="none" stroke="#9CC8F0" strokeWidth="2" />
      {points.map((p) =>
        p === last ? (
          <g key={p.week}>
            <circle cx={xOf(p.week)} cy={yOf(p.value)} r="8" fill="#9CC8F0" fillOpacity="0.18" />
            <circle cx={xOf(p.week)} cy={yOf(p.value)} r="4.5" fill="#9CC8F0" />
          </g>
        ) : (
          <circle key={p.week} cx={xOf(p.week)} cy={yOf(p.value)} r="3.5" fill="#0E1319" stroke="#9CC8F0" strokeWidth="2" />
        ),
      )}
      <WeekLabels y={H - 6} current={current} />
    </svg>
  );
}

export function BarChart({ values, target, current, label }: { values: Map<number, number>; target: (week: number) => number; current: number; label: string }) {
  const H = 128;
  const bottom = H - 26;
  const max = Math.max(160, ...values.values());
  const yOf = (v: number) => bottom - (v / max) * (bottom - 10);
  const step = WEEKS.map((w, i) => `${i ? 'L' : 'M'}${(xOf(w) - 9).toFixed(1)} ${yOf(target(w)).toFixed(1)}H${(xOf(w) + 9).toFixed(1)}`).join('');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <line x1={0} x2={PLOT_R + 10} y1={bottom} y2={bottom} stroke="#232C36" />
      {WEEKS.map((w) => {
        const v = values.get(w) ?? 0;
        if (!v) return <rect key={w} x={xOf(w) - 6} y={bottom - 3} width={12} height={3} rx={1} fill="#2A333D" />;
        return <rect key={w} x={xOf(w) - 6} y={yOf(v)} width={12} height={bottom - yOf(v)} rx={2} fill={w === current ? '#9CC8F0' : '#5E7F9F'} />;
      })}
      <path d={step} fill="none" stroke="#8FC2F0" strokeOpacity="0.55" strokeDasharray="3 3" />
      <text x={W} y={yOf(target(TOTAL_WEEKS)) - 4} textAnchor="end">цель</text>
      <WeekLabels y={H - 6} current={current} />
    </svg>
  );
}

export function MiniBars({ values, current, max }: { values: Map<number, number>; current: number; max: number }) {
  return (
    <div className="minibars" aria-hidden="true">
      {WEEKS.map((w) => {
        const v = values.get(w);
        if (v === undefined) return <i key={w} className="none" />;
        return <i key={w} className={w === current ? 'now' : undefined} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />;
      })}
    </div>
  );
}
