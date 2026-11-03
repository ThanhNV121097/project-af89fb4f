# ERD extension — Owner & admin sign-in

Story: `docs/auth/stories/owner-admin-sign-in.md`
Extends: `admins` (defined in the project-wide `docs/architecture/erd.md` §3.2)

## Change

This story adds the one column the shared ERD already predicted and gave an
open migration slot for (`erd.md` §8, migration 4; §9 open question): a
password hash on `admins`. No new table. No column on `products` or
`telegram`.

### `admins` (extended)

| Column | Type | Null | Default | Unique | Description |
|---|---|---|---|---|---|
| `password_hash` | `text` | no (after backfill) | — | | bcrypt hash of the admin's password; compared against the submitted password at `POST /v1/auth/login`; never returned by any endpoint, never logged |

**Constraint added in the same migration** — `ck_admins_role`:
`CHECK (role IN ('owner','admin'))`, closing the gap `erd.md` §4 already
flagged (the shipped `0002` migration has no `CHECK` on `role`).

No other column on `admins` changes. No foreign key — same as the existing
table.

## Mock shape read and judged

`code/frontend/lib/mock/owner-admin-sign-in.ts` (PR #15) resolves
`{ token, email, name, role }` on a match and rejects with a plain `Error`
otherwise, checking a plaintext password against a hard-coded single-admin
list. This is the UI's stand-in only:

- The `{ token, email, name, role }` resolve shape matches
  `services.md` §3.1's response body exactly — no frontend change needed
  when the backend client replaces it.
- The mock's plaintext password comparison does **not** carry over: the
  real column is `password_hash` (bcrypt), compared server-side. The mock
  never had to decide a hashing scheme because it is not the backend; this
  design decides it below (§ Migration, bcrypt).
- The mock's generic `reject(new Error("UNAUTHENTICATED"))` on either "no
  such email" or "wrong password" matches AUTH-002's one-status rule and
  `services.md` §3.1's single `401 UNAUTHENTICATED` — no departure.

## Hash algorithm decision

`erd.md` §9 left this open. Decided: **bcrypt**, cost 10 — Go's
`golang.org/x/crypto/bcrypt` is the stdlib-adjacent, already-conventional
choice for this stack (no new runtime dependency beyond the one package,
no extra config value, no tuning this project's single-digit admin count
ever needs). Recorded here since this is the migration that adds the
column the algorithm's output has to fit (`text`, a bcrypt hash is ~60
chars, well within).

## Migration plan

| # | Change | Forward | Backward | Safe on populated table |
|---|---|---|---|---|
| 4 | Add `admins.password_hash`, backfill, `NOT NULL`; add `ck_admins_role` | `0004_add_admins_password_hash.up.sql`: `ALTER TABLE admins ADD COLUMN password_hash text;` → `UPDATE admins SET password_hash = '<bcrypt hash of the out-of-band initial password>' WHERE id = 'owner';` → `ALTER TABLE admins ALTER COLUMN password_hash SET NOT NULL;` → `ALTER TABLE admins ADD CONSTRAINT ck_admins_role CHECK (role IN ('owner','admin'));` | `0004_add_admins_password_hash.down.sql`: `ALTER TABLE admins DROP CONSTRAINT ck_admins_role;` → `ALTER TABLE admins DROP COLUMN password_hash;` | Safe: `admins` holds exactly one row (the seeded `owner`) today — add-nullable → backfill → set-`NOT NULL` is the standard safe pattern for a populated table, trivial at one row. `ck_admins_role` adds no risk: the existing seed value (`owner`) already satisfies it. |

The out-of-band initial password for the `owner` row is communicated to the
owner once by Dev at merge time (per the story's own decision on the SRS's
open question) — not part of the SQL, a deploy-time step.
