"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getToken } from "../../../lib/auth-token";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../../../components/ThemeToggle";

export const dynamic = "force-dynamic";
const FLOW = ["placed", "confirmed", "to_pay", "proof_uploaded", "payment_verified", "picking", "checking", "dispatched", "delivered"];

export default function OrdersBoard() {
  const router = useRouter();
  const [token, setTok] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [sel, setSel] = useState<any>(null);
  const [final, setFinal] = useState("");
  const [mode, setMode] = useState("GCASH");
  const [os, setOs] = useState("");
  const [inv, setInv] = useState("");

  useEffect(() => {
    const t = getToken();
    if (!t) router.push("/admin/login");
    else setTok(t);
  }, [router]);

  const orders = useQuery((api as any)?.orders?.listOrders, token ? { token, status } : "skip");
  const doSetFinal = useMutation((api as any)?.orders?.setFinal);
  const doSetStatus = useMutation((api as any)?.orders?.setStatus);

  if (!token) return <main className="p-8 text-sm">Loading...</main>;

  async function confirm(trackingId: string) {
    await (doSetStatus as any)({ token, trackingId, status: "confirmed" });
  }
  async function saveFinal() {
    if (!sel) return;
    await (doSetFinal as any)({ token, trackingId: sel.trackingId, finalTotal: Number(final), paymentMode: mode, osNo: os || undefined, invoiceNo: inv || undefined });
    setSel(null); setFinal(""); setOs(""); setInv("");
  }
  async function advance(trackingId: string, next: string) {
    await (doSetStatus as any)({ token, trackingId, status: next });
  }

  return (
    <div className="min-h-screen font-body text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-2">
          <a href="/admin" className="glass rounded-full px-3 py-1 text-sm">← Admin</a>
          <h1 className="font-display font-bold">Orders board</h1>
          <div className="ml-auto flex gap-2 items-center">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-2 py-1.5 text-sm">
              {["all", ...FLOW, "cancelled", "returned"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-5 grid lg:grid-cols-[1.5fr_1fr] gap-4">
        <div className="space-y-2">
          {(orders ?? []).map((o: any) => (
            <div key={o.trackingId} className={`glass rounded-2xl p-3 text-sm ${sel?.trackingId === o.trackingId ? "ring-2 ring-red-400" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs opacity-60">{o.trackingId}</span>
                <span className="ml-auto rounded-full bg-slate-900 dark:bg-amber-200 dark:text-red-950 text-white px-2 py-0.5 text-[11px] font-bold">{o.status}</span>
              </div>
              <p className="font-semibold">{o.customerName} • {o.branch} • ₱{(o.finalTotal ?? o.estimateTotal).toLocaleString()}</p>
              <p className="text-xs opacity-70">{o.items.map((i: any) => `${i.productName}×${i.qtyBox}`).join(", ")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button onClick={() => { setSel(o); setFinal(String(o.finalTotal ?? o.estimateTotal)); setMode(o.paymentMode ?? "GCASH"); setOs(o.osNo ?? ""); setInv(o.invoiceNo ?? ""); }} className="rounded-lg bg-slate-900 text-white px-2.5 py-1 text-xs">Set final / bill</button>
                {o.status === "placed" && <button onClick={() => confirm(o.trackingId)} className="rounded-lg border px-2.5 py-1 text-xs">Confirm ✓</button>}
                {o.status === "proof_uploaded" && <button onClick={() => advance(o.trackingId, "payment_verified")} className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs">Verify payment ✓</button>}
                {(o.status === "payment_verified" || o.status === "confirmed") && <button onClick={() => advance(o.trackingId, "picking")} className="rounded-lg border px-2.5 py-1 text-xs">→ Picking</button>}
                {o.status === "picking" && <button onClick={() => advance(o.trackingId, "checking")} className="rounded-lg border px-2.5 py-1 text-xs">→ Checking</button>}
                {o.status === "checking" && <button onClick={() => advance(o.trackingId, "dispatched")} className="rounded-lg border px-2.5 py-1 text-xs">→ Dispatched</button>}
                {o.status === "dispatched" && <button onClick={() => advance(o.trackingId, "delivered")} className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs">Delivered ✓</button>}
                <a href={`/track/${o.trackingId}`} className="rounded-lg border px-2.5 py-1 text-xs underline">Receipt</a>
              </div>
            </div>
          ))}
          {(!orders || orders.length === 0) && <p className="text-sm opacity-60">No orders for this filter. Place a test order in the shop.</p>}
        </div>
        <div className="glass rounded-2xl p-4 h-fit lg:sticky lg:top-20 text-sm">
          <h2 className="font-display font-bold">Bill / set final</h2>
          {!sel ? <p className="text-xs opacity-60 mt-1">Select “Set final / bill” on an order.</p> : (
            <div className="mt-2 space-y-2">
              <p className="font-mono text-xs">{sel.trackingId}</p>
              <label className="block text-xs">Final total ₱<input value={final} onChange={(e) => setFinal(e.target.value)} type="number" className="mt-1 w-full rounded-xl border px-2 py-1.5" /></label>
              <label className="block text-xs">Mode<select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 w-full rounded-xl border px-2 py-1.5">{["GCASH", "MAYA", "BDO", "GOTYME", "CASH"].map((m) => <option key={m}>{m}</option>)}</select></label>
              <label className="block text-xs">OS No.<input value={os} onChange={(e) => setOs(e.target.value)} placeholder="RF55xxx" className="mt-1 w-full rounded-xl border px-2 py-1.5" /></label>
              <label className="block text-xs">Invoice No.<input value={inv} onChange={(e) => setInv(e.target.value)} placeholder="238xxx" className="mt-1 w-full rounded-xl border px-2 py-1.5" /></label>
              <button onClick={saveFinal} className="w-full rounded-xl bg-gradient-to-r from-red-900 to-red-600 py-2 text-white font-bold">Save → status to_pay</button>
            </div>
          )}
          <div className="mt-3 text-xs opacity-70">Flow: placed → confirmed → to_pay → proof_uploaded → payment_verified → picking → checking → dispatched → delivered</div>
        </div>
      </main>
    </div>
  );
}
