"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { use, useState } from "react";
import ThemeToggle from "../../../components/ThemeToggle";

export const dynamic = "force-dynamic";
const STEPS = ["placed", "confirmed", "to_pay", "proof_uploaded", "payment_verified", "picking", "checking", "dispatched", "delivered"];
const LABEL: Record<string, string> = {
  placed: "Order placed", confirmed: "Confirmed", to_pay: "To pay", proof_uploaded: "Proof uploaded",
  payment_verified: "Payment verified", picking: "Picking", checking: "Checking", dispatched: "Dispatched", delivered: "Delivered",
};

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = useQuery((api as any)?.orders?.getByTracking, { trackingId: (id as string).toLowerCase() });
  const [file, setFile] = useState<File | null>(null);

  if (!order) return <main className="min-h-screen flex items-center justify-center text-sm text-slate-600">Loading {id}...</main>;

  return (
    <div className="min-h-screen font-body text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b border-white/60">
        <div className="mx-auto max-w-3xl px-5 py-3 flex items-center gap-3">
          <img src="/rf-logo.jpg" alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
          <p className="font-deco text-slate-900 dark:text-amber-100">RF FROZEN MEAT</p>
          <div className="ml-auto flex gap-2"><ThemeToggle /><a href="/" className="text-sm glass rounded-full px-4 py-1.5 font-semibold">← Shop</a></div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6 space-y-4">
        <div className="glass-strong rounded-3xl p-6">
          <p className="font-mono text-sm text-slate-500">{order.trackingId}</p>
          <h1 className="text-xl font-black text-slate-900">{order.customerName} • {order.branch}</h1>
          <p className="text-sm text-slate-600">Payable: <b className="text-slate-900 text-lg">₱{(order.finalTotal ?? order.estimateTotal).toLocaleString()}</b> • {order.paymentMode ?? "waiting for biller confirmation"}</p>
          <div className="mt-3 space-y-1.5">
            {STEPS.map((s) => {
              const on = STEPS.indexOf(s) <= STEPS.indexOf(order.status);
              return <div key={s} className="flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-emerald-500" : "bg-slate-300"}`} /><span className={on ? "text-slate-900 font-medium" : "text-slate-400"}>{LABEL[s]}</span></div>;
            })}
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <h2 className="font-bold text-slate-900">Receipt — print / screenshot this</h2>
          <div className="mt-2 rounded-2xl bg-white/90 border p-4 text-sm text-slate-800">
            <p className="font-black">RF FROZEN MEAT CORP — {order.branch.toUpperCase()}</p>
            <p>OS: {order.osNo ?? "-"} | INV: {order.invoiceNo ?? "-"} | {order.trackingId}</p>
            <ul className="mt-1">{order.items.map((it: any, i: number) => <li key={i}>{it.productName} × {it.qtyBox} @ ₱{it.estPrice}</li>)}</ul>
            <p className="mt-1 text-[11px] text-slate-500">THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES</p>
          </div>
          <button onClick={() => window.print()} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">🖨 Print receipt</button>
        </div>
        <div className="glass rounded-3xl p-6">
          <h2 className="font-bold text-slate-900">Upload proof of payment</h2>
          <p className="text-xs text-slate-500">GCash / Maya screenshot or photo of cash receipt. Biller verifies after.</p>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-2 text-sm text-slate-700" />
          <button onClick={() => alert(file ? `Selected: ${file.name} — full upload wiring next` : "Choose a file first")} className="mt-2 rounded-xl bg-gradient-to-r from-red-800 to-red-600 px-4 py-2 text-sm font-bold text-white">Upload proof</button>
        </div>
      </main>
    </div>
  );
}
