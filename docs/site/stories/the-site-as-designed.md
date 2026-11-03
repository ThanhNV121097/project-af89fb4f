# Story — The site as designed

Module: `site`
Plan item: The site as designed
SRS: `docs/site/SRS.md` (SITE-001, SITE-002)

## User story

As a **visitor** (anyone, signed in or not), I want to land on Shelf's Home
page and see the shop's newest products immediately, then browse every
other product below with its photo, name, description and price, so that I
can see what the shop offers without signing in.

## Scope

### In scope

- The Home page (`/`) exactly as already built in `Home.tsx`, `App.tsx`
  (`Shell`), `ProductCard`, `ProductImage`, `Grid`, `MobileMenu`,
  `MenuToggle`, and `Footer`, wired to render against the fixture data the
  frontend already ships (`src/data/*.json`), unchanged by this story.
- The window section: shop photo, headline/stats (count, newest product
  name, contact email), "see the shelf" link, up to 4 newest products.
- The shelf section: every remaining product as a card (photo, name,
  price, note when present), running total, "Show more" paging, loading
  indicator while a page fetches, footer line ("last added on…") and the
  "Sign in" link to `/login`.
- Responsive behaviour at 320px and up, reduced-motion handling, as already
  built.

### Out of scope

- Reading, paging or filtering products through a real API — this story
  renders against the existing static fixtures; swapping to
  `GET /v1/products` is the "Site data from the database" story
  (depends on it; this story ships first and is ref-wired later, per
  architecture overview §6 sequencing).
- `/login` and the CMS screens — their own modules/stories (`auth`, `cms`);
  this story's only connection to them is the footer/header "Sign in" link,
  which must be present and point to `/login`, but the screen it points to
  is not built here.
- Telegram notification — belongs to the "Add product saves and notifies
  Telegram" story.
- Cart, ordering, checkout, online payment, customer sign-up, newsletter,
  blog, search, map — deliberately excluded from the whole site per the
  brief.
- Any new screen, section or copy not already present in the approved
  design (`Home.tsx`, `content.json`, `theme.css`) — this story ships the
  design as built, not a redesign.

## UI scope

Single screen: Home (`/`), both its states —
- default (window + shelf with first page loaded)
- loading (shelf fetching the next page)
- more-available (Show more button shown when more products remain)

No screen in this story has nothing a visitor sees — Home is itself the UI,
so there is no backend-only half to fold elsewhere.

## Acceptance criteria

SC-1 [SITE-001 AC-1]: Given at least one product exists, when a visitor
loads `/`, the window shows up to 4 products, each with photo, price and
name.

SC-2 [SITE-001 AC-2]: Given N products exist in total, when a visitor loads
`/`, the window's "count" stat shows N (the total), not the number of
products currently loaded on the page.

SC-3 [SITE-001 AC-3]: Given a product exists with the latest `added` date,
when a visitor loads `/`, that product's name appears as the window's
"newest" stat.

SC-4 [SITE-002 AC-1]: Given a product has a `note`, when a visitor views its
card on the shelf, the card shows its photo, name, price and the `note`
text.

SC-5 [SITE-002 AC-2]: Given a product has no `note`, when a visitor views
its card on the shelf, the card shows photo, name and price with no empty
description line rendered.

SC-6 [SITE-002 AC-3]: Given more products exist than are currently loaded,
when a visitor views the shelf, a "Show more" button is visible; clicking it
loads and appends the next page without a full page reload.

SC-7 [SITE-002 AC-4]: Given every product is already loaded, when a visitor
views the shelf, no "Show more" button is shown.

SC-8 [SITE-002 AC-5]: When a visitor views the page, a "Sign in" link is
present (header and footer, as built) and points to `/login`.

SC-9 [SITE §6 Responsive]: The page renders without horizontal scroll or
broken layout at 320px width, and the window collapses to the stacked
mobile layout below the `lg` (1024px) breakpoint per the design system.

## Dependencies

- None blocking: this story builds against the existing static fixtures
  already in `code/frontend/src/data/`, which the design phase already
  shipped. No backend call, no other story's output, is required to start
  or finish this story.
- The "Site data from the database" story later replaces the fixture reads
  with `GET /v1/products` — that is a follow-on change to this same
  `Home.tsx`/data layer, not a prerequisite for this story.
- The `/login` destination of the "Sign in" link is built by a separate
  story (`auth` module); this story only requires the link to exist and
  point at `/login`.
