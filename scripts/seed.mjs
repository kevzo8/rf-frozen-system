import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
const url = process.env.NEXT_PUBLIC_CONVEX_URL || "https://grateful-sparrow-316.convex.cloud";
const seed = JSON.parse(fs.readFileSync("data/price-sept29-2026.json", "utf8"));
const rows = seed.items.map((x) => ({ productName: x.name, price: x.price }));
const client = new ConvexHttpClient(url);
const res = await client.mutation("seedPrices:load", { rows });
console.log("seeded", res);
