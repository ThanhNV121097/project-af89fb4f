/**
 * Shelf's mark: two hairline shelves with four goods standing on them — the
 * shape of what this site is. Drawn in currentColor so it follows the ink,
 * and the same mark is public/favicon.svg.
 */
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M3 12h26M3 24h26" />
      <path d="M9 12V5M20 12V8M13 24v-6M24 24v-8" />
    </svg>
  );
}
