# Directions — a tiny product catalogue for one small shop

Working name on the site: **Shelf** (the owner gave no name; this is a short, fitting
one for a single-shelf shop, and the project's listed title is a working title, not a
brand). Contact: brian.ng.2305@gmail.com.

The products, prices and descriptions on the two pages are SAMPLES — the owner supplied
none (no `data/owner/` on the branch). They are there so the directions can be judged with
real-looking goods; the real ones go in through the CMS.

## The reading

This is one shop with a short shelf: a handful of goods, each with a photograph, a name, a
line of description and a price, and the owner adds them one at a time from a phone or a
laptop in the back of the shop. Nobody buys here — there is no cart, no checkout, no
account, no search — so the home page is doing exactly one job: showing somebody who
already knows the shop, or who was sent a link, what is on the shelf right now and what it
costs. That means the visitor arrives either to be told what is good (they trust the
owner's eye) or to check a price before coming in; either way the picture and the number
are the whole page, and everything else is in the way. What the shop sells on is taste and
trust, not range: with ten or fifteen items, each one has to look chosen. And what this is
NOT: not a storefront, not a brand site with a story page, not a marketplace — the
second and third screens are a sign-in and a work surface for one person, so the public
page carries no navigation worth speaking of and the admin side is a tool, not a brochure.

## Window display

- **Suits you if:** your customers come because they trust your eye — you want the page to
  feel like looking into your window after closing time, where the photograph of the thing
  does the selling and the price is said plainly underneath.
- **Palette (light):** ground `#121211`, surface `#1C1B19`, ink `#F2EFE8`, ink-soft
  `#A8A29A`, accent `#D98B3A`, accent-ink `#121211`, line `rgba(242,239,232,0.14)`
  (field-line `rgba(242,239,232,0.45)`). A dark site — `color-scheme: dark`.
- **Faces:** display Archivo (500, tracking −0.025em); body Archivo (400). One family, two
  jobs, so the price and the heading are cut from the same metal.
- **Scale at 1440:** h1 56px / leading 1.05, h2 34px, product name 22px, price 30px
  tabular. 56 and not 72: the first screen has to carry four goods with their prices, and
  a shop page that spends the fold on a headline has shown nothing.
- **First screen:** one atmospheric shop photograph bleeding off the left edge to the
  viewport, the name and one line of type on the right, and the shelf itself — cut-out
  goods on the dark ground, name and price over each — running off the right edge so the
  row reads as continuing.
- **The one device:** the goods row bleeds past the right edge of the viewport, with the
  prices set in the accent at the same size as the names.

## The price board

- **Suits you if:** people ask you "how much is it?" before anything else, and you would
  rather answer that in the biggest type on the page than make them hunt for a number
  under a photograph.
- **Palette (light):** ground `#FFFFFF`, surface `#F4F4F2`, ink `#101010`, ink-soft
  `#6B6B6B`, accent `#1F3CFF`, accent-ink `#FFFFFF`, line `rgba(16,16,16,0.12)`
  (field-line `rgba(16,16,16,0.45)`). A light site — `color-scheme: light`.
- **Faces:** display Space Grotesk (500, tracking −0.03em); body Inter (400). The grotesk
  carries the numbers, Inter carries the descriptions, and the two do not look alike.
- **Scale at 1440:** h1 44px, h2 28px, product name 28px, price 52px tabular — the price is
  the largest thing on its row. Deliberately small at the top so the board starts high.
- **First screen:** no hero photograph at all — a hairline-ruled board of rows, each row a
  cut-out of the thing on the left, its name and its line of description in the middle and
  its price set large and right-aligned, with a single tall photograph of the shop locked
  to the right edge, full height.
- **The one device:** a hairline rule system — every row a 1px rule, with the row numbers
  set as oversized tabular numerals in the left margin.
