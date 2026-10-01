"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getToken } from "../../../lib/auth-token";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeToggle from "../../../components/ThemeToggle";
import { Check, ReceiptText, ArrowRight, ClipboardList, Wallet, Upload } from "lucide-react";
import { SkeletonLines } from "../../../components/Skeleton";
import LifecycleGuide from "../../../components/LifecycleGuide";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
const FLOW = ["placed", "confirmed", "to_pay", "proof_uploaded", "payment_verified", "picking", "checking", "dispatched", "delivered"];

function OrdersBoardInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setTok] = useState<string | null>(null);
  const [status, setStatus] = useState(() => params.get("status") ?? "all");
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
  const getUrl = useMutation((api as any)?.proofStorage?.uploadUrl);
  const linkProof = useMutation((api as any)?.orders?.linkProof);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofMsg, setProofMsg] = useState("");

  async function uploadProofForCustomer(file: File | undefined) {
    if (!file || !sel || !token) return;
    setProofBusy(true);
    setProofMsg("");
    try {
      const url = await (getUrl as any)({});
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
      const { storageId } = await res.json();
      await (linkProof as any)({ trackingId: sel.trackingId, fileId: storageId, fileName: file.name, mode, amount: Number(final) || sel.finalTotal || sel.estimateTotal });
      setProofMsg("Proof uploaded for customer — verify it above.");
    } catch (err: any) {
      setProofMsg(err?.message ?? "Upload failed");
    } finally {
      setProofBusy(false);
    }
  }

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
          <a href="/admin" className="glass inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-base">← Admin</a>
          <h1 className="flex items-center gap-2 font-display text-lg font-bold"><ClipboardList size={20} aria-hidden /> Orders board</h1>
          <div className="ml-auto flex gap-2 items-center">
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="min-h-[44px] rounded-xl border px-2 py-1.5 text-base">
              {["all", ...FLOW, "cancelled", "returned"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-5 grid lg:grid-cols-[1.5fr_1fr] gap-4 text-base">
        <div className="space-y-2" aria-live="polite">
          {orders === undefined ? (
            <SkeletonLines rows={5} />
          ) : (
          <>
          {(orders ?? []).map((o: any) => {
            const isSel = sel?.trackingId === o.trackingId;
            return (
            <div key={o.trackingId} className={`rounded-2xl p-3 text-base transition ${isSel ? "bg-gradient-to-br from-red-900/10 to-amber-100/60 dark:from-red-950/60 dark:to-amber-950/20 ring-4 ring-red-500/70 border-2 border-red-500/60 shadow-xl" : "glass"}`}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs opacity-60">{o.trackingId}</span>
                {isSel && <span className="rounded-full bg-red-700 px-2 py-0.5 text-[11px] font-bold text-white">BILLING THIS ONE</span>}
                <span className="ml-auto rounded-full bg-slate-900 dark:bg-amber-200 dark:text-red-950 text-white px-2 py-0.5 text-[11px] font-bold">{o.status}</span>
              </div>
              <p className="font-semibold">{o.companyName ? <>{o.companyName} <span className="font-normal opacity-70">({o.contactName ?? o.customerName})</span></> : (o.contactName ?? o.customerName)} • {o.branch} • ₱{(o.finalTotal ?? o.estimateTotal).toLocaleString()}</p>
              <p className="text-sm opacity-70">{o.items.map((i: any) => `${i.productName}×${i.qtyBox}`).join(", ")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => { setSel(o); setFinal(String(o.finalTotal ?? o.estimateTotal)); setMode(o.paymentMode ?? "GCASH"); setOs(o.osNo ?? ""); setInv(o.invoiceNo ?? ""); document.getElementById("bill-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }} aria-pressed={isSel} className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-base font-bold focus-visible:outline-2 ${isSel ? "bg-gradient-to-r from-red-800 to-orange-500 text-white shadow-lg" : "bg-slate-900 text-white dark:bg-amber-200 dark:text-red-950"}`}><Wallet size={17} aria-hidden /> {isSel ? "Billing this order..." : "Set final bill"}</button>
                {o.status === "placed" && <button onClick={() => confirm(o.trackingId)} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border px-4 py-2 text-base font-semibold"><Check size={17} aria-hidden /> Confirm</button>}
                {o.status === "proof_uploaded" && <button onClick={() => advance(o.trackingId, "payment_verified")} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-emerald-600 text-white px-4 py-2 text-base font-semibold"><Check size={17} aria-hidden /> Verify payment</button>}
                {(o.status === "payment_verified" || o.status === "confirmed") && <button onClick={() => advance(o.trackingId, "picking")} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border px-4 py-2 text-base font-semibold">Picking <ArrowRight size={16} aria-hidden /></button>}
                {o.status === "picking" && <button onClick={() => advance(o.trackingId, "checking")} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border px-4 py-2 text-base font-semibold">Checking <ArrowRight size={16} aria-hidden /></button>}
                {o.status === "checking" && <button onClick={() => advance(o.trackingId, "dispatched")} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border px-4 py-2 text-base font-semibold">Dispatched <ArrowRight size={16} aria-hidden /></button>}
                {o.status === "dispatched" && <button onClick={() => advance(o.trackingId, "delivered")} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-emerald-600 text-white px-4 py-2 text-base font-semibold"><Check size={17} aria-hidden /> Delivered</button>}
                <a href={`/track/${o.trackingId}`} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border px-4 py-2 text-base underline"><ReceiptText size={17} aria-hidden /> Receipt</a>
              </div>
            </div>
            );
          })}
          {orders !== undefined && orders.length === 0 && <p className="text-base opacity-60">No orders for this filter. Place a test order in the shop.</p>}
          </>
          )}
        </div>
        <div id="bill-panel" className={`rounded-2xl p-4 h-fit lg:sticky lg:top-20 text-base scroll-mt-24 transition ${sel ? "bg-gradient-to-br from-red-900/10 to-amber-100/60 dark:from-red-950/60 dark:to-amber-950/20 ring-4 ring-red-500/70 border-2 border-red-500/60" : "glass"}`}>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Wallet size={19} aria-hidden /> Final bill</h2>
          {!sel ? <p className="text-sm opacity-60 mt-1">Tap “Set final bill” on an order — it will highlight so you know which one you are billing.</p> : (
            <div className="mt-2 space-y-2">
              <div className="rounded-xl bg-slate-900 dark:bg-amber-200 dark:text-red-950 text-white px-3 py-2">
                <p className="text-xs uppercase tracking-widest opacity-70">Now billing</p>
                <p className="font-bold">{sel.customerName}</p>
                <p className="font-mono text-sm">{sel.trackingId}</p>
              </div>
              <label className="block text-sm font-semibold">Final total ₱<input value={final} onChange={(e) => setFinal(e.target.value)} type="number" className="mt-1 min-h-[48px] w-full rounded-xl border px-2 py-1.5 text-base" /></label>
              <label className="block text-sm font-semibold">Payment mode<select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-xl border px-2 py-1.5 text-base">{["GCASH", "MAYA", "BDO", "GOTYME", "CASH"].map((m) => <option key={m}>{m}</option>)}</select></label>
              <label className="block text-sm font-semibold">OS No.<input value={os} onChange={(e) => setOs(e.target.value)} placeholder="RF55xxx" className="mt-1 min-h-[48px] w-full rounded-xl border px-2 py-1.5 text-base" /></label>
              <label className="block text-sm font-semibold">Invoice No.<input value={inv} onChange={(e) => setInv(e.target.value)} placeholder="238xxx" className="mt-1 min-h-[48px] w-full rounded-xl border px-2 py-1.5 text-base" /></label>
              <button onClick={saveFinal} className="min-h-[48px] w-full rounded-xl bg-gradient-to-r from-red-900 to-red-600 py-2.5 text-base text-white font-bold">Save final bill → customer sees “To pay”</button>
              <div className="rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-black/20 p-2.5">
                <p className="flex items-center gap-1.5 text-sm font-bold"><Upload size={16} aria-hidden /> Upload proof for customer</p>
                <p className="text-xs opacity-70">Customer sent it via Messenger/text? Attach it here — same as their upload.</p>
                <input type="file" accept="image/*" aria-label="Proof of payment file" onChange={(e) => uploadProofForCustomer(e.target.files?.[0])} className="mt-1.5 w-full text-sm" />
                {proofBusy && <p className="text-sm">Uploading...</p>}
                {proofMsg && <p className="text-sm font-semibold" role="status">{proofMsg}</p>}
              </div>
              <button onClick={() => setSel(null)} className="min-h-[44px] w-full rounded-xl border py-2 text-sm">Clear selection</button>
            </div>
          )}
          <details open className="mt-3 rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-black/20 p-2">
            <summary className="cursor-pointer min-h-[44px] text-sm font-bold">Where does this order go next?</summary>
            <div className="mt-2"><LifecycleGuide current={sel?.status} /></div>
          </details>
        </div>
      </main>
    </div>
  );
}

export default function OrdersBoard() {
  return (
    <Suspense fallback={<main className="p-8 text-base">Loading orders...</main>}>
      <OrdersBoardInner />
    </Suspense>
  );
}
