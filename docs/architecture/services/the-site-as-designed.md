<!-- story 1: The site as designed -->
# Service extension — The site as designed

Story: `docs/site/stories/the-site-as-designed.md`
Extends: nothing. No new endpoint, no new error code.

## Mock shape read and judged

There is no mock module for this story — grepped the repository for
`the-site-as-designed.ts` under `code/frontend/lib/mock/`: none exists. The
story's own scope section and PR #19's description both say why: Home
(`/`) ships against the fixture data the design phase already shipped
(`code/frontend/src/data/*.json`) through the existing `useCollection`
hook, unchanged by this story. Calling a real API is explicitly deferred to
the "Site data from the database" story, which is this very item's sibling
on the plan (`docs/architecture/erd.md` §1 and `services.md` §3.2 already
specify `GET /v1/products` in full, for that later story to implement
against).

## Change

None. The data this screen will eventually read is already fully
specified: `GET /v1/products` (`services.md` §3.2) returns exactly the
`id`/`name`/`note`/`price`/`image`/`added` fields `Home.tsx`,
`ProductCard` and the window stats consume, with the `{ items, total,
page, limit }` envelope SITE-001 AC-2's "count = total, not loaded count"
already assumes. No endpoint this story needs is missing from the shared
contract, and no response shape needs a field the contract does not
already return.

No migration — no schema or contract change in this document.
