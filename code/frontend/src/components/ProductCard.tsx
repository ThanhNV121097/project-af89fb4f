import ProductImage from "./ProductImage";
import { formatPrice } from "../lib/format";

/**
 * One good on the shelf: the cut-out on the shop's own dark tile, then a
 * hairline, then the name and the price on one baseline — the price larger
 * than the name and set in the lamp colour, because it is the most read word
 * on the page.
 */
export default function ProductCard({ product, eager = false }: {
  product: { id: string; name: string; note?: string; price?: number | string; image?: string };
  eager?: boolean;
}) {
  return (
    <article
      data-record={`products:${product.id}`}
      data-testid={`product-${product.id}`}
      className="group flex h-full flex-col"
    >
      <div className="bg-surface transition-colors duration-[var(--duration-fast)] group-hover:bg-ground">
        <ProductImage src={product.image} alt={product.name} aspect="1/1" eager={eager}
          slot={`/images/products/${product.id}.png`} />
      </div>
      <div className="mt-[var(--space-4)] border-t border-line pt-[var(--space-3)] transition-colors duration-[var(--duration-fast)] group-hover:border-accent">
        <div className="flex items-baseline justify-between gap-[var(--space-4)]">
          <h3 className="min-w-0 text-[length:var(--size-name)]">{product.name}</h3>
          <span
            data-testid={`product-${product.id}-price`}
            className="shrink-0 font-display text-[length:var(--size-price)] leading-none tracking-[var(--tracking-display)] text-accent [font-variant-numeric:tabular-nums]"
          >
            {formatPrice(product.price)}
          </span>
        </div>
        {product.note && <p className="mt-[var(--space-2)] text-sm text-ink-soft">{product.note}</p>}
      </div>
    </article>
  );
}
