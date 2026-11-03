import { formatPrice } from "../format";

/**
 * The Telegram message a new product sends to the shop's group.
 *
 * Mock only: the design has no backend, so nothing leaves the browser. The
 * wording here is what the backend story will post through the bot, so the
 * owner approves the exact sentence rather than a description of it.
 */
export interface Sent {
  text: string;
  at: string;
}

/** The message itself: the product's name and its price, as the brief asks. */
export function messageFor(name: string, price: string | number): string {
  const amount = formatPrice(price);
  if (!name.trim() && !amount) return "";
  return `New on the shelf: ${name.trim() || "—"} — ${amount || "—"}`;
}

/** Mock send. Resolves with what was sent and when. */
export function send(name: string, price: string | number): Promise<Sent> {
  return Promise.resolve({ text: messageFor(name, price), at: new Date().toISOString() });
}
