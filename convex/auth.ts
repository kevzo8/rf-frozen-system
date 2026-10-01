import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const SESSION_TTL = 12 * 60 * 60 * 1000;

async function hashPassword(password: string): Promise<string> {
  // bcryptjs only runs in Node actions; mutations run in isolate.
  // We use SHA-256 + per-user salt via crypto.subtle for zero-deps isolate hashing.
  // Upgrade to bcrypt in an action later if needed - format: $simple$<salt>$<hash>
  const salt = crypto.randomUUID().slice(0, 16);
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `$simple$${salt}$${hex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2")) {
    // legacy bcrypt hashes if migrated - cannot verify here, force reset
    return false;
  }
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[1] !== "simple") return false;
  const salt = parts[2];
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === parts[3];
}

export const login = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const uname = args.username.trim().toLowerCase();
    const user = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", uname)).unique();
    if (!user || !user.active) throw new Error("Invalid login");
    if (!(await verifyPassword(args.password, user.passwordHash))) throw new Error("Invalid login");
    const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    await ctx.db.insert("sessions", { token, userId: user._id, expiresAt: Date.now() + SESSION_TTL });
    return { token, role: user.role, branch: user.branch, displayName: user.displayName, username: user.username };
  },
});

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!s || s.expiresAt < Date.now()) return null;
    const u = await ctx.db.get(s.userId);
    if (!u || !u.active) return null;
    return { username: u.username, role: u.role, branch: u.branch, displayName: u.displayName };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (s) await ctx.db.delete(s._id);
    return true;
  },
});

async function requireAdmin(ctx: any, token: string) {
  const s = await ctx.db.query("sessions").withIndex("by_token", (q: any) => q.eq("token", token)).unique();
  if (!s || s.expiresAt < Date.now()) throw new Error("Not logged in");
  const u = await ctx.db.get(s.userId);
  if (!u || !u.active || u.role !== "admin") throw new Error("Admin only");
  return u;
}

export const createUser = mutation({
  args: { token: v.string(), username: v.string(), password: v.string(), role: v.union(v.literal("admin"), v.literal("biller"), v.literal("inventory")), branch: v.string(), displayName: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const uname = args.username.trim().toLowerCase();
    if (uname.length < 3) throw new Error("Username too short");
    if (args.password.length < 4) throw new Error("Password too short");
    const existing = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", uname)).unique();
    if (existing) throw new Error("Username exists");
    await ctx.db.insert("users", {
      username: uname, passwordHash: await hashPassword(args.password),
      role: args.role, branch: args.branch.toLowerCase(), displayName: args.displayName, active: true, createdBy: admin.username,
    });
    return true;
  },
});

export const resetPassword = mutation({
  args: { token: v.string(), username: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const u = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", args.username.trim().toLowerCase())).unique();
    if (!u) throw new Error("User not found");
    await ctx.db.patch(u._id, { passwordHash: await hashPassword(args.newPassword) });
    return true;
  },
});

export const setActive = mutation({
  args: { token: v.string(), username: v.string(), active: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const u = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", args.username.trim().toLowerCase())).unique();
    if (!u) throw new Error("User not found");
    await ctx.db.patch(u._id, { active: args.active });
    return true;
  },
});

export const setDisplayName = mutation({
  args: { token: v.string(), username: v.string(), displayName: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const d = args.displayName.trim();
    if (d.length < 2) throw new Error("Display name too short");
    const u = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", args.username.trim().toLowerCase())).unique();
    if (!u) throw new Error("User not found");
    await ctx.db.patch(u._id, { displayName: d });
    return true;
  },
});

export const setPermissions = mutation({
  args: {
    token: v.string(),
    username: v.string(),
    role: v.union(v.literal("admin"), v.literal("biller"), v.literal("inventory")),
    branch: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const uname = args.username.trim().toLowerCase();
    const u = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", uname)).unique();
    if (!u) throw new Error("User not found");
    if (u.username === admin.username && args.role !== "admin") {
      throw new Error("You cannot remove your own admin role");
    }
    await ctx.db.patch(u._id, { role: args.role, branch: args.branch.trim().toLowerCase() });
    return true;
  },
});

export const listUsers = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!s || s.expiresAt < Date.now()) throw new Error("Not logged in");
    const u = await ctx.db.get(s.userId);
    if (!u || u.role !== "admin") throw new Error("Admin only");
    const all = await ctx.db.query("users").collect();
    return all.map((x) => ({ username: x.username, role: x.role, branch: x.branch, displayName: x.displayName, active: x.active }));
  },
});

// Self-service: any logged-in staff can update their own display name,
// and change their own password by proving the current one.
export const updateMe = mutation({
  args: { token: v.string(), displayName: v.optional(v.string()), currentPassword: v.optional(v.string()), newPassword: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!s || s.expiresAt < Date.now()) throw new Error("Not logged in");
    const u = await ctx.db.get(s.userId);
    if (!u || !u.active) throw new Error("Not logged in");
    const patch: { displayName?: string; passwordHash?: string } = {};
    if (args.displayName !== undefined) {
      const d = args.displayName.trim();
      if (d.length < 2) throw new Error("Display name too short");
      patch.displayName = d;
    }
    if (args.newPassword !== undefined) {
      if (!args.currentPassword) throw new Error("Current password required");
      if (!(await verifyPassword(args.currentPassword, u.passwordHash))) throw new Error("Current password is wrong");
      if (args.newPassword.length < 4) throw new Error("New password too short (min 4)");
      patch.passwordHash = await hashPassword(args.newPassword);
    }
    if (Object.keys(patch).length === 0) throw new Error("Nothing to update");
    await ctx.db.patch(u._id, patch);
    return true;
  },
});
