import { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../editable";
import { usePageMeta } from "../seo";
import { useCollection } from "../data";
import { useTableQuery } from "../lib/table";
import DashboardLayout from "../components/DashboardLayout";
import DataTable from "../components/DataTable";
import TableFilters from "../components/TableFilters";
import Icon from "../components/Icon";
import ProductImage from "../components/ProductImage";
import RequireSignIn from "../components/RequireSignIn";
import { cmsNav } from "../cms-nav";
import { formatDate, formatPrice } from "../lib/format";
import { addedProducts, subscribe } from "../lib/mock/products";

interface Row {
  id: string;
  name: string;
  note?: string;
  price?: number;
  image?: string;
  added?: string;
}

/**
 * The CMS's product list: a real table, searched and paged, the page's one
 * action top right. Products added in this session (the mock) stand at the
 * top of the first page, where the real API will put them.
 */
export default function CmsProducts() {
  usePageMeta("pages.cms_products.name", "pages.cms_products.description");
  return (
    <RequireSignIn>
      <List />
    </RequireSignIn>
  );
}

function List() {
  const t = useTableQuery({ size: 20, sort: "-added" });
  const { items, total, pages, loading } = useCollection<Row>("products", {
    page: t.page,
    pageSize: t.size,
    sort: t.sort,
    q: t.q,
    search: ["name", "note"],
  });
  const fresh = useSyncExternalStore(subscribe, addedProducts);
  const name = useContent<string>("site.name");

  // The session's own additions lead the first unfiltered page, as the API
  // will order them; a search is answered by the data alone.
  const extra = t.q || t.page > 1 ? [] : (fresh as readonly Row[]);
  const rows = [...extra, ...items];

  return (
    <DashboardLayout
      title="Products"
      nav={cmsNav}
      brand={name}
      actions={
        <Link
          to="/cms/products/new"
          data-testid="new-product"
          className="inline-flex items-center gap-2 whitespace-nowrap bg-accent px-[var(--space-4)] py-2 text-sm text-accent-ink"
        >
          <Icon name="plus" size={16} />
          Add a product
        </Link>
      }
    >
      <TableFilters onClear={t.filtering ? t.clear : undefined}>
        <label htmlFor="products-search" className="flex flex-col gap-1">
          <span className="sr-only">Search products</span>
          <input
            id="products-search"
            type="search"
            value={t.q}
            placeholder="Search products"
            onChange={(e) => t.setQ(e.target.value)}
            className="min-w-[14rem] appearance-none rounded border border-field bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
      </TableFilters>

      <p data-testid="products-total" className="text-sm text-ink-soft [font-variant-numeric:tabular-nums]">
        {total + extra.length} products on the shelf
      </p>

      <DataTable<Row>
        caption="Products"
        columns={[
          {
            key: "image",
            label: "Photo",
            render: (r) => (
              <div className="w-12">
                <ProductImage src={r.image} alt={r.name} aspect="1/1" slot={`/images/products/${r.id}.png`} />
              </div>
            ),
          },
          { key: "name", label: "Name", sortable: true },
          { key: "note", label: "Short description", secondary: true },
          { key: "price", label: "Price", sortable: true, align: "right", render: (r) => formatPrice(r.price) },
          { key: "added", label: "Added", sortable: true, secondary: true, render: (r) => formatDate(r.added, "medium") },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        total={total + extra.length}
        page={t.page}
        pages={pages}
        size={t.size}
        sort={t.sort}
        onSort={t.toggleSort}
        onPage={t.setPage}
        onSize={t.setSize}
        loading={loading}
        exportName="shelf-products"
        empty={<span>No product matches that. Clear the search, or add the product.</span>}
      />
    </DashboardLayout>
  );
}
