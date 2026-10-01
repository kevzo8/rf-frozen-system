"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getToken } from "../../../lib/auth-token";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../../../components/ThemeToggle";
import { Check, FolderOpen, Download, Trash2 } from "lucide-react";
import { SkeletonLines } from "../../../components/Skeleton";

export const dynamic = "force-dynamic";
const BRANCHES = ["stamesa", "qc", "pasig", "blumentritt", "novaliches", "laspinas"];

export default function StorageManager() {
  const router = useRouter();
  const [token, setTok] = useState<string | null>(null);
  const [branch, setBranch] = useState("stamesa");
  const [date, setDate] = useState(() => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10));
  useEffect(() => {
    const t = getToken();
    if (!t) router.push("/admin/login");
    else setTok(t);
  }, [router]);

  const proofs = useQuery((api as any)?.proofStorage?.listProofs, token ? { token, branch, date } : "skip");
  const doLog = useMutation((api as any)?.proofStorage?.logExport);
  const doPurge = useMutation((api as any)?.proofStorage?.purgeExported);

  async function exportDay() {
    if (!proofs || !token) return;
    const JSZip = (await import("jszip")).default;
    const ExcelJS = (await import("exceljs")).default;
    const zip = new JSZip();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("manifest");
    ws.addRow(["date", "tracking", "branch", "customer", "amount", "mode", "file", "exportedBy", "exportedAt"]);
    for (const p of proofs as any[]) {
      if (p.url) {
        const blob = await fetch(p.url).then((r) => r.blob()).catch(() => null);
        if (blob) zip.file(`${p.branch}/${date}/${p.trackingId}-${p.fileName}`, blob);
      }
      ws.addRow([date, p.trackingId, p.branch, "", p.amount ?? "", p.mode ?? "", p.fileName, "", new Date().toISOString()]);
    }
    const manifest = await wb.xlsx.writeBuffer();
    zip.file(`${branch}-${date}-manifest.xlsx`, manifest);
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${branch}-${date}-proofs.zip`;
    a.click();
    await (doLog as any)({ token, branch, date, zipFile: a.download, manifestRows: (proofs as any[]).length, proofIds: (proofs as any[]).map((p: any) => p._id) });
    alert(`Exported ${(proofs as any[]).length} proofs — logged. You may now purge.`);
  }

  async function purge() {
    if (!token || !confirm(`Purge exported proofs for ${branch} ${date}? Files move to your downloaded zip only.`)) return;
    const n = await (doPurge as any)({ token, branch, date });
    alert(`Purged ${n} files. Storage cleared.`);
  }

  if (!token) return <main className="p-8 text-sm">Loading...</main>;

  return (
    <div className="min-h-screen font-body text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-2">
          <a href="/admin" className="glass inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-base">← Admin</a>
          <h1 className="flex items-center gap-2 font-display text-lg font-bold"><FolderOpen size={20} aria-hidden /> Storage — export then purge</h1>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-5">
        <div className="glass rounded-2xl p-4 flex flex-wrap gap-2 text-sm items-center">
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-xl border px-2 py-1.5">{BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}</select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border px-2 py-1.5" />
          <button onClick={exportDay} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-base font-bold"><Download size={18} aria-hidden /> Export day (.zip + manifest.xlsx)</button>
          <button onClick={purge} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-red-400 text-red-700 px-5 py-2.5 text-base font-semibold"><Trash2 size={18} aria-hidden /> Purge after export</button>
          <span className="text-xs opacity-60">{(proofs ?? []).length} proofs • purge blocked until exported</span>
        </div>
        <div className="mt-3 grid sm:grid-cols-3 gap-2" aria-live="polite">
          {proofs === undefined ? (
            <div className="sm:col-span-3 glass rounded-2xl p-4"><SkeletonLines rows={3} /></div>
          ) : (
          <>
          {((proofs ?? []) as any[]).map((p: any) => (
            <div key={p._id} className="glass rounded-2xl p-2 text-sm">
              {p.url ? <img src={p.url} alt="" className="h-32 w-full object-cover rounded-xl" /> : <div className="h-32 rounded-xl bg-black/10" />}
              <p className="mt-1 font-mono text-xs">{p.trackingId}</p>
              <p className="flex items-center gap-1">₱{p.amount ?? "-"} • {p.mode ?? "-"} • {p.exportedAt ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check size={15} aria-hidden /> exported</span> : "not exported"}</p>
            </div>
          ))}
          {(proofs as any[]).length === 0 && <p className="sm:col-span-3 text-base opacity-60">No proofs for this day/branch.</p>}
          </>
          )}
        </div>
      </main>
    </div>
  );
}
