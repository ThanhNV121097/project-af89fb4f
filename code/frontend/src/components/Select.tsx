import { useEffect, useId, useRef, useState } from "react";

/**
 * EVERY CHOICE FROM A LIST IS THIS, NEVER A BARE <select>.
 *
 * A native select is drawn by the operating system: macOS gives it one
 * chevron and one corner radius, Windows another, and neither uses the site's
 * face, its ink or its field edge. On a page where every other control came
 * from theme.css, the one the visitor opens most is the one that does not
 * belong — and it changes shape depending on who is looking.
 *
 * Agent Team's own console has had this rule from the start ("every choice
 * from a list is Select, never a native <select>") and the sites it builds
 * did not: this scaffold shipped <select> in TableFilters and DataTable, so
 * every project inherited it. Measured on project bf7c8747: eight native
 * selects and three native date fields across five files, none of them with
 * so much as appearance-none.
 *
 * WHAT IT IS. A button that says the chosen option, and a listbox under it.
 * The keyboard works the way a listbox is expected to (arrows, Home, End,
 * Enter, Escape, type-ahead), the open list closes on an outside click or a
 * scroll, and the button carries the combobox roles a screen reader needs.
 *
 * WHAT IT IS NOT. It does not reach for a portal, a popper or a focus trap:
 * a site's select sits in the flow of its own section, and a dependency per
 * control is how a design ends up with four of them. Where a list is long
 * enough to need searching, that is a different control and the page should
 * say so.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Choose",
  id,
  className = "",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const auto = useId();
  const listId = `${id ?? auto}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const chosen = options.findIndex((o) => o.value === value);
  const label = chosen >= 0 ? options[chosen].label : placeholder;

  // Closing: an outside click, a scroll of the page under it, or Escape. A
  // list left open while the page moves is a list floating over the wrong
  // row, which is worse than no list.
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const shut = () => setOpen(false);
    document.addEventListener("pointerdown", away);
    window.addEventListener("scroll", shut, true);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("scroll", shut, true);
    };
  }, [open]);

  const choose = (i: number) => {
    const o = options[i];
    if (!o) return;
    onChange(o.value);
    setOpen(false);
  };

  const move = (to: number) => setActive(Math.max(0, Math.min(options.length - 1, to)));

  // Split in two because the shipped lint's complexity ceiling is 20 and one
  // handler for every key is 22 — which is the rule working: these are two
  // jobs, and the second one (type-ahead) is the one worth reading on its own.
  const navKey = (e: React.KeyboardEvent): boolean => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        if (open) move(active + step);
        else { setOpen(true); setActive(Math.max(0, chosen)); }
        return true;
      }
      case "Home":
      case "End":
        if (!open) return true;
        e.preventDefault();
        move(e.key === "Home" ? 0 : options.length - 1);
        return true;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(active);
        else { setOpen(true); setActive(Math.max(0, chosen)); }
        return true;
      case "Escape":
        if (open) { e.preventDefault(); setOpen(false); }
        return true;
      case "Tab":
        setOpen(false);
        return true;
      default:
        return false;
    }
  };

  // Type-ahead: the letters typed within a second jump to the option that
  // starts with them, which is the one thing a native select does that people
  // genuinely rely on.
  const typeKey = (e: React.KeyboardEvent) => {
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
    const now = Date.now();
    typed.current.text = now - typed.current.at < 1000 ? typed.current.text + e.key : e.key;
    typed.current.at = now;
    const want = typed.current.text.toLowerCase();
    const i = options.findIndex((o) => o.label.toLowerCase().startsWith(want));
    if (i < 0) return;
    if (open) move(i);
    else choose(i);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!navKey(e)) typeKey(e);
  };

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => { setOpen((o) => !o); setActive(Math.max(0, chosen)); }}
        onKeyDown={onKey}
        className="flex w-full items-center justify-between gap-2 rounded border border-field bg-surface px-3 py-2 text-left text-sm text-ink"
      >
        <span className={chosen >= 0 ? "" : "text-ink-soft"}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-auto rounded border border-field bg-surface py-1 shadow-lg"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === active ? "bg-accent text-accent-ink" : "text-ink"
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
