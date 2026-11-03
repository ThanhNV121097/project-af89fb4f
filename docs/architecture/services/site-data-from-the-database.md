# Service extension — Site data from the database

Story: `docs/data/stories/site-data-from-the-database.md`
Extends: `docs/architecture/services.md` §3.2, §3.3, §3.5, §3.6, §3.7, §3.8
(all six endpoints already specified there in full) and the cross-cutting
contract (§2.2 auth, §2.3 errors, §2.4 pagination, §2.5 validation) — this
story is what implements those six handlers plus the frontend data client;
it introduces no endpoint and no error code the shared document does not
already name.

## Endpoints this story implements

Already fully specified in `docs/architecture/services.md`; restated here
only to confirm this story builds exactly what is there, with no departure:

| Endpoint | Auth | Traces to | services.md § |
|---|---|---|---|
| `GET /v1/products` | none (public) | DATA-001, DATA-003 | §3.2 |
| `GET /v1/products/{id}` | none (public) | DATA-001 | §3.3 |
| `GET /v1/admins` | Bearer JWT, any valid admin | DATA-002 AC-4 | §3.5 |
| `GET /v1/admins/{id}` | Bearer JWT, any valid admin | DATA-002 AC-3 | §3.6 |
| `GET /v1/telegram` | Bearer JWT, any valid admin | DATA-002 AC-5 | §3.7 |
| `GET /v1/telegram/{id}` | Bearer JWT, any valid admin | DATA-002 | §3.8 |

`POST /v1/auth/login` (§3.1) and `POST /v1/products` (§3.4) belong to the
`auth` and `cms` modules respectively — out of scope here, per the story's
own "Out of scope" section.

## Authorization — restated, no new rule

One role level: `owner` and `admin` see the same scope (`services.md` §2.2,
DATA-002 AC-4/AC-5, AUTH SRS §3 — "the owner and admins only", no finer
grain). The middleware this story attaches to `/v1/admins*` and
`/v1/telegram*` checks *"is there a valid token"* only, never `role` — same
rule already fixed for `POST /v1/products` in the `owner-admin-sign-in`
service extension. No `403` exists anywhere in this project's error catalog
(`services.md` §2.3) and none is introduced here: a caller either has a
valid token (200, full rows — this module has no narrower "their own"
scope, since `admins` and `telegram` are not owned per-row by anyone) or
does not (401).

`GET /v1/admins/{id}` and `GET /v1/telegram/{id}` check the token **before**
the row lookup, so a missing/invalid token on an id that does not exist
still answers `401`, never `404` — existence is never revealed to an
unauthenticated caller (DATA-002 AC-3, `services.md` §3.6).

### JWT verification is self-contained in this story (no dependency on the `auth` story landing first)

Per the project's own cross-cutting contract (`services.md` §2.2), a JWT is
self-contained: HS256, signed with `JWT_SIGNING_SECRET`, claims
`sub/email/name/role/iat/exp`. This story's middleware decodes, checks the
signature and `exp` against that same env var — it does not call the
`auth` module's login handler or a session store, so it can be built and
tested with a hand-signed token fixture before `POST /v1/auth/login` exists.
The `auth` story's login handler mints tokens of the same shape later; both
stories verify against the one shared secret and claims contract, so a
token from either is valid everywhere. (Recorded already in project memory
as `auth.data-module-jwt-verification-independent`.)

## `SELECT` column lists (no private field exists, enforced at the query)

- `products` read (public): `SELECT id, name, note, price, image, added FROM products` — `seq` is never selected (internal ordering tiebreaker only, `erd.md` §3.1). No column in `schema.json`'s `products` entry is marked `"private": true` today (DATA-003 behaviour 1), so this is the full field set; if a private field is ever added, it is dropped from this column list, not filtered in the frontend.
- `admins` read (authenticated only): `SELECT id, email, name, role FROM admins` — `password_hash` is never selected by this story's query, regardless of caller, matching `services.md` §3.5's own note.
- `telegram` read (authenticated only): `SELECT id, bot, "group", chat_id FROM telegram` — `"group"` quoted, reserved word (`erd.md` §3.3).

## Pagination — restated, no new rule

All six endpoints use the one envelope and the one offset scheme already
fixed in `services.md` §2.4: `{ items, total, page, limit }`, `page`
defaults to 1, `limit` defaults to 12 (100 for `/v1/admins` and
`/v1/telegram`, per §3.5/§3.7 — "rare, admin tooling only"), clamped (not
rejected) at 100, invalid `page`/`limit` default rather than `400`. Filter:
any of that collection's own schema fields as an exact-match query
parameter; unknown query parameters ignored. No `sort` or `q` parameter.

## Errors — restated, no additions

| Code | HTTP | Used by this story for |
|---|---|---|
| `UNAUTHENTICATED` | 401 | missing/invalid/expired/forged token on any `/v1/admins*` or `/v1/telegram*` request |
| `NOT_FOUND` | 404 | `GET /v1/products/{id}` with no matching row; `GET /v1/admins/{id}` or `GET /v1/telegram/{id}` with no matching row **and** a valid token |
| `INTERNAL` | 500 | database unavailable on any of the six reads |

`GET /v1/products` and `GET /v1/products/{id}` carry no `MALFORMED_REQUEST`
case — no caller input to either can produce a 400 (`services.md` §3.2's
own note: unknown query params are ignored, `page`/`limit` only default).
`GET /v1/admins*` and `GET /v1/telegram*` take no request body and no query
parameter the contract defines beyond the shared pagination/filter ones, so
the same holds for them. No new error code.

## Frontend data client (DATA-004)

`code/frontend/src/data/index.ts` is rewritten, not extended with a new
file — it already exports `useCollection`, `useRecord`, `schema`, and the
`Row`/`Field`/`Collection` types, all kept with the same names and return
shapes (DATA-004 behaviour 4):

- Base URL: `import.meta.env.VITE_API_URL ?? "/api"` (already fixed,
  `services.md` §2.1, `overview.md` §5/§6).
- `useCollection(name, { page, limit, where })` calls `GET
  <base>/v1/<name>?page=&limit=&<field>=<value>` for each field in `where`;
  first page on mount, `loadMore()` appends the next page; real
  `loading`/`error` replace today's fixed-timeout mock.
- `useRecord(name, id)` calls `GET <base>/v1/<name>/<id>`; same
  `loading`/`error` shape.
- A non-2xx response populates `error` (an `Error` built from the response's
  `error.code`/`error.message`), `loading` becomes `false`, `items`/`record`
  stay whatever was last loaded — matches the existing Home/CmsProducts
  loading/error affordance (DATA SRS §4.2 failure table), no component
  change.
- `loadMore()` is a no-op once `hasMore` is `false` (`total` already
  reached) — no request made.

No mock file exists for this story to delete (`UI scope: None`); the four
JSON fixtures (`products.json`, `admins.json`, `settings.json`,
`telegram.json`) are deleted once this story's backend is live, `schema.json`
stays (DATA-004 AC-4).

## Migration plan

None — this story ships no SQL migration; see the ERD extension
(`docs/architecture/erd/site-data-from-the-database.md`) for the same
statement against the schema. The three tables and their seed data already
exist (`0001`–`0003`, shipped).

## Requirement coverage

| Requirement | Endpoint(s) | Note |
|---|---|---|
| DATA-001 | `GET /v1/products`, `GET /v1/products/{id}` | |
| DATA-002 | `GET /v1/admins`, `GET /v1/admins/{id}`, `GET /v1/telegram`, `GET /v1/telegram/{id}` | 401 unconditional on no/invalid token, 200 full rows for any valid admin (one role level) |
| DATA-003 | `GET /v1/products` | enforced by the `SELECT` column list, above |
| DATA-004 | all six, via `src/data/index.ts` | frontend data-client rewrite, no new contract |
