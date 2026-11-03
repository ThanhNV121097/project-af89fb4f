# Architecture — Shelf

Shape: **fullstack** — frontend, backend and database all ship.

## 1. Stack

| Part | Choice | Why |
|---|---|---|
| Frontend | Vite 6 + React 18 + TypeScript + Tailwind v3 (already in `code/frontend/`) | Approved design, built and owner-reviewed; not scaffolded by this task |
| Backend | Go 1.25, stdlib `net/http` + `database/sql` | Three endpoints total across the whole plan; a router or framework buys nothing a `ServeMux` doesn't already do |
| DB driver | `github.com/jackc/pgx/v5/stdlib` | Registers as a `database/sql` driver, so the rest of the code stays stdlib; rejected `lib/pq` — unmaintained since 2022 |
| Database | PostgreSQL 16 | Fixed by `docker-compose.yml` |
| Migrations | Hand-rolled: embedded `.sql` files + a `schema_migrations` table, no library | `golang-migrate` would be one more dependency for "read a directory, run what's new" — a dozen lines of stdlib do it |

## 2. Layout

```
code/backend/
  go.mod                        module github.com/ThanhNV121097/project-af89fb4f/backend
  cmd/api/main.go                entrypoint: connect, migrate, /healthz, listen
  migrations/
    migrations.go                 //go:embed *.sql  (embed lives beside what it embeds)
    0001_create_products.up.sql / .down.sql
    0002_create_admins.up.sql   / .down.sql
    0003_create_telegram.up.sql / .down.sql
  .env.example
code/frontend/                   the approved design — untouched except .env.example
```

Backend has exactly one `main` package (`cmd/api`), per the Dockerfile's `go build … ./cmd/api`.

## 3. Database

Three tables, one per `schema.json` collection. Columns match the fields the frontend already reads through `src/data/index.ts` — no column the API doesn't need.

| Table | Columns | Notes |
|---|---|---|
| `products` | `id text pk`, `name`, `note`, `price numeric(12,2) check > 0`, `image`, `added date`, `seq bigserial` | `seq` orders the default (unsorted) read in seed/insertion order — DATA-001; never exposed in the API response |
| `admins` | `id text pk`, `email text unique`, `name`, `role` | **No `password_hash` column here.** AUTH-001/003 says the `auth` module's own migration adds it — this scaffold only lays down the row `auth` signs against |
| `telegram` | `id text pk`, `bot`, `group`, `chat_id` | One row (`id='group'`), seeded empty; the owner fills it in once the bot exists |

Seed data is the current `src/data/*.json` fixtures, verbatim (DATA SRS's own assumption): all 12 products from `products.json`, the real `admins.json` row (`owner`, email `brian.ng.2305@gmail.com`) — the placeholder `admin-1` row (blank email, `_source: assumed`) is **not** seeded, since an empty `email` can't satisfy the `unique` constraint and was never real data — and one empty `telegram` row. `admins.json`, `products.json`, `settings.json`, `telegram.json` stay in the frontend until the "Site data from the database" story deletes them (DATA-004); `schema.json` stays permanently as the field contract.

Migrations apply on boot, in filename order, each in its own transaction, tracked in `schema_migrations(filename)` so a restart is a no-op. None needs `CREATE INDEX CONCURRENTLY`: every index here is created in the same statement as its table, before any row exists.

## 4. Backend skeleton

`cmd/api/main.go` does only what this stage needs: read `DATABASE_URL`, apply migrations, serve `/healthz` (200 only after migrations succeeded and `SELECT 1` works), listen on `PORT` (falling back to `APP_PORT`, then `8080`). No product/admin/telegram routes yet — those are the "Site data from the database", "Owner & admin sign-in" and "Add product…" stories, each extending this same `main.go` and `migrations/`.

## 5. Env vars

| Service | Var | Required | Meaning |
|---|---|---|---|
| backend | `DATABASE_URL` | yes | Postgres DSN, injected by the runtime |
| backend | `PORT` | no (default `8080`) | listen port, injected by the runtime |
| frontend | `VITE_API_URL` | no (default `/api`) | API base; blank in production relies on the deploy proxy's `/api/*` rewrite (`deploy.yml`) |

Every service's `.env.example` lists these with a comment; no secret value is ever committed.

## 6. Running it

```
docker compose --profile local up -d --wait   # postgres + backend + frontend
```

Frontend's `VITE_API_URL` is baked in at **build** time (Vite), not read at container runtime — the committed `Dockerfile` builds once with no build arg, so local `docker compose up` serves the frontend calling its own fallback `/api`, which 404s with no reverse proxy in front of it locally. For local full-stack browsing during a story, run the frontend dev server directly instead: `VITE_API_URL=http://localhost:8080 npm run dev` in `code/frontend`, backend via `docker compose --profile local up postgres backend`. In the deployed environment this is not an issue: Caddy (`deploy.yml`) proxies `/api/*` to the backend, which is exactly what the baked-in default expects.

## 7. Conventions

- Migration files: `NNNN_<verb>_<noun>.up.sql` / `.down.sql`, four-digit, applied in filename order.
- The backend never assembles a DSN from `DB_*` parts — it reads `DATABASE_URL` whole, because the runtime injects it that way.
- A collection's private fields (none today — DATA-003) are excluded at the SQL `SELECT`, never filtered in the frontend.
- Session/auth tokens: left to the "Owner & admin sign-in" story's technical design; not fixed here since no auth code exists yet.

## 8. Rejected alternatives

| Decision | Rejected | Why |
|---|---|---|
| stdlib `net/http` router | `chi` / `gin` | Three endpoints across the whole plan; a router earns nothing yet and is one more dependency to justify later if the surface grows |
| Hand-rolled migration runner | `golang-migrate` CLI/library | Needs a directory walk and a tracking table — both a dozen lines of stdlib; the library's CLI wiring and extra `go.sum` entries buy nothing this small |
| `pgx/v5/stdlib` | `lib/pq` | `lib/pq` is unmaintained; `pgx` is the current, actively maintained driver and still speaks `database/sql` so no other code changes |
