# Moodboard — Shelf

One small shop, a short shelf of goods, one person adding them from the back room.
Three screens: the public shelf, a sign-in, and the work surface behind it. The owner
chose **Window display** after seeing it drawn; this file is how that choice becomes a
whole site rather than one hero.

Working name on the site: **Shelf** — the owner gave none, and the project's listed title
is a working title. Contact: brian.ng.2305@gmail.com.

## The sites I learned from

| Site | What I watched | What I take |
|---|---|---|
| land-book.com (gallery) | Load settles with no motion at all, then a dense tiled index of real screenshots; two sticky elements; Inter. | The index logic: the page IS its contents, with a thin label row above it and nothing between the reader and the goods. No preamble band on the home page. |
| awwwards.com/websites (gallery) | A grid of cards where the picture owns the whole card and the metadata is a quiet line under it; Inter Tight; no scroll library. | Picture owns the card, text is a hairline-ruled caption under it, not a panel beside it. |
| linear.app + linear.app/now | Dark ground, very short reveals (16–24px, ~0.5s) as each band enters, hover that lifts a border rather than a shadow; Inter Variable + Berkeley Mono; nothing pinned. | The reveal timing and the hover: borders answer, nothing glows. And the dark ground read against photographs. |
| are.na | Index pages with hairline rules, small letterspaced labels, numbers set as data, their own sans (areal); content set flush left with one strong edge. | The hairline rule + small-caps label system, and setting counts and prices as data rather than decoration. |
| raycast.com | A product shot sitting on a dark ground with light behind it rather than a white box; type is modest, the thing is large. | Cut-out goods laid straight on the dark ground, lit by the tile behind them, never in a white box. |

Taken, not copied: none of their palettes, none of their type pairings, no arrangement a
visitor would recognise as theirs. Three things on this page they could not have: a shop
photograph bled off the left edge to the viewport with the type starting where it ends; a
goods row that runs off the right edge mid-card; a CMS form that writes the Telegram
message as you type it.

## The direction — Window display

A dark site: ground `#121211`, surface `#1C1B19`, ink `#F2EFE8`, soft ink `#A8A29A`,
accent `#D98B3A` (the colour of the shop's own lamp light, which is also what the hero
photograph is made of), accent ink `#121211`, hairline `rgba(242,239,232,0.14)`, field
edge `rgba(242,239,232,0.45)`. `color-scheme: dark`, one mode, no switch.

One family, two jobs: **Archivo** — display 500 at −0.025em, body 400. The price and the
heading are cut from the same metal, and Archivo's tabular figures are what a price needs.
No serif, no second face; the house style's one allowance is **not** spent here, and
nothing else is unlocked either.

Scale at 1440: h1 56px / 1.05, h2 34px, product name 22px, price 30px tabular. 56 and not
72 because the first screen has to carry four goods with their prices — a shop page that
spends the fold on a headline has shown nothing.

Motion: a short load moment — the photograph fades up and the type rises 16px behind it,
under 0.7s — then light reveals as the shelf and the rows enter (16px, 0.6s,
`cubic-bezier(0.2,0.7,0.2,1)`), and a hover that answers by lifting the tile's hairline to
the accent. Native scrolling, nothing pinned or scrubbed, no marquee.
`prefers-reduced-motion` turns all of it off and the page is simply there.

The CMS is the other kind of screen entirely, in the same palette: menu down the left, a
real table, the page's action top right, no hero and no footer.

## Tried and dropped

- A full-bleed photograph behind the whole catalogue — the cut-out goods lost their edge
  against it, and the price stopped being the loudest thing on the row.
- Numbered rows (01/02/03) on the catalogue: the shelf is not a sequence, so the numbers
  would be decoration. They stay in the CMS table, where a row number is real.
- A contact form: this is a tool, and the one way in touch the owner gave is an email
  address. It is written in the footer and in the shelf's own aside, as given.

## COMMITMENTS

- The shop photograph bleeds off the left edge of the viewport, full height of the first screen, with no margin and no rounding, at every width from 1024px up.
- The goods row at the foot of the first screen runs past the right edge of the viewport, cut mid-card, so the shelf reads as continuing.
- Every price is set in the accent #D98B3A, tabular, 30px at 1440 — larger than the product name (22px) on every card and every row.
- A small-caps letterspaced label runs vertically up the left edge of the hero photograph.
- Catalogue cards have no border and no shadow: a lit #E7E2D8 shelf tile with the cut-out good on it, the price in the accent and the name under a single hairline rule. (Changed from a #1C1B19 tile after the first crit: dark goods cut out onto the dark ground drew as empty tiles.)
- The CMS is a left-menu application: menu always on screen above 1024px, a real table with its total under it, the page's action top right, and no marketing header or footer.
- The sign-in page is split in two full-height halves — the form on the left on the same left edge as the home page's words, the photograph full-bleed on the right half.
- The add-product form shows the exact Telegram message it will send, in the accent, written live as the name and the price are typed.
