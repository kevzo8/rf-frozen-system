"use client";
import { useId } from "react";

export function fmtPeso(n: number) {
  return `₱${Number(n ?? 0).toLocaleString()}`;
}

function fmtShort(n: number) {
  const v = Number(n ?? 0);
  if (v >= 1000) return `₱${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `₱${Math.round(v)}`;
}

/** Area + line chart of daily paid revenue. */
export function RevenueLine({ data }: { data: { label: string; revenue: number }[] }) {
  const gid = useId().replace(/:/g, "");
  const W = 360, H = 200, padL = 8, padR = 8, padT = 10, padB = 20;
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const n = Math.max(1, data.length);
  const x = (i: number) => (n === 1 ? W / 2 : padL + (i * (W - padL - padR)) / (n - 1));
  const y = (v: number) => H - padB - (v / max) * (H - padT - padB);
  const pts = data.map((d, i) => `${x(i)},${y(d.revenue)}`).join(" ");
  const area = `M${x(0)},${y(0)} L${data.map((d, i) => `${x(i)},${y(d.revenue)}`).join(" L")} L${x(n - 1)},${y(0)} Z`;
  const step = Math.max(1, Math.ceil(n / 7));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daily paid revenue line chart">
        <defs>
          <linearGradient id={`ag-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(max * f)} y2={y(max * f)} className="stroke-slate-900/10 dark:stroke-white/10" strokeDasharray="3 4" />
            <text x={W - padR} y={y(max * f) - 4} textAnchor="end" fontSize="10" className="fill-slate-500 dark:fill-slate-400">{fmtShort(max * f)}</text>
          </g>
        ))}
        <polygon points={area} fill={`url(#ag-${gid})`} />
        <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.revenue)} r={i % step === 0 || i === n - 1 ? 3.5 : 2} fill="#10b981" stroke="#fff" strokeWidth="1" />
            {(i % step === 0 || i === n - 1) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" className="fill-slate-500 dark:fill-slate-400">{d.label}</text>
            )}
          </g>
        ))}
      </svg>
      {max <= 1 && <p className="text-sm opacity-60">No paid sales in this range yet.</p>}
    </div>
  );
}

/** Stacked daily bars: paid (bottom) + to-collect (top). */
export function DailyBars({ data }: { data: { label: string; revenue: number; receivable: number }[] }) {
  const W = 640, H = 230, padB = 26, padT = 30;
  const max = Math.max(1, ...data.map((d) => d.revenue + d.receivable));
  const n = Math.max(1, data.length);
  const slot = W / n;
  const bw = Math.max(6, Math.min(34, slot * 0.55));
  const hOf = (v: number) => (v / max) * (H - padB - padT);
  const step = Math.max(1, Math.ceil(n / 7));
  return (
    <div>
      <div className="flex gap-4 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Paid</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> To collect</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="Daily paid versus receivable bar chart">
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1="0" x2={W} y1={H - padB - (H - padB - padT) * f} y2={H - padB - (H - padB - padT) * f} className="stroke-slate-900/10 dark:stroke-white/10" strokeDasharray="3 4" />
            <text x={W} y={H - padB - (H - padB - padT) * f - 4} textAnchor="end" fontSize="10" className="fill-slate-500 dark:fill-slate-400">{fmtShort(max * f)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = slot * i + slot / 2;
          const hp = hOf(d.revenue);
          const hr = hOf(d.receivable);
          return (
            <g key={i}>
              <rect x={cx - bw / 2} y={H - padB - hp - hr} width={bw} height={Math.max(0, hr)} rx="3" fill="#fbbf24" />
              <rect x={cx - bw / 2} y={H - padB - hp} width={bw} height={Math.max(hp, d.revenue > 0 ? 3 : 0)} rx="3" fill="#10b981" />
              {(i % step === 0 || i === n - 1) && (
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" className="fill-slate-500 dark:fill-slate-400">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Donut with legend. */
export function Donut({
  segments, total, centerTop, centerBottom,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  centerTop: string;
  centerBottom: string;
}) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const shown = segments.filter((s) => s.value > 0);
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
      <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Share donut chart">
        <circle cx="75" cy="75" r={R} fill="none" strokeWidth="20" className="stroke-slate-900/10 dark:stroke-white/10" />
        {shown.map((s) => {
          const frac = total > 0 ? s.value / total : 0;
          const el = (
            <circle
              key={s.label}
              cx="75" cy="75" r={R} fill="none"
              stroke={s.color} strokeWidth="20"
              strokeDasharray={`${frac * C} ${C - frac * C}`}
              strokeDashoffset={-acc * C}
              transform="rotate(-90 75 75)"
              strokeLinecap="butt"
            />
          );
          acc += frac;
          return el;
        })}
        <text x="75" y="72" textAnchor="middle" fontSize="13" fontWeight="800" className="fill-slate-900 dark:fill-amber-50">{centerTop}</text>
        <text x="75" y="88" textAnchor="middle" fontSize="10" className="fill-slate-500 dark:fill-slate-400">{centerBottom}</text>
      </svg>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <b className="font-mono">{fmtPeso(s.value)}</b>
            <span className="w-11 text-right opacity-60">{total > 0 ? `${Math.round((s.value / total) * 100)}%` : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Order pipeline: horizontal bars per status in flow order. Only shows statuses with orders. */
export function StatusBars({ byStatus, dayNote = "today's" }: { byStatus: Record<string, number>; dayNote?: string }) {
  const stages: { key: string; label: string; color: string }[] = [
    { key: "placed", label: "Placed", color: "#64748b" },
    { key: "confirmed", label: "Confirmed", color: "#3b82f6" },
    { key: "to_pay", label: "To pay", color: "#f59e0b" },
    { key: "proof_uploaded", label: "Proof uploaded", color: "#a855f7" },
    { key: "payment_verified", label: "Payment verified", color: "#14b8a6" },
    { key: "picking", label: "Picking", color: "#f97316" },
    { key: "checking", label: "Checking", color: "#eab308" },
    { key: "dispatched", label: "Dispatched", color: "#6366f1" },
    { key: "delivered", label: "Delivered", color: "#10b981" },
    { key: "cancelled", label: "Cancelled", color: "#f43f5e" },
    { key: "returned", label: "Returned", color: "#78716c" },
  ];
  const visible = stages.filter((s) => (byStatus[s.key] ?? 0) > 0);
  if (visible.length === 0) return <p className="text-sm opacity-60">Nothing yet.</p>;
  const max = Math.max(1, ...visible.map((s) => byStatus[s.key]));
  const total = visible.reduce((t, s) => t + byStatus[s.key], 0);
  return (
    <div>
      <ol className="space-y-2">
        {visible.map((s) => {
          const v = byStatus[s.key];
          return (
            <li key={s.key}>
              <a href={`/admin/orders?status=${s.key}`} className="flex items-baseline justify-between gap-2 text-sm rounded-lg transition hover:opacity-80">
                <span className="min-w-0 flex-1 truncate font-semibold">{s.label}</span>
                <b className="font-mono">{v} order{v === 1 ? "" : "s"}</b>
              </a>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${Math.max(3, (v / max) * 100)}%`, background: s.color }} />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm opacity-60">{total} order{total === 1 ? "" : "s"} in {dayNote} pipeline • tap a stage to open it</p>
    </div>
  );
}
export function TopItems({ items }: { items: { name: string; revenue: number; kilos: number; boxes: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.revenue));
  if (items.length === 0) return <p className="text-sm opacity-60">No sales in this range yet.</p>;
  return (
    <ol className="space-y-2.5">
      {items.map((it, i) => (
        <li key={it.name}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-semibold">#{i + 1} {it.name}</span>
            <b className="font-mono">{fmtPeso(it.revenue)}</b>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-400"
              style={{ width: `${Math.max(3, (it.revenue / max) * 100)}%` }}
            />
          </div>
          <p className="mt-0.5 font-mono text-xs opacity-60">{it.kilos.toLocaleString()} kg • {it.boxes} boxes</p>
        </li>
      ))}
    </ol>
  );
}
