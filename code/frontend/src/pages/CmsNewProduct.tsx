import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePageMeta } from "../seo";
import { useCollection } from "../data";
import DashboardLayout from "../components/DashboardLayout";
import Icon from "../components/Icon";
import ProductImage from "../components/ProductImage";
import RequireSignIn from "../components/RequireSignIn";
import { useContent } from "../editable";
import { cmsNav } from "../cms-nav";
import { addProduct, messageFor } from "../lib/mock/add-product-saves-and-notifies-telegram";

/**
 * Add a product: a photo, a name, a short description and a price — the four
 * fields the owner named, and nothing else.
 *
 * The Telegram message is written live beside the form, in the words the bot
 * will post, so the owner approves the sentence itself. Mock only: nothing
 * leaves the browser here.
 */
export default function CmsNewProduct() {
  usePageMeta("pages.cms_new.name", "pages.cms_new.description");
  return (
    <RequireSignIn>
      <Form />
    </RequireSignIn>
  );
}

const field =
  "w-full appearance-none rounded border border-field bg-surface px-[var(--space-4)] py-2.5 text-ink outline-none transition-colors focus:border-accent";

function Form() {
  const navigate = useNavigate();
  const siteName = useContent<string>("site.name");
  const { items: telegram } = useCollection<{ id: string; group?: string; bot?: string }>("telegram");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedProduct | null>(null);
  const [error, setError] = useState("");

  const group = telegram[0]?.group ?? "";
  const preview = messageFor(name, price);

  function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amount = Number(price);
    if (!name.trim() || !note.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Fill in the name, the description and a price above zero.");
      return;
    }
    setError("");
    setSaving(true);
    const row = await addProduct({ name: name.trim(), note: note.trim(), price: amount, image: photo });
    setSaving(false);
    setSaved(row);
  }

  return (
    <DashboardLayout
      title="Add a product"
      nav={cmsNav}
      brand={siteName}
      actions={
        <Link to="/cms/products" className="inline-flex items-center gap-2 whitespace-nowrap border border-line px-[var(--space-4)] py-2 text-sm">
          <Icon name="back" size={16} />
          All products
        </Link>
      }
    >
      <div className="grid gap-[var(--space-8)] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form onSubmit={submit} className="flex max-w-[34rem] flex-col gap-[var(--space-4)]">
          <label htmlFor="photo" className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Photo</span>
            <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} className={field} />
            <span className="text-xs text-ink-soft">JPEG, PNG or WebP. The owner has not set a size limit yet.</span>
          </label>
          <label htmlFor="name" className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Name</span>
            <input id="name" name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
          <label htmlFor="note" className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Short description</span>
            <textarea id="note" name="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
          </label>
          <label htmlFor="price" className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Price</span>
            <input id="price" name="price" type="number" min="0" step="1" value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${field} max-w-[12rem] text-right [font-variant-numeric:tabular-nums]`} />
          </label>

          {error && (
            <p data-testid="form-error" className="inline-flex items-center gap-2 text-sm text-accent">
              <Icon name="alert" size={16} />
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-[var(--space-4)]">
            <button type="submit" data-testid="save-product" disabled={saving}
              className="inline-flex items-center gap-2 whitespace-nowrap bg-accent px-[var(--space-6)] py-2.5 font-display text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60">
              <Icon name="check" size={18} />
              Save and send to Telegram
            </button>
            {saved && (
              <button type="button" onClick={() => navigate("/cms/products")}
                className="inline-flex items-center gap-2 whitespace-nowrap border border-line px-[var(--space-4)] py-2.5 text-sm">
                See the list
                <Icon name="arrow" size={16} />
              </button>
            )}
          </div>

          {saved && (
            <p data-testid="saved-notice" className="inline-flex items-center gap-2 border-t border-line pt-[var(--space-4)] text-sm text-ink">
              <Icon name="done" size={16} />
              {saved.telegram_sent
                ? "Saved, and sent to the Telegram group."
                : "Saved, but the Telegram group did not receive it."}
            </p>
          )}
        </form>

        <aside className="flex flex-col gap-[var(--space-6)]">
          <div>
            <p className="text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)] text-ink-soft">The photo as it will look</p>
            <div className="mt-[var(--space-3)]">
              {photo ? (
                <ProductImage src={photo} alt={name || "The product's photo"} aspect="1/1" />
              ) : (
                <div className="flex aspect-square w-full items-end rounded border border-line p-[var(--space-4)] text-sm text-ink-soft">
                  Choose a photo above and it appears here, on the shop's own ground.
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-line pt-[var(--space-4)]">
            <p className="inline-flex items-center gap-2 text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)] text-ink-soft">
              <Icon name="notify" size={14} />
              Telegram, on save
            </p>
            <p data-testid="telegram-preview"
              className="mt-[var(--space-3)] font-display text-accent [font-variant-numeric:tabular-nums]">
              {preview || "New on the shelf: —"}
            </p>
            <p className="mt-[var(--space-3)] text-xs text-ink-soft">
              {group
                ? `Posted to ${group} by the shop's bot.`
                : "The group and its bot are not set yet — add them in the Telegram group table."}
            </p>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}
