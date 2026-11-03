# Test Cases — Owner & admin sign-in

Module: `auth`
Story: `docs/auth/stories/owner-admin-sign-in.md`
SRS: `docs/auth/SRS.md`
Contract: `docs/architecture/services.md` §3.1 (`POST /v1/auth/login`), §2.2–2.3, §3.4 (`POST /v1/products` auth gate)

Risk level: high. This is the only gate between a public site and a CMS that
writes data and fires a Telegram message — every failure path (wrong
credentials, no session, forged/expired token, undefined fields) gets its
own case, not just the happy path.

Instruments available to verification: `fetch_url`, `render_url`,
`measure_styles`, `interact_page`, `manual`.

---

## SC-1 — Correct credentials sign in and name the session

**Scenario**: Admin signs in with correct email and password
**Given**: An admin row exists in `admins` with a known email, a known
password, and `password_hash` set to match it
**When**: On `/login`, that email and the matching password are typed into
the two fields and the form is submitted
**Then**: The browser navigates to `/cms/products`, and the signed-in
session (read from storage or the rendered layout) names that admin's
email, name and role — not blank, not another admin's values
Traces: SC-1 (AUTH-001 AC-1)
Check: interact_page

---

## SC-1b — Blank admin name falls back to an email-derived name

**Scenario**: Session name falls back when the admin row has no name
**Given**: An admin row exists with a known email/password but `name` is
empty
**When**: That email and password are submitted on `/login`
**Then**: Sign-in succeeds and the session's `name` is the email-derived
fallback (not an empty string), as the SRS data table specifies
Traces: SC-1 (AUTH-001 data table — "name … blank falls back to a name
derived from the email")
Check: interact_page

---

## SC-2 — Session survives a page refresh

**Scenario**: Reloading `/cms/products` keeps the admin signed in
**Given**: The admin from SC-1 has just signed in and is on `/cms/products`
**When**: The browser is reloaded on `/cms/products`
**Then**: The admin is still signed in; the CMS product list renders, not
the sign-in gate
Traces: SC-2 (AUTH-001 AC-2)
Check: interact_page

---

## SC-3 — Unknown email is refused generically

**Scenario**: Sign-in fails for an email with no matching admin row
**Given**: No admin row matches `nobody@example.com`
**When**: `nobody@example.com` and any non-empty password are submitted on
`/login`
**Then**: The page stays on `/login`, the `pages.login.error` text is
shown, and no session is created (no navigation to `/cms/products`, no
stored session afterward)
Traces: SC-3 (AUTH-002 AC-1)
Check: interact_page

---

## SC-4 — Wrong password is refused with the same generic error

**Scenario**: Sign-in fails for a known email with the wrong password
**Given**: An admin row exists for a known email with a known password hash
**When**: That email and a wrong password are submitted on `/login`
**Then**: The page stays on `/login`, the same `pages.login.error` text as
SC-3 is shown (identical copy — no hint which field was wrong), and no
session is created
Traces: SC-4 (AUTH-002 AC-2)
Check: interact_page

---

## SC-4b — Empty fields are blocked before any request is sent

**Scenario**: Submitting with an empty email or password field is blocked client-side
**Given**: The admin is on `/login` with both fields empty
**When**: Submit is pressed with the email field (or the password field)
left blank
**Then**: The existing inline error state is shown, the page stays on
`/login`, and no sign-in request is sent (no navigation, no session)
Traces: SC-4b (AUTH-003 failure table — "Invalid input")
Check: interact_page

---

## SC-5 — `/cms/products` is gated with no session

**Scenario**: A visitor with no session cannot reach the product list
**Given**: No session exists in the browser (storage cleared)
**When**: The visitor navigates directly to `/cms/products`
**Then**: The sign-in gate is rendered, with a link to `/login`; the
product table is not rendered
Traces: SC-5 (AUTH-003 AC-1)
Check: render_url

---

## SC-6 — `/cms/products/new` is gated with no session

**Scenario**: A visitor with no session cannot reach the add-product form
**Given**: No session exists in the browser (storage cleared)
**When**: The visitor navigates directly to `/cms/products/new`
**Then**: The sign-in gate is rendered; the add-product form is not
rendered
Traces: SC-6 (AUTH-003 AC-2)
Check: render_url

---

## SC-6b — An invalid/forged session token is treated the same as no session on a page

**Scenario**: A corrupted session token shows the sign-in gate, not the CMS
**Given**: A session token that is malformed/forged (not a valid signed
JWT for any admin) is placed in the browser's session storage in place of a
real one
**When**: The visitor navigates to `/cms/products`
**Then**: The sign-in gate is rendered — identical outcome to SC-5, never a
different error page
Traces: SC-6b (AUTH-003 failure table — "Expired/invalid session")
Check: render_url

---

## SC-7a — `POST /v1/products` with no token is 401

**Scenario**: The write endpoint refuses a request with no `Authorization` header
**Given**: No `Authorization` header is sent
**When**: `POST /v1/products` is called directly with a valid multipart
body (name, note, price) and no header
**Then**: The response is `401` with error code `UNAUTHENTICATED`
Traces: SC-7 (AUTH-003 AC-3)
Check: fetch_url

---

## SC-7b — `POST /v1/products` with an invalid/expired/forged token is 401 (same code as SC-7a)

**Scenario**: The write endpoint refuses a bad token exactly like no token
**Given**: An `Authorization: Bearer <token>` header is sent where
`<token>` is, in turn: (a) expired, (b) signed with the wrong secret
(forged), and (c) structurally malformed
**When**: `POST /v1/products` is called directly with each of the three
tokens, with an otherwise-valid body
**Then**: Every one of the three responses is `401` with error code
`UNAUTHENTICATED` — the identical status and code as SC-7a, never `403`
Traces: SC-7 (AUTH-003 AC-3)
Check: fetch_url

---

## Contract-1 — Successful login's response shape

**Scenario**: `POST /v1/auth/login` returns exactly the documented fields
**Given**: A known admin row with a matching password
**When**: `POST /v1/auth/login` is called with `{ "email": ..., "password": ... }`
**Then**: The response is `200` with a body containing exactly `token`,
`email`, `name`, `role` (JWT in `token`, matching admin's `email`/`name`/`role`) —
no extra and no missing field
Traces: contract (POST /v1/auth/login)
Check: fetch_url

---

## Contract-2 — Wrong credentials return the documented error envelope

**Scenario**: `POST /v1/auth/login` with a bad password returns `UNAUTHENTICATED`
**Given**: A known admin row
**When**: `POST /v1/auth/login` is called with that email and a wrong
password
**Then**: The response is `401` with body `error.code == "UNAUTHENTICATED"`
(same code for unknown email, not re-tested here since SC-3/SC-4 already
exercise the UI side of both)
Traces: contract (POST /v1/auth/login), SC-3/SC-4
Check: fetch_url

---

## Contract-3 — An undefined field in the login body is rejected, not ignored

**Scenario**: An extra field in the login request body is a 400, not silently dropped
**Given**: A known admin row with valid credentials
**When**: `POST /v1/auth/login` is called with `{ "email": ..., "password": ..., "remember_me": true }`
**Then**: The response is `400` with `error.code == "MALFORMED_REQUEST"` —
the login does **not** succeed just because email/password were also
correct
Traces: contract (POST /v1/auth/login §2.5)
Check: fetch_url

---

## Contract-4 — Missing or blank email/password sent directly to the API is a 400

**Scenario**: A request bypassing the client-side guard still gets validated server-side
**Given**: No client-side validation is involved (request sent directly)
**When**: `POST /v1/auth/login` is called with `{ "email": "", "password": "x" }`, and
again with the `email` field omitted entirely
**Then**: Both responses are `400` with `error.code == "MALFORMED_REQUEST"`
Traces: contract (POST /v1/auth/login)
Check: fetch_url

---

## Contract-5 — Database unavailable during login is a 500, not a 503

**Scenario**: A failed lookup during sign-in is `INTERNAL`, never left as a silent hang
**Given**: The database is made unreachable while the backend keeps running
(`set_db_available(false)`)
**When**: `POST /v1/auth/login` is called with a valid-looking email/password
pair
**Then**: The response is `500` with `error.code == "INTERNAL"` (503 is
reserved for a refused connection to a dependency the backend calls, not
this case — restore the database afterward)
Traces: SRS AUTH-001/002 failure table ("Upstream failure"), contract §2.3
Check: fetch_url

---

## SC-Extra — The login page shows the same generic error on an upstream failure

**Scenario**: A database outage during sign-in shows the existing generic error, not a new error screen
**Given**: The database is made unreachable (`set_db_available(false)`)
**When**: A visitor submits any email and password on `/login`
**Then**: The page stays on `/login` and shows the same `pages.login.error`
copy as SC-3/SC-4 — no distinct error state (restore the database
afterward)
Traces: SRS AUTH-001/002 failure table ("Upstream failure")
Check: interact_page
