# SRS — Auth

Module: `auth`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

Shelf has one private side: the CMS where the owner and the shop's admins manage products. This module is the gate to it — one sign-in screen (email and password) and the session it produces. There is no sign-up anywhere; if this module did not exist, the CMS would be open to the public and anyone could add products and trigger Telegram messages.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Visitor | Not signed in | Reach `/login`, submit email + password, see the generic error on failure |
| Admin | A row in the `admins` table (role `owner` or `admin`), created directly in the database by the owner | Sign in, hold a session that gates `/cms/products` and `/cms/products/new`, sign out |

There is no actor who can create an admin account through the UI. The `admins` table is seeded and managed by the owner directly in the database.

## 3. Scope

**In scope** — the function specified below, by its plan title:

- Owner & admin sign-in

**Out of scope**

- Public sign-up — deliberately not built; the brief: "No public sign-up and no customer accounts."
- Password reset / "forgot password" — not in the approved design (Login.tsx has no such link) and not asked for; an admin whose password is lost is re-seeded by the owner directly in the database.
- Role-based pages (a separate owner view vs. admin view) — the design gates on session only (`RequireSignIn`), not on role; `role` is stored but not used to show or hide anything in this module.

## 4. Functional requirements

### 4.1 Owner & admin sign-in

**Requirement AUTH-001 — Sign in with email and password**

*As an* admin, *I want to* sign in with my email and password, *so that* I can reach the CMS and add products.

Behaviour:

1. The admin opens `/login`, enters email and password, and submits.
2. The system checks the pair against the `admins` table's stored password hash.
3. On a match, the system returns a signed session naming the admin's email, name and role, and the browser is sent to `/cms/products`.
4. The session survives a page refresh: a signed-in admin reloading `/cms/products` stays on it.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | An admin row exists with a known email and password | The admin submits that email and the matching password on `/login` | The browser navigates to `/cms/products` and the session names that admin's email, name and role |
| AC-2 | A session from AC-1 exists | The admin reloads the browser on `/cms/products` | The admin is still signed in; the CMS page renders, not the sign-in gate |

**Requirement AUTH-002 — Wrong credentials are refused**

*As a* visitor or admin, *I want to* be told my sign-in failed without learning why, *so that* the system does not reveal which part — email or password — was wrong.

Behaviour:

1. The admin submits email and password that do not match any stored pair (unknown email, or known email with the wrong password).
2. The system responds with a generic failure. No distinction is made between "no such email" and "wrong password".
3. The page stays on `/login` and shows the existing error copy (`pages.login.error`).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | No admin row matches the submitted email | The visitor submits email and any password | The page stays on `/login`, the `pages.login.error` text is shown, and no session is created |
| AC-2 | An admin row exists for the submitted email | The admin submits that email with the wrong password | The page stays on `/login`, the `pages.login.error` text is shown, and no session is created |

**Requirement AUTH-003 — The CMS is unreachable without a session**

*As the* system, *I want to* refuse `/cms/products` and `/cms/products/new` to anyone with no session, *so that* only signed-in admins ever reach the CMS.

Behaviour:

1. A visitor with no session requests `/cms/products` or `/cms/products/new` directly (typed address, bookmark, or link).
2. The system does not render the page's data; it shows the sign-in gate (`RequireSignIn`, already built) with a link to `/login`.
3. The same refusal applies to the one CMS write endpoint this module gates indirectly: `POST /v1/products` (defined in the `cms` module, CMS-003) returns 401 to any request with no valid session, or with a session that is invalid, expired or forged — one status for "session present but not good," matching CMS-003 and DATA-002. The CMS list read, `GET /v1/products`, is **not** gated by this module: DATA-001 makes it public for the Home page, and the CMS list screen reads the same public endpoint — the page itself, not the data, is what `RequireSignIn` protects (AC-1 above).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | No session in the browser | The visitor navigates to `/cms/products` | The sign-in gate is shown, with a link to `/login`, not the product table |
| AC-2 | No session in the browser | The visitor navigates to `/cms/products/new` | The sign-in gate is shown, not the add-product form |
| AC-3 | No session, or an invalid/expired/forged session token | A caller calls `POST /v1/products` directly | The endpoint responds 401 (same status for both cases) |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | Email or password field left empty | Submit is blocked client-side; the existing inline error state is shown (already built in Login.tsx), nothing is sent to the server |
| Not found / wrong password | Email not in `admins`, or password does not match | Generic 401, generic `pages.login.error` copy — AUTH-002 |
| Not permitted | No session, CMS page or `POST /v1/products` requested | Redirect to `/login` (page) or 401 (endpoint) — AUTH-003 |
| Expired/invalid session | A stored session token is malformed, expired, forged, or signed with an old secret | Treated the same as no session: the sign-in gate is shown on a page, 401 on `POST /v1/products` — one status for "session present but not good," never 403, matching CMS-003 and DATA-002 |
| Account removed | An admin's row is deleted from the database while they hold a live session | Not applicable: the approved design has no live session-revocation screen; the existing session remains valid until it expires, consistent with the "sign in is just a login screen" scope the brief describes |
| Conflict | Two admins editing the same session | Not applicable: each admin holds their own independent session; there is no shared-session object to conflict over |
| Upstream failure | Database unavailable during login | 500-class response; the page shows the same generic `pages.login.error` copy rather than a distinct error screen, since the approved design has one error state for this form |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| email | text | yes | matched case-insensitively against `admins.email` |
| password | text | yes | never stored or logged in plaintext; compared against `admins.password_hash` |
| name | text | no | returned in the session; blank falls back to a name derived from the email, as the existing mock already does |
| role | text | yes | `owner` or `admin`; returned in the session, not used to gate pages in this module |

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Login (`/login`) | `pages.login.*` content keys, `Login.tsx` | AUTH-001, AUTH-002 | default, error (wrong credentials) |
| CMS sign-in gate | `RequireSignIn.tsx`, shown in front of `/cms/products` and `/cms/products/new` | AUTH-003 | default (gate shown to a visitor with no session) |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | `/v1/auth/login` responds within 1s at 1 Mbps, cold cache |
| Accessibility | Email and password inputs are labelled and keyboard reachable; the error message is announced (already built with an icon + text pattern) |
| Responsive | Works at 320px and up; the two-column layout (form + photo) collapses to one column below `lg`, as already built |
| Privacy | Passwords are stored only as a hash, never in plaintext or in logs; the session carries email, name and role only |

## 7. Dependencies and assumptions

- **Depends on:** `data` module, for the `admins` table (schema extended with a password column by this module).
- **Assumption:** the owner adds and edits admin rows (and their passwords) directly in the database; no UI is built for it. If this proves impractical, that is a scope change to raise with the stakeholder before building one.

| Open question | Proposed default | Who decides |
|---|---|---|
| How is a brand-new admin's password set, given there is no UI to set one? | The owner inserts the admin row with a pre-hashed password computed and handed to them out of band (e.g. by Dev, once); out of scope for a UI | Stakeholder |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Owner & admin sign-in | AUTH-001, AUTH-002, AUTH-003 | `test-cases/owner-admin-sign-in.md` |
