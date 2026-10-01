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
