<!-- story 1: The site as designed -->
# ERD extension — The site as designed

Story: `docs/site/stories/the-site-as-designed.md`
Extends: nothing. No new entity, no new column.

## Change

None. This story ships the Home page (`/`) reading the already-existing
static fixtures in `code/frontend/src/data/` (PR #19, `Home.tsx` +
`useCollection`) — it is explicitly out of scope for this story to call a
real API (that is the "Site data from the database" story, which swaps
`src/data/index.ts`'s internals for `GET /v1/products`). The fields it
renders (`id`, `name`, `note`, `price`, `image`, `added`) are exactly the
`products` columns the project-wide `erd.md` §3.1 already defines — no
field this screen needs is missing from that table, and nothing it needs is
absent from the fixture shape either.

No migration. Recorded as its own file purely so the generated `erd.md`
keeps one file per story, per the assembly convention — this entry
contributes no schema change.
