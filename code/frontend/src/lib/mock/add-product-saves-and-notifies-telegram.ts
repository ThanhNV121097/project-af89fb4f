import { collections } from "../../data";
import { formatPrice } from "../format";

/**
 * Mock for `POST /v1/products`: saves a product for this session and decides
 * the Telegram outcome from the `telegram` row's `chat_id`, same rule the
 * real endpoint will use — an empty `chat_id` fails exactly like any other
 * Telegram error (services.md §5). Replaced by a real API client in the
 * backend story.
 */
export interface SavedProduct {
  id: string;
  name: string;
  note: string;
  price: number;
  image: string;
  added: string;
  telegram_sent: boolean;
}

const added: SavedProduct[] = [];
const listeners = new Set<() => void>();

export function addedProducts(): readonly SavedProduct[] {
  return added;
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** The message the Telegram bot posts: the product's name and its price. */
export function messageFor(name: string, price: string | number): string {
  const amount = formatPrice(price);
  if (!name.trim() && !amount) return "";
  return `New on the shelf: ${name.trim() || "—"} — ${amount || "—"}`;
}

/** Mock `POST /v1/products`. Resolves with the saved row, `telegram_sent` included. */
export function addProduct(p: { name: string; note: string; price: number; image: string }): Promise<SavedProduct> {
  const telegram = collections().telegram ?? [];
  const chatId = typeof telegram[0]?.chat_id === "string" ? telegram[0].chat_id : "";
  const row: SavedProduct = {
    ...p,
    id: `new-${added.length + 1}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product"}`,
    added: new Date().toISOString().slice(0, 10),
    telegram_sent: Boolean(chatId),
  };
  added.unshift(row);
  listeners.forEach((l) => l());
  return Promise.resolve(row);
}
