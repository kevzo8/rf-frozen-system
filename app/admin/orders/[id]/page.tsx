"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { use, useState, useEffect } from "react";
import { getToken } from "../../../../lib/auth-token";
import ThemeToggle from "../../../../components/ThemeToggle";
import { Skeleton, SkeletonLines } from "../../../../components/Skeleton";
import SheetReceipt from "../../../../components/SheetReceipt";
import {
  ArrowLeft, Pencil, Save, X, User, Building2, Phone, Store, Truck,
  ReceiptText, Hash, Banknote, Wallet, Package, MapPin, CalendarDays,
  ExternalLink, ClipboardList, Loader2, ShoppingBag, Scale, Printer,
} from "lucide-react";

export const dynamic = "force-dynamic";

const BRANCHES = ["stamesa", "pasig", "blumentritt", "novaliches", "laspinas"];
const PAY_MODES = ["GCASH", "MAYA", "BDO", "GOTYME", "CASH"];

function statusPill(status: string) {
  const map: Record<string, string> = {
    placed: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    confirmed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    to_pay: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    proof_uploaded: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    payment_verified: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    picking: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    checking: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
    dispatched: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    returned: "bg-stone-500/15 text-stone-600 dark:text-stone-300",
  };
  return map[status] ?? "bg-slate-500/15 text-slate-600 dark:text-slate-300";
}

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-[15px] outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/40 dark:border-white/10 dark:bg-white/5 dark:focus:border-rose-400";
const labelCls =
  "mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-rose-100/60";

function Field({ label, icon, hint, children }: { label: string; icon?: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {icon}
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-rose-100/50">{hint}</p>}
    </div>
  );
}

function ReadRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900/5 text-slate-500 dark:bg-white/10 dark:text-rose-100/70">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-rose-100/50">{label}</p>
        <p className={`truncate text-[15px] font-semibold text-slate-900 dark:text-amber-50 ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
  }, []);

  const order = useQuery((api as any)?.orders?.getById, token ? { token, id: id.toLowerCase() } : "skip");
  const updateOrder = useMutation((api as any)?.orders?.updateOrder);
  const setWeightsMut = useMutation((api as any)?.orders?.setWeights);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [weights, setWeights] = useState<any[]>([]);
  const [weighBusy, setWeighBusy] = useState(false);
  const [weighError, setWeighError] = useState("");
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetError, setSheetError] = useState("");

  // Sync form state when order loads
  useEffect(() => {
    if (order && !editing) {
      setForm({
        customerName: order.customerName ?? "",
        contactName: order.contactName ?? "",
        companyName: order.companyName ?? "",
        mobile: order.mobile ?? "",
        branch: order.branch ?? "",
        fulfillment: order.fulfillment ?? "",
        address: (order as any).address ?? "",
        osNo: order.osNo ?? "",
        invoiceNo: order.invoiceNo ?? "",
        finalTotal: order.finalTotal ?? order.estimateTotal ?? 0,
        paymentMode: order.paymentMode ?? "",
      });
      setSaveError("");
    }
  }, [order, editing]);

  // Init weighed-kilos editor from order items
  useEffect(() => {
    if (order && (order as any).items) {
      setWeights(
        ((order as any).items as any[]).map((it: any) => ({
          productName: it.productName,
          qtyBox: it.qtyBox ?? 0,
          weightKg: it.weightKg ?? 0,
          price: it.finalPrice ?? it.estPrice ?? 0,
          boxWeights: Array.isArray(it.boxWeights) ? it.boxWeights : [],
        }))
      );
      setWeighError("");
    }
  }, [order]);

  const weighTotals = weights.reduce(
    (acc: any, w: any) => ({
      boxes: acc.boxes + (Number(w.qtyBox) || 0),
      kgs: acc.kgs + (Number(w.weightKg) || 0),
      amount: acc.amount + (Number(w.weightKg) || 0) * (Number(w.price) || 0),
    }),
    { boxes: 0, kgs: 0, amount: 0 }
  );

  const saveWeights = async () => {
    if (!order || weighBusy) return;
    setWeighBusy(true);
    setWeighError("");
    try {
      const res: any = await (setWeightsMut as any)({
        token: token!,
        trackingId: order.trackingId,
        items: weights.map((w: any) => ({
          productName: w.productName,
          qtyBox: Math.max(0, Math.floor(Number(w.qtyBox) || 0)),
          weightKg: Math.max(0, Number(w.weightKg) || 0),
          price: Math.max(0, Number(w.price) || 0),
          boxWeights: Array.isArray(w.boxWeights) ? w.boxWeights : [],
        })),
      });
      if (res?.finalTotal != null) {
        setForm((prev: any) => ({ ...prev, finalTotal: res.finalTotal }));
      }
    } catch (e: any) {
      setWeighError(e?.message ?? "Save weights failed");
    } finally {
      setWeighBusy(false);
    }
  };

  const saveSheet = async (draft: any) => {
    if (!order || sheetSaving) return;
    setSheetSaving(true);
    setSheetError("");
    try {
      const header: any = {
        token: token!,
        trackingId: order.trackingId,
        osNo: String(draft.osNo ?? "").trim(),
        invoiceNo: String(draft.invoiceNo ?? "").trim(),
        deliveredTo: String(draft.deliveredTo ?? "").trim(),
        address: String(draft.address ?? "").trim(),
        preparedBy: String(draft.preparedBy ?? "").trim(),
        checkedBy: String(draft.checkedBy ?? "").trim(),
        deliveredBy: String(draft.deliveredBy ?? "").trim(),
        plateNo: String(draft.plateNo ?? "").trim(),
        guardName: String(draft.guardName ?? "").trim(),
      };
      if (draft.receiptDate) {
        const t = new Date(`${draft.receiptDate}T00:00:00+08:00`).getTime();
        if (!isNaN(t)) header.receiptDate = t;
      }
      await (updateOrder as any)(header);
      const res: any = await (setWeightsMut as any)({
        token: token!,
        trackingId: order.trackingId,
        items: draft.lines.map((w: any) => ({
          productName: String(w.productName ?? "").trim(),
          qtyBox: Math.max(0, Math.floor(Number(w.qtyBox) || 0)),
          weightKg: Math.max(0, Number(w.weightKg) || 0),
          price: Math.max(0, Number(w.price) || 0),
          boxWeights: Array.isArray(w.box) ? w.box : [],
        })),
      });
      if (res?.finalTotal != null) {
        setForm((prev: any) => ({ ...prev, finalTotal: res.finalTotal }));
      }
      setWeights(
        draft.lines.map((w: any) => ({
          productName: String(w.productName ?? "").trim(),
          qtyBox: Math.max(0, Math.floor(Number(w.qtyBox) || 0)),
          weightKg: Math.max(0, Number(w.weightKg) || 0),
          price: Math.max(0, Number(w.price) || 0),
          boxWeights: Array.isArray(w.box) ? w.box : [],
        }))
      );
    } catch (e: any) {
      setSheetError(e?.message ?? "Save sheet failed");
      throw e;
    } finally {
      setSheetSaving(false);
    }
  };

  const handleChange = (key: string, value: string | number) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!order || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateOrder({
        token: token!,
        trackingId: order.trackingId,
        customerName: String(form.customerName ?? "").trim(),
        contactName: String(form.contactName ?? "").trim(),
        companyName: String(form.companyName ?? "").trim(),
        mobile: String(form.mobile ?? "").trim(),
        branch: String(form.branch ?? ""),
        fulfillment: form.fulfillment,
        address: String(form.address ?? "").trim(),
        osNo: String(form.osNo ?? "").trim(),
        invoiceNo: String(form.invoiceNo ?? "").trim(),
        finalTotal: Number(form.finalTotal) || 0,
        paymentMode: String(form.paymentMode ?? ""),
      });
      setEditing(false);
    } catch (e: any) {
      setSaveError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !token) {
    return (
      <div className="min-h-screen font-body">
        <header className="glass sticky top-0 z-20 border-b border-white/60">
          <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
            <Skeleton className="h-10 w-10 !rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-6 space-y-4">
          <div className="glass-strong rounded-3xl p-6 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-5 w-full" />
          </div>
          <SkeletonLines rows={4} />
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen font-body">
        <header className="glass sticky top-0 z-20 border-b border-white/60">
          <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
            <button onClick={() => window.history.back()} className="glass inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-base font-semibold">
              <ArrowLeft size={18} aria-hidden /> Back
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-6">
          <div className="glass-strong rounded-3xl p-6 text-center">
            <p className="font-display text-lg font-bold">Order not found</p>
            <p className="mt-1 font-mono text-sm text-slate-500">{id}</p>
            <a href="/admin/orders" className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-rose-600 px-5 py-2 font-semibold text-white">
              <ClipboardList size={18} aria-hidden /> Back to board
            </a>
          </div>
        </main>
      </div>
    );
  }

  const payable = order.finalTotal ?? order.estimateTotal;
  const proofs: any[] = (order as any)?.proofs ?? [];
  const items: any[] = (order as any)?.items ?? [];

  return (
    <div className="min-h-screen font-body text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b border-white/60">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} aria-label="Go back" className="glass inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-base font-semibold transition hover:scale-[1.02]">
            <ArrowLeft size={18} aria-hidden /> Back
          </button>
          <a href="/admin" aria-label="Go to dashboard" className="flex items-center gap-2 rounded-full pr-2 transition hover:scale-[1.02]">
            <img src="/rf-logo.jpg" alt="RF" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
            <p className="font-display font-bold text-slate-900 dark:text-amber-100">RF FROZEN MEAT</p>
          </a>
          <div className="ml-auto flex gap-2 items-center">
            <ThemeToggle />
            <a href="/" className="inline-flex min-h-[44px] items-center gap-1.5 glass rounded-full px-4 py-2 text-base font-semibold transition hover:scale-[1.02]">
              <ShoppingBag size={18} aria-hidden /> Shop
            </a>
            <a href="/admin/orders" className="hidden sm:inline-flex min-h-[44px] items-center gap-1.5 glass rounded-full px-4 py-2 text-base font-semibold">
              <ClipboardList size={18} aria-hidden /> Board
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        {/* Hero summary */}
        <div className="glass-strong rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs text-slate-500 dark:text-rose-100/60">{order.trackingId}</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusPill(order.status)}`}>
              {String(order.status).replace(/_/g, " ")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-rose-100/80">
              <Store size={12} aria-hidden /> {order.branch}
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 dark:text-rose-100/60">
              <CalendarDays size={14} aria-hidden />
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-black uppercase leading-tight text-slate-900 dark:text-amber-50">
            {order.customerName}
          </h1>
          <p className="mt-1 text-[15px] text-slate-600 dark:text-rose-100/75">
            {order.contactName}
            {order.companyName ? ` • ${order.companyName}` : ""} • {order.mobile ?? "-"}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-rose-100/60">
                <Banknote size={14} aria-hidden /> Payable
              </p>
              <p className="mt-0.5 text-xl font-black text-slate-900 dark:text-amber-50">₱{Number(payable ?? 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-rose-100/60">{order.finalTotal != null ? "final total" : `estimate ₱${Number(order.estimateTotal ?? 0).toLocaleString()}`}</p>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-rose-100/60">
                <Wallet size={14} aria-hidden /> Payment
              </p>
              <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-amber-50">{order.paymentMode ?? "—"}</p>
              <p className="text-xs text-slate-500 dark:text-rose-100/60">OS {order.osNo ?? "—"} • INV {order.invoiceNo ?? "—"}</p>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-rose-100/60">
                <Truck size={14} aria-hidden /> Fulfillment
              </p>
              <p className="mt-0.5 text-base font-bold capitalize text-slate-900 dark:text-amber-50">{order.fulfillment ?? "—"}</p>
              <p className="truncate text-xs text-slate-500 dark:text-rose-100/60">{order.address ?? ""}</p>
            </div>
          </div>
        </div>

        {editing ? (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => { e.preventDefault(); save(); }}
          >
            {/* Customer section */}
            <section className="glass rounded-3xl p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-amber-50">
                <User size={18} aria-hidden /> Customer
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Receipt name" icon={<User size={13} aria-hidden />}>
                  <input type="text" className={inputCls} value={form.customerName ?? ""} onChange={(e) => handleChange("customerName", e.target.value)} placeholder="e.g. JUAN DELA CRUZ" />
                </Field>
                <Field label="Contact person" icon={<User size={13} aria-hidden />}>
                  <input type="text" className={inputCls} value={form.contactName ?? ""} onChange={(e) => handleChange("contactName", e.target.value)} placeholder="Full name" />
                </Field>
                <Field label="Company" icon={<Building2 size={13} aria-hidden />}>
                  <input type="text" className={inputCls} value={form.companyName ?? ""} onChange={(e) => handleChange("companyName", e.target.value)} placeholder="Optional" />
                </Field>
                <Field label="Mobile" icon={<Phone size={13} aria-hidden />}>
                  <input type="tel" className={inputCls} value={form.mobile ?? ""} onChange={(e) => handleChange("mobile", e.target.value)} placeholder="09xx xxx xxxx" />
                </Field>
              </div>
            </section>

            {/* Fulfillment section */}
            <section className="glass rounded-3xl p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-amber-50">
                <Truck size={18} aria-hidden /> Fulfillment & branch
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Branch" icon={<Store size={13} aria-hidden />}>
                  <select className={inputCls} value={form.branch ?? ""} onChange={(e) => handleChange("branch", e.target.value)}>
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>{b.toUpperCase()}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Fulfillment" icon={<Truck size={13} aria-hidden />}>
                  <select className={inputCls} value={form.fulfillment ?? ""} onChange={(e) => handleChange("fulfillment", e.target.value)}>
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </Field>
              </div>
              {order.address && (
                <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-slate-900/5 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-rose-100/70">
                  <MapPin size={16} aria-hidden className="mt-0.5 shrink-0" />
                  <span>Current: {order.address}</span>
                </p>
              )}
              <div className="mt-3">
                <Field label="Delivery address" icon={<MapPin size={13} aria-hidden />} hint="Also editable directly on the sheets below">
                  <input type="text" className={inputCls} value={form.address ?? ""} onChange={(e) => handleChange("address", e.target.value)} placeholder="House / street / barangay / city" />
                </Field>
              </div>
            </section>

            {/* Weights section */}
            <section className="glass rounded-3xl p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-amber-50">
                <Scale size={18} aria-hidden /> Weights & prices <span className="text-xs font-body font-normal text-slate-500">— per kilo, amount = kg × price</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-rose-100/60">Tip: for per-box breakdowns use the tally grid on the sheets below — its totals override these boxes/kilos.</p>
              <div className="mt-4 space-y-2">
                {weights.map((w: any, i: number) => (
                  <div key={`${w.productName}-${i}`} className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                    <p className="truncate text-sm font-bold">{w.productName}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-rose-100/60">
                        Boxes
                        <input
                          type="number" min={0} step={1} className={`${inputCls} mt-1`} value={w.qtyBox}
                          onChange={(e) => setWeights((prev: any[]) => prev.map((r: any, j: number) => (j === i ? { ...r, qtyBox: Number(e.target.value) } : r)))}
                        />
                      </label>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-rose-100/60">
                        Kilos
                        <input
                          type="number" min={0} step="0.01" className={`${inputCls} mt-1`} value={w.weightKg}
                          onChange={(e) => setWeights((prev: any[]) => prev.map((r: any, j: number) => (j === i ? { ...r, weightKg: Number(e.target.value) } : r)))}
                        />
                      </label>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-rose-100/60">
                        ₱/kg
                        <input
                          type="number" min={0} step="0.01" className={`${inputCls} mt-1`} value={w.price}
                          onChange={(e) => setWeights((prev: any[]) => prev.map((r: any, j: number) => (j === i ? { ...r, price: Number(e.target.value) } : r)))}
                        />
                      </label>
                    </div>
                    <p className="mt-1.5 text-right font-mono text-sm font-bold">
                      ₱{((Number(w.weightKg) || 0) * (Number(w.price) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900/5 px-4 py-3 text-sm font-bold dark:bg-white/5">
                  <span>{weighTotals.boxes} boxes • {Number(weighTotals.kgs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</span>
                  <span className="font-mono text-base">₱{Number(weighTotals.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {weighError && <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{weighError}</p>}
                <button
                  type="button" onClick={saveWeights} disabled={weighBusy}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 font-bold text-white transition hover:scale-[1.01] disabled:opacity-60 dark:bg-amber-100 dark:text-slate-900"
                >
                  {weighBusy ? <Loader2 size={18} aria-hidden className="animate-spin" /> : <Scale size={18} aria-hidden />}
                  {weighBusy ? "Saving weights…" : "Save weights → updates final total"}
                </button>
              </div>
            </section>

            {/* Billing section */}
            <section className="glass rounded-3xl p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-amber-50">
                <ReceiptText size={18} aria-hidden /> Billing
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="OS number" icon={<Hash size={13} aria-hidden />}>
                  <input type="text" className={inputCls} value={form.osNo ?? ""} onChange={(e) => handleChange("osNo", e.target.value)} placeholder="RF55xxx" />
                </Field>
                <Field label="Invoice number" icon={<Hash size={13} aria-hidden />}>
                  <input type="text" className={inputCls} value={form.invoiceNo ?? ""} onChange={(e) => handleChange("invoiceNo", e.target.value)} placeholder="238xxx" />
                </Field>
                <Field label="Final total (₱)" icon={<Banknote size={13} aria-hidden />}>
                  <input type="number" min={0} className={inputCls} value={form.finalTotal ?? 0} onChange={(e) => handleChange("finalTotal", Number(e.target.value))} />
                </Field>
                <Field label="Payment mode" icon={<Wallet size={13} aria-hidden />}>
                  <select className={inputCls} value={form.paymentMode ?? ""} onChange={(e) => handleChange("paymentMode", e.target.value)}>
                    <option value="">Select mode…</option>
                    {PAY_MODES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            {saveError && (
              <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
                {saveError}
              </p>
            )}

            <div className="glass sticky bottom-3 flex gap-2 rounded-3xl p-3">
              <button
                type="button"
                onClick={() => { setSaveError(""); setEditing(false); }}
                disabled={saving}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 font-bold text-slate-700 transition hover:scale-[1.01] disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-rose-50"
              >
                <X size={18} aria-hidden /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 font-bold text-white shadow-lg shadow-rose-600/25 transition hover:scale-[1.01] hover:bg-rose-500 disabled:opacity-60"
              >
                {saving ? <Loader2 size={18} aria-hidden className="animate-spin" /> : <Save size={18} aria-hidden />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Left: details */}
            <div className="space-y-4">
              <section className="glass overflow-hidden rounded-3xl">
                <div className="flex items-center justify-between px-5 pt-4">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-amber-50">
                    <ClipboardList size={18} aria-hidden /> Details
                  </h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-bold text-white transition hover:scale-105 dark:bg-amber-100 dark:text-slate-900"
                  >
                    <Pencil size={15} aria-hidden /> Edit
                  </button>
                </div>
                <div className="divide-y divide-slate-900/5 pb-2 dark:divide-white/5">
                  <ReadRow icon={<User size={16} aria-hidden />} label="Receipt name" value={order.customerName} />
                  <ReadRow icon={<User size={16} aria-hidden />} label="Contact person" value={order.contactName ?? "—"} />
                  <ReadRow icon={<Building2 size={16} aria-hidden />} label="Company" value={order.companyName || "—"} />
                  <ReadRow icon={<Phone size={16} aria-hidden />} label="Mobile" value={order.mobile ?? "—"} mono />
                  <ReadRow icon={<Store size={16} aria-hidden />} label="Branch" value={String(order.branch).toUpperCase()} />
                  <ReadRow icon={<Truck size={16} aria-hidden />} label="Fulfillment" value={String(order.fulfillment ?? "—").toUpperCase()} />
                  <ReadRow icon={<MapPin size={16} aria-hidden />} label="Address" value={order.address ?? "—"} />
                  <ReadRow icon={<Hash size={16} aria-hidden />} label="OS / Invoice" value={`${order.osNo ?? "—"}  •  ${order.invoiceNo ?? "—"}`} mono />
                </div>
              </section>

              <section className="glass rounded-3xl p-5 sm:p-6">
                <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-amber-50">
                  <Package size={18} aria-hidden /> Items ({items.length})
                </h2>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500 dark:text-rose-100/60">No items.</p>
                ) : (
                  <>
                    <ul className="mt-3 space-y-2">
                      {items.map((it: any, i: number) => {
                        const kg = it.weightKg ?? 0;
                        const price = it.finalPrice ?? it.estPrice ?? 0;
                        const amt = kg > 0 ? kg * price : it.qtyBox * price;
                        return (
                          <li key={i} className="rounded-2xl bg-white/70 px-4 py-2.5 text-sm dark:bg-white/5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0 flex-1 truncate font-semibold">{it.productName}</span>
                              <span className="font-mono font-bold">₱{Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-rose-100/60">
                              {it.qtyBox} box(es) • {Number(kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg @ ₱{Number(price).toLocaleString()}/kg
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-2 flex items-center justify-between rounded-2xl bg-slate-900/5 px-4 py-2.5 text-sm font-bold dark:bg-white/5">
                      <span>
                        {items.reduce((s: number, it: any) => s + (it.qtyBox ?? 0), 0)} boxes •{" "}
                        {items.reduce((s: number, it: any) => s + (it.weightKg ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                      </span>
                      <span className="font-mono">₱{Number(payable ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </section>

              {proofs.length > 0 && (
                <section className="glass rounded-3xl p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-amber-50">
                    <ReceiptText size={18} aria-hidden /> Payment proofs ({proofs.length})
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {proofs.map((p: any) => (
                      <li key={p.id}>
                        <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-2.5 text-sm font-semibold underline-offset-2 hover:underline dark:bg-white/5">
                          <ReceiptText size={16} aria-hidden className="shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{p.fileName}</span>
                          <ExternalLink size={15} aria-hidden className="shrink-0 opacity-60" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Right: summary + actions */}
            <div className="space-y-4">
              <section className="glass-strong rounded-3xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-rose-100/60">Amount due</p>
                <p className="mt-1 text-3xl font-black text-slate-900 dark:text-amber-50">₱{Number(payable ?? 0).toLocaleString()}</p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <p className="flex justify-between"><span className="text-slate-500 dark:text-rose-100/60">Estimate</span><b>₱{Number(order.estimateTotal ?? 0).toLocaleString()}</b></p>
                  <p className="flex justify-between"><span className="text-slate-500 dark:text-rose-100/60">Final</span><b>{order.finalTotal != null ? `₱${Number(order.finalTotal).toLocaleString()}` : "—"}</b></p>
                  <p className="flex justify-between"><span className="text-slate-500 dark:text-rose-100/60">Mode</span><b>{order.paymentMode ?? "—"}</b></p>
                  <p className="flex justify-between"><span className="text-slate-500 dark:text-rose-100/60">Status</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${statusPill(order.status)}`}>{String(order.status).replace(/_/g, " ")}</span></p>
                </div>
              </section>

              <section className="glass rounded-3xl p-4 space-y-2">
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 font-bold text-white shadow-lg shadow-rose-600/25 transition hover:scale-[1.01] hover:bg-rose-500"
                >
                  <Pencil size={18} aria-hidden /> Edit order
                </button>
                <a
                  href={`/track/${order.trackingId}`}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 font-bold text-slate-700 transition hover:scale-[1.01] dark:border-white/10 dark:bg-white/5 dark:text-rose-50"
                >
                  <ExternalLink size={18} aria-hidden /> Customer receipt
                </a>
                <button
                  onClick={() => window.print()}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 font-bold text-slate-700 transition hover:scale-[1.01] dark:border-white/10 dark:bg-white/5 dark:text-rose-50"
                >
                  <Printer size={18} aria-hidden /> Print tally + receipts
                </button>
                <a
                  href="/admin/orders"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-900/5 dark:text-rose-100/60 dark:hover:bg-white/5"
                >
                  <ClipboardList size={16} aria-hidden /> Back to board
                </a>
              </section>
            </div>
          </div>

          <section className="glass mt-4 rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-amber-50">
                <Printer size={18} aria-hidden /> Picklist tally + delivery sheets
              </h2>
              <button
                onClick={() => window.print()}
                className="ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:scale-105 dark:bg-amber-100 dark:text-slate-900"
              >
                <Printer size={16} aria-hidden /> Print all 3 sheets
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-rose-100/60">
              Click any highlighted cell to edit — OS#, date, address, lines, signatures. Saving writes back to this order.
            </p>
            <div className="mt-3 overflow-x-auto">
              <SheetReceipt
                order={order}
                editable
                saving={sheetSaving}
                saveError={sheetError}
                onSave={saveSheet}
                qrValue={typeof window !== "undefined" ? `${window.location.origin}/track/${order.trackingId}` : `/track/${order.trackingId}`}
              />
            </div>
          </section>
          </>
        )}
      </main>
    </div>
  );
}
