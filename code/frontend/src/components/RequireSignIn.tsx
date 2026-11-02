import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useSession } from "../lib/session";
import { useDemo } from "../lib/demo";
import { useContent } from "../editable";
import Icon from "./Icon";
import Logo from "./Logo";

/**
 * The CMS is behind the sign-in, and this is the gate. One kind of person
 * signs in here — the owner and the shop's admins — so the check is the
 * session itself rather than a role; a visitor who types the address and is
 * not signed in gets this page and a way to the form.
 */
export default function RequireSignIn({ children }: { children: ReactNode }) {
  const session = useSession();
  const demo = useDemo();
  const email = useContent<string>("contact.email");
  // Drawn for the Studio, the walk or the owner's preview: show the work, not
  // the gate — nobody looking at the design has clicked sign in yet.
  if (session || demo) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col justify-center bg-ground px-[var(--gutter)] py-[var(--space-16)] text-ink">
      <div className="max-w-[30rem]">
        <Logo />
        <h1 className="mt-[var(--space-8)] text-[length:var(--size-h2)]">This is the shop's own side</h1>
        <p className="mt-[var(--space-4)] text-ink-soft">
          Sign in with the shop's account to see the products and add one. Accounts are made for the
          owner and the shop's admins only — write to {email} to have one added.
        </p>
        <Link
          to="/login"
          data-testid="gate-sign-in"
          className="mt-[var(--space-8)] inline-flex items-center gap-2 whitespace-nowrap bg-accent px-[var(--space-6)] py-3 font-display text-accent-ink"
        >
          <Icon name="lock" size={18} />
          Sign in
        </Link>
      </div>
    </div>
  );
}
