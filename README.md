# schelfscanner 📚

Photograph a bookshelf, set your reading preferences, and get an AI-picked
recommendation from the books actually on that shelf.

1. **Scan** — upload/take a photo of a bookshelf; Claude vision reads the
   spines and identifies titles/authors.
2. **Preferences** — tell it your genres, favorite authors/books, mood, and
   length preference. Saved to your browser so you don't have to redo it.
3. **Discover** — a second AI call ranks the shelf against your taste and
   explains why, using real ratings/covers/descriptions from Open Library
   (and Google Books as a fallback).

The photo itself is never stored — only the extracted book list and the
recommendation are saved, scoped to an anonymous per-browser device id (no
login). See [`.claude/plans/`](../../.claude/plans) in this repo's history
for the full design rationale if you have it, or the code comments in
`lib/`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Claude (`@anthropic-ai/sdk`) for vision extraction and recommendations,
  with structured (zod-validated) output via `messages.parse`
- Open Library (no key needed) + Google Books (optional key) for book
  metadata/covers/ratings
- Postgres (Neon) + Drizzle ORM for preferences and reading history
- Deployed on Vercel

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `ANTHROPIC_API_KEY` — required. Get one at https://console.anthropic.com/
- `DATABASE_URL` — required. Provision a free Postgres database at
  https://neon.tech (or via Vercel's Neon integration once deployed) and
  paste its connection string here.
- `GOOGLE_BOOKS_API_KEY` — optional. Improves the fallback book-metadata
  lookup's rate limit; the app works without it.
- `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-5`.

Push the database schema:

```bash
npm run db:push
```

Run the app:

```bash
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the unit tests (all mocked — no live API calls or database needed) |
| `npm run db:push` | Push `lib/db/schema.ts` to the database (dev convenience — no migration files) |
| `npm run db:generate` | Generate a SQL migration file instead, for a more controlled/production workflow |
| `npm run db:studio` | Open Drizzle Studio to browse the database |

## Architecture notes

- `app/(wizard)/` holds the three-step flow (`scan`, `preferences`,
  `results`) behind a shared layout with a progress indicator. In-progress
  scan state lives in `sessionStorage` (see `lib/state/wizardStorage.tsx`)
  so a refresh mid-flow doesn't lose it; this is separate from the
  cross-visit Postgres persistence.
- `app/api/scan` calls `lib/anthropic/extractBooks.ts` (vision) then
  `lib/books/enrich.ts` (Open Library → Google Books → unmatched, run in
  parallel per book).
- `app/api/recommend` calls `lib/anthropic/recommend.ts`, which restricts
  the model's possible `bookId` outputs to a literal enum of the actual
  shelf's ids (see `lib/anthropic/prompts.ts`) — it's structurally
  impossible for the model to recommend a book that isn't on the shelf.
- Anonymous identity is a single httpOnly cookie (`lib/device/deviceId.ts`);
  there's no login. Clearing cookies or switching browsers starts fresh —
  an accepted v1 tradeoff.
- Errors from the Anthropic API are mapped to HTTP responses via
  `lib/anthropic/httpError.ts`, checked most-specific-first (bad
  request → auth → rate limit → connection → unknown).

## Deploying

1. Push this repo to GitHub and import it into Vercel.
2. Add the Neon Postgres integration (or set `DATABASE_URL` manually) and
   set `ANTHROPIC_API_KEY` (+ optional vars) as environment variables for
   Production and Preview.
3. Run `npm run db:push` (or apply generated migrations) against the
   production database once before first use.
4. Deploy. `app/api/scan` and `app/api/recommend` are configured with
   `maxDuration = 30` since vision + parallel enrichment calls can take
   longer than the platform's short default — check your current
   Hobby/Pro function timeout limit in the Vercel dashboard if you see
   timeouts.
