import { query } from "./_generated/server";
import { v } from "convex/values";

async function requireStaff(ctx: any, token: string) {
  const s = await ctx.db.query("sessions").withIndex("by_token", (q: any) => q.eq("token", token)).unique();
  if (!s || s.expiresAt < Date.now()) throw new Error("Not logged in");
  const u = await ctx.db.get(s.userId);
  if (!u || !u.active) throw new Error("Not logged in");
  return u;
}

function dayRange(date: string) {
  const start = new Date(date + "T00:00:00+08:00").getTime();
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

// Cash report rows: money actually RECEIVED — paid statuses only
// (payment_verified and beyond). Unpaid (placed/confirmed/to_pay/proof_uploaded)
// belongs in the Credit report, never in cash totals.
export const cash = query({
  args: { token: v.string(), branch: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const { start, end } = dayRange(args.date);
    const all = await ctx.db.query("orders").collect();
    const rows = all.filter((o) =>
      (u.branch !== "all" ? o.branch === u.branch : args.branch === "all" ? true : o.branch === args.branch) &&
      o.createdAt >= start && o.createdAt < end &&
      ["payment_verified", "picking", "checking", "dispatched", "delivered"].includes(o.status)
    );
    let bill = 0, cash = 0, gcash = 0, bank = 0;
    const lines = rows.map((o) => {
      const amt = o.finalTotal ?? o.estimateTotal;
      bill += amt;
      const m = (o.paymentMode ?? "").toUpperCase();
      if (m === "CASH") cash += amt;
      else if (m === "GCASH" || m === "MAYA") gcash += amt;
      else if (m) bank += amt;
      return { or: o.invoiceNo ?? o.osNo ?? o.trackingId, name: o.customerName, bill: amt, cash: m === "CASH" ? amt : "", gcash: m === "GCASH" || m === "MAYA" ? amt : "", bank: m && m !== "CASH" && m !== "GCASH" && m !== "MAYA" ? amt : "", mode: o.paymentMode ?? "", tracking: o.trackingId, status: o.status };
    });
    return { lines, totals: { bill, cash, gcash, bank } };
  },
});

// Sales report rows: mirrors SALES-REPORT xlsx
export const sales = query({
  args: { token: v.string(), branch: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const { start, end } = dayRange(args.date);
    const all = await ctx.db.query("orders").collect();
    const rows = all.filter((o) =>
      (u.branch !== "all" ? o.branch === u.branch : args.branch === "all" ? true : o.branch === args.branch) &&
      o.createdAt >= start && o.createdAt < end
    );
    let bill = 0, cash = 0, gcash = 0, bank = 0;
    const lines = rows.map((o) => {
      const amt = o.finalTotal ?? o.estimateTotal;
      bill += amt;
      const m = (o.paymentMode ?? "").toUpperCase();
      if (m === "CASH") cash += amt; else if (m === "GCASH" || m === "MAYA") gcash += amt; else if (m) bank += amt;
      return { date: new Date(o.createdAt).toISOString().slice(0, 10), si: o.invoiceNo ?? "", name: o.customerName, bill: amt, cash: m === "CASH" ? amt : "", gcash: m === "GCASH" || m === "MAYA" ? amt : "", bank: m && m !== "CASH" && m !== "GCASH" && m !== "MAYA" ? amt : "", balance: o.status === "to_pay" || o.status === "placed" ? amt : "", remarks: `${o.paymentMode ?? ""} ${o.trackingId}` };
    });
    return { lines, totals: { bill, cash, gcash, bank } };
  },
});

// Credit report: unpaid / to_pay grouped like CREDIT sheets
export const credit = query({
  args: { token: v.string(), branch: v.string() },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const all = await ctx.db.query("orders").collect();
    const rows = all.filter((o) =>
      (u.branch !== "all" ? o.branch === u.branch : args.branch === "all" ? true : o.branch === args.branch) &&
      ["placed", "confirmed", "to_pay", "proof_uploaded"].includes(o.status)
    );
    const byCustomer = new Map<string, typeof rows>();
    for (const o of rows) {
      // normalized dedupe key: collapsed-lowercase (old rows lack customerKey)
      const k = o.customerKey ?? o.customerName.trim().replace(/\s+/g, " ").toLowerCase();
      if (!byCustomer.has(k)) byCustomer.set(k, []);
      byCustomer.get(k)!.push(o);
    }
    return [...byCustomer.entries()].map(([, list]) => ({
      customer: list[0].customerName.trim().replace(/\s+/g, " ").toUpperCase(),
      lines: list.map((o) => ({ date: new Date(o.createdAt).toISOString().slice(0, 10), or: o.invoiceNo ?? o.trackingId, bill: o.finalTotal ?? o.estimateTotal, payment: o.status, balance: o.finalTotal ?? o.estimateTotal })),
      total: list.reduce((s, o) => s + (o.finalTotal ?? o.estimateTotal), 0),
    }));
  },
});

// Receipt data: mirrors DELIVERY RECEIPT tallies
export const receipts = query({
  args: { token: v.string(), branch: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const { start, end } = dayRange(args.date);
    const all = await ctx.db.query("orders").collect();
    return all
      .filter((o) => (u.branch !== "all" ? o.branch === u.branch : args.branch === "all" ? true : o.branch === args.branch) && o.createdAt >= start && o.createdAt < end)
      .map((o) => ({ trackingId: o.trackingId, os: o.osNo ?? "", inv: o.invoiceNo ?? "", customer: o.customerName, address: o.address ?? "", items: o.items, total: o.finalTotal ?? o.estimateTotal, status: o.status }));
  },
});
