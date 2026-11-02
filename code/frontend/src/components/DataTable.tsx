import { type ReactNode } from "react";
import Select from "./Select";

/**
 * The list in a dashboard: a table, with its pages, its order and its total.
 *
 * A CMS list is not a catalogue. The person using it is at work: they scan
 * columns, compare rows, sort by date, jump to page 4, and come back to the
 * same place after opening a record. A grid of cards cannot do any of that,
 * and "Show more" is the wrong shape for it — this is why a dashboard list
 * is a <table> and its paging has page numbers.
 *
 *   <DataTable
 *     columns={[
 *       { key: "name", label: "Name", sortable: true },
 *       { key: "price", label: "Price", sortable: true, align: "right",
 *         render: (r) => formatPrice(r.price) },
 *       { key: "status", label: "Status", render: (r) => <Badge …/> },
 *     ]}
 *     rows={items} total={total} page={page} pages={pages} size={t.size}
 *     sort={t.sort} onSort={t.toggleSort} onPage={t.setPage} onSize={t.setSize}
 *     loading={loading} rowKey={(r) => r.id} href={(r) => `/admin/products/${r.id}`}
 *     empty={<p>Nothing here yet.</p>}
 *   />
 *
 * Every column a person can sort by says so with `sortable`; the arrow and
 * aria-sort follow. `href` makes the whole row open the record (a link in
 * the first cell, so the keyboard and a middle click both work).
 *
 * AND IT EXPORTS, WITHOUT BEING ASKED. The owner's form offers "tables of
 * records to search, filter, add to, edit and export" as one feature, and a
 * run that chose it shipped eleven tables of which exactly ONE had an export
 * — a passenger list somebody happened to think of. An affordance nothing
 * requires is one that gets skipped on the eleventh page, which is the same
 * argument <Grid> and <ProductImage> already make in this scaffold.
 *
 * This table owns the columns, the order, the filters and the page, which is
 * everything a CSV needs, so it does it here and no page has to remember.
 * `onExport` replaces it where a page can fetch every row rather than the
 * page on screen; `export={false}` turns it off for a table where a file
 * makes no sense.
 */
export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  /** What the cell shows. The field's raw value when not given. */
  render?: (row: T) => ReactNode;
  /** Hidden below 1024px, for columns a phone has no room for. */
  secondary?: boolean;
}

export default function DataTable<T>({
  columns, rows, rowKey, total, page, pages, size, sort, onSort, onPage, onSize,
  loading = false, empty, href, actions, sizes = [20, 50, 100], caption,
  export: exportable = true, exportName, onExport,
}: {
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  total: number;
  page: number;
  pages: number;
  size: number;
  sort?: string;
  onSort?: (field: string) => void;
  onPage: (page: number) => void;
  onSize?: (size: number) => void;
  loading?: boolean;
  /** What to show when nothing matches — say what would fill it. */
  empty?: ReactNode;
  href?: (row: T) => string;
  /** The last cell of each row: approve, edit, open. */
  actions?: (row: T) => ReactNode;
  sizes?: readonly number[];
  /** What the table lists, for a screen reader. */
  caption?: string;
  /** False for a table a file makes no sense for. */
  export?: boolean;
  /** The file's name, without the extension. The caption, else "records". */
  exportName?: string;
  /** Replaces the built-in export where the page can fetch every row, not
      only the page on screen. */
  onExport?: () => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded border border-line bg-surface">
        <table className="w-full border-collapse text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={ariaSort(sort, c.key)}
                  className={`whitespace-nowrap px-4 py-3 font-medium text-ink-soft ${c.align === "right" ? "text-right" : ""} ${c.secondary ? "hidden lg:table-cell" : ""}`}
                >
                  {c.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 hover:text-ink">
                      {c.label}
                      <span aria-hidden="true" className="text-[0.75em]">{arrow(sort, c.key)}</span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {actions && <th scope="col" className="px-4 py-3 text-right font-medium text-ink-soft">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-ground">
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 align-middle text-ink ${c.align === "right" ? "text-right" : ""} ${c.secondary ? "hidden lg:table-cell" : ""}`}
                  >
                    {i === 0 && href ? (
                      <a href={href(row)} className="font-medium hover:underline">{cell(c, row)}</a>
                    ) : (
                      cell(c, row)
                    )}
                  </td>
                ))}
                {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="px-4 py-12 text-center text-ink-soft">
            {loading ? "Loading…" : empty ?? "Nothing to show."}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
        <p>
          {total === 0 ? "No records" : `${from}–${to} of ${total}`}
          {onSize && (
            <>
              {" · "}
              <Select
                value={String(size)}
                onChange={(v) => onSize(Number(v))}
                aria-label="Rows per page"
                options={sizes.map((n) => ({ value: String(n), label: `${n} per page` }))}
                className="inline-block w-[9rem] align-middle"
              />
            </>
          )}
        </p>
        {exportable && rows.length > 0 && (
          <button
            type="button"
            onClick={() => (onExport ? onExport() : downloadCsv(columns, rows, exportName ?? caption ?? "records"))}
            className="rounded border border-line px-3 py-1.5 text-ink hover:bg-ground"
          >
            {onExport ? "Export" : `Export these ${rows.length}`}
          </button>
        )}
        <nav aria-label="Pages" className="flex items-center gap-1">
          <PageButton onClick={() => onPage(page - 1)} disabled={page <= 1} label="Previous">‹</PageButton>
          {pageNumbers(page, pages).map((n, i) =>
            n === 0 ? (
              <span key={`gap-${i}`} className="px-2" aria-hidden="true">…</span>
            ) : (
              <PageButton key={n} onClick={() => onPage(n)} current={n === page} label={`Page ${n}`}>{n}</PageButton>
            ),
          )}
          <PageButton onClick={() => onPage(page + 1)} disabled={page >= pages} label="Next">›</PageButton>
        </nav>
      </div>
    </div>
  );
}

/**
 * The rows on screen as a CSV file, in the table's own columns and order.
 *
 * The VALUES, not the cells: `render` returns React nodes, and a column that
 * draws a badge or a formatted price still has a field behind it. A column
 * with nothing but a render (an actions column, a thumbnail) carries no value
 * and is left out, so the file has no empty columns in it.
 */
export function toCsv<T>(columns: readonly Column<T>[], rows: readonly T[]): string {
  const keys = columns.filter((c) => rows.some((r) => (r as Record<string, unknown>)[c.key] !== undefined));
  const head = keys.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) => keys.map((c) => csvCell((r as Record<string, unknown>)[c.key])).join(","));
  return [head, ...body].join("\r\n");
}

/**
 * One CSV field.
 *
 * The leading apostrophe on =, +, - and @ is not decoration: a spreadsheet
 * reads a cell starting with one as a FORMULA, so a record whose name begins
 * "=" runs when the owner opens the file. Everything else is the plain rule —
 * double the quotes, wrap anything holding a comma, a quote or a newline.
 */
function csvCell(v: unknown): string {
  if (v === undefined || v === null) return "";
  let s = Array.isArray(v) ? v.join("; ") : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Hands the file to the browser. Nothing leaves the machine. */
function downloadCsv<T>(columns: readonly Column<T>[], rows: readonly T[], name: string): void {
  // The BOM is what makes Excel read UTF-8: without it a Vietnamese name
  // opens as mojibake, which is the one thing an owner would check first.
  const blob = new Blob(["\uFEFF" + toCsv(columns, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "") || "records"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function cell<T>(c: Column<T>, row: T): ReactNode {
  if (c.render) return c.render(row);
  const v = (row as Record<string, unknown>)[c.key];
  return v === undefined || v === null ? "" : String(v);
}

function ariaSort(sort: string | undefined, key: string): "ascending" | "descending" | undefined {
  if (sort === key) return "ascending";
  if (sort === `-${key}`) return "descending";
  return undefined;
}

function arrow(sort: string | undefined, key: string): string {
  if (sort === key) return "▲";
  if (sort === `-${key}`) return "▼";
  return "↕";
}

function PageButton({ children, onClick, disabled, current, label }: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`min-w-[2rem] rounded px-2 py-1 ${current ? "bg-accent text-accent-ink" : "text-ink hover:bg-ground"} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

/**
 * The page numbers to draw: the first, the last, and the ones around the
 * page open now — 0 stands for the gap. 1 ‹2› 3 … 7, never seventy buttons.
 */
export function pageNumbers(page: number, pages: number, around = 1): number[] {
  const want = new Set<number>([1, pages]);
  for (let n = page - around; n <= page + around; n += 1) {
    if (n >= 1 && n <= pages) want.add(n);
  }
  const out: number[] = [];
  let last = 0;
  for (const n of [...want].sort((a, b) => a - b)) {
    if (last && n - last > 1) out.push(0);
    out.push(n);
    last = n;
  }
  return out;
}
