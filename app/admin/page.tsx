"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getToken, clearToken } from "../../lib/auth-token";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import {
  ClipboardList, Tag, ChartBar, FolderOpen, Users, LogOut,
  Banknote, Hourglass, Wallet, PackageCheck, Snowflake, TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin/orders", icon: ClipboardList, title: "Orders board", desc: "Confirm, bill, verify, dispatch" },
  { href: "/admin/prices", icon: Tag, title: "Prices", desc: "Edit + xlsx 3-col import" },
  { href: "/admin/reports", icon: ChartBar, title: "Reports", desc: "Cash • Sales • Credit • Receipt" },
  { href: "/admin/storage", icon: FolderOpen, title: "Storage", desc: "Export zip + purge" },
  { href: "/admin/users", icon: Users, title: "Staff", desc: "Accounts (admin only)", adminOnly: true },
];

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
  const logout = useMutation((api as any)?.auth?.logout);

  if (!ready) return <main className="p-8 text-base">Loading dashboard...</main>;
  if (!token) return null;

  const role = (me as any)?.role;
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
          <img src="/rf-logo.jpg" alt="RF" className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
          <div>
            <h1 className="font-display text-lg font-bold leading-tight">Dashboard</h1>
            <p className="text-sm opacity-60">{(me as any)?.displayName} • {role} • {(me as any)?.branch}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button onClick={doLogout} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-base font-semibold"><LogOut size={17} aria-hidden /> Logout</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-5 space-y-4">
        {/* today at a glance */}
        <section aria-label="Today at a glance" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: ClipboardList, label: "Orders today", value: (dash as any)?.totalToday ?? "…", sub: `${(dash as any)?.pending ?? 0} need confirm` },
            { icon: Banknote, label: "Verified revenue", value: `₱${Number((dash as any)?.revenue ?? 0).toLocaleString()}`, sub: "payment_verified and beyond" },
            { icon: Hourglass, label: "Awaiting payment", value: (dash as any)?.awaitingPayment ?? "…", sub: "to_pay + proof_uploaded" },
            { icon: Wallet, label: "Proofs today", value: (dash as any)?.proofsToday ?? "…", sub: `${(dash as any)?.unexportedProofs ?? 0} unexported` },
          ].map((c) => (
            <div key={c.label} className="glass rounded-3xl p-4">
              <c.icon size={22} aria-hidden className="opacity-60" />
              <p className="mt-1 font-deco text-2xl">{c.value}</p>
              <p className="text-sm font-semibold">{c.label}</p>
              <p className="text-sm opacity-60">{c.sub}</p>
            </div>
          ))}
        </section>

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

        {/* order status viz */}
        <section aria-label="Orders by status" className="glass rounded-3xl p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><PackageCheck size={20} aria-hidden /> Orders by status today</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(((dash as any)?.byStatus ?? {}) as Record<string, number>).map(([s, n]) => (
              <span key={s} className="inline-flex min-h-[44px] items-center rounded-full bg-slate-900 dark:bg-amber-200 dark:text-red-950 px-4 text-base font-semibold text-white">{s}: {n}</span>
            ))}
            {Object.keys(((dash as any)?.byStatus ?? {})).length === 0 && <p className="text-sm opacity-60">Nothing yet.</p>}
          </div>
        </section>

        {/* nav */}
        <nav aria-label="Staff sections" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {NAV.filter((n) => !(n as any).adminOnly || role === "admin").map((n) => (
            <a key={n.href} href={n.href} className="glass group rounded-3xl p-5 transition hover:scale-[1.02] focus-visible:outline-2">
              <n.icon size={26} aria-hidden className="opacity-70 transition group-hover:scale-110" />
              <p className="mt-2 text-lg font-bold">{n.title}</p>
              <p className="text-sm opacity-60">{n.desc}</p>
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}
