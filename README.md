# Book Scanner 📚
Imagine you are facing a book shelf, either at a book store or at a friend's, and you don't 
recognize any authors or titles, what if you could quickly find out who they are?
Book Scanner helps you find out what book you should pick by using AI to help you discover
what you'll enjoy.

[shelfscanner.vercel.app]([url](https://schelfscanner.vercel.app/))

## What it does
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

## Tech Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- AI services: Claude (`@anthropic-ai/sdk`) for vision extraction and recommendations,
  with structured (zod-validated) output via `messages.parse`
- Open Library (no key needed) + Google Books (optional key) for book
  metadata/covers/ratings
- Postgres (Neon) + Drizzle ORM for preferences and reading history
- Deployment: Vercel (Frontend & API)

## Setup

The database lives on Neon, in the **Book Shelf Scanner** project
(`summer-dawn-13505239`) under the **Product AI** org
(`org-damp-king-31059673`) — see `.neon` for the linked project. The `neon`
and `neon-postgres` agent skills are installed in `.agents/skills/` (symlinked
into `.claude/skills/`) for working with it from an agent going forward.

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` (or re-run `npx neon@latest env pull` — it reads `.neon`
and writes `DATABASE_URL`/`DATABASE_URL_UNPOOLED` for you):

- `ANTHROPIC_API_KEY` — required. Get one at https://console.anthropic.com/
- `DATABASE_URL` — required. From the linked Neon project (pooled connection
  — what the app uses at runtime).
- `DATABASE_URL_UNPOOLED` — optional but recommended. Neon's direct
  connection, used only by drizzle-kit for migrations (pooled connections
  don't support the session-level operations migrations need). Falls back to
  `DATABASE_URL` if unset.
- `GOOGLE_BOOKS_API_KEY` — optional. Improves the fallback book-metadata
  lookup's rate limit; the app works without it.
- `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-5`.

Apply the schema (already applied to the linked Neon project's `production`
branch — this is for a fresh database or a new branch):

```bash
npm run db:generate   # only if lib/db/schema.ts changed since the last migration
npm run db:migrate
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
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm test` | Run the unit tests (all mocked — no live API calls or database needed) |
| `npm run db:generate` | Generate a SQL migration file from `lib/db/schema.ts` into `drizzle/` |
| `npm run db:migrate` | Apply pending migrations from `drizzle/` to the database |
| `npm run db:push` | Dev-only shortcut: push the schema directly without generating a migration file |
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
- `extractBooks.ts` enforces a hard app-level cap of one Claude API call
  per minute (`lib/anthropic/rateLimit.ts`) and caches results by image
  hash for 10 minutes (`lib/anthropic/cache.ts`) so retries/double-submits
  are free. `recommend.ts` shares the same rate limit and caches by
  (shelf, preferences) for an hour. When Claude can't be used for any
  reason — our own rate limit, an Anthropic outage, a bad key — scanning
  falls back to Google Cloud Vision OCR (`lib/google/visionFallback.ts`,
  reusing `GOOGLE_BOOKS_API_KEY`), which is much lower quality (no
  title/author split, no real confidence) but keeps the app usable; the
  response's `warnings` flags this to the client. A bad photo
  (`BadRequestError`) skips the fallback entirely since a different OCR
  engine won't fix a bad input.
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
3. Run `npm run db:migrate` against the production database once before
   first use (or `npm run db:push` for a quick dev-only setup).
4. Deploy. `app/api/scan` and `app/api/recommend` are configured with
   `maxDuration = 30` since vision + parallel enrichment calls can take
   longer than the platform's short default — check your current
   Hobby/Pro function timeout limit in the Vercel dashboard if you see
   timeouts.
