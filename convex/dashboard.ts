import { query } from "./_generated/server";
import { v } from "convex/values";

async function requireStaff(ctx: any, token: string) {
  const s = await ctx.db.query("sessions").withIndex("by_token", (q: any) => q.eq("token", token)).unique();
  if (!s || s.expiresAt < Date.now()) throw new Error("Not logged in");
  const u = await ctx.db.get(s.userId);
  if (!u || !u.active) throw new Error("Not logged in");
  return u;
}

export const summary = query({
  args: { token: v.string(), branch: v.optional(v.string()), date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const date = args.date ?? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const start = new Date(date + "T00:00:00+08:00").getTime();
    const end = start + 24 * 60 * 60 * 1000;
    const scope = (b: string) => (u.branch !== "all" ? b === u.branch : !args.branch || args.branch === "all" ? true : b === args.branch);
    const orders = (await ctx.db.query("orders").collect()).filter((o) => scope(o.branch));
    const today = orders.filter((o) => o.createdAt >= start && o.createdAt < end);
    const byStatus: Record<string, number> = {};
    for (const o of today) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    // Paid = money in hand: payment verified and beyond (picking/checking/dispatched/delivered)
    const PAID = ["payment_verified", "picking", "checking", "dispatched", "delivered"];
    // Receivable/credit = ordered but not yet verified paid
    const OWED = ["placed", "confirmed", "to_pay", "proof_uploaded"];
    const paidOrders = today.filter((o) => PAID.includes(o.status));
    const owedOrders = today.filter((o) => OWED.includes(o.status));
    const revenue = paidOrders.reduce((s, o) => s + (o.finalTotal ?? 0), 0);
    const receivable = owedOrders.reduce((s, o) => s + (o.finalTotal ?? o.estimateTotal), 0);
    const estimate = today.reduce((s, o) => s + o.estimateTotal, 0);
    const byBranch: Record<string, { orders: number; revenue: number; receivable: number }> = {};
    for (const o of today) {
      if (!byBranch[o.branch]) byBranch[o.branch] = { orders: 0, revenue: 0, receivable: 0 };
      byBranch[o.branch].orders += 1;
      if (PAID.includes(o.status)) byBranch[o.branch].revenue += o.finalTotal ?? 0;
      else if (OWED.includes(o.status)) byBranch[o.branch].receivable += o.finalTotal ?? o.estimateTotal;
    }
    const prices = await ctx.db.query("prices").collect();
    const proofs = (await ctx.db.query("proofs").collect()).filter((p) => scope(p.branch) && p.uploadedAt >= start && p.uploadedAt < end);
    return { date, totalToday: today.length, pending: (byStatus["placed"] ?? 0) + (byStatus["confirmed"] ?? 0), awaitingPayment: (byStatus["to_pay"] ?? 0) + (byStatus["proof_uploaded"] ?? 0), revenue, receivable, paidCount: paidOrders.length, owedCount: owedOrders.length, estimate, byStatus, byBranch, priceCount: prices.length, proofsToday: proofs.length, unexportedProofs: proofs.filter((p) => !p.exportedAt).length };
  },
});

// Trends for dashboard charts: daily paid-vs-receivable series, payment-mode
// split, top items, and growth vs the previous equal-length window.
export const trends = query({
  args: { token: v.string(), branch: v.optional(v.string()), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const days = Math.min(60, Math.max(7, args.days ?? 14));
    const DAY = 24 * 60 * 60 * 1000;
    const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const todayStart = new Date(todayStr + "T00:00:00+08:00").getTime();
    const scope = (b: string) => (u.branch !== "all" ? b === u.branch : !args.branch || args.branch === "all" ? true : b === args.branch);
    const PAID = ["payment_verified", "picking", "checking", "dispatched", "delivered"];
    const OWED = ["placed", "confirmed", "to_pay", "proof_uploaded"];
    const orders = (await ctx.db.query("orders").collect()).filter((o) => scope(o.branch));
    const label = (s: number) => new Date(s + 8 * 60 * 60 * 1000).toISOString().slice(5, 10);

    const winStart = todayStart - (days - 1) * DAY;
    const prevStart = winStart - days * DAY;
    const daily = [];
    for (let i = 0; i < days; i++) {
      const s = winStart + i * DAY;
      const e = s + DAY;
      const inDay = orders.filter((o) => o.createdAt >= s && o.createdAt < e);
      const revenue = inDay.filter((o) => PAID.includes(o.status)).reduce((t, o) => t + (o.finalTotal ?? 0), 0);
      const receivable = inDay.filter((o) => OWED.includes(o.status)).reduce((t, o) => t + (o.finalTotal ?? o.estimateTotal), 0);
      daily.push({ date: label(s), revenue: Math.round(revenue * 100) / 100, receivable: Math.round(receivable * 100) / 100, orders: inDay.length });
    }
    const revenue = daily.reduce((s, d) => s + d.revenue, 0);
    const receivable = daily.reduce((s, d) => s + d.receivable, 0);
    const orderCount = daily.reduce((s, d) => s + d.orders, 0);
    const prevRevenue = orders
      .filter((o) => o.createdAt >= prevStart && o.createdAt < winStart && PAID.includes(o.status))
      .reduce((s, o) => s + (o.finalTotal ?? 0), 0);
    const growthPct = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : null;

    // Payment-mode split of paid revenue in the window.
    const inWin = orders.filter((o) => o.createdAt >= winStart && o.createdAt < todayStart + DAY && PAID.includes(o.status));
    const byMode = { cash: 0, gcash: 0, bank: 0, unset: 0 };
    for (const o of inWin) {
      const amt = o.finalTotal ?? 0;
      const m = (o.paymentMode ?? "").toUpperCase();
      if (m === "CASH") byMode.cash += amt;
      else if (m === "GCASH" || m === "MAYA") byMode.gcash += amt;
      else if (m) byMode.bank += amt;
      else byMode.unset += amt;
    }

    // Top items by revenue in the window (amount = kilos × price, boxes fallback).
    const itemMap = new Map<string, { revenue: number; kilos: number; boxes: number }>();
    for (const o of orders.filter((o) => o.createdAt >= winStart && o.createdAt < todayStart + DAY)) {
      for (const it of o.items as any[]) {
        const price = Number(it.finalPrice ?? it.estPrice ?? 0);
        const kg = Number(it.weightKg ?? 0);
        const boxes = Number(it.qtyBox ?? 0);
        const qty = kg > 0 ? kg : boxes;
        const cur = itemMap.get(it.productName) ?? { revenue: 0, kilos: 0, boxes: 0 };
        cur.revenue += qty * price;
        cur.kilos += kg;
        cur.boxes += boxes;
        itemMap.set(it.productName, cur);
      }
    }
    const topItems = [...itemMap.entries()]
      .map(([name, v]) => ({ name, revenue: Math.round(v.revenue * 100) / 100, kilos: Math.round(v.kilos * 100) / 100, boxes: v.boxes }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { days, daily, totals: { revenue, receivable, orders: orderCount, prevRevenue, growthPct }, byMode, topItems };
  },
});
