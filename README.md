# COSMOS AI

A cinematic NASA-powered space exploration app built with Next.js 16, TypeScript, Tailwind CSS, Framer Motion, Three.js, NASA APIs, OpenAlex research search, Groq-powered guidance, and optional OpenAI fallback.

## Requirements

- Node.js 20+
- npm
- NASA API key
- Groq API key, optional for live AI responses
- OpenAI API key, optional fallback for live AI responses
- OpenAlex API key, optional but recommended for production research search

## Environment Variables

Create `.env.local` for local development. Use `.env.example` as the template.

| Variable | Required | Description |
| --- | --- | --- |
| `NASA_API_KEY` | Yes | Server-only. Used by APOD, NeoWs, DONKI, and Mars Rover API requests. Never expose with `NEXT_PUBLIC_`. |
| `GROQ_API_KEY` | No | Server-only primary AI provider for Ask COSMOS. Never expose with `NEXT_PUBLIC_`. |
| `GROQ_MODEL` | No | Server-only. Defaults to `llama-3.3-70b-versatile`. |
| `OPENAI_API_KEY` | No | Optional server-only fallback AI provider. Never expose with `NEXT_PUBLIC_`. |
| `OPENAI_MODEL` | No | Server-only OpenAI fallback model. Defaults to `gpt-5-mini`, then falls back to `gpt-4o-mini` if unavailable. |
| `OPENALEX_EMAIL` | No | Optional OpenAlex polite-pool email for production research search. |
| `OPENALEX_API_KEY` | No | Optional legacy/server-only OpenAlex key support. Never expose with `NEXT_PUBLIC_`. |
| `CORE_API_KEY` | No | Server-only CORE API key for open-access research search. |
| `WEATHERSTACK_API_KEY` | No | Server-only Weatherstack key for location weather. |
| `PURPLEAIR_API_KEY` | No | Server-only PurpleAir key for air-quality context. |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | Used for canonical URLs, robots.txt, sitemap.xml, and social previews. Use `http://localhost:3000` locally and your production domain on Vercel. |
| `SERVER_FETCH_TIMEOUT_MS` | No | Server-only shared fetch timeout in milliseconds. Defaults to `6000`; accepted range is `100`–`30000`. |

Example:

```bash
NASA_API_KEY=your_nasa_api_key_here
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
# Optional: fallback live AI provider.
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
OPENALEX_EMAIL=you@example.com
CORE_API_KEY=your_core_api_key_here
WEATHERSTACK_API_KEY=your_weatherstack_api_key_here
PURPLEAIR_API_KEY=your_purpleair_api_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SERVER_FETCH_TIMEOUT_MS=6000
```

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Before shipping, run:

```bash
npm run typecheck
npm run build
```

Optional local production smoke test:

```bash
npm run start
```

Then verify:

- `http://localhost:3000/`
- `http://localhost:3000/ask`
- `http://localhost:3000/about`
- `http://localhost:3000/blog`
- `http://localhost:3000/apod`
- `http://localhost:3000/earth`
- `http://localhost:3000/gallery`
- `http://localhost:3000/image-explorer`
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/earth/status`
- `http://localhost:3000/robots.txt`
- `http://localhost:3000/sitemap.xml`

## Deploy To Vercel

1. Import the repository into Vercel.
2. Use the default Next.js framework preset.
3. Set the build command to `npm run build`.
4. Set the install command to `npm install`.
5. Set the output directory to the Vercel default for Next.js.
6. Add the required environment variables in Vercel Project Settings.
7. Set `NEXT_PUBLIC_SITE_URL` to the production URL, for example `https://your-domain.com`.
8. Deploy.
9. After deployment, open `/`, `/ask`, `/apod`, `/gallery`, `/image-explorer`, `/robots.txt`, and `/sitemap.xml` on the production URL.
10. Send a short prompt in `/ask` to verify live AI when `GROQ_API_KEY` is configured, OpenAI fallback when only `OPENAI_API_KEY` is configured, or the static NASA-guided fallback when neither is configured.
11. Open `/apod` and `/briefing` to verify NASA-backed pages render with live data.

Vercel environment variables:

```bash
NASA_API_KEY=your_nasa_api_key_here
# Optional live AI mode
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
OPENALEX_EMAIL=you@example.com
CORE_API_KEY=your_core_api_key_here
WEATHERSTACK_API_KEY=your_weatherstack_api_key_here
PURPLEAIR_API_KEY=your_purpleair_api_key_here
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

If `NEXT_PUBLIC_SITE_URL` is not set in production, Vercel system URLs are used when available. Other production environments fail configuration validation; `http://localhost:3000` is used only in development and tests.

### Final Environment Checklist

- `NASA_API_KEY` is set in Vercel and is not prefixed with `NEXT_PUBLIC_`.
- `GROQ_API_KEY` is optional but recommended for primary live Ask COSMOS responses. If set, it is not prefixed with `NEXT_PUBLIC_`.
- `GROQ_MODEL` is optional and defaults to `llama-3.3-70b-versatile`.
- `OPENAI_API_KEY` is optional fallback. If set, it is not prefixed with `NEXT_PUBLIC_`.
- `OPENALEX_EMAIL` is optional but recommended for OpenAlex production usage.
- `CORE_API_KEY`, `WEATHERSTACK_API_KEY`, and `PURPLEAIR_API_KEY` are optional server-only external-intelligence keys.
- `NEXT_PUBLIC_SITE_URL` is set to the production origin, for example `https://cosmos-ai.vercel.app` or your custom domain.
- Preview and Production environments have the variables they need.
- No secret values are committed to the repository.

## Feature Status

| Area | Status | Notes |
| --- | --- | --- |
| Homepage | Live | Cinematic hero, NASA highlights, mission signals, briefing preview, gallery preview, and assistant preview. |
| Briefing | Live with fallback | Uses NASA APOD, NeoWs, DONKI, Mars, image/news context where available; static briefing copy appears when APIs or AI fail. |
| APOD | Live with fallback | Fetches APOD server-side and shows editorial static guidance when AI explanation is unavailable. |
| Image Explorer | Live with fallback | Searches NASA Image and Video Library, supports filters, infinite scroll, media viewer, downloads, and sample archive fallback. |
| Gallery | Live with fallback | Searchable NASA media exhibition with fullscreen viewer and fallback exhibition wall. |
| Ask COSMOS | Live when configured | `/api/ai/chat` streams server-side Groq responses when configured, falls back to OpenAI when available, and otherwise uses static NASA-context guidance. Research prompts use OpenAlex, CORE, and arXiv context where available. |
| External Intelligence | Live with fallbacks | `/api/cosmos/*` routes normalize research, weather, observing, air quality, ISRO, earthquakes, sunrise/sunset, World Bank, and Wikidata context. |
| OpenAlex Research | Live when configured | Server-only OpenAlex service and API routes search papers, authors, institutions, and topics, with 30-minute cache and graceful errors. |
| Earth Dashboard | Live with fallback | Uses NASA/DONKI/NeoWs/Mars plus free ISS, NOAA SWPC Kp, Open-Meteo weather, and local Earth rotation calculations. |
| Solar System | Local interactive V1 | Existing interactive planet experience is usable but not yet the full realistic 3D Solar System V2. |
| About | Live | Team/product mission page for COSMOS AI. |
| Blog | Live | Team-editable TypeScript content system in `src/content/blog`. |
| Entropy section | Planned | The handoff/audit note tracks this as pending unless the component is added in a later sprint. |
| User accounts, saved explorations, profiles | Planned | Not part of V1 Phase 1. |

### Missing-Key Behavior

- Missing `GROQ_API_KEY` uses OpenAI fallback when configured.
- Missing both `GROQ_API_KEY` and `OPENAI_API_KEY` falls back to non-live assistant responses instead of crashing the app.
- Missing `NASA_API_KEY` returns structured API errors from NASA API routes and page-level fallbacks where available.
- NASA and OpenAI keys are read only in server services, route handlers, or server-rendered pages.
- OpenAlex keys are read only in `src/lib/openalex.ts` and server route handlers.
- Gallery and Image Explorer never call OpenAI automatically. AI explanations are requested only after an explicit user action.

## SEO

SEO metadata is configured in `src/app/layout.tsx` and page-level route files.

Generated SEO routes:

- `GET /robots.txt` from `src/app/robots.ts`
- `GET /sitemap.xml` from `src/app/sitemap.ts`

Production canonical URLs are based on `NEXT_PUBLIC_SITE_URL`.

## Homepage Includes

- Full-screen cinematic hero
- Animated canvas starfield
- Animated shader hero and starfield visuals
- Framer Motion section reveals
- Today's Cosmic Briefing
- Explore the Solar System
- NASA Highlights
- AI Assistant Preview
- Space Gallery Preview
- Responsive premium dark visual system

Implementation note: `src/components/home/rotating-earth.tsx` currently remains as an unused experimental Earth component. The active homepage hero uses the shader hero path.

## NASA Service Layer

Reusable server-side NASA services live in:

```bash
src/services/nasa
```

Included services:

- APOD: `getApod`, `getTodaysApod`
- NeoWs: `getNeoWsFeed`, `getNeoWsAsteroid`, `browseNeoWsAsteroids`
- DONKI: `getDonkiEvents`, `getSolarFlares`, `getCoronalMassEjections`, `getGeomagneticStorms`
- NASA Image Library: `searchNasaImages`, `getNasaImageAsset`, metadata, captions, album helpers
- Mars Rover: `getMarsRoverPhotos`, `getMarsRoverManifest`

Server API routes live in:

```bash
src/app/api/nasa
```

Available route groups:

- `GET /api/nasa/apod`
- `GET /api/nasa/neows/feed?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/nasa/neows/browse`
- `GET /api/nasa/neows/[asteroidId]`
- `GET /api/nasa/donki/[type]`
- `GET /api/nasa/media/search`
- `GET /api/nasa/media/[nasaId]`
- `GET /api/nasa/media/albums/[album]`
- `GET /api/nasa/mars-rover/[rover]/photos`
- `GET /api/nasa/mars-rover/[rover]/manifest`

## OpenAlex Research Layer

Reusable server-side OpenAlex research services live in:

```bash
src/lib/openalex.ts
```

Included service functions:

- `searchOpenAlexPapers`
- `searchOpenAlexAuthors`
- `searchOpenAlexInstitutions`
- `searchOpenAlexTopics`
- `searchOpenAlex`
- `getOpenAlexPaper`
- `getOpenAlexAuthor`
- `getOpenAlexTopic`

OpenAlex API routes:

- `GET /api/openalex/search?q=black%20holes&type=papers`
- `GET /api/openalex/search?q=NASA&type=all`
- `GET /api/openalex/paper?id=W2741809807`
- `GET /api/openalex/author?id=A5023888391`
- `GET /api/openalex/author?q=Kip%20Thorne`
- `GET /api/openalex/topic?id=T123456`
- `GET /api/openalex/topic?q=exoplanets`

The OpenAlex layer handles:

- Server-only API key usage through `OPENALEX_API_KEY`
- Strong TypeScript result interfaces
- 30-minute in-memory response caching
- Retry logic for transient failures
- Timeout handling
- Input validation in route handlers
- Ask COSMOS research grounding when a prompt asks for papers, journals, studies, publications, citations, latest research, or scientific discoveries

The shared fetch layer handles:

- NASA key injection from `NASA_API_KEY`
- Server-side fetching only
- Next.js revalidation caching
- NASA-style HTTP error handling
- Rate-limit header capture when NASA returns rate-limit metadata
- COSMOS response headers for successful rate-limit visibility

## Backend Utilities

Shared server helpers:

- `src/lib/server-fetch.ts`: server-only fetch wrapper with timeout, cache/revalidate tags, JSON/text helpers, and safe errors.
- `src/lib/api-response.ts`: consistent `{ success, data }` and `{ success, error }` JSON responses.
- `src/services/earth/dashboard.ts`: shared Earth Dashboard aggregation used by `/earth` and `/api/earth/status`.

Health and status routes:

- `GET /api/health`
- `GET /api/earth/status`

## Blog Workflow

Blog content is stored as typed TypeScript data in:

```bash
src/content/blog/posts.ts
```

Team instructions for adding posts are in:

```bash
src/content/blog/README.md
```

Current public routes:

- `GET /blog`
- `GET /blog/why-cosmos-ai-exists`
- `GET /blog/nasa-open-data-space-education`
- `GET /blog/beginners-guide-near-earth-objects`
