
# Story — Site data from the database

Module: `data`

## User story

As the **system** (serving the Home, Login and CMS screens), I want the
`products`, `admins` and `telegram` records moved from the bundled JSON
fixtures into the database and served through a paged API, so the site
shows real, persistent data and the owner's CMS additions actually stick.

## In scope

- `products`, `admins`, `telegram` tables, each one column per
  `code/frontend/src/data/schema.json` field, `id` as primary key (text),
  `_source` as a `source` column.
- A migration creating the three tables, and a seed migration inserting
  every record of `products.json`, `admins.json`, `telegram.json` exactly
  as it stands — ids, values, `_source` — per the architecture doc's
  explicit exception: the placeholder blank-email `admin-1` row from
  `admins.json` is **not** seeded (blank `email` cannot satisfy the
  `unique` constraint and was never real data).
- `GET /v1/products` and `GET /v1/products/<id>`: public, no session
  required, paged (`page`, `limit`, capped at 100), filterable by any
  schema field, stable seed-insertion order by default.
- `GET /v1/admins`, `GET /v1/admins/<id>`, `GET /v1/telegram`,
  `GET /v1/telegram/<id>`: same paged/filtered shape, but **401 to any
  caller with no valid admin session**, 200 with full rows to a valid
  admin session. One role level — `owner` and `admin` see the same scope,
  per the brief ("the owner and admins only").
- `src/data/index.ts` rewritten to call the API instead of the bundled
  JSON, keeping every current export (`useCollection`, `useRecord`,
  `schema`, `Row`/`Field`/`Collection` types) and their return shapes;
  `useCollection` adds real `loading`/`error`/`loadMore` backed by actual
  paged fetches, `useRecord` the same for one record.
- Deleting `src/data/admins.json`, `products.json`, `settings.json`,
  `telegram.json` once the API is live. `schema.json` stays.
- No private field in the `products` public `SELECT` — today's schema has
  none, but the query selects columns explicitly so a future private field
  is excluded at SQL level, never filtered in the frontend.

## Out of scope

- Checking a submitted password, issuing or validating a session token —
  `auth` module. This story only adds the storage (`admins` table) that
  `auth` signs against; no `password_hash` column, no login endpoint.
- `POST /v1/products` (creating a product) and sending the Telegram
  message — `cms` module. This story only stores and serves the `telegram`
  row (`bot`, `group`, `chat_id`) that `cms` reads to know where to send.
- Any UI screen. This story has no page of its own — `src/data/index.ts`
  is a data client consumed by Home (`site` module), Login (`auth`
  module) and the CMS pages (`cms` module); it never renders anything
  itself. UI review for this story therefore has nothing to look at beyond
  confirming the existing Home/CMS pages still render against the new
  fetch-backed hooks exactly as before — no new component, no new page.
- Any column beyond what `schema.json` already defines today.


## UI scope

None — see "Out of scope". This story is backend + the data-client rewrite
only. The three screens that read through it (Home, Login, CMS) are built
by their own stories (`site`, `auth`, `cms`) against the design already
approved; this story must not change their markup or components, only what
feeds them.

## Acceptance criteria

SC-1 [DATA-001 AC-1]: Given the seed has inserted N products, when a
visitor with no session calls `GET /v1/products?page=1&limit=12`, then the
response is 200 with up to 12 items, `total` = N, `page` = 1, `limit` = 12.

SC-2 [DATA-001 AC-2]: Given a product with id `p1` exists, when a visitor
with no session calls `GET /v1/products/p1`, then the response is 200 with
that record's fields (`name`, `note`, `price`, `image`, `added`).

SC-3 [DATA-001 AC-3]: Given no product has id `missing`, when a visitor
calls `GET /v1/products/missing`, then the response is 404.

SC-4 [DATA-001 AC-4]: Given 130 products exist, when a visitor calls
`GET /v1/products?limit=500`, then the server caps the page at 100 items,
not 500.

SC-5 [DATA-002 AC-1]: Given no session, when a caller requests
`GET /v1/admins`, then the response is 401.

SC-6 [DATA-002 AC-2]: Given no session, when a caller requests
`GET /v1/telegram`, then the response is 401.

SC-7 [DATA-002 AC-3]: Given no session, when a caller requests
`GET /v1/admins/<id>` for a real id, then the response is 401 — not 200
and not 404; the row's existence is never revealed to an unauthenticated
caller.

SC-8 [DATA-002 AC-4]: Given a valid admin session, when the admin requests
`GET /v1/admins`, then the response is 200 with every admin row.

SC-9 [DATA-002 AC-5]: Given a valid admin session, when the admin requests
`GET /v1/telegram`, then the response is 200 with the telegram row(s).

SC-10 [DATA-003 AC-1]: Given the current `products` schema (no private
fields), when a visitor requests `GET /v1/products`, then the response
contains exactly `id, name, note, price, image, added` (plus `_source`),
nothing more.

SC-11 [DATA-004 AC-1]: Given the API is reachable, when Home mounts and
calls `useCollection<Product>("products", {...})`, then the hook returns
`items`/`total` from the API's response, with `loading: true` until the
response arrives.

SC-12 [DATA-004 AC-2]: Given the API returns an error, when a component
calls `useCollection`, then `error` is set and `loading` becomes `false`,
with no component code changed beyond what the design already renders for
that state.

SC-13 [DATA-004 AC-3]: Given `loadMore()` is called, when the shelf's "Show
more" button is clicked, then the next page is fetched and appended to
`items`.

SC-14 [DATA-004 AC-4]: Given the repository after this story ships, then
`src/data/products.json`, `admins.json`, `settings.json`, `telegram.json`
no longer exist, and `schema.json` still does.

SC-15 [DATA-002]: Given a session that is not a valid admin's (forged or
expired token), when that caller requests `GET /v1/admins` or
`GET /v1/telegram` (collection or by id), then the response is 401, same as
no session.

## Dependencies

- None inside this repo — this is the base `auth`, `cms` and `site` read
  from. It must land (or at minimum its migrations and seed) before those
  three stories' backend stages can run against real data.
- The `auth` module owns session issuance/validation; this story's 401
  checks on `admins`/`telegram` depend on a session-validation mechanism
  existing by the time those endpoints are *exercised* end-to-end, but this
  story's own technical design only needs to define "valid session" at the
  level this module checks it (e.g. a shared session-lookup call) — the
  actual login flow is `auth`'s story.
- Assumes the seed migration inserts every record currently in
  `products.json`, `admins.json` (minus the blank-email placeholder),
  `telegram.json` exactly as is — per the architecture doc and project
  memory `db.schema`.
