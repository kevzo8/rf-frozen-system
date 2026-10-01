# RF Frozen Meat Corp - Locked Spec (Sta Mesa pilot, all branches day-1)

## Branches
stamesa, qc, pasig, blumentritt, novaliches, laspinas. `all` for admin.

## Tracking ID
`{branch}-{mmddyy}-{6digits}` lowercase, daily sequence per branch.
Ex: `stamesa-093026-000123`. Search case-insensitive.

## Lifecycle (Shopee-style timeline)
placed > confirmed > to_pay > proof_uploaded > payment_verified > picking > checking > dispatched > delivered
Side: cancelled, returned

## Reports (match xlsx columns exactly)
- Daily Cash: OR#, NAME, BILL, CASH, GCASH, B.TRANSFER, REF, REMARKS + CREDIT PAYMENT section + footer (TOTAL SALES, RETURN, EXPENSES, GRAND TOTAL, CASH BREAKDOWN bills)
- Credit: per-customer sheet DATE|OR#|BILL|PAYMENT|BALANCE
- Sales: DATE|SI#|NAME|BILL|CASH|GCASH|BANK T.|BALANCE|REMARKS + TOTAL row
- Receipt: Delivery Receipt + Picklist Tally (OS#, INV#, customer, address, ITEM/BRAND matrix, TOTAL BOX/KGS, 1-40 catchweight rows, checker/supervisor, NOT VALID FOR CLAIM disclaimer)

## Prices
Seed: PRICE UPDATE 9/29 list (disclaimer: example only, changes daily by supply/demand).
Admin: edit name+price+notes, upload xlsx with 3 columns (A=name, B=price, C=notes e.g. "parating pa lang mamaya" - notes optional, leave blank if none). Timestamp + by whom. Customer sees estimate + notes badge + disclaimer subject to availability.

## Customer portal `/` (no login)
Inputs: name, mobile, address, branch, items (searchable dropdown from ITEM LIST ~1000 SKUs), qty boxes.
Estimate only. Submit -> tracking ID. Later: check tracking -> final payable -> upload proof (GCash/Maya screenshot or cash receipt photo) -> download receipt.

## Payments (placeholders)
GCash-Reagan, Maya-Reagan, BDO RF Frozen 000218035456, GoTyme-Reagan. Replace with real numbers + QR later.

## Storage export/purge
Proofs at `/{branch}/{yyyy-mm-dd}/{trackingId}-*.jpg`, compressed ~200KB.
Admin > Storage: filter, Export day (.zip + manifest.xlsx with date|tracking|branch|customer|amount|mode|file|sha|exportedBy|At), then Purge (blocked until exported, audit logged). Receipts generated on-demand, 0 storage.

## Auth (simple DB, no Convex Auth)
users(username unique lowercase, passwordHash bcrypt, role admin|biller|inventory, branch, displayName, active, createdBy)
sessions(token, userId, expiresAt 12h). login/me/logout mutations. Admin creates/resets/deactivates. Branch-scoped queries.
