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
    contactName: v.optional(v.string()), companyName: v.optional(v.string()),
    fulfillment: v.optional(v.union(v.literal("pickup"), v.literal("delivery"))),
  },
  handler: async (ctx, args) => {
    const branch = args.branch.trim().toLowerCase();
    const contact = (args.contactName ?? args.customerName).trim().replace(/\s+/g, " ");
    const company = (args.companyName ?? "").trim().replace(/\s+/g, " ");
    // Receipt name: contact person full name, always ALL CAPS (company shown separately)
    const display = contact.toUpperCase() || args.customerName.trim().replace(/\s+/g, " ").toUpperCase();
    const key = display.toLowerCase();
    if (!contact) throw new Error("Contact person required");
    const mobile = (args.mobile ?? "").trim();
    if (!mobile) throw new Error("Mobile number required");
    const fulfillment = args.fulfillment ?? "delivery";
    const address = (args.address ?? "").trim();
    if (fulfillment === "delivery" && !address) throw new Error("Delivery address required");
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
      trackingId, branch, customerName: display, customerKey: key,
      contactName: contact.toUpperCase(), companyName: company ? company.toUpperCase() : undefined,
      fulfillment, mobile, address: fulfillment === "delivery" ? address : `PICKUP - ${branch.toUpperCase()} BRANCH`,
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
    const withUrl = await Promise.all(proofs.map(async (p) => ({ id: p._id, fileId: p.fileId, fileName: p.fileName, uploadedAt: p.uploadedAt, url: await ctx.storage.getUrl(p.fileId) })));
    withUrl.sort((a, b) => b.uploadedAt - a.uploadedAt);
    return { ...o, proofs: withUrl };
  },
});

export const deleteProof = mutation({
  args: { trackingId: v.string(), proofId: v.id("proofs") },
  handler: async (ctx, args) => {
    const tid = args.trackingId.trim().toLowerCase();
    const p = await ctx.db.get(args.proofId);
    if (!p || p.trackingId !== tid) throw new Error("Proof not found");
    const o = await ctx.db.query("orders").withIndex("by_tracking", (q) => q.eq("trackingId", tid)).unique();
    await ctx.storage.delete(p.fileId);
    await ctx.db.delete(p._id);
    if (o && o.status === "proof_uploaded") await ctx.db.patch(o._id, { status: "to_pay" });
    return true;
  },
});

export const getById = query({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const o = await ctx.db.query("orders").withIndex("by_tracking", (q) => q.eq("trackingId", args.id.trim().toLowerCase())).unique();
    if (!o) return null;
    if (u.branch !== "all" && o.branch !== u.branch) throw new Error("Wrong branch");
    const proofs = await ctx.db.query("proofs").withIndex("by_tracking", (q) => q.eq("trackingId", o.trackingId)).collect();
    const withUrl = await Promise.all(proofs.map(async (p) => ({ id: p._id, fileId: p.fileId, fileName: p.fileName, uploadedAt: p.uploadedAt, url: await ctx.storage.getUrl(p.fileId) })));
    withUrl.sort((a, b) => b.uploadedAt - a.uploadedAt);
    return { ...o, proofs: withUrl };
  },
});

export const updateOrder = mutation({
  args: {
    token: v.string(),
    trackingId: v.string(),
    customerName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    companyName: v.optional(v.string()),
    mobile: v.optional(v.string()),
    branch: v.optional(v.string()),
    fulfillment: v.optional(v.union(v.literal("pickup"), v.literal("delivery"))),
    address: v.optional(v.string()),
    osNo: v.optional(v.string()),
    invoiceNo: v.optional(v.string()),
    finalTotal: v.optional(v.number()),
    paymentMode: v.optional(v.string()),
    receiptDate: v.optional(v.number()),
    deliveredTo: v.optional(v.string()),
    preparedBy: v.optional(v.string()),
    checkedBy: v.optional(v.string()),
    deliveredBy: v.optional(v.string()),
    plateNo: v.optional(v.string()),
    guardName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    const tid = args.trackingId.trim().toLowerCase();
    const o = await ctx.db.query("orders").withIndex("by_tracking", (q) => q.eq("trackingId", tid)).unique();
    if (!o) throw new Error("Not found");
    if (u.branch !== "all" && o.branch !== u.branch) throw new Error("Wrong branch");
    const patch: any = {};
    if (args.customerName !== undefined) patch.customerName = args.customerName;
    if (args.contactName !== undefined) patch.contactName = args.contactName;
    if (args.companyName !== undefined) patch.companyName = args.companyName;
    if (args.mobile !== undefined) patch.mobile = args.mobile;
    if (args.branch !== undefined) patch.branch = args.branch;
    if (args.fulfillment !== undefined) patch.fulfillment = args.fulfillment;
    if (args.address !== undefined) patch.address = args.address;
    if (args.osNo !== undefined) patch.osNo = args.osNo;
    if (args.invoiceNo !== undefined) patch.invoiceNo = args.invoiceNo;
    if (args.finalTotal !== undefined) patch.finalTotal = args.finalTotal;
    if (args.paymentMode !== undefined) patch.paymentMode = args.paymentMode;
    if (args.receiptDate !== undefined) patch.receiptDate = args.receiptDate;
    if (args.deliveredTo !== undefined) patch.deliveredTo = args.deliveredTo;
    if (args.preparedBy !== undefined) patch.preparedBy = args.preparedBy;
    if (args.checkedBy !== undefined) patch.checkedBy = args.checkedBy;
    if (args.deliveredBy !== undefined) patch.deliveredBy = args.deliveredBy;
    if (args.plateNo !== undefined) patch.plateNo = args.plateNo;
    if (args.guardName !== undefined) patch.guardName = args.guardName;
    await ctx.db.patch(o._id, patch);
    return true;
  },
});

export const setWeights = mutation({
  args: {
    token: v.string(),
    trackingId: v.string(),
    items: v.array(v.object({
      productName: v.string(),
      qtyBox: v.number(),
      weightKg: v.number(),
      price: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    if (u.role !== "admin" && u.role !== "biller") throw new Error("Biller only");
    const tid = args.trackingId.trim().toLowerCase();
    const o = await ctx.db.query("orders").withIndex("by_tracking", (q) => q.eq("trackingId", tid)).unique();
    if (!o) throw new Error("Not found");
    if (u.branch !== "all" && o.branch !== u.branch) throw new Error("Wrong branch");
    let finalTotal = 0;
    const patched = args.items.map((it) => {
      const name = it.productName.trim();
      if (!name) throw new Error("Item name required");
      const qtyBox = Math.max(0, Math.floor(Number(it.qtyBox) || 0));
      const weightKg = Math.max(0, Number(it.weightKg) || 0);
      const price = Math.max(0, Number(it.price) || 0);
      finalTotal += weightKg * price;
      return { productName: name, qtyBox, estPrice: price, weightKg, finalPrice: price };
    });
    await ctx.db.patch(o._id, { items: patched, finalTotal: Math.round(finalTotal * 100) / 100 });
    return { finalTotal: Math.round(finalTotal * 100) / 100 };
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
