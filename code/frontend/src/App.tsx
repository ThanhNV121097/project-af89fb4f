import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { T, useContent, useList } from "./editable";
import Home from "./pages/Home";
import Login from "./pages/Login";
import CmsProducts from "./pages/CmsProducts";
import CmsNewProduct from "./pages/CmsNewProduct";
import Logo from "./components/Logo";
import Icon from "./components/Icon";
import MenuToggle from "./components/MenuToggle";
import MobileMenu from "./components/MobileMenu";
import PhotoCredits from "./components/PhotoCredits";
import { PageViews } from "./site";
import { useSession, signOut } from "./lib/session";

/**
 * Shelf. Three screens, as the owner asked: the public shelf, one sign-in,
 * and the CMS behind it (the product list and the form that adds one).
 *
 * The CMS pages are an application and draw their own shell
 * (DashboardLayout), so they sit outside the site's header and footer.
 */
export default function App() {
  return (
    <>
      <PageViews />
      <ScrollToTop />
      <Routes>
        <Route path="/cms/products" element={<CmsProducts />} />
        <Route path="/cms/products/new" element={<CmsNewProduct />} />
        <Route path="*" element={<Shell />} />
      </Routes>
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Shell() {
  const links = useList<{ label: string; href: string }>("nav.links");
  const name = useContent<string>("site.name");
  const session = useSession();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-ground text-ink font-body">
      <header className="sticky top-0 z-50 h-[var(--header-h)] border-b border-line bg-ground">
        <div className="flex h-full items-center justify-between px-[var(--gutter)]">
          <Link to="/" aria-label={name}><Logo /></Link>
          <nav className="hidden items-center gap-[var(--space-8)] text-sm lg:flex">
            {links.map((l, i) => (
              <Link key={l.href} to={l.href} className="text-ink-soft transition-colors hover:text-ink">
                <T k={`nav.links.${i}.label`} />
              </Link>
            ))}
            {session ? (
              <button type="button" onClick={signOut} className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
                <Icon name="logout" size={18} />
                <T k="nav.signout" />
              </button>
            ) : (
              <Link to="/login" data-testid="header-signin" className="inline-flex items-center gap-2 border border-line px-[var(--space-4)] py-2 text-sm transition-colors hover:border-accent hover:text-accent">
                <Icon name="lock" size={16} />
                <T k="nav.cta.label" />
              </Link>
            )}
          </nav>
          <div className="lg:hidden">
            <MenuToggle open={open} onToggle={() => setOpen((o) => !o)} />
          </div>
        </div>
      </header>

      <MobileMenu open={open} onClose={() => setOpen(false)}>
        {links.map((l, i) => (
          <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="text-3xl font-display">
            <T k={`nav.links.${i}.label`} />
          </Link>
        ))}
        <Link to="/login" onClick={() => setOpen(false)} className="inline-flex w-fit items-center gap-2 border border-line px-[var(--space-4)] py-3">
          <Icon name="lock" size={18} />
          <T k="nav.cta.label" />
        </Link>
      </MobileMenu>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <footer className="mt-[var(--space-16)] border-t border-line px-[var(--gutter)] py-[var(--space-12)] text-sm text-ink-soft">
        <div className="flex flex-col gap-[var(--space-6)] lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[34ch]">
            <Logo />
            <T k="footer.line" as="p" className="mt-[var(--space-3)]" />
          </div>
          <div className="flex flex-col gap-[var(--space-2)]">
            <p className="text-[length:var(--size-label)] uppercase tracking-[var(--tracking-label)]"><T k="footer.reach" /></p>
            <a href={`mailto:${useContent<string>("contact.email")}`} className="inline-flex items-center gap-2 text-ink hover:text-accent">
              <Icon name="mail" size={16} />
              <T k="contact.email" />
            </a>
            <Link to="/login" className="inline-flex items-center gap-2 hover:text-ink">
              <Icon name="lock" size={16} />
              <T k="nav.cta.label" />
            </Link>
          </div>
        </div>
        <PhotoCredits className="mt-[var(--space-8)] border-t border-line pt-[var(--space-4)]" />
      </footer>
    </div>
  );
}
