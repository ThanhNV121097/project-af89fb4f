import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "node:fs";

// Served by `vite preview` behind the workspace's edge proxy, so every URL
// is host-relative and the app never assumes a port.

/**
 * sitemap.xml and robots.txt, from design/pages.json.
 *
 * The owner's form offers SEO — "SEO-friendly URLs, meta tags, sitemaps" —
 * and a run that chose it shipped meta tags and no sitemap, because a sitemap
 * is the one part of SEO that is not written while writing a page: nothing on
 * screen is missing without it, so nobody notices. It is also the part a
 * build can do by itself, from a list it already has.
 *
 * design/pages.json IS that list, and it is the only reliable one. The first
 * version of this read `<Route path="…">` out of src/App.tsx and found
 * nothing at all on a 28-page design, because that design built its routes
 * from an array — `{SITE.map(([path, Page]) => <Route path={path} …/>)}` —
 * which is perfectly ordinary React and invisible to a regex. A check keyed
 * on a shape a model may or may not write is a check that is off for the next
 * design. The page list is written by contract: the drawer, the walk and the
 * Studio all read it. App.tsx is kept only as a fallback for a design that
 * has not written the list yet.
 *
 * Only pages a visitor can open. A pattern like /tours/:id has no url until a
 * record is named, and one example in place of eleven products is a worse
 * sitemap than none. Pages behind sign-in are left out as well: a crawler
 * cannot reach them, and listing them publishes the addresses of somebody's
 * dashboard.
 *
 * Host-relative on purpose, like everything else here: the site does not know
 * its own domain at build time, and a <loc> with the wrong host is worse than
 * a relative one.
 */
function sitemap(): Plugin {
  return {
    name: "sitemap",
    apply: "build",
    closeBundle() {
      const paths = publicPaths();
      if (paths.length === 0) return;
      const urls = paths.map((p) => `  <url><loc>${p}</loc></url>`).join("\n");
      writeFileSync("dist/sitemap.xml",
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
      writeFileSync("dist/robots.txt", "User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n");
    },
  };
}

interface PlannedPage {
  path?: string;
  auth?: boolean;
}

/** The pages a crawler can reach, sorted, from the page list or from App.tsx. */
function publicPaths(): string[] {
  const out = new Set<string>();
  const keep = (p: string | undefined, auth?: boolean) => {
    if (!p || auth || p.includes(":") || p.includes("*")) return;
    out.add(p.startsWith("/") ? p : `/${p}`);
  };
  let listed = false;
  try {
    const doc: unknown = JSON.parse(readFileSync("../../design/pages.json", "utf8"));
    const list = (Array.isArray(doc) ? doc : (doc as { pages?: unknown[] }).pages ?? []) as PlannedPage[];
    for (const p of list) keep(p.path, p.auth);
    listed = list.length > 0;
  } catch {
    // Not written yet, or the frontend is not where the design is.
  }
  if (!listed) {
    try {
      const app = readFileSync("src/App.tsx", "utf8");
      for (const m of app.matchAll(/<Route\b[^>]*\bpath=["']([^"']+)["']/g)) keep(m[1]);
    } catch {
      return []; // nothing to list, and a build must never fail for it
    }
  }
  return [...out].sort();
}

export default defineConfig({
  plugins: [react(), sitemap()],
  base: "/",
  preview: { allowedHosts: true },
  server: { allowedHosts: true },
});
