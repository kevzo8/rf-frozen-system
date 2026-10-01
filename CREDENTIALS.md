# RF Frozen Meat Corp — System Credentials & Access Guide

> For presentation to management. Rotate the starter password after handover.

## 1. Links

| What | URL |
|---|---|
| Customer shop (no login) | `http://localhost:3000` (dev) → production URL after Vercel deploy |
| Staff login | `/admin/login` |
| Track order | `/track/{trackingId}` e.g. `/track/stamesa-093026-000001` |
| GitHub repo | https://github.com/kevzo8/rf-frozen-system |
| Convex dashboard (database) | https://dashboard.convex.dev/t/kevzo8/rf-frozen-system/grateful-sparrow-316 |
| Convex Cloud URL | `https://grateful-sparrow-316.convex.cloud` |

## 2. Starter admin account

| Field | Value |
|---|---|
| Username | `admin.stamesa` |
| Password | `changeMe123` |
| Role | `admin` |
| Branch | `all` (sees all 6 branches) |

Steps after login:
1. Go to `/admin` → Create account for each biller / inventory staff.
2. Username format: `firstname.branch` e.g. `patricia.stamesa`, `angel.qc`.
3. Roles: `admin` (full), `biller` (orders, payments, receipts, reports), `inventory` (inbound/outbound, availability, picking/checking).
4. Branches: `stamesa`, `qc`, `pasig`, `blumentritt`, `novaliches`, `laspinas`, or `all` for managers.
5. Reset the starter password via Admin → resetPassword, then disable/delete this doc copy.

## 3. How staff use it

- **Biller:** `/admin/login` → confirm pending orders → set final total + payment mode + OS/INV no. → verify uploaded proof → generate receipt → daily Cash / Credit / Sales reports (export xlsx).
- **Inventory:** confirm availability, update inbound/outbound, picker/checker/dispatcher checklist.
- **Admin:** manage prices (edit or xlsx upload with 3 columns: A=name, B=price, C=notes), manage users, Storage Manager (export day `.zip + manifest.xlsx`, then purge), all-branch reports.

## 4. How customers use it (no account)

1. Open shop, pick branch (synced hero + form).
2. Search by **name or price** (type `Belly`, `CLQ`, or `245`), sort **A–Z / ₱ Low→High / ₱ High→Low**.
3. Notes badge shows `parating pa lang mamaya`, `no return`, etc. (3rd column from price upload).
4. Place order → save tracking ID like `stamesa-093026-000001` (lowercase).
5. Check tracking → see final payable after biller confirms → pay via GCash / Maya / BDO / GoTyme / Cash → upload proof → biller verifies → delivered.

## 5. Price list & notes

- Current seed: 39 items from Sept 29, 2026 (example only — changes daily by supply/demand).
- Upload format: xlsx **A=name, B=price, C=notes** (notes optional, e.g. `parating pa lang mamaya`).
- Timestamp `PRICE AS OF: <Manila datetime>` shown in hero + disclaimer that estimates are subject to availability.

## 6. Security notes (simple by design)

- Username + password only, bcrypt-hashed (SHA-256+salt isolate hash, upgrade path to bcrypt action documented in `convex/auth.ts`).
- Sessions expire after 12h, stored in `sessions` table.
- No email/OAuth. Password resets done by admin only.
- Branch scoping enforced in queries (`all` sees everything, others see own branch).
- `.env.local` (Convex URL) is git-ignored and never committed.

Rotate `changeMe123` immediately after demo.
