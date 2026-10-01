import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("admin"), v.literal("biller"), v.literal("inventory")),
    branch: v.string(),
    displayName: v.string(),
    active: v.boolean(),
    createdBy: v.optional(v.string()),
  }).index("by_username", ["username"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  products: defineTable({
    name: v.string(), // e.g. "P BELLY BISO - VALLEY GRAIN"
    active: v.boolean(),
  }).index("by_name", ["name"]),

  prices: defineTable({
    productName: v.string(),
    price: v.number(),
    notes: v.optional(v.string()), // e.g. "parating pa lang mamaya", "no return", "limited"
    updatedAt: v.number(),
    updatedBy: v.string(),
    source: v.union(v.literal("manual"), v.literal("xlsx")),
  }).index("by_product", ["productName"]),

  counters: defineTable({
    branch: v.string(),
    date: v.string(), // yyyy-mm-dd
    seq: v.number(),
  }).index("by_branch_date", ["branch", "date"]),

  orders: defineTable({
    trackingId: v.string(),
    branch: v.string(),
    customerName: v.string(), // receipt name, normalized ALL CAPS (company or contact)
    customerKey: v.optional(v.string()), // dedupe key: collapsed-lowercase
    contactName: v.optional(v.string()), // contact person full name, ALL CAPS
    companyName: v.optional(v.string()), // company / receipt name, ALL CAPS
    fulfillment: v.optional(v.union(v.literal("pickup"), v.literal("delivery"))),
    mobile: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.union(
      v.literal("placed"), v.literal("confirmed"), v.literal("to_pay"),
      v.literal("proof_uploaded"), v.literal("payment_verified"),
      v.literal("picking"), v.literal("checking"),
      v.literal("dispatched"), v.literal("delivered"),
      v.literal("cancelled"), v.literal("returned")
    ),
    items: v.array(v.object({ productName: v.string(), qtyBox: v.number(), estPrice: v.number(), weightKg: v.optional(v.number()), finalPrice: v.optional(v.number()) })),
    estimateTotal: v.number(),
    finalTotal: v.optional(v.number()),
    osNo: v.optional(v.string()), // RF55xxx
    invoiceNo: v.optional(v.string()), // 238xxx
    paymentMode: v.optional(v.string()), // CASH | GCASH | MAYA | BDO | GOTYME
    receiptDate: v.optional(v.number()), // delivery/receipt date override (ms); defaults to createdAt
    deliveredTo: v.optional(v.string()), // receipt "delivered to" override; defaults to company/contact
    preparedBy: v.optional(v.string()),
    checkedBy: v.optional(v.string()),
    deliveredBy: v.optional(v.string()),
    plateNo: v.optional(v.string()),
    guardName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tracking", ["trackingId"])
    .index("by_branch_status", ["branch", "status"])
    .index("by_branch_date", ["branch", "createdAt"]),

  proofs: defineTable({
    trackingId: v.string(),
    branch: v.string(),
    fileId: v.id("_storage"),
    fileName: v.string(),
    sha256: v.optional(v.string()),
    amount: v.optional(v.number()),
    mode: v.optional(v.string()),
    uploadedAt: v.number(),
    exportedAt: v.optional(v.number()),
    exportedBy: v.optional(v.string()),
  })
    .index("by_tracking", ["trackingId"])
    .index("by_branch_date", ["branch", "uploadedAt"]),

  exportLogs: defineTable({
    branch: v.string(),
    date: v.string(),
    zipFile: v.string(),
    manifestRows: v.number(),
    exportedBy: v.string(),
    exportedAt: v.number(),
    purgedAt: v.optional(v.number()),
  }).index("by_branch_date", ["branch", "date"]),
});
