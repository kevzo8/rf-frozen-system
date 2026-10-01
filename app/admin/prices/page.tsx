"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getToken } from "../../../lib/auth-token";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../../../components/ThemeToggle";
import { Tag, Download, Upload, Pencil } from "lucide-react";
import { SkeletonLines } from "../../../components/Skeleton";

export const dynamic = "force-dynamic";

export default function PricesManager() {
  const router = useRouter();
  const [token, setTok] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<any>(null);
  useEffect(() => {
    const t = getToken();
    if (!t) router.push("/admin/login");
    else setTok(t);
  }, [router]);

  const prices = useQuery((api as any)?.prices?.list, {});
  const upsert = useMutation((api as any)?.prices?.upsert);
  const bulk = useMutation((api as any)?.prices?.bulkImport);

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return ((prices ?? []) as any[]).filter((p) => !s || p.productName.toLowerCase().includes(s) || String(p.price).includes(s));
  }, [prices, q]);

  async function saveEdit() {
    if (!edit) return;
    await (upsert as any)({ token, productName: edit.productName, price: Number(edit.price), notes: edit.notes || undefined });
    setEdit(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !token) return;
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await f.arrayBuffer());
    const ws = wb.worksheets[0];
    const out: { productName: string; price: number; notes?: string }[] = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const name = String(row.getCell(1).value ?? "").trim();
      const price = Number(row.getCell(2).value ?? 0);
      const notes = String(row.getCell(3).value ?? "").trim() || undefined;
      if (name && price > 0) out.push({ productName: name, price, notes });
    });
    const n = await (bulk as any)({ token, rows: out });
    alert(`Imported ${n} prices (A=name B=price C=notes)`);
  }

  async function exportXlsx() {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("prices");
    ws.addRow(["name", "price", "notes"]);
    for (const p of (prices ?? []) as any[]) ws.addRow([p.productName, p.price, p.notes ?? ""]);
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    a.download = "rf-prices.xlsx";
    a.click();
  }

  if (!token) return <main className="p-8 text-sm">Loading...</main>;

  return (
    <div className="min-h-screen font-body text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-2">
          <a href="/admin" className="glass rounded-full px-3 py-1 text-sm">← Admin</a>
          <h1 className="font-display font-bold">Prices — name / price / notes</h1>
          <div className="ml-auto flex gap-2"><button onClick={exportXlsx} className="rounded-xl border px-3 py-1.5 text-sm">Export xlsx</button><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-5">
        <div className="glass rounded-2xl p-4 flex flex-wrap gap-2 items-center text-sm">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or price..." className="flex-1 rounded-xl border px-3 py-2" />
          <label className="rounded-xl border px-3 py-2 cursor-pointer">Import xlsx (A=name B=price C=notes)<input type="file" accept=".xlsx" className="hidden" onChange={onFile} /></label>
        </div>
        <div className="mt-3 glass rounded-2xl overflow-auto" aria-live="polite">
          {prices === undefined ? (
            <div className="p-4"><SkeletonLines rows={6} /></div>
          ) : (
          <table className="w-full text-base">
            <thead><tr className="text-left text-xs opacity-60"><th className="p-2">Name</th><th className="p-2">Price</th><th className="p-2">Notes</th><th className="p-2">Updated</th><th className="p-2"></th></tr></thead>
            <tbody>
              {rows.map((p: any) => (
                <tr key={p.productName} className="border-t border-white/20">
                  <td className="p-2">{p.productName}</td>
                  <td className="p-2 font-mono">₱{p.price}</td>
                  <td className="p-2 text-xs">{p.notes ?? <span className="opacity-40">—</span>}</td>
                  <td className="p-2 text-[11px] opacity-60">{p.updatedAt ? new Date(p.updatedAt).toLocaleString("en-PH") : ""} {p.updatedBy ? `by ${p.updatedBy}` : ""}</td>
                  <td className="p-2"><button onClick={() => setEdit({ ...p })} className="rounded-lg border px-2 py-0.5 text-xs">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
        {edit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div className="glass-strong rounded-2xl p-5 w-full max-w-sm text-sm space-y-2">
              <h3 className="font-bold">Edit price</h3>
              <p className="font-semibold">{edit.productName}</p>
              <input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} className="w-full rounded-xl border px-2 py-1.5" />
              <input value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="notes e.g. parating pa lang mamaya" className="w-full rounded-xl border px-2 py-1.5" />
              <div className="flex gap-2"><button onClick={saveEdit} className="flex-1 rounded-xl bg-slate-900 text-white py-2 font-bold">Save</button><button onClick={() => setEdit(null)} className="rounded-xl border px-4">Cancel</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
