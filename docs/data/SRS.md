# SRS — Data

Module: `data`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

Shelf's design reads its records from JSON files (`products`, `telegram`, `admins`) through `src/data/index.ts`. This module moves those records into the database and serves them through a paged API, so the site has real, persistent data instead of files bundled with the frontend. Without it, every screen using `useCollection`/`useRecord` keeps showing fixtures that never change and the owner can never actually add a product.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Visitor | Not signed in, on the public Home page | Read `products` (paged, filtered) — nothing else |
| Admin | Signed-in owner or admin (see `auth` module) | Read `products`, `admins`, `telegram` — scoped to what their role may see |

`admins` and `telegram` are never public. A request to either collection with no valid session is refused; this is a deployment-checked requirement (`orchestrator_deploy_collections.go` fails the deploy if a request with no session gets a 200 from either).

## 3. Scope

**In scope**

- Site data from the database: the `products`, `admins`, `telegram` tables, their migrations and seed data, and the paged read API for all three (public for `products`, authenticated for `admins` and `telegram`).

**Out of scope**

- Writing a new product — belongs to the `cms` module (`POST /v1/products`).
- Checking the submitted password — belongs to the `auth` module (`POST /v1/auth/login`); this module only adds the storage column the `auth` module needs.
- Sending the Telegram message — belongs to the `cms` module; this module only stores and serves the `telegram` row (bot name, group name, chat id) that the `cms` module reads to know where to send.

## 4. Functional requirements

### 4.1 Site data from the database

**Requirement DATA-001 — Products are readable, paged, by anyone**

*As a* visitor, *I want to* see the shop's products with their photo, name, description and price, *so that* I know what is on the shelf without signing in.

Behaviour:

1. A visitor requests `GET /v1/products` with optional `page`, `limit`, and any schema field as a filter (e.g. `name=...`).
2. The system returns `{ items, total, page, limit }`, `items` in the seed's insertion order by default, `limit` capped at 100.
3. A visitor requests `GET /v1/products/<id>`; the system returns that record, or 404 if no product has that id.
4. No session is required for either request.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | The seed has inserted N products | A visitor with no session calls `GET /v1/products?page=1&limit=12` | The response is 200 with up to 12 items, `total` = N, `page` = 1, `limit` = 12 |
| AC-2 | A product with id `p1` exists | A visitor with no session calls `GET /v1/products/p1` | 200 with that record's fields (name, note, price, image, added) |
| AC-3 | No product has id `missing` | A visitor calls `GET /v1/products/missing` | 404 |
| AC-4 | 130 products exist | A visitor calls `GET /v1/products?limit=500` | The server caps the page at 100 items, not 500 |

**Requirement DATA-002 — Admins and the Telegram target are never public**

*As the* system, *I want to* refuse `admins` and `telegram` reads to anyone without a session, *so that* admin identities and the bot's target chat are never exposed to a visitor.

Behaviour:

1. A caller with no session requests `GET /v1/admins`, `GET /v1/admins/<id>`, `GET /v1/telegram`, or `GET /v1/telegram/<id>`.
2. The system responds 401 to every one of those requests — never 200, regardless of query parameters.
3. A caller with a valid admin session requests the same endpoints; the system returns the full rows (there is one role level in this product — `owner` and `admin` both administer, per the brief: "Who signs in: the owner and admins only" — so both see the same scope).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | No session | A caller requests `GET /v1/admins` | 401 |
| AC-2 | No session | A caller requests `GET /v1/telegram` | 401 |
| AC-3 | No session | A caller requests `GET /v1/admins/<id>` for a real id | 401, not 200 and not 404 — the row's existence is not revealed to an unauthenticated caller |
| AC-4 | A valid admin session | The admin requests `GET /v1/admins` | 200 with every admin row |
| AC-5 | A valid admin session | The admin requests `GET /v1/telegram` | 200 with the telegram row(s) |

**Requirement DATA-003 — No private field leaks through the public products read**

*As the* system, *I want to* select only public fields for an unauthenticated `products` read, *so that* a field schema.json does not mark private is the only thing a visitor ever receives.

Behaviour:

1. `schema.json`'s `products` collection fields (`name`, `note`, `price`, `image`, `added`) carry no `"private": true` flag; none is a bank account, licence, or similar field. The public `SELECT` therefore returns all five, unchanged from today's JSON shape.
2. If a private field is ever added to `products`, the public endpoint's query excludes it at the SQL level, not in the frontend.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | The current `products` schema (no private fields) | A visitor requests `GET /v1/products` | The response contains exactly `id, name, note, price, image, added` (plus `_source`), nothing more |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | `page` or `limit` is not a positive integer | Treated as the default (`page=1`, `limit=12`); not a 400 — the existing frontend contract never sends an invalid value, and a stray one should not break the list |
| Boundary | `limit` requested above 100 | Capped at 100 — DATA-001 AC-4 |
| Not found | `GET /v1/<collection>/<id>` for an id that does not exist | 404 |
| Not permitted | `admins` or `telegram` requested with no session | 401 — DATA-002 |
| Not permitted | `admins` or `telegram` requested with a session that is not a valid admin's (e.g. a forged/expired token) | 401, same as no session |
| Conflict | Two admins reading the same collection at once | Not applicable: these are read-only endpoints in this module; no concurrent write is specified here |
| Upstream failure | Database unavailable | 500-class response; the frontend's existing `error` state in `useCollection` is populated, matching the design's already-built loading/error contract |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| products.id | text | yes | primary key, from the seed's existing ids |
| products.name | text | yes | — |
| products.note | text | yes | short description |
| products.price | numeric | yes | USD, per `schema.json`'s `currency` |
| products.image | text | no | URL/path |
| products.added | text | yes | ISO date, used for default ordering |
| admins.id / email / name / role | text | yes | seeded from `admins.json`; `email` unique |
| telegram.id / bot / group / chat_id | text | yes | seeded from `telegram.json` |

### 4.2 Frontend data client

**Requirement DATA-004 — `useCollection` and `useRecord` read the API, unchanged for components**

*As a* component author, *I want to* keep calling `useCollection`/`useRecord` exactly as today, *so that* no page needs to change when the backend lands.

Behaviour:

1. `src/data/index.ts` is rewritten to call `GET <base>/v1/<name>?page=&limit=&<field>=<value>` and `GET <base>/v1/<name>/<id>`, `base` = `import.meta.env.VITE_API_URL ?? "/api"`.
2. `useCollection` fetches the first page on mount and appends the next page on `loadMore()`; it exposes real `loading` and `error` states instead of the current fixed zero-delay timeout.
3. `useRecord` fetches one record and exposes `loading`/`error` the same way.
4. Every export (`useCollection`, `useRecord`, `schema`, the `Row`/`Field`/`Collection` types) keeps the same name and the same return shape.
5. `schema.json` stays; `admins.json`, `products.json`, `settings.json`, `telegram.json` are deleted once the API is live.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | The API is reachable | Home mounts and calls `useCollection<Product>("products", {...})` | The hook returns `items`/`total` from the API's response, with `loading: true` until the response arrives |
| AC-2 | The API returns an error | A component calls `useCollection` | `error` is set and `loading` becomes `false`; no component code changes to handle it beyond what the design already renders |
| AC-3 | `loadMore()` is called | The shelf's "Show more" button is clicked | The next page is fetched and appended to `items` |
| AC-4 | The repository after this story ships | — | `src/data/products.json`, `admins.json`, `settings.json`, `telegram.json` no longer exist; `schema.json` still does |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Upstream failure | The API is unreachable or returns a non-2xx status | `error` is populated, `loading` is `false`, `items` stays whatever was last loaded (empty on first load) — matches the existing loading/error affordance already built into Home and CmsProducts |
| Boundary | `loadMore()` called when `hasMore` is already `false` | No request is made; `items` unchanged |

**Data touched** — none beyond §4.1; this is the client contract for the same fields.

## 5. Screens

This module has no screen of its own; it is the data layer behind screens specified in `site`, `auth` and `cms`. No row is added here to avoid duplicating those.

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | `GET /v1/products` responds within 1s at 1 Mbps, cold cache, for up to 500 seeded rows |
| Privacy | `admins` rows (email, name, role) and `telegram` rows (bot, group, chat_id) are never returned to a caller with no session — DATA-002 |

## 7. Dependencies and assumptions

- **Depends on:** nothing inside this repo; it is the base the `auth`, `cms` and `site` modules read from.
- **Assumption:** the seed migration inserts every record currently in `src/data/products.json`, `admins.json`, `telegram.json` exactly as it is (ids, values, `_source`) — none renamed, re-priced or dropped.

| Open question | Proposed default | Who decides |
|---|---|---|
| — | — | Not applicable: no undecided point remains for this module |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Site data from the database | DATA-001, DATA-002, DATA-003, DATA-004 | `test-cases/site-data-from-the-database.md` |
