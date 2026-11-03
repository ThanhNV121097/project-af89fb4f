# ERD extension — Add product saves and notifies Telegram

Story: `docs/cms/stories/add-product-saves-and-notifies-telegram.md`
Extends: `products` and `telegram` (both already defined in full in the
project-wide `docs/architecture/erd.md` §3.1 and §3.3 — created by
`0001_create_products.up.sql` and `0003_create_telegram.up.sql`).

## Change

None. This story is a pure read/write against the two tables the shared ERD
already fully specifies — it adds no column, no table, no constraint, no
index.

- `POST /v1/products` inserts one row into `products` using exactly the
  columns `erd.md` §3.1 already lists (`id`, `name`, `note`, `price`,
  `image`, `added`; `seq` auto). `ck_products_price_positive` (already
  shipped in `0001`) is the same guard CMS-001/CMS-003 need — no new
  constraint to add.
- The Telegram send reads the single `telegram` row (`id='group'`) for
  `chat_id` (and `bot`, display-only) — a plain `SELECT`, no schema change.
  `erd.md` §3.3 already seeds this row empty; nothing here alters it.

`id` generation: the story needs a server-assigned id (CMS-001 behaviour 4,
services.md §3.4) — a URL-safe slug derived from `name` (lowercased,
non-alphanumeric runs collapsed to `-`), with a numeric suffix appended on a
`UNIQUE` collision against `products.id`'s existing primary key. No new
column or sequence: the collision check is a `SELECT ... WHERE id = $1`
against the PK already indexed, same cost as the lookup `erd.md` §5 access
pattern 2 already names.

No `admins` involvement: CMS-001/CMS-002 do not record who added a row
(`erd.md` §2 already states this — no FK from `products` to `admins`); the
request's JWT is checked for validity only (see services extension), never
joined into this insert.

## Mock shape read and judged

`code/frontend/lib/mock/add-product-saves-and-notifies-telegram.ts` (PR #17)
`addProduct(p)` takes `{ name, note, price: number, image }` and resolves
`SavedProduct = { id, name, note, price: number, image, added,
telegram_sent: boolean }`, deriving `telegram_sent` from whether the
`telegram` row's `chat_id` is non-empty.

- The response shape (`id`/`name`/`note`/`price`/`image`/`added` +
  `telegram_sent`) matches `services.md` §3.4's already-specified response
  exactly — no frontend change needed when the real client replaces the
  mock.
- One real difference, stated here: the mock's `price` is a JS `number`;
  the wire contract (`services.md` §2.4/§3.2, already fixed before this
  story) sends `price` as a **string** (`"38.00"`) to avoid float rounding.
  `CmsNewProduct.tsx`'s `preview`/`formatPrice` already accept
  `number | string` (see `src/lib/format.ts`'s `formatPrice` signature), so
  this costs the backend story's client a `String(amount)` on the request
  and nothing on the response read — no component edit, `formatPrice`
  already handles a string `price` on the returned row. Flagged so the
  backend-story Dev does not silently return a JSON number instead.
- The mock's `telegram_sent` derivation (empty `chat_id` → `false`) is
  exactly the rule `services.md` §5 and CMS-002 AC-2 already specify for the
  real endpoint — no departure.
- The mock never validates `price > 0` or non-empty `name`/`note` server
  side (the existing client-side check in `CmsNewProduct.tsx`'s `submit`
  already gates it before calling `addProduct`) — the real endpoint adds
  that check at the HTTP handler per `services.md` §2.5/§3.4, since a direct
  API call must not bypass it (CMS-003's failure table, SC-11/SC-12 of the
  story). This is additive server-side validation, not a frontend-visible
  difference: the form already blocks the same inputs before the request is
  ever sent.

## Migration plan

None needed. Both tables and their constraints already exist
(`0001_create_products.up.sql`, `0003_create_telegram.up.sql`, both shipped
per `erd.md` §8). This story writes application code only — no
`.up.sql`/`.down.sql` pair is added, and none is safe-on-populated-table
analysis is required since no schema changes.
