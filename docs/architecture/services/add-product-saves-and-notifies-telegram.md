# Service extension — Add product saves and notifies Telegram

Story: `docs/cms/stories/add-product-saves-and-notifies-telegram.md`
Extends: `docs/architecture/services.md` §3.4 (`POST /v1/products`, already
specified there in full) and its cross-cutting contract (§2.2 auth, §2.3
error catalog, §2.4 pagination n/a here, §2.5 validation, §2.6 idempotency,
§5 external integrations). This story is what implements that endpoint and
the Telegram call; it introduces no endpoint and no error code the shared
document does not already name.

## Endpoint

### `POST /v1/products`

Already fully specified in `docs/architecture/services.md` §3.4. Restated
here to confirm this story implements it exactly as specified, with the one
clarification below:

- **Auth** — Bearer JWT, any valid admin (owner or admin role — `role` is
  not checked, per services.md §2.2). Reuses the middleware the
  `owner-admin-sign-in` story's technical design already wraps around this
  route (`docs/architecture/services/owner-admin-sign-in.md`); this story
  does not re-specify or duplicate it, only depends on it being attached.
- **Request** `multipart/form-data`: `name`, `note`, `price` (text parts,
  all required/non-empty, `price` > 0), `image` (file part, optional,
  `image/jpeg`/`image/png`/`image/webp`, ≤ 5MB). An undefined part name →
  `400 MALFORMED_REQUEST`.
- **Success** `201`, `Location: /v1/products/{id}`:
  ```json
  {
    "id": "lamp-04", "name": "Brass desk lamp", "note": "Rewired, new switch.",
    "price": "38.00", "image": "/images/products/lamp-04.jpg", "added": "2026-11-03",
    "telegram_sent": true
  }
  ```
  `price` is the wire-format decimal string already fixed by services.md
  §3.2/§8 (avoids float rounding) — same shape as every other product read,
  not special-cased for this endpoint.
- **Errors**:
  | Code | HTTP | Trigger |
  |---|---|---|
  | `MALFORMED_REQUEST` | 400 | not valid multipart; `name`/`note` missing/blank; `price` missing, non-numeric, or ≤ 0; `image` part present with a disallowed content type or over 5MB; an undefined part name present |
  | `UNAUTHENTICATED` | 401 | no token, or an invalid/expired/forged token |
  | `INTERNAL` | 500 | database unavailable while inserting, or the photo file could not be written to disk — nothing saved, no Telegram attempt |

No new error code and no new status: this story's three codes are already
in the shared catalog (`services.md` §2.3).

## Handler sequence (this story's own deliverable)

1. Middleware already rejected an unauthenticated caller before this
   handler runs (per the `owner-admin-sign-in` service extension) —
   nothing here re-checks the token.
2. Parse the multipart body. Any shape violation in the table above →
   `400`, before any insert.
3. Assign `id` (slug from `name`, de-duplicated against the `products` PK —
   see ERD extension), set `added = today` (server clock), insert the row
   in one `INSERT`. A write failure (DB unreachable, disk write for the
   photo failed) → `500`, nothing partially saved: the SQL insert and the
   file write for `image` both happen, or neither's result is used — if the
   file write fails, the insert is not issued (CMS's failure table: "there
   is nothing to notify about").
4. On a successful insert, `SELECT chat_id FROM telegram WHERE id='group'`
   and build the message text `"New on the shelf: <name> — <formatted
   price>"` — the same `messageFor` wording the mock/live preview already
   builds, computed server-side in Go now, not shared code with the
   frontend.
5. Call the Telegram Bot API (`POST
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage`,
   `chat_id`, `text`), 5s timeout, no retry (services.md §5, CMS-002 AC-2,
   CMS's failure table — "no retry is built"). Any failure (non-2xx, 5xx,
   network error, timeout, empty `chat_id`) → `telegram_sent: false`; a 2xx
   Telegram response → `telegram_sent: true`. The row insert from step 3 is
   never rolled back for this outcome either way.
6. Respond `201` with the row from step 3 plus `telegram_sent` from step 5.

No asynchronous work, no queue — same reasoning as services.md §4: a
synchronous best-effort call is enough for a handful of saves a week.

## Mock → real mapping (frontend impact)

`code/frontend/lib/mock/add-product-saves-and-notifies-telegram.ts` (PR #17)
`addProduct({ name, note, price: number, image })` →
`Promise<SavedProduct>`. The real client at
`code/frontend/src/lib/add-product-saves-and-notifies-telegram.ts` (written
in the backend story) must:

- build a `FormData` with `name`, `note`, `String(price)`, and `image` as a
  `File`/`Blob` part only when a file was chosen (the existing `photo` state
  in `CmsNewProduct.tsx` holds an object URL today from
  `URL.createObjectURL` — the backend story's client needs the underlying
  `File`, so `Form`'s `onPhoto` keeps the chosen `File` in state alongside
  the preview URL; this is the one frontend change this design requires,
  named per `tl-design-story`'s rule for any departure from the mock).
- POST to `/v1/products` with the `Authorization: Bearer <token>` header
  (reading the stored session's token, same as every other gated call this
  project makes).
- resolve `{ id, name, note, price, image, added, telegram_sent }` on `201`
  — same field set the mock already resolves, `price` now a string
  (`formatPrice` in `src/lib/format.ts` already accepts a string, confirmed
  above) — no change to `CmsNewProduct.tsx`'s render of `saved.telegram_sent`
  or `CmsProducts.tsx`'s row rendering.
- reject on any non-2xx; `CmsNewProduct.tsx`'s `submit` has no catch today
  (the mock never rejects) — this is the second frontend change the real
  backend requires: wrap the `await addProduct(...)` call in a `try/catch`
  setting the existing `error` state to a generic message (same string used
  for client-side validation, since CMS-003's own rule is "no hint which"
  and this project's error contract never surfaces `code`/`message` to this
  screen) on any rejection, so a `500`/`401` from a direct network issue
  does not leave the button permanently disabled. Named here since the
  mock's `Promise` never rejects and the UI review correctly did not have
  this case to catch.
- `CmsProducts.tsx` drops its `addedProducts`/`subscribe` mock-store read
  entirely once `GET /v1/products` (already real, from the `data` story)
  returns the new row — this story's own description names that deletion;
  no `fresh`/`extra` merge logic survives in that file.

## Error catalog — no additions

All three codes used here (`MALFORMED_REQUEST`, `UNAUTHENTICATED`,
`INTERNAL`) are the project's existing catalog (`services.md` §2.3).
Nothing new.

## External integration — confirms services.md §5

Reused as specified: `TELEGRAM_BOT_TOKEN` env var (requested as a project
secret), 5s timeout, no retry, failure never rolls back the save. This
story is the one that actually calls it; services.md §5 is not amended.

## Migration plan

None — see the ERD extension; no schema change.
