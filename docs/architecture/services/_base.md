
# Service & Interface Design — Shelf

Last updated: 2026-11-03
Source: `docs/auth/SRS.md`, `docs/cms/SRS.md`, `docs/data/SRS.md`, `docs/site/SRS.md`, `docs/architecture/erd.md`, `docs/architecture/overview.md`

## 1. Service map

```mermaid
flowchart LR
    Browser[Vite/React frontend] -->|HTTPS / JSON + multipart| API[Go API service]
    API -->|SQL| DB[(PostgreSQL)]
    API -->|HTTPS| TG[Telegram Bot API]
    API -->|local disk| IMG[/images/products/*]
```

| Service | Responsibility | Owns (tables) | Depends on | Deploy unit |
|---|---|---|---|---|
| `backend` (Go, `cmd/api`) | Everything behind the API: sign-in, product reads/writes, admin/telegram reads, the Telegram notification | `products`, `admins`, `telegram` | PostgreSQL, Telegram Bot API, local disk under `/images/products/` | single container, per `docker-compose.yml` / `deploy.yml` |

**Why these boundaries** — single service: no boundary justified yet. Three
tables, eight endpoints, one small shop; the architecture overview already
rejected a router and a migration library on the same reasoning. `auth`,
`cms` and `data` are SRS *modules* (how the requirements are organised), not
service boundaries — they compile into the same `cmd/api` binary and deploy
together. Splitting them would buy independent scaling or deploy cadence
that nothing here asks for.

Every ERD entity is owned by this one service — nothing else reads or writes
`products`, `admins` or `telegram` directly.

## 2. Cross-cutting contract

### 2.1 Base

- Base URL: the backend's own routes, **without** `/api` — `http://localhost:8080/v1/...` in dev, mounted the same way in production. The deploy proxy (Caddy, `deploy.yml`) strips `/api` before forwarding, and the frontend's `VITE_API_URL` fallback (`/api`) already assumes this; every path below is written as the backend mounts it.
- Content type: `application/json; charset=utf-8` for every request and response **except** `POST /v1/products`, which the frontend sends as `multipart/form-data` because it carries an optional file.
- Versioning: URL path major version (`/v1`). A new major version only for a breaking change — see §8. One version lives at a time (One-Version Rule): this project has no consumer yet to keep an old version running for.
- Trace header: `X-Request-Id` accepted from the caller if present, generated otherwise, echoed on the response and present on every log line for that request.

### 2.2 Authentication and authorization

| Aspect | Decision |
|---|---|
| Mechanism | Signed JWT (HS256), issued by `POST /v1/auth/login` |
| Claims | `sub` (admin id), `email`, `name`, `role`, `iat`, `exp` — exactly the three fields AUTH-001 says the session names, plus what a JWT needs to be a JWT |
| Token lifetime | 24h. No "remember me" tiers — the brief has one kind of signed-in visitor and AUTH SRS's own NFR asks for nothing longer |
| Refresh | None. An expired token is treated exactly like "no session" (AUTH-003's failure table: "one status for session present but not good, never 403") — the admin signs in again. No refresh endpoint exists because no screen in the approved design asks for one |
| Transport | `Authorization: Bearer <token>` on every request to a gated endpoint |
| Signing secret | `JWT_SIGNING_SECRET`, an env var generated at deploy time (not a third-party credential — nobody outside this project issues it), listed in the backend's `.env.example` |
| Roles | `owner` and `admin` carry the same access in this release (AUTH SRS §3, DATA-002 AC-4/5: "both see the same scope") — the middleware checks *"is there a valid token"*, never the role. `role` rides in the token and the response bodies only so the UI can show it; no endpoint branches on its value |
| Enforcement point | One middleware wrapping every handler under `/v1/products` (POST only), `/v1/admins`, `/v1/telegram`. `GET /v1/products*` and `POST /v1/auth/login` are mounted outside it — they are public by requirement (DATA-001, AUTH §2) |

A request with no `Authorization` header, a header that is not `Bearer <jwt>`,
or a JWT that fails signature check or `exp` check, is **all** the same case
to the middleware: `401 UNAUTHENTICATED`. This is AUTH-003 / CMS-003 /
DATA-002's shared rule, written once here instead of three times.

### 2.3 Error contract

Every non-2xx response, from every endpoint, has this shape:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Human-readable summary, safe to show a user.",
    "details": [
      { "field": "price", "code": "INVALID", "message": "Price must be greater than 0." }
    ],
    "request_id": "01HX…"
  }
}
```

`details` is present only for `MALFORMED_REQUEST` on `POST /v1/products` and
`POST /v1/auth/login`, where more than one field can be wrong at once; every
other error omits it. Consumers branch on `code`, never on `message` — the
frontend's current contract (`useCollection`/`useRecord`'s `error: Error |
null`) only needs to know *that* a call failed, so even this much is headroom
for the day a screen wants to say more than "something went wrong".

**Error catalog** — the full closed set for this project. Kept to exactly
the statuses the four SRS documents actually name; no `422`, `403`, `409` or
`429` appears in any acceptance criterion or failure table, so none is
defined. See §2.5 and the CMS-001/CMS-003 notes in §3 for why validation
failures are `400`, not the more common `422`.

| Code | HTTP | Meaning | Retryable |
|---|---|---|---|
| `MALFORMED_REQUEST` | 400 | Body is not valid JSON, a field has the wrong type, a field is missing or blank where required, a value breaks a stated rule (price ≤ 0, photo wrong type/too large), or the body carries a field this contract does not define | no |
| `UNAUTHENTICATED` | 401 | No token, or a token that is invalid, expired or forged — AUTH-003/CMS-003/DATA-002's shared rule | no |
| `NOT_FOUND` | 404 | No row with that id, for a caller allowed to know whether it exists | no |
| `INTERNAL` | 500 | Unexpected failure — a query, insert or file write that failed, or the Telegram call failing is specifically **not** this (see CMS-002 note in §3) | yes |

### 2.4 Pagination

**Deviates from `api-conventions.md`'s cursor default on purpose.** DATA-001
and DATA-004 fix the exact shape the frontend's `src/data/index.ts` already
calls: `GET /v1/<name>?page=&limit=&<field>=<value>` →
`{ items, total, page, limit }`, a bare collection object, not `{ "data": [...] }`.
Offset pagination over three small, rarely-written tables (at most a few
hundred rows — §6 of the ERD) has no drift problem cursor pagination exists
to solve, and rewriting the already-approved frontend contract to fit the
generic convention would be the tail wagging the dog. Recorded here as the
deliberate exception the convention doc asks for.

```
GET /v1/products?page=1&limit=12&name=lamp
```

```json
{ "items": [ { "id": "kitchen-scale", "name": "Kitchen scale", "note": "…", "price": "24.00", "image": "/images/products/kitchen-scale.jpg", "added": "2026-09-01" } ], "total": 12, "page": 1, "limit": 12 }
```

| Aspect | Decision |
|---|---|
| Style | offset (`page`, 1-based) |
| Default `page` | 1 |
| Default `limit` | 12 |
| Max `limit` | 100 — DATA-001 AC-4 |
| Over the max limit | **clamped to 100**, not rejected — DATA-001 AC-4 says the server "caps the page at 100 items, not 500"; this is the opposite of the convention doc's "never clamp" default, forced by the literal acceptance criterion |
| `page`/`limit` not a positive integer | **defaulted** to `page=1`/`limit=12`, not a `400` — DATA-001's own failure table: "not a 400 — a stray value should not break the list" |
| Default sort | insertion order (`seq` ascending) — DATA-001 behaviour 2. No `sort` or `q` query parameter exists on this backend: DATA-001 and DATA-004's own behaviour list only ever name `page`, `limit`, and per-field filters: stdlib `ServeMux` and a literal field-by-field `WHERE` is simpler than two features nothing asks for. |
| Filtering | any of a collection's own columns (`name`, `note`, `price`, `image`, `added` for `products`) as an exact-match query parameter, e.g. `?name=Kitchen+scale`. An unknown query parameter is ignored, not rejected — it is not part of the request *body* schema §2.5 polices, and the existing frontend only ever sends known field names. |

### 2.5 Validation boundary

External input is validated **at the HTTP handler**, before any SQL runs —
the one layer in `cmd/api` that sees the raw request. Code below that layer
(the `database/sql` calls) trusts its inputs completely; it does not
re-check a price or an email a handler already checked.

A field the request body defines that this contract does not — an extra key
in the login or product-create JSON/multipart body — is rejected with `400
MALFORMED_REQUEST`, never silently accepted. Query parameters are the one
exception, per §2.4: an unrecognised one is ignored, because `products`'
filter-by-any-column shape has no fixed list of "the" query parameters to be
strict about, and DATA-001's own failure table says a stray paging value
must not break the list.

### 2.6 Idempotency

No endpoint in this project accepts an `Idempotency-Key`. `POST
/v1/products` is the only unsafe endpoint with a retry concern, and CMS-003's
own failure table rules retries out: "no retry is built since the design has
no retry affordance" for the Telegram leg, and a second identical submit
from the form is a second product, by design (CMS-001's own failure table:
"each submission creates its own independent row; there is no shared record
being edited"). `POST /v1/auth/login` is naturally idempotent — it only
reads and signs, never writes.

## 3. Endpoints

### 3.1 `POST /v1/auth/login`

**Purpose** — exchange an admin's email and password for a session token.
**Traces to** — AUTH-001, AUTH-002. **Auth** — none (this is how a session is obtained).

**Request body**

```json
{ "email": "owner@example.com", "password": "correct-horse" }
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `email` | string | yes | non-empty; matched case-insensitively against `admins.email` | AUTH-001 behaviour 2 |
| `password` | string | yes | non-empty; compared against `admins.password_hash` | never logged |

**Success response** — `200`

```json
{ "token": "eyJhbGciOiJIUzI1NiJ9...", "email": "owner@example.com", "name": "Brian Ng", "role": "owner" }
```

| Field | Type | Nullable | Description |
|---|---|---|---|
| `token` | string | no | JWT, `Authorization: Bearer <token>` on later requests |
| `email` | string | no | the matched admin's email |
| `name` | string | no | the matched admin's name, or the email-derived fallback the design already computes (AUTH data table) — computed server-side here so the frontend's existing fallback logic has nothing left to do |
| `role` | string | no | `owner` or `admin` |

**Errors**

| Code | HTTP | Trigger |
|---|---|---|
| `MALFORMED_REQUEST` | 400 | Body is not valid JSON, `email`/`password` missing or blank, or an undefined field is present |
| `UNAUTHENTICATED` | 401 | No admin row matches the email, or the password does not match — AUTH-002: one status for both, no distinction in the response |
| `INTERNAL` | 500 | Database unavailable while looking up the row — AUTH's own failure table |

**Notes** — no rate limiting is specified (AUTH SRS names no NFR for it and
the convention's `429` is not in this project's catalog); revisit if the
login screen is ever reachable from the open internet without other
protection. No idempotency concern — read-only against `admins`.

---

### 3.2 `GET /v1/products`

**Purpose** — the public, paged product listing. **Traces to** — DATA-001,
DATA-003, SITE-001, SITE-002. **Auth** — none (public).

**Query parameters**

| Name | In | Type | Required | Constraints | Description |
|---|---|---|---|---|---|
| `page` | query | integer | no | defaults to 1 if absent, zero, negative, or not an integer | DATA-001 behaviour 1 |
| `limit` | query | integer | no | defaults to 12; clamped to 100 if larger; defaults to 12 if absent, zero, negative, or not an integer | DATA-001 AC-4 |
| `name`, `note`, `price`, `image`, `added` | query | string | no | exact match (case-insensitive for text fields) against that column | the existing frontend's `where` filter shape |

**Success response** — `200`

```json
{
  "items": [
    { "id": "kitchen-scale", "name": "Kitchen scale", "note": "Brass weights, walnut tray.", "price": "24.00", "image": "/images/products/kitchen-scale.jpg", "added": "2026-09-01" }
  ],
  "total": 12,
  "page": 1,
  "limit": 12
}
```

| Field | Type | Nullable | Description |
|---|---|---|---|
| `items[].id` | string | no | |
| `items[].name` | string | no | |
| `items[].note` | string | no | |
| `items[].price` | string | no | decimal as a string (`numeric(12,2)` wire-encoded as text — see §8, avoids float precision loss) |
| `items[].image` | string | no | path, or `""` when no photo — DATA-003 AC-1 lists exactly these five fields plus `id`, nothing a private-field flag would exclude |
| `items[].added` | string | no | ISO date |
| `total` | integer | no | every matching row, not just the loaded page — SITE-001 AC-2 |
| `page` | integer | no | the page actually served, after defaulting/clamping |
| `limit` | integer | no | the limit actually served, after defaulting/clamping |

**Errors**

| Code | HTTP | Trigger |
|---|---|---|
| `INTERNAL` | 500 | Database unavailable — DATA-001's failure table |

No `MALFORMED_REQUEST` on this endpoint: every query parameter either
matches a known column or is silently ignored (§2.5), and `page`/`limit`
never reject, only default (§2.4) — so there is no caller input that can
produce a 400 here.

**Notes** — no auth required, ever; this is the one read DATA SRS fixes as
public.

---

### 3.3 `GET /v1/products/{id}`

**Purpose** — a single product by id. **Traces to** — DATA-001 behaviour 3.
**Auth** — none (public).

**Path parameters**

| Name | In | Type | Required | Constraints | Description |
|---|---|---|---|---|---|
| `id` | path | string | yes | — | `products.id` |

**Success response** — `200` — same per-item shape as §3.2's `items[]`.

**Errors**

| Code | HTTP | Trigger |
|---|---|---|
| `NOT_FOUND` | 404 | No product with that id — DATA-001 AC-3 |
| `INTERNAL` | 500 | Database unavailable |

---

### 3.4 `POST /v1/products`

**Purpose** — add a product; stores the row and sends the Telegram
notification. **Traces to** — CMS-001, CMS-002, CMS-003. **Auth** — Bearer
JWT, any valid admin.

**Request body** — `multipart/form-data`

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | text part | yes | non-empty | CMS-001 behaviour 2 |
| `note` | text part | yes | non-empty | short description |
| `price` | text part | yes | parses as a number > 0 | CMS-001 behaviour 2, ERD `ck_products_price_positive` |
| `image` | file part | no | content type `image/jpeg`, `image/png` or `image/webp`; ≤ 5MB | CMS-001 behaviours 3–4, CMS's failure table |

Any other part name present in the body is rejected (§2.5's undefined-field
rule, applied to multipart parts the same way as JSON fields).

**Success response** — `201`, `Location: /v1/products/{id}`

```json
{ "id": "lamp-04", "name": "Brass desk lamp", "note": "Rewired, new switch.", "price": "38.00", "image": "/images/products/lamp-04.jpg", "added": "2026-11-03" }
```

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | string | no | server-assigned, used for the image path too |
| `name` / `note` / `price` / `image` / `added` | — | no | as stored — CMS-001 behaviour 6, same per-item shape as §3.2 |

The response body says nothing about the Telegram send — CMS-002 governs
that separately, below, so a slow or failed Telegram call never changes
this endpoint's status code or body (CMS-002 AC-2: the save is never rolled
back for a Telegram failure, and the *response* is the saved row either
way). The frontend's own `saved-notice` copy about the Telegram outcome
comes from §3.5, called right after, not from this response — see the
Notes below.

**Errors**

| Code | HTTP | Trigger |
|---|---|---|
| `MALFORMED_REQUEST` | 400 | Body is not valid `multipart/form-data`; `name`/`note` missing or blank; `price` missing, non-numeric, or ≤ 0; `image` part present with a content type outside the three allowed, or over 5MB; an undefined part name is present — CMS-003's failure table, CMS-001 AC-3 |
| `UNAUTHENTICATED` | 401 | No token, or an invalid/expired/forged token — CMS-003 AC-1/AC-2 |
| `INTERNAL` | 500 | Database unavailable while inserting, or the photo file could not be written to disk — nothing is saved, no Telegram attempt is made (CMS's own failure table: "there is nothing to notify about") |

**Notes** — not idempotent by design (§2.6): two identical submissions
create two rows. The Telegram send is **synchronous but decoupled from the
save's outcome**: see §5 for the call itself. This endpoint's own job ends
at "row written, id assigned, response returned" — the frontend fires
`POST /v1/products`, gets back the saved row (what this section
specifies), and the UI's `saved-notice` about Telegram comes from reading
`telegram_sent` in this very same response — folded in rather than a
second round-trip, since CMS-002 AC-2/AC-3 both describe a single save
action with two outcomes to report. Revised shape below.

**Success response, revised** — `201`, `Location: /v1/products/{id}`

```json
{
  "id": "lamp-04", "name": "Brass desk lamp", "note": "Rewired, new switch.",
  "price": "38.00", "image": "/images/products/lamp-04.jpg", "added": "2026-11-03",
  "telegram_sent": true
}
```

| Field | Type | Nullable | Description |
|---|---|---|---|
| `telegram_sent` | boolean | no | `true` once the Telegram API accepted the message, `false` on any failure (bad token, network, group unreachable) — CMS-002 AC-2/AC-3. Drives the `saved-notice` text the frontend already renders. |

This is additive over the "Notes" draft above purely as a documentation
step — there is only one real response shape for this endpoint, the one
with `telegram_sent`; it is specified in full in §5's description of the
Telegram call's effect on this response.

---

### 3.5 `GET /v1/admins`

**Purpose** — list admin rows. **Traces to** — DATA-002 AC-4. **Auth** —
Bearer JWT, any valid admin.

**Success response** — `200`

```json
{ "items": [ { "id": "owner", "email": "brian.ng.2305@gmail.com", "name": "Brian Ng", "role": "owner" } ], "total": 1, "page": 1, "limit": 100 }
```

Same envelope as §3.2/§2.4 — `limit` defaults to 100 for this endpoint since
DATA SRS calls it "rare, admin tooling only" over at most a handful of rows
(ERD §6); no caller needs to page a table that short. `password_hash` is
never included in this response — it is not one of the fields DATA SRS's
data table lists this read as returning, and the catalog's own privacy rule
(DATA SRS §6, ERD §7) is enforced by the `SELECT` leaving it out.

**Errors**

| Code | HTTP | Trigger |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No token, or invalid/expired/forged — DATA-002 AC-1 |
| `INTERNAL` | 500 | Database unavailable |

---

### 3.6 `GET /v1/admins/{id}`

**Purpose** — one admin row. **Traces to** — DATA-002 AC-3. **Auth** —
Bearer JWT, any valid admin.

**Success response** — `200`, same per-item shape as §3.5's `items[]`.

**Errors**

| Code | HTTP | Trigger |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No session, or invalid/expired/forged — **not** `404`, even for an id that does not exist: DATA-002 AC-3 says existence itself is not revealed to an unauthenticated caller, so the unauthenticated case always short-circuits to 401 before any lookup |
| `NOT_FOUND` | 404 | No admin with that id — only reachable with a valid token |
| `INTERNAL` | 500 | Database unavailable |

---

### 3.7 `GET /v1/telegram`

**Purpose** — the Telegram configuration row(s). **Traces to** — DATA-002
AC-5. **Auth** — Bearer JWT, any valid admin.

**Success response** — `200`

```json
{ "items": [ { "id": "group", "bot": "", "group": "", "chat_id": "" } ], "total": 1, "page": 1, "limit": 100 }
```

The bot token itself is **not** `telegram.bot` here — `bot` is the
human-readable bot name/handle the CMS form's preview shows ("Posted to
{group} by the shop's bot" — CmsNewProduct.tsx), matching the ERD's own
column comment ("Bot token/name from @BotFather"). The *secret* the backend
authenticates to the Telegram API with is `TELEGRAM_BOT_TOKEN`, an
environment variable (§5), never stored in this table and never returned by
any endpoint — this is the distinction CMS SRS §6 draws ("The Telegram bot
token is kept server-side as a secret, never sent to the browser").

**Errors**

| Code | HTTP | Trigger |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No session, or invalid/expired/forged — DATA-002 AC-2 |
| `INTERNAL` | 500 | Database unavailable |

---

### 3.8 `GET /v1/telegram/{id}`

**Purpose** — the one Telegram row by id (always `id=group`). **Traces to**
— DATA-002 (symmetry with 3.6; no AC names this one explicitly, but DATA-002
behaviour 1 lists `GET /v1/telegram/<id>` alongside the others it gates).
**Auth** — Bearer JWT, any valid admin.

**Success response** — `200`, same shape as one item of §3.7.

**Errors** — same three as §3.6 (`UNAUTHENTICATED` 401 unconditionally
before lookup, `NOT_FOUND` 404 only past a valid token, `INTERNAL` 500).

**Notes** — no screen in the approved design calls this; it exists because
DATA-002's own requirement text names it. Traces to a requirement about data
protection, not to any UI read.

## 4. Asynchronous work

None. This project has no queue, no scheduled job, and no event. The
Telegram send in §5 is a synchronous outbound call made inline during
`POST /v1/products`'s request, not a background job — CMS-002 behaviour 3
requires the save to complete and be visible regardless of whether the send
later succeeds, which an inline best-effort call already satisfies without
the operational cost of a queue for one call a week (ERD §6: "a handful
added per week by hand").

## 5. External integrations

| System | Purpose | Protocol | Timeout | Retry | On failure | Secrets |
|---|---|---|---|---|---|---|
| Telegram Bot API (`https://api.telegram.org/bot<token>/sendMessage`) | CMS-002's new-product notification | HTTPS POST, JSON body | 5s | none — CMS's failure table: "no retry is built since the design has no retry affordance" | The product row from §3.4 is **already committed** before this call is attempted (CMS-002 AC-2: "the row from CMS-001 stays saved regardless"). `POST /v1/products`'s response still returns `201` with `telegram_sent: false`; the frontend's `saved-notice` shows the "saved, but not sent" wording CMS-002 AC-2 describes. Nothing is retried, queued, or logged for manual resend — out of scope per the approved design having no retry affordance. | `TELEGRAM_BOT_TOKEN` (the bot's token from @BotFather, distinct from the human-readable `telegram.bot` column — see §3.7) |

Call shape: `chat_id` from `telegram` row `id='group'`, `text` =
`"New on the shelf: <name> — <formatted price>"` (CMS-002 behaviour 2,
matching the existing `messageFor` the live preview already builds). If the
`telegram` row's `chat_id` is still the seeded empty string, the call is
attempted and fails exactly like any other Telegram error — there is no
separate "not configured" code, since DATA SRS's own assumption is that the
owner has configured it before this ever matters in production.

This is the one credential this design introduces that the SRS set
("brian.ng.2305@gmail.com" only names the owner's own contact email) never
named by its environment-variable name — requested below.

## 6. Non-functional targets

| Aspect | Target |
|---|---|
| p95 latency (read) | `GET /v1/products` within 1s at 1 Mbps cold cache, up to 500 rows — DATA SRS §6 |
| p95 latency (write) | `POST /v1/products` within 2s at 1 Mbps cold cache, including the Telegram attempt and an optional 5MB photo write — CMS SRS §6 |
| Availability | not specified beyond the above; single small-shop deployment, no SLA stated anywhere in the four SRS documents |
| Rate limit | none — not in any SRS requirement or NFR; no `429` in the error catalog |
| Payload cap | 5MB on the `image` part of `POST /v1/products` — CMS's failure table. No cap stated on JSON bodies; `name`/`note`/`price` are short form fields, no SRS requirement bounds their length beyond non-empty |
| Timeout (inbound) | not specified; left to the runtime's defaults — no SRS requirement names one |

## 7. Observability

- Log fields on every request line: `request_id`, method, path, status,
  duration, and (when authenticated) the admin's `id` — never the password
  or the JWT itself.
- Minimal metrics: request count and error count per endpoint are enough
  for a project this size; no dashboard or alerting is specified by any SRS
  document.
- Never logged: `password` (login request), `password_hash`, the JWT
  signing secret, the Telegram bot token, and the raw bytes of an uploaded
  photo.

## 8. Contract evolution

| Change | Additive or breaking | Migration path |
|---|---|---|
| `price` returned as a string, not a JSON number | n/a — fixed from the start, not a change | Decided now to avoid a later breaking change: a `numeric(12,2)` as a JSON number risks float rounding on a price; string avoids it and the frontend's `formatPrice` already parses a string today |
| Adding `telegram_sent` to `POST /v1/products`'s response | additive | New optional field a client that ignores unknown JSON keys already tolerates; no consumer exists yet to migrate |
| Any future `role`-based gating (ERD §9 open question) | breaking, if it ever changes what `GET /v1/admins` or `POST /v1/products` return per-role | Out of scope for this release — AUTH SRS §3 fixes `role` as unused for gating; revisit this table the day that changes |

## 9. Open questions

| Question | Owner | Blocking |
|---|---|---|
| JWT signing secret rotation policy | TL / ops, at deploy time | no — a fixed `JWT_SIGNING_SECRET` env var is enough for a single small shop; rotating it just signs everyone out, which is an acceptable manual step, not a blocker to build against |
| Telegram bot must already be a member of the shop's group before `chat_id` is real | Owner, outside this system — CMS SRS §7's own assumption | no — the call fails visibly (`telegram_sent: false`) until configured, which is the honest behaviour the SRS already describes for an unset `chat_id` |

## 10. Requirement coverage

| Requirement | Endpoint(s) | Note |
|---|---|---|
| AUTH-001 | `POST /v1/auth/login` | |
| AUTH-002 | `POST /v1/auth/login` | generic 401 |
| AUTH-003 | none (frontend `RequireSignIn`) + `POST /v1/products`'s 401 | page-gate is a frontend concern; the endpoint half is covered by CMS-003 |
| DATA-001 | `GET /v1/products`, `GET /v1/products/{id}` | |
| DATA-002 | `GET /v1/admins`, `GET /v1/admins/{id}`, `GET /v1/telegram`, `GET /v1/telegram/{id}` | |
| DATA-003 | `GET /v1/products` | enforced by the `SELECT`'s column list, §3.2 |
| DATA-004 | `GET /v1/products*` (consumed by `src/data/index.ts`, not a new endpoint) | frontend data-client rewrite, no new contract |
| CMS-001 | `POST /v1/products` | |
| CMS-002 | `POST /v1/products` (`telegram_sent` field) + §5 | |
| CMS-003 | `POST /v1/products` | |
| SITE-001 | `GET /v1/products` | presentation only on top of DATA-001's data — no endpoint of its own |
| SITE-002 | `GET /v1/products` | same — "Show more" is a frontend paging behaviour over the existing endpoint, maps to none new |

Every endpoint above traces to at least one requirement; none exists with no
requirement behind it.

