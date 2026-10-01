"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export type SheetLine = {
  productName: string;
  qtyBox: number;
  weightKg: number;
  price: number;
  /** Per-box kilo entries (tally grid column). null = empty cell. */
  box: (number | null)[];
};

export type SheetDraft = {
  osNo: string;
  invoiceNo: string;
  receiptDate: string; // yyyy-mm-dd or ""
  deliveredTo: string; // override; falls back to company/contact
  address: string;
  lines: SheetLine[];
  /** Tally grid row count (min 12 like the paper sheet). */
  rows: number;
  preparedBy: string;
  checkedBy: string;
  deliveredBy: string;
  plateNo: string;
  guardName: string;
};

type SheetItem = {
  productName: string;
  qtyBox: number;
  weightKg: number;
  price: number;
  amount: number;
  box: (number | null)[];
};

function fmt(n: number, d = 2) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}
function fmtInt(n: number) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function toISODate(ts: number | string): string {
  try {
    const d = new Date(typeof ts === "number" ? ts : `${ts}T00:00:00+08:00`);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
function shortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-");
  } catch {
    return "";
  }
}
function labelFromISO(iso: string, fallbackTs: number): string {
  if (iso) {
    const t = new Date(`${iso}T00:00:00+08:00`).getTime();
    if (!isNaN(t)) return shortDate(t);
  }
  return shortDate(fallbackTs);
}
function brandOf(name: string) {
  const parts = String(name).split("-");
  return parts.length > 1 ? parts[parts.length - 1].trim() : "";
}
function itemOf(name: string) {
  const parts = String(name).split("-");
  return parts.length > 1 ? parts.slice(0, -1).join("-").trim() : String(name).trim();
}

function normBox(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : Math.max(0, n);
}

/** Effective boxes/kilos for a line: tally column wins when it has entries, else manual values. */
export function effLine(l: { qtyBox: number; weightKg: number; price: number; box?: (number | null)[] }) {
  const entries = (l.box ?? []).filter((v) => v !== null && !isNaN(Number(v))).map((v) => Number(v));
  const qtyBox = entries.length > 0 ? entries.length : Number(l.qtyBox) || 0;
  const weightKg = entries.length > 0 ? entries.reduce((s, v) => s + v, 0) : Number(l.weightKg) || 0;
  const price = Number(l.price) || 0;
  return { qtyBox, weightKg, price, amount: weightKg * price, tallyCount: entries.length };
}

export function draftFromOrder(order: any): SheetDraft {
  const lines = ((order?.items ?? []) as any[]).map((it: any) => ({
    productName: it.productName,
    qtyBox: it.qtyBox ?? 0,
    weightKg: it.weightKg ?? 0,
    price: it.finalPrice ?? it.estPrice ?? 0,
    box: Array.isArray(it.boxWeights) ? it.boxWeights.map(normBox) : [],
  }));
  const longest = lines.reduce((m: number, l: any) => Math.max(m, l.box.length), 0);
  return {
    osNo: order?.osNo ?? "",
    invoiceNo: order?.invoiceNo ?? "",
    receiptDate: toISODate(order?.receiptDate ?? order?.createdAt ?? Date.now()),
    deliveredTo: order?.deliveredTo ?? "",
    address: order?.address ?? "",
    lines,
    rows: Math.max(12, longest),
    preparedBy: order?.preparedBy ?? "",
    checkedBy: order?.checkedBy ?? "",
    deliveredBy: order?.deliveredBy ?? "",
    plateNo: order?.plateNo ?? "",
    guardName: order?.guardName ?? "",
  };
}

export function draftTotals(d: SheetDraft) {
  const e = d.lines.map(effLine);
  const boxes = e.reduce((s, l) => s + l.qtyBox, 0);
  const kgs = e.reduce((s, l) => s + l.weightKg, 0);
  const total = e.reduce((s, l) => s + l.amount, 0);
  return { boxes, kgs, total };
}

export function orderLines(order: any): { lines: SheetItem[]; boxes: number; kgs: number; total: number; rows: number } {
  const items: any[] = order?.items ?? [];
  const lines = items.map((it: any) => {
    const price = Number(it.finalPrice ?? it.estPrice ?? 0);
    const kg = Number(it.weightKg ?? 0);
    const boxes = Number(it.qtyBox ?? 0);
    const box = Array.isArray(it.boxWeights) ? it.boxWeights.map(normBox) : [];
    return { productName: it.productName, qtyBox: boxes, weightKg: kg, price, amount: kg * price, box };
  });
  const rows = Math.max(12, lines.reduce((m, l) => Math.max(m, l.box.length), 0));
  return {
    lines,
    boxes: lines.reduce((s, l) => s + l.qtyBox, 0),
    kgs: lines.reduce((s, l) => s + l.weightKg, 0),
    total: lines.reduce((s, l) => s + l.amount, 0),
    rows,
  };
}

function derivedDeliveredTo(order: any): string {
  return String(order?.deliveredTo || order?.customerName || "").toUpperCase();
}

/** Build an .xlsx workbook with the 3 sheets and trigger a download. Works from any page. */
export async function exportSheetsXlsx(order: any) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const d = draftFromOrder(order);
  const t = draftTotals(d);
  const dateLabel = labelFromISO(d.receiptDate, order?.createdAt ?? Date.now());
  const deliveredTo = (d.deliveredTo || String(order?.customerName || "")).toUpperCase();
  const contact = String(order?.contactName || order?.customerName || "").toUpperCase();
  const branch = String(order?.branch || "").toUpperCase();
  const thin = { style: "thin" as const };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  function meta(ws: any, title: string, extra: string[][]) {
    ws.addRow([`RF FROZEN MEAT CORP — ${branch}`]);
    ws.addRow([title]);
    ws.addRow([`OS#: ${d.osNo || "-"}` , `INV#: ${d.invoiceNo || "-"}`, `DATE: ${dateLabel}`]);
    for (const r of extra) ws.addRow(r);
    ws.addRow([]);
  }
  function styleTable(ws: any, headerRow: number, rows: number, cols: number) {
    for (let r = headerRow; r < headerRow + rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const cell = ws.getRow(r).getCell(c);
        cell.border = border;
        if (r === headerRow) cell.font = { bold: true };
      }
    }
    const totalRow = ws.getRow(headerRow + rows - 1);
    totalRow.font = { bold: true };
  }

  // Sheet 1 — Picklist tally
  {
    const ws = wb.addWorksheet("Picklist Tally");
    ws.columns = [{ width: 22 }, { width: 22 }, { width: 14 }, { width: 14 }];
    meta(ws, "PICKLIST TALLY SHEET", [
      [`CUSTOMER: ${deliveredTo || "-"}`, `TRACKING: ${order?.trackingId}`],
      [`DELIVERED TO: ${deliveredTo || "-"}`, `CONTACT: ${contact} • ${order?.mobile ?? "-"}`],
      [`ADDRESS: ${d.address || "-"}`],
    ]);
    const h = ws.rowCount + 1;
    ws.addRow(["ITEM", "BRAND", "TOTAL BOX", "TOTAL KGS"]);
    d.lines.forEach((l) => {
      const e = effLine(l);
      ws.addRow([itemOf(l.productName), brandOf(l.productName), e.qtyBox, Number(e.weightKg.toFixed(2))]);
    });
    ws.addRow(["GRAND TOTAL", "", fmtInt(t.boxes), Number(t.kgs.toFixed(2))]);
    styleTable(ws, h, d.lines.length + 2, 4);
    ws.addRow([]);
    ws.addRow(["TALLY (kilos per box)"]);
    const th = ws.rowCount + 1;
    ws.addRow(["#", ...d.lines.map((l) => itemOf(l.productName) || "ITEM")]);
    const nRows = Math.max(d.rows, 12);
    for (let r = 0; r < nRows; r++) {
      ws.addRow([r + 1, ...d.lines.map((l) => {
        const v = l.box?.[r] ?? null;
        return v === null ? "" : Number(v.toFixed(2));
      })]);
    }
    styleTable(ws, th, nRows + 1, d.lines.length + 1);
    ws.addRow([]);
    ws.addRow([`Prepared By: ${d.preparedBy}`, `Checked By: ${d.checkedBy}`, `Noted By (Operations Supervisor):`]);
    ws.addRow(["THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES"]);
  }
  // Sheet 2 — Delivery receipt
  {
    const ws = wb.addWorksheet("Delivery Receipt");
    ws.columns = [{ width: 14 }, { width: 42 }, { width: 14 }, { width: 14 }, { width: 16 }];
    meta(ws, "DELIVERY RECEIPT", [
      [`DELIVERED TO: ${deliveredTo || "-"}`, `INVOICE: ${d.invoiceNo || "-"}`],
      [`ADDRESS: ${d.address || "-"}`],
    ]);
    const h = ws.rowCount + 1;
    ws.addRow(["QTY (boxes)", "DESCRIPTION", "WEIGHT (kg)", "PRICE", "AMOUNT"]);
    d.lines.forEach((l) => {
      const e = effLine(l);
      ws.addRow([e.qtyBox, l.productName, Number(e.weightKg.toFixed(2)), Number(e.price.toFixed(2)), Number(e.amount.toFixed(2))]);
    });
    ws.addRow([fmtInt(t.boxes), "TOTAL", Number(t.kgs.toFixed(2)), "", Number(t.total.toFixed(2))]);
    styleTable(ws, h, d.lines.length + 2, 5);
    for (let r = h + 1; r < h + 1 + d.lines.length + 1; r++) {
      ws.getRow(r).getCell(3).numFmt = "0.00";
      ws.getRow(r).getCell(4).numFmt = "0.00";
      ws.getRow(r).getCell(5).numFmt = "0.00";
    }
    ws.addRow([]);
    ws.addRow([`Prepared by: ${d.preparedBy}`, `Checked by: ${d.checkedBy}`, "Received the above merchandise in good order (Customer Name & Signature)"]);
    ws.addRow(["CHECKER (NAME & SIGNATURE) / SIGNED TIME", "", `SECURITY GUARD: ${d.guardName} / TIME OUT`]);
    ws.addRow(["THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES"]);
  }
  // Sheet 3 — RF deliveries
  {
    const ws = wb.addWorksheet("RF Deliveries");
    ws.columns = [{ width: 14 }, { width: 42 }, { width: 14 }, { width: 14 }, { width: 16 }];
    meta(ws, "RF DELIVERIES", [
      [`NO.: ${d.invoiceNo || "-"}`, `DELIVERED TO: ${deliveredTo || "-"}`],
      [`ADDRESS: ${d.address || "-"} • CONTACT: ${contact} • ${order?.mobile ?? "-"}`],
    ]);
    const h = ws.rowCount + 1;
    ws.addRow(["QTY (boxes)", "DESCRIPTION", "WEIGHT (kg)", "PRICE", "AMOUNT"]);
    d.lines.forEach((l) => {
      const e = effLine(l);
      ws.addRow([e.qtyBox, l.productName, Number(e.weightKg.toFixed(2)), Number(e.price.toFixed(2)), Number(e.amount.toFixed(2))]);
    });
    ws.addRow([fmtInt(t.boxes), "TOTAL", Number(t.kgs.toFixed(2)), "", Number(t.total.toFixed(2))]);
    styleTable(ws, h, d.lines.length + 2, 5);
    for (let r = h + 1; r < h + 1 + d.lines.length + 1; r++) {
      ws.getRow(r).getCell(3).numFmt = "0.00";
      ws.getRow(r).getCell(4).numFmt = "0.00";
      ws.getRow(r).getCell(5).numFmt = "0.00";
    }
    ws.addRow([]);
    ws.addRow([`Prepared by: ${d.preparedBy}`, "Received the above merchandise in good order (Customer Name & Signature)"]);
    ws.addRow([`DELIVERED BY: ${d.deliveredBy}`, `PLATE NO.: ${d.plateNo}`]);
    ws.addRow(["THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES"]);
  }

  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf as any], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  a.download = `${order?.trackingId ?? "receipt"}-sheets.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function EText({
  editable, value, onChange, placeholder, mono, center, right, bold,
}: {
  editable: boolean; value: string; onChange: (v: string) => void;
  placeholder?: string; mono?: boolean; center?: boolean; right?: boolean; bold?: boolean;
}) {
  if (!editable) return <span className={`${mono ? "font-mono" : ""} ${bold ? "b" : ""}`}>{value || "-"}</span>;
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`editcell ${mono ? "font-mono" : ""} ${center ? "c" : ""} ${right ? "r" : ""} ${bold ? "b" : ""}`}
    />
  );
}

function SheetHead({ children, qrValue }: { children: React.ReactNode; qrValue: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {qrValue ? (
        <div className="c" style={{ flexShrink: 0 }}>
          <QRCodeSVG value={qrValue} size={68} />
          <div style={{ fontSize: 8, fontWeight: 800 }}>SCAN TO TRACK</div>
        </div>
      ) : null}
    </div>
  );
}

export default function SheetReceipt({
  order, editable = false, saving = false, saveError = "", onSave, qrValue = "",
}: {
  order: any;
  editable?: boolean;
  saving?: boolean;
  saveError?: string;
  onSave?: (draft: SheetDraft) => Promise<void>;
  qrValue?: string;
}) {
  const [draft, setDraft] = useState<SheetDraft>(() => draftFromOrder(order));
  const [dirty, setDirty] = useState(false);
  const [localError, setLocalError] = useState("");

  const sig = JSON.stringify([
    order?.trackingId, order?.osNo, order?.invoiceNo, order?.receiptDate,
    order?.deliveredTo, order?.address, order?.items, order?.preparedBy,
    order?.checkedBy, order?.deliveredBy, order?.plateNo, order?.guardName,
  ]);
  useEffect(() => {
    setDraft(draftFromOrder(order));
    setDirty(false);
    setLocalError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const set = (patch: Partial<SheetDraft>) => {
    setDraft((p) => ({ ...p, ...patch }));
    setDirty(true);
  };
  const setLine = (i: number, patch: Partial<SheetLine>) => {
    setDraft((p) => ({ ...p, lines: p.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
    setDirty(true);
  };
  const setBox = (i: number, r: number, raw: string) => {
    const v = raw === "" ? null : normBox(raw);
    setDraft((p) => ({
      ...p,
      lines: p.lines.map((l, j) => {
        if (j !== i) return l;
        const box = [...l.box];
        while (box.length <= r) box.push(null);
        box[r] = v;
        return { ...l, box };
      }),
    }));
    setDirty(true);
  };
  const addLine = () => {
    setDraft((p) => ({ ...p, lines: [...p.lines, { productName: "", qtyBox: 0, weightKg: 0, price: 0, box: [] }] }));
    setDirty(true);
  };
  const removeLine = (i: number) => {
    setDraft((p) => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }));
    setDirty(true);
  };
  const addRow = () => {
    setDraft((p) => ({ ...p, rows: p.rows + 1 }));
    setDirty(true);
  };
  const removeRow = () => {
    setDraft((p) => ({ ...p, rows: Math.max(1, p.rows - 1) }));
    setDirty(true);
  };
  const resetDraft = () => {
    setDraft(draftFromOrder(order));
    setDirty(false);
    setLocalError("");
  };

  const view = editable
    ? (() => {
        const eff = draft.lines.map((l) => ({ ...l, ...effLine(l) }));
        return {
          osNo: draft.osNo, invoiceNo: draft.invoiceNo,
          dateLabel: labelFromISO(draft.receiptDate, order?.createdAt ?? Date.now()),
          deliveredTo: (draft.deliveredTo || String(order?.customerName || "")).toUpperCase(),
          contact: String(order?.contactName || order?.customerName || "").toUpperCase(),
          mobile: order?.mobile ?? "-",
          address: draft.address,
          branch: String(order?.branch || "").toUpperCase(),
          trackingId: order?.trackingId,
          lines: eff,
          boxes: eff.reduce((s, l) => s + l.qtyBox, 0),
          kgs: eff.reduce((s, l) => s + l.weightKg, 0),
          total: eff.reduce((s, l) => s + l.amount, 0),
          rows: draft.rows,
        };
      })()
    : (() => {
        const { lines, boxes, kgs, total, rows } = orderLines(order);
        return {
          osNo: order?.osNo ?? "", invoiceNo: order?.invoiceNo ?? "",
          dateLabel: labelFromISO(toISODate(order?.receiptDate ?? order?.createdAt ?? Date.now()), order?.createdAt ?? Date.now()),
          deliveredTo: derivedDeliveredTo(order),
          contact: String(order?.contactName || order?.customerName || "").toUpperCase(),
          mobile: order?.mobile ?? "-",
          address: String(order?.address || ""),
          branch: String(order?.branch || "").toUpperCase(),
          trackingId: order?.trackingId,
          lines, boxes, kgs, total, rows,
        };
      })();

  const doSave = async () => {
    setLocalError("");
    if (draft.lines.some((l) => !l.productName.trim())) {
      setLocalError("Every line needs an item name (or remove the empty line).");
      return;
    }
    if (onSave) await onSave(draft);
    setDirty(false);
  };

  const doExport = () => {
    const t = draft.receiptDate ? new Date(`${draft.receiptDate}T00:00:00+08:00`).getTime() : undefined;
    exportSheetsXlsx({
      ...order,
      osNo: draft.osNo,
      invoiceNo: draft.invoiceNo,
      receiptDate: !isNaN(t as number) ? t : order?.receiptDate,
      deliveredTo: draft.deliveredTo,
      address: draft.address,
      items: draft.lines.map((l) => ({
        productName: l.productName,
        qtyBox: l.qtyBox,
        weightKg: l.weightKg,
        estPrice: l.price,
        finalPrice: l.price,
        boxWeights: l.box,
      })),
      preparedBy: draft.preparedBy,
      checkedBy: draft.checkedBy,
      deliveredBy: draft.deliveredBy,
      plateNo: draft.plateNo,
      guardName: draft.guardName,
    });
  };

  return (
    <div id="sheets-print">
      <style>{`
        #sheets-print { color: #111; }
        #sheets-print .sheet {
          background: #fff; border: 1px solid #999; margin-bottom: 16px;
          font-size: 11px; line-height: 1.35;
        }
        #sheets-print table { border-collapse: collapse; width: 100%; }
        #sheets-print th, #sheets-print td { border: 1px solid #555; padding: 3px 5px; vertical-align: top; }
        #sheets-print .hd { background: #eee; font-weight: 800; text-align: center; }
        #sheets-print .r { text-align: right; }
        #sheets-print .c { text-align: center; }
        #sheets-print .b { font-weight: 800; }
        #sheets-print .sig { min-height: 44px; }
        #sheets-print .editcell {
          width: 100%; min-width: 0; background: #fffbe6; border: 1px dashed #a16207;
          border-radius: 4px; padding: 1px 4px; font-size: 11px; color: #111;
        }
        #sheets-print .editcell:focus { outline: 2px solid #e11d48; background: #fff; }
        #sheets-print .siginput {
          width: 100%; background: transparent; border: none; border-bottom: 1px dashed #a16207;
          font-size: 11px; color: #111; padding: 1px 2px; margin-top: 2px;
        }
        #sheets-print .siginput:focus { outline: 2px solid #e11d48; }
        #sheets-print .mini-btn {
          display: inline-flex; align-items: center; gap: 4px; border: 1px solid #999; border-radius: 8px;
          padding: 4px 10px; font-size: 12px; font-weight: 700; background: #fff; cursor: pointer; color: #111;
        }
        #sheets-print .mini-btn.primary { background: #be123c; border-color: #be123c; color: #fff; }
        #sheets-print .mini-btn:disabled { opacity: 0.6; cursor: default; }
        @media print {
          body * { visibility: hidden; }
          #sheets-print, #sheets-print * { visibility: visible; }
          #sheets-print { position: absolute; left: 0; top: 0; width: 100%; }
          #sheets-print .sheet { border: 1px solid #000; margin: 0 0 12px 0; page-break-inside: avoid; }
          #sheets-print .sheet.break { page-break-after: always; }
          #sheets-print .no-print { display: none !important; }
          #sheets-print .editcell { border: none; background: transparent; padding: 0; }
          #sheets-print .siginput { border: none; }
        }
      `}</style>

      {editable && (
        <div className="no-print mb-2 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/30" style={{ color: "#111" }}>
          <span className="font-bold">Editing receipts — click any highlighted cell, then save.</span>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={resetDraft} disabled={!dirty} className="mini-btn">Reset</button>
            <button type="button" onClick={doExport} className="mini-btn">Export xlsx</button>
            <button type="button" onClick={doSave} disabled={saving || !dirty} className="mini-btn primary">
              {saving ? "Saving…" : dirty ? "Save sheet changes" : "Saved"}
            </button>
          </span>
          {(localError || saveError) && <span className="w-full font-semibold" style={{ color: "#be123c" }}>{localError || saveError}</span>}
        </div>
      )}

      {/* SHEET 1 — PICKLIST TALLY SHEET */}
      <div className="sheet break p-3">
        <SheetHead qrValue={qrValue}>
          <div className="c b" style={{ fontSize: 14 }}>RF FROZEN MEAT CORP — {view.branch}</div>
          <div className="c b" style={{ fontSize: 13 }}>PICKLIST TALLY SHEET</div>
        </SheetHead>
        <table className="mt-2">
          <tbody>
            <tr>
              <td className="b">OS#: <EText editable={editable} value={draft.osNo} onChange={(v) => set({ osNo: v })} placeholder="RF55xxx" mono bold /></td>
              <td className="b">INV#: <EText editable={editable} value={draft.invoiceNo} onChange={(v) => set({ invoiceNo: v })} placeholder="238xxx" mono bold /></td>
              <td className="b">DATE: {editable ? (
                <input type="date" value={draft.receiptDate} onChange={(e) => set({ receiptDate: e.target.value })} className="editcell font-mono" />
              ) : view.dateLabel}</td>
            </tr>
            <tr>
              <td colSpan={2}>CUSTOMER: <b>{view.deliveredTo || "-"}</b></td>
              <td>TRACKING: <span style={{ fontFamily: "monospace" }}>{view.trackingId}</span></td>
            </tr>
            <tr>
              <td colSpan={2}>DELIVERED TO: {editable ? (
                <input type="text" value={draft.deliveredTo} onChange={(e) => set({ deliveredTo: e.target.value })} placeholder={view.deliveredTo || "Name - pickup/delivery"} className="editcell b" />
              ) : <b>{view.deliveredTo || "-"}</b>}</td>
              <td>CONTACT: {view.contact} • {view.mobile}</td>
            </tr>
            <tr>
              <td colSpan={3}>ADDRESS: <EText editable={editable} value={draft.address} onChange={(v) => set({ address: v })} placeholder="Address" /></td>
            </tr>
          </tbody>
        </table>

        <p className="b mt-2">TALLY SHEET (CATHWEIGHT BREAKDOWN — type kilos per box below; totals compute automatically)</p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th className="hd">#</th>
                {view.lines.map((l, i) => (
                  <th key={i} className="hd">{editable ? (
                    <input type="text" value={draft.lines[i]?.productName ?? ""} onChange={(e) => setLine(i, { productName: e.target.value })} className="editcell c b" placeholder={`ITEM ${i + 1}`} />
                  ) : (itemOf(l.productName) || `ITEM ${i + 1}`)}</th>
                ))}
              </tr>
              <tr>
                <th className="hd">BRAND</th>
                {view.lines.map((l, i) => (
                  <th key={i} className="hd">{brandOf(l.productName) || "-"}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="b c">TOTAL BOX</td>
                {view.lines.map((l, i) => (
                  <td key={i} className="c b">{fmtInt(l.qtyBox)}</td>
                ))}
              </tr>
              <tr>
                <td className="b c">TOTAL KGS</td>
                {view.lines.map((l, i) => (
                  <td key={i} className="c b">{fmt(l.weightKg)}</td>
                ))}
              </tr>
              {Array.from({ length: view.rows }).map((_, r) => (
                <tr key={r}>
                  <td className="c">{r + 1}</td>
                  {view.lines.map((l, i) => {
                    const v = editable
                      ? draft.lines[i]?.box?.[r] ?? null
                      : (l as any).box?.[r] ?? null;
                    return (
                      <td key={i} className="c">{editable ? (
                        <input
                          type="number" min={0} step="0.01"
                          value={v === null ? "" : v}
                          placeholder="—"
                          onChange={(e) => setBox(i, r, e.target.value)}
                          className="editcell c font-mono"
                          aria-label={`Box ${r + 1} kilos for ${draft.lines[i]?.productName || `item ${i + 1}`}`}
                        />
                      ) : v === null ? <>&nbsp;</> : fmt(v)}</td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="b c">GRAND TOTAL KGS</td>
                <td className="c b" colSpan={Math.max(view.lines.length, 1)}>{fmt(view.kgs)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {editable && (
          <div className="no-print mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={addRow} className="mini-btn">+ Add tally row</button>
            {draft.rows > 1 && (
              <button type="button" onClick={removeRow} className="mini-btn">− Remove last row</button>
            )}
            <span className="mx-1 text-slate-400">|</span>
            <button type="button" onClick={addLine} className="mini-btn">+ Add line</button>
            {draft.lines.length > 0 && (
              <button type="button" onClick={() => removeLine(draft.lines.length - 1)} className="mini-btn">− Remove last line</button>
            )}
          </div>
        )}

        <table className="mt-2">
          <tbody>
            <tr>
              <td>Prepared By:{editable ? (
                <input type="text" value={draft.preparedBy} onChange={(e) => set({ preparedBy: e.target.value })} className="siginput" placeholder="Name" />
              ) : <div className="sig">{order?.preparedBy || ""}</div>}</td>
              <td>Checked By:{editable ? (
                <input type="text" value={draft.checkedBy} onChange={(e) => set({ checkedBy: e.target.value })} className="siginput" placeholder="Name" />
              ) : <div className="sig">{order?.checkedBy || ""}</div>}(SIGNATURE OVER PRINTED NAME)</td>
              <td>Noted By (Operations Supervisor):<div className="sig" /></td>
            </tr>
          </tbody>
        </table>
        <p className="c mt-1" style={{ fontSize: 10 }}>THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES</p>
      </div>

      {/* SHEET 2 — DELIVERY RECEIPT */}
      <div className="sheet break p-3">
        <SheetHead qrValue={qrValue}>
          <div className="c b" style={{ fontSize: 14 }}>DELIVERY RECEIPT</div>
          <div className="c">RF FROZEN MEAT CORP — {view.branch}</div>
        </SheetHead>
        <table className="mt-2">
          <tbody>
            <tr>
              <td className="b">OS#: {editable ? <EText editable value={draft.osNo} onChange={(v) => set({ osNo: v })} placeholder="RF55xxx" mono bold /> : view.osNo || "-"}</td>
              <td className="b">INV#: {editable ? <EText editable value={draft.invoiceNo} onChange={(v) => set({ invoiceNo: v })} placeholder="238xxx" mono bold /> : view.invoiceNo || "-"}</td>
              <td className="b">DATE: {view.dateLabel}</td>
            </tr>
            <tr>
              <td colSpan={2}>DELIVERED TO: <b>{view.deliveredTo || "-"}</b></td>
              <td>INVOICE: {editable ? <EText editable value={draft.invoiceNo} onChange={(v) => set({ invoiceNo: v })} mono /> : view.invoiceNo || "-"}</td>
            </tr>
            <tr>
              <td colSpan={3}>ADDRESS: {editable ? <EText editable value={draft.address} onChange={(v) => set({ address: v })} /> : view.address || "-"}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-2">
          <thead>
            <tr>
              <th className="hd">QTY (boxes)</th>
              <th className="hd">DESCRIPTION</th>
              <th className="hd">WEIGHT (kg)</th>
              <th className="hd">PRICE</th>
              <th className="hd">AMOUNT</th>
              {editable && <th className="hd no-print">✕</th>}
            </tr>
          </thead>
          <tbody>
            {view.lines.map((l, i) => (
              <tr key={i}>
                <td className="c">{fmtInt(l.qtyBox)}</td>
                <td>{editable ? (
                  <input type="text" value={draft.lines[i]?.productName ?? ""} onChange={(e) => setLine(i, { productName: e.target.value })} className="editcell" placeholder="Item - brand" />
                ) : l.productName}</td>
                <td className="r">{fmt(l.weightKg)}</td>
                <td className="r">{editable ? (
                  <input type="number" min={0} step="0.01" value={draft.lines[i]?.price ?? 0} onChange={(e) => setLine(i, { price: Number(e.target.value) })} className="editcell r font-mono" />
                ) : fmt(l.price)}</td>
                <td className="r">{fmt(l.amount)}</td>
                {editable && (
                  <td className="c no-print"><button type="button" onClick={() => removeLine(i)} className="mini-btn">✕</button></td>
                )}
              </tr>
            ))}
            <tr>
              <td className="c b">{fmtInt(view.boxes)}</td>
              <td className="r b">TOTAL</td>
              <td className="r b">{fmt(view.kgs)}</td>
              <td />
              <td className="r b">₱{fmt(view.total)}</td>
              {editable && <td className="no-print" />}
            </tr>
          </tbody>
        </table>
        {editable && (
          <div className="no-print mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={addLine} className="mini-btn">+ Add line</button>
            <span style={{ fontSize: 11 }}>Boxes & kilos come from the tally grid above — type per-box kilos there.</span>
          </div>
        )}

        <table className="mt-2">
          <tbody>
            <tr>
              <td>Prepared by:{editable ? (
                <input type="text" value={draft.preparedBy} onChange={(e) => set({ preparedBy: e.target.value })} className="siginput" placeholder="Name" />
              ) : <div className="sig">{order?.preparedBy || ""}</div>}</td>
              <td>Checked by:{editable ? (
                <input type="text" value={draft.checkedBy} onChange={(e) => set({ checkedBy: e.target.value })} className="siginput" placeholder="Name" />
              ) : <div className="sig">{order?.checkedBy || ""}</div>}</td>
              <td>Received the above merchandise in good order:{editable ? (
                <input type="text" value={draft.deliveredBy} onChange={(e) => set({ deliveredBy: e.target.value })} className="siginput" placeholder="Received by" />
              ) : <div className="sig">{order?.deliveredBy || ""}</div>}(Customer Name & Signature)</td>
            </tr>
            <tr>
              <td colSpan={2}>CHECKER (NAME & SIGNATURE):{editable ? (
                <input type="text" value={draft.checkedBy} onChange={(e) => set({ checkedBy: e.target.value })} className="siginput" placeholder="Checker" />
              ) : <div className="sig">{order?.checkedBy || ""}</div>}SIGNED TIME: _______</td>
              <td>SECURITY GUARD (NAME & SIGNATURE):{editable ? (
                <input type="text" value={draft.guardName} onChange={(e) => set({ guardName: e.target.value })} className="siginput" placeholder="Guard" />
              ) : <div className="sig">{order?.guardName || ""}</div>}TIME OUT: _______</td>
            </tr>
          </tbody>
        </table>
        <p className="c mt-1" style={{ fontSize: 10 }}>THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES</p>
      </div>

      {/* SHEET 3 — RF DELIVERIES */}
      <div className="sheet p-3">
        <SheetHead qrValue={qrValue}>
          <div className="c b" style={{ fontSize: 14 }}>RF DELIVERIES</div>
          <div className="c">RF FROZEN MEAT CORP — {view.branch} • {view.dateLabel}</div>
        </SheetHead>
        <table className="mt-2">
          <tbody>
            <tr>
              <td className="b">OS#: {editable ? <EText editable value={draft.osNo} onChange={(v) => set({ osNo: v })} mono bold /> : view.osNo || "-"}</td>
              <td className="b">NO.: {editable ? <EText editable value={draft.invoiceNo} onChange={(v) => set({ invoiceNo: v })} mono bold /> : view.invoiceNo || "-"}</td>
              <td className="b">DELIVERED TO: {view.deliveredTo || "-"}</td>
            </tr>
            <tr>
              <td colSpan={3}>ADDRESS: {editable ? <EText editable value={draft.address} onChange={(v) => set({ address: v })} /> : view.address || "-"} • CONTACT: {view.contact} • {view.mobile}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-2">
          <thead>
            <tr>
              <th className="hd">QTY (boxes)</th>
              <th className="hd">DESCRIPTION</th>
              <th className="hd">WEIGHT (kg)</th>
              <th className="hd">PRICE</th>
              <th className="hd">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {view.lines.map((l, i) => (
              <tr key={i}>
                <td className="c">{fmtInt(l.qtyBox)}</td>
                <td>{l.productName}</td>
                <td className="r">{fmt(l.weightKg)}</td>
                <td className="r">{fmt(l.price)}</td>
                <td className="r">{fmt(l.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="c b">{fmtInt(view.boxes)}</td>
              <td className="r b">TOTAL</td>
              <td className="r b">{fmt(view.kgs)}</td>
              <td />
              <td className="r b">₱{fmt(view.total)}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-2">
          <tbody>
            <tr>
              <td>Prepared by:{editable ? (
                <input type="text" value={draft.preparedBy} onChange={(e) => set({ preparedBy: e.target.value })} className="siginput" placeholder="Name" />
              ) : <div className="sig">{order?.preparedBy || ""}</div>}</td>
              <td>Received the above merchandise in good order:{editable ? (
                <input type="text" value={draft.deliveredBy} onChange={(e) => set({ deliveredBy: e.target.value })} className="siginput" placeholder="Received by" />
              ) : <div className="sig">{order?.deliveredBy || ""}</div>}(Customer Name & Signature)</td>
            </tr>
            <tr>
              <td>DELIVERED BY:{editable ? (
                <input type="text" value={draft.deliveredBy} onChange={(e) => set({ deliveredBy: e.target.value })} className="siginput" placeholder="Driver" />
              ) : <div className="sig">{order?.deliveredBy || ""}</div>}</td>
              <td>PLATE NO.:{editable ? (
                <input type="text" value={draft.plateNo} onChange={(e) => set({ plateNo: e.target.value })} className="siginput" placeholder="Plate no." />
              ) : <div className="sig">{order?.plateNo || ""}</div>}</td>
            </tr>
          </tbody>
        </table>
        <p className="c mt-1" style={{ fontSize: 10 }}>THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES</p>
      </div>
    </div>
  );
}
