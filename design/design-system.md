# Design System — Shelf

> Source of truth: the approved design in `code/frontend/src` — three screens
> (the public shelf, sign-in, and the CMS behind it). Every value below is
> extracted from `theme.css`, `content.json`, `App.tsx` and the components
> each screen actually renders. Changing a value here without changing the
> approved design is a defect.

Last updated: 2026-11-03

Direction: **Window display** — a dark shop after closing time, one warm
lamp. One mode only (`color-scheme: dark` in `theme.css`); there is no light
theme to document.

## 1. Foundations

### 1.1 Color

| Token | Value | Used for |
|---|---|---|
| `--ground` | `#121211` | Page background |
| `--surface` | `#1C1B19` | Card / input / dashboard panel background |
| `--ink` | `#F2EFE8` | Body text, headings |
| `--ink-soft` | `#A8A29A` | Secondary text, captions, labels |
| `--accent` | `#D98B3A` | Price, links, primary button fill, focus border |
| `--accent-ink` | `#121211` | Text on `--accent` |
| `--line` | `rgba(242,239,232,0.14)` | Hairline divider (header, footer, card rules) — deliberately faint |
| `--field-line` | `rgba(242,239,232,0.45)` | Input / select border — a field's edge has to be findable, `--line` is not |
| `--product-ground` | `#E7E2D8` | The tile a cut-out product photo stands on (light in both the site's one dark mode) |
| `--product-ground-ink` | `#57534E` | Caption text on `--product-ground` (empty-photo placeholder) |

#### Contrast audit

| Foreground | Background | Ratio | Passes |
|---|---|---|---|
| `--ink` | `--ground` | 16.3:1 | AA |
| `--ink` | `--surface` | 15.0:1 | AA |
| `--ink-soft` | `--ground` | 7.4:1 | AA |
| `--ink-soft` | `--surface` | 6.8:1 | AA |
| `--accent` | `--ground` | 6.9:1 | AA (links, "Show more", price) |
| `--accent` | `--surface` | 6.3:1 | AA |
| `--accent-ink` | `--accent` | 6.9:1 | AA (filled button text) |
| `--product-ground-ink` | `--product-ground` | 5.9:1 | AA |
| `--field-line` (blended) | `--surface` | 4.0:1 | AA (UI border, ≥3:1 required) |

`--line` carries no text and is not held to a text ratio — it is a deliberately
near-invisible section rule, not an input edge; `--field-line` is the token
that has to be findable, and it is.

### 1.2 Spacing

Base unit: `4px`. Every margin, padding and gap in the product is one of these.

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |

### 1.3 Typography

One family, two jobs: Archivo carries both the display face and the body —
the price and the heading are cut from the same metal. Loaded from Google
Fonts at weights 400/500/600 (`index.html`).

- Display: `"Archivo", system-ui, sans-serif`
- Body: `"Archivo", sans-serif`

| Token | Size (clamp, 375px → 1440px) | Used for |
|---|---|---|
| `--size-h1` | 32px → 56px | Hero headline |
| `--size-h2` | 24px → 34px | Section heading ("The shelf, in the order it arrived") |
| `--size-price` | 24px → 30px | Product price — deliberately larger than the name |
| `--size-name` | 18px → 22px | Product name |
| `--size-label` | 11px | Eyebrow / uppercase label, with `--tracking-label: 0.2em` |
| body | 17px / line-height 1.6 | Running text (`index.css`) |

56px, not 72: the first screen carries four goods with their prices, and a
shop page that spends the fold on a headline has shown nothing. Heading
levels (h1 hero → h2 section) are used in order, never skipped for visual
sizing.

| Token | Value | Used for |
|---|---|---|
| `--weight-display` | `500` | Every `h1`/`h2`/`h3`, applied globally in `index.css` |
| `--tracking-display` | `-0.025em` | Display headings and the price |
| `--tracking-label` | `0.2em` | Uppercase eyebrows/labels |
| body weight | `400` (browser default) | Running text — never set to `--weight-display` |

Body text is **not** bold by default: Tailwind's preflight resets `h1`–`h3`
to inherit weight, so `index.css` restores `--weight-display` on them
explicitly — without that rule every heading on the site would render at
body weight.

Uppercase is reserved for the label/eyebrow role (`--size-label` +
`--tracking-label`); every other string — button labels, headings, nav
links — is written in sentence case, exactly as `content.json` has it.

### 1.4 Radius, border, shadow, motion

| Token | Value | Used for |
|---|---|---|
| `--radius` / `--radius-sm` | `2px` | Card, input, button, table — the design's one non-pill radius |
| `--radius-pill` | `999px` | Pill-shaped elements only: the mobile menu toggle, a nav badge count |
| border width | `1px` (Tailwind's `border`) | Every rule and field edge |
| `--shadow-sm` / `--shadow-md` | `none` | No shadow anywhere — depth is the lamp in the photograph and a hairline that answers, not elevation |
| `--duration-fast` | `140ms` | Hover/colour transitions |
| `--duration-base` | `600ms` | Page-load reveal (`.rise`, `.fade`) |
| `--ease-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Every transition |

Motion respects `prefers-reduced-motion: reduce`: `.rise`/`.fade` are
disabled and every transition drops to 1ms.

### 1.5 Layout and breakpoints

| Name | Min width | Notes |
|---|---|---|
| (base) | 0 | Phone: 2-column product grid, stacked hero, drawer nav |
| `sm` | 640px | Hero product-row card widens (150px → 190px) |
| `lg` | 1024px | Desktop nav replaces the drawer; hero becomes a 2-column split; CMS sidebar becomes static |

Container: `--page: 1240px` (max content width). Gutter:
`--gutter: clamp(20px, 4.5vw, 56px)`. Header height: `--header-h: 64px`.
No `md`/`xl` breakpoint is used anywhere in the design.

| Layer | Value | Used for |
|---|---|---|
| Base | `0` | Page content |
| Sticky header | `z-50` | The site header |
| Dropdown (Select) | `z-20` | The CMS rows-per-page listbox |
| Drawer / mobile menu | `z-[60]` | The site's mobile nav panel, the CMS mobile sidebar drawer |

## 2. Components

### 2.1 Header / Nav (`App.tsx` → `Shell`)

**Purpose** — the public site's top bar: logo, the one nav link ("The
shelf"), sign-in/sign-out. Sticky, 64px, on the public pages only — the CMS
draws its own shell (`DashboardLayout`).

**Anatomy** — `[Logo] … [nav links] [sign-in or sign-out] [mobile menu toggle]`

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default (signed out) | "Sign in" link, bordered pill button with lock icon | `--line`, `--accent` on hover |
| Signed in | "Sign in" replaced by "Sign out" with logout icon | `--ink-soft`, `--ink` on hover |

### 2.2 MobileMenu (drawer, < 1024px)

**Purpose** — full-screen nav panel below 1024px, opened by `MenuToggle`.

**Anatomy** — `[nav links, large type] [sign-in button]`

**States**

| State | Visual change | Tokens |
|---|---|---|
| Closed | not rendered | — |
| Open | full-screen panel over `--ground`, page scroll locked, closes on outside click/Esc | `--ground`, `z-[60]` |

### 2.3 MenuToggle

**Purpose** — the hamburger/close button that opens/closes `MobileMenu`.

**Anatomy** — icon only (Menu or X), labelled for screen readers.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Closed | Menu icon | `--ink` |
| Open | X icon, hover background | `--surface` on hover, `--radius-pill` |

### 2.4 Footer (`App.tsx` → `Shell`)

**Purpose** — logo + tagline, contact email, sign-in link, photo credits. One
state; it never changes.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | static | `--line` top border, `--ink-soft` |

### 2.5 ProductCard

**Purpose** — one product on the public shelf grid: photo, name, price, note.

**Anatomy** — `[ProductImage] [hairline] [name — price] [note?]`

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | `--surface` tile under the photo | `--surface`, `--line` |
| Hover | tile darkens to `--ground`, the hairline below turns `--accent` | `--duration-fast` |

Price is always larger than the name (`--size-price` > `--size-name`) and set
in `--accent` — the most-read word on the card.

### 2.6 ProductImage

**Purpose** — the fixed frame every product photo sits in, on both the
public shelf and the CMS table/form. Never crops the product
(`object-contain`, never `object-cover`).

**Anatomy** — `[light tile] [photo, 8% inset margin]` or, with no photo yet,
`[light tile] [caption text]`.

**Variants**

| Variant | Tokens | When to use |
|---|---|---|
| `1/1` | `--product-ground` | Default — the shelf grid, the CMS table thumbnail, the "add a product" preview |

**States**

| State | Visual change | Tokens |
|---|---|---|
| Has photo | photo shown, `object-contain`, 8% margin | `--product-ground` |
| No photo | flat tile with caption and a 1px inset ring so the empty frame still has a findable edge | `--product-ground`, `--product-ground-ink`, `--line` |

### 2.7 Grid

**Purpose** — lays out product cards so the last row is never a visual gap
— 2 columns on phone, up to 4 on desktop, column count picked to best fill
the last row.

**States** — one, `default`; it is a layout primitive, not an interactive
control.

### 2.8 Hero / Window (`Home.tsx`)

**Purpose** — the public home page's first screen only: a shop photograph
bled to the left edge, the headline and stats on the right, four newest
products in a horizontally-scrolling row that bleeds off the right edge.

**States** — one, `default`. The photo fades in (`.fade`) and the text/row
rise in (`.rise`) on load; both are disabled under reduced motion.

### 2.9 Primary button (filled)

**Purpose** — the one main action per screen: "Sign in", "Save and send to
Telegram", "Add a product".

**Anatomy** — `[icon?] [label] [icon?]`

**Sizes**

| Size | Padding | Text token |
|---|---|---|
| Default | `--space-6` / `--space-4` horizontal, `py-2.5`–`3` | body, `--font-weight-heading` via `font-display` |

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | `--accent` fill, `--accent-ink` text | `--accent`, `--accent-ink` |
| Hover | opacity 90% | `--duration-fast` |
| Disabled | opacity 60% (form's submit while sending) | — |
| Focus | browser default ring (no custom focus style defined on filled buttons) | — |

### 2.10 Secondary button (outline)

**Purpose** — a lesser action beside a primary one: "All products", "Show
more", header "Sign in" pill.

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | `1px` border, `--line` | `--line` |
| Hover | border and text turn `--accent` | `--duration-fast` |

### 2.11 Text input / textarea

**Purpose** — every text field: login email/password, product name/note/
price, CMS search.

**Anatomy** — `[label, --ink-soft, above] [field]`

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | `1px` border `--field-line`, `--surface` fill | `--field-line`, `--surface` |
| Focus | border turns `--accent` (`outline-none` + `focus:border-accent` — the colour change *is* the focus indicator, no ring) | `--accent` |
| Error (login, add-product forms) | a message line below the form with an alert icon, in `--accent`; the field itself does not change colour | `--accent` |

### 2.12 Select (`components/Select.tsx`)

**Purpose** — every choice-from-a-list control. Never a bare `<select>` —
used by `TableFilters`/`DataTable` for rows-per-page in the CMS; the three
MVP screens have no other list choice.

**Anatomy** — `[button, current label + chevron] [listbox, on open]`

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default | `--field-line` border, `--surface` fill | `--field-line` |
| Open | listbox below, `--surface` fill, `--line` border, options highlight on hover/active in `--accent`/`--accent-ink` | `--accent` |
| Selected option | `aria-selected`, no distinct visual beyond listbox highlight | — |

**Accessibility** — full combobox/listbox roles, arrow/Home/End/Enter/Escape
keyboard navigation, type-ahead, closes on outside click or scroll.

### 2.13 DataTable (CMS product list)

**Purpose** — the CMS's "list of the products": sortable columns, paging,
export, row click-through. Used once, on the Products page.

**Anatomy** — `[table] [row count + page-size Select] [export button] [page nav]`

**States**

| State | Visual change | Tokens |
|---|---|---|
| Default (has rows) | `--surface` background, `--line` row dividers, row hover `--ground` | `--surface`, `--line` |
| Loading | "Loading…" text in place of rows | `--ink-soft` |
| Empty | "No product matches that. Clear the search, or add the product." | `--ink-soft` |

### 2.14 DashboardLayout (CMS shell)

**Purpose** — the shell both CMS pages (Products, Add a product) sit in:
left nav, page title, page actions, signed-in user.

**Anatomy** — `[sidebar: brand + nav groups] [header: title, actions,
session] [content]`

**States**

| State | Visual change | Tokens |
|---|---|---|
| Desktop (≥1024px) | static left sidebar, `--surface` | `--surface`, `--line` |
| Mobile (<1024px) | sidebar becomes a drawer behind a ☰ button, portal over `--ink/40` scrim | `z-[60]` |

### 2.15 RequireSignIn (CMS gate)

**Purpose** — what an unauthenticated visitor sees at a CMS URL: not a
redirect, a page explaining the site is sign-in-only with a way to the login
form.

**States** — one, `default`.

### 2.16 Telegram preview (`CmsNewProduct.tsx`)

**Purpose** — the live preview beside the "Add a product" form, in the exact
words the Telegram bot will post, so the owner approves the sentence before
saving.

**Anatomy** — `[label: "Telegram, on save"] [message preview, --accent,
tabular figures] [status line: group name, or "not set yet"]`

**States**

| State | Visual change | Tokens |
|---|---|---|
| Typing | message updates live from name + price | `--accent` |
| Empty (no name/price yet) | placeholder "New on the shelf: —" | `--ink-soft` |
| Saved | form replaced by a confirmation line with a check icon: "Saved, and sent to the Telegram group." | `--ink` |

## 3. Content and formatting

- Voice: plain, second person where it addresses the owner ("your shelf"),
  otherwise descriptive and unadorned — no marketing copy, no exclamation
  marks.
- Buttons, headings and nav labels: sentence case, exactly as written in
  `content.json` (e.g. "Add a product", "Sign in", "Show more"). Uppercase
  is reserved for the eyebrow/label role only.
- Dates: locale-aware via `Intl.DateTimeFormat`, `site.locale` in
  `content.json` (`"en-US"` for Shelf — e.g. "16 Oct 2026" for the medium
  style used on the shelf's "Last added on" line).
- Prices: locale currency formatting via `Intl.NumberFormat`
  (`lib/format.ts`), tabular figures (`font-variant-numeric: tabular-nums`)
  everywhere a price is shown so digits align.
- Empty/error wording pattern: states the problem plainly and names the next
  action — "No product matches that. Clear the search, or add the product.";
  "Fill in the name, the description and a price above zero."; there is no
  public sign-up, so the login page states who to write to instead of
  showing a dead link.

## 4. Known deviations

| Where | Deviation | Why it stands | Follow-up |
|---|---|---|---|
| Text inputs (`Login`, `CmsNewProduct`, `CmsProducts` search) | `outline-none` with no replacement focus ring — only the border colour changes on focus | The design's own choice for every field on the site, consistently applied; a keyboard user still gets a visible state (border → `--accent`), just not a ring | None — consistent and visible, not the "removed with nothing in its place" anti-pattern, but worth a conscious call-out since `ai-defaults.md` flags bare `outline-none` |
| Primary filled buttons | No distinct focus style beyond the browser default | Same rationale as above; buttons are few (one per screen) | None |

## 5. Change log

| Date | Change | Design PR |
|---|---|---|
| 2026-11-03 | Initial design system, extracted from the approved Window display design | #1 |
