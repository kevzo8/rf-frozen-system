import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("prices").collect();
    return rows.sort((a, b) => a.productName.localeCompare(b.productName));
  },
});

async function requireStaff(ctx: any, token: string) {
  const s = await ctx.db.query("sessions").withIndex("by_token", (q: any) => q.eq("token", token)).unique();
  if (!s || s.expiresAt < Date.now()) throw new Error("Not logged in");
  return await ctx.db.get(s.userId);
}

export const upsert = mutation({
  args: { token: v.string(), productName: v.string(), price: v.number(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const existing = await ctx.db.query("prices").withIndex("by_product", (q) => q.eq("productName", args.productName)).unique();
    if (existing) await ctx.db.patch(existing._id, { price: args.price, notes: args.notes, updatedAt: Date.now(), updatedBy: u.username, source: "manual" });
    else await ctx.db.insert("prices", { productName: args.productName, price: args.price, notes: args.notes, updatedAt: Date.now(), updatedBy: u.username, source: "manual" });
    const prod = await ctx.db.query("products").withIndex("by_name", (q) => q.eq("name", args.productName)).unique();
    if (!prod) await ctx.db.insert("products", { name: args.productName, active: true });
    return true;
  },
});

export const bulkImport = mutation({
  // xlsx format: col A = name, col B = price, col C = notes (optional, e.g. "parating pa lang mamaya")
  args: { token: v.string(), rows: v.array(v.object({ productName: v.string(), price: v.number(), notes: v.optional(v.string()) })) },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    for (const r of args.rows) {
      const existing = await ctx.db.query("prices").withIndex("by_product", (q) => q.eq("productName", r.productName)).unique();
      if (existing) await ctx.db.patch(existing._id, { price: r.price, notes: r.notes, updatedAt: Date.now(), updatedBy: u.username, source: "xlsx" });
      else await ctx.db.insert("prices", { productName: r.productName, price: r.price, notes: r.notes, updatedAt: Date.now(), updatedBy: u.username, source: "xlsx" });
      const prod = await ctx.db.query("products").withIndex("by_name", (q) => q.eq("name", r.productName)).unique();
      if (!prod) await ctx.db.insert("products", { name: r.productName, active: true });
    }
    return args.rows.length;
  },
});
