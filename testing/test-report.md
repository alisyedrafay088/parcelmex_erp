# Parcel Mex — Manual QA Pass

Date: 2026-09-22
Tester: Claude (browser walkthrough, logged in as owner/admin)

Status legend: ✅ pass · ⚠️ issue found · ⏭️ not tested (no credentials / out of scope this pass)

| # | Module | Status | Notes |
|---|--------|--------|-------|
| 1 | Login | ✅ | admin/Admin@123 logs in, redirects to dashboard |
| 2 | Dashboard | ✅ | overview cards, revenue, status chart, trends all render with real data |
| 3 | Parcels | ✅ | list loads (26 parcels); Book Parcel form creates a parcel correctly (tested, then deleted) |
| 4 | Airway Bill | ✅ | parcel list renders, selectable |
| 5 | Address Verification | ✅ | counts (All/Unverified/Verified/Needs Review) and list render |
| 6 | Tracking (admin) | ✅ | tracking PM-000030 returns full status timeline |
| 7 | Client Management | ✅ | 3 clients listed, plan/status selects present, portal login column works |
| 8 | Operating Expenses | ✅ | totals by category + 11 expense rows render correctly |
| 9 | Fleet Management | ✅ | 3 riders + 1 vehicle listed, statuses/assignment selects present |
| 10 | Warehouses | ✅ | 1 warehouse with capacity/stored count |
| 11 | Packaging Supplies | ✅ | quantities render correctly in the editable input cells (see note below) |
| 12 | Invoicing & Billing | ✅ | 4 invoices listed with correct amounts/status |
| 13 | Reports | ✅ | summary tiles + Generate/Export CSV buttons present |
| 14 | Roles / Permissions | ✅ | staff list, role dropdowns, and new Feature-Access-by-Role matrix all verified (see permission test below) |
| 15 | Customer Portal | ✅ | logged in with a temp test account — My Parcels, Airway Bill data, Fleet, and My Invoices all render correctly |
| 16 | Rider Portal | ✅ | logged in with a temp test account — delivery list, map, and status progression (Pending → Picked → Packed) all work |
| 17 | Public Tracking (/track) | ✅ | works without login; correctly hides client name (shows only weight/address/status) unlike the internal admin tracking view |
| 18 | PDF generation | ✅ | Invoice PDF, Airway Bill PDF, and Expense Report PDF all return valid `application/pdf` responses with real content |

## Details

### Parcels — create flow
Filled Book Parcel form (client, address, receiver, weight, rate) → submitted → new parcel `PM-000031` appeared in the list immediately with correct amount (PKR 100 for 2kg). Deleted afterward to leave data clean.

### Feature Access by Role (new permission system)
Created a temporary `qa_test_dispatch` (dispatch role) staff account and confirmed via direct API calls:
- Default permissions applied correctly: dispatch → parcels/airway_bill/tracking/fleet/warehouses/supplies allowed, expenses blocked (403).
- Toggling `dispatch.parcels` off in the matrix and saving immediately caused `/parcels` to return 403 for that user (no re-login needed).
- Restored the toggle and deleted the test account afterward — staff count is back to 5, matrix back to defaults.

### False alarm — Supplies quantity column
Initial page-text scrape showed the QUANTITY column as blank for both supplies. Checked the API directly (`/supplies` returned `quantity: 100` and `12`) and then re-inspected via the accessibility tree: the values are correctly shown, just inside editable `<input type="number">` cells, which plain text extraction doesn't capture. **Not a bug.**

### Bug found and fixed — parcel receiver info was silently dropped
`POST /parcels` accepted `receiver_name` / `receiver_phone` in the request schema (used by the Book Parcel form for the airway bill's receiver details) but the endpoint never wrote them onto the new `Parcel` row — every parcel was created with these fields `NULL` regardless of what was submitted. Confirmed via direct DB query. Fixed in [parcels.py](../backend/app/routers/parcels.py) by passing both fields through in `create_parcel`; verified the fix with a fresh parcel (`receiver_name`/`receiver_phone` now persist correctly end to end, including in the customer portal view).

Side-lesson from chasing this down: after editing the file, uvicorn's `--reload` auto-restart did *not* pick up the change reliably (kept returning `null` even after a WatchFiles "Reloading..." log line). A full manual stop + `__pycache__` clear + restart made the fix take effect. Worth remembering if a backend edit doesn't seem to apply — don't trust the auto-reloader, do a clean restart to confirm.

### Customer Portal & Rider Portal — verified with temporary test accounts
Since no real customer/rider passwords were known, created a temporary client (`QA Portal Test Client`) with a portal login and a temporary rider (`QA Portal Test Rider`) with a portal login, plus one parcel assigned between them:
- **Customer portal**: My Parcels showed the parcel with correct rider/amount; Fleet tab showed the assigned rider; My Invoices correctly showed "no invoices yet".
- **Rider portal**: My Deliveries showed the assigned parcel; clicking "Mark as Picked" correctly advanced the status to Picked and updated the action button to "Mark as Packed".
- All temp data (client, rider, both portal users, the parcel) deleted afterward — confirmed via API that the client/rider/user lists are back to their original real records.

### UI fix — outdated pill-shaped dropdowns in "add new record" forms
User flagged the category dropdown on the Add Expense form looking dated/mismatched next to the plain rectangular text inputs. Root cause: it (and several other "add form" selects across the app) used the same `.pill-select` badge style meant for colored status pills in tables, which looked like a full pill/oval next to square inputs. Fixed by giving `.fleet-inline-form select` its own plain rectangular style (matching the sibling inputs — border, radius, white background, subtle chevron) and removing the pill classes from the dropdowns in: Add Expense (category), Add Client (plan), Add Staff (role), Add Vehicle (rider), Generate Invoice (client), and Book Parcel (client/rider/warehouse). Status-colored pills elsewhere (table row status/role dropdowns) were left untouched since those are intentionally pill-badge styled.

### Known gaps in this pass
- No stress/edge-case testing (invalid inputs, very large numbers, concurrent edits, etc.) — this pass focused on "does the golden path work."
- PDF *content* (layout/formatting correctness) wasn't visually reviewed, only that each endpoint returns a valid non-trivial `application/pdf` response.

---

## Follow-up pass — stress/edge cases + PDF content review

Date: 2026-09-22 (same day, second pass)
Tester: Claude (direct API calls as owner/admin, plus browser)

Covers the two gaps left open above.

### Bugs found and fixed

1. **Parcel creation crashed with 500 on an out-of-range weight.** `POST /parcels` only checked `weight_kg <= 0`, so a value like `1000000000` overflowed the `Numeric(8,2)` column and threw an unhandled `sqlalchemy.exc.DataError`, returning a raw 500 instead of a clean validation error. Same gap existed on `PATCH /parcels/{id}` for `weight_kg`/`rate_per_kg`. Fixed in [parcels.py](../backend/app/routers/parcels.py) with a shared `_validate_parcel_numbers()` check (weight bounds, quantity > 0, rate ≥ 0) applied to both create and update.
2. **Negative/zero `quantity` and negative `rate_per_kg` were silently accepted** on parcel create (no validation existed at all) — fixed by the same helper above.
3. **`PATCH /parcels/{id}` crashed with `TypeError: unsupported operand type(s) for *: 'float' and 'decimal.Decimal'`** when only one of `weight_kg`/`rate_per_kg` was updated — the unmodified field stays a SQLAlchemy `Decimal` while the just-set field is a plain Python `float`, and multiplying the two raises. Fixed by casting both to `float()` before recomputing `amount`.
4. **`PATCH /expenses/{id}` could set `amount` to zero or negative** even though `POST /expenses` correctly rejects it (`gt=0`) — the update schema had no such constraint. Fixed in [expense.py](../backend/app/schemas/expense.py) by adding `gt=0` to `ExpenseUpdate.amount` (and `min_length=1` to `title`, matching create).
5. **Clients could be created with an empty `name`** (`""`). Fixed in [client.py](../backend/app/schemas/client.py) by adding `min_length=1` to `name` on both `ClientCreate` and `ClientUpdate`.

All five confirmed fixed by re-running the same requests after a clean backend restart (the reloader flakiness noted below made a clean restart necessary again).

### Verified as correct, no changes needed
- Invoice generation already rejects `period_end < period_start` (400).
- Duplicate client email correctly rejected (400); invalid email format rejected (422) via `EmailStr`.
- SQL-injection-style strings in public tracking lookup and global search returned empty/404 results, not errors — ORM parameterization holds up.
- Auth endpoints handle wrong password, unknown username, and empty body correctly (401/422, no leaks); protected routes correctly reject missing/garbage bearer tokens (401).
- PDF content (Invoice, Airway Bill, Operating Expenses Report) visually reviewed by rendering each PDF — layout, branding, QR/barcode, and totals all correct. One thing that looked like a bug at first ("Employee Salaries" row showing `... - n/a`) turned out to be a false alarm: that expense's `notes` field literally contains the text `"n/a"` as user-entered data, and the PDF code already omits the suffix when notes is empty/null.

### Side-lesson (repeat of the earlier one, worth reinforcing)
Uvicorn's `--reload` did **not** pick up the parcels.py/expense.py/client.py edits reliably even after logging "Reloading..." — requests kept hitting the pre-edit code. Stopping the server, clearing every `__pycache__`, and starting fresh made every fix take effect immediately. Don't trust the auto-reloader when a backend fix doesn't seem to apply.

### Cleanup
Test parcels created during this pass (including one negative-quantity parcel that briefly leaked into the real parcel list and showed up in an Airway Bill PDF) were deleted; dashboard/expense totals confirmed back to their original values (26 parcels, 3 clients, 11 expenses, PKR 185,000 total expenses) before finishing.

### Remaining gaps
- No load/concurrency testing (simultaneous writes to the same parcel/invoice).
- No mobile/responsive visual pass.
- The new staff-facing chatbot (`/dashboard/chat`) and the customer-facing one (`/portal/chat`) were exercised functionally in this session (correct answers backed by real data) but not stress-tested with adversarial prompts.
