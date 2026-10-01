import { mutation } from "./_generated/server";
import { v } from "convex/values";
export const load = mutation({
  args: { rows: v.array(v.object({ productName: v.string(), price: v.number() })) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("prices").take(1);
    if (existing.length > 0) throw new Error("Prices already seeded - use admin import");
    for (const r of args.rows) {
      await ctx.db.insert("prices", { productName: r.productName, price: r.price, updatedAt: Date.now(), updatedBy: "seed-9/29", source: "xlsx" });
      await ctx.db.insert("products", { name: r.productName, active: true });
    }
    return args.rows.length;
  },
});
