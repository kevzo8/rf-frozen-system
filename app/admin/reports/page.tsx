"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getToken } from "../../../lib/auth-token";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../../../components/ThemeToggle";
import { Download, ChartBar } from "lucide-react";
import { SkeletonLines } from "../../../components/Skeleton";

export const dynamic = "force-dynamic";
const BRANCHES = ["all", "stamesa", "qc", "pasig", "blumentritt", "novaliches", "laspinas"];

export default function Reports() {
  const router = useRouter();
  const [token, setTok] = useState<string | null>(null);
  const [branch, setBranch] = useState("stamesa");
  const [date, setDate] = useState(() => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [tab, setTab] = useState<"cash" | "sales" | "credit" | "receipt">("cash");
  useEffect(() => {
    const t = getToken();
    if (!t) router.push("/admin/login");
    else setTok(t);
  }, [router]);

  const cash = useQuery((api as any)?.reports?.cash, token && tab === "cash" ? { token, branch, date } : "skip");
  const sales = useQuery((api as any)?.reports?.sales, token && tab === "sales" ? { token, branch, date } : "skip");
  const credit = useQuery((api as any)?.reports?.credit, token && tab === "credit" ? { token, branch } : "skip");
  const receipts = useQuery((api as any)?.reports?.receipts, token && tab === "receipt" ? { token, branch, date } : "skip");

  async function exportXlsx() {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    if (tab === "cash" && cash) {
      const ws = wb.addWorksheet(date);
      ws.addRow(["CASH REPORT"]); ws.addRow(["DATE", date]);
      ws.addRow(["OR #", "NAME", "BILL", "CASH", "GCASH", "B.TRANSFER", "REF", "REMARKS"]);
      for (const l of cash.lines as any[]) ws.addRow([l.or, l.name, l.bill, l.cash, l.gcash, l.bank, l.tracking, l.status]);
      ws.addRow(["TOTAL", "", cash.totals.bill, cash.totals.cash, cash.totals.gcash, cash.totals.bank]);
    } else if (tab === "sales" && sales) {
      const ws = wb.addWorksheet(date);
      ws.addRow(["INVOICE & SALES REPORT"]);
      ws.addRow(["DATE", "SI #", "NAME", "BILL", "CASH", "GCASH", "BANK T.", "BALANCE", "REMARKS"]);
      for (const l of sales.lines as any[]) ws.addRow([l.date, l.si, l.name, l.bill, l.cash, l.gcash, l.bank, l.balance, l.remarks]);
      ws.addRow(["TOTAL", "", "", sales.totals.bill, sales.totals.cash, sales.totals.gcash, sales.totals.bank]);
    } else if (tab === "credit" && credit) {
      for (const c of credit as any[]) {
        const ws = wb.addWorksheet(String(c.customer).slice(0, 30));
        ws.addRow([c.customer]); ws.addRow(["DATE", "OR #", "BILL", "PAYMENT", "BALANCE"]);
        for (const l of c.lines) ws.addRow([l.date, l.or, l.bill, l.payment, l.balance]);
        ws.addRow(["TOTAL", "", c.total]);
      }
    } else if (tab === "receipt" && receipts) {
      const ws = wb.addWorksheet("receipts");
      ws.addRow(["OS#", "INV#", "CUSTOMER", "ADDRESS", "ITEMS", "TOTAL", "STATUS"]);
      for (const r of receipts as any[]) ws.addRow([r.os, r.inv, r.customer, r.address, r.items.map((i: any) => `${i.productName}x${i.qtyBox}`).join("; "), r.total, r.status]);
    }
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buf as any], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    a.download = `rf-${tab}-${branch}-${date}.xlsx`;
    a.click();
  }

  if (!token) return <main className="p-8 text-sm">Loading...</main>;

  return (
    <div className="min-h-screen font-body text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-2 flex-wrap">
          <a href="/admin" className="glass inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-base">← Admin</a>
          <h1 className="flex items-center gap-2 font-display text-lg font-bold"><ChartBar size={20} aria-hidden /> Reports — cash / credit / sales / receipt</h1>
          <div className="ml-auto flex gap-2 items-center flex-wrap">
            <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch" className="min-h-[44px] rounded-xl border px-2 py-1.5 text-base">{BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}</select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className="min-h-[44px] rounded-xl border px-2 py-1.5 text-base" />
            <button onClick={exportXlsx} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-base font-bold"><Download size={17} aria-hidden /> Export xlsx</button>
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-3 flex gap-2" role="tablist" aria-label="Report type">
          {(["cash", "sales", "credit", "receipt"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-[48px] rounded-full px-5 py-2 text-base font-bold capitalize focus-visible:outline-2 ${tab === t ? "bg-slate-900 text-white dark:bg-amber-200 dark:text-red-950" : "glass"}`}>{t}</button>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-4 text-base" aria-live="polite">
        {(tab === "cash" && cash === undefined) || (tab === "sales" && sales === undefined) || (tab === "credit" && credit === undefined) || (tab === "receipt" && receipts === undefined) ? (
          <div className="glass rounded-2xl p-4"><SkeletonLines rows={6} /></div>
        ) : (
        <>
        {tab === "cash" && cash && (
          <div className="glass rounded-2xl overflow-auto"><table className="w-full">
            <thead><tr className="text-left text-xs opacity-60"><th className="p-2">OR#</th><th className="p-2">NAME</th><th className="p-2">BILL</th><th className="p-2">CASH</th><th className="p-2">GCASH</th><th className="p-2">BANK</th><th className="p-2">TRACKING</th></tr></thead>
            <tbody>{(cash.lines as any[]).map((l: any) => <tr key={l.tracking} className="border-t"><td className="p-2 font-mono text-xs">{l.or}</td><td className="p-2">{l.name}</td><td className="p-2">{l.bill}</td><td className="p-2">{l.cash}</td><td className="p-2">{l.gcash}</td><td className="p-2">{l.bank}</td><td className="p-2 font-mono text-xs">{l.tracking}</td></tr>)}</tbody>
          </table><p className="p-2 font-bold">TOTAL BILL ₱{cash.totals.bill.toLocaleString()} • CASH ₱{cash.totals.cash.toLocaleString()} • GCASH ₱{cash.totals.gcash.toLocaleString()} • BANK ₱{cash.totals.bank.toLocaleString()}</p></div>
        )}
        {tab === "sales" && sales && (
          <div className="glass rounded-2xl overflow-auto"><table className="w-full">
            <thead><tr className="text-left text-xs opacity-60"><th className="p-2">SI#</th><th className="p-2">NAME</th><th className="p-2">BILL</th><th className="p-2">CASH</th><th className="p-2">GCASH</th><th className="p-2">BANK</th><th className="p-2">REMARKS</th></tr></thead>
            <tbody>{(sales.lines as any[]).map((l: any, i: number) => <tr key={i} className="border-t"><td className="p-2 font-mono text-xs">{l.si}</td><td className="p-2">{l.name}</td><td className="p-2">{l.bill}</td><td className="p-2">{l.cash}</td><td className="p-2">{l.gcash}</td><td className="p-2">{l.bank}</td><td className="p-2 text-xs">{l.remarks}</td></tr>)}</tbody>
          </table><p className="p-2 font-bold">TOTAL ₱{sales.totals.bill.toLocaleString()}</p></div>
        )}
        {tab === "credit" && credit && (
          <div className="space-y-2">{(credit as any[]).map((c: any) => (
            <div key={c.customer} className="glass rounded-2xl p-3"><p className="font-bold">{c.customer} — ₱{c.total.toLocaleString()}</p>
              {c.lines.map((l: any, i: number) => <p key={i} className="text-xs font-mono">{l.date} {l.or} ₱{l.bill} [{l.payment}]</p>)}
            </div>))}
            {(credit as any[]).length === 0 && <p className="opacity-60">No unpaid orders.</p>}
          </div>
        )}
        {tab === "receipt" && receipts && (
          <div className="space-y-2">{(receipts as any[]).map((r: any) => (
            <div key={r.trackingId} className="glass rounded-2xl p-3"><p className="font-mono text-xs">{r.trackingId} • OS {r.os} • INV {r.inv}</p>
              <p className="font-semibold">{r.customer} — ₱{r.total.toLocaleString()} [{r.status}]</p>
              <p className="text-xs">{r.items.map((i: any) => `${i.productName}×${i.qtyBox}`).join(", ")}</p>
            </div>))}
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
