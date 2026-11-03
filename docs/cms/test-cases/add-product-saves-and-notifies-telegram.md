# Test Cases — Add product saves and notifies Telegram

Module: `cms`
Story: `docs/cms/stories/add-product-saves-and-notifies-telegram.md`
Contract: `docs/architecture/services.md` §3.4 `POST /v1/products`, §2.3 error contract, §2.5 validation boundary

Risk level: **high**. This is the only write path in the whole app (the one
endpoint that creates data) and it fans out to an external integration
(Telegram) whose failure must not corrupt the save. Coverage below is
proportionally the deepest of the three CMS/data/auth test files: every
acceptance criterion gets a case, every contract-mandated status code gets a
case, and the save/notify decoupling (CMS-002's central guarantee) gets both
its success and its failure arm.

---

**Scenario**: Valid submission saves the product and it appears at the top of the CMS list
**Given**: A signed-in admin is on `/cms/products/new`
**When**: The admin types a non-empty name, a non-empty short description, a price greater than 0, chooses no file, and clicks Save
**Then**: `POST /v1/products` is called; the CMS list at `/cms/products` shows the new row at the top of its table with the submitted name, note and price
Traces: SC-1 (CMS-001 AC-1)
Check: interact_page

---

**Scenario**: A product saved in the CMS appears on the public Home page
**Given**: The product from the previous scenario was saved
**When**: A visitor (no session) loads the Home page
**Then**: The new product is present among the public listing, showing its name, note and price
Traces: SC-2 (CMS-001 AC-2)
Check: render_url

---

**Scenario**: Empty name blocks submission client-side and sends no request
**Given**: A signed-in admin is on `/cms/products/new` with note and a price > 0 filled, name left blank
**When**: The admin clicks Save
**Then**: The `form-error` message "Fill in the name, the description and a price above zero." is shown; no `POST /v1/products` request is made
Traces: SC-3 (CMS-001 AC-3)
Check: interact_page

---

**Scenario**: Price of 0 blocks submission client-side and sends no request
**Given**: A signed-in admin is on `/cms/products/new` with name and note filled, price set to 0
**When**: The admin clicks Save
**Then**: The `form-error` message "Fill in the name, the description and a price above zero." is shown; no `POST /v1/products` request is made
Traces: SC-3 (CMS-001 AC-3)
Check: interact_page

---

**Scenario**: Negative price blocks submission client-side and sends no request
**Given**: A signed-in admin is on `/cms/products/new` with name and note filled, price set to -5
**When**: The admin clicks Save
**Then**: The `form-error` message "Fill in the name, the description and a price above zero." is shown; no `POST /v1/products` request is made
Traces: SC-3 (CMS-001 AC-3)
Check: interact_page

---

**Scenario**: Uploading a JPEG photo stores it under the product's id and renders on both screens
**Given**: A signed-in admin is on `/cms/products/new` with name, note and price filled
**When**: The admin chooses a valid `image/jpeg` file for Photo and clicks Save
**Then**: The response's `image` field is `/images/products/<id>.jpg`; the saved row's photo renders on `/cms/products`, and the same photo renders for that product on the public Home page
Traces: SC-4 (CMS-001 AC-4)
Check: interact_page

---

**Scenario**: Submitting with no file chosen stores an empty image and renders the placeholder
**Given**: A signed-in admin is on `/cms/products/new` with name, note and price filled, no file chosen for Photo
**When**: The admin clicks Save
**Then**: The response's `image` field is empty; the saved row renders `ProductImage`'s existing placeholder slot on `/cms/products` and on the public Home page
Traces: SC-5 (CMS-001 AC-5)
Check: interact_page

---

**Scenario**: A working Telegram configuration delivers the new-product message
**Given**: The `telegram` row holds a real `chat_id` and a working bot token; an admin is on `/cms/products/new` with a valid product filled in
**When**: The admin clicks Save
**Then**: The shop's configured Telegram group receives a message reading `New on the shelf: <name> — <price>`
Traces: SC-6 (CMS-002 AC-1)
Check: manual — no tool here can read the contents of an external Telegram group; a person must check the group received the message. (The save's own `telegram_sent: true` flag, which drives the UI copy, is separately checked below with `fetch_url`/`interact_page`.)

---

**Scenario**: A failed Telegram send still saves the product and the UI reports the partial outcome
**Given**: The `telegram` row's `chat_id` is set to a value the bot cannot reach (e.g. an unreachable/garbage id) so the Telegram API call will fail; an admin is on `/cms/products/new` with a valid product filled in
**When**: The admin clicks Save
**Then**: `POST /v1/products` still returns `201` with the row saved and `telegram_sent: false`; the row appears on `/cms/products` exactly as in SC-1; the `saved-notice` text reports the product was saved but the Telegram send did not succeed
Traces: SC-7 (CMS-002 AC-2)
Check: interact_page

---

**Scenario**: A successful Telegram send is reflected in the saved-notice copy
**Given**: The `telegram` row holds a real, working `chat_id` and bot token; an admin is on `/cms/products/new` with a valid product filled in
**When**: The admin clicks Save
**Then**: The `saved-notice` reads "Saved, and sent to the Telegram group."
Traces: SC-8 (CMS-002 AC-3)
Check: interact_page

---

**Scenario**: No session is rejected with 401 and nothing is created
**Given**: No `Authorization` header is sent
**When**: `POST /v1/products` is called directly with a well-formed multipart body (valid name, note, price)
**Then**: Response is `401` with `error.code = "UNAUTHENTICATED"`; the product does not appear in a subsequent `GET /v1/products`; no Telegram message is sent
Traces: SC-9 (CMS-003 AC-1)
Check: fetch_url

---

**Scenario**: An invalid/expired/forged token is rejected with 401 and nothing is created
**Given**: An `Authorization: Bearer <token>` header carrying a token that is malformed, expired, or signed with the wrong key
**When**: `POST /v1/products` is called with a well-formed multipart body (valid name, note, price)
**Then**: Response is `401` with `error.code = "UNAUTHENTICATED"`; the product does not appear in a subsequent `GET /v1/products`; no Telegram message is sent
Traces: SC-10 (CMS-003 AC-2)
Check: fetch_url

---

**Scenario**: A signed-in admin (not the owner) can add a product
**Given**: A valid session token belongs to an account with `role = "admin"` (not `owner`)
**When**: `POST /v1/products` is called with a well-formed multipart body (valid name, note, price)
**Then**: Response is `201`; the row is created — the endpoint does not branch on `role` (services.md §2.2)
Traces: contract (POST /v1/products, §2.2 roles)
Check: fetch_url

---

**Scenario**: Direct API call with blank name is rejected with 400 and nothing is created
**Given**: A valid session token
**When**: `POST /v1/products` is called with `name=""`, a non-empty `note`, and `price=10`
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`; no row is created; no Telegram message is sent
Traces: SC-11 (CMS SRS failure table — Invalid input)
Check: fetch_url

---

**Scenario**: Direct API call with blank note is rejected with 400 and nothing is created
**Given**: A valid session token
**When**: `POST /v1/products` is called with a non-empty `name`, `note=""`, and `price=10`
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`; no row is created; no Telegram message is sent
Traces: SC-11 (CMS SRS failure table — Invalid input)
Check: fetch_url

---

**Scenario**: Direct API call with price ≤ 0 is rejected with 400 and nothing is created
**Given**: A valid session token
**When**: `POST /v1/products` is called with a non-empty `name`, a non-empty `note`, and `price=0`
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`; no row is created; no Telegram message is sent
Traces: SC-11 (CMS SRS failure table — Invalid input)
Check: fetch_url

---

**Scenario**: Direct API call with non-numeric price is rejected with 400
**Given**: A valid session token
**When**: `POST /v1/products` is called with a non-empty `name`, a non-empty `note`, and `price="free"`
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`; no row is created; no Telegram message is sent
Traces: contract (POST /v1/products §3.4 — price missing/non-numeric/≤0)
Check: fetch_url

---

**Scenario**: Photo with a disallowed content type is rejected with 400 and nothing is written
**Given**: A valid session token
**When**: `POST /v1/products` is called with a valid name/note/price and an `image` part whose content type is `image/gif`
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`; no row is created; no file is written to `/images/products/`; no Telegram message is sent
Traces: SC-12 (CMS SRS failure table — Invalid input, photo)
Check: fetch_url

---

**Scenario**: Photo over 5MB is rejected with 400 and nothing is written
**Given**: A valid session token
**When**: `POST /v1/products` is called with a valid name/note/price and an `image` part of content type `image/jpeg` whose size is 5MB + 1 byte
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`; no row is created; no file is written; no Telegram message is sent
Traces: SC-12 (CMS SRS failure table — Invalid input, photo)
Check: fetch_url

---

**Scenario**: An undefined multipart field is rejected with 400, never silently accepted
**Given**: A valid session token
**When**: `POST /v1/products` is called with valid `name`, `note`, `price` parts plus an extra part named `discount` that this contract does not define
**Then**: Response is `400` with `error.code = "MALFORMED_REQUEST"`; no row is created; no Telegram message is sent
Traces: contract (§2.5 validation boundary, §3.4 undefined-part rule)
Check: fetch_url

---

**Scenario**: Database unavailable during save returns 500 and nothing is attempted
**Given**: A valid session token; the database is made unreachable (e.g. `set_db_available(false)` or the `products` table renamed/dropped) while the backend stays up
**When**: `POST /v1/products` is called with a well-formed multipart body (valid name, note, price)
**Then**: Response is `500` with `error.code = "INTERNAL"`; no row is created once the database is restored and checked via `GET /v1/products`; no Telegram message is sent
Traces: SC-13 (CMS SRS failure table — Upstream failure, database)
Check: fetch_url

---

**Scenario**: Successful save response matches the contract's revised shape
**Given**: A valid session token; a working Telegram configuration
**When**: `POST /v1/products` is called with a valid name, note, price and no photo
**Then**: Response is `201` with header `Location: /v1/products/<id>` and body containing `id`, `name`, `note`, `price` (string), `image` (`""`), `added` (ISO date) and `telegram_sent` (boolean)
Traces: contract (POST /v1/products §3.4 success response)
Check: fetch_url

---

**Scenario**: Each submission creates its own independent row, even for an identical product
**Given**: A valid session token
**When**: `POST /v1/products` is called twice in a row with the exact same `name`, `note` and `price`
**Then**: Both calls return `201` with two distinct `id` values; `GET /v1/products` lists both rows
Traces: contract (§2.6 idempotency; CMS SRS failure table — Conflict, "not applicable")
Check: fetch_url
