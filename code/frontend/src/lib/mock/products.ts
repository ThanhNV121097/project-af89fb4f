/**
 * Products added in the CMS during this visit.
 *
 * Mock only: src/data/products.json is the shop's list, and the design has no
 * backend to write to, so a product added in the form is kept here for the
 * rest of the session and shown at the top of the list. The backend story
 * replaces this file with the real API.
 */
export interface NewProduct {
  id: string;
  name: string;
  note: string;
  price: number;
  image: string;
  added: string;
}

const added: NewProduct[] = [];
const listeners = new Set<() => void>();

export function addedProducts(): readonly NewProduct[] {
  return added;
}

export function addProduct(p: Omit<NewProduct, "id" | "added">): NewProduct {
  const row: NewProduct = {
    ...p,
    id: `new-${added.length + 1}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product"}`,
    added: new Date().toISOString().slice(0, 10),
  };
  added.unshift(row);
  listeners.forEach((l) => l());
  return row;
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
