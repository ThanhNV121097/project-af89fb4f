
# Test cases — The site as designed

Module: `site`
Function: The site as designed
Story: `docs/site/stories/the-site-as-designed.md` (SC-1 … SC-9)
SRS: `docs/site/SRS.md` (SITE-001, SITE-002)

## Coverage note

This story ships the approved Home page (`/`) wired to the existing static
fixtures in `code/frontend/src/data/products.json` (12 rows, already ordered
newest-first by `added`). It introduces no backend endpoint — `GET
/v1/products` belongs to the later "Site data from the database" story — so
no service-contract cases (status codes, error envelope, undefined fields)
apply here; every case below traces to an `SC-n` in the story plan.

Risk is concentrated on SITE-002's paging/show-more behaviour (state that can
silently drop or duplicate rows) and the two stats computed from the full
set rather than the loaded page (SITE-001 AC-2/AC-3, an easy off-by-page
bug). Presentational conditionals (note present/absent, missing image) are
already-built, low-risk logic; cases 5 and 10 are included for traceability
but cannot be exercised against the current fixture set (see their `Check`
note) and are honestly marked `manual`.

---

**Scenario**: Window shows up to four products with photo, price and name
**Given**: The fixture set has 12 products (`code/frontend/src/data/products.json`)
**When**: A visitor loads `/`
**Then**: The window row shows exactly 4 product figures, the four newest by
`added` (`kitchen-scale`, `skillet`, `stoneware-plate`, `candy-jar`), each
with its photo (`ProductImage`), its formatted price and its name visible
Traces: SC-1 (SITE-001 AC-1)
Check: render_url

---

**Scenario**: The window's "count" stat shows the total, not the loaded page
**Given**: 12 products exist in total and only 4 are loaded into the window
**When**: A visitor loads `/`
**Then**: The element `[data-testid="shelf-count"]` reads `12`, not `4` or
`8`
Traces: SC-2 (SITE-001 AC-2)
Check: render_url

---

**Scenario**: The window's "newest" stat names the product with the latest `added` date
**Given**: `kitchen-scale` has the latest `added` date (`2026-10-28`) of all 12 products
**When**: A visitor loads `/`
**Then**: The "Last added" stat's value shows `Kitchen scale, 5kg`
Traces: SC-3 (SITE-001 AC-3)
Check: render_url

---

**Scenario**: A shelf card with a `note` shows photo, name, price and the note text verbatim
**Given**: `glass-jar` is on the shelf (not in the window) and has a `note` of
"Thick glass with a rubber seal. For flour, coffee, anything dry."
**When**: A visitor views `[data-testid="product-glass-jar"]` on the shelf grid
**Then**: The card shows the product photo, the name "Clip-top jar, 1 litre",
the price via `[data-testid="product-glass-jar-price"]`, and the note text
exactly as stored, with no truncation or alteration
Traces: SC-4 (SITE-002 AC-1)
Check: render_url

---

**Scenario**: A shelf card with no `note` renders no empty description line
**Given**: A product exists with `note` absent or empty
**When**: A visitor views that product's card on the shelf
**Then**: The card shows photo, name and price only — no empty `<p>` element
is rendered where the note would go (`ProductCard`'s `{product.note && ...}`
conditional)
Traces: SC-5 (SITE-002 AC-2)
Check: manual — every row in the current fixture set (`products.json`) has a
non-empty `note`; no instrument available to Test can add a note-less
product to the static bundle, so this is reviewed by reading `ProductCard`'s
render against a product whose `note` is cleared in a local build.

---

**Scenario**: "Show more" is visible when more products exist than are loaded, and appends without a reload
**Given**: 12 products exist; the shelf initially loads 8 (`useCollection`'s
`pageSize=8`), so the shelf grid (after excluding the 4 window products)
shows the first 4 of those 8
**When**: A visitor clicks `[data-testid="show-more"]`
**Then**: Before the click, the button is visible; after the click, the
remaining products are appended to the shelf grid, `window.location` does
not change and no full page reload occurs (the page's existing DOM nodes for
the first products are still present, not replaced)
Traces: SC-6 (SITE-002 AC-3)
Check: interact_page

---

**Scenario**: "Show more" disappears once every product is loaded
**Given**: All 12 products have already been loaded onto the shelf (one
click of "Show more" from the initial 8-of-12 state)
**When**: A visitor views the shelf
**Then**: `[data-testid="show-more"]` is not present in the page
Traces: SC-7 (SITE-002 AC-4)
Check: interact_page

---

**Scenario**: A loading indicator appears while the next page of the shelf is fetched
**Given**: A visitor is on `/` with the shelf's first page loaded and more
products remaining
**When**: The visitor clicks `[data-testid="show-more"]`
**Then**: The loading text (`shelf.loading` copy, "Loading the next few…")
is present in the DOM during the fetch
Traces: SC-6 (SITE-002 behaviour 4, the shelf's loading state)
Check: interact_page

---

**Scenario**: A "Sign in" link in the header reaches `/login`
**Given**: A visitor is signed out, viewing `/` at a desktop width (header nav visible)
**When**: The visitor clicks `[data-testid="header-signin"]`
**Then**: The browser navigates to `/login`
Traces: SC-8 (SITE-002 AC-5)
Check: interact_page

---

**Scenario**: A "Sign in" link in the footer reaches `/login`
**Given**: A visitor is viewing `/`, scrolled to the footer
**When**: The visitor clicks the footer's "Shop sign-in" link (`shelf.owner_link`)
**Then**: The browser navigates to `/login`
Traces: SC-8 (SITE-002 AC-5)
Check: interact_page

---

**Scenario**: The page renders without horizontal overflow at 320px wide, and the window collapses to a stacked layout below `lg`
**Given**: A visitor's viewport is 320px wide
**When**: The visitor loads `/`
**Then**: The page's scrollable width equals the viewport width (no
horizontal scrollbar), and the window section's grid (`lg:grid-cols-[...]`)
is not applied — the photo and the words stack vertically
Traces: SC-9 (SITE §6 Responsive)
Check: measure_styles

---

**Scenario**: A product with no image falls back to the placeholder slot
**Given**: A product exists whose `image` field is empty
**When**: A visitor views that product's card
**Then**: `ProductImage` renders its `slot` placeholder block instead of a
broken `<img>`
Traces: SC-4/SC-5 (SITE-002 boundary row — "missing `image` falls back to
the existing placeholder slot")
Check: manual — no product in the current fixture set has an empty `image`,
so this is reviewed by reading `ProductImage`'s conditional render rather
than by observing the live page.

---

**Scenario**: Zero products render an empty window and an empty shelf grid, with no separate empty-state screen
**Given**: The product collection is empty
**When**: A visitor loads `/`
**Then**: The window section renders zero product figures and the shelf
grid renders zero cards; no additional "no products" message or screen is
shown, per the SRS's own note that none is built
Traces: SRS §4.1 failure table ("Empty")
Check: manual — the static fixture bundle always ships its 12 rows; no
instrument available to Test can empty it without a code/data change, so
this is a code-reading check against `Home.tsx`'s render.
