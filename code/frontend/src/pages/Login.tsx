import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { T, useContent } from "../editable";
import { usePageMeta } from "../seo";
import { signIn } from "../lib/session";
import { login } from "../lib/owner-admin-sign-in";
import Icon from "../components/Icon";
import { Picture } from "../picture";

/**
 * Sign in — the owner and the shop's admins, nobody else. There is no
 * sign-up link anywhere on this site, by the owner's instruction, so the page
 * says in words who it is for and how a new admin is added.
 *
 * Checks against the mock admin list in lib/mock/owner-admin-sign-in.ts; the
 * backend story replaces that module with a real POST /v1/auth/login call,
 * behind the same signIn()/useSession() names.
 */
export default function Login() {
  usePageMeta("pages.login.name", "pages.login.description");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const ownerEmail = useContent<string>("contact.email");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError(true);
      return;
    }
    setError(false);
    setSubmitting(true);
    try {
      const session = await login(email.trim(), password);
      signIn(session.email, session.name, session.role);
      navigate("/cms/products");
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "w-full appearance-none rounded border border-field bg-surface px-[var(--space-4)] py-3 text-ink outline-none transition-colors focus:border-accent";

  return (
    <div className="lg:grid lg:min-h-[calc(100vh-var(--header-h))] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-[var(--gutter)] py-[var(--space-16)]">
        <div className="rise w-full max-w-[26rem]">
          <T k="pages.login.label" as="p" className="mt-[var(--space-8)] text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)] text-ink-soft" />
          <T k="pages.login.heading" as="h1" className="mt-[var(--space-3)] text-[length:var(--size-h1)]" />
          <T k="pages.login.sub" as="p" className="mt-[var(--space-4)] text-ink-soft" />

          <form onSubmit={submit} className="mt-[var(--space-8)] flex flex-col gap-[var(--space-4)]">
            <label htmlFor="email" className="flex flex-col gap-2">
              <span className="text-sm text-ink-soft"><T k="pages.login.email" /></span>
              <input id="email" name="email" type="email" autoComplete="username" value={email}
                onChange={(e) => setEmail(e.target.value)} className={field} />
            </label>
            <label htmlFor="password" className="flex flex-col gap-2">
              <span className="text-sm text-ink-soft"><T k="pages.login.password" /></span>
              <input id="password" name="password" type="password" autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} className={field} />
            </label>
            {error && (
              <p data-testid="login-error" className="inline-flex items-center gap-2 text-sm text-accent">
                <Icon name="alert" size={16} />
                <T k="pages.login.error" />
              </p>
            )}
            <button type="submit" data-testid="sign-in" disabled={submitting}
              className="mt-[var(--space-2)] inline-flex items-center justify-center gap-2 whitespace-nowrap bg-accent px-[var(--space-6)] py-3 font-display text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60">
              <T k="pages.login.submit" />
              <Icon name="arrow" size={18} />
            </button>
          </form>

          <p className="mt-[var(--space-8)] border-t border-line pt-[var(--space-4)] text-sm text-ink-soft">
            <T k="pages.login.no_signup" />{" "}
            <a href={`mailto:${ownerEmail}`} className="text-ink hover:text-accent">{ownerEmail}</a>
          </p>
          <Link to="/" className="mt-[var(--space-4)] inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
            <Icon name="back" size={18} />
            <T k="pages.login.back" />
          </Link>
        </div>
      </div>

      <div className="relative hidden overflow-hidden lg:block fade">
        <Picture src="/images/shop-tall.jpg" alt="The workbench at the back of the shop"
          loading="eager" width={900} height={1300}
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ground to-transparent" />
      </div>
    </div>
  );
}
