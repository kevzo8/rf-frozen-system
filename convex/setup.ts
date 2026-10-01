import { mutation } from "./_generated/server";
import { v } from "convex/values";

// One-time bootstrap: creates first admin only if users table is empty.
// After that, use auth:createUser with admin token.
export const firstAdmin = mutation({
  args: { username: v.string(), password: v.string(), displayName: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("users").take(1);
    if (existing.length > 0) throw new Error("Setup already done");
    const salt = crypto.randomUUID().slice(0, 16);
    const data = new TextEncoder().encode(`${salt}:${args.password}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    await ctx.db.insert("users", {
      username: args.username.trim().toLowerCase(),
      passwordHash: `$simple$${salt}$${hex}`,
      role: "admin",
      branch: "all",
      displayName: args.displayName,
      active: true,
    });
    return true;
  },
});
