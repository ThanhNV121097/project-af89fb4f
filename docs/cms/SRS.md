# SRS — CMS

Module: `cms`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

Behind the sign-in, the shop owner and admins manage the shelf's products: see the list, add a new one, and have the shop's Telegram group told about it. This is the only way a product reaches the shop's public page — without this module, the shelf never changes.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Admin | Signed-in owner or admin (see `auth` module) | List products, add a new product, trigger the Telegram notification |
| Visitor | Not signed in | None of this module's functions — gated entirely by `auth`'s `RequireSignIn` |

## 3. Scope

**In scope**

- Add product saves and notifies Telegram: `POST /v1/products`, storing the row and sending the Telegram message.
- The CMS product list (`CmsProducts.tsx`) showing that saved row via the real API, replacing the session-only mock store.

**Out of scope**

- Editing or deleting an existing product — not in the approved design (`CmsProducts.tsx` has no edit/delete action) and not in the brief.
- Reading the product list itself — the `GET /v1/products` endpoint and its paging/filtering belong to the `data` module; this module only adds the row that read later returns.
- Checking who may sign in — belongs to `auth`.
- Managing the Telegram group's bot/chat_id value — stored and seeded by the `data` module; this module only reads it to know where to send.

## 4. Functional requirements

### 4.1 Add product saves and notifies Telegram

**Requirement CMS-001 — Saving the form stores the product**

*As an* admin, *I want to* fill in a photo, name, short description and price and save, *so that* the product appears on the shelf and in the CMS list.

Behaviour:

1. The admin fills Name, Short description, Price (and optionally a Photo file) on `/cms/products/new` and submits.
2. The system validates the form client-side exactly as built today: name and note non-empty, price a number greater than 0 — unchanged from the existing `Form`'s `submit` check.
3. The form submits as `multipart/form-data` to `POST /v1/products`: fields `name`, `note`, `price`, and, when a file was chosen in the existing `<input type="file" accept="image/jpeg,image/png,image/webp">`, a part named `image` carrying that file.
4. When a file part is present, the server writes it to disk under the existing photo-slot convention — `/images/products/<id>.<ext>` (`<ext>` from the file's content type: `jpg`, `png` or `webp`), `<id>` the row's newly assigned id — and stores that path string in `products.image`. When no file part is present, `products.image` is stored empty, same as today, and `ProductImage`'s existing placeholder slot renders.
5. `POST /v1/products` stores the new row (name, note, price, image) in the `products` table.
6. The response is the saved row, including its assigned id and `added` date.
7. The new row appears on `GET /v1/products` thereafter — visible both in the CMS list (`/cms/products`) and the public Home page, its photo served from the `image` path.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A signed-in admin on `/cms/products/new` | The admin fills name, note, price > 0 and submits | `POST /v1/products` is called; the response's row appears at the top of `/cms/products`'s table |
| AC-2 | The row from AC-1 was saved | A visitor loads the Home page | The new product is present among the public listing |
| AC-3 | The form is empty, or price is 0 or negative | The admin submits | The existing `form-error` message is shown ("Fill in the name, the description and a price above zero."); no request is sent |
| AC-4 | A signed-in admin chooses a JPEG/PNG/WebP file for Photo and fills the rest | The admin submits | The server stores the file at `/images/products/<id>.<ext>`, `products.image` holds that path, and the saved row's photo renders on both `/cms/products` and the public Home page |
| AC-5 | No file is chosen for Photo | The admin fills the rest and submits | `products.image` is stored empty; the saved row renders `ProductImage`'s existing placeholder slot, same as a product with no photo today |

**Requirement CMS-002 — Saving sends the Telegram message**

*As the* system, *I want to* tell the shop's Telegram group when a product is added, naming it and its price, *so that* the owner's group always hears about new stock without checking the site.

Behaviour:

1. After the product in CMS-001 is stored, the system sends a message to the Telegram group named in the `telegram` table's `chat_id`, through the bot named by its `bot` token.
2. The message text is the same wording the existing live preview builds (`messageFor`): `New on the shelf: <name> — <formatted price>`.
3. The save is not rolled back if the Telegram call fails — the row from CMS-001 stays saved regardless.
4. The UI's saved-notice reflects what actually happened: saved, and whether the Telegram send succeeded.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A `telegram` row with a real `chat_id` and a working bot token | An admin saves a valid product | The configured Telegram group receives a message reading `New on the shelf: <name> — <price>` |
| AC-2 | The Telegram API call fails (bad token, network error, group unreachable) | An admin saves a valid product | The product is still saved (CMS-001 unaffected) and the `saved-notice` says it was saved but the Telegram send did not succeed |
| AC-3 | The Telegram call succeeds | An admin saves a valid product | The `saved-notice` says saved, and sent to the Telegram group (as the existing copy already reads) |

**Requirement CMS-003 — Only a signed-in admin may add a product**

*As the* system, *I want to* refuse `POST /v1/products` to anyone without a valid admin session, *so that* only the owner and admins can add stock or trigger a Telegram message.

Behaviour:

1. A caller with no session, or with a session that is invalid, expired or forged, calls `POST /v1/products`; the system responds 401 and stores nothing. One status covers both cases — matching `auth` module's AUTH-003 and `data` module's DATA-002, which use the same rule for their own session-gated reads.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | No session | A caller calls `POST /v1/products` with a valid body | 401, no row created, no Telegram message sent |
| AC-2 | An invalid/expired/forged session token | A caller calls `POST /v1/products` with a valid body | 401, no row created, no Telegram message sent |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Invalid input | Name or note empty, or price ≤ 0, submitted anyway (e.g. direct API call bypassing the form) | `POST /v1/products` responds 400; no row created, no Telegram message sent |
| Not permitted | No session / invalid session | 401 for both — CMS-003 |
| Upstream failure | Telegram API unreachable or returns an error | Row is still saved (CMS-002 AC-2); `saved-notice` reports the Telegram failure, no retry is built since the design has no retry affordance |
| Upstream failure | Database unavailable while saving | 500-class response; nothing is saved, no Telegram message is attempted (there is nothing to notify about) |
| Boundary | Photo omitted | Accepted — the design's own form allows submitting with the placeholder-photo state (`photo` optional in the existing `Form`) |
| Conflict | Two admins submit the same product at the same moment | Not applicable: each submission creates its own independent row; there is no shared record being edited |

**Data touched**

| Field | Type | Required | Rule |
|---|---|---|---|
| name | text | yes | non-empty |
| note | text | yes | non-empty, short description |
| price | numeric | yes | > 0, USD |
| image | text | no | URL/path; blank uses the existing placeholder slot |
| added | text | yes | set by the server, ISO date, not supplied by the client |

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| CMS products list (`/cms/products`) | `CmsProducts.tsx` | CMS-001 (shows the saved row) | default, loading, empty (the existing "No product matches that…" copy) |
| Add a product (`/cms/products/new`) | `CmsNewProduct.tsx` | CMS-001, CMS-002 | default, error (validation), saved (saved-notice shown, with its Telegram outcome) |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | `POST /v1/products` responds within 2s at 1 Mbps, cold cache, including the Telegram call attempt |
| Privacy | The Telegram bot token is kept server-side as a secret, never sent to the browser |

## 7. Dependencies and assumptions

- **Depends on:** `auth` module, for the session that gates this endpoint; `data` module, for the `products` table written to and the `telegram` row read for the bot/chat_id.
- **Assumption:** the Telegram bot has already been added to the shop's group by the owner (outside this system) so its `chat_id` is valid once seeded.

| Open question | Proposed default | Who decides |
|---|---|---|
| — | — | Not applicable: no undecided point remains for this module |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| Add product saves and notifies Telegram | CMS-001, CMS-002, CMS-003 | `test-cases/add-product-saves-and-notifies-telegram.md` |
