# Story — Add product saves and notifies Telegram

Module: `cms`
SRS: `docs/cms/SRS.md` (CMS-001, CMS-002, CMS-003)

## User story

As an **admin** (signed-in owner or admin, per the `auth` module), I want to submit the "Add a product" form and have it saved and announced to the shop's Telegram group, so that the product appears on the shelf and the owner's group is told about new stock without checking the site.

## In scope

- `POST /v1/products`: validates, stores the row (name, note, price, image), responds with the saved row including its assigned `id` and `added` date.
- Optional photo upload as a `multipart/form-data` part named `image`; server writes it to `/images/products/<id>.<ext>` and stores that path in `products.image`.
- After a successful save, sending the Telegram message (`New on the shelf: <name> — <price>`) to the `chat_id` in the `telegram` table via the bot token.
- Save is never rolled back because the Telegram send failed; the response/UI distinguishes "saved" from "saved and sent to Telegram".
- Session check: no/invalid/expired/forged session → 401, nothing stored, nothing sent.
- Replacing `src/lib/mock/products.ts`'s `addProduct` and `src/lib/mock/telegram.ts`'s `send` with a real `src/lib/add-product-saves-and-notifies-telegram.ts` client that calls the endpoint above and returns the saved row.
- `CmsProducts.tsx`'s list reflecting the new row once saved, via the real `GET /v1/products` (that read itself is the `data` module's; this story only adds the row it later returns).

## Out of scope

- Editing or deleting a product — no such action in the approved design.
- `GET /v1/products` and its paging/filtering — `data` module, dependency only.
- The sign-in check itself (session issuing/verification mechanics) — `auth` module; this story only calls it.
- Seeding or editing the `telegram` row's `bot`/`chat_id` — `data` module; this story only reads it.
- Any retry UI for a failed Telegram send — design has no retry affordance.

## UI scope

Both screens already exist in the approved design and are unchanged in layout:

- `/cms/products/new` (`CmsNewProduct.tsx`): the form, its client-side validation (name/note non-empty, price > 0 — unchanged), the live Telegram-preview, and the `saved-notice` states (`default` / `error` / `saved`). This story wires the existing submit handler to the real endpoint instead of the mock, and makes the `saved-notice` reflect the real Telegram outcome.
- `/cms/products` (`CmsProducts.tsx`): the table's `default` row set now includes the row this story just created, read from the real API.

No new screen, no new component, no visual change — mock wiring becomes real wiring.

## Acceptance criteria

- SC-1 [CMS-001 AC-1]: A signed-in admin fills name, note, price > 0 on `/cms/products/new` and submits; `POST /v1/products` is called and the response's row appears at the top of `/cms/products`'s table.
- SC-2 [CMS-001 AC-2]: After SC-1's save, a visitor loading the Home page sees the new product among the public listing.
- SC-3 [CMS-001 AC-3]: Submitting with an empty name/note or price ≤ 0 shows the existing `form-error` message ("Fill in the name, the description and a price above zero.") and sends no request.
- SC-4 [CMS-001 AC-4]: Choosing a JPEG/PNG/WebP file for Photo and submitting stores the file at `/images/products/<id>.<ext>`, stores that path in `products.image`, and the photo renders on both `/cms/products` and the public Home page.
- SC-5 [CMS-001 AC-5]: Submitting with no file chosen stores `products.image` empty and renders `ProductImage`'s placeholder slot on both screens.
- SC-6 [CMS-002 AC-1]: With a `telegram` row holding a real `chat_id` and a working bot token, saving a valid product delivers `New on the shelf: <name> — <price>` to that Telegram group.
- SC-7 [CMS-002 AC-2]: When the Telegram API call fails (bad token, network error, unreachable group), the product is still saved (per SC-1) and `saved-notice` reports it was saved but the Telegram send did not succeed.
- SC-8 [CMS-002 AC-3]: When the Telegram call succeeds, `saved-notice` reads "Saved, and sent to the Telegram group."
- SC-9 [CMS-003 AC-1]: A caller with no session calling `POST /v1/products` with a valid body gets 401; no row created, no Telegram message sent.
- SC-10 [CMS-003 AC-2]: A caller with an invalid/expired/forged session token calling `POST /v1/products` with a valid body gets 401; no row created, no Telegram message sent.
- SC-11 [CMS SRS "Failure, boundary and permission" — Invalid input]: A direct API call with empty name/note or price ≤ 0 gets 400; no row created, no Telegram message sent.
- SC-12 [CMS SRS "Failure, boundary and permission" — Invalid input, photo]: A photo part whose content type is not `image/jpeg`/`image/png`/`image/webp`, or exceeding 5MB, gets 400; no row created, no file written, no Telegram message sent.
- SC-13 [CMS SRS "Failure, boundary and permission" — Upstream failure, database]: If the database is unavailable while saving, the response is 500-class; nothing is saved and Telegram is never attempted.

## Dependencies

- `auth` module ("Owner & admin sign-in" story): the session this endpoint checks must exist first.
- `data` module ("Site data from the database" story): the `products` table this story writes to, and the seeded `telegram` row this story reads `chat_id`/`bot` from.
- Project secret: Telegram bot token (server-side only, never sent to the browser).
- Assumption carried from the SRS: the Telegram bot is already a member of the shop's group (done outside this system) so its `chat_id` is valid once seeded.
