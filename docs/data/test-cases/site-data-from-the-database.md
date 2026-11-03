# Test cases — Site data from the database

Module: `data`
Story: `docs/data/stories/site-data-from-the-database.md`
Contract: `docs/architecture/services.md` §2–3 (`/v1/products`, `/v1/admins`, `/v1/telegram`)

Risk: medium. No payment or irreversible write here — these are read endpoints
plus a data-client rewrite — but two things raise the stakes above a typical
read: DATA-002's authorization gate (`admins`/`telegram` must never leak to an
unauthenticated caller — the deploy itself fails if they do) and DATA-004's
contract that every current component keeps working unchanged. Permission and
regression cases get the same depth as the happy path; pure formatting
boundaries do not.

Session setup used by every "valid admin session" case below: `POST
/v1/auth/login` with a seeded admin's email/password (per
`docs/architecture/services.md` §3.1), take the returned `token`, send it as
`Authorization: Bearer <token>`. "Forged/expired token" cases use a
syntactically-valid JWT with a bad signature or a past `exp`.

---

## DATA-001 — Products are readable, paged, by anyone

**Scenario**: Default paged list returns the seeded total
**Given**: The seed has inserted N products (N > 12)
**When**: A visitor with no session calls `GET /v1/products?page=1&limit=12`
**Then**: Response is `200`; body has `items` with up to 12 entries, `total` = N, `page` = 1, `limit` = 12
Traces: SC-1 (DATA-001 AC-1)
Check: fetch_url

**Scenario**: Single product by id returns its fields
**Given**: A product with id `p1` exists in the seed
**When**: A visitor with no session calls `GET /v1/products/p1`
**Then**: Response is `200`; body contains that record's `id`, `name`, `note`, `price`, `image`, `added` matching the seeded values
Traces: SC-2 (DATA-001 AC-2)
Check: fetch_url

**Scenario**: Unknown product id is 404
**Given**: No product has id `missing`
**When**: A visitor calls `GET /v1/products/missing`
**Then**: Response is `404`; body is the error envelope with `error.code` = `NOT_FOUND`
Traces: SC-3 (DATA-001 AC-3)
Check: fetch_url

**Scenario**: Limit above 100 is clamped, not rejected
**Given**: 130 products exist
**When**: A visitor calls `GET /v1/products?limit=500`
**Then**: Response is `200`; `items` has at most 100 entries, `limit` = 100 (not 500, not an error)
Traces: SC-4 (DATA-001 AC-4)
Check: fetch_url

**Scenario**: Non-integer/negative page and limit default instead of erroring
**Given**: The seed has inserted N products
**When**: A visitor calls `GET /v1/products?page=-1&limit=abc`
**Then**: Response is `200` (not `400`); `page` = 1, `limit` = 12, as if neither parameter had been sent
Traces: DATA-001 failure table ("not a 400 — a stray value should not break the list")
Check: fetch_url

**Scenario**: Filtering by a schema field returns only matching rows
**Given**: A product named `Kitchen scale` exists among others with different names
**When**: A visitor calls `GET /v1/products?name=Kitchen+scale`
**Then**: Response is `200`; every item in `items` has `name` = `Kitchen scale`, and `total` counts only matching rows
Traces: contract (`GET /v1/products`, DATA-001 behaviour 1)
Check: fetch_url

**Scenario**: Unknown query parameter is ignored, not rejected
**Given**: The seed has inserted N products
**When**: A visitor calls `GET /v1/products?bogus=xyz`
**Then**: Response is `200` (not `400`); `items`/`total` are identical to the same call without `bogus=xyz`
Traces: contract (§2.5 — "Query parameters are the one exception … an unrecognised one is ignored")
Check: fetch_url

**Scenario**: Database unavailable returns 500 INTERNAL, never a stray public response
**Given**: The database is made unreachable while the backend is running (`set_db_available(false)`)
**When**: A visitor calls `GET /v1/products`
**Then**: Response is `500`; body's `error.code` = `INTERNAL`
Traces: contract (§2.3 error catalog) / DATA-001 failure table ("Upstream failure")
Check: fetch_url

---

## DATA-002 — Admins and the Telegram target are never public

**Scenario**: Unauthenticated admins list is refused
**Given**: No session (no `Authorization` header)
**When**: A caller requests `GET /v1/admins`
**Then**: Response is `401`; body's `error.code` = `UNAUTHENTICATED`; body is never a `200` listing
Traces: SC-5 (DATA-002 AC-1)
Check: fetch_url

**Scenario**: Unauthenticated telegram list is refused
**Given**: No session
**When**: A caller requests `GET /v1/telegram`
**Then**: Response is `401`; body's `error.code` = `UNAUTHENTICATED`
Traces: SC-6 (DATA-002 AC-2)
Check: fetch_url

**Scenario**: Unauthenticated single-admin lookup never reveals existence
**Given**: No session; an admin row with a real id exists
**When**: A caller requests `GET /v1/admins/<that-id>`
**Then**: Response is `401` — never `200` and never `404` (existence is not revealed to an unauthenticated caller)
Traces: SC-7 (DATA-002 AC-3)
Check: fetch_url

**Scenario**: Authenticated admin sees every admin row
**Given**: A valid admin session (token from `POST /v1/auth/login`)
**When**: The admin calls `GET /v1/admins`
**Then**: Response is `200`; `items` contains every seeded admin row (`id`, `email`, `name`, `role`), and no item includes `password_hash`
Traces: SC-8 (DATA-002 AC-4)
Check: fetch_url

**Scenario**: Authenticated admin sees the telegram row(s)
**Given**: A valid admin session
**When**: The admin calls `GET /v1/telegram`
**Then**: Response is `200`; `items` contains the seeded telegram row(s) (`id`, `bot`, `group`, `chat_id`)
Traces: SC-9 (DATA-002 AC-5)
Check: fetch_url

**Scenario**: Authenticated admin can fetch one admin row by id
**Given**: A valid admin session; an admin row with id `owner` exists
**When**: The admin calls `GET /v1/admins/owner`
**Then**: Response is `200` with that row's fields
Traces: contract (`GET /v1/admins/{id}`, DATA-002 AC-3 symmetry)
Check: fetch_url

**Scenario**: Authenticated admin gets 404 for a nonexistent admin id
**Given**: A valid admin session; no admin has id `missing`
**When**: The admin calls `GET /v1/admins/missing`
**Then**: Response is `404`; body's `error.code` = `NOT_FOUND`
Traces: contract (`GET /v1/admins/{id}` error table)
Check: fetch_url

**Scenario**: Authenticated admin gets 404 for a nonexistent telegram id
**Given**: A valid admin session; no telegram row has id `missing`
**When**: The admin calls `GET /v1/telegram/missing`
**Then**: Response is `404`; body's `error.code` = `NOT_FOUND`
Traces: contract (`GET /v1/telegram/{id}` error table)
Check: fetch_url

**Scenario**: Forged or expired token is treated exactly like no session
**Given**: A JWT with a bad signature (or a real token past its `exp`)
**When**: That caller requests `GET /v1/admins` and, separately, `GET /v1/telegram`
**Then**: Both responses are `401` with `error.code` = `UNAUTHENTICATED` — identical to the no-session case, never `403` and never a partial response
Traces: SC-15 (DATA-002)
Check: fetch_url

**Scenario**: Database unavailable on an authenticated admins read is 500 INTERNAL
**Given**: A valid admin session; the database is made unreachable (`set_db_available(false)`)
**When**: The admin calls `GET /v1/admins`
**Then**: Response is `500`; body's `error.code` = `INTERNAL`
Traces: DATA-002/contract (§2.3 error catalog, "Upstream failure")
Check: fetch_url

---

## DATA-003 — No private field leaks through the public products read

**Scenario**: Public product list exposes exactly the public field set
**Given**: The current `products` schema (no field marked `"private": true`)
**When**: A visitor requests `GET /v1/products`
**Then**: Each item in `items` has exactly the keys `id`, `name`, `note`, `price`, `image`, `added` (plus `_source` if present) — no extra, no missing
Traces: SC-10 (DATA-003 AC-1)
Check: fetch_url

---

## DATA-004 — `useCollection` and `useRecord` read the API, unchanged for components

**Scenario**: Home renders products loaded from the API, not the old fixtures
**Given**: The API is reachable and seeded with products distinct from the deleted `products.json` fixture values
**When**: The Home page is opened
**Then**: The rendered page shows the product names/prices as returned by `GET /v1/products`, not any value that only existed in the old JSON fixture
Traces: SC-11 (DATA-004 AC-1)
Check: render_url

**Scenario**: API failure surfaces the existing error affordance, not a blank or stuck-loading page
**Given**: The database is made unreachable (`set_db_available(false)`) so `GET /v1/products` returns `500`
**When**: The Home page is opened
**Then**: The page renders the design's existing error state (no infinite spinner, no raw crash) and does not show stale/placeholder product rows as if they had loaded
Traces: SC-12 (DATA-004 AC-2)
Check: render_url

**Scenario**: "Show more" fetches and appends the next page
**Given**: The API is reachable and seeded with more products than one page (`limit=12`) holds
**When**: The visitor clicks the "Show more" button on the Home page
**Then**: The visible product count increases by the next page's items (appended to, not replacing, what was already shown)
Traces: SC-13 (DATA-004 AC-3)
Check: interact_page

**Scenario**: "Show more" is inert once every product is already loaded
**Given**: The API is reachable and every product is already loaded on the page (`hasMore` false)
**When**: The visitor looks for and, if present, presses the "Show more" control
**Then**: No additional request changes the visible items; the product count stays exactly what it was
Traces: DATA-004 failure table ("`loadMore()` called when `hasMore` is already `false`")
Check: interact_page

**Scenario**: Fixture files are removed, schema stays
**Given**: The repository after this story ships
**When**: The `code/frontend/src/data/` directory is inspected
**Then**: `products.json`, `admins.json`, `settings.json`, `telegram.json` no longer exist; `schema.json` still does
Traces: SC-14 (DATA-004 AC-4)
Check: manual

---

## Contract shape — error envelope and defined-field rule

**Scenario**: Error envelope matches the documented shape
**Given**: No session
**When**: A caller requests `GET /v1/admins`
**Then**: Response body is a JSON object with `error.code`, `error.message`, `error.request_id` present; `error.details` absent (only defined for `MALFORMED_REQUEST` on the two POST endpoints, not here)
Traces: contract (§2.3 error contract)
Check: fetch_url

**Scenario**: No 400 is possible on these GET endpoints — query params only ever default or are ignored
**Given**: The seed has inserted N products
**When**: A visitor calls `GET /v1/products?page=0&limit=0&unknown_field=1`
**Then**: Response is `200`, never `400`; `page` defaults to 1, `limit` defaults to 12, `unknown_field` is ignored
Traces: contract (§3.2 notes — "No `MALFORMED_REQUEST` on this endpoint … there is no caller input that can produce a 400 here")
Check: fetch_url

---

## Notes for TL / open questions

- The story's own scope excludes the `auth` module's login endpoint and
  `cms`'s write endpoint; no case here exercises `POST /v1/auth/login` or
  `POST /v1/products` beyond using login to obtain a session token for the
  admin-gated cases above.
- "Valid admin session" is treated as opaque setup (call login, use the
  token) per the story's own dependency note — this module does not define
  how a session is validated, only that §2.2's shared 401 rule applies to
  `admins`/`telegram`.
- DATA-004's AC-4 (fixture files deleted) is a repository-state fact with no
  HTTP or DOM surface, so it is marked `manual` rather than forced onto an
  instrument that cannot inspect the filesystem.
