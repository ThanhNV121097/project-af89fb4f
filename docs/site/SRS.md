# SRS — Site

Module: `site`
Design: [View the approved design](http://localhost:9400)
Design system: `design/design-system.md`

## 1. Purpose

Shelf's public face: one page listing the shop's products, each with a photo, a name, a short description and a price. This is what a customer sees without signing in — if this module did not exist, there would be nothing public to look at at all.

## 2. Actors

| Actor | Who they are | What they may do in this module |
|---|---|---|
| Visitor | Anyone, signed in or not | View the Home page: the window (newest four products) and the full shelf below, paged |

## 3. Scope

**In scope**

- The site as designed: Home (`/`) exactly as built in `Home.tsx` — the window section, the shelf grid, "Show more" paging, and the footer link to `/login`.

**Out of scope**

- The product data itself (reading, paging, filtering at the API level) — belongs to the `data` module; this module covers only the screen that renders it.
- Login and the CMS — belong to the `auth` and `cms` modules respectively; this module's only connection to them is the "Sign in" link in the footer.
- Cart, ordering, checkout, online payment, customer sign-up, newsletter, blog, search, map — deliberately not built, per the brief's own exclusion list.

## 4. Functional requirements

### 4.1 The site as designed

**Requirement SITE-001 — The window shows the newest products**

*As a* visitor, *I want to* see the shop's newest products immediately on landing, *so that* I know what is new without scrolling.

Behaviour:

1. Home renders a window section: a shop photograph, the site name and one line of type, three stats (count, newest product's name, contact email), a "see the shelf" link, and a row of up to four products (the newest, by `added`).
2. Each of the four products in the window shows its photo, price and name (as already built: `ProductImage`, `formatPrice`, name).
3. The stats panel's "count" stat shows the total number of products (`rest.total`, every match, not just the loaded page).

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | At least one product exists | A visitor loads `/` | The window shows up to 4 products, each with photo, price and name |
| AC-2 | N products exist in total | A visitor loads `/` | The "count" stat shows N, not the number of products currently loaded on the page |
| AC-3 | A product exists with the latest `added` date | A visitor loads `/` | That product's name appears as the "newest" stat |

**Requirement SITE-002 — The shelf lists every other product, with photo, name, description and price**

*As a* visitor, *I want to* see every product on the shelf — not just the newest four — each with its photo, name, short description and price, *so that* I can browse the whole catalogue.

Behaviour:

1. Below the window, the shelf section lists every product not already shown in the window, each as a card with photo, name, price, and its short description (`note`) when present.
2. The shelf shows a running total ("shelf.total" + count) of all products, matching the window's count.
3. A "Show more" button is shown whenever more products exist than are currently loaded; clicking it loads and appends the next page.
4. The shelf shows a loading indicator while a page is being fetched.
5. A footer line under the shelf names when the newest product was added, and a "Sign in" link reaches `/login`.

**Acceptance criteria**

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | A product has a `note` | A visitor views its card on the shelf | The card shows its photo, name, price and the `note` text |
| AC-2 | A product has no `note` | A visitor views its card on the shelf | The card shows photo, name and price; no empty description line is rendered (matches `ProductCard`'s existing conditional render) |
| AC-3 | More products exist than are currently loaded | A visitor views the shelf | A "Show more" button is visible; clicking it appends the next page without a full reload |
| AC-4 | Every product is already loaded | A visitor views the shelf | No "Show more" button is shown |
| AC-5 | A visitor views the page | — | A "Sign in" link is present and reaches `/login` |

**Failure, boundary and permission behaviour**

| Case | Condition | Expected behaviour |
|---|---|---|
| Empty | Zero products exist | Not applicable to this module's own behaviour beyond what §4.1 already specifies: the window renders zero cards and the shelf renders an empty grid; the approved design has no distinct "no products at all" empty-state screen beyond the already-built loading text, so none is added here |
| Upstream failure | The products API is unreachable | Handled by the `data` module's `useCollection` contract (DATA-004); this screen renders whatever `loading`/`error` state that hook reports, with no additional screen of its own |
| Not permitted | — | Not applicable: this entire module is public, no permission check applies |
| Boundary | A product's `note`, `name`, or `image` is missing | Rendered as already built: missing `note` omits the description line (AC-2); missing `image` falls back to the existing placeholder slot (`ProductImage`'s `slot` prop) |

**Data touched** — none written by this module; it reads `products` fields (`name`, `note`, `price`, `image`, `added`) specified in the `data` module.

## 5. Screens

| Screen | Section in the design | Functions it serves | States that must exist |
|---|---|---|---|
| Home (`/`) | Window section + shelf section, `Home.tsx` | SITE-001, SITE-002 | default, loading (shelf fetching a page), more-available (Show more button shown) |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Home's first paint of the window section completes within 2s at 1 Mbps, cold cache |
| Accessibility | Images carry alt text (already built); the "Show more" control and "Sign in" link are keyboard reachable |
| Responsive | Works at 320px and up; the window collapses from the two-column desktop layout to a stacked mobile layout, the shelf grid to 2 columns on phone (already built via `Grid`) |
| Localisation | Copy is in English; prices formatted via the existing `formatPrice` (USD) |

## 7. Dependencies and assumptions

- **Depends on:** `data` module, for `GET /v1/products` (public, paged).
- **Assumption:** none beyond what `data` and the approved design already settle.

| Open question | Proposed default | Who decides |
|---|---|---|
| — | — | Not applicable: no undecided point remains for this module |

## 8. Traceability

| Plan item | Requirement ids | Test cases |
|---|---|---|
| The site as designed | SITE-001, SITE-002 | `test-cases/the-site-as-designed.md` |
