"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useMemo, useState } from "react";
import ThemeToggle from "../components/ThemeToggle";
import {
  Snowflake, ShoppingCart, Search, Plus, X, ReceiptText, PackageSearch,
  Store, Tag, TriangleAlert, ArrowRight, CircleCheck, Info, ClipboardList,
  Bike, History,
} from "lucide-react";
import { SkeletonLines } from "../components/Skeleton";
import LifecycleGuide from "../components/LifecycleGuide";

export const dynamic = "force-dynamic";

const BRANCHES = [
  { id: "stamesa", label: "Sta Mesa" },
  { id: "qc", label: "Quezon City" },
  { id: "pasig", label: "Pasig" },
  { id: "blumentritt", label: "Blumentritt" },
  { id: "novaliches", label: "Novaliches" },
  { id: "laspinas", label: "Las Piñas" },
];
const STEPS = ["placed", "confirmed", "to_pay", "proof_uploaded", "payment_verified", "picking", "checking", "dispatched", "delivered"];
const STEP_LABEL: Record<string, string> = {
  placed: "Order placed", confirmed: "Confirmed available", to_pay: "To pay", proof_uploaded: "Proof uploaded",
  payment_verified: "Payment verified", picking: "Picking", checking: "Checking", dispatched: "Dispatched", delivered: "Delivered",
};
const MARQUEE = ["BELLY BISO", "CLQ MARJAC", "WINGS AURORA", "PATA BRITCO", "MASK SADIA", "RIB END MAPLE", "LOIN SEARA", "BEEF FQ FRIBOI", "LIVER KLS", "JOWLS LITERA"];

export default function Shop() {
  const prices = useQuery((api as any)?.prices?.list, {});
  const placeOrder = useMutation((api as any)?.orders?.placeOrder);
  const [branch, setBranch] = useState("stamesa");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("delivery");
  const [savedClients, setSavedClients] = useState<{ name: string; company: string; mobile: string; address: string; branch: string }[]>([]);
  const [myHistory, setMyHistory] = useState<{ trackingId: string; total: number; date: string; branch: string }[]>([]);

  useEffect(() => {
    try {
      setSavedClients(JSON.parse(localStorage.getItem("rf_clients") ?? "[]"));
      setMyHistory(JSON.parse(localStorage.getItem("rf_history") ?? "[]"));
    } catch {}
  }, []);

  function rememberClient(trackingId: string, total: number) {
    try {
      const clients = JSON.parse(localStorage.getItem("rf_clients") ?? "[]");
      const entry = { name: name.trim(), company: company.trim(), mobile: mobile.trim(), address: address.trim(), branch };
      const rest = clients.filter((c: any) => c.name.toLowerCase() !== entry.name.toLowerCase() || c.mobile !== entry.mobile);
      localStorage.setItem("rf_clients", JSON.stringify([entry, ...rest].slice(0, 20)));
      const hist = JSON.parse(localStorage.getItem("rf_history") ?? "[]");
      localStorage.setItem("rf_history", JSON.stringify([{ trackingId, total, date: new Date().toISOString().slice(0, 10), branch }, ...hist].slice(0, 20)));
      setSavedClients([entry, ...rest].slice(0, 20));
    } catch {}
  }

  function fillClient(c: { name: string; company: string; mobile: string; address: string; branch: string }) {
    setName(c.name); setCompany(c.company); setMobile(c.mobile); setAddress(c.address); setBranch(c.branch);
    setMissing(null);
  }
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "low" | "high">("name");
  const [cart, setCart] = useState<{ productName: string; qtyBox: number }[]>([]);
  const [done, setDone] = useState<{ trackingId: string; estimateTotal: number } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [track, setTrack] = useState("");
  const [lookup, setLookup] = useState<any>(null);

  const updatedAt = useMemo(() => {
    if (!prices || (prices as any[]).length === 0) return null;
    const max = Math.max(...(prices as any[]).map((p: any) => p.updatedAt ?? 0));
    return max ? new Date(max).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : null;
  }, [prices]);

  const filtered = useMemo(() => {
    if (!prices) return [];
    const s = search.trim().toLowerCase();
    const num = Number(s);
    const isNum = s !== "" && !Number.isNaN(num);
    let rows = (prices as any[]).filter((p: any) => {
      if (!s) return true;
      if (isNum) return String(p.price).includes(s) || p.price === num;
      return p.productName.toLowerCase().includes(s) || String(p.price).includes(s) || (p.notes ?? "").toLowerCase().includes(s);
    });
    if (sort === "low") rows = [...rows].sort((a, b) => a.price - b.price);
    else if (sort === "high") rows = [...rows].sort((a, b) => b.price - a.price);
    else rows = [...rows].sort((a, b) => String(a.productName).localeCompare(String(b.productName)));
    return rows.slice(0, 60);
  }, [prices, search, sort]);

  const priceMap = useMemo(() => new Map(((prices ?? []) as any[]).map((p: any) => [p.productName, p.price])), [prices]);
  const est = cart.reduce((s, c) => s + (Number(priceMap.get(c.productName)) || 0) * c.qtyBox, 0);
  const unitCount = cart.reduce((s, c) => s + c.qtyBox, 0);
  const [missing, setMissing] = useState<string | null>(null);

  function scrollToId(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Never disabled — guide to what's missing instead
    if (!name.trim()) {
      setMissing("name");
      scrollToId("order-name");
      return;
    }
    if (!mobile.trim()) {
      setMissing("mobile" as any);
      scrollToId("order-mobile");
      return;
    }
    if (fulfillment === "delivery" && !address.trim()) {
      setMissing("address" as any);
      scrollToId("order-address");
      return;
    }
    if (cart.length === 0) {
      setMissing("items");
      scrollToId("order-items");
      return;
    }
    setMissing(null);
    setPlacing(true);
    try {
      const res = await (placeOrder as any)({ branch, customerName: name, contactName: name, companyName: company || undefined, fulfillment, mobile, address: fulfillment === "delivery" ? address : undefined, items: cart });
      setDone(res);
      rememberClient(res.trackingId, res.estimateTotal);
      setCart([]);
    } finally {
      setPlacing(false);
    }
  }

  async function doLookup() {
    if (!track.trim()) return;
    const data = await (fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "orders:getByTracking", args: { trackingId: track.trim().toLowerCase() }, format: "json" }),
    }).then((r) => r.json()).catch(() => null) as any);
    setLookup(data?.value ?? data ?? null);
  }

  function scrollToOrder(e?: React.MouseEvent) {
    e?.preventDefault();
    const el = document.getElementById("order-disclaimer") ?? document.getElementById("order");
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen text-base text-slate-800 dark:text-rose-50 font-body overflow-x-clip">
      {[0, 1, 2].map((i) => (
        <Snowflake key={i} aria-hidden className="snowflake text-sky-300/70 dark:text-sky-200/40" style={{ left: `${12 + i * 35}%`, width: 18 + i * 6, height: 18 + i * 6, animationDuration: `${9 + i * 4}s`, animationDelay: `${i * 2}s` } as any} />
      ))}

      <header className="sticky top-0 z-20 glass border-b border-white/50 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-3">
          <img src="/rf-logo.jpg" alt="RF Frozen Meat Corp logo" className="anim-floaty h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-lg" />
          <div className="leading-tight">
            <p className="font-display text-lg font-bold text-red-950 dark:text-amber-100 tracking-wide">RF Frozen Meat Corp</p>
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"><Snowflake size={11} aria-hidden /> Since 2023</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <a href="#order" onClick={scrollToOrder} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-gradient-to-r from-red-900 via-red-700 to-orange-500 px-5 py-2 text-base font-semibold text-white shadow-lg shadow-red-900/30 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2"><ShoppingCart size={18} aria-hidden /> Order now</a>
            <a href="/admin/login" className="hidden sm:inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-base font-semibold glass"><Store size={17} aria-hidden /> Staff</a>
          </div>
        </div>
      </header>
      <div className="overflow-hidden bg-gradient-to-r from-red-950/90 via-red-800/90 to-slate-900/90 py-2" aria-hidden>
        <div className="marquee-track flex w-max gap-8 whitespace-nowrap font-display text-xs tracking-[0.25em] text-amber-100/90">
          {[...MARQUEE, ...MARQUEE].map((m, i) => <span key={i} className="inline-flex items-center gap-2"><Snowflake size={12} /> {m}</span>)}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 pt-8">
        <div className="glass-strong anim-fade-up overflow-hidden rounded-[2rem]">
          <div className="grid md:grid-cols-[1.25fr_1fr]">
            <div className="p-8 md:p-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-100 to-rose-100 dark:from-cyan-900/60 dark:to-red-900/60 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-amber-100 border border-white/60">
                <Snowflake size={15} aria-hidden /> Fresh-frozen daily • Sta Mesa pilot
              </span>
              <h1 className="font-deco mt-3 text-4xl md:text-5xl leading-tight text-slate-900 dark:text-amber-50">
                Meaty goodness,<br /><span className="shimmer-text font-black">frozen fresh.</span>
              </h1>
              <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300">
                From Belly Biso to CLQ Wings — order like Shopee. No login. Get a tracking number, pay via GCash / Maya / BDO / GoTyme / Cash, upload proof, we deliver.
              </p>
              <p className="mt-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-slate-700 dark:text-amber-100/80">Select branch and place your order</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Choose branch">
                {BRANCHES.map((b) => (
                  <button key={b.id} onClick={() => setBranch(b.id)} aria-pressed={branch === b.id}
                    className={`min-h-[44px] rounded-full px-4 py-2 text-base font-semibold transition hover:scale-105 focus-visible:outline-2 ${branch === b.id ? "bg-gradient-to-r from-red-900 to-red-600 text-white shadow-lg" : "glass"}`}>
                    {b.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-slate-900 dark:bg-amber-200 px-4 py-2 font-mono text-sm font-bold text-amber-100 dark:text-red-950 shadow">
                  <Tag size={15} aria-hidden /> PRICE AS OF: {updatedAt ?? "loading..."}
                </span>
                <a href="#order" onClick={scrollToOrder} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-gradient-to-r from-red-900 via-red-700 to-orange-500 px-6 py-2.5 text-base font-bold text-white shadow-lg shadow-red-900/30 transition hover:scale-105">Order now <ArrowRight size={18} aria-hidden /></a>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sept 29 sample — changes daily by supply &amp; demand.<br />Ordering at: <b>{BRANCHES.find((b) => b.id === branch)?.label}</b></p>
            </div>
            <div className="relative min-h-56 hidden md:block">
              <img src="/rf-logo.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent dark:from-[#1a1016] dark:via-transparent" />
              <div className="anim-floaty absolute bottom-5 left-5 right-5 glass rounded-2xl p-3 text-sm">
                <p className="font-display font-bold tracking-widest text-red-900 dark:text-amber-200">TODAY&apos;S CROWD FAVORITES</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Belly Biso Scan ₱245 • CLQ Pilgrims ₱151 • Wings Aurora ₱200 — see notes for availability</p>
              </div>
            </div>
          </div>
        </div>
        <div id="order-disclaimer" className="anim-fade-up mt-3 flex gap-2 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50/90 to-orange-50/80 dark:from-amber-950/60 dark:to-red-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-100 backdrop-blur scroll-mt-32" style={{ animationDelay: "0.15s" }}>
          <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
          <p><b>Disclaimer:</b> Prices are estimates only from the latest update — final payable after biller confirms availability. Check notes on each item for availability.</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 pb-16 pt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section id="order" aria-label="Order form" className="glass anim-fade-up rounded-[1.75rem] p-6 scroll-mt-32" style={{ animationDelay: "0.2s" }}>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide pt-1"><ClipboardList size={20} aria-hidden /> 1 • Your details <span className="text-sm font-body font-normal text-slate-500">— no login needed</span></h2>
          {/* pickup / delivery */}
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Pickup or delivery">
            <button type="button" onClick={() => setFulfillment("pickup")} aria-pressed={fulfillment === "pickup"}
              className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-base font-bold transition focus-visible:outline-2 ${fulfillment === "pickup" ? "bg-gradient-to-r from-red-900 to-red-600 text-white shadow-lg" : "glass"}`}>
              <Store size={19} aria-hidden /> Pickup
            </button>
            <button type="button" onClick={() => setFulfillment("delivery")} aria-pressed={fulfillment === "delivery"}
              className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-base font-bold transition focus-visible:outline-2 ${fulfillment === "delivery" ? "bg-gradient-to-r from-red-900 to-red-600 text-white shadow-lg" : "glass"}`}>
              <Bike size={19} aria-hidden /> Delivery
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="sm:col-span-2 text-sm font-semibold uppercase tracking-widest opacity-70">
              Selected branch
              <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch"
                className="mt-1 min-h-[48px] w-full rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5 text-base font-semibold outline-none focus:ring-2 focus:ring-red-400">
                {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </label>
            {fulfillment === "pickup" ? (
              <p className="sm:col-span-2 flex items-start gap-2 rounded-2xl border border-sky-300/50 bg-sky-50/80 dark:bg-cyan-950/30 px-3 py-2.5 text-sm">
                <Store size={17} aria-hidden className="mt-0.5 shrink-0" />
                <span>Pickup at <b>RF Frozen Meat Corp — {BRANCHES.find((b) => b.id === branch)?.label} branch</b> (exact address to follow). No delivery address needed.</span>
              </p>
            ) : (
              <label className="sm:col-span-2 text-sm font-semibold">
                Delivery address *
                <input id="order-address" aria-label="Delivery address" aria-invalid={missing === "address"}
                  className={`mt-1 min-h-[48px] w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-red-400 ${missing === "address" ? "border-red-500 ring-2 ring-red-300" : "border-slate-200 dark:border-white/10"}`}
                  placeholder="House / street / barangay / city *" value={address} onChange={(e) => { setAddress(e.target.value); if (e.target.value.trim()) setMissing(null); }} />
              </label>
            )}
            <label className="text-sm font-semibold">Contact person — full name *
              <input id="order-name" list="rf-saved-names" aria-label="Contact person full name" aria-invalid={missing === "name"}
                className={`mt-1 min-h-[48px] w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-red-400 ${missing === "name" ? "border-red-500 ring-2 ring-red-300 bg-red-50/60 dark:bg-red-950/30" : "border-slate-200 dark:border-white/10"}`}
                placeholder="e.g. Maria Santos *" value={name} onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setMissing(null); }} />
              <datalist id="rf-saved-names">
                {savedClients.map((c, i) => <option key={i} value={c.name}>{c.company ? `${c.company} • ${c.mobile}` : c.mobile}</option>)}
              </datalist>
            </label>
            <label className="text-sm font-semibold">Company name <span className="font-normal opacity-60">(printed on receipt)</span>
              <input aria-label="Company name" className="mt-1 min-h-[48px] w-full rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-red-400" placeholder="e.g. Santos Meatshop (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
            <label className="sm:col-span-2 text-sm font-semibold">Contact mobile number *
              <input id="order-mobile" aria-label="Contact mobile number" aria-invalid={missing === "mobile"} inputMode="tel"
                className={`mt-1 min-h-[48px] w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-red-400 ${missing === "mobile" ? "border-red-500 ring-2 ring-red-300" : "border-slate-200 dark:border-white/10"}`}
                placeholder="09xx xxx xxxx *" value={mobile} onChange={(e) => { setMobile(e.target.value); if (e.target.value.trim()) setMissing(null); }} />
            </label>
          </div>
          {missing === "name" && <p className="mt-1 text-sm font-semibold text-red-700 dark:text-red-300">Please enter the contact person&apos;s name.</p>}
          {missing === "mobile" && <p className="mt-1 text-sm font-semibold text-red-700 dark:text-red-300">Mobile number is required so the branch can contact you.</p>}
          {missing === "address" && <p className="mt-1 text-sm font-semibold text-red-700 dark:text-red-300">Delivery needs an address — or switch to Pickup.</p>}
          {savedClients.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Saved names">
              {savedClients.slice(0, 5).map((c, i) => (
                <button key={i} type="button" onClick={() => fillClient(c)} className="min-h-[40px] rounded-full glass px-3 text-sm font-semibold">↩ {c.name}</button>
              ))}
            </div>
          )}
          {myHistory.length > 0 && (
            <details className="mt-2 rounded-2xl border border-white/50 dark:border-white/10 bg-white/50 dark:bg-black/20 p-2.5">
              <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-bold"><History size={16} aria-hidden /> My order history on this device ({myHistory.length})</summary>
              <ul className="mt-1 space-y-1 text-sm">
                {myHistory.slice(0, 8).map((h) => (
                  <li key={h.trackingId}><a href={`/track/${h.trackingId}`} className="font-mono underline">{h.trackingId}</a> • {h.branch} • ₱{h.total.toLocaleString()} • {h.date}</li>
                ))}
              </ul>
            </details>
          )}

          <h2 className="flex items-center gap-2 font-display mt-6 text-xl font-bold tracking-wide"><Snowflake size={20} aria-hidden /> 2 • Pick items</h2>
          {missing === "name" && <p className="mt-1 text-sm font-semibold text-red-700 dark:text-red-300">Please enter your name first — we scrolled you to the missing field.</p>}
          {missing === "items" && <p className="mt-1 text-sm font-semibold text-red-700 dark:text-red-300">Your tray is empty — search below and tap + Add to add units.</p>}
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Search size={18} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input aria-label="Search items" className="min-h-[48px] w-full rounded-xl border border-slate-200 dark:border-white/10 pl-10 pr-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-sky-400" placeholder="Search name, price, or notes — Belly, 245, parating..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} title="Sort" aria-label="Sort items"
              className="min-h-[48px] rounded-xl border border-slate-200 dark:border-white/10 px-2 py-2.5 text-base font-semibold outline-none">
              <option value="name">A–Z</option>
              <option value="low">₱ Low→High</option>
              <option value="high">₱ High→Low</option>
            </select>
          </div>
          <div id="order-items" className={`mt-2 max-h-72 overflow-auto rounded-2xl border bg-white/70 dark:bg-black/30 divide-y divide-slate-100 dark:divide-white/5 scroll-mt-32 ${missing === "items" ? "border-red-500 ring-2 ring-red-300 border-white/60 dark:border-white/10" : "border-white/60 dark:border-white/10"}`} aria-live="polite">
            {prices === undefined ? (
              <div className="p-3"><SkeletonLines rows={4} /></div>
            ) : (
              <>
                {filtered.map((p: any) => (
                  <div key={p.productName} className="group flex items-center gap-2 px-3 py-2.5 text-base transition hover:bg-red-50/70 dark:hover:bg-white/5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.productName}</p>
                      <p className="font-mono text-sm text-red-800 dark:text-amber-200">₱{p.price} / unit{p.notes ? ` • ${p.notes}` : ""}</p>
                    </div>
                    <button onClick={() => setCart([...cart, { productName: p.productName, qtyBox: 1 }])} aria-label={`Add ${p.productName}`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full bg-gradient-to-r from-red-900 to-red-600 px-3 py-2 text-base font-semibold text-white transition hover:scale-105 focus-visible:outline-2"><Plus size={17} aria-hidden /> Add</button>
                  </div>
                ))}
                {filtered.length === 0 && <p className="p-3 text-sm opacity-60">Type to search price list...</p>}
              </>
            )}
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 p-[1px]">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900/95 to-red-950/90 p-4 text-white backdrop-blur">
              <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.25em] text-amber-200/80"><ShoppingCart size={14} aria-hidden /> Your tray • {unitCount} units</p>
              {cart.length === 0 && <p className="mt-1 text-base text-white/60">Still empty — add some meaty goodness above.</p>}
              {cart.map((c, i) => (
                <div key={i} className="mt-1.5 flex items-center gap-2 text-base">
                  <span className="flex-1 truncate">{c.productName}</span>
                  <input aria-label={`Quantity for ${c.productName}`} type="number" min={1} value={c.qtyBox} onChange={(e) => { const v = [...cart]; v[i].qtyBox = Math.max(1, Number(e.target.value) || 1); setCart(v); }}
                    className="min-h-[44px] w-20 rounded-lg px-2 py-1 !text-slate-900" />
                  <span className="w-24 text-right font-mono">₱{((Number(priceMap.get(c.productName)) || 0) * c.qtyBox).toLocaleString()}</span>
                  <button onClick={() => setCart(cart.filter((_, j) => j !== i))} aria-label={`Remove ${c.productName}`} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-white/60 hover:text-white"><X size={18} aria-hidden /></button>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3">
                <span className="font-display text-base tracking-widest text-amber-100/80">ESTIMATE</span>
                <span className="font-deco text-3xl text-amber-100">₱{est.toLocaleString()}</span>
              </div>
              <button onClick={submit} aria-disabled={placing}
                className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 py-3 text-lg font-bold text-red-950 transition hover:scale-[1.01] focus-visible:outline-2">
                <ShoppingCart size={20} aria-hidden /> {placing ? "Placing..." : "Place order — get tracking number"}
              </button>
              {done && (
                <div className="anim-fade-up mt-2 flex items-start gap-2 rounded-xl bg-emerald-400/20 border border-emerald-300/30 p-3 text-base">
                  <CircleCheck size={20} aria-hidden className="mt-0.5 shrink-0" />
                  <p>Tracking: <a className="font-mono font-bold underline" href={`/track/${done.trackingId}`}>{done.trackingId}</a> — save this!</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section aria-label="Track order" className="glass anim-fade-up rounded-[1.75rem] p-6 h-fit lg:sticky lg:top-24" style={{ animationDelay: "0.3s" }}>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide"><PackageSearch size={20} aria-hidden /> 3 • Track &amp; pay</h2>
          <div className="mt-2 flex gap-2">
            <input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="stamesa-093026-000001" aria-label="Tracking number"
              className="min-h-[48px] flex-1 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5 font-mono text-base outline-none focus:ring-2 focus:ring-sky-400" />
            <button onClick={doLookup} className="min-h-[48px] rounded-xl bg-slate-900 dark:bg-amber-200 dark:text-red-950 px-5 text-base font-semibold text-white transition hover:scale-105">Check</button>
          </div>
          {lookup && lookup.trackingId && (
            <div className="anim-fade-up mt-3 text-base">
              <p className="font-mono text-sm opacity-60">{lookup.trackingId}</p>
              <p>Payable: <b className="font-deco text-xl">₱{(lookup.finalTotal ?? lookup.estimateTotal).toLocaleString()}</b> • {lookup.paymentMode ?? "waiting for biller"}</p>
              <div className="mt-2 space-y-1.5">
                {STEPS.map((s) => {
                  const active = STEPS.indexOf(s) <= STEPS.indexOf(lookup.status);
                  return <div key={s} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full transition ${active ? "bg-gradient-to-r from-emerald-400 to-sky-400 shadow" : "bg-slate-300 dark:bg-white/15"}`} /><span className={active ? "font-medium" : "opacity-40"}>{STEP_LABEL[s]}</span></div>;
                })}
              </div>
              <a href={`/track/${lookup.trackingId}`} className="mt-3 flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-900 to-red-600 px-3 py-2.5 text-center text-base font-semibold text-white"><ReceiptText size={18} aria-hidden /> Open receipt / upload proof</a>
            </div>
          )}
          <div className="mt-4 rounded-2xl border border-sky-200/60 dark:border-white/10 bg-sky-50/70 dark:bg-cyan-950/30 p-4">
            <p className="flex items-center gap-2 font-display font-bold tracking-widest text-sky-900 dark:text-sky-200"><Info size={18} aria-hidden /> HOW IT WORKS — follow the trail</p>
            <div className="mt-3"><LifecycleGuide /></div>
            <p className="mt-2 text-sm opacity-80">Pay with GCash / Maya / BDO / GoTyme / Cash. Green trail = done, glowing ring = where your order is.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/50 dark:border-white/10 py-6 text-center font-display text-xs tracking-[0.25em] opacity-60">RF FROZEN MEAT CORP • STA MESA • QC • PASIG • BLUMENTRITT • NOVALICHES • LAS PIÑAS</footer>
    </div>
  );
}
