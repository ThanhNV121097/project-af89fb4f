
# Story — Owner & admin sign-in

Module: `auth`
SRS: `docs/auth/SRS.md`

## User story

As an **admin** (a row in the `admins` table, role `owner` or `admin`), I want to sign in with my email and password, so that I can reach the CMS and add products.

## In scope

- `POST /v1/auth/login`: checks email + password against `admins` (new `password_hash` column, added by this story's migration), returns a signed session (cookie or JWT) naming email, name, role.
- Generic 401 on any mismatch (unknown email or wrong password) — no hint which was wrong.
- Session gates `/cms/products` and `/cms/products/new` (via existing `RequireSignIn`) and the `POST /v1/products` write endpoint (401 on no/invalid/expired/forged session).
- Session survives page refresh.
- Replacing the mock in `src/lib/session.ts` (`signIn`/`useSession`) with a real client calling the new endpoint; adding `lib/owner-admin-sign-in.ts` as that API client.
- Migration adding `admins.password_hash`; seeding/backfilling is the owner's job out of band (per SRS §7 open question — decided below).

## Out of scope

- Public sign-up — none exists anywhere; brief explicitly excludes it.
- Password reset / "forgot password" — no such link in the approved `Login.tsx`; an admin with a lost password is re-seeded by the owner directly in the database.
- Role-based UI (separate owner vs admin views) — `RequireSignIn` gates on session only; `role` is stored and returned but not used to show/hide anything.
- Any UI for creating/editing admin rows — the `admins` table is seeded and managed directly in the database, not through this product.
- `GET /v1/products` — public, ungated, owned by the `data` module (DATA-001); unaffected by this story.
- The CMS's own write logic for products (`POST /v1/products` body/validation) — owned by "Add product saves and notifies Telegram"; this story only adds the 401 gate in front of it.

## UI scope

No new screens. This story wires existing, already-built UI to a real backend:

- `Login.tsx` (`/login`) — default and error states, unchanged visually; `onSubmit` now calls the real client instead of the mock.
- `RequireSignIn.tsx` — unchanged visually; now gates on a real session instead of a mock one.
- `DashboardLayout`'s signed-in user display — reads the real session's name/role, unchanged visually.

No component files change beyond `src/lib/session.ts` and the new `lib/owner-admin-sign-in.ts` client, per the architecture doc's story-ownership rule.

## Acceptance criteria

- SC-1 [AUTH-001 AC-1]: Given an admin row with a known email and password hash, when that email and matching password are submitted on `/login`, then the browser navigates to `/cms/products` and the session names that admin's email, name and role.
- SC-2 [AUTH-001 AC-2]: Given a session from SC-1, when the admin reloads the browser on `/cms/products`, then the admin is still signed in and the CMS page renders (not the sign-in gate).
- SC-3 [AUTH-002 AC-1]: Given no admin row matches the submitted email, when a visitor submits that email with any password, then the page stays on `/login`, shows the `pages.login.error` text, and creates no session.
- SC-4 [AUTH-002 AC-2]: Given an admin row exists for the submitted email, when the admin submits that email with the wrong password, then the page stays on `/login`, shows the `pages.login.error` text, and creates no session.
- SC-5 [AUTH-003 AC-1]: Given no session in the browser, when a visitor navigates to `/cms/products`, then the sign-in gate is shown (with a link to `/login`), not the product table.
- SC-6 [AUTH-003 AC-2]: Given no session in the browser, when a visitor navigates to `/cms/products/new`, then the sign-in gate is shown, not the add-product form.
- SC-7 [AUTH-003 AC-3]: Given no session, or an invalid/expired/forged session token, when a caller calls `POST /v1/products` directly, then the endpoint responds 401 (same status for both cases).

## Dependencies

- `data` module: the `admins` table must exist (seeded with the real `owner` row, email `brian.ng.2305@gmail.com`) before this story's migration adds `password_hash` to it — confirmed already seeded per project memory (`db.schema`).
- No external account or credential needed — this is first-party session logic (cookie or JWT), no third-party auth provider.

## Decision on the SRS's open question

SRS §7 asks how a brand-new admin's password is set, given there's no UI. Decided: the migration/seed step computes a password hash for the existing seeded `owner` row (`brian.ng.2305@gmail.com`) using a fixed initial password communicated to the owner out of band by Dev once, at merge time. Any further admin the owner wants, they insert directly with a hash computed the same way. No UI, no endpoint — matches the SRS assumption exactly.
