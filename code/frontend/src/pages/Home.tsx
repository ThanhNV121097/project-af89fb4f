import { T, useContent } from "../editable";
import ContactForm from "../components/ContactForm";

/**
 * The home page. Every other page goes beside it in src/pages/, one file each.
 *
 * The hero's button and the header's both point at `nav.cta.href`, and the
 * section that answers it is below with that id on it. The scaffold used to
 * ship `href="#contact"` with no element of that id anywhere — a dead link in
 * the one thing a visitor is asked to press — and a design that moved contact
 * onto a page of its own kept the dead anchor. A link to #something with no
 * #something is now a walk defect (dead-anchor), so neither can ship again.
 */
export default function Home() {
  const cta = useContent("nav.cta.href") || "#contact";
  return (
    <>
      <T k="hero.headline" as="h1" className="text-[length:var(--size-h1)] leading-[1.05] max-w-[16ch]" />
      <T k="hero.sub" as="p" className="mt-6 text-xl text-ink-soft max-w-[48ch]" />
      <T k="hero.cta.label" as="a" href={cta} className="mt-10 inline-block rounded bg-accent px-6 py-3 text-accent-ink" />
      <section id={cta.startsWith("#") ? cta.slice(1) : "contact"} className="mt-24 border-t border-line pt-16">
        <T k="contact.heading" as="h2" className="text-[length:var(--size-h2)]" />
        <ContactForm className="mt-8 max-w-[40rem]" />
      </section>
    </>
  );
}
