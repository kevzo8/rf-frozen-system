import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function todayManila(): string {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}
function mmddyy(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${m}${d}${y.slice(2)}`;
}

export const placeOrder = mutation({
  args: {
    branch: v.string(), customerName: v.string(), mobile: v.optional(v.string()),
    address: v.optional(v.string()), items: v.array(v.object({ productName: v.string(), qtyBox: v.number() })),
  },
  handler: async (ctx, args) => {
    const branch = args.branch.trim().toLowerCase();
    if (!args.customerName.trim()) throw new Error("Name required");
    if (args.items.length === 0) throw new Error("Add at least 1 item");
    const date = todayManila();
    let counter = await ctx.db.query("counters").withIndex("by_branch_date", (q) => q.eq("branch", branch).eq("date", date)).unique();
    let seq = 1;
    if (!counter) await ctx.db.insert("counters", { branch, date, seq: 1 });
    else { seq = counter.seq + 1; await ctx.db.patch(counter._id, { seq }); }
    const trackingId = `${branch}-${mmddyy(date)}-${String(seq).padStart(6, "0")}`;
    let estimateTotal = 0;
    const priced = [];
    for (const it of args.items) {
      const p = await ctx.db.query("prices").withIndex("by_product", (q) => q.eq("productName", it.productName)).unique();
      const est = (p?.price ?? 0) * it.qtyBox;
      estimateTotal += est;
      priced.push({ productName: it.productName, qtyBox: it.qtyBox, estPrice: p?.price ?? 0 });
    }
    await ctx.db.insert("orders", {
      trackingId, branch, customerName: args.customerName.trim(), mobile: args.mobile, address: args.address,
      status: "placed", items: priced, estimateTotal, createdAt: Date.now(),
    });
    return { trackingId, estimateTotal };
  },
});

export const getByTracking = query({
  args: { trackingId: v.string() },
  handler: async (ctx, args) => {
    const tid = args.trackingId.trim().toLowerCase();
    const o = await ctx.db.query("orders").withIndex("by_tracking", (q) => q.eq("trackingId", tid)).unique();
    if (!o) return null;
    const proofs = await ctx.db.query("proofs").withIndex("by_tracking", (q) => q.eq("trackingId", tid)).collect();
    return { ...o, proofs: proofs.map((p) => ({ fileId: p.fileId, fileName: p.fileName, uploadedAt: p.uploadedAt })) };
  },
});

async function requireStaff(ctx: any, token: string) {
  const s = await ctx.db.query("sessions").withIndex("by_token", (q: any) => q.eq("token", token)).unique();
  if (!s || s.expiresAt < Date.now()) throw new Error("Not logged in");
  const u = await ctx.db.get(s.userId);
  if (!u || !u.active) throw new Error("Not logged in");
  return u;
}

export const listOrders = query({
  args: { token: v.string(), branch: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const all = await ctx.db.query("orders").collect();
    return all
      .filter((o) => (u.branch !== "all" ? o.branch === u.branch : true))
      .filter((o) => (args.branch && args.branch !== "all" ? o.branch === args.branch : true))
      .filter((o) => (args.status && args.status !== "all" ? o.status === args.status : true))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
  },
});

export const setFinal = mutation({
  args: { token: v.string(), trackingId: v.string(), finalTotal: v.number(), paymentMode: v.string(), osNo: v.optional(v.string()), invoiceNo: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    if (u.role !== "admin" && u.role !== "biller") throw new Error("Biller only");
    const o = await ctx.db.query("orders").withIndex("by_tracking", (q) => q.eq("trackingId", args.trackingId.trim().toLowerCase())).unique();
    if (!o) throw new Error("Not found");
    if (u.branch !== "all" && o.branch !== u.branch) throw new Error("Wrong branch");
    await ctx.db.patch(o._id, { finalTotal: args.finalTotal, paymentMode: args.paymentMode, osNo: args.osNo, invoiceNo: args.invoiceNo, status: "to_pay" });
    return true;
  },
});

export const setStatus = mutation({
  args: { token: v.string(), trackingId: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const o = await ctx.db.query("orders").withIndex("by_tracking", (q) => q.eq("trackingId", args.trackingId.trim().toLowerCase())).unique();
    if (!o) throw new Error("Not found");
    if (u.branch !== "all" && o.branch !== u.branch) throw new Error("Wrong branch");
    await ctx.db.patch(o._id, { status: args.status as any });
    return true;
  },
});

export const linkProof = mutation({
  args: { trackingId: v.string(), fileId: v.id("_storage"), fileName: v.string(), mode: v.optional(v.string()), amount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tid = args.trackingId.trim().toLowerCase();
    const o = await ctx.db.query("orders").withIndex("by_tracking", (q) => q.eq("trackingId", tid)).unique();
    if (!o) throw new Error("Order not found");
    await ctx.db.insert("proofs", { trackingId: tid, branch: o.branch, fileId: args.fileId, fileName: args.fileName, mode: args.mode, amount: args.amount ?? o.finalTotal ?? o.estimateTotal, uploadedAt: Date.now() });
    if (o.status === "to_pay") await ctx.db.patch(o._id, { status: "proof_uploaded" });
    return true;
  },
});
