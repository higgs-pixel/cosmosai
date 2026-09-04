# COSMOS AI Project Status

## Project Overview

### Mission

COSMOS AI is a cinematic, NASA-powered space exploration product. Its mission is to turn NASA imagery, mission archives, planetary science, near-Earth object data, space weather signals, and guided AI explanations into an immersive observatory that is useful for students, educators, researchers, creators, and space enthusiasts.

### Current Website Purpose

The current website is a V1/V2 prototype moving toward production readiness. It combines editorial NASA storytelling, searchable media discovery, daily space briefings, a 3D-inspired Solar System experience, APOD storytelling, and an AI assistant with server-side OpenAI integration plus graceful fallback behavior.

### Target Users

- Space enthusiasts who want a beautiful daily way to explore NASA content.
- Students and educators who need clear explanations of astronomy, NASA imagery, planets, asteroids, and missions.
- Creators and researchers looking for NASA media and source links.
- Casual visitors who want a premium, cinematic, Apple/NASA/SpaceX-quality space experience.

### Technology Stack

- Framework: Next.js App Router. `package.json` currently uses Next.js `16.2.9`; README now documents Next.js 16.
- Language: TypeScript.
- Styling: Tailwind CSS with custom COSMOS global utilities.
- Animation: Framer Motion, custom canvas starfield, shader hero, CSS motion utilities.
- 3D: Three.js.
- Icons: lucide-react.
- AI: Server-side OpenAI Responses API integration through `/api/ai/chat`.
- Research: Server-side OpenAlex integration through `src/lib/openalex.ts` and `/api/openalex/*` routes.
- Data: NASA Open APIs, NASA Image and Video Library, and OpenAlex scholarly metadata.
- Analytics: Lightweight Vercel Analytics and Speed Insights scripts.

### Deployment Details

- Target deployment platform: Vercel.
- Build command: `npm run build`.
- Install command: `npm install`.
- Runtime: Next.js server/API routes, with static and revalidated pages where possible.
- SEO routes: `/robots.txt` and `/sitemap.xml`.
- Production site origin should be configured through `NEXT_PUBLIC_SITE_URL`.

### Domain

- No custom production domain is confirmed in the repository.
- `.env.example` uses `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- For production, set `NEXT_PUBLIC_SITE_URL` to the Vercel production URL or custom domain.

## Current Features

### Homepage

- Cinematic homepage at `/`.
- Animated shader hero via `src/components/ui/animated-shader-hero.tsx`.
- COSMOS-specific hero content and CTAs:
  - Explore NASA Images: `/image-explorer`
  - View Daily Briefing: `/briefing`
  - Ask COSMOS: `/ask`
- Animated starfield background.
- COSMOS Mission Signals preview using the radial orbital timeline.
- Daily Cosmic Briefing preview that fetches `/api/briefing/daily`.
- Solar System preview with planet CTAs into `/solar-system?planet=...`.
- NASA highlights section.
- Ask COSMOS preview.
- Space Gallery preview.
- Footer with route links.
- Privacy-friendly analytics events for page views and planet clicks.

### Briefing

- Mission-control style briefing page at `/briefing`.
- Combines APOD, near-Earth objects, DONKI space weather, Mars rover/photo highlight, NASA news/highlights, and mission signal UI.
- Uses `MissionControlBriefing` component.
- Includes COSMOS Mission Signals radial orbital timeline.
- Uses fallbacks when live NASA signals are unavailable.
- Designed as a daily-return feature with editorial cards, "why it matters" style content, and explore links.

### APOD

- Premium editorial APOD page at `/apod`.
- Fetches Astronomy Picture of the Day through NASA APOD service.
- Full-screen hero image/media treatment.
- NASA article/description section.
- AI/static explanation section.
- "Why this matters" section.
- Related NASA exploration links.
- Share button and share card generation behavior.
- Save button behavior in `apod-actions`.
- Fallback handling for unavailable data.

### Image Explorer

- NASA Image and Video Library route at `/image-explorer`.
- Search bar with instant search behavior.
- Media filters for image/video/audio.
- Category/editorial query chips.
- Masonry-style media grid.
- Loading skeletons.
- Empty states.
- Error banner.
- Full-screen media viewer.
- Metadata panel with NASA ID, date, center, keywords, description, mission information, and related searches.
- Download/open original links from NASA asset manifests.
- NASA source links.
- "Ask COSMOS" link with media context.
- Fallback sample/archive behavior exists where API requests fail.
- Analytics event for Image Explorer searches.

### Gallery

- Gallery route at `/gallery`.
- NASA media browsing experience with search and media cards.
- Full-screen viewer.
- Metadata and source panel.
- Loading, empty, and error states.
- Visual style aligned with the Image Explorer but simpler.

### Solar System

- Solar System route at `/solar-system`.
- Three.js powered scene with Sun and planets.
- Planet selection and click-to-focus interaction.
- Planet detail panel with educational facts:
  - Name
  - Diameter
  - Distance from Sun
  - Gravity
  - Atmosphere
  - Day length
  - Year length
  - Moons
  - Description
  - NASA search link
- Orbit paths, labels, controls, telemetry, and mobile-conscious layout.
- 2D fallback mode for lower-performance or failed 3D rendering.
- Planet card/click analytics events.

### Ask COSMOS

- AI assistant route at `/ask`.
- Chat interface with message history.
- Suggested prompts.
- Audience modes: beginner, student, researcher.
- Context-aware modes:
  - General space question
  - APOD explanation
  - Asteroid summary
  - Mars image explanation
  - NASA media explanation
- Server-side OpenAI integration through `/api/ai/chat`.
- Streaming text responses.
- Strict input validation.
- Basic in-memory rate limiting:
  - 6 requests per minute per client key.
  - 50 requests per day per client key.
- In-memory response caching for repeated eligible prompts.
- Detailed server logging for AI and NASA context loading.
- Fallback response when OpenAI key, model availability, quota, credits, timeout, fetch, or stream fails.
- Copy response, regenerate response, and clear chat behavior exist in the assistant UI.
- Clear status messaging for Live AI, GPT-5 Active, GPT-4o Fallback, Fallback Mode, Missing API Key, Rate Limited, Quota/Billing Issue, and Service Temporarily Unavailable states.
- Research mode is now available in Ask COSMOS.
- Research-triggering prompts automatically search OpenAlex before GPT is called.
- Research trigger terms include research, paper, journal, study, scientific, publication, latest research, new discovery, review article, and citation.
- OpenAlex papers are injected into GPT context with titles, authors, year, journal/source, abstract, citation count, DOI, institution, concepts/topics, and links.
- Research answers show lazy-loaded OpenAlex research cards with Open Paper, Copy Citation, Copy APA, Copy MLA, and Copy Chicago actions.
- The GPT prompt explicitly forbids fabricated papers, authors, journals, citation counts, DOIs, institutions, or links.

### NASA Integrations

- APOD API.
- NeoWs near-Earth object APIs.
- DONKI space weather APIs.
- NASA Image and Video Library APIs.
- Mars Rover manifest and photo APIs.
- Server-side service layer in `src/services/nasa`.
- API route wrappers in `src/app/api/nasa`.
- NASA API key is server-only through `NASA_API_KEY`.
- Rate-limit headers are read when NASA returns them.
- Next.js revalidation caching profiles are used in the NASA fetch layer.

### Animations

- Framer Motion section reveals.
- Animated shader hero.
- Animated canvas starfield.
- Radial orbital timeline with clickable nodes, related node pulsing, auto-rotation pause when active, click-outside reset, reduced-motion support, and mobile radius/card adjustments.
- Three.js Solar System rotation/orbit motion.
- Hover transitions on cards and CTAs.
- Loading skeleton shimmer.

### UI Systems

- Tailwind CSS theme and global utilities.
- COSMOS-specific glass utilities:
  - `glass-panel`
  - `glass-card`
  - `glass-button`
  - `glass-nav`
  - `glass-border`
- Existing COSMOS utilities:
  - `cosmos-container`
  - `cosmos-glass`
  - `cosmos-glass-deep`
  - `cosmos-surface`
  - `cosmos-orbital-grid`
  - `cosmos-skeleton`
  - `text-gradient-stellar`
  - `text-gradient-ai`
- shadcn-style local UI primitives now exist in `src/components/ui`:
  - `badge.tsx`
  - `button.tsx`
  - `card.tsx`
  - `animated-shader-hero.tsx`
  - `radial-orbital-timeline.tsx`

### Glassmorphism

- Applied to navbars, hero/CTA surfaces, briefing cards, APOD cards, Image Explorer cards, Gallery cards, Ask COSMOS chat shell, planet panels, Solar System loading shell, and Mission Signals timeline cards.
- Includes reduced-transparency and unsupported-backdrop-filter fallbacks.
- Mobile blur and shadow intensity are reduced for performance.

### Shader Hero

- Implemented at `src/components/ui/animated-shader-hero.tsx`.
- Used as the homepage hero.
- Adapted to COSMOS content, deep-space black, electric blue, purple accents, and NASA-powered cosmic intelligence copy.
- Includes WebGL/static fallback safeguards and reduced-motion considerations.

### Entropy Section

- Not currently present in the source tree.
- No `src/components/ui/entropy.tsx` file exists.
- No homepage section titled "From cosmic chaos to intelligent discovery" was found.
- Treat this as pending or missing, not working.

### Other Implemented Functionality

- SEO metadata in `src/app/layout.tsx` and page-level metadata.
- `robots.txt` via `src/app/robots.ts`.
- `sitemap.xml` via `src/app/sitemap.ts`.
- Vercel Analytics and Speed Insights through `src/components/analytics/vercel-observability.tsx`.
- Privacy-friendly analytics helpers in `src/lib/cosmos-analytics.ts`.
- Skip link and focus-visible accessibility styling.
- Server-only env helper in `src/lib/env.ts`.

## Routes

### Page Routes

- `/`: Homepage. Cinematic landing/observatory experience with shader hero, mission signals, briefing preview, solar preview, NASA highlights, Ask preview, and gallery preview.
- `/briefing`: Daily Cosmic Briefing. Mission-control dashboard combining APOD, asteroids, DONKI space weather, Mars/NASA highlights, and Mission Signals.
- `/apod`: Astronomy Picture of the Day editorial story page.
- `/ask`: Ask COSMOS AI assistant and fallback guide.
- `/gallery`: NASA gallery/media browsing experience.
- `/image-explorer`: Premium NASA Image and Video Library explorer.
- `/solar-system`: Interactive Solar System experience.
- `/asteroids`: Asteroid tracking page. Present in app routes and build output, though not part of the latest glassmorphism target list.
- `/robots.txt`: Generated robots metadata.
- `/sitemap.xml`: Generated sitemap metadata.

### API Routes

- `POST /api/ai/chat`: Server-side OpenAI assistant endpoint with streaming, validation, rate limiting, caching, NASA context, logging, and fallbacks.
- `GET /api/openalex/search`: Server-side OpenAlex search route for papers, authors, institutions, topics, or all.
- `GET /api/openalex/paper`: Server-side OpenAlex paper lookup by `id`.
- `GET /api/openalex/author`: Server-side OpenAlex author lookup by `id` or search by `q`.
- `GET /api/openalex/topic`: Server-side OpenAlex topic lookup by `id` or search by `q`.
- `GET /api/briefing/daily`: Daily briefing endpoint.
- `GET /api/nasa/apod`: APOD proxy route.
- `GET /api/nasa/donki/[type]`: DONKI space weather route.
- `GET /api/nasa/mars-rover/[rover]/manifest`: Mars Rover manifest route.
- `GET /api/nasa/mars-rover/[rover]/photos`: Mars Rover photo route.
- `GET /api/nasa/media/search`: NASA Image and Video Library search route.
- `GET /api/nasa/media/[nasaId]`: NASA media asset route.
- `GET /api/nasa/media/albums/[album]`: NASA media album route.
- `GET /api/nasa/neows/feed`: NeoWs feed route.
- `GET /api/nasa/neows/browse`: NeoWs browse route.
- `GET /api/nasa/neows/[asteroidId]`: NeoWs asteroid detail route.

## API Integrations

### NASA APIs

- NASA APOD:
  - Service: `src/services/nasa/apod.service.ts`
  - Route: `/api/nasa/apod`
  - Used by `/apod`, `/briefing`, homepage briefing preview, and Ask COSMOS context.
- NASA NeoWs:
  - Service: `src/services/nasa/neows.service.ts`
  - Routes: `/api/nasa/neows/feed`, `/api/nasa/neows/browse`, `/api/nasa/neows/[asteroidId]`
  - Used by briefing, asteroid tracking, and Ask COSMOS context.
- NASA DONKI:
  - Service: `src/services/nasa/donki.service.ts`
  - Route: `/api/nasa/donki/[type]`
  - Used by briefing and Ask COSMOS daily context.
- NASA Image and Video Library:
  - Service: `src/services/nasa/image-library.service.ts`
  - Routes: `/api/nasa/media/search`, `/api/nasa/media/[nasaId]`, `/api/nasa/media/albums/[album]`
  - Used by Image Explorer, Gallery, homepage highlights, and Ask COSMOS context.
- Mars Rover:
  - Service: `src/services/nasa/mars-rover.service.ts`
  - Routes: `/api/nasa/mars-rover/[rover]/photos`, `/api/nasa/mars-rover/[rover]/manifest`
  - Used by briefing and future Mars image flows.

### Groq / OpenAI APIs

- Primary Ask COSMOS provider now uses Groq when `GROQ_API_KEY` is configured.
- Groq endpoint: `https://api.groq.com/openai/v1/chat/completions`.
- Default Groq model: `llama-3.3-70b-versatile` from `GROQ_MODEL`.
- OpenAI remains as an optional fallback provider when Groq is not configured and `OPENAI_API_KEY` exists.
- Provider abstraction files:
  - `src/lib/ai/provider.ts`
  - `src/lib/ai/groq.ts`
  - `src/lib/ai/system-prompt.ts`
  - `src/lib/ai/tool-context.ts`
- Existing OpenAI fallback service: `src/services/openai/chat.service.ts`.
- Route: `/api/ai/chat`.
- Server-side only. The browser never receives `GROQ_API_KEY` or `OPENAI_API_KEY`.
- Default model comes from `src/lib/env.ts`:
  - `OPENAI_MODEL` if set.
  - Defaults to `gpt-5-mini`.
  - Falls back to `gpt-4o-mini` if GPT-5 is unavailable.
- Gallery and Image Explorer do not call OpenAI automatically; image explanations require an explicit user action.
- Research prompts in Ask COSMOS call OpenAlex first, then pass bounded paper metadata into GPT context.

### External Intelligence APIs

- Normalized server-only data-source clients live in `src/lib/data-sources`.
- Internal COSMOS intelligence routes live in `src/app/api/cosmos`.
- Implemented sources:
  - OpenAlex, CORE, arXiv
  - Weatherstack, Open-Meteo, 7Timer, PurpleAir
  - Arcsecond wrapper, ISRO API, USGS earthquakes
  - Sunrise-Sunset, World Bank, Wikidata
- Aggregate routes:
  - `/api/cosmos/ai-context`
  - `/api/cosmos/daily-intelligence`
- Documentation:
  - `docs/COSMOS_AI_DATA_SOURCES.md`
  - `docs/COSMOS_AI_GROQ_MIGRATION.md`

### OpenAlex APIs

- Service: `src/lib/openalex.ts`.
- Base API: `https://api.openalex.org`.
- Server API routes:
  - `/api/openalex/search`
  - `/api/openalex/paper`
  - `/api/openalex/author`
  - `/api/openalex/topic`
- Supported service operations:
  - Search papers.
  - Search authors.
  - Search institutions.
  - Search topics.
  - Get paper by OpenAlex ID or DOI-style identifier.
  - Get author by OpenAlex ID or ORCID-style identifier.
  - Get topic by OpenAlex ID.
- Production safeguards:
  - Strong TypeScript interfaces for normalized papers, authors, institutions, topics, and search metadata.
  - 30-minute in-memory cache.
  - Timeout handling.
  - Retry logic for transient failures.
  - Route-level input validation and bounded limits.
  - Optional server-only `OPENALEX_API_KEY`.
  - No OpenAlex key is exposed to the frontend.

### Environment Variables

- `NASA_API_KEY`
  - Server-only.
  - Required for live NASA Open API calls.
  - Must not be prefixed with `NEXT_PUBLIC_`.
- `OPENAI_API_KEY`
  - Server-only.
  - Optional for live AI responses.
  - Missing key triggers static fallback responses.
  - Must not be prefixed with `NEXT_PUBLIC_`.
- `OPENAI_MODEL`
  - Server-only.
  - Optional.
  - Current code default: `gpt-5-mini`, with `gpt-4o-mini` as the automatic fallback model when GPT-5 is unavailable.
- `OPENALEX_API_KEY`
  - Server-only.
  - Optional but recommended for production OpenAlex quota.
  - Must not be prefixed with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SITE_URL`
  - Public site origin for canonical URLs, sitemap, robots, and social metadata.
  - Should be set to the production domain on Vercel.

### Current API Status

- NASA service layer is implemented and typed.
- NASA API routes are implemented.
- OpenAI service layer and `/api/ai/chat` are implemented.
- OpenAlex service layer and `/api/openalex/*` routes are implemented.
- Ask COSMOS research mode is implemented and uses OpenAlex before GPT when relevant.
- Missing NASA keys cause structured errors and page-level fallbacks where available.
- Missing OpenAI key does not crash the app; Ask COSMOS streams a fallback guide response.
- OpenAI quota, credits, timeout, fetch, and stream failures are logged and fallback to static guidance.
- OpenAlex timeout, transient HTTP, and route errors return graceful JSON errors and never leak secrets.
- Daily briefing can run with fallback content if live data fails.

### Failures Or Fallbacks

- NASA Open API requests require `NASA_API_KEY`; without it, live NASA data may fail.
- NASA Image Library can be queried without the same Open API key in many cases, but route behavior still depends on service implementation and network/API availability.
- OpenAI responses depend on `OPENAI_API_KEY`, model availability, quota, and credits.
- AI fallback responses are useful but not equivalent to full model intelligence.
- In-memory rate limiting and caching reset on serverless cold starts or new instances.

## UI/UX Improvements Completed

### Hero Upgrades

- Homepage hero replaced with COSMOS-adapted animated shader hero.
- Hero copy is space-specific and not generic SaaS language.
- CTA routes are real and functional.
- Mobile text sizing is constrained for readability.
- Fallback handling exists for reduced motion and shader/WebGL limitations.

### Glassmorphism

- Reusable glass utility classes added in `src/app/globals.css`.
- Applied to navigation, cards, panels, CTAs, chat shell, planet panels, media cards, and Mission Signals.
- Visual language uses deep black, electric blue, subtle purple, frosted surfaces, inner highlights, thin borders, and controlled glow.
- Reduced-transparency and unsupported-backdrop-filter fallbacks added.

### Animations

- Framer Motion reveals and staggered content motion.
- Shader hero animation.
- Starfield background.
- Radial orbital timeline animation.
- Three.js Solar System motion.
- Hover and focus transitions.
- Skeleton loading shimmer.
- Global reduced-motion CSS fallback.

### Cards

- Cards now follow a more consistent frosted-glass system.
- Media cards retain strong image visibility with glass overlays and metadata.
- Briefing, APOD, Image Explorer, Gallery, Ask, and Solar System panels have more consistent depth and border treatment.

### Visual Effects

- Orbital grid and telemetry-style overlays.
- Deep-space vignette and noise overlays.
- Blue/purple accent glows.
- Glass borders and inner highlights.
- Dark cinematic base throughout.

### Mobile Improvements

- Responsive grids across homepage, briefing, Image Explorer, Gallery, Ask, APOD, and Solar System.
- Mobile blur/shadow reductions for glass utilities.
- Solar System includes 2D fallback and mobile-conscious interaction layout.
- Radial timeline reduces radius/card sizing on mobile.

### Performance Optimizations

- Next.js revalidation profiles for NASA fetches.
- Lazy/heavy visual behavior guarded where implemented.
- Reduced-motion support.
- Mobile glass effects are less expensive.
- Vercel Speed Insights included.
- Build currently succeeds with static generation for primary routes.

## Known Issues

### AI Assistant Limitations

- Live AI requires a valid `OPENAI_API_KEY`, available model, quota, and credits.
- Fallback responses are static and source-guided but not truly intelligent.
- Rate limiting and caching are in-memory and not durable across serverless instances.
- No persistent conversation storage.
- NASA context is summarized from available services and may be incomplete.
- OpenAI production behavior still depends on configured model access, quota, and billing even though the code now has a GPT-5 to GPT-4o fallback chain.
- Assistant does not yet include deep source citation UI or verified source snippets beyond context labels.

### Solar System Limitations

- Three.js Solar System exists, but realism can improve.
- Planet textures, lighting, atmospheric shaders, cloud layers, and city lights should be reviewed for quality and performance.
- Orbits and sizes are likely educational/stylized, not physically precise.
- No real-time mission overlays.
- No NASA Eyes-level timeline, spacecraft tracking, or ephemeris data.

### Mobile Issues

- Full visual QA on real mobile devices is still needed.
- Heavy shader/Three.js experiences may need additional device-performance gating.
- Some dense dashboard panels may still feel cramped on small screens.
- Full-screen media viewers should be tested across iOS Safari and Android Chrome.

### Missing Data

- NASA news appears as highlights/fallback rather than a robust official news feed integration.
- Mars rover latest photos depend on available NASA data and may need better fallback curation.
- Space weather summaries depend on DONKI availability and current date windows.
- No database-backed archive or saved user collections.

### Missing Interactivity

- Entropy scientific animation section is not present.
- No authenticated saved explorations.
- No user profile or favorites.
- No daily challenge/community loop.
- No mission tracking timeline beyond Mission Signals.
- No advanced research tools or export workflows.

### Technical Debt

- README version/model drift was corrected during Phase 1:
  - Next.js is documented as 16 to match current `package.json`.
  - OpenAI default is documented as `gpt-5-mini` with `gpt-4o-mini` fallback.
- `src/components/ui` and `src/lib/utils.ts` were untracked before this handoff commit and should be tracked as part of the current state.
- Some older COSMOS global utility classes remain alongside new glass utilities; this is acceptable but could be consolidated later.
- No automated end-to-end test suite.
- No visual regression tests.
- No database.
- No durable server-side rate limiting.

## Pending Features

### Priority 1

- Fully working AI assistant in production with verified OpenAI connectivity.
- Real OpenAI integration validated on Vercel with configured secrets.
- Better NASA context assembly with clearer source summaries.
- Stronger source/context panel in Ask COSMOS.
- Model, token, and cost monitoring.
- Durable rate limiting.
- Durable response caching for common prompts.

### Priority 2

- Real 3D Solar System quality upgrade.
- Higher quality planet textures.
- Better orbit animations.
- Better Sun lighting and atmosphere effects.
- Mission tracking overlays.
- Spacecraft and mission path layers.
- Improved performance tiers for mobile and low-power devices.

### Priority 3

- User accounts.
- Saved explorations.
- User profiles.
- Favorites.
- Saved APOD/media/planet collections.
- Cross-device history.

### Priority 4

- Community features.
- Daily challenges.
- Research tools.
- Educator tools.
- Shareable lesson/exploration packs.
- User-submitted collections.

## Future Vision

COSMOS AI should become a living space observatory: part NASA Eyes, part Apple product story, part National Geographic expedition, and part calm AI science guide. The long-term product should let users move from daily cosmic updates into deep exploration, save discoveries, understand NASA imagery in context, follow missions, compare planets, explore media archives, and ask source-grounded questions without feeling like they are using a generic chatbot or generic SaaS dashboard.

The strongest version of COSMOS AI is a daily habit product. A visitor opens it each morning to see what happened in space, then follows a trail into APOD, asteroids, Mars imagery, mission updates, media archives, and guided explanations. Over time, accounts and saved explorations can turn this into a personal space learning archive.

## Current Design Language

### Colors

- Base: deep space black, near-black navy, and dark blue-black gradients.
- Primary accent: electric oxygen/cyan blue.
- Secondary accent: subtle purple/AI glow.
- Tertiary accents: solar amber and Mars red for contextual signals.
- Text: cosmic white, frost, mist, and slate tones.
- Borders: thin blue/white low-opacity lines.

### Typography

- Sans-serif stack based around Inter and SF Pro style fallbacks.
- Monospace metadata labels use IBM Plex Mono/SF Mono style stack.
- Large editorial headlines use tight but readable premium product-page sizing.
- Metadata uses uppercase, small caps, and wide tracking.

### Animation Style

- Slow cinematic motion.
- Framer Motion reveal/stagger.
- Subtle hover elevation.
- Telemetry/grid scanning effects.
- Reduced-motion support is globally enabled.
- Animations should feel like mission-control instrumentation, not playful SaaS decoration.

### NASA-Inspired Aesthetic

- Mission-control dashboard surfaces.
- Orbital grids and telemetry lines.
- Source-grounded NASA labels.
- Image-first editorial layouts.
- Deep-space backgrounds and restrained glow.

### Glassmorphism System

- `glass-panel`: primary large frosted surface.
- `glass-card`: smaller repeated card surface.
- `glass-button`: CTA and secondary command surface.
- `glass-nav`: frosted navigation shell.
- `glass-border`: subtle telemetry border treatment.
- Design intent: thin glass layers floating over deep space with electric-blue edges and soft purple depth.

### Brand Identity

- COSMOS AI should feel premium, calm, scientific, cinematic, and useful.
- Avoid generic SaaS layouts, orange workflow themes, fake buttons, excessive blur, and random decoration.
- Every visible control should either work or be clearly marked as unavailable/coming soon.

## File Structure

### Important Root Files

- `package.json`: scripts and dependencies.
- `.env.example`: documented environment variables.
- `README.md`: setup and deployment instructions, with known version/model drift to correct.
- `PROJECT_STATUS.md`: this handoff document.

### App Router

- `src/app/layout.tsx`: global metadata, preconnects, observability, global CSS.
- `src/app/page.tsx`: homepage route.
- `src/app/apod/page.tsx`: APOD route.
- `src/app/ask/page.tsx`: Ask COSMOS route.
- `src/app/asteroids/page.tsx`: asteroid tracker route.
- `src/app/briefing/page.tsx`: Daily Cosmic Briefing route.
- `src/app/gallery/page.tsx`: Gallery route.
- `src/app/image-explorer/page.tsx`: Image Explorer route.
- `src/app/solar-system/page.tsx`: Solar System route.
- `src/app/robots.ts`: robots route.
- `src/app/sitemap.ts`: sitemap route.
- `src/app/api`: API routes for AI, briefing, and NASA proxies.

### Components

- `src/components/home`: homepage sections and starfield.
- `src/components/briefing`: mission-control briefing UI.
- `src/components/apod`: APOD editorial page and actions.
- `src/components/assistant`: Ask COSMOS chat UI.
- `src/components/assistant/research-source-card.tsx`: Lazy-loaded OpenAlex research card UI with citation copy actions.
- `src/components/image-explorer`: NASA Image Explorer.
- `src/components/gallery`: NASA gallery.
- `src/components/solar-system`: Solar System scene, panels, loader.
- `src/components/asteroids`: asteroid tracker.
- `src/components/analytics`: Vercel observability.
- `src/components/ui`: local UI primitives and feature components.

### Services And Lib

- `src/services/nasa`: NASA fetch/service layer.
- `src/services/openai`: OpenAI chat/APOD explanation service layer.
- `src/lib/openalex.ts`: OpenAlex service layer, normalized types, cache, retry, timeout, and research prompt detection.
- `src/lib/env.ts`: server-only environment handling.
- `src/lib/site-url.ts`: site URL/canonical helpers.
- `src/lib/cosmos-analytics.ts`: privacy-friendly analytics events.
- `src/lib/utils.ts`: shared `cn()` utility.

## Deployment Status

### Domain Status

- No confirmed custom domain in repository.
- Set `NEXT_PUBLIC_SITE_URL` in Vercel for production canonical URLs.

### Vercel Status

- App is structured for Vercel deployment.
- Vercel Analytics and Speed Insights scripts are included.
- API routes are compatible with Next.js server runtime.
- Environment variables must be configured in Vercel Project Settings.

### Build Status

- Latest known production build before this document passed.
- Verification should be rerun after this file is committed:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`

### OpenAlex Testing Instructions

- Set `OPENALEX_API_KEY` in `.env.local` or Vercel Project Settings if available.
- Test direct research search:
  - `/api/openalex/search?q=black%20holes&type=papers`
  - `/api/openalex/search?q=exoplanets&type=all`
- Test singleton routes:
  - `/api/openalex/paper?id=W2741809807`
  - `/api/openalex/author?q=Kip%20Thorne`
  - `/api/openalex/topic?q=exoplanets`
- Test Ask COSMOS research grounding:
  - Open `/ask`.
  - Select Research mode or ask a prompt such as `Find recent scientific research papers about black holes and explain the strongest studies.`
  - Verify OpenAlex research cards appear under the streamed answer.
  - Verify Copy Citation, Copy APA, Copy MLA, Copy Chicago, and Open Paper actions work.
  - Verify no paper metadata appears unless returned by OpenAlex.

### Environment Variables Configured

- `.env.example` includes:
  - `NASA_API_KEY`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `OPENALEX_API_KEY`
  - `NEXT_PUBLIC_SITE_URL`
- Actual local or Vercel secret values are not visible in the repository and were not inspected.

## Next Recommended Sprint

1. Correct README drift: update Next.js and OpenAI default model references to match `package.json` and `src/lib/env.ts`.
2. Verify Ask COSMOS on Vercel with a real `OPENAI_API_KEY`, including streaming, quota errors, missing-key fallback, OpenAlex research prompts, and server logs.
3. Add durable rate limiting and cache storage for `/api/ai/chat`.
4. Expand source cards/citations to include richer NASA snippets and OpenAlex source confidence notes.
5. Implement the missing Entropy section only if still desired, using `src/components/ui/entropy.tsx` and a homepage section.
6. Perform real mobile QA on `/`, `/briefing`, `/apod`, `/ask`, `/gallery`, `/image-explorer`, and `/solar-system`.
7. Improve Solar System textures, lighting, atmosphere, and mobile performance tiers.
8. Add end-to-end smoke tests for main routes and visible CTAs.
9. Add visual regression checks for premium pages and full-screen modals.
10. Decide whether to add authentication and saved explorations, then design the smallest useful account/favorites architecture.

## Recommended Next Chat Prompt

Use this prompt in a fresh Codex chat:

```text
Read PROJECT_STATUS.md first. Continue COSMOS AI development from the current repository state. Do not restart architecture. First verify current build status, then fix the highest-priority issue from the Next Recommended Sprint. Preserve existing NASA integrations, routes, glassmorphism system, shader hero, Mission Signals timeline, and deployment compatibility.
```
