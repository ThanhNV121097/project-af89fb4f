# ERD extension — Site data from the database

Story: `docs/data/stories/site-data-from-the-database.md`
Extends: `products`, `admins`, `telegram` (all three defined in full already,
`docs/architecture/erd.md` §3.1–§3.3)

## Change

None. This story adds no table and no column.

The three tables this story serves — `products`, `admins`, `telegram` — are
already created and seeded by the shipped migrations
`0001_create_products.up.sql` through `0003_create_telegram.up.sql`, and
already fully specified in the project-wide ERD (`erd.md` §3.1–§3.3): types,
nullability, constraints, indexes, lifecycle. This story's job is the read
API over that existing schema and the frontend data-client rewrite — no
schema change belongs to it.

Confirmed against the shipped migrations read directly:

- `products(id, name, note, price, image, added, seq)` — matches `erd.md`
  §3.1 exactly, `ck_products_price_positive` present via inline `CHECK`.
- `admins(id, email, name, role)` — matches `erd.md` §3.2 exactly;
  `password_hash` is correctly absent here (added later by the `auth`
  module's own `0004` migration, already recorded in `erd.md` §8/§9 and
  the `owner-admin-sign-in` ERD extension).
- `telegram(id, bot, "group", chat_id)` — matches `erd.md` §3.3 exactly.

## Mock shape read and judged

This story has no UI pull request (`docs/data/stories/site-data-from-the-database.md`
"UI scope: None" — it is a data-layer rewrite behind screens other stories
own) — so there is no mock module to read, per the story's own step 2 note.
The shape to build against is instead `src/data/index.ts`'s current
JSON-backed contract (`useCollection`, `useRecord`, `schema`, `Row`/`Field`/
`Collection` types) and DATA SRS §4.2 — already fully reflected in
`docs/architecture/services.md` §2.4 (envelope: `{ items, total, page,
limit }`) and §3.2–§3.8 (the six read endpoints), decided before this task
by whoever wrote the shared contract. Nothing here departs from it.

## No new entity, no new column

- No field the frontend needs is missing from the existing schema: Home,
  Login and the CMS list all read fields already present in `products` /
  `admins` / `telegram` per `schema.json`.
- No private-field flag exists in `schema.json` today (`erd.md` §7, DATA-003
  behaviour 1) — the public `products` `SELECT` names its columns
  explicitly (`id, name, note, price, image, added`), never `SELECT *`, so a
  future private column is excluded at the query, not filtered later.
- `admins` and `telegram` have no public read at all (DATA-002) — covered in
  the service extension below, not a schema concern.

## Migration plan

| # | Change | Forward | Backward | Safe on populated table |
|---|---|---|---|---|
| — | none | — | — | n/a — this story ships no migration file; `0001`–`0003` already shipped and are unchanged by this work |

No new migration number is claimed by this story. The next available slot
(`0004`) stays reserved for the `auth` module's `password_hash` migration,
already recorded in `erd.md` §8 and the `owner-admin-sign-in` ERD extension.
