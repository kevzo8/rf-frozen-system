"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { use, useState, useEffect } from "react";
import ThemeToggle from "../../../components/ThemeToggle";
import { Printer, Upload, X, Trash2, ReceiptText, Route, Link2 } from "lucide-react";
import { Skeleton, SkeletonLines } from "../../../components/Skeleton";
import LifecycleGuide from "../../../components/LifecycleGuide";
import SheetReceipt, { exportSheetsXlsx } from "../../../components/SheetReceipt";

export const dynamic = "force-dynamic";

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = useQuery((api as any)?.orders?.getByTracking, { trackingId: (id as string).toLowerCase() });
  const getUrl = useMutation((api as any)?.proofStorage?.uploadUrl);
  const link = useMutation((api as any)?.orders?.linkProof);
  const delProof = useMutation((api as any)?.orders?.deleteProof);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState("GCASH");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const proofs: any[] = (order as any)?.proofs ?? [];
  const existing = proofs[0] ?? null;

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clearFile() {
    setFile(null);
    setPreview(null);
  }

  async function upload() {
    if (!file || !order) return;
    setBusy(true);
    try {
      const url = await (getUrl as any)({});
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
      const { storageId } = await res.json();
      await (link as any)({ trackingId: order.trackingId, fileId: storageId, fileName: file.name, mode, amount: order.finalTotal ?? order.estimateTotal });
      alert("Proof uploaded — biller will verify.");
      clearFile();
    } finally {
      setBusy(false);
    }
  }

  async function removeExisting() {
    if (!order || !existing || !confirm("Delete this proof photo?")) return;
    setDeleting(true);
    try {
      await (delProof as any)({ trackingId: order.trackingId, proofId: existing.id });
    } finally {
      setDeleting(false);
    }
  }

  if (!order) return (
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

  return (
    <div className="min-h-screen font-body text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b border-white/60">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} aria-label="Go back" className="glass inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-base font-semibold">← Back</button>
          <img src="/rf-logo.jpg" alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
          <p className="font-display font-bold text-slate-900 dark:text-amber-100">RF FROZEN MEAT</p>
          <div className="ml-auto flex gap-2"><ThemeToggle /><a href="/" className="inline-flex min-h-[44px] items-center text-base glass rounded-full px-4 py-2 font-semibold">Shop</a><a href="/admin/orders" className="hidden sm:inline-flex min-h-[44px] items-center text-base glass rounded-full px-4 py-2 font-semibold">Orders</a></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* LEFT: receipt + upload */}
          <div className="space-y-4">
            <div className="glass rounded-3xl p-6">
              <p className="font-mono text-sm text-slate-500">{order.trackingId}</p>
              <h1 className="text-xl font-black uppercase text-slate-900">{order.customerName} • {order.branch}</h1>
              <p className="text-base">Payable: <b className="text-lg">₱{(order.finalTotal ?? order.estimateTotal).toLocaleString()}</b> • {order.paymentMode ?? "waiting for biller confirmation"}</p>
            </div>

            <div className="glass rounded-3xl p-6">
              <h2 className="flex items-center gap-2 font-bold"><ReceiptText size={18} aria-hidden /> Receipt — print / screenshot this</h2>
              <div className="mt-2 rounded-2xl bg-white/90 border p-4 text-sm text-slate-800">
                <p className="font-black">RF FROZEN MEAT CORP — {order.branch.toUpperCase()}</p>
                <p>OS: {order.osNo ?? "-"} | INV: {order.invoiceNo ?? "-"} | {order.trackingId}</p>
                <p>CONTACT NAME: <b>{String(order.contactName ?? order.customerName).toUpperCase()}</b></p>
                {order.companyName && <p>COMPANY: <b>{String(order.companyName).toUpperCase()}</b></p>}
                <p>CONTACT NUMBER: {(order as any).mobile ?? "-"}</p>
                {order.fulfillment === "pickup" ? (
                  <p>PICKUP — {String(order.branch).toUpperCase()} BRANCH</p>
                ) : (
                  <p>DELIVERY ADDRESS: <b>{String((order as any).address ?? "")}</b></p>
                )}
                <p>Status: <b>{order.status}</b> • Payable: <b>₱{(order.finalTotal ?? order.estimateTotal).toLocaleString()}</b></p>
                <p className="mt-1 break-all">Track anytime: <span className="font-mono">{typeof window !== "undefined" ? `${window.location.origin}/track/${order.trackingId}` : `/track/${order.trackingId}`}</span></p>
                <ul className="mt-1 list-disc pl-5">{order.items.map((it: any, i: number) => {
                  const kg = it.weightKg ?? 0;
                  const price = it.finalPrice ?? it.estPrice;
                  const amt = kg > 0 ? kg * price : it.qtyBox * price;
                  return <li key={i}>{it.productName} — {it.qtyBox} box(es){kg > 0 ? ` • ${Number(kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : ""} @ ₱{price}/kg = ₱{Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>;
                })}</ul>
                <p className="mt-1 text-[11px] text-slate-500">Sold by weight — amount = kilos × price. THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => window.print()} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-base font-semibold text-white"><Printer size={18} aria-hidden /> Print receipt</button>
                <button onClick={() => { const link = `${window.location.origin}/track/${order.trackingId}`; navigator.clipboard?.writeText(link); alert("Tracking link copied: " + link); }} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border px-5 py-2.5 text-base font-semibold"><Link2 size={18} aria-hidden /> Copy tracking link</button>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <h2 className="flex items-center gap-2 font-bold"><ReceiptText size={18} aria-hidden /> Tally + delivery sheets</h2>
              <p className="text-xs text-slate-500">Picklist tally, delivery receipt, and RF deliveries — with kilo totals. Prints on 3 pages.</p>
              <div className="mt-3 overflow-x-auto">
                <SheetReceipt order={order} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => window.print()} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-base font-semibold text-white"><Printer size={18} aria-hidden /> Print all 3 sheets</button>
                <button onClick={() => exportSheetsXlsx(order)} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border px-5 py-2.5 text-base font-semibold">Export xlsx</button>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <h2 className="font-bold text-slate-900">Proof of payment</h2>
              <p className="text-xs text-slate-500">GCash / Maya screenshot or photo of cash receipt. Preview, then upload — or clear to start over.</p>

              {existing && !file ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border overflow-hidden">
                    <img src={existing.url} alt="Proof of payment" className="w-full max-h-80 object-contain bg-slate-100 dark:bg-black/30" />
                    <div className="px-3 py-2 flex items-center justify-between gap-2 text-sm">
                      <span className="opacity-70 truncate">{existing.fileName} • {new Date(existing.uploadedAt).toLocaleString("en-PH")}</span>
                      <button onClick={removeExisting} disabled={deleting} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-400 text-red-700 px-4 py-2 font-semibold disabled:opacity-50">
                        <Trash2 size={16} aria-hidden /> {deleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                  <label className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-dashed border-slate-400 dark:border-white/25 bg-white/70 dark:bg-black/30 px-5 py-2.5 text-base font-bold cursor-pointer hover:scale-[1.02] hover:border-red-500">
                    <ReceiptText size={18} aria-hidden /> Replace proof
                    <input type="file" accept="image/*" className="sr-only" aria-label="Replace proof photo" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {preview ? (
                    <div className="rounded-2xl border overflow-hidden">
                      <img src={preview} alt="Proof preview" className="w-full max-h-80 object-contain bg-slate-100 dark:bg-black/30" />
                      <div className="px-3 py-2 text-sm opacity-70 truncate">{file?.name}</div>
                    </div>
                  ) : (
                    <label className="flex min-h-[96px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-400 dark:border-white/25 bg-white/70 dark:bg-black/30 px-5 py-4 text-base font-bold cursor-pointer hover:scale-[1.02] hover:border-red-500">
                      <Upload size={20} aria-hidden /> Choose proof photo
                      <input type="file" accept="image/*" className="sr-only" aria-label="Proof of payment file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </label>
                  )}
                  <div className="flex flex-wrap gap-2 items-center">
                    <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Payment mode" className="min-h-[48px] rounded-xl border px-2 py-1.5 text-base">
                      {["GCASH", "MAYA", "BDO", "GOTYME", "CASH"].map((m) => <option key={m}>{m}</option>)}
                    </select>
                    <button onClick={upload} disabled={busy || !file} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-800 to-red-600 px-5 py-2.5 text-base font-bold text-white disabled:opacity-50"><Upload size={18} aria-hidden /> {busy ? "Uploading..." : "Upload proof"}</button>
                    {file && (
                      <button onClick={clearFile} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border px-4 py-2.5 text-base font-semibold"><X size={18} aria-hidden /> Clear</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: lifecycle */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            <div className="glass-strong rounded-3xl p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-wide"><Route size={18} aria-hidden /> Where is my order?</h2>
              <p className="text-sm mt-1">Status: <b>{order.status}</b></p>
              <div className="mt-2"><LifecycleGuide current={order.status} /></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
