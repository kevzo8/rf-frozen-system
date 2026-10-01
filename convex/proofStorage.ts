import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function requireStaff(ctx: any, token: string) {
  const s = await ctx.db.query("sessions").withIndex("by_token", (q: any) => q.eq("token", token)).unique();
  if (!s || s.expiresAt < Date.now()) throw new Error("Not logged in");
  const u = await ctx.db.get(s.userId);
  if (!u || !u.active) throw new Error("Not logged in");
  return u;
}

export const uploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const listProofs = query({
  args: { token: v.string(), branch: v.optional(v.string()), date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    let rows = await ctx.db.query("proofs").collect();
    if (u.branch !== "all") rows = rows.filter((r) => r.branch === u.branch);
    else if (args.branch && args.branch !== "all") rows = rows.filter((r) => r.branch === args.branch);
    if (args.date) {
      const start = new Date(args.date + "T00:00:00+08:00").getTime();
      const end = start + 24 * 60 * 60 * 1000;
      rows = rows.filter((r) => r.uploadedAt >= start && r.uploadedAt < end);
    }
    rows.sort((a, b) => b.uploadedAt - a.uploadedAt);
    return Promise.all(rows.slice(0, 300).map(async (r) => ({
      ...r, url: await ctx.storage.getUrl(r.fileId),
    })));
  },
});

export const logExport = mutation({
  args: { token: v.string(), branch: v.string(), date: v.string(), zipFile: v.string(), manifestRows: v.number(), proofIds: v.array(v.id("proofs")) },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    for (const pid of args.proofIds) {
      const p = await ctx.db.get(pid);
      if (p) await ctx.db.patch(pid, { exportedAt: Date.now(), exportedBy: u.username });
    }
    await ctx.db.insert("exportLogs", { branch: args.branch, date: args.date, zipFile: args.zipFile, manifestRows: args.manifestRows, exportedBy: u.username, exportedAt: Date.now() });
    return true;
  },
});

export const purgeExported = mutation({
  args: { token: v.string(), branch: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const u: any = await requireStaff(ctx, args.token);
    if (u.role !== "admin") throw new Error("Admin only");
    const rows = await ctx.db.query("proofs").collect();
    const start = new Date(args.date + "T00:00:00+08:00").getTime();
    const end = start + 24 * 60 * 60 * 1000;
    let n = 0;
    for (const r of rows) {
      if (r.branch !== args.branch || r.uploadedAt < start || r.uploadedAt >= end) continue;
      if (!r.exportedAt) throw new Error("Export first before purge - unexported proof found");
      await ctx.storage.delete(r.fileId);
      await ctx.db.delete(r._id);
      n++;
    }
    const logs = await ctx.db.query("exportLogs").withIndex("by_branch_date", (q) => q.eq("branch", args.branch).eq("date", args.date)).collect();
    for (const l of logs) await ctx.db.patch(l._id, { purgedAt: Date.now() });
    return n;
  },
});
