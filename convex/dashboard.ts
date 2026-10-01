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
    const revenue = today.reduce((s, o) => s + (o.finalTotal ?? 0), 0);
    const estimate = today.reduce((s, o) => s + o.estimateTotal, 0);
    const byBranch: Record<string, { orders: number; revenue: number }> = {};
    for (const o of today) {
      if (!byBranch[o.branch]) byBranch[o.branch] = { orders: 0, revenue: 0 };
      byBranch[o.branch].orders += 1;
      byBranch[o.branch].revenue += o.finalTotal ?? 0;
    }
    const prices = await ctx.db.query("prices").collect();
    const proofs = (await ctx.db.query("proofs").collect()).filter((p) => scope(p.branch) && p.uploadedAt >= start && p.uploadedAt < end);
    return { date, totalToday: today.length, pending: (byStatus["placed"] ?? 0) + (byStatus["confirmed"] ?? 0), awaitingPayment: (byStatus["to_pay"] ?? 0) + (byStatus["proof_uploaded"] ?? 0), revenue, estimate, byStatus, byBranch, priceCount: prices.length, proofsToday: proofs.length, unexportedProofs: proofs.filter((p) => !p.exportedAt).length };
  },
});
