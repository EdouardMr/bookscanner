# Book Scanner 📚

Imagine you are facing a book shelf, either at a book store or at a friend's, and you don't
recognize any authors or titles, what if you could quickly find out who they are?
Book Scanner helps you find out what book you should pick by using AI to help you discover
what you'll enjoy.

[bookscanner.app](https://bookscanner.app/)

## What It Does

📸 **Scan a Shelf** → Photograph a bookshelf  
🎯 **Set Preferences** → Genres, favorite authors/books, mood, and length. It's saved to your browser so you don't redo it  
🤖 **Get a Recommendation** → A recommendation is made against your taste with an explanation
📖 **Rich Details** → Real ratings, covers, and descriptions from Open Library  
🔒 **No Account Needed** → Anonymous per-browser device id. The photo itself is never stored

## Key Features

### Smart Book Discovery
- **Shelf Scanning**: photograph a whole shelf at once. Claude vision plus zod-validated structured output extracts every title/author it can read
- **Grounded Recommendations**: the response schema restricts the model's `bookId` output to a literal enum of the shelf's actual detected ids, so it's structurally impossible to recommend a book that isn't there
- **Match Reasoning**: each pick's rationale must reference your specific stated preferences by name, not just a generic blurb
- **Enriched Metadata**: canonical title/author, cover, description, and rating resolved via Open Library, falling back to Google Books, with an `unmatched` state rather than dropping a book with no match

### User Experience
- **Three-Step Wizard**: Scan → Preferences → Discover, behind a shared layout with a progress indicator
- **Refresh-Safe**: in-progress scan state lives in `sessionStorage`, so a reload mid-flow doesn't lose it
- **Reading History**: past scans and recommendations are saved per device and browsable at `/history`
- **No Login**: identity is a single anonymous httpOnly device-id cookie — clearing cookies just starts fresh

### Performance & Reliability
- **Rate Limiting**: a hard cap of one Claude API call per minute per (device, call type), backed by Postgres so it holds across every serverless instance, not just in-process
- **Intelligent Caching**: scan results are cached by image hash (10 min) and recommendations by shelf + preferences (1 hour), so retries and double-submits never burn the rate-limit budget
- **Graceful Fallback**: when Claude can't be used for any reason — the rate limit, an Anthropic outage, a bad key — scanning falls back to Google Cloud Vision OCR instead of failing outright, with a `warnings` flag telling the client the result may be less accurate
- **Specific Error Handling**: Anthropic API failures are mapped to safe, specific HTTP responses — bad request → auth → rate limit → connection → unknown — rather than one generic 500
- **Parallel Enrichment**: each detected book's Open Library/Google Books lookups run concurrently, not one at a time

## 🛠 Technology Stack

**Frontend**: Next.js (App Router) + TypeScript, Tailwind CSS  
**Backend**: Next.js Route Handlers (`app/api/`)  
**AI**: Claude (`@anthropic-ai/sdk`) for vision extraction and recommendations, with structured (zod-validated) output via `messages.parse`; Google Cloud Vision OCR as a fallback when Claude is unavailable  
**Book Data**: Open Library (no key needed) + Google Books (optional key) for metadata/covers/ratings  
**Database**: Postgres (Neon) + Drizzle ORM for preferences and reading history  
**Deployment**: Vercel

## 🚀 Quick Setup

### Prerequisites

- Node.js 24+ and npm
- A Postgres database (this project uses [Neon](https://neon.tech))
- An Anthropic API key

### Local Development

1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/EdouardMr/bookscanner
   cd bookscanner
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `.env.local` — see [Environment Configuration](#-environment-configuration)
   below, or re-run `npx neon@latest env pull` (it reads `.neon` and writes
   `DATABASE_URL`/`DATABASE_URL_UNPOOLED` for you).

3. **Database Setup**
   ```bash
   npm run db:generate   # only if lib/db/schema.ts changed since the last migration
   npm run db:migrate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`

### Production Deployment

#### Vercel Deployment (Recommended)

1. Push this repo to GitHub and import it into Vercel.
2. Add the Neon Postgres integration (or set `DATABASE_URL` manually) and set
   `ANTHROPIC_API_KEY` (+ optional vars) as environment variables for
   Production and Preview.
3. Run `npm run db:migrate` against the production database once before
   first use (or `npm run db:push` for a quick dev-only setup).
4. Deploy.

## 🔐 Environment Configuration

### Required Variables

```env
# Anthropic API (Required) — vision extraction + recommendations
# Get one at https://console.anthropic.com/
ANTHROPIC_API_KEY=

# Postgres (Required) — pooled connection string from Neon
DATABASE_URL=

# --- Optional ---

# Neon's direct (non-pooled) connection string, used only by drizzle-kit
# for migrations. Falls back to DATABASE_URL if unset.
DATABASE_URL_UNPOOLED=

# Powers the Google Books metadata fallback *and* the Google Cloud Vision
# OCR fallback used when Claude's vision call is unavailable. The app
# works without it for metadata (Open Library is tried first), but the
# Vision fallback needs it — see the Cloud Vision setup note below.
GOOGLE_BOOKS_API_KEY=

# Override the Claude model used for vision extraction + recommendations.
ANTHROPIC_MODEL=claude-sonnet-5
```

### API Key Setup

**Anthropic API** (Required — for vision extraction and recommendations):
1. Visit the [Anthropic Console](https://console.anthropic.com/)
2. Create an account and add billing
3. Generate an API key

**Neon Postgres** (Required):
1. Create a project at [neon.tech](https://neon.tech) (or via the Vercel
   Neon integration)
2. Copy the pooled connection string into `DATABASE_URL`

**Google Books + Cloud Vision** (Optional, but both use the same key):
1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/library/books.googleapis.com)
   and enable the Books API
2. Also enable the [Cloud Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
   on the same project — unlike Books, Vision has no unauthenticated
   tier, so without this the OCR fallback just errors instead of
   kicking in when Claude is unavailable
3. Create an API key and set `GOOGLE_BOOKS_API_KEY`

## 📁 Project Architecture

```
bookscanner/
├── app/
│   ├── (wizard)/             # Scan → Preferences → Results, shared layout
│   │   ├── scan/
│   │   ├── preferences/
│   │   └── results/
│   ├── api/
│   │   ├── scan/             # Claude vision (+ Google Vision fallback) → book enrichment
│   │   ├── preferences/      # Saves preferences to the device's history
│   │   ├── recommend/        # Claude recommendation call
│   │   └── history/          # Past scans for the current device
│   └── history/              # Reading history page
├── components/
│   ├── scan/                 # Photo capture/upload UI
│   ├── preferences/          # Preference form controls
│   ├── results/              # Recommendation display
│   ├── wizard/                # Shared step-progress UI
│   └── ui/                   # Base components (Button, Spinner, ...)
├── lib/
│   ├── anthropic/             # Claude client, prompts, rate limit, cache, extraction, recommendation
│   ├── google/                 # Google Cloud Vision OCR fallback
│   ├── books/                 # Open Library / Google Books enrichment + matching
│   ├── db/                    # Drizzle schema + queries (Neon)
│   ├── device/                # Anonymous device-id cookie
│   ├── image/                 # Client-side image handling
│   ├── state/                 # Wizard sessionStorage state
│   └── validation/            # Zod schemas shared client/server
├── drizzle/                   # Generated SQL migrations
├── tests/                     # Vitest unit tests (all mocked)
└── types/                     # Shared TypeScript types
```

## 🔍 How It Works

### 1. Scan
- You photograph or upload a bookshelf image
- Claude vision reads it and returns a raw list of detected books
  (`lib/anthropic/extractBooks.ts`) — title, author, and a confidence score
- If Claude can't be used — the rate limit below, an Anthropic outage, a
  bad key — the same call falls back to Google Cloud Vision OCR
  (`lib/google/visionFallback.ts`) instead of failing outright, at lower
  quality (no title/author split, no real confidence score)
- Each detected book is matched against Open Library, falling back to
  Google Books, or kept as `unmatched` rather than dropped
  (`lib/books/enrich.ts`) — so every spine still reaches the recommendation
  step even with no metadata match

### 2. Preferences
- You set genres, favorite authors/books, mood, and a length preference
- Saved client-side so returning users don't have to redo it — a user is
  free to skip preferences entirely and still get a recommendation

### 3. Discover
- `lib/anthropic/recommend.ts` ranks the enriched shelf against your stated
  preferences
- The request-specific response schema restricts `bookId` to a literal
  union of the actual shelf's ids — the model cannot recommend a book that
  isn't on the shelf
- Each pick's rationale must name the specific preference fields it matched

### 4. History
- The detected books and the recommendation are saved to Postgres, scoped
  to an anonymous per-browser device id — browsable later at `/history`

### 5. Rate Limiting & Caching
- `lib/anthropic/rateLimit.ts` enforces one Claude call per minute per
  (anonymous device, call type) — scan and recommend have independent
  budgets, so a normal scan-then-recommend flow doesn't self-trigger the
  limit on its second call. State lives in Postgres (a `rate_limits`
  table), not in memory, so it holds correctly across every Vercel
  instance/region; the check fails open (logs and lets the call through)
  if the DB itself errors, so a transient Neon issue degrades to "briefly
  unlimited," not "the app stops working"
- `lib/anthropic/cache.ts` short-circuits that limit for repeat requests:
  identical (image) or (shelf + preferences) inputs are served from an
  in-memory TTL cache instead of hitting Claude again

## 🛡 Security & Privacy

- **No Accounts**: identity is a single anonymous httpOnly device-id
  cookie (`lib/device/deviceId.ts`) — no login, no personal data collected
- **Photo Privacy**: the photo itself is never stored — only the extracted
  book list and the resulting recommendation are saved
- **Input Validation**: Zod schemas validate every request body, client
  and server side
- **Server-Only Secrets**: the Anthropic client and database access are
  marked `server-only`, so API keys and connection strings can never end
  up in client-side JavaScript

## 🧪 Development Scripts

```bash
# Development
npm run dev              # Start the dev server
npm run build             # Production build
npm start                 # Start the production server

# Database
npm run db:generate       # Generate a migration file from lib/db/schema.ts
npm run db:migrate        # Apply pending migrations
npm run db:push           # Dev-only: push the schema directly, skip the migration file
npm run db:studio         # Open Drizzle Studio to browse the database

# Testing & Quality
npm test                  # Run unit tests (all mocked — no live API calls or database needed)
npm run lint               # ESLint
npm run typecheck          # next typegen && tsc --noEmit
```

## 📄 License

[MIT](./LICENSE) — use, modify, and distribute freely, with attribution.

## 🆘 Support

- **Issues**: open a [GitHub issue](https://github.com/EdouardMr/bookscanner/issues)
  for bugs or feature requests
