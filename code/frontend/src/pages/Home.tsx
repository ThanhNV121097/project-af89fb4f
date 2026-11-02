import { Link } from "react-router-dom";
import { T, useContent } from "../editable";
import { useCollection } from "../data";
import Grid from "../components/Grid";
import Icon from "../components/Icon";
import ProductCard from "../components/ProductCard";
import ProductImage from "../components/ProductImage";
import { Picture } from "../picture";
import { formatPrice, formatDate } from "../lib/format";

interface Product {
  id: string;
  name: string;
  note?: string;
  price?: number;
  image?: string;
  added?: string;
}

/**
 * The shelf — the public page.
 *
 * The first screen is the window after closing time: the shop photograph bled
 * off the left edge of the viewport, the name and one line of type on the
 * right, and the shelf itself — four cut-out goods on the shop's own dark
 * ground — running off the right edge so the row reads as continuing.
 * Everything below it is the rest of the shelf, paged.
 */
export default function Home() {
  // The window carries the four newest; the shelf below carries the others,
  // so no photograph is shown twice on the page.
  const { items: window4 } = useCollection<Product>("products", { pageSize: 4 });
  const rest = useCollection<Product>("products", { pageSize: 4, page: 2 });
  const email = useContent<string>("contact.email");
  const newest = window4[0];

  return (
    <>
      {/* ── the window ─────────────────────────────────────────────── */}
      <section className="lg:grid lg:grid-cols-[minmax(300px,34vw)_1fr] lg:h-[calc(100vh-var(--header-h))] lg:min-h-[640px]">
        {/* the photograph, bled to the left edge of the viewport, no margin */}
        <div className="relative h-[46vh] min-h-[280px] overflow-hidden lg:h-full fade">
          <Picture
            src="/images/shop-window.jpg"
            alt="Lamps lit in the shop window after closing"
            loading="eager"
            width={1000}
            height={1400}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ground/50 via-transparent to-ground" />
          <span className="absolute bottom-[var(--space-8)] left-[var(--space-4)] text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)] text-ink [writing-mode:vertical-rl] rotate-180">
            <T k="hero.edge" />
          </span>
        </div>

        {/* the words, then the shelf running off the right edge */}
        <div className="flex min-w-0 flex-col overflow-hidden pl-[var(--gutter)] pt-[var(--space-8)] lg:pt-[var(--space-12)]">
          <div className="rise pr-[var(--gutter)]">
            <T k="hero.eyebrow" as="p" className="text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)] text-ink-soft" />
            <div className="mt-[var(--space-6)] flex flex-wrap items-end justify-between gap-[var(--space-8)]">
              <div className="min-w-0">
                <T k="hero.headline" as="h1" className="max-w-[18ch] text-[length:var(--size-h1)]" />
                <T k="hero.sub" as="p" className="mt-[var(--space-4)] max-w-[46ch] text-ink-soft" />
              </div>
              <dl className="shrink-0 text-sm text-ink-soft">
                <div className="border-t border-line py-[var(--space-2)]">
                  <dt className="text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)]"><T k="hero.stats.count" /></dt>
                  <dd data-testid="shelf-count" className="mt-1 text-ink [font-variant-numeric:tabular-nums]">{rest.total}</dd>
                </div>
                <div className="border-t border-line py-[var(--space-2)]">
                  <dt className="text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)]"><T k="hero.stats.newest" /></dt>
                  <dd className="mt-1 text-ink">{newest ? newest.name : ""}</dd>
                </div>
                <div className="border-t border-line py-[var(--space-2)]">
                  <dt className="text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)]"><T k="hero.stats.ask" /></dt>
                  <dd className="mt-1 break-all text-ink">
                    <a href={`mailto:${email}`} className="hover:text-accent">{email}</a>
                  </dd>
                </div>
              </dl>
            </div>
            <a
              href="#shelf"
              data-testid="to-catalogue"
              className="mt-[var(--space-6)] inline-flex items-center gap-2 border-b border-accent pb-1 text-sm text-accent"
            >
              <T k="hero.cta.label" />
              <Icon name="arrow" size={16} />
            </a>
          </div>

          {/* four goods, the row cut off by the right edge of the viewport */}
          <div className="mt-[var(--space-8)] flex gap-px overflow-hidden border-t border-line pt-[var(--space-4)] lg:mt-auto">
            {window4.map((p, i) => (
              <figure
                key={p.id}
                data-record={`products:${p.id}`}
                className={`rise m-0 w-[150px] shrink-0 md:w-[180px] lg:w-[16vw] lg:max-w-[215px] ${i === 3 ? "hidden xl:block" : i === 2 ? "hidden md:block" : ""}`}
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <ProductImage src={p.image} alt={p.name} aspect="1/1" eager={i < 2} slot={`/images/products/${p.id}.png`} />
                <figcaption className="mt-[var(--space-3)] border-t border-line pt-[var(--space-2)] pr-[var(--space-6)]">
                  <span className="block font-display text-[length:var(--size-price)] leading-none tracking-[var(--tracking-display)] text-accent [font-variant-numeric:tabular-nums]">
                    {formatPrice(p.price)}
                  </span>
                  <span className="mt-[var(--space-2)] block break-words text-sm text-ink-soft">{p.name}</span>
                </figcaption>
              </figure>
            ))}
            {/* the row reads as continuing: one more tile, cut by the edge */}
            <div aria-hidden="true" className="flex shrink-0 gap-px opacity-40">
              <div className="aspect-square w-[150px] bg-surface md:w-[180px] lg:w-[16vw] lg:max-w-[215px]" />
              <div className="aspect-square w-[150px] bg-surface md:w-[180px] lg:w-[16vw] lg:max-w-[215px]" />
            </div>
          </div>
        </div>
      </section>

      {/* ── the whole shelf ────────────────────────────────────────── */}
      <section id="shelf" className="mt-[var(--space-16)] px-[var(--gutter)]">
        <div className="flex flex-wrap items-end justify-between gap-[var(--space-4)] border-b border-line pb-[var(--space-4)]">
          <div>
            <T k="shelf.label" as="p" className="text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)] text-ink-soft" />
            <T k="shelf.heading" as="h2" className="mt-[var(--space-3)] text-[length:var(--size-h2)]" />
          </div>
          <p className="text-sm text-ink-soft [font-variant-numeric:tabular-nums]">
            <T k="shelf.total" /> {rest.total}
          </p>
        </div>

        <Grid max={4} phone={1} className="mt-[var(--space-8)]">
          {rest.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </Grid>

        {rest.loading && <p className="mt-[var(--space-6)] text-sm text-ink-soft"><T k="shelf.loading" /></p>}

        {rest.hasMore && (
          <button
            type="button"
            onClick={rest.loadMore}
            data-testid="show-more"
            className="mt-[var(--space-8)] inline-flex items-center gap-2 border border-line px-[var(--space-6)] py-3 text-sm transition-colors hover:border-accent hover:text-accent"
          >
            <T k="shelf.more" />
            <Icon name="expand" size={16} />
          </button>
        )}

        <p className="mt-[var(--space-12)] max-w-[52ch] border-t border-line pt-[var(--space-4)] text-sm text-ink-soft">
          <T k="shelf.foot" />{" "}
          {newest?.added ? formatDate(newest.added, "medium") : ""}
        </p>
        <Link to="/login" className="mt-[var(--space-4)] inline-flex items-center gap-2 text-sm text-ink-soft hover:text-accent">
          <Icon name="lock" size={16} />
          <T k="shelf.owner_link" />
        </Link>
      </section>
    </>
  );
}
