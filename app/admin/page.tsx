"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getToken, clearToken } from "../../lib/auth-token";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import {
  ClipboardList, LogOut,
  Banknote, Hourglass, Wallet, PackageCheck, Snowflake, TrendingUp, ShoppingBag,
} from "lucide-react";
import { Skeleton, SkeletonCards } from "../../components/Skeleton";
import { RevenueLine, DailyBars, Donut, TopItems, StatusBars, fmtPeso } from "../../components/DashboardCharts";

export const dynamic = "force-dynamic";

export default function AdminHome() {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = getToken();
    setTokenState(t);
    setReady(true);
    if (!t) router.push("/admin/login");
  }, [router]);
  const me = useQuery((api as any)?.auth?.me, token ? { token } : "skip");
  const dash = useQuery((api as any)?.dashboard?.summary, token ? { token } : "skip");
  const [days, setDays] = useState(14);
  const trends = useQuery((api as any)?.dashboard?.trends, token ? { token, days } : "skip");
  const logout = useMutation((api as any)?.auth?.logout);

  if (!ready) return <main className="p-8 text-base">Loading dashboard...</main>;
  if (!token) return null;

  const role = (me as any)?.role;
  const t = trends as any;
  const growth = t?.totals?.growthPct as number | null;
  const modeTotal = (t?.byMode?.cash ?? 0) + (t?.byMode?.gcash ?? 0) + (t?.byMode?.bank ?? 0) + (t?.byMode?.unset ?? 0);
  const maxBranch = Math.max(1, ...Object.values(((dash as any)?.byBranch ?? {}) as Record<string, { revenue: number }>).map((b: any) => b.revenue));

  async function doLogout() {
    await (logout as any)({ token });
    clearToken();
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen font-body text-base text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-3">
          <a href="/admin" aria-label="Go to dashboard" className="flex items-center gap-3 rounded-2xl pr-2 transition hover:scale-[1.02]">
            <img src="/rf-logo.jpg" alt="RF" className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
            <div>
              <h1 className="font-display text-lg font-bold leading-tight">Dashboard</h1>
              <p className="text-sm opacity-60">{(me as any)?.displayName} • {role} • {(me as any)?.branch}</p>
            </div>
          </a>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <a href="/" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-base font-semibold transition hover:scale-[1.02]">
              <ShoppingBag size={17} aria-hidden /> Shop
            </a>
            <button onClick={doLogout} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-base font-semibold"><LogOut size={17} aria-hidden /> Logout</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-5 space-y-4">
        {/* today at a glance */}
        {dash === undefined ? (
          <SkeletonCards count={4} />
        ) : (
        <section aria-label="Today at a glance" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <a href="/admin/reports?tab=cash" className="glass rounded-2xl p-3 border-2 border-emerald-400/50 transition hover:scale-[1.02] focus-visible:outline-2" aria-label="View cash report">
            <Banknote size={20} aria-hidden className="text-emerald-600" />
            <p className="mt-1 font-deco text-xl text-emerald-700 dark:text-emerald-300">₱{Number((dash as any)?.revenue ?? 0).toLocaleString()}</p>
            <p className="text-sm font-bold">Paid revenue →</p>
            <p className="text-xs opacity-60">{(dash as any)?.paidCount ?? 0} verified paid • tap for cash report</p>
          </a>
          <a href="/admin/reports?tab=credit" className="glass rounded-2xl p-3 border-2 border-amber-400/50 transition hover:scale-[1.02] focus-visible:outline-2" aria-label="View credit report">
            <Hourglass size={20} aria-hidden className="text-amber-600" />
            <p className="mt-1 font-deco text-xl text-amber-700 dark:text-amber-300">₱{Number((dash as any)?.receivable ?? 0).toLocaleString()}</p>
            <p className="text-sm font-bold">To collect (credit) →</p>
            <p className="text-xs opacity-60">{(dash as any)?.owedCount ?? 0} unpaid • tap for credit report</p>
          </a>
          <a href="/admin/orders?status=placed" className="glass rounded-2xl p-3 transition hover:scale-[1.02] focus-visible:outline-2" aria-label="View incoming orders">
            <ClipboardList size={20} aria-hidden className="opacity-60" />
            <p className="mt-1 font-deco text-xl">{(dash as any)?.totalToday ?? 0}</p>
            <p className="text-sm font-bold">Orders today →</p>
            <p className="text-xs opacity-60">{(dash as any)?.pending ?? 0} need confirm • tap to check</p>
          </a>
          <a href="/admin/storage" className="glass rounded-2xl p-3 transition hover:scale-[1.02] focus-visible:outline-2" aria-label="View proof storage">
            <Wallet size={20} aria-hidden className="opacity-60" />
            <p className="mt-1 font-deco text-xl">{(dash as any)?.proofsToday ?? 0}</p>
            <p className="text-sm font-bold">Proofs today →</p>
            <p className="text-xs opacity-60">{(dash as any)?.unexportedProofs ?? 0} unexported • tap to export</p>
          </a>
        </section>
        )}

        {/* today's revenue + sales growth, side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
        {/* revenue by branch bar viz */}
        <section aria-label="Revenue by branch" className="glass rounded-3xl p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><TrendingUp size={20} aria-hidden /> Today&apos;s revenue by branch</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(((dash as any)?.byBranch ?? {}) as Record<string, { orders: number; revenue: number }>).map(([b, v]) => (
              <div key={b} className="flex items-center gap-3">
                <span className="w-28 shrink-0 font-mono text-sm">{b}</span>
                <div className="h-9 flex-1 overflow-hidden rounded-xl bg-black/10 dark:bg-white/10">
                  <div className="flex h-full items-center justify-end rounded-xl bg-gradient-to-r from-red-900 via-red-600 to-orange-400 px-2 text-sm font-bold text-white transition-all" style={{ width: `${Math.max(4, (v.revenue / maxBranch) * 100)}%` }}>
                    {v.revenue > 0 ? `₱${v.revenue.toLocaleString()}` : ""}
                  </div>
                </div>
                <span className="w-20 text-right text-sm opacity-70">{v.orders} orders</span>
              </div>
            ))}
            {Object.keys(((dash as any)?.byBranch ?? {})).length === 0 && <p className="flex items-center gap-2 text-sm opacity-60"><Snowflake size={16} aria-hidden /> No orders yet today — place a test order in the shop.</p>}
          </div>
          <p className="mt-2 text-sm opacity-60">Price list: {(dash as any)?.priceCount ?? "…"} items • Full breakdown in Reports tab.</p>
        </section>

        {/* sales growth */}
        <section aria-label="Sales growth" className="glass rounded-3xl p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><TrendingUp size={20} aria-hidden /> Sales growth — paid revenue</h2>
            <div className="ml-auto flex gap-1.5" role="group" aria-label="Range">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={`min-h-[40px] rounded-full px-4 text-sm font-bold transition ${days === d ? "bg-slate-900 text-white dark:bg-amber-200 dark:text-red-950" : "glass"}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {trends === undefined ? (
            <div className="mt-3"><SkeletonCards count={1} /></div>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span>Total <b className="font-mono text-base">{fmtPeso(t.totals.revenue)}</b></span>
                <span className="opacity-70">{t.totals.orders} orders • avg <b className="font-mono">{fmtPeso(t.totals.revenue / Math.max(1, days))}</b>/day</span>
                {growth === null ? (
                  <span className="rounded-full bg-slate-900/10 px-2.5 py-0.5 text-xs font-bold dark:bg-white/10">no prior data yet</span>
                ) : (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${growth >= 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300"}`}>
                    {growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}% vs prior {days}d
                  </span>
                )}
              </div>
              <div className="mt-2"><RevenueLine data={t.daily} /></div>
            </>
          )}
        </section>
        </div>

        {/* daily bars + payment donut */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-label="Daily paid versus to-collect" className="glass rounded-3xl p-5">
            <h2 className="font-display text-lg font-bold">Paid vs to-collect per day</h2>
            <p className="text-sm opacity-60">Green = money in hand • Amber = still to collect</p>
            <div className="mt-2">
              {trends === undefined ? <SkeletonCards count={1} /> : <DailyBars data={t.daily} />}
            </div>
            <a href="/admin/reports?tab=credit" className="mt-2 inline-block text-sm font-bold underline">Open credit report →</a>
          </section>
          <section aria-label="Payment mode split" className="glass rounded-3xl p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Wallet size={20} aria-hidden /> How customers pay</h2>
            <p className="text-sm opacity-60">Share of paid revenue, last {days} days</p>
            <div className="mt-3">
              {trends === undefined ? <SkeletonCards count={1} /> : (
                <Donut
                  segments={[
                    { label: "Cash", value: t.byMode.cash, color: "#10b981" },
                    { label: "GCash / Maya", value: t.byMode.gcash, color: "#0ea5e9" },
                    { label: "Bank transfer", value: t.byMode.bank, color: "#8b5cf6" },
                    { label: "No mode set", value: t.byMode.unset, color: "#94a3b8" },
                  ]}
                  total={modeTotal}
                  centerTop={fmtPeso(modeTotal)}
                  centerBottom="paid"
                />
              )}
            </div>
            <a href="/admin/reports?tab=cash" className="mt-2 inline-block text-sm font-bold underline">Open cash report →</a>
          </section>
        </div>

        {/* top products + status */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-label="Top products" className="glass rounded-3xl p-5">
            <h2 className="font-display text-lg font-bold">Top products by revenue</h2>
            <p className="text-sm opacity-60">Last {days} days • amount = kilos × price</p>
            <div className="mt-3">
              {trends === undefined ? <SkeletonCards count={1} /> : <TopItems items={t.topItems} />}
            </div>
          </section>
          <section aria-label="Orders by status" className="glass rounded-3xl p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><PackageCheck size={20} aria-hidden /> Orders pipeline today</h2>
            <div className="mt-3">
              <StatusBars byStatus={((dash as any)?.byStatus ?? {}) as Record<string, number>} />
            </div>
            <a href="/admin/orders" className="mt-3 inline-block text-sm font-bold underline">Open orders board →</a>
          </section>
        </div>
      </main>
    </div>
  );
}
