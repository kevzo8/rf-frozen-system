"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { use, useState } from "react";
import ThemeToggle from "../../../components/ThemeToggle";
import { Printer, Upload, ReceiptText, Route, Link2 } from "lucide-react";
import { Skeleton, SkeletonLines } from "../../../components/Skeleton";
import LifecycleGuide from "../../../components/LifecycleGuide";

export const dynamic = "force-dynamic";
const STEPS = ["placed", "confirmed", "to_pay", "proof_uploaded", "payment_verified", "picking", "checking", "dispatched", "delivered"];
const LABEL: Record<string, string> = {
  placed: "Order placed", confirmed: "Confirmed", to_pay: "To pay", proof_uploaded: "Proof uploaded",
  payment_verified: "Payment verified", picking: "Picking", checking: "Checking", dispatched: "Dispatched", delivered: "Delivered",
};

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = useQuery((api as any)?.orders?.getByTracking, { trackingId: (id as string).toLowerCase() });
  const getUrl = useMutation((api as any)?.proofStorage?.uploadUrl);
  const link = useMutation((api as any)?.orders?.linkProof);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("GCASH");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file || !order) return;
    setBusy(true);
    try {
      const url = await (getUrl as any)({});
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
      const { storageId } = await res.json();
      await (link as any)({ trackingId: order.trackingId, fileId: storageId, fileName: file.name, mode, amount: order.finalTotal ?? order.estimateTotal });
      alert("Proof uploaded — biller will verify.");
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  if (!order) return (
    <div className="min-h-screen font-body">
      <header className="glass sticky top-0 z-20 border-b border-white/60">
        <div className="mx-auto max-w-3xl px-5 py-3 flex items-center gap-3">
          <Skeleton className="h-10 w-10 !rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6 space-y-4">
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
        <div className="mx-auto max-w-3xl px-5 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} aria-label="Go back" className="glass inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-base font-semibold">← Back</button>
          <img src="/rf-logo.jpg" alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
          <p className="font-display font-bold text-slate-900 dark:text-amber-100">RF FROZEN MEAT</p>
          <div className="ml-auto flex gap-2"><ThemeToggle /><a href="/" className="inline-flex min-h-[44px] items-center text-base glass rounded-full px-4 py-2 font-semibold">Shop</a><a href="/admin/orders" className="hidden sm:inline-flex min-h-[44px] items-center text-base glass rounded-full px-4 py-2 font-semibold">Orders</a></div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6 space-y-4">
        <div className="glass-strong rounded-3xl p-6">
          <p className="font-mono text-sm text-slate-500">{order.trackingId}</p>
          <h1 className="text-xl font-black text-slate-900">{order.customerName} • {order.branch}</h1>
          <p className="text-base">Payable: <b className="text-lg">₱{(order.finalTotal ?? order.estimateTotal).toLocaleString()}</b> • {order.paymentMode ?? "waiting for biller confirmation"}</p>
          <h2 className="mt-4 flex items-center gap-2 font-display text-base font-bold tracking-wide"><Route size={18} aria-hidden /> Where is my order?</h2>
          <div className="mt-2"><LifecycleGuide current={order.status} /></div>
        </div>
        <div className="glass rounded-3xl p-6">
          <h2 className="flex items-center gap-2 font-bold"><ReceiptText size={18} aria-hidden /> Receipt — print / screenshot this</h2>
          <div className="mt-2 rounded-2xl bg-white/90 border p-4 text-sm text-slate-800">
            <p className="font-black">RF FROZEN MEAT CORP — {order.branch.toUpperCase()}</p>
            <p>OS: {order.osNo ?? "-"} | INV: {order.invoiceNo ?? "-"} | {order.trackingId}</p>
            <p>Status: <b>{order.status}</b> • Payable: <b>₱{(order.finalTotal ?? order.estimateTotal).toLocaleString()}</b></p>
            <p className="mt-1 break-all">Track anytime: <span className="font-mono">{typeof window !== "undefined" ? `${window.location.origin}/track/${order.trackingId}` : `/track/${order.trackingId}`}</span></p>
            <ul className="mt-1">{order.items.map((it: any, i: number) => <li key={i}>{it.productName} × {it.qtyBox} @ ₱{it.estPrice}</li>)}</ul>
            <p className="mt-1 text-[11px] text-slate-500">THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-base font-semibold text-white"><Printer size={18} aria-hidden /> Print receipt</button>
            <button onClick={() => { const link = `${window.location.origin}/track/${order.trackingId}`; navigator.clipboard?.writeText(link); alert("Tracking link copied: " + link); }} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border px-5 py-2.5 text-base font-semibold"><Link2 size={18} aria-hidden /> Copy tracking link</button>
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <h2 className="font-bold text-slate-900">Upload proof of payment</h2>
          <p className="text-xs text-slate-500">GCash / Maya screenshot or photo of cash receipt. Biller verifies after.</p>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-xl border px-2 py-1.5 text-sm">
              {["GCASH", "MAYA", "BDO", "GOTYME", "CASH"].map((m) => <option key={m}>{m}</option>)}
            </select>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
            <button onClick={upload} disabled={busy || !file} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-800 to-red-600 px-5 py-2.5 text-base font-bold text-white disabled:opacity-50"><Upload size={18} aria-hidden /> {busy ? "Uploading..." : "Upload proof"}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
