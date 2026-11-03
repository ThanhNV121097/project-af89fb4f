/**
 * The site's records — products, admins, the telegram config — one
 * collection per name, described in schema.json. Words that are not
 * records stay in content.json.
 *
 * Rewritten for the "Site data from the database" story: this module now
 * calls the real API (docs/architecture/services.md §2.4, §3.2-3.3,
 * §3.5-3.8) instead of reading the bundled JSON fixtures. Every export
 * (`useCollection`, `useRecord`, `schema`, `Row`/`Field`/`Collection`) keeps
 * its name and return shape — no component changes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import schemaFile from "./schema.json";

export type Source = "owner" | "assumed" | `web:${string}`;

export interface Row {
  id: string;
  _source?: Source;
  [field: string]: unknown;
}

export interface Field {
  key: string;
  label?: string;
  type: string;
  currency?: string;
}

export interface Collection {
  label?: string;
  fields: Field[];
}

export const schema = schemaFile as { collections: Record<string, Collection> };

const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

/** The session's bearer token, once the auth story's session carries one. */
function authHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem("agentteam:session");
    const token = raw ? (JSON.parse(raw) as { token?: unknown }).token : undefined;
    return typeof token === "string" && token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

interface Envelope<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      message = body.error?.code ?? message;
    } catch {
      // non-JSON error body — fall back to the status-based message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export type Filter =
  | string
  | number
  | boolean
  | readonly (string | number)[]
  | { from?: string | number; to?: string | number };

export interface Query {
  where?: Record<string, Filter | undefined>;
  q?: string;
  search?: readonly string[];
  sort?: string;
  page?: number;
  pageSize?: number;
}

function fold(v: unknown): string {
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Simple scalar filters only — a list/range filter has no server equivalent here (none of this project's collections use one), so it is dropped rather than sent as a param the backend would not recognise. */
function queryParams(query: Query, page: number, limit: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  for (const [key, value] of Object.entries(query.where ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

/** Client-side sort/text-search over an already-fetched page: the backend's own filter is exact-match-by-field only (services.md §2.4), so the free-text `q` and `sort` this UI already offers are applied on what was loaded. */
function refine<T extends { id: string }>(items: T[], query: Query): T[] {
  let out = items;
  const q = fold(query.q).trim();
  if (q) {
    const fields = query.search ?? Object.keys((items[0] as unknown as Row) ?? {}).filter((k) => !k.startsWith("_"));
    out = out.filter((row) => fields.some((f) => fold((row as unknown as Row)[f]).includes(q)));
  }
  const sortKey = (query.sort ?? "").trim();
  if (sortKey) {
    const desc = sortKey.startsWith("-");
    const field = desc ? sortKey.slice(1) : sortKey;
    out = [...out].sort((a, b) => {
      const x = (a as unknown as Row)[field];
      const y = (b as unknown as Row)[field];
      if (typeof x === "number" && typeof y === "number") return x - y;
      return String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true });
    });
    if (desc) out.reverse();
  }
  return out;
}

/**
 * A page at a time, backed by the real API. `items` grows by `pageSize`
 * with each `loadMore()` when `page` is not given (a catalogue); given a
 * `page`, `items` is that page alone (a CMS table).
 */
export function useCollection<T extends { id: string } = Row>(name: string, query: Query = {}) {
  const pageSize = query.pageSize ?? 12;
  const explicitPage = query.page;
  const key = JSON.stringify([name, query.where ?? {}, explicitPage ?? 0, pageSize]);

  const [pagesLoaded, setPagesLoaded] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const keyRef = useRef(key);

  useEffect(() => {
    keyRef.current = key;
    setPagesLoaded(1);
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const page = explicitPage ?? 1;
    const limit = explicitPage ? pageSize : pagesLoaded * pageSize;
    const effectiveLimit = explicitPage ? pageSize : limit;
    const url = `${base}/v1/${name}?${queryParams(query, page, Math.min(effectiveLimit, 100))}`;
    fetchJSON<Envelope<T>>(url)
      .then((env) => {
        if (cancelled || keyRef.current !== key) return;
        setItems(env.items);
        setTotal(env.total);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled || keyRef.current !== key) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pagesLoaded]);

  const refined = refine(items, query);
  const hasMore = explicitPage === undefined && refined.length < total;
  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setPagesLoaded((p) => p + 1);
  }, [hasMore]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return { items: refined, total, pages, page: explicitPage ?? 1, hasMore, loading, error, loadMore };
}

/** One record by id, fetched from the API. */
export function useRecord<T extends { id: string } = Row>(name: string, id: string | undefined) {
  const [item, setItem] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setItem(undefined);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchJSON<T>(`${base}/v1/${name}/${encodeURIComponent(id)}`)
      .then((row) => {
        if (cancelled) return;
        setItem(row);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name, id]);

  return { item, loading, error };
}
