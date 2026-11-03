# Service extension — Owner & admin sign-in

Story: `docs/auth/stories/owner-admin-sign-in.md`
Extends: `docs/architecture/services.md` §3.1 (`POST /v1/auth/login`, already
specified there in full) and its cross-cutting contract (§2.2 auth, §2.3
error catalog) — this story is what implements that endpoint and the
middleware; it introduces no endpoint and no error code the shared document
does not already name.

## Endpoint

### `POST /v1/auth/login`

Already fully specified in `docs/architecture/services.md` §3.1. Restated
here only to confirm this story implements it exactly as specified, with no
departure:

- **Auth** — none.
- **Request** `{ email: string, password: string }`, both required,
  non-empty; undefined field → `400 MALFORMED_REQUEST`.
- **Success** `200 { token, email, name, role }` — `token` a signed JWT
  (HS256, `JWT_SIGNING_SECRET`, 24h lifetime, claims `sub/email/name/role/
  iat/exp`, per services.md §2.2); `email`/`role` as stored; `name` as
  stored or the email-derived fallback when blank.
- **Errors**:
  | Code | HTTP | Trigger |
  |---|---|---|
  | `MALFORMED_REQUEST` | 400 | body not JSON, `email`/`password` missing/blank, or an undefined field present |
  | `UNAUTHENTICATED` | 401 | no `admins` row matches the email (case-insensitive), or `bcrypt.CompareHashAndPassword` fails — one status for both, no hint which |
  | `INTERNAL` | 500 | database unavailable during the lookup |

## Middleware (not a new endpoint, but this story's own deliverable)

One middleware, per services.md §2.2, wraps every handler under
`POST /v1/products`, `GET /v1/admins*`, `GET /v1/telegram*`. This story
builds and attaches it to `POST /v1/products` only (the other wraps belong
to the stories that own those reads/writes; AUTH-003 names `POST
/v1/products` explicitly as the write this module gates):

1. Read `Authorization` header. Missing, not `Bearer <token>`, signature
   invalid, or `exp` passed → `401 UNAUTHENTICATED`. One code for all of
   these — no `403`, matching AUTH-003/CMS-003/DATA-002's shared rule.
2. On success, the admin's `sub`/`email`/`name`/`role` claims are available
   to the handler; no DB round-trip per request — the JWT is
   self-contained, per services.md §2.2 (no server-side session store).

No new error code: `UNAUTHENTICATED` and `MALFORMED_REQUEST` are both
already in the shared catalog (`services.md` §2.3). No `INTERNAL` case in
the middleware itself — it does no I/O.

## Mock → real mapping (frontend impact)

`code/frontend/lib/mock/owner-admin-sign-in.ts` (PR #15) resolves
`{ token, email, name, role }` / rejects `Error("UNAUTHENTICATED")`. The
real client at `code/frontend/lib/owner-admin-sign-in.ts` (written in the
backend story) calls `POST /v1/auth/login` and must:

- resolve the same `{ token, email, name, role }` shape on `200` — no
  frontend change to `Login.tsx`'s success path.
- reject on any non-2xx (400 or 401) the same way the mock rejects today —
  `Login.tsx`'s `catch { setError(true) }` already treats any rejection as
  the generic error state, so the 400-vs-401 distinction is invisible to
  the UI by design, matching AUTH-002's "no hint which was wrong" rule.
- `signIn()` (`src/lib/session.ts`) is called with the response's
  `email`/`name`/`role` exactly as today; no change to that file beyond
  swapping the mock import for the real client, per the story's own scope.

No frontend behaviour changes other than deleting the mock file and
pointing `Login.tsx`'s import at the real client — the response envelope
was designed (services.md §3.1) to match the mock exactly for this reason.

## Error catalog — no additions

Both codes used here (`MALFORMED_REQUEST`, `UNAUTHENTICATED`) and the
pagination/error envelope are the project's existing catalog
(`services.md` §2.3). Nothing new.
